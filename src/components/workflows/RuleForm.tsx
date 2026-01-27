'use client';

import React, { useState, useEffect } from 'react';
import { RULE_TYPES, type RuleTypeConfig } from './RuleTypeSelector';

// Action types for rules
const ACTION_TYPES = [
    { value: 'require_approval', label: 'Require Approval' },
    { value: 'auto_approve', label: 'Auto-Approve' },
    { value: 'auto_reject', label: 'Auto-Reject' },
    { value: 'escalate', label: 'Escalate' }
];

const APPROVAL_MODES = [
    { value: 'sequential', label: 'Sequential' },
    { value: 'parallel', label: 'Parallel' }
];

const VOTING_MODES = [
    { value: 'unanimous', label: 'Unanimous (all must approve)' },
    { value: 'majority', label: 'Majority' }
];

const CUMULATIVE_PERIODS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' }
];

const ROLES = [
    { value: 'manager', label: 'Department Manager' },
    { value: 'senior_manager', label: 'Senior Manager' },
    { value: 'executive', label: 'Executive' },
    { value: 'compliance_officer', label: 'Compliance Officer' }
];

const VENDOR_RISK_RATINGS = [
    { value: 'low', label: 'Low Risk' },
    { value: 'standard', label: 'Standard' },
    { value: 'high', label: 'High Risk' },
    { value: 'new', label: 'New Vendor' }
];

const VARIANCE_BASE_FIELDS = [
    { value: 'po_amount', label: 'PO Amount' },
    { value: 'quote_amount', label: 'Quote Amount' }
];

// Rule data structure
export interface RuleFormData {
    id?: string;
    name: string;
    description: string;
    ruleType: string;
    order: number;
    isActive: boolean;

    // Threshold
    minAmount: string;
    maxAmount: string;

    // Cumulative
    cumulativePeriod: string;
    cumulativeLimit: string;

    // Variance
    variancePercentage: string;
    varianceBaseField: string;

    // Vendor
    vendorRiskRatings: string[];
    vendorIsNew: boolean;

    // Entity references
    categoryId: string;
    projectId: string;

    // Compliance
    requiresCompliance: boolean;
    requiresLegalReview: boolean;

    // SoD
    preventSelfApproval: boolean;
    preventCreatorApproval: boolean;

    // Action/Outcome
    actionType: string;
    requiredGroupId: string;
    requiredRole: string;
    specificApproverId: string;

    // Approval mode
    approvalMode: string;
    requiredApprovals: string;
    votingMode: string;

    // SLA
    slaHours: string;
    escalateToGroupId: string;
}

export const getDefaultRuleData = (order: number = 0): RuleFormData => ({
    name: '',
    description: '',
    ruleType: '',
    order,
    isActive: true,
    minAmount: '',
    maxAmount: '',
    cumulativePeriod: 'monthly',
    cumulativeLimit: '',
    variancePercentage: '5',
    varianceBaseField: 'po_amount',
    vendorRiskRatings: [],
    vendorIsNew: false,
    categoryId: '',
    projectId: '',
    requiresCompliance: false,
    requiresLegalReview: false,
    preventSelfApproval: true,
    preventCreatorApproval: true,
    actionType: 'require_approval',
    requiredGroupId: '',
    requiredRole: 'manager',
    specificApproverId: '',
    approvalMode: 'sequential',
    requiredApprovals: '1',
    votingMode: 'unanimous',
    slaHours: '',
    escalateToGroupId: ''
});

interface RuleFormProps {
    rule: RuleFormData;
    onChange: (rule: RuleFormData) => void;
    onRemove: () => void;
    index: number;
    categories?: Array<{ id: string; name: string }>;
    projects?: Array<{ id: string; name: string }>;
    userGroups?: Array<{ id: string; name: string }>;
    users?: Array<{ id: string; name: string }>;
}

export default function RuleForm({
    rule,
    onChange,
    onRemove,
    index,
    categories = [],
    projects = [],
    userGroups = [],
    users = []
}: RuleFormProps) {
    const ruleConfig = RULE_TYPES.find(r => r.type === rule.ruleType);

    const handleChange = (field: keyof RuleFormData, value: string | boolean | string[]) => {
        onChange({ ...rule, [field]: value });
    };

    const handleRiskRatingToggle = (rating: string) => {
        const current = rule.vendorRiskRatings || [];
        const updated = current.includes(rating)
            ? current.filter(r => r !== rating)
            : [...current, rating];
        handleChange('vendorRiskRatings', updated);
    };

    if (!rule.ruleType) {
        return null;
    }

    return (
        <div className="rule-form">
            <div className="rule-form-header">
                <div className="rule-form-number">{index + 1}</div>
                <div className="rule-form-type">
                    <span className="rule-type-icon">{ruleConfig?.icon}</span>
                    <span>{ruleConfig?.name || rule.ruleType}</span>
                </div>
                <button type="button" className="btn btn-sm btn-danger" onClick={onRemove}>
                    🗑️
                </button>
            </div>

            <div className="rule-form-body">
                {/* Basic Info */}
                <div className="form-row form-row-2">
                    <div className="form-group">
                        <label className="form-label">Rule Name *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={rule.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            placeholder={`e.g. ${ruleConfig?.name} Rule`}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <input
                            type="text"
                            className="form-input"
                            value={rule.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="Optional description"
                        />
                    </div>
                </div>

                {/* Threshold fields */}
                {(rule.ruleType === 'threshold' || rule.ruleType === 'auto_approve') && (
                    <div className="form-row form-row-2">
                        <div className="form-group">
                            <label className="form-label">Min Amount (R)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={rule.minAmount}
                                onChange={(e) => handleChange('minAmount', e.target.value)}
                                placeholder="0"
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Max Amount (R)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={rule.maxAmount}
                                onChange={(e) => handleChange('maxAmount', e.target.value)}
                                placeholder="No limit"
                                min="0"
                            />
                        </div>
                    </div>
                )}

                {/* Cumulative fields */}
                {rule.ruleType === 'cumulative' && (
                    <div className="form-row form-row-2">
                        <div className="form-group">
                            <label className="form-label">Period</label>
                            <select
                                className="form-select"
                                value={rule.cumulativePeriod}
                                onChange={(e) => handleChange('cumulativePeriod', e.target.value)}
                            >
                                {CUMULATIVE_PERIODS.map(p => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Limit (R)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={rule.cumulativeLimit}
                                onChange={(e) => handleChange('cumulativeLimit', e.target.value)}
                                placeholder="e.g. 50000"
                                min="0"
                            />
                        </div>
                    </div>
                )}

                {/* Variance fields */}
                {rule.ruleType === 'variance' && (
                    <div className="form-row form-row-2">
                        <div className="form-group">
                            <label className="form-label">Compare Against</label>
                            <select
                                className="form-select"
                                value={rule.varianceBaseField}
                                onChange={(e) => handleChange('varianceBaseField', e.target.value)}
                            >
                                {VARIANCE_BASE_FIELDS.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Variance Threshold (%)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={rule.variancePercentage}
                                onChange={(e) => handleChange('variancePercentage', e.target.value)}
                                placeholder="5"
                                min="0"
                                max="100"
                            />
                        </div>
                    </div>
                )}

                {/* Vendor fields */}
                {(rule.ruleType === 'vendor' || rule.ruleType === 'auto_approve') && (
                    <div className="form-group">
                        <label className="form-label">Vendor Risk Ratings</label>
                        <div className="checkbox-grid">
                            {VENDOR_RISK_RATINGS.map(r => (
                                <label key={r.value} className="form-checkbox-group">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox"
                                        checked={rule.vendorRiskRatings?.includes(r.value) || false}
                                        onChange={() => handleRiskRatingToggle(r.value)}
                                    />
                                    {r.label}
                                </label>
                            ))}
                        </div>
                        {rule.ruleType === 'vendor' && (
                            <label className="form-checkbox-group" style={{ marginTop: 'var(--spacing-sm)' }}>
                                <input
                                    type="checkbox"
                                    className="form-checkbox"
                                    checked={rule.vendorIsNew}
                                    onChange={(e) => handleChange('vendorIsNew', e.target.checked)}
                                />
                                New Vendor (not yet onboarded)
                            </label>
                        )}
                    </div>
                )}

                {/* Category field */}
                {rule.ruleType === 'category' && categories.length > 0 && (
                    <div className="form-group">
                        <label className="form-label">Spend Category</label>
                        <select
                            className="form-select"
                            value={rule.categoryId}
                            onChange={(e) => handleChange('categoryId', e.target.value)}
                        >
                            <option value="">Select category...</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Project field */}
                {rule.ruleType === 'project' && projects.length > 0 && (
                    <div className="form-group">
                        <label className="form-label">Project</label>
                        <select
                            className="form-select"
                            value={rule.projectId}
                            onChange={(e) => handleChange('projectId', e.target.value)}
                        >
                            <option value="">Select project...</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Compliance fields */}
                {rule.ruleType === 'compliance' && (
                    <div className="form-group">
                        <label className="form-label">Requirements</label>
                        <div className="checkbox-grid">
                            <label className="form-checkbox-group">
                                <input
                                    type="checkbox"
                                    className="form-checkbox"
                                    checked={rule.requiresCompliance}
                                    onChange={(e) => handleChange('requiresCompliance', e.target.checked)}
                                />
                                Compliance Officer Review
                            </label>
                            <label className="form-checkbox-group">
                                <input
                                    type="checkbox"
                                    className="form-checkbox"
                                    checked={rule.requiresLegalReview}
                                    onChange={(e) => handleChange('requiresLegalReview', e.target.checked)}
                                />
                                Legal Review
                            </label>
                        </div>
                    </div>
                )}

                {/* SoD fields */}
                {rule.ruleType === 'sod' && (
                    <div className="form-group">
                        <label className="form-label">Segregation Controls</label>
                        <div className="checkbox-grid">
                            <label className="form-checkbox-group">
                                <input
                                    type="checkbox"
                                    className="form-checkbox"
                                    checked={rule.preventSelfApproval}
                                    onChange={(e) => handleChange('preventSelfApproval', e.target.checked)}
                                />
                                Prevent Self-Approval
                            </label>
                            <label className="form-checkbox-group">
                                <input
                                    type="checkbox"
                                    className="form-checkbox"
                                    checked={rule.preventCreatorApproval}
                                    onChange={(e) => handleChange('preventCreatorApproval', e.target.checked)}
                                />
                                Prevent Creator from Approving
                            </label>
                        </div>
                    </div>
                )}

                {/* SLA fields */}
                {rule.ruleType === 'sla' && (
                    <div className="form-row form-row-2">
                        <div className="form-group">
                            <label className="form-label">SLA Hours</label>
                            <input
                                type="number"
                                className="form-input"
                                value={rule.slaHours}
                                onChange={(e) => handleChange('slaHours', e.target.value)}
                                placeholder="e.g. 24"
                                min="1"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Escalate To Group</label>
                            <select
                                className="form-select"
                                value={rule.escalateToGroupId}
                                onChange={(e) => handleChange('escalateToGroupId', e.target.value)}
                            >
                                <option value="">Select group...</option>
                                {userGroups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Dual Control fields */}
                {rule.ruleType === 'dual_control' && (
                    <div className="form-row form-row-2">
                        <div className="form-group">
                            <label className="form-label">Required Approvals</label>
                            <input
                                type="number"
                                className="form-input"
                                value={rule.requiredApprovals}
                                onChange={(e) => handleChange('requiredApprovals', e.target.value)}
                                placeholder="2"
                                min="2"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Voting Mode</label>
                            <select
                                className="form-select"
                                value={rule.votingMode}
                                onChange={(e) => handleChange('votingMode', e.target.value)}
                            >
                                {VOTING_MODES.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <hr className="rule-form-divider" />

                {/* Action/Outcome Section - shown for most rule types */}
                {rule.ruleType !== 'sod' && rule.ruleType !== 'sla' && (
                    <>
                        <div className="form-row form-row-3">
                            <div className="form-group">
                                <label className="form-label">Action</label>
                                <select
                                    className="form-select"
                                    value={rule.actionType}
                                    onChange={(e) => handleChange('actionType', e.target.value)}
                                >
                                    {ACTION_TYPES.map(a => (
                                        <option key={a.value} value={a.value}>{a.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Required Role</label>
                                <select
                                    className="form-select"
                                    value={rule.requiredRole}
                                    onChange={(e) => handleChange('requiredRole', e.target.value)}
                                >
                                    <option value="">Any</option>
                                    {ROLES.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Approval Mode</label>
                                <select
                                    className="form-select"
                                    value={rule.approvalMode}
                                    onChange={(e) => handleChange('approvalMode', e.target.value)}
                                >
                                    {APPROVAL_MODES.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Optional: Specific approver or group */}
                        <div className="form-row form-row-2">
                            <div className="form-group">
                                <label className="form-label">Approver Group</label>
                                <select
                                    className="form-select"
                                    value={rule.requiredGroupId}
                                    onChange={(e) => handleChange('requiredGroupId', e.target.value)}
                                >
                                    <option value="">Any eligible user</option>
                                    {userGroups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Specific Approver</label>
                                <select
                                    className="form-select"
                                    value={rule.specificApproverId}
                                    onChange={(e) => handleChange('specificApproverId', e.target.value)}
                                >
                                    <option value="">Not specified</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
