import { NextRequest, NextResponse } from 'next/server';
import { scanDocument } from '@/lib/invoiceScanner';

// POST /api/scan - Scan a document (PDF/image) and extract invoice data
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            );
        }

        // Check file type
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
        ];

        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: 'Unsupported file type. Please upload a PDF or image.' },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Scan the document
        const result = await scanDocument(buffer, file.type);

        return NextResponse.json({
            success: true,
            data: result.data,
            warnings: result.warnings,
        });
    } catch (error) {
        console.error('Error scanning document:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to scan document' },
            { status: 500 }
        );
    }
}
