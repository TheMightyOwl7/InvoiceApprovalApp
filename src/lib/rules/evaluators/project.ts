// Project Rule Evaluator
// Routes approvals to project managers

import type { ApprovalRule } from '@prisma/client';
import type { RuleEvaluationContext, RuleEvaluationResult, RuleEvaluator, ApprovalRequirement } from '../types';

export class ProjectEvaluator implements RuleEvaluator {
    ruleType = 'project' as const;

    evaluate(rule: ApprovalRule, context: RuleEvaluationContext): RuleEvaluationResult {
        const project = context.project;
        const ruleProject = rule.projectId;

        // If rule has no project specified, it doesn't apply
        if (!ruleProject) {
            return {
                rule,
                triggered: false,
                reason: 'Rule has no project condition',
            };
        }

        // If request has no project, rule doesn't match
        if (!project) {
            return {
                rule,
                triggered: false,
                reason: 'Request has no project assigned',
            };
        }

        // Check if project matches
        const triggered = project.id === ruleProject;

        if (!triggered) {
            return {
                rule,
                triggered: false,
                reason: `Project "${project.name}" does not match rule project`,
            };
        }

        // Use project manager as specific approver if available
        const approverId = rule.specificApproverId ?? project.projectManagerId;

        const requirement: ApprovalRequirement = {
            groupId: rule.requiredGroupId ?? undefined,
            role: rule.requiredRole ?? undefined,
            specificApproverId: approverId ?? undefined,
            mode: (rule.approvalMode as 'sequential' | 'parallel') ?? 'sequential',
            requiredCount: rule.requiredApprovals ?? 1,
            votingMode: rule.votingMode as 'unanimous' | 'majority' | undefined,
            slaHours: rule.slaHours ?? undefined,
            escalateToGroupId: rule.escalateToGroupId ?? undefined,
        };

        return {
            rule,
            triggered: true,
            reason: `Request for project "${project.name}" requires project manager approval`,
            action: rule.actionType as 'require_approval' | 'auto_approve' | 'auto_reject' | 'escalate',
            requirement,
        };
    }
}
