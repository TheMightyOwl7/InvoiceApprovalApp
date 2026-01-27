// Variance Rule Evaluator
// Evaluates PO/quote variance thresholds

import type { ApprovalRule } from '@prisma/client';
import type { RuleEvaluationContext, RuleEvaluationResult, RuleEvaluator, ApprovalRequirement } from '../types';

export class VarianceEvaluator implements RuleEvaluator {
    ruleType = 'variance' as const;

    evaluate(rule: ApprovalRule, context: RuleEvaluationContext): RuleEvaluationResult {
        const variancePercentage = rule.variancePercentage;
        const baseField = rule.varianceBaseField;

        if (variancePercentage === null || variancePercentage === undefined || !baseField) {
            return {
                rule,
                triggered: false,
                reason: 'Variance rule missing percentage or base field configuration',
            };
        }

        // Get the base amount to compare against
        let baseAmount: number | null | undefined;
        switch (baseField) {
            case 'po_amount':
                baseAmount = context.poAmount;
                break;
            case 'quote_amount':
                baseAmount = context.quoteAmount;
                break;
            default:
                return {
                    rule,
                    triggered: false,
                    reason: `Unknown variance base field: ${baseField}`,
                };
        }

        // If no base amount, rule doesn't apply
        if (baseAmount === null || baseAmount === undefined || baseAmount === 0) {
            return {
                rule,
                triggered: false,
                reason: `No ${baseField} available for variance check`,
            };
        }

        // Calculate the variance
        const invoiceAmount = context.request.amount;
        const variance = (invoiceAmount - baseAmount) / baseAmount;
        const triggered = variance > variancePercentage;

        if (!triggered) {
            return {
                rule,
                triggered: false,
                reason: `Variance (${(variance * 100).toFixed(1)}%) within allowed limit (${(variancePercentage * 100).toFixed(1)}%)`,
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
            reason: `Invoice variance (${(variance * 100).toFixed(1)}%) exceeds allowed ${(variancePercentage * 100).toFixed(1)}% vs ${baseField}`,
            action: rule.actionType as 'require_approval' | 'auto_approve' | 'auto_reject' | 'escalate',
            requirement,
        };
    }
}
