// Segregation of Duties (SoD) Rule Evaluator
// Enforces fraud prevention rules like preventing self-approval

import type { ApprovalRule } from '@prisma/client';
import type { RuleEvaluationContext, RuleEvaluationResult, RuleEvaluator, ApprovalRequirement } from '../types';

export class SodEvaluator implements RuleEvaluator {
    ruleType = 'sod' as const;

    evaluate(rule: ApprovalRule, context: RuleEvaluationContext): RuleEvaluationResult {
        // SoD rules are enforcement rules - they always trigger if conditions are met
        // They typically add a blocking requirement rather than an approval step

        let triggered = false;
        const reasons: string[] = [];

        // Check prevent self-approval
        if (rule.preventSelfApproval) {
            // This flag will be checked during approval to prevent requester from approving
            triggered = true;
            reasons.push('Self-approval is prohibited');
        }

        // Check prevent creator approval (same as self-approval but explicit)
        if (rule.preventCreatorApproval) {
            triggered = true;
            reasons.push('Request creator cannot approve');
        }

        if (!triggered) {
            return {
                rule,
                triggered: false,
                reason: 'No SoD conditions configured',
            };
        }

        // SoD rules typically add a requirement that someone OTHER than the requester approves
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

/**
 * Helper function to check if a user can approve (respecting SoD)
 * This should be called during the approval action, not during evaluation
 */
export function canUserApprove(
    approverId: string,
    requesterId: string,
    sodRulesActive: boolean
): { allowed: boolean; reason?: string } {
    if (!sodRulesActive) {
        return { allowed: true };
    }

    if (approverId === requesterId) {
        return {
            allowed: false,
            reason: 'Segregation of duties: You cannot approve your own request',
        };
    }

    return { allowed: true };
}
