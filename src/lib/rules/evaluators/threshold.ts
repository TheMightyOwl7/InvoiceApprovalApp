// Threshold Rule Evaluator
// Evaluates absolute amount-based threshold rules

import type { ApprovalRule } from '@prisma/client';
import type { RuleEvaluationContext, RuleEvaluationResult, RuleEvaluator, ApprovalRequirement } from '../types';

export class ThresholdEvaluator implements RuleEvaluator {
    ruleType = 'threshold' as const;

    evaluate(rule: ApprovalRule, context: RuleEvaluationContext): RuleEvaluationResult {
        const amount = context.request.amount;
        const minAmount = rule.minAmount ?? 0;
        const maxAmount = rule.maxAmount ?? Infinity;

        // Check if amount falls within the threshold range
        const triggered = amount >= minAmount && (maxAmount === null || amount <= maxAmount);

        if (!triggered) {
            return {
                rule,
                triggered: false,
                reason: `Amount ${amount} not within threshold range (${minAmount} - ${maxAmount ?? '∞'})`,
            };
        }

        // Build the approval requirement
        const requirement: ApprovalRequirement = {
            groupId: rule.requiredGroupId ?? undefined,
            role: rule.requiredRole ?? undefined,
            specificApproverId: rule.specificApproverId ?? undefined,
            mode: (rule.approvalMode as 'sequential' | 'parallel') ?? 'sequential',
            requiredCount: rule.requiredApprovals ?? 1,
            votingMode: rule.votingMode as 'unanimous' | 'majority' | undefined,
            slaHours: rule.slaHours ?? undefined,
            escalateToGroupId: rule.escalateToGroupId ?? undefined,
        };

        return {
            rule,
            triggered: true,
            reason: `Amount ${amount} exceeds threshold of ${minAmount}`,
            action: rule.actionType as 'require_approval' | 'auto_approve' | 'auto_reject' | 'escalate',
            requirement,
        };
    }
}
