// Type definitions for PaymentApproval app

export type RequestStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type Currency = 'ZAR' | 'USD' | 'EUR' | 'GBP';

// Client-side context for "acting as" a user
export interface CurrentUserContext {
    userId: string;
    userName: string;
}

// Form data for creating/editing a payment request
export interface PaymentRequestFormData {
    vendorName: string;
    invoiceNumber: string;
    invoiceDate: string;
    amount: number;
    currency: Currency;
    description?: string;
    vatCharged: boolean;
    internalVatNumber?: string;
    externalVatNumber?: string;
    currentApproverId?: string;
}

// Extracted invoice data from PDF scanning
export interface ExtractedInvoiceData {
    vendorName?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    amount?: number;
    vatCharged?: boolean;
    externalVatNumber?: string;
    internalVatNumber?: string;
    vatAmount?: number;
    vatExclusive?: number;
    vatInclusive?: number;
    description?: string;
}

// API response types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
