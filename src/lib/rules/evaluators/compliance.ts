// Compliance Rule Evaluator
// Triggers legal/compliance review requirements

import type { ApprovalRule } from '@prisma/client';
import type { RuleEvaluationContext, RuleEvaluationResult, RuleEvaluator, ApprovalRequirement } from '../types';

export class ComplianceEvaluator implements RuleEvaluator {
    ruleType = 'compliance' as const;

    evaluate(rule: ApprovalRule, context: RuleEvaluationContext): RuleEvaluationResult {
        let triggered = false;
        const reasons: string[] = [];

        // Check if vendor requires compliance review
        if (rule.requiresCompliance && context.vendor?.requiresCompliance) {
            triggered = true;
            reasons.push(`Vendor "${context.vendor.name}" requires compliance review`);
        }

        // Check vendor country for high-risk locations
        if (context.vendor?.country) {
            // This could be expanded with a list of high-risk countries
            const highRiskCountries = ['sanctioned_country_1', 'sanctioned_country_2'];
            if (highRiskCountries.includes(context.vendor.country.toLowerCase())) {
                triggered = true;
                reasons.push(`Vendor in high-risk country: ${context.vendor.country}`);
            }
        }

        // Check if legal review is required (could be based on contract value, etc.)
        if (rule.requiresLegalReview) {
            // Legal review typically triggered by high amounts or specific categories
            const legalThreshold = 100000; // Could be configurable
            if (context.request.amount >= legalThreshold) {
                triggered = true;
                reasons.push('Amount requires legal review');
            }
        }

        if (!triggered) {
            return {
                rule,
                triggered: false,
                reason: 'No compliance conditions met',
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
            reason: reasons.join('; '),
            action: rule.actionType as 'require_approval' | 'auto_approve' | 'auto_reject' | 'escalate',
            requirement,
        };
    }
}
