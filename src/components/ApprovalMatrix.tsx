'use client';

import React from 'react';

interface Rule {
    id: string;
    name: string;
    ruleType: string;
    actionType: string;
    minAmount?: number | null;
    maxAmount?: number | null;
    requiredRole?: string | null;
    requiredGroupId?: string | null;
    approvalMode?: string;
    requiredApprovals?: number;
}

interface Workflow {
    id: string;
    name: string;
    rules: Rule[];
    departmentScope?: string | null;
}

interface ApprovalMatrixProps {
    workflows: Workflow[];
}

// Amount threshold ranges for the matrix columns
const AMOUNT_RANGES = [
    { min: 0, max: 5000, label: 'R0 - R5K' },
    { min: 5000, max: 25000, label: 'R5K - R25K' },
    { min: 25000, max: 100000, label: 'R25K - R100K' },
    { min: 100000, max: 500000, label: 'R100K - R500K' },
    { min: 500000, max: null, label: 'R500K+' }
];

// Role hierarchy for matrix rows
const ROLES = [
    { value: 'manager', label: 'Manager', level: 1 },
    { value: 'senior_manager', label: 'Senior Manager', level: 2 },
    { value: 'executive', label: 'Executive', level: 3 },
    { value: 'compliance_officer', label: 'Compliance', level: 3 }
];

export default function ApprovalMatrix({ workflows }: ApprovalMatrixProps) {
    // Build the matrix data from workflow rules
    const matrixData = buildMatrixFromWorkflows(workflows);

    return (
        <div className="approval-matrix">
            <div className="matrix-legend">
                <div className="legend-item">
                    <span className="legend-dot legend-auto"></span>
                    Auto-Approve
                </div>
                <div className="legend-item">
                    <span className="legend-dot legend-single"></span>
                    Single Approver
                </div>
                <div className="legend-item">
                    <span className="legend-dot legend-multi"></span>
                    Multiple Approvers
                </div>
                <div className="legend-item">
                    <span className="legend-dot legend-escalate"></span>
                    Escalation
                </div>
            </div>

            <div className="matrix-table-wrapper">
                <table className="matrix-table">
                    <thead>
                        <tr>
                            <th className="matrix-corner">Role / Amount</th>
                            {AMOUNT_RANGES.map((range, i) => (
                                <th key={i} className="matrix-amount-header">
                                    {range.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ROLES.map((role) => (
                            <tr key={role.value}>
                                <td className="matrix-role-cell">
                                    <div className="matrix-role">
                                        <span className="matrix-role-level">L{role.level}</span>
                                        {role.label}
                                    </div>
                                </td>
                                {AMOUNT_RANGES.map((range, i) => {
                                    const cell = matrixData[role.value]?.[i];
                                    return (
                                        <td key={i} className="matrix-cell">
                                            <MatrixCell cell={cell} />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {workflows.length === 0 && (
                <div className="matrix-empty">
                    <p>No active workflows. Create a workflow to see the approval matrix.</p>
                </div>
            )}
        </div>
    );
}

interface MatrixCellData {
    hasApproval: boolean;
    ruleCount: number;
    type: 'auto' | 'single' | 'multi' | 'escalate' | 'none';
    rules: Rule[];
}

function MatrixCell({ cell }: { cell?: MatrixCellData }) {
    if (!cell || !cell.hasApproval) {
        return <div className="matrix-cell-empty">—</div>;
    }

    const cellClass = `matrix-cell-content cell-${cell.type}`;
    const icon = cell.type === 'auto' ? '⚡' :
        cell.type === 'multi' ? '👥' :
            cell.type === 'escalate' ? '📤' : '✓';

    return (
        <div className={cellClass} title={cell.rules.map(r => r.name).join(', ')}>
            <span className="matrix-cell-icon">{icon}</span>
            {cell.ruleCount > 1 && (
                <span className="matrix-cell-count">{cell.ruleCount}</span>
            )}
        </div>
    );
}

function buildMatrixFromWorkflows(workflows: Workflow[]): Record<string, Record<number, MatrixCellData>> {
    const matrix: Record<string, Record<number, MatrixCellData>> = {};

    // Initialize matrix
    ROLES.forEach(role => {
        matrix[role.value] = {};
        AMOUNT_RANGES.forEach((_, i) => {
            matrix[role.value][i] = {
                hasApproval: false,
                ruleCount: 0,
                type: 'none',
                rules: []
            };
        });
    });

    // Process all active workflows
    workflows.forEach(workflow => {
        workflow.rules.forEach(rule => {
            // Only process threshold-based rules with role requirements
            if (rule.requiredRole && (rule.ruleType === 'threshold' || rule.minAmount != null || rule.maxAmount != null)) {
                // Find which amount ranges this rule covers
                AMOUNT_RANGES.forEach((range, rangeIndex) => {
                    const ruleMin = rule.minAmount ?? 0;
                    const ruleMax = rule.maxAmount ?? Infinity;

                    // Check if rule applies to this range
                    if (ruleMin <= (range.max ?? Infinity) && ruleMax >= range.min) {
                        if (matrix[rule.requiredRole!]) {
                            const cell = matrix[rule.requiredRole!][rangeIndex];
                            cell.hasApproval = true;
                            cell.ruleCount++;
                            cell.rules.push(rule);

                            // Determine cell type
                            if (rule.actionType === 'auto_approve') {
                                cell.type = 'auto';
                            } else if (rule.actionType === 'escalate') {
                                cell.type = 'escalate';
                            } else if ((rule.requiredApprovals ?? 1) > 1) {
                                cell.type = 'multi';
                            } else {
                                cell.type = 'single';
                            }
                        }
                    }
                });
            }
        });
    });

    return matrix;
}
