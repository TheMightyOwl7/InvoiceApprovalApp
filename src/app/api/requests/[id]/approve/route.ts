import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { canUserApprove } from '@/lib/rules/evaluators/sod';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST /api/requests/[id]/approve - Approve, reject, or escalate request
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { action, approverId, comments, stepId } = body;

        // Validate action
        if (!['approve', 'reject', 'escalate'].includes(action)) {
            return NextResponse.json(
                { success: false, error: 'Invalid action. Must be approve, reject, or escalate' },
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
            include: {
                activeSteps: {
                    where: { status: 'pending' },
                    orderBy: { createdAt: 'asc' },
                },
                workflow: {
                    include: { rules: { where: { isActive: true } } }
                }
            },
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

        // Get the approver
        const approver = await prisma.user.findUnique({
            where: { id: approverId },
            include: {
                groupMemberships: {
                    include: { group: true }
                }
            }
        });

        if (!approver) {
            return NextResponse.json(
                { success: false, error: 'Approver not found' },
                { status: 404 }
            );
        }

        // Check Segregation of Duties - creator cannot approve own request
        const sodCheck = canUserApprove(approverId, paymentRequest.requesterId, true);
        if (!sodCheck.allowed) {
            return NextResponse.json(
                { success: false, error: sodCheck.reason },
                { status: 403 }
            );
        }

        // Find the current pending step
        const currentStep = stepId
            ? paymentRequest.activeSteps.find(s => s.id === stepId)
            : paymentRequest.activeSteps[0];

        if (!currentStep) {
            return NextResponse.json(
                { success: false, error: 'No pending approval step found' },
                { status: 400 }
            );
        }

        // Validate approver can action this step
        let canApproveStep = false;

        // Check if specific approver is required
        if (currentStep.specificApproverId) {
            canApproveStep = currentStep.specificApproverId === approverId;
        }
        // Check if role requirement matches
        else if (currentStep.requiredRole) {
            canApproveStep = approver.role === currentStep.requiredRole ||
                approver.role === 'executive'; // Executives can always approve
        }
        // Check if group requirement matches
        else if (currentStep.requiredGroupId) {
            canApproveStep = approver.groupMemberships.some(
                m => m.groupId === currentStep.requiredGroupId
            );
        }
        // No specific requirement - anyone with manager+ role can approve
        else {
            canApproveStep = approver.role ? ['manager', 'senior_manager', 'executive'].includes(approver.role) : false;
        }

        if (!canApproveStep) {
            return NextResponse.json(
                { success: false, error: 'You are not authorized to approve this step' },
                { status: 403 }
            );
        }

        // Create approval action record
        await prisma.approvalAction.create({
            data: {
                requestId: id,
                stepId: currentStep.id,
                approverId,
                action: action === 'reject' ? 'rejected' : action === 'escalate' ? 'escalated' : 'approved',
                comments,
                satisfiedRuleId: currentStep.ruleId,
            },
        });

        // Handle the action
        let newStatus = paymentRequest.status;
        let stepUpdate: { status: string; receivedApprovals?: number; receivedRejections?: number } = { status: 'pending' };

        if (action === 'reject') {
            newStatus = 'rejected';
            stepUpdate = { status: 'rejected', receivedRejections: currentStep.receivedRejections + 1 };
        } else if (action === 'escalate') {
            stepUpdate = { status: 'escalated' };
            // Escalation logic would create a new step for the escalation group
        } else if (action === 'approve') {
            const newApprovalCount = currentStep.receivedApprovals + 1;

            // Check if we've met the required approval count
            if (newApprovalCount >= currentStep.requiredCount) {
                stepUpdate = { status: 'approved', receivedApprovals: newApprovalCount };

                // Check if there are more pending steps
                const remainingSteps = paymentRequest.activeSteps.filter(
                    s => s.id !== currentStep.id && s.status === 'pending'
                );

                if (remainingSteps.length === 0) {
                    // No more steps - request is fully approved
                    newStatus = 'approved';
                }
                // Else: more steps remain, status stays pending
            } else {
                // Need more approvals for this step (parallel approval)
                stepUpdate = { status: 'pending', receivedApprovals: newApprovalCount };
            }
        }

        // Update the step
        await prisma.activeApprovalStep.update({
            where: { id: currentStep.id },
            data: stepUpdate,
        });

        // Update request status
        const updateData: { status: string; completedAt?: Date } = { status: newStatus };
        if (newStatus === 'approved' || newStatus === 'rejected') {
            updateData.completedAt = new Date();
        }

        const updated = await prisma.paymentRequest.update({
            where: { id },
            data: updateData,
            include: {
                requester: true,
                vendor: true,
                approvalHistory: {
                    include: { approver: true },
                    orderBy: { actionedAt: 'desc' },
                },
                activeSteps: true,
            },
        });

        return NextResponse.json({
            success: true,
            data: updated,
            message: action === 'approve'
                ? (newStatus === 'approved' ? 'Request fully approved' : 'Approval recorded, awaiting more approvals')
                : action === 'reject'
                    ? 'Request rejected'
                    : 'Request escalated'
        });
    } catch (error) {
        console.error('Error processing approval:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process approval' },
            { status: 500 }
        );
    }
}
