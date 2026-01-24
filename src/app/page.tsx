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
  amount: number;
  currency: string;
  status: string;
  requester: User;
  currentApprover: User | null;
  createdAt: string;
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  myPendingApproval: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0, myPendingApproval: 0 });
  const [recentRequests, setRecentRequests] = useState<PaymentRequest[]>([]);
  const [pendingMyApproval, setPendingMyApproval] = useState<PaymentRequest[]>([]);
  const [currentUser, setCurrentUser] = useState<{ userId: string; userName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    fetchDashboardData(user);
  }, []);

  async function fetchDashboardData(user: { userId: string; userName: string } | null) {
    try {
      setLoading(true);

      // Fetch all requests for stats
      const allRes = await fetch('/api/requests');
      const allData = await allRes.json();

      if (allData.success) {
        const requests = allData.data as PaymentRequest[];

        // Calculate stats
        const pending = requests.filter(r => r.status === 'pending').length;
        const approved = requests.filter(r => r.status === 'approved').length;
        const rejected = requests.filter(r => r.status === 'rejected').length;

        // My pending approvals
        const myPending = user
          ? requests.filter(r => r.status === 'pending' && r.currentApprover?.id === user.userId)
          : [];

        setStats({
          pending,
          approved,
          rejected,
          myPendingApproval: myPending.length,
        });

        setPendingMyApproval(myPending);

        // Recent requests (last 5)
        setRecentRequests(requests.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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

  if (loading) {
    return (
      <div className="empty-state">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <Link href="/requests/new" className="btn btn-primary">
          ➕ New Request
        </Link>
      </div>

      {/* Welcome Message */}
      {currentUser && (
        <div style={{
          padding: 'var(--spacing-lg)',
          background: 'var(--background)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--spacing-lg)',
          border: '1px solid var(--color-neutral-200)',
        }}>
          <h2 style={{ marginBottom: 'var(--spacing-xs)' }}>
            Welcome back, {currentUser.userName}! 👋
          </h2>
          <p className="text-muted">
            {stats.myPendingApproval > 0
              ? `You have ${stats.myPendingApproval} request${stats.myPendingApproval === 1 ? '' : 's'} waiting for your approval.`
              : 'All caught up – no pending approvals for you right now.'}
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card warning">
          <div className="stat-label">Pending Requests</div>
          <div className="stat-value">{stats.pending}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Approved</div>
          <div className="stat-value">{stats.approved}</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">Rejected</div>
          <div className="stat-value">{stats.rejected}</div>
        </div>
        <div className="stat-card primary">
          <div className="stat-label">Awaiting My Approval</div>
          <div className="stat-value">{stats.myPendingApproval}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--spacing-lg)' }}>
        {/* Pending My Approval */}
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <h2 className="card-title">🔔 Pending My Approval</h2>
            <Link href="/requests?filter=pending" className="btn btn-sm btn-secondary">
              View All
            </Link>
          </div>
          <div className="card-body">
            {pendingMyApproval.length === 0 ? (
              <p className="text-muted text-center" style={{ padding: 'var(--spacing-lg)' }}>
                No requests pending your approval
              </p>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Vendor</th>
                      <th>Amount</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingMyApproval.map((req) => (
                      <tr key={req.id}>
                        <td className="font-bold">{req.invoiceNumber}</td>
                        <td>{req.vendorName}</td>
                        <td>{formatCurrency(req.amount, req.currency)}</td>
                        <td>
                          <Link href={`/requests/${req.id}`} className="btn btn-sm btn-primary">
                            Review
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

        {/* Recent Requests */}
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <h2 className="card-title">📋 Recent Requests</h2>
            <Link href="/requests" className="btn btn-sm btn-secondary">
              View All
            </Link>
          </div>
          <div className="card-body">
            {recentRequests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-title">No requests yet</div>
                <p>Create your first payment request to get started.</p>
                <Link href="/requests/new" className="btn btn-primary mt-md">
                  ➕ Create Request
                </Link>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Vendor</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRequests.map((req) => (
                      <tr key={req.id}>
                        <td>
                          <Link href={`/requests/${req.id}`} className="font-bold" style={{ color: 'var(--color-primary)' }}>
                            {req.invoiceNumber}
                          </Link>
                        </td>
                        <td>{req.vendorName}</td>
                        <td>{formatCurrency(req.amount, req.currency)}</td>
                        <td>
                          <span className={getStatusClass(req.status)}>
                            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                          </span>
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

      {/* Quick Actions */}
      {!currentUser && (
        <div className="card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <div className="card-body text-center">
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>👋 Get Started</h3>
            <p className="text-muted" style={{ marginBottom: 'var(--spacing-lg)' }}>
              To use the Payment Approval system, first add some users, then select yourself from the sidebar dropdown.
            </p>
            <Link href="/users" className="btn btn-primary btn-lg">
              👥 Manage Users
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
