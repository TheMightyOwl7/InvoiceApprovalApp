// Rule Engine - Core
// Main rule evaluation engine that orchestrates all rule evaluators

import { prisma } from '@/lib/prisma';
import type { ApprovalRule, Workflow, PaymentRequest, User } from '@prisma/client';
import type {
    RuleEvaluationContext,
    RuleEvaluationResult,
    WorkflowEvaluationResult,
    ApprovalStepDefinition,
    RuleEvaluator,
} from './types';

// Import individual evaluators
import { ThresholdEvaluator } from './evaluators/threshold';
import { CumulativeEvaluator } from './evaluators/cumulative';
import { VarianceEvaluator } from './evaluators/variance';
import { VendorEvaluator } from './evaluators/vendor';
import { CategoryEvaluator } from './evaluators/category';
import { ProjectEvaluator } from './evaluators/project';
import { ComplianceEvaluator } from './evaluators/compliance';
import { SodEvaluator } from './evaluators/sod';
import { AutoApproveEvaluator } from './evaluators/auto-approve';

// Registry of all rule evaluators
const evaluators: Record<string, RuleEvaluator> = {
    threshold: new ThresholdEvaluator(),
    cumulative: new CumulativeEvaluator(),
    variance: new VarianceEvaluator(),
    vendor: new VendorEvaluator(),
    category: new CategoryEvaluator(),
    project: new ProjectEvaluator(),
    compliance: new ComplianceEvaluator(),
    sod: new SodEvaluator(),
    auto_approve: new AutoApproveEvaluator(),
};

/**
 * Main rule engine class
 */
export class RuleEngine {
    /**
     * Find the applicable workflow for a request based on department scope
     */
    async findApplicableWorkflow(request: PaymentRequest, requester: User): Promise<(Workflow & { rules: ApprovalRule[] }) | null> {
        // First, try to find a workflow scoped to this department
        let workflow = await prisma.workflow.findFirst({
            where: {
                status: 'active',
                departmentScope: requester.department,
            },
            include: {
                rules: {
                    where: { isActive: true },
                    orderBy: { order: 'asc' },
                },
            },
        });

        // If no department-specific workflow, find a global one
        if (!workflow) {
            workflow = await prisma.workflow.findFirst({
                where: {
                    status: 'active',
                    departmentScope: null,
                },
                include: {
                    rules: {
                        where: { isActive: true },
                        orderBy: { order: 'asc' },
                    },
                },
            });
        }

        return workflow;
    }

    /**
     * Build the evaluation context with all relevant data
     */
    async buildContext(request: PaymentRequest, requester: User): Promise<RuleEvaluationContext> {
        // Fetch related entities
        const [vendor, category, project] = await Promise.all([
            request.vendorId
                ? prisma.vendor.findUnique({ where: { id: request.vendorId } })
                : null,
            request.categoryId
                ? prisma.spendCategory.findUnique({ where: { id: request.categoryId } })
                : null,
            request.projectId
                ? prisma.project.findUnique({ where: { id: request.projectId } })
                : null,
        ]);

        // Calculate cumulative amounts for the requester
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfDay);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [dailyTotal, weeklyTotal, monthlyTotal] = await Promise.all([
            this.getCumulativeApprovals(requester.id, startOfDay),
            this.getCumulativeApprovals(requester.id, startOfWeek),
            this.getCumulativeApprovals(requester.id, startOfMonth),
        ]);

        return {
            request,
            requester,
            vendor,
            category,
            project,
            requesterCumulativeToday: dailyTotal,
            requesterCumulativeWeek: weeklyTotal,
            requesterCumulativeMonth: monthlyTotal,
            poAmount: request.poAmount,
            quoteAmount: request.quoteAmount,
        };
    }

    /**
     * Get cumulative approved amount for a user since a given date
     */
    private async getCumulativeApprovals(userId: string, since: Date): Promise<number> {
        // Get cumulative approved amount for this user in the given period

        // For now, count approved actions - in production this needs to sum amounts
        const approvedRequests = await prisma.paymentRequest.findMany({
            where: {
                approvalHistory: {
                    some: {
                        approverId: userId,
                        action: 'approved',
                        actionedAt: { gte: since },
                    },
                },
            },
            select: { amount: true },
        });

        return approvedRequests.reduce((sum, r) => sum + r.amount, 0);
    }

    /**
     * Evaluate all rules in a workflow against a request
     */
    async evaluateWorkflow(
        workflow: Workflow & { rules: ApprovalRule[] },
        context: RuleEvaluationContext
    ): Promise<WorkflowEvaluationResult> {
        const evaluations: RuleEvaluationResult[] = [];
        const triggeredRules: RuleEvaluationResult[] = [];
        let autoApprove = false;
        let autoReject = false;
        let autoRejectReason: string | undefined;

        // Evaluate each rule in order
        for (const rule of workflow.rules) {
            const evaluator = evaluators[rule.ruleType];

            if (!evaluator) {
                console.warn(`No evaluator found for rule type: ${rule.ruleType}`);
                continue;
            }

            const result = evaluator.evaluate(rule, context);
            evaluations.push(result);

            if (result.triggered) {
                triggeredRules.push(result);

                // Handle special action types
                if (result.action === 'auto_approve') {
                    autoApprove = true;
                } else if (result.action === 'auto_reject') {
                    autoReject = true;
                    autoRejectReason = result.reason;
                }
            }
        }

        // If auto-reject is triggered, it takes precedence
        if (autoReject) {
            return {
                workflowId: workflow.id,
                evaluations,
                triggeredRules,
                requiredSteps: [],
                autoApprove: false,
                autoReject: true,
                autoRejectReason,
            };
        }

        // If auto-approve is triggered and no blocking rules, approve
        if (autoApprove && triggeredRules.every(r => r.action === 'auto_approve')) {
            return {
                workflowId: workflow.id,
                evaluations,
                triggeredRules,
                requiredSteps: [],
                autoApprove: true,
                autoReject: false,
            };
        }

        // Build required approval steps from triggered rules
        const requiredSteps = this.buildApprovalSteps(triggeredRules);

        return {
            workflowId: workflow.id,
            evaluations,
            triggeredRules,
            requiredSteps,
            autoApprove: false,
            autoReject: false,
        };
    }

    /**
     * Convert triggered rules into ordered approval steps
     */
    private buildApprovalSteps(triggeredRules: RuleEvaluationResult[]): ApprovalStepDefinition[] {
        const steps: ApprovalStepDefinition[] = [];
        let order = 0;

        for (const result of triggeredRules) {
            if (result.action !== 'require_approval' || !result.requirement) {
                continue;
            }

            const req = result.requirement;
            const rule = result.rule;

            // Calculate due date from SLA if specified
            let dueAt: Date | undefined;
            if (req.slaHours) {
                dueAt = new Date();
                dueAt.setHours(dueAt.getHours() + req.slaHours);
            }

            steps.push({
                ruleId: rule.id,
                ruleName: rule.name,
                order: order++,
                requiredGroupId: req.groupId,
                requiredRole: req.role,
                specificApproverId: req.specificApproverId,
                requiredCount: req.requiredCount,
                votingMode: req.votingMode,
                mode: req.mode,
                dueAt,
                slaHours: req.slaHours,
                escalateToGroupId: req.escalateToGroupId,
            });
        }

        return steps;
    }

    /**
     * Create active approval steps in the database for a request
     */
    async createApprovalSteps(
        requestId: string,
        steps: ApprovalStepDefinition[]
    ): Promise<void> {
        // For sequential workflows, only create the first step as active
        // Other steps will be created as the workflow progresses
        const firstStep = steps[0];

        if (!firstStep) {
            return;
        }

        // For now, create all steps (parallel support)
        // Sequential logic will be handled by step completion
        await prisma.activeApprovalStep.createMany({
            data: steps.map((step, index) => ({
                requestId,
                ruleId: step.ruleId,
                requiredGroupId: step.requiredGroupId,
                requiredRole: step.requiredRole,
                specificApproverId: step.specificApproverId,
                requiredCount: step.requiredCount,
                votingMode: step.votingMode,
                status: index === 0 ? 'pending' : 'skipped', // Only first step is active
                dueAt: step.dueAt,
            })),
        });
    }
}

// Export singleton instance
export const ruleEngine = new RuleEngine();
