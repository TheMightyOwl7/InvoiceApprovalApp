import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/delegations/[id] - Get single delegation
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        const delegation = await prisma.delegationRule.findUnique({
            where: { id },
            include: {
                delegator: { select: { id: true, name: true, email: true, department: true } },
                delegate: { select: { id: true, name: true, email: true, department: true } }
            }
        });

        if (!delegation) {
            return NextResponse.json(
                { success: false, error: 'Delegation not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: delegation });
    } catch (error) {
        console.error('Error fetching delegation:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch delegation' },
            { status: 500 }
        );
    }
}

// PATCH /api/delegations/[id] - Update delegation
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();

        const existing = await prisma.delegationRule.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Delegation not found' },
                { status: 404 }
            );
        }

        const {
            startDate,
            endDate,
            maxAmount,
            isActive,
            reason
        } = body;

        const start = startDate ? new Date(startDate) : existing.startDate;
        const end = endDate ? new Date(endDate) : existing.endDate;

        if (end <= start) {
            return NextResponse.json(
                { success: false, error: 'End date must be after start date' },
                { status: 400 }
            );
        }

        const delegation = await prisma.delegationRule.update({
            where: { id },
            data: {
                startDate: start,
                endDate: end,
                maxAmount: maxAmount !== undefined ? (maxAmount ? parseFloat(maxAmount) : null) : existing.maxAmount,
                isActive: isActive ?? existing.isActive,
                reason: reason !== undefined ? reason : existing.reason
            },
            include: {
                delegator: { select: { id: true, name: true, email: true } },
                delegate: { select: { id: true, name: true, email: true } }
            }
        });

        return NextResponse.json({ success: true, data: delegation });
    } catch (error) {
        console.error('Error updating delegation:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update delegation' },
            { status: 500 }
        );
    }
}

// DELETE /api/delegations/[id] - Delete delegation
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        const existing = await prisma.delegationRule.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Delegation not found' },
                { status: 404 }
            );
        }

        await prisma.delegationRule.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting delegation:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete delegation' },
            { status: 500 }
        );
    }
}
