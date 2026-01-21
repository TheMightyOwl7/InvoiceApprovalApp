import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/requests - List all requests with filters
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const requesterId = searchParams.get('requesterId');
        const approverId = searchParams.get('approverId');

        const where: Record<string, unknown> = {};

        if (status) where.status = status;
        if (requesterId) where.requesterId = requesterId;
        if (approverId) where.currentApproverId = approverId;

        const requests = await prisma.paymentRequest.findMany({
            where,
            include: {
                requester: {
                    select: { id: true, name: true, department: true },
                },
                currentApprover: {
                    select: { id: true, name: true, department: true },
                },
                documents: {
                    select: { id: true, name: true, mimeType: true, size: true },
                },
                _count: {
                    select: { approvalHistory: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ success: true, data: requests });
    } catch (error) {
        console.error('Error fetching requests:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch requests' },
            { status: 500 }
        );
    }
}

// POST /api/requests - Create new payment request
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            vendorName,
            invoiceNumber,
            invoiceDate,
            amount,
            currency,
            description,
            vatCharged,
            internalVatNumber,
            externalVatNumber,
            requesterId,
            currentApproverId,
            status = 'draft',
        } = body;

        // Basic validation
        if (!vendorName || !invoiceNumber || !invoiceDate || !amount || !requesterId) {
            return NextResponse.json(
                { success: false, error: 'Vendor name, invoice number, date, amount, and requester are required' },
                { status: 400 }
            );
        }

        // Verify requester exists
        const requester = await prisma.user.findUnique({
            where: { id: requesterId },
        });

        if (!requester) {
            return NextResponse.json(
                { success: false, error: 'Requester not found' },
                { status: 404 }
            );
        }

        // If submitting (not draft), approver is required
        if (status === 'pending' && !currentApproverId) {
            return NextResponse.json(
                { success: false, error: 'Approver is required when submitting a request' },
                { status: 400 }
            );
        }

        // If approver specified, verify they exist
        if (currentApproverId) {
            const approver = await prisma.user.findUnique({
                where: { id: currentApproverId },
            });

            if (!approver) {
                return NextResponse.json(
                    { success: false, error: 'Approver not found' },
                    { status: 404 }
                );
            }
        }

        const paymentRequest = await prisma.paymentRequest.create({
            data: {
                vendorName,
                invoiceNumber,
                invoiceDate: new Date(invoiceDate),
                amount: parseFloat(amount),
                currency: currency || 'ZAR',
                description,
                vatCharged: vatCharged || false,
                internalVatNumber,
                externalVatNumber,
                requesterId,
                currentApproverId,
                status,
            },
            include: {
                requester: true,
                currentApprover: true,
            },
        });

        return NextResponse.json({ success: true, data: paymentRequest }, { status: 201 });
    } catch (error) {
        console.error('Error creating request:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create request' },
            { status: 500 }
        );
    }
}
