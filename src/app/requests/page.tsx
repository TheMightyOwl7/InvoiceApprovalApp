'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/storage';

interface User {
    id: string;
    name: string;
    department: string;
}

interface PaymentRequest {
    id: string;
    vendorName: string;
    invoiceNumber: string;
    invoiceDate: string;
    amount: number;
    currency: string;
    status: string;
    requester: User;
    currentApprover: User | null;
    createdAt: string;
}

function RequestsContent() {
    const searchParams = useSearchParams();
    const filter = searchParams.get('filter');

    const [requests, setRequests] = useState<PaymentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<string>(filter || 'all');
    const currentUser = getCurrentUser();

    useEffect(() => {
        fetchRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFilter]);

    async function fetchRequests() {
        try {
            setLoading(true);
            let url = '/api/requests';

            if (activeFilter === 'pending' && currentUser) {
                url += `?approverId=${currentUser.userId}&status=pending`;
            } else if (activeFilter === 'my-requests' && currentUser) {
                url += `?requesterId=${currentUser.userId}`;
            } else if (activeFilter !== 'all') {
                url += `?status=${activeFilter}`;
            }

            const res = await fetch(url);
            const data = await res.json();

            if (data.success) {
                setRequests(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch requests:', error);
        } finally {
            setLoading(false);
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

    function getStatusClass(status: string) {
        return `status-badge status-${status}`;
    }

    const filters = [
        { key: 'all', label: 'All Requests' },
        { key: 'pending', label: 'Pending My Approval' },
        { key: 'my-requests', label: 'My Requests' },
        { key: 'approved', label: 'Approved' },
        { key: 'rejected', label: 'Rejected' },
    ];

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Payment Requests</h1>
                <Link href="/requests/new" className="btn btn-primary">
                    ➕ New Request
                </Link>
            </div>

            {/* Filter Tabs */}
            <div style={{
                display: 'flex',
                gap: 'var(--spacing-xs)',
                marginBottom: 'var(--spacing-lg)',
                flexWrap: 'wrap',
            }}>
                {filters.map((f) => (
                    <button
                        key={f.key}
                        className={`btn ${activeFilter === f.key ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActiveFilter(f.key)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="card">
                <div className="card-body">
                    {loading ? (
                        <div className="empty-state">
                            <p>Loading requests...</p>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📋</div>
                            <div className="empty-state-title">No requests found</div>
                            <p>
                                {activeFilter === 'pending'
                                    ? "You don't have any requests pending your approval."
                                    : activeFilter === 'my-requests'
                                        ? "You haven't created any requests yet."
                                        : "No payment requests have been created yet."}
                            </p>
                            <Link href="/requests/new" className="btn btn-primary mt-md">
                                ➕ Create First Request
                            </Link>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Invoice #</th>
                                        <th>Vendor</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Requester</th>
                                        <th>Current Approver</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map((req) => (
                                        <tr key={req.id}>
                                            <td style={{ fontWeight: 500 }}>{req.invoiceNumber}</td>
                                            <td>{req.vendorName}</td>
                                            <td style={{ fontWeight: 600 }}>
                                                {formatCurrency(req.amount, req.currency)}
                                            </td>
                                            <td>
                                                <span className={getStatusClass(req.status)}>
                                                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="text-sm">{req.requester.name}</td>
                                            <td className="text-sm text-muted">
                                                {req.currentApprover?.name || '—'}
                                            </td>
                                            <td className="text-sm text-muted">
                                                {new Date(req.createdAt).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <Link
                                                    href={`/requests/${req.id}`}
                                                    className="btn btn-sm btn-secondary"
                                                >
                                                    View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function RequestsPage() {
    return (
        <Suspense fallback={
            <div className="empty-state">
                <p>Loading...</p>
            </div>
        }>
            <RequestsContent />
        </Suspense>
    );
}
