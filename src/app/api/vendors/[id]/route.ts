import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/vendors/[id] - Get single vendor
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        const vendor = await prisma.vendor.findUnique({
            where: { id },
            include: {
                contracts: true,
                requests: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        invoiceNumber: true,
                        amount: true,
                        status: true,
                        createdAt: true
                    }
                }
            }
        });

        if (!vendor) {
            return NextResponse.json(
                { success: false, error: 'Vendor not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: vendor });
    } catch (error) {
        console.error('Error fetching vendor:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch vendor' },
            { status: 500 }
        );
    }
}

// PATCH /api/vendors/[id] - Update vendor
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();

        const {
            name,
            taxNumber,
            riskRating,
            isNew,
            country,
            requiresCompliance,
            bankDetailsVerified
        } = body;

        // Check if vendor exists
        const existing = await prisma.vendor.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Vendor not found' },
                { status: 404 }
            );
        }

        // Track bank details changes
        const bankDetailsChanged =
            bankDetailsVerified !== undefined &&
            bankDetailsVerified !== existing.bankDetailsVerified;

        const vendor = await prisma.vendor.update({
            where: { id },
            data: {
                name: name ?? existing.name,
                taxNumber: taxNumber !== undefined ? taxNumber : existing.taxNumber,
                riskRating: riskRating ?? existing.riskRating,
                isNew: isNew !== undefined ? isNew : existing.isNew,
                onboardedAt: isNew === false && existing.isNew ? new Date() : existing.onboardedAt,
                country: country !== undefined ? country : existing.country,
                requiresCompliance: requiresCompliance ?? existing.requiresCompliance,
                bankDetailsVerified: bankDetailsVerified ?? existing.bankDetailsVerified,
                bankDetailsChangedAt: bankDetailsChanged ? new Date() : existing.bankDetailsChangedAt
            }
        });

        return NextResponse.json({ success: true, data: vendor });
    } catch (error) {
        console.error('Error updating vendor:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update vendor' },
            { status: 500 }
        );
    }
}

// DELETE /api/vendors/[id] - Delete vendor
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        // Check if vendor exists
        const existing = await prisma.vendor.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Vendor not found' },
                { status: 404 }
            );
        }

        await prisma.vendor.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting vendor:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete vendor' },
            { status: 500 }
        );
    }
}
