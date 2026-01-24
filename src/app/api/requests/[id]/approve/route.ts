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
        let newStepIndex = paymentRequest.currentStepIndex;

        if (action === 'reject') {
            newStatus = 'rejected';
            newApproverId = null;
        } else if (action === 'forward') {
            // Manual forward - stay pending
            newStatus = 'pending';
            newApproverId = nextApproverId;
        } else if (action === 'approve') {
            if (paymentRequest.workflowId) {
                // Get workflow details
                const workflow = await prisma.workflow.findUnique({
                    where: { id: paymentRequest.workflowId },
                    include: { steps: { orderBy: { order: 'asc' } } }
                });

                if (workflow && workflow.steps.length > 0) {
                    // Find only steps that meet the amount requirement
                    const activeSteps = workflow.steps.filter(s => paymentRequest.amount >= s.minAmount);

                    // The current step's position in the active steps
                    const currentActiveIdx = activeSteps.findIndex(s => s.order === paymentRequest.currentStepIndex);
                    const isFinalStep = currentActiveIdx === -1 || currentActiveIdx >= activeSteps.length - 1;

                    if (isFinalStep) {
                        // Final step - grant approval
                        newStatus = 'approved';
                        newApproverId = null;
                    } else {
                        // Intermediate step - find the NEXT active step
                        const nextStep = activeSteps[currentActiveIdx + 1];

                        if (!nextApproverId) {
                            return NextResponse.json(
                                { success: false, error: `Workflow requires forwarding to the next level: ${nextStep.roleRequirement}` },
                                { status: 400 }
                            );
                        }
                        newStatus = 'pending';
                        newApproverId = nextApproverId;
                        newStepIndex = nextStep.order;
                    }
                } else {
                    // Fallback for missing workflow or steps
                    newStatus = 'approved';
                    newApproverId = null;
                }
            } else {
                // No workflow - simple approval
                newStatus = 'approved';
                newApproverId = null;
            }
        }

        const updated = await prisma.paymentRequest.update({
            where: { id },
            data: {
                status: newStatus,
                currentApproverId: newApproverId,
                currentStepIndex: newStepIndex,
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
