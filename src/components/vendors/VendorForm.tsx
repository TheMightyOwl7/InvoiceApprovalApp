'use client';

import React, { useState } from 'react';

const RISK_RATINGS = [
    { value: 'low', label: 'Low Risk', color: 'var(--color-success)' },
    { value: 'standard', label: 'Standard', color: 'var(--color-primary)' },
    { value: 'high', label: 'High Risk', color: 'var(--color-warning)' },
    { value: 'new', label: 'New Vendor', color: 'var(--color-danger)' }
];

const COUNTRIES = [
    'South Africa',
    'United States',
    'United Kingdom',
    'Germany',
    'Netherlands',
    'Australia',
    'Other'
];

export interface VendorFormData {
    id?: string;
    name: string;
    taxNumber: string;
    riskRating: string;
    isNew: boolean;
    country: string;
    requiresCompliance: boolean;
    bankDetailsVerified: boolean;
}

export const getDefaultVendorData = (): VendorFormData => ({
    name: '',
    taxNumber: '',
    riskRating: 'new',
    isNew: true,
    country: 'South Africa',
    requiresCompliance: false,
    bankDetailsVerified: false
});

interface VendorFormProps {
    vendor: VendorFormData;
    onSave: (vendor: VendorFormData) => Promise<void>;
    onCancel: () => void;
    saving?: boolean;
}

export default function VendorForm({ vendor, onSave, onCancel, saving = false }: VendorFormProps) {
    const [formData, setFormData] = useState<VendorFormData>(vendor);
    const [error, setError] = useState<string | null>(null);

    const isEdit = !!vendor.id;

    const handleChange = (field: keyof VendorFormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.name.trim()) {
            setError('Vendor name is required');
            return;
        }

        try {
            await onSave(formData);
        } catch (err) {
            setError('Failed to save vendor');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        {isEdit ? 'Edit Vendor' : 'Add New Vendor'}
                    </h3>
                    <button className="modal-close" onClick={onCancel}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && (
                            <div className="validation-warning" style={{ marginBottom: 'var(--spacing-md)' }}>
                                <span className="validation-icon">⚠️</span>
                                {error}
                            </div>
                        )}

                        <div className="form-row form-row-2">
                            <div className="form-group">
                                <label className="form-label">Vendor Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    placeholder="Company Name"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tax Number</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.taxNumber}
                                    onChange={(e) => handleChange('taxNumber', e.target.value)}
                                    placeholder="VAT/Tax ID"
                                />
                            </div>
                        </div>

                        <div className="form-row form-row-2">
                            <div className="form-group">
                                <label className="form-label">Risk Rating</label>
                                <select
                                    className="form-select"
                                    value={formData.riskRating}
                                    onChange={(e) => handleChange('riskRating', e.target.value)}
                                >
                                    {RISK_RATINGS.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Country</label>
                                <select
                                    className="form-select"
                                    value={formData.country}
                                    onChange={(e) => handleChange('country', e.target.value)}
                                >
                                    {COUNTRIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Status & Compliance</label>
                            <div className="checkbox-grid">
                                <label className="form-checkbox-group">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox"
                                        checked={formData.isNew}
                                        onChange={(e) => handleChange('isNew', e.target.checked)}
                                    />
                                    New Vendor (not yet onboarded)
                                </label>
                                <label className="form-checkbox-group">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox"
                                        checked={formData.requiresCompliance}
                                        onChange={(e) => handleChange('requiresCompliance', e.target.checked)}
                                    />
                                    Requires Compliance Review
                                </label>
                                <label className="form-checkbox-group">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox"
                                        checked={formData.bankDetailsVerified}
                                        onChange={(e) => handleChange('bankDetailsVerified', e.target.checked)}
                                    />
                                    Bank Details Verified
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onCancel}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Vendor')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
