// Category Rule Evaluator
// Routes approvals based on spend category

import type { ApprovalRule } from '@prisma/client';
import type { RuleEvaluationContext, RuleEvaluationResult, RuleEvaluator, ApprovalRequirement } from '../types';

export class CategoryEvaluator implements RuleEvaluator {
    ruleType = 'category' as const;

    evaluate(rule: ApprovalRule, context: RuleEvaluationContext): RuleEvaluationResult {
        const category = context.category;
        const ruleCategory = rule.categoryId;

        // If rule has no category specified, it doesn't apply
        if (!ruleCategory) {
            return {
                rule,
                triggered: false,
                reason: 'Rule has no category condition',
            };
        }

        // If request has no category, rule doesn't match
        if (!category) {
            return {
                rule,
                triggered: false,
                reason: 'Request has no category assigned',
            };
        }

        // Check if category matches
        const triggered = category.id === ruleCategory;

        if (!triggered) {
            return {
                rule,
                triggered: false,
                reason: `Category "${category.name}" does not match rule category`,
            };
        }

        // Use category's default approver if no specific approver in rule
        const approverId = rule.specificApproverId ?? category.defaultApproverId;

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
            reason: `Request in category "${category.name}" requires specific approval`,
            action: rule.actionType as 'require_approval' | 'auto_approve' | 'auto_reject' | 'escalate',
            requirement,
        };
    }
}
