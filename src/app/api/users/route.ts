import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/users - List all users
export async function GET() {
    try {
        const users = await prisma.user.findMany({
            orderBy: { name: 'asc' },
            include: { userDepartment: true, jobRole: true }
        });
        return NextResponse.json({ success: true, data: users });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, department, departmentId, jobRoleId } = body;

        // Basic validation
        if (!name || !email) {
            return NextResponse.json(
                { success: false, error: 'Name and email are required' },
                { status: 400 }
            );
        }

        // Check for duplicate email
        const existing = await prisma.user.findUnique({
            where: { email },
        });

        if (existing) {
            return NextResponse.json(
                { success: false, error: 'A user with this email already exists' },
                { status: 409 }
            );
        }

        // Resolve legacy fields if new IDs provided
        let deptName = department;
        let roleName = 'user'; // default

        if (departmentId && !deptName) {
            const d = await prisma.department.findUnique({ where: { id: departmentId } });
            if (d) deptName = d.name;
        }

        if (jobRoleId) {
            const r = await prisma.jobRole.findUnique({ where: { id: jobRoleId } });
            if (r) roleName = r.name; // Use role name as legacy role string
            // Map legacy role levels if needed, or just use name.
            // Existing logic uses: executive, senior_manager, manager, user
            // We might need a mapper here, but for now let's trust the input or default.
        }

        const user = await prisma.user.create({
            data: {
                name,
                email,
                department: deptName || 'Unassigned',
                departmentId,
                jobRoleId,
                role: roleName
            },
        });

        return NextResponse.json({ success: true, data: user }, { status: 201 });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create user' },
            { status: 500 }
        );
    }
}
