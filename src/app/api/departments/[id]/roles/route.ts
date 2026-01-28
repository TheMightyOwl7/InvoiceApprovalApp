import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createRoleSchema = z.object({
    name: z.string().min(1, "Name is required"),
    level: z.coerce.number().min(1, "Level must be at least 1"),
});

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const roles = await prisma.jobRole.findMany({
            where: { departmentId: id },
            orderBy: { level: 'asc' },
        });
        return NextResponse.json({ success: true, data: roles });
    } catch (error) {
        console.error('Error fetching roles:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch roles' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const validated = createRoleSchema.parse(body);

        // Check uniqueness
        const existing = await prisma.jobRole.findFirst({
            where: {
                departmentId: id,
                name: validated.name
            }
        });

        if (existing) {
            return NextResponse.json(
                { success: false, error: 'Role with this name already exists in this department' },
                { status: 400 }
            );
        }

        const role = await prisma.jobRole.create({
            data: {
                name: validated.name,
                level: validated.level,
                departmentId: id,
            },
        });

        return NextResponse.json({ success: true, data: role });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.issues[0].message },
                { status: 400 }
            );
        }
        console.error('Error creating role:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create role' },
            { status: 500 }
        );
    }
}
