import { NextRequest, NextResponse } from 'next/server';
import { readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import prisma from '@/lib/prisma';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/documents/[id] - Download a document
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        const document = await prisma.document.findUnique({
            where: { id },
        });

        if (!document) {
            return NextResponse.json(
                { success: false, error: 'Document not found' },
                { status: 404 }
            );
        }

        const filePath = join(UPLOADS_DIR, document.path);

        if (!existsSync(filePath)) {
            return NextResponse.json(
                { success: false, error: 'File not found on disk' },
                { status: 404 }
            );
        }

        const fileBuffer = await readFile(filePath);

        const { searchParams } = new URL(request.url);
        const isPreview = searchParams.get('preview') === 'true';
        const disposition = isPreview ? 'inline' : 'attachment';

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': document.mimeType,
                'Content-Disposition': `${disposition}; filename="${document.name}"`,
                'Content-Length': document.size.toString(),
            },
        });
    } catch (error) {
        console.error('Error downloading document:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to download document' },
            { status: 500 }
        );
    }
}

// DELETE /api/documents/[id] - Delete a document
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        const document = await prisma.document.findUnique({
            where: { id },
            include: { request: true },
        });

        if (!document) {
            return NextResponse.json(
                { success: false, error: 'Document not found' },
                { status: 404 }
            );
        }

        // Only allow deletion if request is still a draft
        if (document.request.status !== 'draft') {
            return NextResponse.json(
                { success: false, error: 'Cannot delete documents from submitted requests' },
                { status: 400 }
            );
        }

        // Delete file from disk
        const filePath = join(UPLOADS_DIR, document.path);
        if (existsSync(filePath)) {
            await unlink(filePath);
        }

        // Delete database record
        await prisma.document.delete({
            where: { id },
        });

        return NextResponse.json({ success: true, data: { deleted: true } });
    } catch (error) {
        console.error('Error deleting document:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete document' },
            { status: 500 }
        );
    }
}
