'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/storage';

interface WorkflowStep {
    id: string;
    order: number;
    name?: string;
    minAmount: number;
    roleRequirement: string;
}

interface Workflow {
    id: string;
    name: string;
    description?: string;
    status: string;
    steps: WorkflowStep[];
    creator: { name: string; department: string };
    approver?: { name: string };
    createdAt: string;
}

export default function WorkflowsPage() {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState(true);
    const currentUser = getCurrentUser();
    const isExecutive = currentUser?.userName.includes('Exec') || false; // Simple check for demo

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
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Creator</th>
                                        <th>Steps</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {workflows.map((wf) => (
                                        <tr key={wf.id}>
                                            <td style={{ fontWeight: 600 }}>{wf.name}</td>
                                            <td className="text-sm">
                                                {wf.creator.name}
                                                <div className="text-xs text-muted">{wf.creator.department}</div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    {wf.steps.map((s, idx) => (
                                                        <span
                                                            key={s.id}
                                                            className="status-badge"
                                                            style={{ fontSize: '0.65rem' }}
                                                            title={`Min R${s.minAmount}`}
                                                        >
                                                            {s.roleRequirement}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-badge status-${wf.status}`}>
                                                    {wf.status === 'pending_approval' ? 'Pending Approval' : wf.status}
                                                </span>
                                            </td>
                                            <td className="text-sm text-muted">
                                                {new Date(wf.createdAt).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <div className="table-actions">
                                                    {wf.status === 'pending_approval' && isExecutive && (
                                                        <>
                                                            <button
                                                                className="btn btn-sm btn-success"
                                                                onClick={() => handleApproveWorkflow(wf.id, 'approve')}
                                                            >
                                                                ✅ Approve
                                                            </button>
                                                            <button
                                                                className="btn btn-sm btn-danger"
                                                                onClick={() => handleApproveWorkflow(wf.id, 'reject')}
                                                            >
                                                                ❌ Reject
                                                            </button>
                                                        </>
                                                    )}
                                                    {wf.status === 'active' && (
                                                        <span className="text-xs text-success font-bold">ACTIVE</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
