'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/storage';
import RuleBuilder from '@/components/workflows/RuleBuilder';
import { type RuleFormData, getDefaultRuleData } from '@/components/workflows/RuleForm';

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

export default function NewWorkflowPage() {
    const router = useRouter();
    const currentUser = getCurrentUser();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [departmentScope, setDepartmentScope] = useState('');
    const [rules, setRules] = useState<RuleFormData[]>([]);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reference data for rule configuration
    const [categories, setCategories] = useState<Category[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
    const [users, setUsers] = useState<UserOption[]>([]);

    // Fetch reference data on mount
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

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!currentUser) {
            setError('No current user session found');
            return;
        }

        if (rules.length === 0) {
            setError('Please add at least one rule to the workflow');
            return;
        }

        // Validate rules
        const invalidRules = rules.filter(r => !r.name.trim());
        if (invalidRules.length > 0) {
            setError('All rules must have a name');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            // Transform rules to API format
            const apiRules = rules.map((rule, index) => ({
                name: rule.name,
                description: rule.description,
                order: index,
                ruleType: rule.ruleType,
                actionType: rule.actionType,
                // Threshold
                minAmount: rule.minAmount ? parseFloat(rule.minAmount) : null,
                maxAmount: rule.maxAmount ? parseFloat(rule.maxAmount) : null,
                // Cumulative
                cumulativePeriod: rule.cumulativePeriod || null,
                cumulativeLimit: rule.cumulativeLimit ? parseFloat(rule.cumulativeLimit) : null,
                // Variance
                variancePercentage: rule.variancePercentage ? parseFloat(rule.variancePercentage) / 100 : null,
                varianceBaseField: rule.varianceBaseField || null,
                // Vendor
                vendorRiskRatings: rule.vendorRiskRatings?.length > 0 ? JSON.stringify(rule.vendorRiskRatings) : null,
                vendorIsNew: rule.vendorIsNew || null,
                // Entity refs
                categoryId: rule.categoryId || null,
                projectId: rule.projectId || null,
                // Compliance
                requiresCompliance: rule.requiresCompliance,
                requiresLegalReview: rule.requiresLegalReview,
                // SoD
                preventSelfApproval: rule.preventSelfApproval,
                preventCreatorApproval: rule.preventCreatorApproval,
                // Approval settings
                requiredGroupId: rule.requiredGroupId || null,
                requiredRole: rule.requiredRole || null,
                specificApproverId: rule.specificApproverId || null,
                approvalMode: rule.approvalMode,
                requiredApprovals: rule.requiredApprovals ? parseInt(rule.requiredApprovals) : 1,
                votingMode: rule.votingMode || null,
                // SLA
                slaHours: rule.slaHours ? parseInt(rule.slaHours) : null,
                escalateToGroupId: rule.escalateToGroupId || null,
            }));

            const res = await fetch('/api/workflows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    departmentScope: departmentScope || null,
                    rules: apiRules,
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
                    <div className="validation-warning">
                        <span className="validation-icon">⚠️</span>
                        {error}
                    </div>
                )}

                {/* Basic Info Card */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Workflow Details</h3>
                    </div>
                    <div className="card-body">
                        <div className="form-row form-row-3">
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
                                    placeholder="Optional description"
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
                                <span className="form-hint">Leave empty for a global workflow</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rule Builder Card */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Approval Rules</h3>
                    </div>
                    <div className="card-body">
                        <RuleBuilder
                            rules={rules}
                            onChange={setRules}
                            categories={categories}
                            projects={projects}
                            userGroups={userGroups}
                            users={users}
                        />
                    </div>
                </div>

                {/* Submit */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-md)' }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => router.back()}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving || !name || rules.length === 0}
                    >
                        {saving ? 'Creating...' : 'Create Workflow'}
                    </button>
                </div>
            </form>
        </div>
    );
}
