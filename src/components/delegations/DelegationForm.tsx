'use client';

import React, { useState, useEffect } from 'react';

interface User {
    id: string;
    name: string;
    email: string;
    department: string;
}

export interface DelegationFormData {
    id?: string;
    delegatorId: string;
    delegateId: string;
    startDate: string;
    endDate: string;
    maxAmount: string;
    isActive: boolean;
    reason: string;
}

export const getDefaultDelegationData = (currentUserId: string): DelegationFormData => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return {
        delegatorId: currentUserId,
        delegateId: '',
        startDate: today.toISOString().split('T')[0],
        endDate: nextWeek.toISOString().split('T')[0],
        maxAmount: '',
        isActive: true,
        reason: ''
    };
};

interface DelegationFormProps {
    delegation: DelegationFormData;
    onSave: (delegation: DelegationFormData) => Promise<void>;
    onCancel: () => void;
    saving?: boolean;
    currentUserId: string;
}

export default function DelegationForm({ delegation, onSave, onCancel, saving = false, currentUserId }: DelegationFormProps) {
    const [formData, setFormData] = useState<DelegationFormData>(delegation);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<User[]>([]);

    const isEdit = !!delegation.id;

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            if (data.success) {
                // Filter out current user (can't delegate to yourself)
                setUsers(data.data.filter((u: User) => u.id !== currentUserId));
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    }

    const handleChange = (field: keyof DelegationFormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.delegateId) {
            setError('Please select a delegate');
            return;
        }

        if (!formData.startDate || !formData.endDate) {
            setError('Please select start and end dates');
            return;
        }

        if (new Date(formData.endDate) <= new Date(formData.startDate)) {
            setError('End date must be after start date');
            return;
        }

        try {
            await onSave(formData);
        } catch (err) {
            setError('Failed to save delegation');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        {isEdit ? 'Edit Delegation' : 'Create Out-of-Office Delegation'}
                    </h3>
                    <button className="modal-close" onClick={onCancel}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && (
                            <div className="validation-warning" style={{ marginBottom: 'var(--spacing-md)' }}>
                                <span className="validation-icon">⚠️</span>
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Delegate Approvals To *</label>
                            <select
                                className="form-select"
                                value={formData.delegateId}
                                onChange={(e) => handleChange('delegateId', e.target.value)}
                                required
                            >
                                <option value="">Select a delegate...</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.name} ({u.department})
                                    </option>
                                ))}
                            </select>
                            <span className="form-hint">This person will receive approval requests on your behalf</span>
                        </div>

                        <div className="form-row form-row-2">
                            <div className="form-group">
                                <label className="form-label">Start Date *</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.startDate}
                                    onChange={(e) => handleChange('startDate', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">End Date *</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.endDate}
                                    onChange={(e) => handleChange('endDate', e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Maximum Amount (Optional)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.maxAmount}
                                onChange={(e) => handleChange('maxAmount', e.target.value)}
                                placeholder="No limit"
                                step="0.01"
                                min="0"
                            />
                            <span className="form-hint">Leave empty for no limit. Requests above this amount won&apos;t be delegated.</span>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Reason (Optional)</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.reason}
                                onChange={(e) => handleChange('reason', e.target.value)}
                                placeholder="e.g., Annual leave, Conference travel"
                            />
                        </div>

                        {isEdit && (
                            <div className="form-group">
                                <label className="form-checkbox-group">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => handleChange('isActive', e.target.checked)}
                                    />
                                    Delegation is Active
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onCancel}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Delegation')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
