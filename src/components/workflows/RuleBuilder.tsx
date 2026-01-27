'use client';

import React, { useState } from 'react';
import RuleTypeSelector, { RULE_TYPES } from './RuleTypeSelector';
import RuleForm, { type RuleFormData, getDefaultRuleData } from './RuleForm';

interface RuleBuilderProps {
    rules: RuleFormData[];
    onChange: (rules: RuleFormData[]) => void;
    categories?: Array<{ id: string; name: string }>;
    projects?: Array<{ id: string; name: string }>;
    userGroups?: Array<{ id: string; name: string }>;
    users?: Array<{ id: string; name: string }>;
}

export default function RuleBuilder({
    rules,
    onChange,
    categories = [],
    projects = [],
    userGroups = [],
    users = []
}: RuleBuilderProps) {
    const [showTypeSelector, setShowTypeSelector] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleAddRule = (ruleType: string) => {
        const ruleConfig = RULE_TYPES.find(r => r.type === ruleType);
        const newRule: RuleFormData = {
            ...getDefaultRuleData(rules.length),
            ruleType,
            name: ruleConfig?.name || ruleType,
        };
        onChange([...rules, newRule]);
        setShowTypeSelector(false);
    };

    const handleUpdateRule = (index: number, updatedRule: RuleFormData) => {
        const newRules = [...rules];
        newRules[index] = updatedRule;
        onChange(newRules);
    };

    const handleRemoveRule = (index: number) => {
        const newRules = rules.filter((_, i) => i !== index).map((rule, i) => ({
            ...rule,
            order: i
        }));
        onChange(newRules);
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newRules = [...rules];
        const draggedRule = newRules[draggedIndex];
        newRules.splice(draggedIndex, 1);
        newRules.splice(index, 0, draggedRule);

        // Update order values
        const reorderedRules = newRules.map((rule, i) => ({ ...rule, order: i }));
        onChange(reorderedRules);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const moveRule = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === rules.length - 1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        const newRules = [...rules];
        [newRules[index], newRules[newIndex]] = [newRules[newIndex], newRules[index]];

        const reorderedRules = newRules.map((rule, i) => ({ ...rule, order: i }));
        onChange(reorderedRules);
    };

    return (
        <div className="rule-builder">
            <div className="rule-builder-header">
                <h3 className="rule-builder-title">Approval Rules</h3>
                <div className="rule-builder-stats">
                    <span className="rule-count">{rules.length} rule{rules.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {rules.length === 0 ? (
                <div className="rule-builder-empty">
                    <div className="empty-state-icon">📋</div>
                    <div className="empty-state-title">No rules defined</div>
                    <p>Add rules to define the approval logic for this workflow.</p>
                </div>
            ) : (
                <div className="rule-list">
                    {rules.map((rule, index) => (
                        <div
                            key={`${rule.ruleType}-${index}`}
                            className={`rule-item ${draggedIndex === index ? 'dragging' : ''}`}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="rule-item-drag-handle" title="Drag to reorder">
                                <span className="drag-icon">⋮⋮</span>
                            </div>
                            <div className="rule-item-reorder">
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => moveRule(index, 'up')}
                                    disabled={index === 0}
                                    title="Move up"
                                >
                                    ▲
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => moveRule(index, 'down')}
                                    disabled={index === rules.length - 1}
                                    title="Move down"
                                >
                                    ▼
                                </button>
                            </div>
                            <div className="rule-item-content">
                                <RuleForm
                                    rule={rule}
                                    onChange={(updated) => handleUpdateRule(index, updated)}
                                    onRemove={() => handleRemoveRule(index)}
                                    index={index}
                                    categories={categories}
                                    projects={projects}
                                    userGroups={userGroups}
                                    users={users}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showTypeSelector ? (
                <div className="rule-type-selector-container">
                    <div className="rule-type-selector-header">
                        <h4>Select Rule Type</h4>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setShowTypeSelector(false)}
                        >
                            ✕
                        </button>
                    </div>
                    <RuleTypeSelector
                        selectedType={null}
                        onSelect={handleAddRule}
                    />
                </div>
            ) : (
                <button
                    type="button"
                    className="btn btn-secondary rule-add-btn"
                    onClick={() => setShowTypeSelector(true)}
                >
                    ➕ Add Rule
                </button>
            )}

            {/* Validation Summary */}
            {rules.length > 0 && (
                <div className="rule-validation-summary">
                    <RuleValidationSummary rules={rules} />
                </div>
            )}
        </div>
    );
}

// Validation summary component
function RuleValidationSummary({ rules }: { rules: RuleFormData[] }) {
    const issues: string[] = [];

    // Check for rules without names
    const unnamedRules = rules.filter(r => !r.name.trim());
    if (unnamedRules.length > 0) {
        issues.push(`${unnamedRules.length} rule(s) missing names`);
    }

    // Check for threshold rules without amounts
    const thresholdIssues = rules.filter(
        r => r.ruleType === 'threshold' && !r.minAmount && !r.maxAmount
    );
    if (thresholdIssues.length > 0) {
        issues.push(`${thresholdIssues.length} threshold rule(s) need amount limits`);
    }

    // Check for SoD rules
    const hasSodRule = rules.some(r => r.ruleType === 'sod');

    // Check for at least one approval-requiring rule
    const hasApprovalRule = rules.some(r => r.actionType === 'require_approval');

    if (issues.length === 0 && hasApprovalRule) {
        return (
            <div className="validation-success">
                <span className="validation-icon">✅</span>
                <span>
                    Workflow valid: {rules.length} rules configured
                    {hasSodRule && ' (SoD enabled)'}
                </span>
            </div>
        );
    }

    if (!hasApprovalRule && rules.length > 0) {
        issues.push('No rules require approval - workflow will auto-approve everything');
    }

    return (
        <div className="validation-warning">
            <span className="validation-icon">⚠️</span>
            <ul className="validation-issues">
                {issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                ))}
            </ul>
        </div>
    );
}
