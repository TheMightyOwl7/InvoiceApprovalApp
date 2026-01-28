import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createDepartmentSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
});

export async function GET() {
    try {
        const departments = await prisma.department.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { users: true, jobRoles: true }
                }
            }
        });
        return NextResponse.json({ success: true, data: departments });
    } catch (error) {
        console.error('Error fetching departments:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch departments' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validated = createDepartmentSchema.parse(body);

        const department = await prisma.department.create({
            data: {
                name: validated.name,
                description: validated.description,
            },
        });

        return NextResponse.json({ success: true, data: department });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.issues[0].message },
                { status: 400 }
            );
        }
        console.error('Error creating department:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create department' },
            { status: 500 }
        );
    }
}
