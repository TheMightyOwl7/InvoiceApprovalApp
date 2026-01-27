'use client';

import { useState, useEffect } from 'react';
import VendorForm, { type VendorFormData, getDefaultVendorData } from '@/components/vendors/VendorForm';

interface Vendor {
    id: string;
    name: string;
    taxNumber?: string | null;
    riskRating: string;
    isNew: boolean;
    onboardedAt?: string | null;
    country?: string | null;
    requiresCompliance: boolean;
    bankDetailsVerified: boolean;
    bankDetailsChangedAt?: string | null;
    _count?: { requests: number };
    createdAt: string;
}

const RISK_BADGES: Record<string, { label: string; class: string }> = {
    low: { label: 'Low', class: 'status-approved' },
    standard: { label: 'Standard', class: 'status-badge' },
    high: { label: 'High', class: 'status-pending' },
    new: { label: 'New', class: 'status-rejected' }
};

export default function VendorsPage() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingVendor, setEditingVendor] = useState<VendorFormData | null>(null);
    const [saving, setSaving] = useState(false);
    const [riskFilter, setRiskFilter] = useState<string>('all');

    useEffect(() => {
        fetchVendors();
    }, []);

    async function fetchVendors() {
        try {
            setLoading(true);
            const res = await fetch('/api/vendors');
            const data = await res.json();
            if (data.success) {
                setVendors(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch vendors:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveVendor(vendor: VendorFormData) {
        setSaving(true);
        try {
            const url = vendor.id ? `/api/vendors/${vendor.id}` : '/api/vendors';
            const method = vendor.id ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vendor)
            });

            const data = await res.json();
            if (data.success) {
                setShowForm(false);
                setEditingVendor(null);
                fetchVendors();
            } else {
                alert(data.error || 'Failed to save vendor');
            }
        } catch (error) {
            alert('Failed to save vendor');
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteVendor(id: string) {
        if (!confirm('Are you sure you want to delete this vendor?')) return;

        try {
            const res = await fetch(`/api/vendors/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                fetchVendors();
            } else {
                alert(data.error || 'Failed to delete vendor');
            }
        } catch (error) {
            alert('Failed to delete vendor');
        }
    }

    function handleEdit(vendor: Vendor) {
        setEditingVendor({
            id: vendor.id,
            name: vendor.name,
            taxNumber: vendor.taxNumber || '',
            riskRating: vendor.riskRating,
            isNew: vendor.isNew,
            country: vendor.country || 'South Africa',
            requiresCompliance: vendor.requiresCompliance,
            bankDetailsVerified: vendor.bankDetailsVerified
        });
        setShowForm(true);
    }

    function handleAdd() {
        setEditingVendor(null);
        setShowForm(true);
    }

    const filteredVendors = vendors.filter(v =>
        riskFilter === 'all' || v.riskRating === riskFilter
    );

    return (
        <div className="monitoring-container">
            <div className="page-header">
                <h1 className="page-title">Vendor Management</h1>
                <button className="btn btn-primary" onClick={handleAdd}>
                    ➕ Add Vendor
                </button>
            </div>

            {/* Stats */}
            <div className="summary-stats">
                <div className="summary-card">
                    <div className="summary-card-label">Total Vendors</div>
                    <div className="summary-card-value">{vendors.length}</div>
                </div>
                <div className="summary-card success">
                    <div className="summary-card-label">Verified</div>
                    <div className="summary-card-value">
                        {vendors.filter(v => v.bankDetailsVerified).length}
                    </div>
                </div>
                <div className="summary-card warning">
                    <div className="summary-card-label">High Risk</div>
                    <div className="summary-card-value">
                        {vendors.filter(v => v.riskRating === 'high').length}
                    </div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-label">New Vendors</div>
                    <div className="summary-card-value">
                        {vendors.filter(v => v.isNew).length}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="card-body">
                    <div className="filter-panel" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 200px))' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Risk Rating</label>
                            <select
                                className="form-select"
                                value={riskFilter}
                                onChange={(e) => setRiskFilter(e.target.value)}
                            >
                                <option value="all">All Ratings</option>
                                <option value="low">Low Risk</option>
                                <option value="standard">Standard</option>
                                <option value="high">High Risk</option>
                                <option value="new">New Vendor</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Vendor List */}
            <div className="card">
                <div className="card-body">
                    {loading ? (
                        <div className="empty-state">
                            <p>Loading vendors...</p>
                        </div>
                    ) : filteredVendors.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">🏢</div>
                            <div className="empty-state-title">No vendors found</div>
                            <p>Add vendors to track payment recipients and risk.</p>
                            <button className="btn btn-primary" onClick={handleAdd}>
                                ➕ Add First Vendor
                            </button>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Vendor</th>
                                        <th>Risk</th>
                                        <th>Country</th>
                                        <th>Status</th>
                                        <th>Requests</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVendors.map((vendor) => (
                                        <tr key={vendor.id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{vendor.name}</div>
                                                {vendor.taxNumber && (
                                                    <div className="text-xs text-muted">{vendor.taxNumber}</div>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`status-badge ${RISK_BADGES[vendor.riskRating]?.class || ''}`}>
                                                    {RISK_BADGES[vendor.riskRating]?.label || vendor.riskRating}
                                                </span>
                                            </td>
                                            <td className="text-sm">{vendor.country || '—'}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                    {vendor.isNew && (
                                                        <span className="status-badge status-pending">New</span>
                                                    )}
                                                    {vendor.bankDetailsVerified && (
                                                        <span className="status-badge status-approved">✓ Bank</span>
                                                    )}
                                                    {vendor.requiresCompliance && (
                                                        <span className="status-badge">Compliance</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="text-sm">{vendor._count?.requests || 0}</td>
                                            <td>
                                                <div className="table-actions">
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={() => handleEdit(vendor)}
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => handleDeleteVendor(vendor.id)}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Vendor Form Modal */}
            {showForm && (
                <VendorForm
                    vendor={editingVendor || getDefaultVendorData()}
                    onSave={handleSaveVendor}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingVendor(null);
                    }}
                    saving={saving}
                />
            )}
        </div>
    );
}
