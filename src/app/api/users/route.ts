import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/users - List all users
export async function GET() {
    try {
        const users = await prisma.user.findMany({
            orderBy: { name: 'asc' },
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
        const { name, email, department } = body;

        // Basic validation
        if (!name || !email || !department) {
            return NextResponse.json(
                { success: false, error: 'Name, email, and department are required' },
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

        const user = await prisma.user.create({
            data: { name, email, department },
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
