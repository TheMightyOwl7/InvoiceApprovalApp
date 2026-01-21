import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import prisma from '@/lib/prisma';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

// Ensure uploads directory exists
async function ensureUploadsDir() {
    if (!existsSync(UPLOADS_DIR)) {
        await mkdir(UPLOADS_DIR, { recursive: true });
    }
}

// POST /api/documents - Upload a document
export async function POST(request: NextRequest) {
    try {
        await ensureUploadsDir();

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const requestId = formData.get('requestId') as string | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            );
        }

        if (!requestId) {
            return NextResponse.json(
                { success: false, error: 'Request ID is required' },
                { status: 400 }
            );
        }

        // Verify request exists
        const paymentRequest = await prisma.paymentRequest.findUnique({
            where: { id: requestId },
        });

        if (!paymentRequest) {
            return NextResponse.json(
                { success: false, error: 'Payment request not found' },
                { status: 404 }
            );
        }

        // Generate unique filename
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${requestId}_${timestamp}_${safeName}`;
        const filePath = join(UPLOADS_DIR, fileName);

        // Write file to disk
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // Create database record
        const document = await prisma.document.create({
            data: {
                name: file.name,
                mimeType: file.type || 'application/octet-stream',
                size: file.size,
                path: fileName, // Store just the filename, not full path
                requestId,
            },
        });

        return NextResponse.json({ success: true, data: document }, { status: 201 });
    } catch (error) {
        console.error('Error uploading document:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to upload document' },
            { status: 500 }
        );
    }
}
