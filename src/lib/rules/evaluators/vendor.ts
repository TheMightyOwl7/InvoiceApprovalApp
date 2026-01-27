// Vendor Rule Evaluator
// Evaluates vendor risk-based routing rules

import type { ApprovalRule } from '@prisma/client';
import type { RuleEvaluationContext, RuleEvaluationResult, RuleEvaluator, ApprovalRequirement } from '../types';

export class VendorEvaluator implements RuleEvaluator {
    ruleType = 'vendor' as const;

    evaluate(rule: ApprovalRule, context: RuleEvaluationContext): RuleEvaluationResult {
        const vendor = context.vendor;

        // If no vendor on request, rule doesn't apply
        if (!vendor) {
            return {
                rule,
                triggered: false,
                reason: 'No vendor associated with request',
            };
        }

        let triggered = false;
        let reason = '';

        // Check vendor "is new" condition
        if (rule.vendorIsNew === true && vendor.isNew) {
            triggered = true;
            reason = 'Vendor is new and requires additional approval';
        }

        // Check vendor risk ratings
        if (rule.vendorRiskRatings) {
            try {
                const riskRatings: string[] = JSON.parse(rule.vendorRiskRatings);
                if (riskRatings.includes(vendor.riskRating)) {
                    triggered = true;
                    reason = `Vendor has ${vendor.riskRating} risk rating`;
                }
            } catch {
                // Invalid JSON, skip this check
            }
        }

        if (!triggered) {
            return {
                rule,
                triggered: false,
                reason: `Vendor "${vendor.name}" does not match rule conditions`,
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
            reason,
            action: rule.actionType as 'require_approval' | 'auto_approve' | 'auto_reject' | 'escalate',
            requirement,
        };
    }
}
