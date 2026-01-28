import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/users/[id] - Get single user
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        const user = await prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: user });
    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch user' },
            { status: 500 }
        );
    }
}

// PATCH /api/users/[id] - Update user
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, email, department, departmentId, jobRoleId, role } = body;

        // Check user exists
        const existing = await prisma.user.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        // If changing email, check for duplicates
        if (email && email !== existing.email) {
            const duplicate = await prisma.user.findUnique({
                where: { email },
            });

            if (duplicate) {
                return NextResponse.json(
                    { success: false, error: 'A user with this email already exists' },
                    { status: 409 }
                );
            }
        }

        // Resolve names for legacy fields if IDs updated
        let deptNameUpdate = department;
        if (departmentId) {
            const d = await prisma.department.findUnique({ where: { id: departmentId } });
            if (d) deptNameUpdate = d.name;
        }

        const updateData: any = {
            ...(name && { name }),
            ...(email && { email }),
            ...(departmentId && { departmentId }),
            ...(jobRoleId && { jobRoleId }),
            ...(role && { role }),
            ...(deptNameUpdate && { department: deptNameUpdate }),
        };

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            include: { userDepartment: true, jobRole: true }
        });

        return NextResponse.json({ success: true, data: user });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update user' },
            { status: 500 }
        );
    }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        // Check for pending requests where user is requester or has pending approval steps
        const pendingRequests = await prisma.paymentRequest.findFirst({
            where: {
                OR: [
                    { requesterId: id, status: 'pending' },
                    {
                        activeSteps: {
                            some: {
                                status: 'pending',
                                OR: [
                                    { specificApproverId: id },
                                ]
                            }
                        }
                    },
                ],
            },
        });

        if (pendingRequests) {
            return NextResponse.json(
                { success: false, error: 'Cannot delete user with pending requests' },
                { status: 400 }
            );
        }

        await prisma.user.delete({
            where: { id },
        });

        return NextResponse.json({ success: true, data: { deleted: true } });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete user' },
            { status: 500 }
        );
    }
}
