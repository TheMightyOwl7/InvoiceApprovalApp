'use client';

import React, { useState } from 'react';

// Stage data structure
export interface WorkflowStageData {
    id?: string;
    name: string;
    description?: string;
    order: number;
    stageType: 'static' | 'conditional';
    requiredRole?: string;
    requiredGroupId?: string;
    specificApproverIds?: string[];
    approvalMode: 'any' | 'all' | 'majority' | 'count';
    requiredApprovals: number;
    slaHours?: number;
    // For conditional stages
    conditionType?: string;
    conditionValue?: string;
}

interface StageColumnProps {
    stage: WorkflowStageData;
    index: number;
    isFirst: boolean;
    isLast: boolean;
    onUpdate: (stage: WorkflowStageData) => void;
    onDelete: () => void;
    onMoveLeft: () => void;
    onMoveRight: () => void;
    users?: Array<{ id: string; name: string }>;
    userGroups?: Array<{ id: string; name: string }>;
}

const ROLES = [
    { value: '', label: 'Any Role' },
    { value: 'manager', label: 'Manager' },
    { value: 'senior_manager', label: 'Senior Manager' },
    { value: 'executive', label: 'Executive' },
    { value: 'compliance_officer', label: 'Compliance Officer' },
];

const APPROVAL_MODES = [
    { value: 'any', label: 'Any one approver', description: '1 approval needed' },
    { value: 'all', label: 'All must approve', description: 'Unanimous' },
    { value: 'majority', label: 'Majority', description: '51%+ must approve' },
    { value: 'count', label: 'Specific count', description: 'e.g., 2 of 3' },
];

export default function StageColumn({
    stage,
    index,
    isFirst,
    isLast,
    onUpdate,
    onDelete,
    onMoveLeft,
    onMoveRight,
    users = [],
    userGroups = []
}: StageColumnProps) {
    const [isEditing, setIsEditing] = useState(!stage.name);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleChange = (field: keyof WorkflowStageData, value: unknown) => {
        onUpdate({ ...stage, [field]: value });
    };

    const getApprovalModeDescription = () => {
        switch (stage.approvalMode) {
            case 'any': return '1 approver';
            case 'all': return 'All must approve';
            case 'majority': return 'Majority vote';
            case 'count': return `${stage.requiredApprovals} approval${stage.requiredApprovals > 1 ? 's' : ''}`;
            default: return '1 approver';
        }
    };

    return (
        <div className={`stage-column ${stage.stageType === 'conditional' ? 'conditional' : ''}`}>
            <div className="stage-column-header">
                <div className="stage-order">{index + 1}</div>
                <div className="stage-actions">
                    <button
                        className="btn btn-ghost btn-xs"
                        onClick={onMoveLeft}
                        disabled={isFirst}
                        title="Move left"
                    >
                        ◀
                    </button>
                    <button
                        className="btn btn-ghost btn-xs"
                        onClick={onMoveRight}
                        disabled={isLast}
                        title="Move right"
                    >
                        ▶
                    </button>
                    <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => setIsEditing(!isEditing)}
                        title="Edit"
                    >
                        ✏️
                    </button>
                    <button
                        className="btn btn-ghost btn-xs btn-danger"
                        onClick={onDelete}
                        title="Delete"
                    >
                        🗑️
                    </button>
                </div>
            </div>

            {stage.stageType === 'conditional' && (
                <div className="stage-badge conditional">
                    ⚡ Conditional
                </div>
            )}

            <div className="stage-column-body">
                {isEditing ? (
                    <div className="stage-edit-form">
                        <div className="form-group">
                            <label className="form-label">Stage Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={stage.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="e.g., Manager Approval"
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Required Role</label>
                            <select
                                className="form-select"
                                value={stage.requiredRole || ''}
                                onChange={(e) => handleChange('requiredRole', e.target.value || undefined)}
                            >
                                {ROLES.map(r => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </div>

                        {userGroups.length > 0 && (
                            <div className="form-group">
                                <label className="form-label">Or User Group</label>
                                <select
                                    className="form-select"
                                    value={stage.requiredGroupId || ''}
                                    onChange={(e) => handleChange('requiredGroupId', e.target.value || undefined)}
                                >
                                    <option value="">Any eligible user</option>
                                    {userGroups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Approval Mode</label>
                            <select
                                className="form-select"
                                value={stage.approvalMode}
                                onChange={(e) => handleChange('approvalMode', e.target.value)}
                            >
                                {APPROVAL_MODES.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>

                        {stage.approvalMode === 'count' && (
                            <div className="form-group">
                                <label className="form-label">Required Approvals</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={stage.requiredApprovals}
                                    onChange={(e) => handleChange('requiredApprovals', parseInt(e.target.value) || 1)}
                                    min="1"
                                    max="10"
                                />
                            </div>
                        )}

                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                        >
                            {showAdvanced ? '▲ Hide Advanced' : '▼ Show Advanced'}
                        </button>

                        {showAdvanced && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">SLA Hours (optional)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={stage.slaHours || ''}
                                        onChange={(e) => handleChange('slaHours', e.target.value ? parseInt(e.target.value) : undefined)}
                                        placeholder="e.g., 24"
                                        min="1"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={stage.description || ''}
                                        onChange={(e) => handleChange('description', e.target.value || undefined)}
                                        placeholder="Optional description"
                                    />
                                </div>
                            </>
                        )}

                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setIsEditing(false)}
                            disabled={!stage.name.trim()}
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <div className="stage-display">
                        <div className="stage-name">{stage.name || 'Unnamed Stage'}</div>
                        {stage.requiredRole && (
                            <div className="stage-role">
                                👤 {ROLES.find(r => r.value === stage.requiredRole)?.label || stage.requiredRole}
                            </div>
                        )}
                        <div className="stage-approval-mode">
                            {getApprovalModeDescription()}
                        </div>
                        {stage.slaHours && (
                            <div className="stage-sla">
                                ⏱️ {stage.slaHours}h SLA
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
