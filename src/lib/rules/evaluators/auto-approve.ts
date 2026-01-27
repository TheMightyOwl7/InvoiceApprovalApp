// Auto-Approve Rule Evaluator
// Handles white-listing and contract matching for automatic approval

import type { ApprovalRule } from '@prisma/client';
import type { RuleEvaluationContext, RuleEvaluationResult, RuleEvaluator } from '../types';
import { prisma } from '@/lib/prisma';

export class AutoApproveEvaluator implements RuleEvaluator {
    ruleType = 'auto_approve' as const;

    evaluate(rule: ApprovalRule, context: RuleEvaluationContext): RuleEvaluationResult {
        // Auto-approve rules check if the request matches pre-approved conditions

        // This is an async operation in reality, but for the sync interface
        // we'll need to pre-fetch contract data in the context
        // For now, we do a simpler check

        const vendor = context.vendor;
        const amount = context.request.amount;

        if (!vendor) {
            return {
                rule,
                triggered: false,
                reason: 'No vendor for auto-approve matching',
            };
        }

        // Check if vendor is on the "trusted" list (low risk, not new)
        const isLowRisk = vendor.riskRating === 'low' && !vendor.isNew;

        // Check against rule's max amount for auto-approve
        const withinLimit = rule.maxAmount ? amount <= rule.maxAmount : false;

        if (isLowRisk && withinLimit) {
            return {
                rule,
                triggered: true,
                reason: `Auto-approved: Low-risk vendor within limit (${amount} <= ${rule.maxAmount})`,
                action: 'auto_approve',
            };
        }

        return {
            rule,
            triggered: false,
            reason: 'Does not meet auto-approve conditions',
        };
    }
}

/**
 * Check if a request matches a vendor contract for auto-approval
 * This is an async helper that can be called separately
 */
export async function checkContractMatch(
    vendorId: string,
    amount: number,
    poNumber?: string | null
): Promise<{ matches: boolean; contractRef?: string; reason: string }> {
    // Find matching contract
    const contract = await prisma.vendorContract.findFirst({
        where: {
            vendorId,
            expiresAt: {
                gte: new Date(),
            },
        },
    });

    if (!contract) {
        return {
            matches: false,
            reason: 'No active contract found for vendor',
        };
    }

    if (!contract.expectedAmount) {
        return {
            matches: false,
            reason: 'Contract has no expected amount for matching',
        };
    }

    // Check if amount is within variance
    const variance = Math.abs(amount - contract.expectedAmount) / contract.expectedAmount;
    const varianceAllowed = contract.varianceAllowed ?? 0.05;

    if (variance <= varianceAllowed) {
        return {
            matches: true,
            contractRef: contract.contractRef,
            reason: `Matches contract ${contract.contractRef} within ${(varianceAllowed * 100).toFixed(0)}% variance`,
        };
    }

    return {
        matches: false,
        reason: `Amount variance (${(variance * 100).toFixed(1)}%) exceeds allowed (${(varianceAllowed * 100).toFixed(0)}%)`,
    };
}
