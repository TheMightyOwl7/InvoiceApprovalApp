'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/storage';

interface User {
    id: string;
    name: string;
    department: string;
}

interface Document {
    id: string;
    name: string;
    size: number;
}

interface FormData {
    vendorName: string;
    invoiceNumber: string;
    invoiceDate: string;
    amount: string;
    currency: string;
    description: string;
    vatCharged: boolean;
    internalVatNumber: string;
    externalVatNumber: string;
    currentApproverId: string;
}

const initialFormData: FormData = {
    vendorName: '',
    invoiceNumber: '',
    invoiceDate: '',
    amount: '',
    currency: 'ZAR',
    description: '',
    vatCharged: false,
    internalVatNumber: '',
    externalVatNumber: '',
    currentApproverId: '',
};

export default function NewRequestPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [users, setUsers] = useState<User[]>([]);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [uploadedDocs, setUploadedDocs] = useState<Document[]>([]);
    const [requestId, setRequestId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const currentUser = getCurrentUser();

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            if (data.success) {
                // Filter out current user from approver list
                setUsers(data.data.filter((u: User) => u.id !== currentUser?.userId));
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    }

    function handleFileDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        addFiles(files);
    }

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            addFiles(files);
        }
    }

    function addFiles(files: File[]) {
        // Filter valid file types
        const validTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];

        const validFiles = files.filter(f => validTypes.includes(f.type));

        if (validFiles.length < files.length) {
            setError('Some files were skipped - only PDF, images, Word, and Excel files are allowed.');
        }

        setPendingFiles(prev => [...prev, ...validFiles]);
    }

    function removeFile(index: number) {
        setPendingFiles(prev => prev.filter((_, i) => i !== index));
    }

    async function removeUploadedDoc(docId: string) {
        try {
            const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                setUploadedDocs(prev => prev.filter(d => d.id !== docId));
            }
        } catch (err) {
            console.error('Failed to delete document:', err);
        }
    }

    function formatFileSize(bytes: number) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    async function createDraftRequest(): Promise<string | null> {
        if (requestId) return requestId;

        if (!currentUser) {
            setError('Please select a user first (use sidebar dropdown)');
            return null;
        }

        try {
            const res = await fetch('/api/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    requesterId: currentUser.userId,
                    status: 'draft',
                }),
            });

            const data = await res.json();

            if (data.success) {
                setRequestId(data.data.id);
                return data.data.id;
            } else {
                setError(data.error || 'Failed to create draft');
                return null;
            }
        } catch (err) {
            console.error('Failed to create draft:', err);
            setError('Failed to create draft request');
            return null;
        }
    }

    async function uploadFiles(reqId: string) {
        for (const file of pendingFiles) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('requestId', reqId);

            try {
                const res = await fetch('/api/documents', {
                    method: 'POST',
                    body: formData,
                });

                const data = await res.json();

                if (data.success) {
                    setUploadedDocs(prev => [...prev, data.data]);
                }
            } catch (err) {
                console.error('Failed to upload file:', err);
            }
        }

        setPendingFiles([]);
    }

    async function handleSubmit(e: React.FormEvent, asDraft: boolean = false) {
        e.preventDefault();
        setError(null);
        setSaving(true);

        try {
            if (!currentUser) {
                setError('Please select a user first (use sidebar dropdown)');
                return;
            }

            // Validate required fields
            if (!formData.vendorName || !formData.invoiceNumber || !formData.invoiceDate || !formData.amount) {
                setError('Please fill in all required fields');
                return;
            }

            if (!asDraft && !formData.currentApproverId) {
                setError('Please select an approver to submit the request');
                return;
            }

            // Create or update request
            let reqId = requestId;

            if (!reqId) {
                // Create new request
                const res = await fetch('/api/requests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...formData,
                        requesterId: currentUser.userId,
                        status: asDraft ? 'draft' : 'pending',
                    }),
                });

                const data = await res.json();

                if (!data.success) {
                    setError(data.error || 'Failed to create request');
                    return;
                }

                reqId = data.data.id;
                setRequestId(reqId);
            } else {
                // Update existing draft
                const res = await fetch(`/api/requests/${reqId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...formData,
                        status: asDraft ? 'draft' : 'pending',
                    }),
                });

                const data = await res.json();

                if (!data.success) {
                    setError(data.error || 'Failed to update request');
                    return;
                }
            }

            // Upload any pending files
            if (pendingFiles.length > 0 && reqId) {
                await uploadFiles(reqId);
            }

            // Redirect to request list or detail page
            router.push(asDraft ? `/requests/${reqId}` : '/requests');
        } catch (err) {
            console.error('Failed to submit:', err);
            setError('An unexpected error occurred');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">New Payment Request</h1>
            </div>

            {!currentUser && (
                <div style={{
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-warning-light)',
                    borderRadius: 'var(--radius)',
                    marginBottom: 'var(--spacing-lg)',
                }}>
                    ⚠️ Please select a user from the sidebar dropdown before creating a request.
                </div>
            )}

            <form onSubmit={(e) => handleSubmit(e, false)}>
                <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div className="card-header">
                        <h2 className="card-title">Invoice Details</h2>
                    </div>
                    <div className="card-body">
                        {error && (
                            <div className="form-error mb-md" style={{
                                padding: 'var(--spacing-sm)',
                                background: 'var(--color-danger-light)',
                                borderRadius: 'var(--radius)'
                            }}>
                                {error}
                            </div>
                        )}

                        <div className="form-row form-row-2">
                            <div className="form-group">
                                <label className="form-label">Vendor Name *</label>
                                <input
                                    type="text"
                                    name="vendorName"
                                    className="form-input"
                                    value={formData.vendorName}
                                    onChange={handleInputChange}
                                    placeholder="Company Name"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Invoice Number *</label>
                                <input
                                    type="text"
                                    name="invoiceNumber"
                                    className="form-input"
                                    value={formData.invoiceNumber}
                                    onChange={handleInputChange}
                                    placeholder="INV-001"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row form-row-3">
                            <div className="form-group">
                                <label className="form-label">Invoice Date *</label>
                                <input
                                    type="date"
                                    name="invoiceDate"
                                    className="form-input"
                                    value={formData.invoiceDate}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Amount *</label>
                                <input
                                    type="number"
                                    name="amount"
                                    className="form-input"
                                    value={formData.amount}
                                    onChange={handleInputChange}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Currency</label>
                                <select
                                    name="currency"
                                    className="form-select"
                                    value={formData.currency}
                                    onChange={handleInputChange}
                                >
                                    <option value="ZAR">ZAR (R)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                                name="description"
                                className="form-textarea"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Brief description of the payment..."
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                {/* VAT Details */}
                <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div className="card-header">
                        <h2 className="card-title">VAT Details</h2>
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <div className="form-checkbox-group">
                                <input
                                    type="checkbox"
                                    id="vatCharged"
                                    name="vatCharged"
                                    className="form-checkbox"
                                    checked={formData.vatCharged}
                                    onChange={handleInputChange}
                                />
                                <label htmlFor="vatCharged">VAT Charged on this invoice</label>
                            </div>
                        </div>

                        {formData.vatCharged && (
                            <div className="form-row form-row-2">
                                <div className="form-group">
                                    <label className="form-label">Internal VAT Number</label>
                                    <input
                                        type="text"
                                        name="internalVatNumber"
                                        className="form-input"
                                        value={formData.internalVatNumber}
                                        onChange={handleInputChange}
                                        placeholder="Your company VAT number"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">External VAT Number</label>
                                    <input
                                        type="text"
                                        name="externalVatNumber"
                                        className="form-input"
                                        value={formData.externalVatNumber}
                                        onChange={handleInputChange}
                                        placeholder="Vendor's VAT number"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Documents */}
                <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div className="card-header">
                        <h2 className="card-title">Supporting Documents</h2>
                    </div>
                    <div className="card-body">
                        <div
                            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleFileDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                            <div className="upload-icon">📎</div>
                            <p className="upload-text">
                                <strong>Click to upload</strong> or drag and drop
                            </p>
                            <p className="text-xs text-muted">PDF, Images, Word, Excel files</p>
                        </div>

                        {/* Pending Files */}
                        {pendingFiles.length > 0 && (
                            <div className="file-list">
                                <p className="text-sm text-muted mb-md">Pending upload:</p>
                                {pendingFiles.map((file, index) => (
                                    <div key={index} className="file-item">
                                        <span className="file-name">{file.name}</span>
                                        <span className="file-size">{formatFileSize(file.size)}</span>
                                        <button
                                            type="button"
                                            className="file-remove"
                                            onClick={() => removeFile(index)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Uploaded Documents */}
                        {uploadedDocs.length > 0 && (
                            <div className="file-list">
                                <p className="text-sm text-muted mb-md">Uploaded:</p>
                                {uploadedDocs.map((doc) => (
                                    <div key={doc.id} className="file-item">
                                        <span className="file-name">{doc.name}</span>
                                        <span className="file-size">{formatFileSize(doc.size)}</span>
                                        <button
                                            type="button"
                                            className="file-remove"
                                            onClick={() => removeUploadedDoc(doc.id)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Approval */}
                <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div className="card-header">
                        <h2 className="card-title">Submit for Approval</h2>
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label className="form-label">Send to Approver *</label>
                            <select
                                name="currentApproverId"
                                className="form-select"
                                value={formData.currentApproverId}
                                onChange={handleInputChange}
                            >
                                <option value="">Select an approver...</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.department})
                                    </option>
                                ))}
                            </select>
                            <p className="form-hint">
                                The selected person will receive this request for approval.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => router.push('/requests')}
                    >
                        Cancel
                    </button>

                    <div className="flex gap-sm">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={(e) => handleSubmit(e, true)}
                            disabled={saving}
                        >
                            💾 Save as Draft
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving || !formData.currentApproverId}
                        >
                            {saving ? 'Submitting...' : '📤 Submit for Approval'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
