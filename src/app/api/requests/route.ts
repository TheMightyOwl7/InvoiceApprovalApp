import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ruleEngine } from '@/lib/rules/engine';

// GET /api/requests - List all requests with filters
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const requesterId = searchParams.get('requesterId');
        const department = searchParams.get('department');
        const vendorName = searchParams.get('vendorName');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};

        if (status) where.status = status;
        if (requesterId) where.requesterId = requesterId;

        if (department) {
            where.requester = {
                department: department
            };
        }

        // Filter by vendor name through relation
        if (vendorName) {
            where.vendor = {
                name: {
                    contains: vendorName,
                    mode: 'insensitive'
                }
            };
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        const requests = await prisma.paymentRequest.findMany({
            where,
            include: {
                requester: {
                    select: { id: true, name: true, department: true },
                },
                vendor: {
                    select: { id: true, name: true, riskRating: true },
                },
                category: {
                    select: { id: true, name: true, code: true },
                },
                project: {
                    select: { id: true, name: true, code: true },
                },
                documents: {
                    select: { id: true, name: true, mimeType: true, size: true },
                },
                activeSteps: {
                    where: { status: 'pending' },
                    select: { id: true, requiredRole: true, status: true },
                },
                _count: {
                    select: { approvalHistory: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ success: true, data: requests });
    } catch (error) {
        console.error('Error fetching requests:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch requests' },
            { status: 500 }
        );
    }
}

// POST /api/requests - Create new payment request
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            vendorId,       // Now using vendor relation
            vendorName,     // For creating new vendor if needed
            invoiceNumber,
            invoiceDate,
            amount,
            currency,
            description,
            vatCharged,
            vatAmount,
            internalVatNumber,
            externalVatNumber,
            requesterId,
            categoryId,
            projectId,
            poNumber,
            poAmount,
            quoteRef,
            quoteAmount,
            workflowId,
            status = 'draft',
        } = body;

        // Basic validation
        if (!invoiceNumber || !invoiceDate || !amount || !requesterId) {
            return NextResponse.json(
                { success: false, error: 'Invoice number, date, amount, and requester are required' },
                { status: 400 }
            );
        }

        // Verify requester exists
        const requester = await prisma.user.findUnique({
            where: { id: requesterId },
        });

        if (!requester) {
            return NextResponse.json(
                { success: false, error: 'Requester not found' },
                { status: 404 }
            );
        }

        // Handle vendor - either use existing or create new
        let finalVendorId = vendorId;
        if (!vendorId && vendorName) {
            // Check if vendor with this name exists
            let vendor = await prisma.vendor.findFirst({
                where: { name: vendorName }
            });

            if (!vendor) {
                // Create new vendor
                vendor = await prisma.vendor.create({
                    data: {
                        name: vendorName,
                        isNew: true,
                        riskRating: 'new',
                    }
                });
            }
            finalVendorId = vendor.id;
        }

        // Create the payment request
        const paymentRequest = await prisma.paymentRequest.create({
            data: {
                invoiceNumber,
                invoiceDate: new Date(invoiceDate),
                amount: parseFloat(amount),
                currency: currency || 'ZAR',
                description,
                vatCharged: vatCharged || false,
                vatAmount: vatAmount ? parseFloat(vatAmount) : null,
                internalVatNumber,
                externalVatNumber,
                requesterId,
                vendorId: finalVendorId,
                categoryId,
                projectId,
                poNumber,
                poAmount: poAmount ? parseFloat(poAmount) : null,
                quoteRef,
                quoteAmount: quoteAmount ? parseFloat(quoteAmount) : null,
                // Only set workflowId if explicitly provided and valid
                ...(workflowId ? { workflowId } : {}),
                status,
            },
            include: {
                requester: true,
                vendor: true,
                category: true,
                project: true,
            },
        });

        // If status is 'pending', run rule engine to assign workflow and create approval steps
        if (status === 'pending') {
            try {
                // Find applicable workflow based on department/category
                const workflow = await ruleEngine.findApplicableWorkflow(paymentRequest, requester);

                if (workflow) {
                    // Build evaluation context
                    const context = await ruleEngine.buildContext(paymentRequest, requester);

                    // Evaluate all rules in the workflow
                    const result = await ruleEngine.evaluateWorkflow(workflow, context);

                    // Handle auto-approve/auto-reject
                    if (result.autoReject) {
                        await prisma.paymentRequest.update({
                            where: { id: paymentRequest.id },
                            data: {
                                status: 'rejected',
                                workflowId: workflow.id,
                                completedAt: new Date(),
                            },
                        });

                        return NextResponse.json({
                            success: true,
                            data: { ...paymentRequest, status: 'rejected' },
                            message: result.autoRejectReason || 'Request automatically rejected by rules',
                        }, { status: 201 });
                    }

                    if (result.autoApprove) {
                        await prisma.paymentRequest.update({
                            where: { id: paymentRequest.id },
                            data: {
                                status: 'approved',
                                workflowId: workflow.id,
                                completedAt: new Date(),
                            },
                        });

                        return NextResponse.json({
                            success: true,
                            data: { ...paymentRequest, status: 'approved' },
                            message: 'Request automatically approved',
                        }, { status: 201 });
                    }

                    // Create approval steps and update request with workflow
                    if (result.requiredSteps.length > 0) {
                        await ruleEngine.createApprovalSteps(paymentRequest.id, result.requiredSteps);
                    }

                    // Update request with assigned workflow
                    await prisma.paymentRequest.update({
                        where: { id: paymentRequest.id },
                        data: {
                            workflowId: workflow.id,
                            submittedAt: new Date(),
                        },
                    });

                    // Refetch with updated data
                    const updatedRequest = await prisma.paymentRequest.findUnique({
                        where: { id: paymentRequest.id },
                        include: {
                            requester: true,
                            vendor: true,
                            category: true,
                            project: true,
                            workflow: true,
                            activeSteps: {
                                where: { status: 'pending' },
                            },
                        },
                    });

                    return NextResponse.json({
                        success: true,
                        data: updatedRequest,
                        workflow: {
                            id: workflow.id,
                            name: workflow.name,
                            stepsCreated: result.requiredSteps.length,
                        },
                    }, { status: 201 });
                }
            } catch (ruleError) {
                console.error('Rule engine error (non-blocking):', ruleError);
                // Continue even if rule engine fails - request is already created
            }
        }

        return NextResponse.json({ success: true, data: paymentRequest }, { status: 201 });
    } catch (error) {
        console.error('Error creating request:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create request' },
            { status: 500 }
        );
    }
}
