'use client';

import React from 'react';
import StageColumn, { type WorkflowStageData } from './StageColumn';
import AddStageDropzone from './AddStageDropzone';

interface FlowCanvasProps {
    stages: WorkflowStageData[];
    onChange: (stages: WorkflowStageData[]) => void;
    users?: Array<{ id: string; name: string }>;
    userGroups?: Array<{ id: string; name: string }>;
}

export default function FlowCanvas({
    stages,
    onChange,
    users = [],
    userGroups = []
}: FlowCanvasProps) {

    const createDefaultStage = (order: number): WorkflowStageData => ({
        name: '',
        order,
        stageType: 'static',
        approvalMode: 'any',
        requiredApprovals: 1,
    });

    const handleAddStage = (position: number) => {
        const newStage = createDefaultStage(position);
        const updatedStages = [...stages];

        // Insert at position
        updatedStages.splice(position, 0, newStage);

        // Re-order all stages
        const reordered = updatedStages.map((s, i) => ({ ...s, order: i }));
        onChange(reordered);
    };

    const handleAddConditionalStage = (position: number) => {
        const newStage: WorkflowStageData = {
            name: '',
            order: position,
            stageType: 'conditional',
            approvalMode: 'any',
            requiredApprovals: 1,
            conditionType: '',
            conditionValue: '',
        };
        const updatedStages = [...stages];
        updatedStages.splice(position, 0, newStage);
        const reordered = updatedStages.map((s, i) => ({ ...s, order: i }));
        onChange(reordered);
    };

    const handleUpdateStage = (index: number, updatedStage: WorkflowStageData) => {
        const newStages = [...stages];
        newStages[index] = updatedStage;
        onChange(newStages);
    };

    const handleDeleteStage = (index: number) => {
        const newStages = stages.filter((_, i) => i !== index);
        const reordered = newStages.map((s, i) => ({ ...s, order: i }));
        onChange(reordered);
    };

    const handleMoveStage = (index: number, direction: 'left' | 'right') => {
        const newIndex = direction === 'left' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= stages.length) return;

        const newStages = [...stages];
        [newStages[index], newStages[newIndex]] = [newStages[newIndex], newStages[index]];
        const reordered = newStages.map((s, i) => ({ ...s, order: i }));
        onChange(reordered);
    };

    return (
        <div className="flow-canvas">
            {/* Start Node */}
            <div className="flow-node flow-node-start">
                <div className="flow-node-icon">📥</div>
                <div className="flow-node-label">Request<br />Submitted</div>
            </div>

            {/* First dropzone - before any stages */}
            <AddStageDropzone
                position={0}
                onAddStage={handleAddStage}
                onAddRule={handleAddConditionalStage}
                showRuleOption={true}
            />

            {/* Stages with dropzones between them */}
            {stages.map((stage, index) => (
                <React.Fragment key={stage.id || `stage-${index}`}>
                    <StageColumn
                        stage={stage}
                        index={index}
                        isFirst={index === 0}
                        isLast={index === stages.length - 1}
                        onUpdate={(s) => handleUpdateStage(index, s)}
                        onDelete={() => handleDeleteStage(index)}
                        onMoveLeft={() => handleMoveStage(index, 'left')}
                        onMoveRight={() => handleMoveStage(index, 'right')}
                        users={users}
                        userGroups={userGroups}
                    />

                    {/* Dropzone after each stage */}
                    <AddStageDropzone
                        position={index + 1}
                        onAddStage={handleAddStage}
                        onAddRule={handleAddConditionalStage}
                        showRuleOption={true}
                    />
                </React.Fragment>
            ))}

            {/* End Nodes */}
            <div className="flow-outcomes">
                <div className="flow-node flow-node-approved">
                    <div className="flow-node-icon">✅</div>
                    <div className="flow-node-label">Approved</div>
                </div>
                <div className="flow-node flow-node-rejected">
                    <div className="flow-node-icon">❌</div>
                    <div className="flow-node-label">Rejected</div>
                </div>
            </div>

            {/* Empty state for when no stages exist */}
            {stages.length === 0 && (
                <div className="flow-empty-hint">
                    <span>Click</span>
                    <span className="flow-empty-plus">+</span>
                    <span>to add your first approval stage</span>
                </div>
            )}
        </div>
    );
}
