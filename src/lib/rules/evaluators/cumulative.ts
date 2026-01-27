// Cumulative Rule Evaluator
// Evaluates daily/weekly/monthly cumulative approval limits

import type { ApprovalRule } from '@prisma/client';
import type { RuleEvaluationContext, RuleEvaluationResult, RuleEvaluator, ApprovalRequirement } from '../types';

export class CumulativeEvaluator implements RuleEvaluator {
    ruleType = 'cumulative' as const;

    evaluate(rule: ApprovalRule, context: RuleEvaluationContext): RuleEvaluationResult {
        const period = rule.cumulativePeriod;
        const limit = rule.cumulativeLimit;

        if (!period || limit === null || limit === undefined) {
            return {
                rule,
                triggered: false,
                reason: 'Cumulative rule missing period or limit configuration',
            };
        }

        // Get the appropriate cumulative amount based on period
        let cumulativeAmount: number;
        switch (period) {
            case 'daily':
                cumulativeAmount = context.requesterCumulativeToday ?? 0;
                break;
            case 'weekly':
                cumulativeAmount = context.requesterCumulativeWeek ?? 0;
                break;
            case 'monthly':
                cumulativeAmount = context.requesterCumulativeMonth ?? 0;
                break;
            default:
                return {
                    rule,
                    triggered: false,
                    reason: `Unknown cumulative period: ${period}`,
                };
        }

        // Check if adding this request would exceed the limit
        const newTotal = cumulativeAmount + context.request.amount;
        const triggered = newTotal > limit;

        if (!triggered) {
            return {
                rule,
                triggered: false,
                reason: `Cumulative ${period} total (${newTotal}) within limit (${limit})`,
            };
        }

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
            reason: `${period} cumulative total (${newTotal}) exceeds limit (${limit})`,
            action: rule.actionType as 'require_approval' | 'auto_approve' | 'auto_reject' | 'escalate',
            requirement,
        };
    }
}
