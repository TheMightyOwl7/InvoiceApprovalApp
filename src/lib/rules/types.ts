// Rule Engine Types
// Core type definitions for the approval workflow rule engine

import type { ApprovalRule, PaymentRequest, User, Vendor, SpendCategory, Project } from '@prisma/client';

// ============================================
// RULE TYPES
// ============================================

export type RuleType =
    | 'threshold'       // Amount-based limits
    | 'cumulative'      // Daily/monthly cumulative limits
    | 'variance'        // PO/quote variance detection
    | 'vendor'          // Vendor risk-based routing
    | 'category'        // Category-based routing
    | 'project'         // Project manager approval
    | 'compliance'      // Legal/compliance review
    | 'sod'             // Segregation of duties
    | 'dual_control'    // Dual control requirements
    | 'sla'             // SLA monitoring
    | 'auto_approve';   // White-list/contract matching

export type ActionType =
    | 'require_approval'
    | 'auto_approve'
    | 'auto_reject'
    | 'escalate';

export type ApprovalMode = 'sequential' | 'parallel';

export type VotingMode = 'unanimous' | 'majority';

export type CumulativePeriod = 'daily' | 'weekly' | 'monthly';

// ============================================
// EVALUATION CONTEXT
// ============================================

/**
 * Context passed to rule evaluators containing all relevant data
 */
export interface RuleEvaluationContext {
    request: PaymentRequest;
    requester: User;
    vendor?: Vendor | null;
    category?: SpendCategory | null;
    project?: Project | null;

    // Cumulative tracking
    requesterCumulativeToday?: number;
    requesterCumulativeWeek?: number;
    requesterCumulativeMonth?: number;

    // For variance checks
    poAmount?: number | null;
    quoteAmount?: number | null;
}

// ============================================
// EVALUATION RESULTS
// ============================================

/**
 * Result from evaluating a single rule
 */
export interface RuleEvaluationResult {
    rule: ApprovalRule;
    triggered: boolean;
    reason?: string;

    // If triggered, what action is required
    action?: ActionType;

    // Approval requirements when triggered
    requirement?: ApprovalRequirement;
}

/**
 * Defines who needs to approve and how
 */
export interface ApprovalRequirement {
    // One of these will be set
    groupId?: string;
    role?: string;
    specificApproverId?: string;

    // How approval works
    mode: ApprovalMode;
    requiredCount: number;
    votingMode?: VotingMode;

    // SLA
    slaHours?: number;
    escalateToGroupId?: string;
}

/**
 * Complete result of evaluating all rules for a request
 */
export interface WorkflowEvaluationResult {
    workflowId: string;

    // All rules that were evaluated
    evaluations: RuleEvaluationResult[];

    // Rules that triggered approval requirements
    triggeredRules: RuleEvaluationResult[];

    // Final list of approval steps to create
    requiredSteps: ApprovalStepDefinition[];

    // Special outcomes
    autoApprove: boolean;
    autoReject: boolean;
    autoRejectReason?: string;
}

/**
 * Definition for an approval step to be created
 */
export interface ApprovalStepDefinition {
    ruleId: string;
    ruleName: string;
    order: number;

    // Who must approve
    requiredGroupId?: string;
    requiredRole?: string;
    specificApproverId?: string;

    // Parallel approval settings
    requiredCount: number;
    votingMode?: VotingMode;
    mode: ApprovalMode;

    // SLA
    dueAt?: Date;
    slaHours?: number;
    escalateToGroupId?: string;
}

// ============================================
// RULE EVALUATOR INTERFACE
// ============================================

/**
 * Interface for individual rule type evaluators
 */
export interface RuleEvaluator {
    ruleType: RuleType;

    /**
     * Evaluate whether this rule is triggered for the given context
     */
    evaluate(rule: ApprovalRule, context: RuleEvaluationContext): RuleEvaluationResult;
}

// ============================================
// DELEGATION
// ============================================

export interface ActiveDelegation {
    delegatorId: string;
    delegateId: string;
    delegateName: string;
    maxAmount?: number | null;
    reason?: string | null;
    endDate: Date;
}

// ============================================
// API TYPES
// ============================================

export interface SubmitRequestResult {
    success: boolean;
    requestId: string;
    status: 'pending' | 'approved' | 'rejected';
    stepsCreated: number;
    message?: string;
}

export interface ApproveRequestResult {
    success: boolean;
    requestId: string;
    stepId: string;
    newStatus: 'pending' | 'approved' | 'rejected';
    message?: string;
    nextStep?: {
        id: string;
        requiredRole?: string;
        requiredGroupId?: string;
    };
}
