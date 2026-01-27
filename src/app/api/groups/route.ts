import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/groups - List all user groups
export async function GET() {
    try {
        const groups = await prisma.userGroup.findMany({
            include: {
                memberships: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, department: true, role: true },
                        },
                    },
                },
                _count: {
                    select: { memberships: true, rules: true },
                },
            },
            orderBy: { name: 'asc' },
        });

        // Transform to include members array directly
        const groupsWithMembers = groups.map((group) => ({
            ...group,
            members: group.memberships.map((m) => m.user),
            memberCount: group._count.memberships,
            ruleCount: group._count.rules,
        }));

        return NextResponse.json({ success: true, data: groupsWithMembers });
    } catch (error) {
        console.error('Error fetching groups:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch groups' },
            { status: 500 }
        );
    }
}

// POST /api/groups - Create new user group
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            name,
            description,
            selfApprovalLimit,
            individualApprovalLimit,
            cumulativeMonthlyLimit,
            memberIds,
        } = body;

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Group name is required' },
                { status: 400 }
            );
        }

        // Check for duplicate name
        const existing = await prisma.userGroup.findUnique({
            where: { name },
        });

        if (existing) {
            return NextResponse.json(
                { success: false, error: 'Group name already exists' },
                { status: 409 }
            );
        }

        const group = await prisma.userGroup.create({
            data: {
                name,
                description,
                selfApprovalLimit: selfApprovalLimit ? parseFloat(selfApprovalLimit) : null,
                individualApprovalLimit: individualApprovalLimit ? parseFloat(individualApprovalLimit) : null,
                cumulativeMonthlyLimit: cumulativeMonthlyLimit ? parseFloat(cumulativeMonthlyLimit) : null,
                memberships: memberIds?.length
                    ? {
                        create: memberIds.map((userId: string) => ({ userId })),
                    }
                    : undefined,
            },
            include: {
                memberships: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true },
                        },
                    },
                },
            },
        });

        return NextResponse.json({ success: true, data: group }, { status: 201 });
    } catch (error) {
        console.error('Error creating group:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create group' },
            { status: 500 }
        );
    }
}
