'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/storage';
import { ExtractedInvoiceData } from '@/lib/types';

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
    vatExclusive: string;
    vatAmount: string;
    currency: string;
    description: string;
    vatCharged: boolean;
    internalVatNumber: string;
    externalVatNumber: string;
    currentApproverId: string;
    workflowId: string;
}

const initialFormData: FormData = {
    vendorName: '',
    invoiceNumber: '',
    invoiceDate: '',
    amount: '',
    vatExclusive: '',
    vatAmount: '',
    currency: 'ZAR',
    description: '',
    vatCharged: false,
    internalVatNumber: '',
    externalVatNumber: '',
    currentApproverId: '',
    workflowId: '',
};

export default function NewRequestPage() {
    const router = useRouter();
    const invoiceInputRef = useRef<HTMLInputElement>(null);
    const supportingInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [users, setUsers] = useState<User[]>([]);
    const [activeWorkflows, setActiveWorkflows] = useState<any[]>([]);

    // Invoice file state
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [scanning, setScanning] = useState(false);
    const [scanWarnings, setScanWarnings] = useState<string[]>([]);
    const [scannedFields, setScannedFields] = useState<Set<string>>(new Set());
    const [missingFields, setMissingFields] = useState<Set<string>>(new Set());

    // Supporting documents state
    const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
    const [uploadedDocs, setUploadedDocs] = useState<Document[]>([]);

    const [requestId, setRequestId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [invoiceDragOver, setInvoiceDragOver] = useState(false);
    const [supportingDragOver, setSupportingDragOver] = useState(false);

    const [currentUser, setCurrentUser] = useState<{ userId: string; userName: string } | null>(null);

    useEffect(() => {
        const user = getCurrentUser();
        setCurrentUser(user);
        fetchUsers(user?.userId);
        fetchWorkflows();
    }, []);

    async function fetchUsers(currentUserId?: string) {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            if (data.success) {
                // Use passed ID or state (though state might not be set yet if called from effect)
                const idToExclude = currentUserId;
                setUsers(data.data.filter((u: User) => u.id !== idToExclude));
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    }

    async function fetchWorkflows() {
        try {
            const res = await fetch('/api/workflows?status=active');
            const data = await res.json();
            if (data.success) {
                setActiveWorkflows(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch workflows:', err);
        }
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));

        // Remove from scanned fields when user manually edits
        setScannedFields(prev => {
            const next = new Set(prev);
            next.delete(name);
            return next;
        });

        // Remove from missing fields when user manually edits
        setMissingFields(prev => {
            const next = new Set(prev);
            next.delete(name);
            return next;
        });
    }

    // Invoice file handling
    async function handleInvoiceDrop(e: React.DragEvent) {
        e.preventDefault();
        setInvoiceDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            await addInvoiceFile(files[0]);
        }
    }

    async function handleInvoiceSelect(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files && e.target.files.length > 0) {
            await addInvoiceFile(e.target.files[0]);
        }
    }

    async function addInvoiceFile(file: File) {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];

        if (!validTypes.includes(file.type)) {
            setError('Invoice must be a PDF or image file.');
            return;
        }

        setInvoiceFile(file);
        setError(null);

        // Automatically scan the invoice
        await scanInvoiceFile(file);
    }

    async function scanInvoiceFile(file: File) {
        setScanning(true);
        setScanWarnings([]);

        try {
            const formDataObj = new FormData();
            formDataObj.append('file', file);

            const res = await fetch('/api/scan', {
                method: 'POST',
                body: formDataObj,
            });

            const data = await res.json();

            if (data.success) {
                const extracted: ExtractedInvoiceData = data.data;
                const warnings: string[] = data.warnings || [];

                // Apply extracted data to form
                const newScannedFields = new Set<string>();
                const newMissingFields = new Set<string>();

                setFormData(prev => {
                    const updated = { ...prev };

                    if (extracted.vendorName) {
                        updated.vendorName = extracted.vendorName;
                        newScannedFields.add('vendorName');
                    } else {
                        newMissingFields.add('vendorName');
                    }

                    if (extracted.invoiceNumber) {
                        updated.invoiceNumber = extracted.invoiceNumber;
                        newScannedFields.add('invoiceNumber');
                    } else {
                        newMissingFields.add('invoiceNumber');
                    }

                    if (extracted.invoiceDate) {
                        updated.invoiceDate = extracted.invoiceDate;
                        newScannedFields.add('invoiceDate');
                    } else {
                        newMissingFields.add('invoiceDate');
                    }

                    if (extracted.amount !== undefined) {
                        updated.amount = extracted.amount.toFixed(2);
                        newScannedFields.add('amount');
                    } else {
                        newMissingFields.add('amount');
                    }

                    if (extracted.vatExclusive !== undefined) {
                        updated.vatExclusive = extracted.vatExclusive.toFixed(2);
                        newScannedFields.add('vatExclusive');
                    }
                    if (extracted.vatAmount !== undefined) {
                        updated.vatAmount = extracted.vatAmount.toFixed(2);
                        newScannedFields.add('vatAmount');
                    }
                    if (extracted.description) {
                        updated.description = extracted.description;
                        newScannedFields.add('description');
                    }
                    if (extracted.vatCharged !== undefined) {
                        updated.vatCharged = extracted.vatCharged;
                        // Force VAT charged to true if we have VAT amounts
                        if (extracted.vatAmount && extracted.vatAmount > 0) {
                            updated.vatCharged = true;
                        }
                        newScannedFields.add('vatCharged');
                    }
                    if (extracted.internalVatNumber) {
                        updated.internalVatNumber = extracted.internalVatNumber;
                        newScannedFields.add('internalVatNumber');
                    }
                    if (extracted.externalVatNumber) {
                        updated.externalVatNumber = extracted.externalVatNumber;
                        newScannedFields.add('externalVatNumber');
                    } else if (updated.vatCharged) {
                        newMissingFields.add('externalVatNumber');
                    }

                    return updated;
                });

                setScannedFields(newScannedFields);
                setMissingFields(newMissingFields);
                setScanWarnings(warnings);
            } else {
                setScanWarnings([data.error || 'Failed to scan invoice']);
            }
        } catch (err) {
            console.error('Failed to scan invoice:', err);
            setScanWarnings(['An error occurred while scanning the invoice']);
        } finally {
            setScanning(false);
        }
    }

    function removeInvoiceFile() {
        setInvoiceFile(null);
        setScanWarnings([]);
        setScannedFields(new Set());
        setMissingFields(new Set());
        if (invoiceInputRef.current) {
            invoiceInputRef.current.value = '';
        }
    }

    // Supporting documents handling
    function handleSupportingDrop(e: React.DragEvent) {
        e.preventDefault();
        setSupportingDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        addSupportingFiles(files);
    }

    function handleSupportingSelect(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            addSupportingFiles(files);
        }
    }

    function addSupportingFiles(files: File[]) {
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

        setSupportingFiles(prev => [...prev, ...validFiles]);
    }

    function removeSupportingFile(index: number) {
        setSupportingFiles(prev => prev.filter((_, i) => i !== index));
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

    async function uploadFiles(reqId: string) {
        // Upload invoice file first
        if (invoiceFile) {
            const formDataObj = new FormData();
            formDataObj.append('file', invoiceFile);
            formDataObj.append('requestId', reqId);

            try {
                const res = await fetch('/api/documents', {
                    method: 'POST',
                    body: formDataObj,
                });

                const data = await res.json();
                if (data.success) {
                    setUploadedDocs(prev => [...prev, data.data]);
                }
            } catch (err) {
                console.error('Failed to upload invoice:', err);
            }
        }

        // Upload supporting files
        for (const file of supportingFiles) {
            const formDataObj = new FormData();
            formDataObj.append('file', file);
            formDataObj.append('requestId', reqId);

            try {
                const res = await fetch('/api/documents', {
                    method: 'POST',
                    body: formDataObj,
                });

                const data = await res.json();
                if (data.success) {
                    setUploadedDocs(prev => [...prev, data.data]);
                }
            } catch (err) {
                console.error('Failed to upload file:', err);
            }
        }

        setInvoiceFile(null);
        setSupportingFiles([]);
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

            // Upload files
            if ((invoiceFile || supportingFiles.length > 0) && reqId) {
                await uploadFiles(reqId);
            }

            router.push(asDraft ? `/requests/${reqId}` : '/requests');
        } catch (err) {
            console.error('Failed to submit:', err);
            setError('An unexpected error occurred');
        } finally {
            setSaving(false);
        }
    }

    function getFieldStyle(fieldName: string) {
        if (scannedFields.has(fieldName)) {
            return {
                borderColor: 'var(--color-primary)',
                background: 'rgba(59, 130, 246, 0.05)',
            };
        }
        if (missingFields.has(fieldName)) {
            return {
                borderColor: 'var(--color-danger)',
                background: 'rgba(239, 68, 68, 0.05)',
            };
        }
        return {};
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
                    color: '#333',
                    borderRadius: 'var(--radius)',
                    marginBottom: 'var(--spacing-lg)',
                }}>
                    ⚠️ Please select a user from the sidebar dropdown before creating a request.
                </div>
            )}

            <form onSubmit={(e) => handleSubmit(e, false)}>
                {/* Invoice Upload Section */}
                <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div className="card-header">
                        <h2 className="card-title">📄 Invoice Document</h2>
                    </div>
                    <div className="card-body">
                        <p className="text-muted mb-md">
                            Upload your invoice PDF or image to automatically extract details.
                        </p>

                        {!invoiceFile ? (
                            <div
                                className={`upload-zone ${invoiceDragOver ? 'drag-over' : ''}`}
                                onDragOver={(e) => { e.preventDefault(); setInvoiceDragOver(true); }}
                                onDragLeave={() => setInvoiceDragOver(false)}
                                onDrop={handleInvoiceDrop}
                                onClick={() => invoiceInputRef.current?.click()}
                                style={{
                                    borderColor: 'var(--color-primary)',
                                    background: 'rgba(59, 130, 246, 0.02)',
                                }}
                            >
                                <input
                                    ref={invoiceInputRef}
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                                    onChange={handleInvoiceSelect}
                                    style={{ display: 'none' }}
                                />
                                <div className="upload-icon">📄</div>
                                <p className="upload-text">
                                    <strong>Click to upload invoice</strong> or drag and drop
                                </p>
                                <p className="text-xs text-muted">PDF or image files • Auto-scans to fill form</p>
                            </div>
                        ) : (
                            <div style={{
                                padding: 'var(--spacing-md)',
                                background: 'var(--color-neutral-50)',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--color-neutral-200)',
                            }}>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-sm">
                                        <span style={{ fontSize: '1.5rem' }}>📄</span>
                                        <div>
                                            <div className="font-bold">{invoiceFile.name}</div>
                                            <div className="text-sm text-muted">{formatFileSize(invoiceFile.size)}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-sm">
                                        {scanning && (
                                            <span className="text-sm text-muted">
                                                ⏳ Scanning...
                                            </span>
                                        )}
                                        {!scanning && scannedFields.size > 0 && (
                                            <span className="text-sm" style={{ color: 'var(--color-success)' }}>
                                                ✓ Scanned
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-secondary"
                                            onClick={removeInvoiceFile}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Scan Warnings */}
                        {scanWarnings.length > 0 && (
                            <div style={{
                                marginTop: 'var(--spacing-md)',
                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                background: 'var(--color-warning-light)',
                                color: '#333',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--color-warning)',
                            }}>
                                <div className="font-bold mb-xs" style={{ color: 'var(--color-warning-dark)' }}>
                                    ⚠️ Please verify the following:
                                </div>
                                <ul style={{ margin: 0, paddingLeft: 'var(--spacing-lg)' }}>
                                    {scanWarnings.map((warning, i) => (
                                        <li key={i} className="text-sm">{warning}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {scannedFields.size > 0 && (
                            <div className="text-sm text-muted mt-md">
                                💡 Fields highlighted in blue were auto-filled from the scan. You can edit them if needed.
                            </div>
                        )}
                    </div>
                </div>

                {/* Invoice Details Form */}
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
                                <label className="form-label">
                                    Vendor Name *
                                    {scannedFields.has('vendorName') && (
                                        <span className="text-xs" style={{ color: 'var(--color-primary)', marginLeft: 'var(--spacing-xs)' }}>
                                            (scanned)
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="text"
                                    name="vendorName"
                                    className="form-input"
                                    value={formData.vendorName}
                                    onChange={handleInputChange}
                                    placeholder="Company Name"
                                    style={getFieldStyle('vendorName')}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Invoice Number *
                                    {scannedFields.has('invoiceNumber') && (
                                        <span className="text-xs" style={{ color: 'var(--color-primary)', marginLeft: 'var(--spacing-xs)' }}>
                                            (scanned)
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="text"
                                    name="invoiceNumber"
                                    className="form-input"
                                    value={formData.invoiceNumber}
                                    onChange={handleInputChange}
                                    placeholder="INV-001"
                                    style={getFieldStyle('invoiceNumber')}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row form-row-3">
                            <div className="form-group">
                                <label className="form-label">
                                    Invoice Date *
                                    {scannedFields.has('invoiceDate') && (
                                        <span className="text-xs" style={{ color: 'var(--color-primary)', marginLeft: 'var(--spacing-xs)' }}>
                                            (scanned)
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="date"
                                    name="invoiceDate"
                                    className="form-input"
                                    value={formData.invoiceDate}
                                    onChange={handleInputChange}
                                    style={getFieldStyle('invoiceDate')}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Amount (Incl. VAT) *
                                    {scannedFields.has('amount') && (
                                        <span className="text-xs" style={{ color: 'var(--color-primary)', marginLeft: 'var(--spacing-xs)' }}>
                                            (scanned)
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    name="amount"
                                    className="form-input"
                                    value={formData.amount}
                                    onChange={handleInputChange}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    style={getFieldStyle('amount')}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    VAT Exclusive
                                    {scannedFields.has('vatExclusive') && (
                                        <span className="text-xs" style={{ color: 'var(--color-primary)', marginLeft: 'var(--spacing-xs)' }}>
                                            (scanned)
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    name="vatExclusive"
                                    className="form-input"
                                    value={formData.vatExclusive}
                                    onChange={handleInputChange}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    style={getFieldStyle('vatExclusive')}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">
                                    VAT Amount
                                    {scannedFields.has('vatAmount') && (
                                        <span className="text-xs" style={{ color: 'var(--color-primary)', marginLeft: 'var(--spacing-xs)' }}>
                                            (scanned)
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    name="vatAmount"
                                    className="form-input"
                                    value={formData.vatAmount}
                                    onChange={handleInputChange}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    style={getFieldStyle('vatAmount')}
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
                                <label className="form-label">
                                    External VAT Number
                                    {scannedFields.has('externalVatNumber') && (
                                        <span className="text-xs" style={{ color: 'var(--color-primary)', marginLeft: 'var(--spacing-xs)' }}>
                                            (scanned)
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="text"
                                    name="externalVatNumber"
                                    className="form-input"
                                    value={formData.externalVatNumber}
                                    onChange={handleInputChange}
                                    placeholder="Vendor's VAT number"
                                    style={getFieldStyle('externalVatNumber')}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Supporting Documents */}
                <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div className="card-header">
                        <h2 className="card-title">📎 Supporting Documents</h2>
                    </div>
                    <div className="card-body">
                        <p className="text-muted mb-md">
                            Add any additional documents (quotes, purchase orders, contracts, etc.)
                        </p>

                        <div
                            className={`upload-zone ${supportingDragOver ? 'drag-over' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setSupportingDragOver(true); }}
                            onDragLeave={() => setSupportingDragOver(false)}
                            onDrop={handleSupportingDrop}
                            onClick={() => supportingInputRef.current?.click()}
                        >
                            <input
                                ref={supportingInputRef}
                                type="file"
                                multiple
                                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                                onChange={handleSupportingSelect}
                                style={{ display: 'none' }}
                            />
                            <div className="upload-icon">📎</div>
                            <p className="upload-text">
                                <strong>Click to upload</strong> or drag and drop
                            </p>
                            <p className="text-xs text-muted">PDF, Images, Word, Excel files</p>
                        </div>

                        {/* Pending Supporting Files */}
                        {supportingFiles.length > 0 && (
                            <div className="file-list">
                                <p className="text-sm text-muted mb-md">Pending upload:</p>
                                {supportingFiles.map((file, index) => (
                                    <div key={index} className="file-item">
                                        <span className="file-name">{file.name}</span>
                                        <span className="file-size">{formatFileSize(file.size)}</span>
                                        <button
                                            type="button"
                                            className="file-remove"
                                            onClick={() => removeSupportingFile(index)}
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
                        <div className="form-group mb-md">
                            <label className="form-label">Associated Workflow</label>
                            <select
                                name="workflowId"
                                className="form-select"
                                value={formData.workflowId}
                                onChange={handleInputChange}
                            >
                                <option value="">No specific workflow (Manual Approval)</option>
                                {activeWorkflows.map((wf) => (
                                    <option key={wf.id} value={wf.id}>
                                        {wf.name} ({wf.steps.length} steps)
                                    </option>
                                ))}
                            </select>
                            <p className="form-hint">
                                Workflows ensure the request follows a predefined approval path.
                            </p>
                        </div>

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
