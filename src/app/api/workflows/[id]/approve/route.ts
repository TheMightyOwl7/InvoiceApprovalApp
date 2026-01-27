import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/workflows/[id]/approve - Executive approval of a workflow
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { approverId, action } = body; // action: 'approve' or 'reject'

        if (!approverId || !action) {
            return NextResponse.json(
                { success: false, error: 'Approver ID and action are required' },
                { status: 400 }
            );
        }

        const approver = await prisma.user.findUnique({
            where: { id: approverId }
        });

        if (!approver || approver.role !== 'executive') {
            return NextResponse.json(
                { success: false, error: 'Only Executives can approve workflows' },
                { status: 403 }
            );
        }

        const workflow = await prisma.workflow.update({
            where: { id },
            data: {
                status: action === 'approve' ? 'active' : 'inactive',
                approverId: approverId
            }
        });

        // If this workflow is now active, we might want to deactivate others (optional design choice)
        // For now, we'll just let it be.

        return NextResponse.json({ success: true, data: workflow });
    } catch (error) {
        console.error('Error approving workflow:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to approve workflow' },
            { status: 500 }
        );
    }
}
