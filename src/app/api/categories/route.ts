import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/categories - List all spend categories
export async function GET() {
    try {
        const categories = await prisma.spendCategory.findMany({
            include: {
                defaultApprover: {
                    select: { id: true, name: true, department: true },
                },
                _count: {
                    select: { requests: true, rules: true },
                },
            },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json({ success: true, data: categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch categories' },
            { status: 500 }
        );
    }
}

// POST /api/categories - Create new spend category
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, code, defaultApproverId } = body;

        if (!name || !code) {
            return NextResponse.json(
                { success: false, error: 'Name and code are required' },
                { status: 400 }
            );
        }

        // Check for duplicate code
        const existing = await prisma.spendCategory.findUnique({
            where: { code },
        });

        if (existing) {
            return NextResponse.json(
                { success: false, error: 'Category code already exists' },
                { status: 409 }
            );
        }

        const category = await prisma.spendCategory.create({
            data: {
                name,
                code: code.toUpperCase(),
                defaultApproverId,
            },
            include: {
                defaultApprover: {
                    select: { id: true, name: true },
                },
            },
        });

        return NextResponse.json({ success: true, data: category }, { status: 201 });
    } catch (error) {
        console.error('Error creating category:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create category' },
            { status: 500 }
        );
    }
}
