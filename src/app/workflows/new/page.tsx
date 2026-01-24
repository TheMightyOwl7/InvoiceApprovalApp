'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/storage';

interface WorkflowStepInput {
    order: number;
    name: string;
    minAmount: number;
    roleRequirement: string;
}

const ROLES = [
    { value: 'manager', label: 'Department Manager' },
    { value: 'senior_manager', label: 'Senior Manager' },
    { value: 'executive', label: 'Executive' }
];

export default function NewWorkflowPage() {
    const router = useRouter();
    const currentUser = getCurrentUser();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [steps, setSteps] = useState<WorkflowStepInput[]>([
        { order: 0, name: 'Initial Review', minAmount: 0, roleRequirement: 'manager' }
    ]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function addStep() {
        setSteps([
            ...steps,
            {
                order: steps.length,
                name: `Step ${steps.length + 1}`,
                minAmount: 0,
                roleRequirement: 'senior_manager'
            }
        ]);
    }

    function removeStep(index: number) {
        if (steps.length <= 1) return;
        const newSteps = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i }));
        setSteps(newSteps);
    }

    function updateStep(index: number, field: keyof WorkflowStepInput, value: string | number) {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        setSteps(newSteps);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!currentUser) {
            setError('No current user session found');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const res = await fetch('/api/workflows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    steps,
                    creatorId: currentUser.userId
                })
            });

            const data = await res.json();
            if (data.success) {
                router.push('/workflows');
            } else {
                setError(data.error || 'Failed to create workflow');
            }
        } catch (error) {
            setError('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="monitoring-container">
            <div className="page-header">
                <h1 className="page-title">Build Approval Workflow</h1>
                <button
                    className="btn btn-secondary"
                    onClick={() => router.back()}
                >
                    Cancel
                </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                {error && (
                    <div className="form-error">
                        {error}
                    </div>
                )}

                <div className="card">
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                            <div className="form-group">
                                <label className="form-label">Workflow Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Standard OpEx Workflow"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g. Workflow for general office expenses"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="page-header" style={{ marginBottom: 0 }}>
                    <h2 className="page-title" style={{ fontSize: '1.25rem' }}>Workflow Steps</h2>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addStep}>
                        ➕ Add Step
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    {steps.map((step, index) => (
                        <div key={index} className="card">
                            <div className="card-body" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'var(--color-primary)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    flexShrink: 0
                                }}>
                                    {index + 1}
                                </div>
                                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 'var(--spacing-md)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Step Name</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={step.name}
                                            onChange={(e) => updateStep(index, 'name', e.target.value)}
                                            placeholder="Step Name"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Required Role</label>
                                        <select
                                            className="form-select"
                                            value={step.roleRequirement}
                                            onChange={(e) => updateStep(index, 'roleRequirement', e.target.value)}
                                        >
                                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Min Amount (R)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={step.minAmount}
                                            onChange={(e) => updateStep(index, 'minAmount', e.target.value)}
                                            min="0"
                                        />
                                    </div>
                                </div>
                                {steps.length > 1 && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-danger"
                                        style={{ marginTop: '30px' }}
                                        onClick={() => removeStep(index)}
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
                    <button type="submit" className="btn btn-primary" disabled={saving || !name}>
                        {saving ? 'Creating...' : 'Submit for Executive Approval'}
                    </button>
                </div>
            </form>
        </div>
    );
}
