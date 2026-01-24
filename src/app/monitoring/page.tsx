'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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

export default function MonitoringPage() {
    const [requests, setRequests] = useState<PaymentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState<string[]>([]);

    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [deptFilter, setDeptFilter] = useState('all');
    const [vendorSearch, setVendorSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [statusFilter, deptFilter, vendorSearch, startDate, endDate]);

    async function fetchInitialData() {
        try {
            const usersRes = await fetch('/api/users');
            const usersData = await usersRes.json();
            if (usersData.success) {
                const depts = Array.from(new Set(usersData.data.map((u: User) => u.department))) as string[];
                setDepartments(depts.sort());
            }
        } catch (error) {
            console.error('Failed to fetch initial data:', error);
        }
    }

    async function fetchRequests() {
        try {
            setLoading(true);
            let url = '/api/requests?';

            if (statusFilter !== 'all') url += `status=${statusFilter}&`;
            if (deptFilter !== 'all') url += `department=${encodeURIComponent(deptFilter)}&`;
            if (vendorSearch) url += `vendorName=${encodeURIComponent(vendorSearch)}&`;
            if (startDate) url += `startDate=${startDate}&`;
            if (endDate) url += `endDate=${endDate}&`;

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

    // Stats Calculation
    const approvedTotal = requests
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + r.amount, 0);

    const pendingTotal = requests
        .filter(r => r.status === 'pending')
        .reduce((sum, r) => sum + r.amount, 0);

    const approvalRate = requests.length > 0
        ? (requests.filter(r => r.status === 'approved').length / requests.length) * 100
        : 0;

    return (
        <div className="monitoring-container">
            <div className="page-header">
                <h1 className="page-title">Monitoring Dashboard</h1>
                <div className="text-muted text-sm">Real-time audit & tracking</div>
            </div>

            {/* Summary Stats */}
            <div className="summary-stats">
                <div className="summary-card info">
                    <span className="summary-card-label">Total Requests</span>
                    <span className="summary-card-value">{requests.length}</span>
                </div>
                <div className="summary-card success">
                    <span className="summary-card-label">Approved Value</span>
                    <span className="summary-card-value">{formatCurrency(approvedTotal, 'ZAR')}</span>
                </div>
                <div className="summary-card warning">
                    <span className="summary-card-label">Pending Value</span>
                    <span className="summary-card-value">{formatCurrency(pendingTotal, 'ZAR')}</span>
                </div>
                <div className="summary-card">
                    <span className="summary-card-label">Approval Rate</span>
                    <span className="summary-card-value">{approvalRate.toFixed(1)}%</span>
                </div>
            </div>

            {/* Filter Panel */}
            <div className="filter-panel">
                <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                        className="form-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="draft">Draft</option>
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Department</label>
                    <select
                        className="form-select"
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                    >
                        <option value="all">All Departments</option>
                        {departments.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Vendor Search</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search vendor..."
                        value={vendorSearch}
                        onChange={(e) => setVendorSearch(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">From Date</label>
                    <input
                        type="date"
                        className="form-input"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">To Date</label>
                    <input
                        type="date"
                        className="form-input"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="monitoring-table-wrapper">
                <div className="monitoring-table-header">
                    <h2 className="monitoring-table-title">Detailed Audit Log</h2>
                    <button className="export-btn" onClick={() => alert('Export to CSV functionality would go here!')}>
                        📥 Export CSV
                    </button>
                </div>

                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Requester</th>
                                <th>Dept</th>
                                <th>Vendor</th>
                                <th>Invoice #</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="text-center" style={{ padding: 'var(--spacing-xl)' }}>
                                        Loading audit data...
                                    </td>
                                </tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center" style={{ padding: 'var(--spacing-xl)' }}>
                                        No requests match the current filters.
                                    </td>
                                </tr>
                            ) : (
                                requests.map((req) => (
                                    <tr key={req.id}>
                                        <td className="text-sm">
                                            {new Date(req.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="text-sm font-bold">{req.requester.name}</td>
                                        <td className="text-sm text-muted">{req.requester.department}</td>
                                        <td className="text-sm">{req.vendorName}</td>
                                        <td className="text-sm">{req.invoiceNumber}</td>
                                        <td className="font-bold">
                                            {formatCurrency(req.amount, req.currency)}
                                        </td>
                                        <td>
                                            <span className={getStatusClass(req.status)}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td>
                                            <Link href={`/requests/${req.id}`} className="btn btn-sm btn-secondary">
                                                Audit
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
