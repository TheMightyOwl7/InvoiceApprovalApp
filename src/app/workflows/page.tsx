'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/storage';
import WorkflowVisualizer, { WorkflowVisualizerCompact } from '@/components/workflows/WorkflowVisualizer';

interface Rule {
    id: string;
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

interface Workflow {
    id: string;
    name: string;
    description?: string;
    status: string;
    rules: Rule[];
    creator: { name: string; department: string };
    approver?: { name: string };
    createdAt: string;
}

export default function WorkflowsPage() {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const currentUser = getCurrentUser();
    const isExecutive = currentUser?.userName.includes('Exec') || false;

    useEffect(() => {
        fetchWorkflows();
    }, []);

    async function fetchWorkflows() {
        try {
            setLoading(true);
            const res = await fetch('/api/workflows');
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

    async function handleApproveWorkflow(workflowId: string, action: 'approve' | 'reject') {
        if (!currentUser) return;

        try {
            const res = await fetch(`/api/workflows/${workflowId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    approverId: currentUser.userId,
                    action
                })
            });
            const data = await res.json();
            if (data.success) {
                fetchWorkflows();
            } else {
                alert(data.error || 'Failed to action workflow');
            }
        } catch (error) {
            alert('Failed to process request');
        }
    }

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="monitoring-container">
            <div className="page-header">
                <h1 className="page-title">Approval Workflows</h1>
                <Link href="/workflows/new" className="btn btn-primary">
                    ➕ Create Workflow
                </Link>
            </div>

            <div className="card">
                <div className="card-body">
                    {loading ? (
                        <div className="empty-state">
                            <p>Loading workflows...</p>
                        </div>
                    ) : workflows.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">⛓️</div>
                            <div className="empty-state-title">No workflows defined</div>
                            <p>Create your first approval workflow to automate payment requests.</p>
                            <Link href="/workflows/new" className="btn btn-primary mt-md">
                                ➕ Create First Workflow
                            </Link>
                        </div>
                    ) : (
                        <div className="workflow-list">
                            {workflows.map((wf) => (
                                <div key={wf.id} className="workflow-card">
                                    <div className="workflow-card-header" onClick={() => toggleExpand(wf.id)}>
                                        <div className="workflow-card-info">
                                            <div className="workflow-card-title">
                                                <span className="workflow-expand-icon">
                                                    {expandedId === wf.id ? '▼' : '▶'}
                                                </span>
                                                {wf.name}
                                            </div>
                                            <div className="workflow-card-meta">
                                                <span>by {wf.creator.name}</span>
                                                <span>•</span>
                                                <span>{wf.rules.length} rules</span>
                                                <span>•</span>
                                                <span>{new Date(wf.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="workflow-card-actions">
                                            <span className={`status-badge status-${wf.status}`}>
                                                {wf.status === 'pending_approval' ? 'Pending' : wf.status}
                                            </span>
                                            {wf.status === 'pending_approval' && isExecutive && (
                                                <>
                                                    <button
                                                        className="btn btn-sm btn-success"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleApproveWorkflow(wf.id, 'approve');
                                                        }}
                                                    >
                                                        ✅
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleApproveWorkflow(wf.id, 'reject');
                                                        }}
                                                    >
                                                        ❌
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Compact preview when collapsed */}
                                    {expandedId !== wf.id && wf.rules.length > 0 && (
                                        <div className="workflow-card-preview">
                                            <WorkflowVisualizerCompact workflow={wf} />
                                        </div>
                                    )}

                                    {/* Full visualizer when expanded */}
                                    {expandedId === wf.id && (
                                        <div className="workflow-card-expanded">
                                            {wf.description && (
                                                <p className="workflow-description">{wf.description}</p>
                                            )}
                                            <WorkflowVisualizer workflow={wf} showDetails={true} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
