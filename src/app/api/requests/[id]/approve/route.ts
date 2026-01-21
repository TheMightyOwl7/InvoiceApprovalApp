import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST /api/requests/[id]/approve - Approve, reject, or forward request
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { action, approverId, nextApproverId, comments } = body;

        // Validate action
        if (!['approve', 'reject', 'forward'].includes(action)) {
            return NextResponse.json(
                { success: false, error: 'Invalid action. Must be approve, reject, or forward' },
                { status: 400 }
            );
        }

        // Validate approver
        if (!approverId) {
            return NextResponse.json(
                { success: false, error: 'Approver ID is required' },
                { status: 400 }
            );
        }

        const paymentRequest = await prisma.paymentRequest.findUnique({
            where: { id },
            include: { currentApprover: true },
        });

        if (!paymentRequest) {
            return NextResponse.json(
                { success: false, error: 'Request not found' },
                { status: 404 }
            );
        }

        // Must be pending
        if (paymentRequest.status !== 'pending') {
            return NextResponse.json(
                { success: false, error: 'Only pending requests can be actioned' },
                { status: 400 }
            );
        }

        // Must be the current approver
        if (paymentRequest.currentApproverId !== approverId) {
            return NextResponse.json(
                { success: false, error: 'You are not the current approver for this request' },
                { status: 403 }
            );
        }

        // For forwarding, next approver is required
        if (action === 'forward' && !nextApproverId) {
            return NextResponse.json(
                { success: false, error: 'Next approver is required for forwarding' },
                { status: 400 }
            );
        }

        // Verify next approver exists if forwarding
        if (nextApproverId) {
            const nextApprover = await prisma.user.findUnique({
                where: { id: nextApproverId },
            });

            if (!nextApprover) {
                return NextResponse.json(
                    { success: false, error: 'Next approver not found' },
                    { status: 404 }
                );
            }
        }

        // Create approval step record
        await prisma.approvalStep.create({
            data: {
                requestId: id,
                approverId,
                status: action === 'reject' ? 'rejected' : 'approved',
                comments,
            },
        });

        // Update request status and approver
        let newStatus = paymentRequest.status;
        let newApproverId: string | null = paymentRequest.currentApproverId;

        if (action === 'approve') {
            // Final approval
            newStatus = 'approved';
            newApproverId = null;
        } else if (action === 'reject') {
            newStatus = 'rejected';
            newApproverId = null;
        } else if (action === 'forward') {
            // Forward to next approver - stay pending
            newStatus = 'pending';
            newApproverId = nextApproverId;
        }

        const updated = await prisma.paymentRequest.update({
            where: { id },
            data: {
                status: newStatus,
                currentApproverId: newApproverId,
            },
            include: {
                requester: true,
                currentApprover: true,
                approvalHistory: {
                    include: { approver: true },
                    orderBy: { actionedAt: 'desc' },
                },
            },
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        console.error('Error processing approval:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process approval' },
            { status: 500 }
        );
    }
}
