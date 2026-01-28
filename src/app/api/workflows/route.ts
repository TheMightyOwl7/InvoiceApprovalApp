import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/workflows - List all workflows
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};
        if (status) where.status = status;

        const workflows = await prisma.workflow.findMany({
            where,
            include: {
                stages: {
                    orderBy: { order: 'asc' }
                },
                rules: {
                    orderBy: { order: 'asc' }
                },
                creator: {
                    select: { id: true, name: true, department: true, role: true }
                },
                approver: {
                    select: { id: true, name: true, department: true, role: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ success: true, data: workflows });
    } catch (error) {
        console.error('Error fetching workflows:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch workflows' },
            { status: 500 }
        );
    }
}

// POST /api/workflows - Create new workflow
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, description, stages, rules, creatorId, departmentScope } = body;

        if (!name || !creatorId) {
            return NextResponse.json(
                { success: false, error: 'Name and creator are required' },
                { status: 400 }
            );
        }

        // Verify creator is at least a senior manager
        const creator = await prisma.user.findUnique({
            where: { id: creatorId }
        });

        if (!creator || (creator.role !== 'senior_manager' && creator.role !== 'executive')) {
            return NextResponse.json(
                { success: false, error: 'Only Senior Managers or Executives can create workflows' },
                { status: 403 }
            );
        }

        // Create workflow with optional stages and/or rules
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const workflowData: any = {
            name,
            description,
            creatorId,
            departmentScope,
            status: 'draft',
        };

        // New: If stages are provided, create them (new stage-based approach)
        if (stages && Array.isArray(stages) && stages.length > 0) {
            workflowData.stages = {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                create: stages.map((stage: any, index: number) => ({
                    name: stage.name,
                    description: stage.description,
                    order: stage.order ?? index,
                    stageType: stage.stageType || 'static',
                    requiredRole: stage.requiredRole,
                    requiredGroupId: stage.requiredGroupId,
                    specificApproverIds: stage.specificApproverIds,
                    approvalMode: stage.approvalMode || 'any',
                    requiredApprovals: stage.requiredApprovals || 1,
                    slaHours: stage.slaHours,
                    escalateToGroupId: stage.escalateToGroupId,
                    conditionType: stage.conditionType,
                    conditionValue: stage.conditionValue,
                }))
            };
        }

        // Legacy: If rules are provided (backward compatibility)
        if (rules && Array.isArray(rules) && rules.length > 0) {
            workflowData.rules = {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                create: rules.map((rule: any, index: number) => ({
                    name: rule.name,
                    description: rule.description,
                    order: rule.order ?? index,
                    ruleType: rule.ruleType,
                    actionType: rule.actionType || 'require_approval',
                    // Threshold conditions
                    minAmount: rule.minAmount ? parseFloat(rule.minAmount) : null,
                    maxAmount: rule.maxAmount ? parseFloat(rule.maxAmount) : null,
                    // Other conditions
                    requiredRole: rule.requiredRole,
                    requiredGroupId: rule.requiredGroupId,
                    specificApproverId: rule.specificApproverId,
                    approvalMode: rule.approvalMode || 'sequential',
                    requiredApprovals: rule.requiredApprovals || 1,
                    // SoD
                    preventSelfApproval: rule.preventSelfApproval || false,
                    preventCreatorApproval: rule.preventCreatorApproval || false,
                    // SLA
                    slaHours: rule.slaHours,
                    escalateToGroupId: rule.escalateToGroupId,
                }))
            };
        }

        const workflow = await prisma.workflow.create({
            data: workflowData,
            include: {
                stages: true,
                rules: true
            }
        });

        return NextResponse.json({ success: true, data: workflow }, { status: 201 });
    } catch (error) {
        console.error('Error creating workflow:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create workflow' },
            { status: 500 }
        );
    }
}

