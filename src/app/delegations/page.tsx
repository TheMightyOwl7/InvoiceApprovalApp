'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/storage';
import DelegationForm, { type DelegationFormData, getDefaultDelegationData } from '@/components/delegations/DelegationForm';

interface User {
    id: string;
    name: string;
    email: string;
    department: string;
}

interface Delegation {
    id: string;
    delegator: User;
    delegate: User;
    startDate: string;
    endDate: string;
    maxAmount?: number | null;
    isActive: boolean;
    reason?: string | null;
}

export default function DelegationsPage() {
    const [delegations, setDelegations] = useState<Delegation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingDelegation, setEditingDelegation] = useState<DelegationFormData | null>(null);
    const [saving, setSaving] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('active');

    const currentUser = getCurrentUser();

    useEffect(() => {
        fetchDelegations();
    }, [statusFilter]);

    async function fetchDelegations() {
        try {
            setLoading(true);
            const res = await fetch(`/api/delegations?status=${statusFilter}`);
            const data = await res.json();
            if (data.success) {
                setDelegations(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch delegations:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveDelegation(delegation: DelegationFormData) {
        if (!currentUser) return;
        setSaving(true);
        try {
            const url = delegation.id ? `/api/delegations/${delegation.id}` : '/api/delegations';
            const method = delegation.id ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...delegation,
                    delegatorId: currentUser.userId
                })
            });

            const data = await res.json();
            if (data.success) {
                setShowForm(false);
                setEditingDelegation(null);
                fetchDelegations();
            } else {
                alert(data.error || 'Failed to save delegation');
            }
        } catch (error) {
            alert('Failed to save delegation');
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteDelegation(id: string) {
        if (!confirm('Are you sure you want to cancel this delegation?')) return;

        try {
            const res = await fetch(`/api/delegations/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                fetchDelegations();
            } else {
                alert(data.error || 'Failed to delete delegation');
            }
        } catch (error) {
            alert('Failed to delete delegation');
        }
    }

    function handleEdit(delegation: Delegation) {
        setEditingDelegation({
            id: delegation.id,
            delegatorId: delegation.delegator.id,
            delegateId: delegation.delegate.id,
            startDate: delegation.startDate.split('T')[0],
            endDate: delegation.endDate.split('T')[0],
            maxAmount: delegation.maxAmount?.toString() || '',
            isActive: delegation.isActive,
            reason: delegation.reason || ''
        });
        setShowForm(true);
    }

    function handleAdd() {
        if (!currentUser) return;
        setEditingDelegation(null);
        setShowForm(true);
    }

    const isCurrentlyActive = (d: Delegation) => {
        const now = new Date();
        const start = new Date(d.startDate);
        const end = new Date(d.endDate);
        return d.isActive && start <= now && end >= now;
    };

    // My delegations (where I am the delegator or delegate)
    const myDelegations = delegations.filter(d =>
        d.delegator.id === currentUser?.userId || d.delegate.id === currentUser?.userId
    );

    return (
        <div className="monitoring-container">
            <div className="page-header">
                <h1 className="page-title">Delegations & Out-of-Office</h1>
                <button className="btn btn-primary" onClick={handleAdd}>
                    ➕ Create Delegation
                </button>
            </div>

            {/* Active Delegations Banner */}
            {myDelegations.some(d => isCurrentlyActive(d) && d.delegate.id === currentUser?.userId) && (
                <div className="validation-success">
                    <span className="validation-icon">📥</span>
                    <strong>You have active delegations:</strong>&nbsp;
                    {myDelegations
                        .filter(d => isCurrentlyActive(d) && d.delegate.id === currentUser?.userId)
                        .map(d => d.delegator.name)
                        .join(', ')}
                    &apos;s approvals are delegated to you.
                </div>
            )}

            {/* Filters */}
            <div className="card">
                <div className="card-body">
                    <div className="filter-panel" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 200px))' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Status</label>
                            <select
                                className="form-select"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="active">Active</option>
                                <option value="all">All</option>
                                <option value="expired">Expired</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delegation List */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Delegations</h3>
                </div>
                <div className="card-body">
                    {loading ? (
                        <div className="empty-state">
                            <p>Loading delegations...</p>
                        </div>
                    ) : delegations.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">🏖️</div>
                            <div className="empty-state-title">No delegations found</div>
                            <p>Create a delegation to have someone approve requests on your behalf when you&apos;re away.</p>
                            <button className="btn btn-primary" onClick={handleAdd}>
                                ➕ Create Delegation
                            </button>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Delegator</th>
                                        <th>Delegate</th>
                                        <th>Period</th>
                                        <th>Limit</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {delegations.map((d) => (
                                        <tr key={d.id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{d.delegator.name}</div>
                                                <div className="text-xs text-muted">{d.delegator.department}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{d.delegate.name}</div>
                                                <div className="text-xs text-muted">{d.delegate.department}</div>
                                            </td>
                                            <td className="text-sm">
                                                {new Date(d.startDate).toLocaleDateString()} —<br />
                                                {new Date(d.endDate).toLocaleDateString()}
                                            </td>
                                            <td className="text-sm">
                                                {d.maxAmount ? `R${d.maxAmount.toLocaleString()}` : 'No limit'}
                                            </td>
                                            <td>
                                                {isCurrentlyActive(d) ? (
                                                    <span className="status-badge status-approved">Active</span>
                                                ) : !d.isActive ? (
                                                    <span className="status-badge status-rejected">Disabled</span>
                                                ) : new Date(d.startDate) > new Date() ? (
                                                    <span className="status-badge status-pending">Pending</span>
                                                ) : (
                                                    <span className="status-badge">Expired</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="table-actions">
                                                    {d.delegator.id === currentUser?.userId && (
                                                        <>
                                                            <button
                                                                className="btn btn-sm btn-secondary"
                                                                onClick={() => handleEdit(d)}
                                                            >
                                                                ✏️ Edit
                                                            </button>
                                                            <button
                                                                className="btn btn-sm btn-danger"
                                                                onClick={() => handleDeleteDelegation(d.id)}
                                                            >
                                                                🗑️
                                                            </button>
                                                        </>
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

            {/* Delegation Form Modal */}
            {showForm && currentUser && (
                <DelegationForm
                    delegation={editingDelegation || getDefaultDelegationData(currentUser.userId)}
                    onSave={handleSaveDelegation}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingDelegation(null);
                    }}
                    saving={saving}
                    currentUserId={currentUser.userId}
                />
            )}
        </div>
    );
}
