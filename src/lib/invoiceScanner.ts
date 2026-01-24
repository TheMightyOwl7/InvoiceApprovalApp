// Invoice Scanner Service - Extracts invoice data from PDF documents
import { extractText } from 'unpdf';
import { ExtractedInvoiceData } from './types';

export interface ScanResult {
    data: ExtractedInvoiceData;
    warnings: string[];
    rawText: string;
}

// Regex patterns for extracting invoice fields
const patterns = {
    // Invoice numbers: INV-001, Invoice #123, Invoice No. 456, etc.
    invoiceNumber: [
        /(?:invoice\s*(?:no\.?|number|#|:)\s*)([A-Z0-9][-A-Z0-9/]+)/i,
        /(?:inv[-.\s]?)([A-Z0-9][-A-Z0-9/]+)/i,
        /(?:reference\s*(?:no\.?|number|#|:)\s*)([A-Z0-9][-A-Z0-9/]+)/i,
    ],
    // Date patterns: 2024-01-15, 15/01/2024, Jan 15, 2024, etc.
    invoiceDate: [
        /(?:invoice\s*date|date\s*of\s*invoice|dated?)\s*[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
        /(?:invoice\s*date|date\s*of\s*invoice|dated?)\s*[:\s]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
        /(?:invoice\s*date|date\s*of\s*invoice|dated?)\s*[:\s]*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})/i,
        /(?:date)\s*[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    ],
    // Amount patterns: R 1,234.56, $1234.56, Total: 1234.56, etc.
    amount: [
        // Strict Total/Grand Total (anchored or clear label) at the end
        /(?:grand\s*total|total\s*due|amount\s*due|total\s*payable|balance\s*due)\s*[:\s]*[R$€£]?\s*([\d,]+\.?\d{2})/i,
        // "Total" that is NOT "Sub Total"
        /(?<!sub\s*)total\s*[:\s]*[R$€£]?\s*([\d,]+\.?\d{2})/i,
        // Total Incl VAT
        /total\s*incl(?:uding)?\.?\s*vat\s*[:\s]*[R$€£]?\s*([\d,]+\.?\d{2})/i,
    ],
    // VAT Number patterns
    vatNumber: [
        /(?:vat\s*(?:no\.?|number|reg(?:istration)?\.?)?|tax\s*(?:no\.?|id))\s*[:\s]*([A-Z]{0,2}\d{5,15})/i,
        /(?:vat\s*(?:no\.?|number|reg(?:istration)?\.?)?)\s*[:\s]*(\d{10})/i,
        // Verbose sentence (e.g. "South African VAT registration number of Hostking is: ...")
        /(?:vat\s+registration(?: number)?)(?:[\s\S]{0,100}?)[:\s](\d{10})/i,
    ],
    // Customer/Internal VAT Patterns
    customerVat: [
        /(?:customer|client|consumer)\s*vat\s*(?:no\.?|number)?\s*[:\s]*([A-Z]{0,2}\d{5,15})/i,
        /(?:customer|client|consumer)\s*tax\s*(?:id|no\.?)\s*[:\s]*([A-Z]{0,2}\d{5,15})/i,
    ],
    // VAT indicator
    vatCharged: [
        /(?:vat|tax)\s*(?:@|at)?\s*(\d+(?:\.\d+)?)\s*%/i, // e.g. "15.00% VAT"
        /(?:including|incl\.?)\s*vat/i,
        /vat\s*amount/i,
        /\d+%\s*vat/i, // e.g. "15% VAT"
    ],
    // Specific Amount Fields
    vatAmount: [
        /(?:vat|tax)\s*(?:amount)?\s*(?:@\s*\d+(?:\.\d+)?%)?\s*[:\s]*[R$€£]?\s*([\d,]+\.?\d{2})/i,
        /\d+(?:\.\d+)?%\s*vat\s*[:\s]*[R$€£]?\s*([\d,]+\.?\d{2})/i, // e.g. "15.00% VAT R25.83"
    ],
    subTotal: [
        /(?:sub\s*total|net\s*amount|taxable\s*amount|exc(?:l)?\.?\s*vat|total\s*excl)\s*[:\s]*[R$€£]?\s*([\d,]+\.?\d{2})/i,
    ],
    // Description patterns
    description: [
        // Look for "Description" followed by some text, possibly on a new line (handled by logic, here just simple headers)
        /(?:description|particulars|service|item\s*description)\s*[:\s]*([^\n\r]+)/i,
        // Sometimes description is just the largest text block, but for now specific labels:
        /(?:re)\s*[:\s]*([^\n\r]+)/i, // "Re: Cleaning Services"
    ]
};

// ... (keep helper functions same)

// ... inside scanInvoice ...

// VAT


/**
 * Parse a date string and convert to ISO format (YYYY-MM-DD)
 */
function parseDate(dateStr: string): string | undefined {
    if (!dateStr) return undefined;

    // Try various formats
    const cleaned = dateStr.trim();

    // YYYY-MM-DD or YYYY/MM/DD
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(cleaned)) {
        const parts = cleaned.split(/[-/]/);
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }

    // DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(cleaned)) {
        const parts = cleaned.split(/[-/]/);
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }

    // DD-MM-YY or DD/MM/YY
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2}$/.test(cleaned)) {
        const parts = cleaned.split(/[-/]/);
        const year = parseInt(parts[2]) > 50 ? `19${parts[2]}` : `20${parts[2]}`;
        return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }

    // Month name formats: "15 Jan 2024" or "Jan 15, 2024"
    const monthNames: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };

    const monthMatch = cleaned.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]+(\d{4})/i);
    if (monthMatch) {
        const day = monthMatch[1].padStart(2, '0');
        const month = monthNames[monthMatch[2].toLowerCase()];
        const year = monthMatch[3];
        return `${year}-${month}-${day}`;
    }

    return undefined;
}

/**
 * Parse amount string to number
 */
function parseAmount(amountStr: string): number | undefined {
    if (!amountStr) return undefined;

    // Remove currency symbols and whitespace
    const cleaned = amountStr.replace(/[R$€£\s]/g, '').replace(/,/g, '');
    const num = parseFloat(cleaned);

    return isNaN(num) ? undefined : num;
}

/**
 * Extract the first few lines to find vendor name (usually at top of invoice)
 */
function extractVendorName(text: string): string | undefined {
    const lines = text.split('\n').filter(line => line.trim());

    // Skip very short lines and look for a company-like name in first 10 lines
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i].trim();

        // Skip if too short or looks like a label
        if (line.length < 3 || line.length > 100) continue;
        if (/^(invoice|tax|date|to|from|bill|ship|address)/i.test(line)) continue;
        if (/^\d+$/.test(line)) continue; // Skip pure numbers

        // Look for patterns suggesting company names
        if (/\b(pty|ltd|llc|inc|corp|cc|limited|company)\b/i.test(line)) {
            return line;
        }

        // First substantial line that looks like a name
        if (line.length > 5 && /^[A-Z]/.test(line) && !/^(invoice|reference|date)/i.test(line)) {
            return line;
        }
    }

    return undefined;
}

/**
 * Find a pattern match in text, trying multiple patterns
 */
function findMatch(text: string, patternList: RegExp[]): string | undefined {
    for (const pattern of patternList) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return undefined;
}

/**
 * Check if VAT appears to be charged
 */
function checkVatCharged(text: string): boolean {
    for (const pattern of patterns.vatCharged) {
        if (pattern.test(text)) {
            return true;
        }
    }
    return false;
}

/**
 * Find the largest amount in the document (likely the total)
 */
function findLargestAmount(text: string): number | undefined {
    const amountPattern = /[R$€£]\s*([\d,]+\.\d{2})/g;
    const amounts: number[] = [];
    let match;

    while ((match = amountPattern.exec(text)) !== null) {
        const amount = parseAmount(match[1]);
        if (amount !== undefined && amount > 0) {
            amounts.push(amount);
        }
    }

    if (amounts.length === 0) return undefined;
    return Math.max(...amounts);
}

/**
 * Scan a PDF buffer and extract invoice data
 */
export async function scanInvoice(pdfBuffer: Buffer): Promise<ScanResult> {
    const warnings: string[] = [];
    let rawText = '';

    try {
        const { text } = await extractText(new Uint8Array(pdfBuffer));
        rawText = Array.isArray(text) ? text.join('\n') : (text || '');
    } catch (error) {
        console.error('PDF parsing error:', error);
        return {
            data: {},
            warnings: ['Failed to parse PDF document'],
            rawText: '',
        };
    }

    // Normalize text for better matching
    const text = rawText.replace(/\r\n/g, '\n').replace(/\s+/g, ' ');

    // Extract fields
    const data: ExtractedInvoiceData = {};

    // Vendor Name
    const vendorName = extractVendorName(rawText);
    if (vendorName) {
        data.vendorName = vendorName;
    } else {
        warnings.push('Could not identify vendor name - please enter manually');
    }

    // Invoice Number
    const invoiceNumber = findMatch(text, patterns.invoiceNumber);
    if (invoiceNumber) {
        data.invoiceNumber = invoiceNumber;
    } else {
        warnings.push('Could not find invoice number - please verify');
    }

    // Invoice Date
    const dateStr = findMatch(text, patterns.invoiceDate);
    if (dateStr) {
        const parsed = parseDate(dateStr);
        if (parsed) {
            data.invoiceDate = parsed;
        } else {
            warnings.push('Found date but could not parse format - please verify');
        }
    } else {
        warnings.push('Could not find invoice date - please enter manually');
    }

    // Amount - first try specific patterns, then fall back to largest amount
    const amountStr = findMatch(text, patterns.amount.slice(0, 2));
    if (amountStr) {
        data.amount = parseAmount(amountStr);
    }

    if (!data.amount) {
        const largestAmount = findLargestAmount(text);
        if (largestAmount) {
            data.amount = largestAmount;
            warnings.push('Amount detected from currency values - please verify');
        } else {
            warnings.push('Could not identify invoice amount - please enter manually');
        }
    }

    // VAT
    data.vatCharged = checkVatCharged(text);

    // Description
    const description = findMatch(text, patterns.description);
    if (description) {
        data.description = description.trim();
        if (data.description.length > 200) {
            data.description = data.description.substring(0, 197) + '...';
        }
    }

    // Try to find External (Vendor) VAT
    const vatMatches = text.matchAll(/(?:vat|tax)\s*(?:no\.?|number|id)?\s*[:\s]*([A-Z]{0,2}\d{5,15})/gi);
    const potentialVats = Array.from(vatMatches).map(m => m[1]);

    // Try to find Internal (Customer) VAT explicitly
    const internalVat = findMatch(text, patterns.customerVat);
    if (internalVat) {
        data.internalVatNumber = internalVat;
        // If we found an internal VAT, filtering it out from potential vendor VATs might be good, 
        // but for now let's just assume the first non-internal one is external if not explicitly found
        data.externalVatNumber = potentialVats.find(v => v !== internalVat) || potentialVats[0];
    } else {
        // Fallback: IF multiple VATs found, 2nd might be internal? 
        // Safer logic: First found is usually Vendor's (at top).
        if (potentialVats.length > 0) data.externalVatNumber = potentialVats[0];
    }

    // Amounts breakdown
    if (data.vatCharged) {
        // Try extract specific amounts
        const vatAmountStr = findMatch(text, patterns.vatAmount);
        if (vatAmountStr) data.vatAmount = parseAmount(vatAmountStr);

        const subTotalStr = findMatch(text, patterns.subTotal);
        if (subTotalStr) data.vatExclusive = parseAmount(subTotalStr);

        // If we have total amount (data.amount is usually total/inclusive)
        data.vatInclusive = data.amount;

        // Calculations if missing
        if (data.vatInclusive && !data.vatExclusive && !data.vatAmount) {
            // Assume 15% standard if we can't find others? Or extract rate?
            // Let's look for rate
            const rateMatch = text.match(/(?:vat|tax)\s*(?:@|at)?\s*(\d+(?:\.\d+)?)\s*%/i);
            if (rateMatch) {
                const rate = parseFloat(rateMatch[1]);
                data.vatExclusive = Number((data.vatInclusive / (1 + rate / 100)).toFixed(2));
                data.vatAmount = Number((data.vatInclusive - data.vatExclusive).toFixed(2));
            } else {
                // Fallback 15% (typical for South Africa based on currency 'R')
                if (text.includes('R')) {
                    data.vatExclusive = Number((data.vatInclusive / 1.15).toFixed(2));
                    data.vatAmount = Number((data.vatInclusive - data.vatExclusive).toFixed(2));
                }
            }
        }
    } else {
        data.vatInclusive = data.amount;
        data.vatExclusive = data.amount;
        data.vatAmount = 0;
    }

    if (data.externalVatNumber) {
        // ok
    } else if (data.vatCharged) {
        warnings.push('VAT appears to be charged but VAT number not found');
    }

    return {
        data,
        warnings,
        rawText,
    };
}

/**
 * Scan an image file (placeholder for future OCR implementation)
 */
export async function scanImage(imageBuffer: Buffer): Promise<ScanResult> {
    // Image OCR is more complex - would require an OCR library or service
    // For now, return empty with a message
    return {
        data: {},
        warnings: ['Image scanning requires OCR - please enter invoice details manually or use PDF format'],
        rawText: '',
    };
}

/**
 * Main scan function that routes to appropriate handler
 */
export async function scanDocument(buffer: Buffer, mimeType: string): Promise<ScanResult> {
    if (mimeType === 'application/pdf') {
        return scanInvoice(buffer);
    } else if (mimeType.startsWith('image/')) {
        return scanImage(buffer);
    } else {
        return {
            data: {},
            warnings: ['Unsupported file type for scanning'],
            rawText: '',
        };
    }
}
