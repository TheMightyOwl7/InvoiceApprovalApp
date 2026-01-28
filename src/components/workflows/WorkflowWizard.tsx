'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/storage';
import FlowCanvas from './FlowCanvas';
import { type WorkflowStageData } from './StageColumn';

// Wizard steps
type WizardStep = 'info' | 'stages' | 'review';

interface Category {
    id: string;
    name: string;
}

interface Project {
    id: string;
    name: string;
}

interface UserGroup {
    id: string;
    name: string;
}

interface UserOption {
    id: string;
    name: string;
}

export default function WorkflowWizard() {
    const router = useRouter();
    const currentUser = getCurrentUser();

    // Wizard state
    const [step, setStep] = useState<WizardStep>('info');

    // Workflow data
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [departmentScope, setDepartmentScope] = useState('');
    const [stages, setStages] = useState<WorkflowStageData[]>([]);

    // UI state
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reference data
    const [categories, setCategories] = useState<Category[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
    const [users, setUsers] = useState<UserOption[]>([]);

    useEffect(() => {
        fetchReferenceData();
    }, []);

    async function fetchReferenceData() {
        try {
            const [catRes, projRes, groupRes, userRes] = await Promise.all([
                fetch('/api/categories').catch(() => ({ ok: false })),
                fetch('/api/projects').catch(() => ({ ok: false })),
                fetch('/api/groups').catch(() => ({ ok: false })),
                fetch('/api/users').catch(() => ({ ok: false }))
            ]);

            if (catRes.ok && 'json' in catRes) {
                const data = await catRes.json();
                if (data.success) setCategories(data.data || []);
            }
            if (projRes.ok && 'json' in projRes) {
                const data = await projRes.json();
                if (data.success) setProjects(data.data || []);
            }
            if (groupRes.ok && 'json' in groupRes) {
                const data = await groupRes.json();
                if (data.success) setUserGroups(data.data || []);
            }
            if (userRes.ok && 'json' in userRes) {
                const data = await userRes.json();
                if (data.success) setUsers(data.data || []);
            }
        } catch (e) {
            console.warn('Could not fetch reference data:', e);
        }
    }

    const canProceedToStages = name.trim().length > 0;
    const canProceedToReview = stages.length > 0 && stages.every(s => s.name.trim().length > 0);

    const handleNext = () => {
        if (step === 'info' && canProceedToStages) {
            setStep('stages');
        } else if (step === 'stages' && canProceedToReview) {
            setStep('review');
        }
    };

    const handleBack = () => {
        if (step === 'stages') {
            setStep('info');
        } else if (step === 'review') {
            setStep('stages');
        }
    };

    async function handleSubmit() {
        if (!currentUser) {
            setError('No current user session found');
            return;
        }

        if (stages.length === 0) {
            setError('Please add at least one approval stage');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            // Transform stages to API format
            const apiStages = stages.map((stage, index) => ({
                name: stage.name,
                description: stage.description || null,
                order: index,
                stageType: stage.stageType,
                requiredRole: stage.requiredRole || null,
                requiredGroupId: stage.requiredGroupId || null,
                specificApproverIds: stage.specificApproverIds?.length
                    ? JSON.stringify(stage.specificApproverIds)
                    : null,
                approvalMode: stage.approvalMode,
                requiredApprovals: stage.requiredApprovals,
                slaHours: stage.slaHours || null,
                conditionType: stage.conditionType || null,
                conditionValue: stage.conditionValue || null,
            }));

            const res = await fetch('/api/workflows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    departmentScope: departmentScope || null,
                    stages: apiStages,
                    creatorId: currentUser.userId
                })
            });

            const data = await res.json();
            if (data.success) {
                router.push('/workflows');
            } else {
                setError(data.error || 'Failed to create workflow');
            }
        } catch (err) {
            setError('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    }

    const getStepNumber = () => {
        switch (step) {
            case 'info': return 1;
            case 'stages': return 2;
            case 'review': return 3;
            default: return 1;
        }
    };

    return (
        <div className="workflow-wizard">
            {/* Step Indicator */}
            <div className="wizard-steps">
                <div className={`wizard-step ${step === 'info' ? 'active' : getStepNumber() > 1 ? 'completed' : ''}`}>
                    <div className="wizard-step-number">1</div>
                    <div className="wizard-step-label">Basic Info</div>
                </div>
                <div className="wizard-step-connector" />
                <div className={`wizard-step ${step === 'stages' ? 'active' : getStepNumber() > 2 ? 'completed' : ''}`}>
                    <div className="wizard-step-number">2</div>
                    <div className="wizard-step-label">Define Stages</div>
                </div>
                <div className="wizard-step-connector" />
                <div className={`wizard-step ${step === 'review' ? 'active' : ''}`}>
                    <div className="wizard-step-number">3</div>
                    <div className="wizard-step-label">Review</div>
                </div>
            </div>

            {error && (
                <div className="validation-warning">
                    <span className="validation-icon">⚠️</span>
                    {error}
                </div>
            )}

            {/* Step Content */}
            <div className="wizard-content">
                {/* Step 1: Basic Info */}
                {step === 'info' && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Workflow Details</h3>
                        </div>
                        <div className="card-body">
                            <div className="form-row form-row-2">
                                <div className="form-group">
                                    <label className="form-label">Workflow Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g., Standard OpEx Workflow"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Department Scope</label>
                                    <select
                                        className="form-select"
                                        value={departmentScope}
                                        onChange={(e) => setDepartmentScope(e.target.value)}
                                    >
                                        <option value="">All Departments (Global)</option>
                                        <option value="Finance">Finance</option>
                                        <option value="Operations">Operations</option>
                                        <option value="Sales">Sales</option>
                                        <option value="Marketing">Marketing</option>
                                        <option value="IT">IT</option>
                                        <option value="HR">HR</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-input"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Optional description of this workflow's purpose"
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Define Stages */}
                {step === 'stages' && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Build Your Approval Flow</h3>
                            <span className="card-subtitle">Click + to add stages. Drag to reorder.</span>
                        </div>
                        <div className="card-body flow-canvas-container">
                            <FlowCanvas
                                stages={stages}
                                onChange={setStages}
                                users={users}
                                userGroups={userGroups}
                            />
                        </div>
                    </div>
                )}

                {/* Step 3: Review */}
                {step === 'review' && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Review Workflow</h3>
                        </div>
                        <div className="card-body">
                            <div className="workflow-review">
                                <div className="review-section">
                                    <h4>📋 Workflow Info</h4>
                                    <div className="review-grid">
                                        <div className="review-item">
                                            <span className="review-label">Name:</span>
                                            <span className="review-value">{name}</span>
                                        </div>
                                        <div className="review-item">
                                            <span className="review-label">Scope:</span>
                                            <span className="review-value">{departmentScope || 'All Departments'}</span>
                                        </div>
                                        {description && (
                                            <div className="review-item full-width">
                                                <span className="review-label">Description:</span>
                                                <span className="review-value">{description}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="review-section">
                                    <h4>🔄 Approval Stages ({stages.length})</h4>
                                    <div className="review-stages">
                                        {stages.map((stage, i) => (
                                            <div key={i} className="review-stage">
                                                <div className="review-stage-number">{i + 1}</div>
                                                <div className="review-stage-info">
                                                    <div className="review-stage-name">{stage.name}</div>
                                                    <div className="review-stage-meta">
                                                        {stage.requiredRole && <span>👤 {stage.requiredRole}</span>}
                                                        <span>📥 {stage.approvalMode === 'any' ? '1 approver' :
                                                            stage.approvalMode === 'all' ? 'All must approve' :
                                                                stage.approvalMode === 'majority' ? 'Majority' :
                                                                    `${stage.requiredApprovals} approvals`}</span>
                                                        {stage.slaHours && <span>⏱️ {stage.slaHours}h SLA</span>}
                                                    </div>
                                                </div>
                                                {stage.stageType === 'conditional' && (
                                                    <span className="review-stage-badge">⚡ Conditional</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="wizard-navigation">
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => router.back()}
                >
                    Cancel
                </button>

                <div className="wizard-nav-right">
                    {step !== 'info' && (
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleBack}
                        >
                            ← Back
                        </button>
                    )}

                    {step === 'review' ? (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSubmit}
                            disabled={saving}
                        >
                            {saving ? 'Creating...' : 'Create Workflow'}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleNext}
                            disabled={
                                (step === 'info' && !canProceedToStages) ||
                                (step === 'stages' && !canProceedToReview)
                            }
                        >
                            Next →
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
