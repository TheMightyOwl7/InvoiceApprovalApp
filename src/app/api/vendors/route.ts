import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/vendors - List all vendors
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const riskRating = searchParams.get('riskRating');
        const isNew = searchParams.get('isNew');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};
        if (riskRating) where.riskRating = riskRating;
        if (isNew !== null) where.isNew = isNew === 'true';

        const vendors = await prisma.vendor.findMany({
            where,
            include: {
                contracts: true,
                _count: {
                    select: { requests: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ success: true, data: vendors });
    } catch (error) {
        console.error('Error fetching vendors:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch vendors' },
            { status: 500 }
        );
    }
}

// POST /api/vendors - Create new vendor
export async function POST(request: NextRequest) {
    try {
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

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Vendor name is required' },
                { status: 400 }
            );
        }

        const vendor = await prisma.vendor.create({
            data: {
                name,
                taxNumber: taxNumber || null,
                riskRating: riskRating || 'standard',
                isNew: isNew ?? true,
                onboardedAt: isNew === false ? new Date() : null,
                country: country || null,
                requiresCompliance: requiresCompliance || false,
                bankDetailsVerified: bankDetailsVerified || false
            }
        });

        return NextResponse.json({ success: true, data: vendor }, { status: 201 });
    } catch (error) {
        console.error('Error creating vendor:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create vendor' },
            { status: 500 }
        );
    }
}
