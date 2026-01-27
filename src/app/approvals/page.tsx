'use client';

import { useState, useEffect } from 'react';
import ApprovalMatrix from '@/components/ApprovalMatrix';

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
    status: string;
}

export default function ApprovalsPage() {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedWorkflow, setSelectedWorkflow] = useState<string>('all');
    const [departmentFilter, setDepartmentFilter] = useState<string>('all');

    useEffect(() => {
        fetchWorkflows();
    }, []);

    async function fetchWorkflows() {
        try {
            setLoading(true);
            const res = await fetch('/api/workflows?status=active');
            const data = await res.json();
            if (data.success) {
                setWorkflows(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch workflows:', error);
        } finally {
            setLoading(false);
        }
    }

    // Filter workflows based on selections
    const filteredWorkflows = workflows.filter(wf => {
        if (selectedWorkflow !== 'all' && wf.id !== selectedWorkflow) return false;
        if (departmentFilter !== 'all' && wf.departmentScope !== departmentFilter && wf.departmentScope !== null) return false;
        return true;
    });

    // Get unique departments from workflows
    const departments = Array.from(new Set(
        workflows
            .map(wf => wf.departmentScope)
            .filter(Boolean) as string[]
    ));

    return (
        <div className="monitoring-container">
            <div className="page-header">
                <h1 className="page-title">Approval Matrix</h1>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="card-body">
                    <div className="filter-panel">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Workflow</label>
                            <select
                                className="form-select"
                                value={selectedWorkflow}
                                onChange={(e) => setSelectedWorkflow(e.target.value)}
                            >
                                <option value="all">All Active Workflows</option>
                                {workflows.map(wf => (
                                    <option key={wf.id} value={wf.id}>{wf.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Department</label>
                            <select
                                className="form-select"
                                value={departmentFilter}
                                onChange={(e) => setDepartmentFilter(e.target.value)}
                            >
                                <option value="all">All Departments</option>
                                {departments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Matrix */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">
                        Approval Authority by Role & Amount
                        {filteredWorkflows.length > 0 && (
                            <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.875rem', marginLeft: '0.5rem' }}>
                                ({filteredWorkflows.length} workflow{filteredWorkflows.length !== 1 ? 's' : ''})
                            </span>
                        )}
                    </h3>
                </div>
                <div className="card-body">
                    {loading ? (
                        <div className="empty-state">
                            <p>Loading approval matrix...</p>
                        </div>
                    ) : (
                        <ApprovalMatrix workflows={filteredWorkflows} />
                    )}
                </div>
            </div>

            {/* Summary Stats */}
            {!loading && filteredWorkflows.length > 0 && (
                <div className="summary-stats">
                    <div className="summary-card info">
                        <div className="summary-card-label">Total Rules</div>
                        <div className="summary-card-value">
                            {filteredWorkflows.reduce((sum, wf) => sum + wf.rules.length, 0)}
                        </div>
                    </div>
                    <div className="summary-card success">
                        <div className="summary-card-label">Auto-Approve Rules</div>
                        <div className="summary-card-value">
                            {filteredWorkflows.reduce((sum, wf) =>
                                sum + wf.rules.filter(r => r.actionType === 'auto_approve').length, 0
                            )}
                        </div>
                    </div>
                    <div className="summary-card warning">
                        <div className="summary-card-label">Multi-Approver Rules</div>
                        <div className="summary-card-value">
                            {filteredWorkflows.reduce((sum, wf) =>
                                sum + wf.rules.filter(r => (r.requiredApprovals ?? 1) > 1).length, 0
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
