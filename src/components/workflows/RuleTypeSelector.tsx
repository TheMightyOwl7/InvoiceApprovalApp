'use client';

import React from 'react';

// Rule type configuration with metadata for UI display
export const RULE_TYPES = [
    // Amount-based rules
    {
        type: 'threshold',
        name: 'Amount Threshold',
        icon: '💰',
        description: 'Route based on payment amount',
        category: 'Amount',
        fields: ['minAmount', 'maxAmount', 'requiredRole', 'requiredGroupId']
    },
    {
        type: 'cumulative',
        name: 'Cumulative Limit',
        icon: '📊',
        description: 'Daily/weekly/monthly spending limits',
        category: 'Amount',
        fields: ['cumulativePeriod', 'cumulativeLimit', 'requiredRole']
    },
    {
        type: 'variance',
        name: 'PO/Quote Variance',
        icon: '📉',
        description: 'Flag when amount exceeds PO/quote by %',
        category: 'Amount',
        fields: ['variancePercentage', 'varianceBaseField', 'requiredRole']
    },
    // Entity-based rules
    {
        type: 'vendor',
        name: 'Vendor Risk',
        icon: '🏢',
        description: 'Route based on vendor risk rating',
        category: 'Entity',
        fields: ['vendorRiskRatings', 'vendorIsNew', 'requiredRole']
    },
    {
        type: 'category',
        name: 'Spend Category',
        icon: '🏷️',
        description: 'Route to category approver',
        category: 'Entity',
        fields: ['categoryId', 'requiredRole', 'specificApproverId']
    },
    {
        type: 'project',
        name: 'Project Approval',
        icon: '📁',
        description: 'Require project manager approval',
        category: 'Entity',
        fields: ['projectId', 'requiredRole']
    },
    // Control rules
    {
        type: 'compliance',
        name: 'Compliance Review',
        icon: '✅',
        description: 'Legal/compliance officer review',
        category: 'Control',
        fields: ['requiresCompliance', 'requiresLegalReview', 'requiredRole']
    },
    {
        type: 'sod',
        name: 'Segregation of Duties',
        icon: '🔒',
        description: 'Prevent self-approval',
        category: 'Control',
        fields: ['preventSelfApproval', 'preventCreatorApproval']
    },
    {
        type: 'dual_control',
        name: 'Dual Control',
        icon: '👥',
        description: 'Require multiple approvers',
        category: 'Control',
        fields: ['requiredApprovals', 'votingMode', 'requiredGroupId']
    },
    // Auto rules
    {
        type: 'sla',
        name: 'SLA Escalation',
        icon: '⏱️',
        description: 'Auto-escalate if not actioned',
        category: 'SLA',
        fields: ['slaHours', 'escalateToGroupId']
    },
    {
        type: 'auto_approve',
        name: 'Auto-Approve',
        icon: '⚡',
        description: 'Whitelist recurring/contract payments',
        category: 'Auto',
        fields: ['minAmount', 'maxAmount', 'vendorRiskRatings']
    }
] as const;

export type RuleTypeConfig = typeof RULE_TYPES[number];

interface RuleTypeSelectorProps {
    selectedType: string | null;
    onSelect: (type: string) => void;
}

export default function RuleTypeSelector({ selectedType, onSelect }: RuleTypeSelectorProps) {
    // Group rules by category
    const categories = RULE_TYPES.reduce((acc, rule) => {
        if (!acc[rule.category]) {
            acc[rule.category] = [];
        }
        acc[rule.category].push(rule);
        return acc;
    }, {} as Record<string, RuleTypeConfig[]>);

    return (
        <div className="rule-type-selector">
            {Object.entries(categories).map(([category, rules]) => (
                <div key={category} className="rule-category">
                    <div className="rule-category-title">{category}</div>
                    <div className="rule-type-grid">
                        {rules.map((rule) => (
                            <button
                                key={rule.type}
                                type="button"
                                className={`rule-type-card ${selectedType === rule.type ? 'selected' : ''}`}
                                onClick={() => onSelect(rule.type)}
                            >
                                <span className="rule-type-icon">{rule.icon}</span>
                                <div className="rule-type-info">
                                    <div className="rule-type-name">{rule.name}</div>
                                    <div className="rule-type-desc">{rule.description}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
