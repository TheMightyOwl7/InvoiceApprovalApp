'use client';

import WorkflowWizard from '@/components/workflows/WorkflowWizard';

export default function NewWorkflowPage() {
    return (
        <div className="monitoring-container">
            <div className="page-header">
                <h1 className="page-title">Build Approval Workflow</h1>
            </div>

            <WorkflowWizard />
        </div>
    );
}
