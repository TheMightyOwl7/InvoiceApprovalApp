'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/storage';

interface User {
    id: string;
    name: string;
    email: string;
    department: string;
}

interface Document {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
}

interface ApprovalStep {
    id: string;
    status: string;
    comments: string | null;
    approver: User;
    actionedAt: string;
}

interface PaymentRequest {
    id: string;
    vendorName: string;
    invoiceNumber: string;
    invoiceDate: string;
    amount: number;
    currency: string;
    description: string | null;
    vatCharged: boolean;
    internalVatNumber: string | null;
    externalVatNumber: string | null;
    status: string;
    requesterId: string;
    requester: User;
    currentApproverId: string | null;
    currentApprover: User | null;
    documents: Document[];
    approvalHistory: ApprovalStep[];
    createdAt: string;
    updatedAt: string;
}

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function RequestDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const currentUser = getCurrentUser();

    const [request, setRequest] = useState<PaymentRequest | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Approval modal state
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'forward'>('approve');
    const [approvalComments, setApprovalComments] = useState('');
    const [nextApproverId, setNextApproverId] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchRequest();
        fetchUsers();
    }, [id]);

    async function fetchRequest() {
        try {
            setLoading(true);
            const res = await fetch(`/api/requests/${id}`);
            const data = await res.json();

            if (data.success) {
                setRequest(data.data);
            } else {
                setError(data.error || 'Failed to load request');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    }

    async function fetchUsers() {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            if (data.success) {
                setUsers(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    }

    function formatCurrency(amount: number, currency: string) {
        const symbols: Record<string, string> = {
            ZAR: 'R',
            USD: '$',
            EUR: '€',
            GBP: '£',
        };
        return `${symbols[currency] || currency} ${amount.toLocaleString('en-ZA', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }

    function formatFileSize(bytes: number) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleDateString('en-ZA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }

    function formatDateTime(dateString: string) {
        return new Date(dateString).toLocaleString('en-ZA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    function getStatusClass(status: string) {
        return `status-badge status-${status}`;
    }

    const isCurrentApprover = request?.currentApproverId === currentUser?.userId;
    const canApprove = request?.status === 'pending' && isCurrentApprover;

    function openApprovalModal(action: 'approve' | 'reject' | 'forward') {
        setApprovalAction(action);
        setApprovalComments('');
        setNextApproverId('');
        setShowApprovalModal(true);
    }

    async function handleApprovalSubmit() {
        if (!request || !currentUser) return;

        setProcessing(true);
        setError(null);

        try {
            const res = await fetch(`/api/requests/${id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: approvalAction,
                    approverId: currentUser.userId,
                    nextApproverId: approvalAction === 'forward' ? nextApproverId : undefined,
                    comments: approvalComments || undefined,
                }),
            });

            const data = await res.json();

            if (data.success) {
                setShowApprovalModal(false);
                fetchRequest(); // Refresh the data
            } else {
                setError(data.error || 'Failed to process approval');
            }
        } catch {
            setError('Failed to process approval');
        } finally {
            setProcessing(false);
        }
    }

    async function handleDelete() {
        if (!request) return;

        if (!confirm('Are you sure you want to delete this request?')) return;

        try {
            const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                router.push('/requests');
            } else {
                alert(data.error || 'Failed to delete request');
            }
        } catch {
            alert('Failed to delete request');
        }
    }

    if (loading) {
        return (
            <div className="empty-state">
                <p>Loading request...</p>
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">❌</div>
                <div className="empty-state-title">{error || 'Request not found'}</div>
                <Link href="/requests" className="btn btn-primary mt-md">
                    Back to Requests
                </Link>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <Link href="/requests" className="text-sm text-muted" style={{ marginBottom: 'var(--spacing-xs)', display: 'block' }}>
                        ← Back to Requests
                    </Link>
                    <h1 className="page-title">Invoice {request.invoiceNumber}</h1>
                </div>
                <div className="flex gap-sm">
                    {request.status === 'draft' && (
                        <>
                            <Link href={`/requests/${id}/edit`} className="btn btn-secondary">
                                ✏️ Edit
                            </Link>
                            <button className="btn btn-danger" onClick={handleDelete}>
                                🗑️ Delete
                            </button>
                        </>
                    )}
                    {request.status === 'rejected' && (
                        <button className="btn btn-danger" onClick={handleDelete}>
                            🗑️ Delete
                        </button>
                    )}
                </div>
            </div>

            {/* Status Banner */}
            {canApprove && (
                <div style={{
                    padding: 'var(--spacing-lg)',
                    background: 'var(--color-primary-light)',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: 'var(--spacing-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 'var(--spacing-md)',
                }}>
                    <div>
                        <strong>Action Required:</strong> This request is waiting for your approval.
                    </div>
                    <div className="flex gap-sm">
                        <button className="btn btn-success" onClick={() => openApprovalModal('approve')}>
                            ✓ Approve
                        </button>
                        <button className="btn btn-secondary" onClick={() => openApprovalModal('forward')}>
                            → Forward
                        </button>
                        <button className="btn btn-danger" onClick={() => openApprovalModal('reject')}>
                            ✕ Reject
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-lg)' }}>
                {/* Main Content */}
                <div>
                    {/* Invoice Details */}
                    <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <div className="card-header flex justify-between items-center">
                            <h2 className="card-title">Invoice Details</h2>
                            <span className={getStatusClass(request.status)}>
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-lg)' }}>
                                <div>
                                    <div className="text-sm text-muted">Vendor</div>
                                    <div className="font-bold">{request.vendorName}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted">Invoice Number</div>
                                    <div className="font-bold">{request.invoiceNumber}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted">Invoice Date</div>
                                    <div>{formatDate(request.invoiceDate)}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted">Amount</div>
                                    <div className="font-bold" style={{ fontSize: '1.25rem', color: 'var(--color-primary)' }}>
                                        {formatCurrency(request.amount, request.currency)}
                                    </div>
                                </div>
                            </div>

                            {request.description && (
                                <div style={{ marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--color-neutral-200)' }}>
                                    <div className="text-sm text-muted">Description</div>
                                    <div>{request.description}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* VAT Details */}
                    {request.vatCharged && (
                        <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <div className="card-header">
                                <h2 className="card-title">VAT Details</h2>
                            </div>
                            <div className="card-body">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-lg)' }}>
                                    <div>
                                        <div className="text-sm text-muted">VAT Charged</div>
                                        <div>✓ Yes</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted">Internal VAT Number</div>
                                        <div>{request.internalVatNumber || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted">External VAT Number</div>
                                        <div>{request.externalVatNumber || '—'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Documents */}
                    <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <div className="card-header">
                            <h2 className="card-title">Supporting Documents ({request.documents.length})</h2>
                        </div>
                        <div className="card-body">
                            {request.documents.length === 0 ? (
                                <p className="text-muted">No documents attached.</p>
                            ) : (
                                <div className="file-list">
                                    {request.documents.map((doc) => (
                                        <div key={doc.id} className="file-item">
                                            <span className="file-name">{doc.name}</span>
                                            <span className="file-size">{formatFileSize(doc.size)}</span>
                                            <a
                                                href={`/api/documents/${doc.id}`}
                                                className="btn btn-sm btn-secondary"
                                                download
                                            >
                                                ⬇ Download
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div>
                    {/* Workflow Info */}
                    <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <div className="card-header">
                            <h2 className="card-title">Workflow</h2>
                        </div>
                        <div className="card-body">
                            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                <div className="text-sm text-muted">Requested By</div>
                                <div className="font-bold">{request.requester.name}</div>
                                <div className="text-xs text-muted">{request.requester.department}</div>
                            </div>

                            {request.currentApprover && request.status === 'pending' && (
                                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <div className="text-sm text-muted">Awaiting Approval From</div>
                                    <div className="font-bold">{request.currentApprover.name}</div>
                                    <div className="text-xs text-muted">{request.currentApprover.department}</div>
                                </div>
                            )}

                            <div>
                                <div className="text-sm text-muted">Created</div>
                                <div>{formatDateTime(request.createdAt)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Approval History */}
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Approval History</h2>
                        </div>
                        <div className="card-body">
                            {request.approvalHistory.length === 0 ? (
                                <p className="text-muted text-sm">No approval actions yet.</p>
                            ) : (
                                <div className="timeline">
                                    {request.approvalHistory.map((step) => (
                                        <div key={step.id} className={`timeline-item ${step.status}`}>
                                            <div className="timeline-dot" />
                                            <div className="timeline-content">
                                                <div className="timeline-header">
                                                    <span className="timeline-user">{step.approver.name}</span>
                                                    <span className="timeline-date">
                                                        {formatDateTime(step.actionedAt)}
                                                    </span>
                                                </div>
                                                <div className="timeline-action">
                                                    {step.status === 'approved' ? '✓ Approved' : '✕ Rejected'}
                                                </div>
                                                {step.comments && (
                                                    <div className="text-sm text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>
                                                        &ldquo;{step.comments}&rdquo;
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Approval Modal */}
            {showApprovalModal && (
                <div
                    className="modal-overlay"
                    onClick={(e) => e.target === e.currentTarget && setShowApprovalModal(false)}
                >
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {approvalAction === 'approve' && '✓ Approve Request'}
                                {approvalAction === 'reject' && '✕ Reject Request'}
                                {approvalAction === 'forward' && '→ Forward Request'}
                            </h2>
                            <button className="modal-close" onClick={() => setShowApprovalModal(false)}>
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            {error && (
                                <div className="form-error mb-md" style={{
                                    padding: 'var(--spacing-sm)',
                                    background: 'var(--color-danger-light)',
                                    borderRadius: 'var(--radius)',
                                }}>
                                    {error}
                                </div>
                            )}

                            {approvalAction === 'forward' && (
                                <div className="form-group">
                                    <label className="form-label">Forward to *</label>
                                    <select
                                        className="form-select"
                                        value={nextApproverId}
                                        onChange={(e) => setNextApproverId(e.target.value)}
                                        required
                                    >
                                        <option value="">Select next approver...</option>
                                        {users
                                            .filter((u) => u.id !== currentUser?.userId && u.id !== request.requesterId)
                                            .map((user) => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name} ({user.department})
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">
                                    Comments {approvalAction === 'reject' ? '*' : '(optional)'}
                                </label>
                                <textarea
                                    className="form-textarea"
                                    value={approvalComments}
                                    onChange={(e) => setApprovalComments(e.target.value)}
                                    placeholder={
                                        approvalAction === 'reject'
                                            ? 'Please provide a reason for rejection...'
                                            : 'Add any comments...'
                                    }
                                    rows={3}
                                    required={approvalAction === 'reject'}
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowApprovalModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={`btn ${approvalAction === 'reject' ? 'btn-danger' : approvalAction === 'approve' ? 'btn-success' : 'btn-primary'}`}
                                onClick={handleApprovalSubmit}
                                disabled={processing || (approvalAction === 'forward' && !nextApproverId)}
                            >
                                {processing ? 'Processing...' : (
                                    <>
                                        {approvalAction === 'approve' && '✓ Approve'}
                                        {approvalAction === 'reject' && '✕ Reject'}
                                        {approvalAction === 'forward' && '→ Forward'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
