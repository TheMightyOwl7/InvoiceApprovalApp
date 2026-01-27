'use client';

import React from 'react';

// Interface for the rule data structure
interface Rule {
    id?: string;
    name: string;
    ruleType: string;
    order: number;
    actionType: string;
    minAmount?: number | null;
    maxAmount?: number | null;
    requiredRole?: string | null;
    requiredGroupId?: string | null;
    approvalMode?: string;
    requiredApprovals?: number;
}

// Interface for the workflow
interface Workflow {
    id: string;
    name: string;
    rules: Rule[];
    status: string;
}

// Rule type display info
const RULE_TYPE_INFO: Record<string, { icon: string; color: string }> = {
    threshold: { icon: '💰', color: '#2563eb' },
    cumulative: { icon: '📊', color: '#7c3aed' },
    variance: { icon: '📉', color: '#dc2626' },
    vendor: { icon: '🏢', color: '#ea580c' },
    category: { icon: '🏷️', color: '#0891b2' },
    project: { icon: '📁', color: '#059669' },
    compliance: { icon: '✅', color: '#16a34a' },
    sod: { icon: '🔒', color: '#9333ea' },
    dual_control: { icon: '👥', color: '#0284c7' },
    sla: { icon: '⏱️', color: '#ca8a04' },
    auto_approve: { icon: '⚡', color: '#65a30d' }
};

interface WorkflowVisualizerProps {
    workflow: Workflow;
    showDetails?: boolean;
}

export default function WorkflowVisualizer({ workflow, showDetails = true }: WorkflowVisualizerProps) {
    const rules = workflow.rules || [];

    // Group sequential vs parallel rules
    const sortedRules = [...rules].sort((a, b) => a.order - b.order);

    if (rules.length === 0) {
        return (
            <div className="workflow-visualizer-empty">
                <span className="empty-state-icon">📋</span>
                <p>No rules configured</p>
            </div>
        );
    }

    return (
        <div className="workflow-visualizer">
            {/* Start Node */}
            <div className="wv-node wv-node-start">
                <div className="wv-node-icon">📥</div>
                <div className="wv-node-label">Request Submitted</div>
            </div>

            <div className="wv-connector" />

            {/* Rules Flow */}
            <div className="wv-rules-flow">
                {sortedRules.map((rule, index) => (
                    <React.Fragment key={rule.id || index}>
                        <div className="wv-rule-node">
                            <div
                                className="wv-rule-header"
                                style={{
                                    borderLeftColor: RULE_TYPE_INFO[rule.ruleType]?.color || '#6b7280'
                                }}
                            >
                                <span className="wv-rule-icon">
                                    {RULE_TYPE_INFO[rule.ruleType]?.icon || '📋'}
                                </span>
                                <div className="wv-rule-title">
                                    <div className="wv-rule-name">{rule.name}</div>
                                    <div className="wv-rule-type">{rule.ruleType.replace('_', ' ')}</div>
                                </div>
                                <span className={`wv-rule-mode ${rule.approvalMode}`}>
                                    {rule.approvalMode === 'parallel' ? '⇉' : '→'}
                                </span>
                            </div>

                            {showDetails && (
                                <div className="wv-rule-details">
                                    {/* Amount conditions */}
                                    {(rule.minAmount != null || rule.maxAmount != null) && (
                                        <div className="wv-detail-row">
                                            <span className="wv-detail-label">Amount:</span>
                                            <span className="wv-detail-value">
                                                {rule.minAmount != null && `R${rule.minAmount.toLocaleString()}`}
                                                {rule.minAmount != null && rule.maxAmount != null && ' - '}
                                                {rule.maxAmount != null && `R${rule.maxAmount.toLocaleString()}`}
                                                {rule.minAmount != null && rule.maxAmount == null && '+'}
                                            </span>
                                        </div>
                                    )}

                                    {/* Action */}
                                    <div className="wv-detail-row">
                                        <span className="wv-detail-label">Action:</span>
                                        <span className={`wv-action-badge action-${rule.actionType}`}>
                                            {rule.actionType === 'require_approval' && '🔐 Approval'}
                                            {rule.actionType === 'auto_approve' && '⚡ Auto'}
                                            {rule.actionType === 'auto_reject' && '❌ Reject'}
                                            {rule.actionType === 'escalate' && '📤 Escalate'}
                                        </span>
                                    </div>

                                    {/* Required role */}
                                    {rule.requiredRole && (
                                        <div className="wv-detail-row">
                                            <span className="wv-detail-label">Approver:</span>
                                            <span className="wv-detail-value">{rule.requiredRole.replace('_', ' ')}</span>
                                        </div>
                                    )}

                                    {/* Multiple approvals */}
                                    {rule.requiredApprovals && rule.requiredApprovals > 1 && (
                                        <div className="wv-detail-row">
                                            <span className="wv-detail-label">Required:</span>
                                            <span className="wv-detail-value">{rule.requiredApprovals} approvers</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Connector between rules */}
                        {index < sortedRules.length - 1 && (
                            <div className="wv-connector">
                                <div className="wv-connector-line" />
                                <div className="wv-connector-arrow">▼</div>
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>

            <div className="wv-connector" />

            {/* End Nodes - Outcomes */}
            <div className="wv-outcomes">
                <div className="wv-node wv-node-approved">
                    <div className="wv-node-icon">✅</div>
                    <div className="wv-node-label">Approved</div>
                </div>
                <div className="wv-node wv-node-rejected">
                    <div className="wv-node-icon">❌</div>
                    <div className="wv-node-label">Rejected</div>
                </div>
            </div>
        </div>
    );
}

// Compact version for list views
export function WorkflowVisualizerCompact({ workflow }: { workflow: Workflow }) {
    const rules = workflow.rules || [];

    return (
        <div className="wv-compact">
            <div className="wv-compact-start">📥</div>
            <div className="wv-compact-arrow">→</div>
            {rules.slice(0, 4).map((rule, i) => (
                <React.Fragment key={rule.id || i}>
                    <div
                        className="wv-compact-rule"
                        title={rule.name}
                        style={{
                            borderColor: RULE_TYPE_INFO[rule.ruleType]?.color || '#6b7280'
                        }}
                    >
                        {RULE_TYPE_INFO[rule.ruleType]?.icon || '📋'}
                    </div>
                    {i < Math.min(rules.length - 1, 3) && (
                        <div className="wv-compact-arrow">→</div>
                    )}
                </React.Fragment>
            ))}
            {rules.length > 4 && (
                <>
                    <div className="wv-compact-arrow">→</div>
                    <div className="wv-compact-more">+{rules.length - 4}</div>
                </>
            )}
            <div className="wv-compact-arrow">→</div>
            <div className="wv-compact-end">✓</div>
        </div>
    );
}
