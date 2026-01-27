import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/delegations - List all delegations
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const status = searchParams.get('status'); // active, expired, all

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};

        if (userId) where.delegatorId = userId;

        // Filter by active status
        if (status === 'active') {
            const now = new Date();
            where.startDate = { lte: now };
            where.endDate = { gte: now };
            where.isActive = true;
        } else if (status === 'expired') {
            const now = new Date();
            where.endDate = { lt: now };
        }

        const delegations = await prisma.delegationRule.findMany({
            where,
            include: {
                delegator: { select: { id: true, name: true, email: true, department: true } },
                delegate: { select: { id: true, name: true, email: true, department: true } }
            },
            orderBy: { startDate: 'desc' }
        });

        return NextResponse.json({ success: true, data: delegations });
    } catch (error) {
        console.error('Error fetching delegations:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch delegations' },
            { status: 500 }
        );
    }
}

// POST /api/delegations - Create new delegation
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            delegatorId,
            delegateId,
            startDate,
            endDate,
            maxAmount,
            reason
        } = body;

        if (!delegatorId || !delegateId || !startDate || !endDate) {
            return NextResponse.json(
                { success: false, error: 'Delegator, delegate, and dates are required' },
                { status: 400 }
            );
        }

        if (delegatorId === delegateId) {
            return NextResponse.json(
                { success: false, error: 'Cannot delegate to yourself' },
                { status: 400 }
            );
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
            return NextResponse.json(
                { success: false, error: 'End date must be after start date' },
                { status: 400 }
            );
        }

        // Check for overlapping delegations
        const existing = await prisma.delegationRule.findFirst({
            where: {
                delegatorId,
                isActive: true,
                startDate: { lte: end },
                endDate: { gte: start }
            }
        });

        if (existing) {
            return NextResponse.json(
                { success: false, error: 'Overlapping delegation already exists' },
                { status: 400 }
            );
        }

        const delegation = await prisma.delegationRule.create({
            data: {
                delegatorId,
                delegateId,
                startDate: start,
                endDate: end,
                maxAmount: maxAmount ? parseFloat(maxAmount) : null,
                reason: reason || null,
                isActive: true
            },
            include: {
                delegator: { select: { id: true, name: true, email: true } },
                delegate: { select: { id: true, name: true, email: true } }
            }
        });

        return NextResponse.json({ success: true, data: delegation }, { status: 201 });
    } catch (error) {
        console.error('Error creating delegation:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create delegation' },
            { status: 500 }
        );
    }
}
