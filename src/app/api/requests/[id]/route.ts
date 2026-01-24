import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/requests/[id] - Get single request with full details
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        const paymentRequest = await prisma.paymentRequest.findUnique({
            where: { id },
            include: {
                requester: true,
                currentApprover: true,
                documents: true,
                approvalHistory: {
                    include: {
                        approver: true,
                    },
                    orderBy: { actionedAt: 'desc' },
                },
                workflow: {
                    include: {
                        steps: { orderBy: { order: 'asc' } }
                    }
                }
            },
        });

        if (!paymentRequest) {
            return NextResponse.json(
                { success: false, error: 'Request not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: paymentRequest });
    } catch (error) {
        console.error('Error fetching request:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch request' },
            { status: 500 }
        );
    }
}

// PATCH /api/requests/[id] - Update request (only drafts can be edited)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();

        const existing = await prisma.paymentRequest.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Request not found' },
                { status: 404 }
            );
        }

        // Only drafts can be edited
        if (existing.status !== 'draft') {
            return NextResponse.json(
                { success: false, error: 'Only draft requests can be edited' },
                { status: 400 }
            );
        }

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
            currentApproverId,
            status,
        } = body;

        // If submitting, approver is required
        if (status === 'pending' && !currentApproverId) {
            return NextResponse.json(
                { success: false, error: 'Approver is required when submitting' },
                { status: 400 }
            );
        }

        const paymentRequest = await prisma.paymentRequest.update({
            where: { id },
            data: {
                ...(vendorName !== undefined && { vendorName }),
                ...(invoiceNumber !== undefined && { invoiceNumber }),
                ...(invoiceDate !== undefined && { invoiceDate: new Date(invoiceDate) }),
                ...(amount !== undefined && { amount: parseFloat(amount) }),
                ...(currency !== undefined && { currency }),
                ...(description !== undefined && { description }),
                ...(vatCharged !== undefined && { vatCharged }),
                ...(internalVatNumber !== undefined && { internalVatNumber }),
                ...(externalVatNumber !== undefined && { externalVatNumber }),
                ...(currentApproverId !== undefined && { currentApproverId }),
                ...(status !== undefined && { status }),
            },
            include: {
                requester: true,
                currentApprover: true,
            },
        });

        return NextResponse.json({ success: true, data: paymentRequest });
    } catch (error) {
        console.error('Error updating request:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update request' },
            { status: 500 }
        );
    }
}

// DELETE /api/requests/[id] - Delete request
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        const existing = await prisma.paymentRequest.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Request not found' },
                { status: 404 }
            );
        }

        // Only drafts or rejected can be deleted
        if (!['draft', 'rejected'].includes(existing.status)) {
            return NextResponse.json(
                { success: false, error: 'Only draft or rejected requests can be deleted' },
                { status: 400 }
            );
        }

        await prisma.paymentRequest.delete({
            where: { id },
        });

        return NextResponse.json({ success: true, data: { deleted: true } });
    } catch (error) {
        console.error('Error deleting request:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete request' },
            { status: 500 }
        );
    }
}
