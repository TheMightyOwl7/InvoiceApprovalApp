'use client';

import React from 'react';

interface AddStageDropzoneProps {
    position: number; // Where in the flow to insert (between stages)
    onAddStage: (position: number) => void;
    onAddRule?: (position: number) => void;
    showRuleOption?: boolean;
}

export default function AddStageDropzone({
    position,
    onAddStage,
    onAddRule,
    showRuleOption = false
}: AddStageDropzoneProps) {
    const [isHovered, setIsHovered] = React.useState(false);
    const [showMenu, setShowMenu] = React.useState(false);

    const handleClick = () => {
        if (showRuleOption) {
            setShowMenu(!showMenu);
        } else {
            onAddStage(position);
        }
    };

    const handleAddStage = () => {
        setShowMenu(false);
        onAddStage(position);
    };

    const handleAddRule = () => {
        setShowMenu(false);
        onAddRule?.(position);
    };

    return (
        <div
            className={`add-stage-dropzone ${isHovered ? 'hovered' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
                setShowMenu(false);
            }}
        >
            <div className="dropzone-connector">
                <div className="dropzone-line" />
                <button
                    className="dropzone-button"
                    onClick={handleClick}
                    title="Add stage or rule here"
                >
                    <span className="dropzone-icon">+</span>
                </button>
                <div className="dropzone-line" />
            </div>

            {showMenu && (
                <div className="dropzone-menu">
                    <button
                        className="dropzone-menu-item"
                        onClick={handleAddStage}
                    >
                        <span className="menu-icon">📋</span>
                        <span className="menu-text">Add Stage</span>
                        <span className="menu-hint">New approval step</span>
                    </button>
                    {showRuleOption && onAddRule && (
                        <button
                            className="dropzone-menu-item"
                            onClick={handleAddRule}
                        >
                            <span className="menu-icon">⚡</span>
                            <span className="menu-text">Add Conditional Stage</span>
                            <span className="menu-hint">Triggered by rules</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
