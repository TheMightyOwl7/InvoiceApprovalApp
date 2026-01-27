import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/projects - List all projects
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};
        if (status) where.status = status;

        const projects = await prisma.project.findMany({
            where,
            include: {
                projectManager: {
                    select: { id: true, name: true, department: true },
                },
                _count: {
                    select: { requests: true, rules: true },
                },
            },
            orderBy: { name: 'asc' },
        });

        // Calculate remaining budget for each project
        const projectsWithBudget = projects.map((project) => ({
            ...project,
            remainingBudget: project.totalBudget - project.spentAmount,
            percentUsed: Math.round((project.spentAmount / project.totalBudget) * 100),
        }));

        return NextResponse.json({ success: true, data: projectsWithBudget });
    } catch (error) {
        console.error('Error fetching projects:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch projects' },
            { status: 500 }
        );
    }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, code, totalBudget, projectManagerId, endsAt } = body;

        if (!name || !code || totalBudget === undefined) {
            return NextResponse.json(
                { success: false, error: 'Name, code, and total budget are required' },
                { status: 400 }
            );
        }

        // Check for duplicate code
        const existing = await prisma.project.findUnique({
            where: { code },
        });

        if (existing) {
            return NextResponse.json(
                { success: false, error: 'Project code already exists' },
                { status: 409 }
            );
        }

        const project = await prisma.project.create({
            data: {
                name,
                code: code.toUpperCase(),
                totalBudget: parseFloat(totalBudget),
                spentAmount: 0,
                projectManagerId,
                status: 'active',
                endsAt: endsAt ? new Date(endsAt) : null,
            },
            include: {
                projectManager: {
                    select: { id: true, name: true },
                },
            },
        });

        return NextResponse.json({ success: true, data: project }, { status: 201 });
    } catch (error) {
        console.error('Error creating project:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create project' },
            { status: 500 }
        );
    }
}
