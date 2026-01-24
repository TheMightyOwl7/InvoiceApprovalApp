import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/workflows - List all workflows
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const where: any = {};
        if (status) where.status = status;

        const workflows = await prisma.workflow.findMany({
            where,
            include: {
                steps: {
                    orderBy: { order: 'asc' }
                },
                creator: {
                    select: { id: true, name: true, department: true, role: true }
                },
                approver: {
                    select: { id: true, name: true, department: true, role: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ success: true, data: workflows });
    } catch (error) {
        console.error('Error fetching workflows:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch workflows' },
            { status: 500 }
        );
    }
}

// POST /api/workflows - Create new workflow
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, description, steps, creatorId } = body;

        if (!name || !steps || !Array.isArray(steps) || steps.length === 0 || !creatorId) {
            return NextResponse.json(
                { success: false, error: 'Name, steps, and creator are required' },
                { status: 400 }
            );
        }

        // Verify creator is at least a senior manager
        const creator = await prisma.user.findUnique({
            where: { id: creatorId }
        });

        if (!creator || (creator.role !== 'senior_manager' && creator.role !== 'executive')) {
            return NextResponse.json(
                { success: false, error: 'Only Senior Managers or Executives can create workflows' },
                { status: 403 }
            );
        }

        const workflow = await prisma.workflow.create({
            data: {
                name,
                description,
                creatorId,
                status: 'pending_approval',
                steps: {
                    create: steps.map((step: any, index: number) => ({
                        order: step.order || index,
                        name: step.name,
                        minAmount: parseFloat(step.minAmount) || 0,
                        roleRequirement: step.roleRequirement
                    }))
                }
            },
            include: {
                steps: true
            }
        });

        return NextResponse.json({ success: true, data: workflow }, { status: 201 });
    } catch (error) {
        console.error('Error creating workflow:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create workflow' },
            { status: 500 }
        );
    }
}
