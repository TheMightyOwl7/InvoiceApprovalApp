import prisma from '../src/lib/prisma';

async function main() {
    console.log('🌱 Starting comprehensive seed...');

    // ============================================
    // 1. USER GROUPS (Approval Tiers)
    // ============================================
    console.log('Creating user groups...');

    const tier1Group = await prisma.userGroup.upsert({
        where: { name: 'Tier1-Approvers' },
        update: {},
        create: {
            name: 'Tier1-Approvers',
            description: 'Standard approvers for routine payments up to R50,000',
            selfApprovalLimit: 5000,
            individualApprovalLimit: 50000,
            cumulativeMonthlyLimit: 250000,
        },
    });

    const tier2Group = await prisma.userGroup.upsert({
        where: { name: 'Tier2-Approvers' },
        update: {},
        create: {
            name: 'Tier2-Approvers',
            description: 'Senior approvers for larger payments up to R200,000',
            selfApprovalLimit: 10000,
            individualApprovalLimit: 200000,
            cumulativeMonthlyLimit: 1000000,
        },
    });

    const seniorGroup = await prisma.userGroup.upsert({
        where: { name: 'Senior-Management' },
        update: {},
        create: {
            name: 'Senior-Management',
            description: 'Senior management approvers up to R500,000',
            selfApprovalLimit: 25000,
            individualApprovalLimit: 500000,
            cumulativeMonthlyLimit: 2500000,
        },
    });

    const execGroup = await prisma.userGroup.upsert({
        where: { name: 'Executive-Approvers' },
        update: {},
        create: {
            name: 'Executive-Approvers',
            description: 'Executive approvers with no limits',
            selfApprovalLimit: null,
            individualApprovalLimit: null,
            cumulativeMonthlyLimit: null,
        },
    });

    console.log(`✅ Created 4 user groups`);

    // ============================================
    // 2. DEPARTMENTS & JOB ROLES
    // ============================================
    console.log('Creating departments and roles...');

    const departmentsList = [
        'Finance',
        'Operations',
        'IT',
        'HR',
        'Admin',
        'Treasury',
        'Marketing'
    ];

    const roleLevels = [
        { name: 'Junior Team Member', level: 1 },
        { name: 'Team Member', level: 2 },
        { name: 'Manager', level: 3 },
        { name: 'Senior Manager', level: 4 },
        { name: 'Executive', level: 5 } // Added Executive for completeness
    ];

    const departmentMap = new Map();
    const roleMap = new Map(); // Key: "DeptName-RoleName"

    for (const deptName of departmentsList) {
        const dept = await prisma.department.upsert({
            where: { name: deptName },
            update: {},
            create: { name: deptName }
        });
        departmentMap.set(deptName, dept);

        for (const roleDef of roleLevels) {
            const role = await prisma.jobRole.upsert({
                where: {
                    departmentId_name: {
                        departmentId: dept.id,
                        name: roleDef.name
                    }
                },
                update: { level: roleDef.level },
                create: {
                    name: roleDef.name,
                    level: roleDef.level,
                    departmentId: dept.id
                }
            });
            roleMap.set(`${deptName}-${roleDef.name}`, role);
        }
    }

    console.log(`✅ Created ${departmentsList.length} departments and roles`);

    // ============================================
    // 3. USERS
    // ============================================
    console.log('Creating users...');

    // Helper to get IDs
    const getDeptId = (name: string) => departmentMap.get(name)?.id;
    const getRoleId = (dept: string, role: string) => roleMap.get(`${dept}-${role}`)?.id;

    const users = await Promise.all([
        // Finance Department
        prisma.user.upsert({
            where: { email: 'sarah.exec@company.com' },
            update: { departmentId: getDeptId('Finance'), jobRoleId: getRoleId('Finance', 'Executive') },
            create: {
                name: 'Sarah Molefe',
                email: 'sarah.exec@company.com',
                department: 'Finance',
                role: 'executive',
                departmentId: getDeptId('Finance'),
                jobRoleId: getRoleId('Finance', 'Executive')
            },
        }),
        prisma.user.upsert({
            where: { email: 'david.cfo@company.com' },
            update: { departmentId: getDeptId('Finance'), jobRoleId: getRoleId('Finance', 'Senior Manager') },
            create: {
                name: 'David Nkosi',
                email: 'david.cfo@company.com',
                department: 'Finance',
                role: 'senior_manager',
                departmentId: getDeptId('Finance'),
                jobRoleId: getRoleId('Finance', 'Senior Manager')
            },
        }),
        prisma.user.upsert({
            where: { email: 'thandi.manager@company.com' },
            update: { departmentId: getDeptId('Finance'), jobRoleId: getRoleId('Finance', 'Manager') },
            create: {
                name: 'Thandi Dlamini',
                email: 'thandi.manager@company.com',
                department: 'Finance',
                role: 'manager',
                departmentId: getDeptId('Finance'),
                jobRoleId: getRoleId('Finance', 'Manager')
            },
        }),
        prisma.user.upsert({
            where: { email: 'james.analyst@company.com' },
            update: { departmentId: getDeptId('Finance'), jobRoleId: getRoleId('Finance', 'Team Member') },
            create: {
                name: 'James van der Berg',
                email: 'james.analyst@company.com',
                department: 'Finance',
                role: 'user',
                departmentId: getDeptId('Finance'),
                jobRoleId: getRoleId('Finance', 'Team Member')
            },
        }),

        // Operations Department
        prisma.user.upsert({
            where: { email: 'mike.ops@company.com' },
            update: { departmentId: getDeptId('Operations'), jobRoleId: getRoleId('Operations', 'Executive') },
            create: {
                name: 'Mike Pretorius',
                email: 'mike.ops@company.com',
                department: 'Operations',
                role: 'executive',
                departmentId: getDeptId('Operations'),
                jobRoleId: getRoleId('Operations', 'Executive')
            },
        }),
        prisma.user.upsert({
            where: { email: 'nomsa.ops@company.com' },
            update: { departmentId: getDeptId('Operations'), jobRoleId: getRoleId('Operations', 'Manager') },
            create: {
                name: 'Nomsa Khumalo',
                email: 'nomsa.ops@company.com',
                department: 'Operations',
                role: 'manager',
                departmentId: getDeptId('Operations'),
                jobRoleId: getRoleId('Operations', 'Manager')
            },
        }),

        // IT Department
        prisma.user.upsert({
            where: { email: 'sipho.it@company.com' },
            update: { departmentId: getDeptId('IT'), jobRoleId: getRoleId('IT', 'Senior Manager') },
            create: {
                name: 'Sipho Madonsela',
                email: 'sipho.it@company.com',
                department: 'IT',
                role: 'senior_manager',
                departmentId: getDeptId('IT'),
                jobRoleId: getRoleId('IT', 'Senior Manager')
            },
        }),
        prisma.user.upsert({
            where: { email: 'lisa.it@company.com' },
            update: { departmentId: getDeptId('IT'), jobRoleId: getRoleId('IT', 'Team Member') },
            create: {
                name: 'Lisa Fourie',
                email: 'lisa.it@company.com',
                department: 'IT',
                role: 'user',
                departmentId: getDeptId('IT'),
                jobRoleId: getRoleId('IT', 'Team Member')
            },
        }),

        // HR Department
        prisma.user.upsert({
            where: { email: 'peter.hr@company.com' },
            update: { departmentId: getDeptId('HR'), jobRoleId: getRoleId('HR', 'Manager') },
            create: {
                name: 'Peter Mbeki',
                email: 'peter.hr@company.com',
                department: 'HR',
                role: 'manager',
                departmentId: getDeptId('HR'),
                jobRoleId: getRoleId('HR', 'Manager')
            },
        }),

        // Admin/General
        prisma.user.upsert({
            where: { email: 'admin@company.com' },
            update: { departmentId: getDeptId('Admin'), jobRoleId: getRoleId('Admin', 'Executive') },
            create: {
                name: 'System Admin',
                email: 'admin@company.com',
                department: 'Admin',
                role: 'executive',
                departmentId: getDeptId('Admin'),
                jobRoleId: getRoleId('Admin', 'Executive')
            },
        }),
    ]);

    console.log(`✅ Created ${users.length} users`);

    // ============================================
    // 4. USER GROUP MEMBERSHIPS
    // ============================================
    console.log('Assigning users to groups...');

    // Get user IDs
    const [sarah, david, thandi, james, mike, nomsa, sipho, lisa, peter, admin] = users;

    // Tier 1: Regular managers
    await prisma.userGroupMembership.upsert({
        where: { userId_groupId: { userId: thandi.id, groupId: tier1Group.id } },
        update: {},
        create: { userId: thandi.id, groupId: tier1Group.id },
    });
    await prisma.userGroupMembership.upsert({
        where: { userId_groupId: { userId: nomsa.id, groupId: tier1Group.id } },
        update: {},
        create: { userId: nomsa.id, groupId: tier1Group.id },
    });
    await prisma.userGroupMembership.upsert({
        where: { userId_groupId: { userId: peter.id, groupId: tier1Group.id } },
        update: {},
        create: { userId: peter.id, groupId: tier1Group.id },
    });

    // Tier 2: Senior managers
    await prisma.userGroupMembership.upsert({
        where: { userId_groupId: { userId: david.id, groupId: tier2Group.id } },
        update: {},
        create: { userId: david.id, groupId: tier2Group.id },
    });
    await prisma.userGroupMembership.upsert({
        where: { userId_groupId: { userId: sipho.id, groupId: tier2Group.id } },
        update: {},
        create: { userId: sipho.id, groupId: tier2Group.id },
    });

    // Senior Management
    await prisma.userGroupMembership.upsert({
        where: { userId_groupId: { userId: david.id, groupId: seniorGroup.id } },
        update: {},
        create: { userId: david.id, groupId: seniorGroup.id },
    });
    await prisma.userGroupMembership.upsert({
        where: { userId_groupId: { userId: sipho.id, groupId: seniorGroup.id } },
        update: {},
        create: { userId: sipho.id, groupId: seniorGroup.id },
    });

    // Executive
    await prisma.userGroupMembership.upsert({
        where: { userId_groupId: { userId: sarah.id, groupId: execGroup.id } },
        update: {},
        create: { userId: sarah.id, groupId: execGroup.id },
    });
    await prisma.userGroupMembership.upsert({
        where: { userId_groupId: { userId: mike.id, groupId: execGroup.id } },
        update: {},
        create: { userId: mike.id, groupId: execGroup.id },
    });
    await prisma.userGroupMembership.upsert({
        where: { userId_groupId: { userId: admin.id, groupId: execGroup.id } },
        update: {},
        create: { userId: admin.id, groupId: execGroup.id },
    });

    console.log(`✅ Created group memberships`);

    // ============================================
    // 4. VENDORS
    // ============================================
    console.log('Creating vendors...');

    const vendors = await Promise.all([
        prisma.vendor.upsert({
            where: { id: 'vendor-office-supplies' },
            update: {},
            create: {
                id: 'vendor-office-supplies',
                name: 'Bidvest Office Supplies',
                taxNumber: '4123456789',
                riskRating: 'low',
                isNew: false,
                onboardedAt: new Date('2023-06-15'),
                country: 'ZA',
                bankDetailsVerified: true,
            },
        }),
        prisma.vendor.upsert({
            where: { id: 'vendor-it-solutions' },
            update: {},
            create: {
                id: 'vendor-it-solutions',
                name: 'Dimension Data',
                taxNumber: '4987654321',
                riskRating: 'standard',
                isNew: false,
                onboardedAt: new Date('2022-01-10'),
                country: 'ZA',
                bankDetailsVerified: true,
            },
        }),
        prisma.vendor.upsert({
            where: { id: 'vendor-consulting' },
            update: {},
            create: {
                id: 'vendor-consulting',
                name: 'McKinsey & Company',
                taxNumber: null,
                riskRating: 'standard',
                isNew: false,
                onboardedAt: new Date('2024-03-01'),
                country: 'US',
                requiresCompliance: true,
                bankDetailsVerified: true,
            },
        }),
        prisma.vendor.upsert({
            where: { id: 'vendor-new-contractor' },
            update: {},
            create: {
                id: 'vendor-new-contractor',
                name: 'TechStart Solutions (Pty) Ltd',
                taxNumber: '4567891234',
                riskRating: 'new',
                isNew: true,
                country: 'ZA',
                bankDetailsVerified: false,
            },
        }),
        prisma.vendor.upsert({
            where: { id: 'vendor-high-risk' },
            update: {},
            create: {
                id: 'vendor-high-risk',
                name: 'International Trading Corp',
                taxNumber: null,
                riskRating: 'high',
                isNew: false,
                onboardedAt: new Date('2024-06-01'),
                country: 'NG',
                requiresCompliance: true,
                bankDetailsVerified: true,
                bankDetailsChangedAt: new Date('2025-12-15'),
            },
        }),
    ]);

    console.log(`✅ Created ${vendors.length} vendors`);

    // ============================================
    // 5. SPEND CATEGORIES
    // ============================================
    console.log('Creating spend categories...');

    const categories = await Promise.all([
        prisma.spendCategory.upsert({
            where: { code: 'IT' },
            update: {},
            create: {
                id: 'cat-it',
                name: 'Information Technology',
                code: 'IT',
                defaultApproverId: sipho.id,
            },
        }),
        prisma.spendCategory.upsert({
            where: { code: 'MKT' },
            update: {},
            create: {
                id: 'cat-mkt',
                name: 'Marketing & Advertising',
                code: 'MKT',
            },
        }),
        prisma.spendCategory.upsert({
            where: { code: 'OPS' },
            update: {},
            create: {
                id: 'cat-ops',
                name: 'Operations',
                code: 'OPS',
                defaultApproverId: nomsa.id,
            },
        }),
        prisma.spendCategory.upsert({
            where: { code: 'TRV' },
            update: {},
            create: {
                id: 'cat-trv',
                name: 'Travel & Entertainment',
                code: 'TRV',
            },
        }),
        prisma.spendCategory.upsert({
            where: { code: 'PROF' },
            update: {},
            create: {
                id: 'cat-prof',
                name: 'Professional Services',
                code: 'PROF',
                defaultApproverId: david.id,
            },
        }),
    ]);

    console.log(`✅ Created ${categories.length} categories`);

    // ============================================
    // 6. PROJECTS
    // ============================================
    console.log('Creating projects...');

    const projects = await Promise.all([
        prisma.project.upsert({
            where: { code: 'ERP-2026' },
            update: {},
            create: {
                id: 'proj-erp',
                name: 'ERP Implementation 2026',
                code: 'ERP-2026',
                totalBudget: 5000000,
                spentAmount: 1250000,
                projectManagerId: sipho.id,
                status: 'active',
                endsAt: new Date('2026-12-31'),
            },
        }),
        prisma.project.upsert({
            where: { code: 'MKT-Q1' },
            update: {},
            create: {
                id: 'proj-mkt-q1',
                name: 'Q1 Marketing Campaign',
                code: 'MKT-Q1',
                totalBudget: 500000,
                spentAmount: 125000,
                status: 'active',
                endsAt: new Date('2026-03-31'),
            },
        }),
        prisma.project.upsert({
            where: { code: 'OPS-FACILITY' },
            update: {},
            create: {
                id: 'proj-ops-fac',
                name: 'Facility Upgrade',
                code: 'OPS-FACILITY',
                totalBudget: 2000000,
                spentAmount: 800000,
                projectManagerId: mike.id,
                status: 'active',
                endsAt: new Date('2026-06-30'),
            },
        }),
    ]);

    console.log(`✅ Created ${projects.length} projects`);

    // ============================================
    // 7. WORKFLOWS WITH RULES
    // ============================================
    console.log('Creating workflows with rules...');

    // Workflow 1: Standard Payment Workflow
    const standardWorkflow = await prisma.workflow.upsert({
        where: { id: 'wf-standard' },
        update: {},
        create: {
            id: 'wf-standard',
            name: 'Standard Payment Approval',
            description: 'Default workflow for routine vendor payments',
            status: 'active',
            creatorId: admin.id,
            approverId: sarah.id,
        },
    });

    // Rules for Standard Workflow
    await prisma.approvalRule.upsert({
        where: { id: 'rule-std-under-10k' },
        update: {},
        create: {
            id: 'rule-std-under-10k',
            workflowId: standardWorkflow.id,
            name: 'Under R10,000 - Manager Approval',
            description: 'Payments under R10,000 require single manager approval',
            order: 1,
            ruleType: 'threshold',
            maxAmount: 10000,
            actionType: 'require_approval',
            requiredRole: 'manager',
            preventSelfApproval: true,
        },
    });

    await prisma.approvalRule.upsert({
        where: { id: 'rule-std-10k-50k' },
        update: {},
        create: {
            id: 'rule-std-10k-50k',
            workflowId: standardWorkflow.id,
            name: 'R10,000 - R50,000 - Tier 1 Approval',
            description: 'Payments between R10,000 and R50,000 require Tier 1 group approval',
            order: 2,
            ruleType: 'threshold',
            minAmount: 10000,
            maxAmount: 50000,
            actionType: 'require_approval',
            requiredGroupId: tier1Group.id,
            preventSelfApproval: true,
        },
    });

    await prisma.approvalRule.upsert({
        where: { id: 'rule-std-50k-200k' },
        update: {},
        create: {
            id: 'rule-std-50k-200k',
            workflowId: standardWorkflow.id,
            name: 'R50,000 - R200,000 - Tier 2 Approval',
            description: 'Payments between R50,000 and R200,000 require Tier 2 approval',
            order: 3,
            ruleType: 'threshold',
            minAmount: 50000,
            maxAmount: 200000,
            actionType: 'require_approval',
            requiredGroupId: tier2Group.id,
            preventSelfApproval: true,
            preventCreatorApproval: true,
        },
    });

    await prisma.approvalRule.upsert({
        where: { id: 'rule-std-over-200k' },
        update: {},
        create: {
            id: 'rule-std-over-200k',
            workflowId: standardWorkflow.id,
            name: 'Over R200,000 - Executive Approval',
            description: 'Payments over R200,000 require executive approval',
            order: 4,
            ruleType: 'threshold',
            minAmount: 200000,
            actionType: 'require_approval',
            requiredGroupId: execGroup.id,
            requiredApprovals: 2,
            approvalMode: 'parallel',
            preventSelfApproval: true,
            preventCreatorApproval: true,
        },
    });

    // Workflow 2: High Risk Vendor Workflow
    const highRiskWorkflow = await prisma.workflow.upsert({
        where: { id: 'wf-high-risk' },
        update: {},
        create: {
            id: 'wf-high-risk',
            name: 'High Risk Vendor Approval',
            description: 'Enhanced approval for new or high-risk vendors',
            status: 'active',
            creatorId: admin.id,
            approverId: sarah.id,
        },
    });

    await prisma.approvalRule.upsert({
        where: { id: 'rule-hr-new-vendor' },
        update: {},
        create: {
            id: 'rule-hr-new-vendor',
            workflowId: highRiskWorkflow.id,
            name: 'New Vendor - Senior Approval Required',
            description: 'All payments to new vendors require senior manager approval',
            order: 1,
            ruleType: 'vendor',
            vendorIsNew: true,
            actionType: 'require_approval',
            requiredGroupId: seniorGroup.id,
            preventSelfApproval: true,
            preventCreatorApproval: true,
        },
    });

    await prisma.approvalRule.upsert({
        where: { id: 'rule-hr-high-risk' },
        update: {},
        create: {
            id: 'rule-hr-high-risk',
            workflowId: highRiskWorkflow.id,
            name: 'High Risk Vendor - Compliance Review',
            description: 'High risk vendors require compliance review',
            order: 2,
            ruleType: 'vendor',
            vendorRiskRatings: JSON.stringify(['high']),
            requiresCompliance: true,
            actionType: 'require_approval',
            requiredGroupId: execGroup.id,
            preventSelfApproval: true,
        },
    });

    // Workflow 3: IT Department Workflow
    const itWorkflow = await prisma.workflow.upsert({
        where: { id: 'wf-it' },
        update: {},
        create: {
            id: 'wf-it',
            name: 'IT Department Workflow',
            description: 'Workflow for IT department purchases',
            status: 'active',
            departmentScope: 'IT',
            creatorId: sipho.id,
            approverId: sarah.id,
        },
    });

    await prisma.approvalRule.upsert({
        where: { id: 'rule-it-software' },
        update: {},
        create: {
            id: 'rule-it-software',
            workflowId: itWorkflow.id,
            name: 'IT Software - Category Approval',
            description: 'IT category purchases routed to IT head',
            order: 1,
            ruleType: 'category',
            categoryId: categories[0].id, // IT category
            actionType: 'require_approval',
            specificApproverId: sipho.id,
            preventSelfApproval: true,
        },
    });

    console.log(`✅ Created 3 workflows with rules`);

    // ============================================
    // 8. ADDITIONAL USERS
    // ============================================
    console.log('Creating additional users...');

    const additionalUsers = await Promise.all([
        // Marketing Department
        prisma.user.upsert({
            where: { email: 'karen.mkt@company.com' },
            update: {},
            create: {
                name: 'Karen Williams',
                email: 'karen.mkt@company.com',
                department: 'Marketing',
                role: 'senior_manager',
                departmentId: getDeptId('Marketing'),
                jobRoleId: getRoleId('Marketing', 'Senior Manager')
            },
        }),
        prisma.user.upsert({
            where: { email: 'john.mkt@company.com' },
            update: {},
            create: {
                name: 'John Botha',
                email: 'john.mkt@company.com',
                department: 'Marketing',
                role: 'manager',
                departmentId: getDeptId('Marketing'),
                jobRoleId: getRoleId('Marketing', 'Manager')
            },
        }),
        prisma.user.upsert({
            where: { email: 'priya.mkt@company.com' },
            update: {},
            create: {
                name: 'Priya Naidoo',
                email: 'priya.mkt@company.com',
                department: 'Marketing',
                role: 'user',
                departmentId: getDeptId('Marketing'),
                jobRoleId: getRoleId('Marketing', 'Team Member')
            },
        }),
        // Treasury
        prisma.user.upsert({
            where: { email: 'andre.treasury@company.com' },
            update: {},
            create: {
                name: 'Andre Joubert',
                email: 'andre.treasury@company.com',
                department: 'Treasury',
                role: 'senior_manager',
                departmentId: getDeptId('Treasury'),
                jobRoleId: getRoleId('Treasury', 'Senior Manager')
            },
        }),
        prisma.user.upsert({
            where: { email: 'fatima.treasury@company.com' },
            update: {},
            create: {
                name: 'Fatima Adams',
                email: 'fatima.treasury@company.com',
                department: 'Treasury',
                role: 'user',
                departmentId: getDeptId('Treasury'),
                jobRoleId: getRoleId('Treasury', 'Team Member')
            },
        }),
        // More Finance
        prisma.user.upsert({
            where: { email: 'johan.fin@company.com' },
            update: {},
            create: {
                name: 'Johan Steyn',
                email: 'johan.fin@company.com',
                department: 'Finance',
                role: 'user',
                departmentId: getDeptId('Finance'),
                jobRoleId: getRoleId('Finance', 'Junior Team Member')
            },
        }),
        // More Operations
        prisma.user.upsert({
            where: { email: 'zanele.ops@company.com' },
            update: {},
            create: {
                name: 'Zanele Mthembu',
                email: 'zanele.ops@company.com',
                department: 'Operations',
                role: 'senior_manager',
                departmentId: getDeptId('Operations'),
                jobRoleId: getRoleId('Operations', 'Senior Manager')
            },
        }),
        prisma.user.upsert({
            where: { email: 'grant.ops@company.com' },
            update: {},
            create: {
                name: 'Grant Patterson',
                email: 'grant.ops@company.com',
                department: 'Operations',
                role: 'user',
                departmentId: getDeptId('Operations'),
                jobRoleId: getRoleId('Operations', 'Team Member')
            },
        }),
    ]);

    console.log(`✅ Created ${additionalUsers.length} additional users`);

    // ============================================
    // 9. STAGE-BASED WORKFLOWS
    // ============================================
    console.log('Creating stage-based workflows...');

    // Simple 2-stage workflow
    const simpleWorkflow = await prisma.workflow.upsert({
        where: { id: 'wf-simple' },
        update: {},
        create: {
            id: 'wf-simple',
            name: 'Quick Approval Flow',
            description: 'Simple 2-stage approval for routine payments',
            status: 'active',
            creatorId: david.id,
            approverId: sarah.id,
        },
    });

    await prisma.workflowStage.upsert({
        where: { id: 'stage-simple-1' },
        update: {},
        create: {
            id: 'stage-simple-1',
            workflowId: simpleWorkflow.id,
            name: 'Manager Review',
            order: 0,
            stageType: 'static',
            requiredRole: 'manager',
            approvalMode: 'any',
            requiredApprovals: 1,
            slaHours: 24,
        },
    });

    await prisma.workflowStage.upsert({
        where: { id: 'stage-simple-2' },
        update: {},
        create: {
            id: 'stage-simple-2',
            workflowId: simpleWorkflow.id,
            name: 'Senior Manager Sign-off',
            order: 1,
            stageType: 'static',
            requiredRole: 'senior_manager',
            approvalMode: 'any',
            requiredApprovals: 1,
            slaHours: 48,
        },
    });

    // 3-stage executive workflow
    const execWorkflow = await prisma.workflow.upsert({
        where: { id: 'wf-executive' },
        update: {},
        create: {
            id: 'wf-executive',
            name: 'Executive Approval Chain',
            description: '3-stage approval for high-value payments',
            status: 'active',
            creatorId: sarah.id,
        },
    });

    await prisma.workflowStage.upsert({
        where: { id: 'stage-exec-1' },
        update: {},
        create: {
            id: 'stage-exec-1',
            workflowId: execWorkflow.id,
            name: 'Department Manager',
            order: 0,
            stageType: 'static',
            requiredRole: 'manager',
            approvalMode: 'any',
            requiredApprovals: 1,
        },
    });

    await prisma.workflowStage.upsert({
        where: { id: 'stage-exec-2' },
        update: {},
        create: {
            id: 'stage-exec-2',
            workflowId: execWorkflow.id,
            name: 'Finance Review',
            order: 1,
            stageType: 'static',
            requiredGroupId: tier2Group.id,
            approvalMode: 'any',
            requiredApprovals: 1,
        },
    });

    await prisma.workflowStage.upsert({
        where: { id: 'stage-exec-3' },
        update: {},
        create: {
            id: 'stage-exec-3',
            workflowId: execWorkflow.id,
            name: 'Executive Approval',
            order: 2,
            stageType: 'static',
            requiredRole: 'executive',
            approvalMode: 'all',
            requiredApprovals: 2,
            slaHours: 72,
        },
    });

    console.log(`✅ Created 2 stage-based workflows`);

    // ============================================
    // 10. SAMPLE PAYMENT REQUESTS
    // ============================================
    console.log('Creating sample payment requests...');

    const paymentRequests = await Promise.all([
        // Pending requests
        prisma.paymentRequest.upsert({
            where: { id: 'req-001' },
            update: {},
            create: {
                id: 'req-001',
                invoiceNumber: 'INV-2026-001',
                invoiceDate: new Date('2026-01-15'),
                amount: 15000,
                currency: 'ZAR',
                description: 'Office furniture for new workspace',
                requesterId: james.id,
                vendorId: vendors[0].id,
                categoryId: categories[2].id,
                status: 'pending',
            },
        }),
        prisma.paymentRequest.upsert({
            where: { id: 'req-002' },
            update: {},
            create: {
                id: 'req-002',
                invoiceNumber: 'INV-2026-002',
                invoiceDate: new Date('2026-01-18'),
                amount: 75000,
                currency: 'ZAR',
                description: 'Server hardware upgrade',
                requesterId: lisa.id,
                vendorId: vendors[1].id,
                categoryId: categories[0].id,
                projectId: projects[0].id,
                status: 'pending',
            },
        }),
        prisma.paymentRequest.upsert({
            where: { id: 'req-003' },
            update: {},
            create: {
                id: 'req-003',
                invoiceNumber: 'INV-2026-003',
                invoiceDate: new Date('2026-01-20'),
                amount: 250000,
                currency: 'ZAR',
                description: 'Strategic consulting engagement - Phase 1',
                requesterId: david.id,
                vendorId: vendors[2].id,
                categoryId: categories[4].id,
                status: 'pending',
            },
        }),
        // Draft requests
        prisma.paymentRequest.upsert({
            where: { id: 'req-004' },
            update: {},
            create: {
                id: 'req-004',
                invoiceNumber: 'INV-2026-004',
                invoiceDate: new Date('2026-01-22'),
                amount: 8500,
                currency: 'ZAR',
                description: 'Marketing materials for Q1 campaign',
                requesterId: additionalUsers[2].id,
                categoryId: categories[1].id,
                projectId: projects[1].id,
                status: 'draft',
            },
        }),
        prisma.paymentRequest.upsert({
            where: { id: 'req-005' },
            update: {},
            create: {
                id: 'req-005',
                invoiceNumber: 'INV-2026-005',
                invoiceDate: new Date('2026-01-23'),
                amount: 45000,
                currency: 'ZAR',
                description: 'Annual software license renewal',
                requesterId: lisa.id,
                vendorId: vendors[1].id,
                categoryId: categories[0].id,
                status: 'draft',
            },
        }),
        // Approved requests
        prisma.paymentRequest.upsert({
            where: { id: 'req-006' },
            update: {},
            create: {
                id: 'req-006',
                invoiceNumber: 'INV-2026-006',
                invoiceDate: new Date('2026-01-10'),
                amount: 12000,
                currency: 'ZAR',
                description: 'Office supplies quarterly order',
                requesterId: james.id,
                vendorId: vendors[0].id,
                categoryId: categories[2].id,
                status: 'approved',
                completedAt: new Date('2026-01-12'),
            },
        }),
        prisma.paymentRequest.upsert({
            where: { id: 'req-007' },
            update: {},
            create: {
                id: 'req-007',
                invoiceNumber: 'INV-2026-007',
                invoiceDate: new Date('2026-01-08'),
                amount: 95000,
                currency: 'ZAR',
                description: 'Network equipment installation',
                requesterId: sipho.id,
                vendorId: vendors[1].id,
                categoryId: categories[0].id,
                projectId: projects[0].id,
                status: 'approved',
                completedAt: new Date('2026-01-14'),
            },
        }),
        // Rejected request
        prisma.paymentRequest.upsert({
            where: { id: 'req-008' },
            update: {},
            create: {
                id: 'req-008',
                invoiceNumber: 'INV-2026-008',
                invoiceDate: new Date('2026-01-05'),
                amount: 180000,
                currency: 'ZAR',
                description: 'Unbudgeted capital expense',
                requesterId: peter.id,
                vendorId: vendors[3].id,
                categoryId: categories[4].id,
                status: 'rejected',
                completedAt: new Date('2026-01-07'),
            },
        }),
        // More pending
        prisma.paymentRequest.upsert({
            where: { id: 'req-009' },
            update: {},
            create: {
                id: 'req-009',
                invoiceNumber: 'INV-2026-009',
                invoiceDate: new Date('2026-01-25'),
                amount: 32500,
                currency: 'ZAR',
                description: 'Employee training program',
                requesterId: peter.id,
                categoryId: categories[4].id,
                status: 'pending',
            },
        }),
        prisma.paymentRequest.upsert({
            where: { id: 'req-010' },
            update: {},
            create: {
                id: 'req-010',
                invoiceNumber: 'INV-2026-010',
                invoiceDate: new Date('2026-01-26'),
                amount: 5500,
                currency: 'ZAR',
                description: 'Catering for client meeting',
                requesterId: additionalUsers[1].id,
                categoryId: categories[3].id,
                status: 'pending',
            },
        }),
        prisma.paymentRequest.upsert({
            where: { id: 'req-011' },
            update: {},
            create: {
                id: 'req-011',
                invoiceNumber: 'INV-2026-011',
                invoiceDate: new Date('2026-01-27'),
                amount: 125000,
                currency: 'USD',
                description: 'International consulting services',
                requesterId: david.id,
                vendorId: vendors[2].id,
                categoryId: categories[4].id,
                status: 'pending',
            },
        }),
        prisma.paymentRequest.upsert({
            where: { id: 'req-012' },
            update: {},
            create: {
                id: 'req-012',
                invoiceNumber: 'INV-2026-012',
                invoiceDate: new Date('2026-01-28'),
                amount: 18750,
                currency: 'ZAR',
                description: 'Facility maintenance contract',
                requesterId: additionalUsers[7].id,
                vendorId: vendors[0].id,
                categoryId: categories[2].id,
                projectId: projects[2].id,
                status: 'pending',
            },
        }),
    ]);

    console.log(`✅ Created ${paymentRequests.length} payment requests`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n🎉 Seed completed successfully!');
    console.log('-----------------------------------');
    console.log(`📊 Summary:`);
    console.log(`   - User Groups: 4`);
    console.log(`   - Users: ${users.length + additionalUsers.length}`);
    console.log(`   - Vendors: ${vendors.length}`);
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Projects: ${projects.length}`);
    console.log(`   - Workflows: 5 (3 rule-based, 2 stage-based)`);
    console.log(`   - Payment Requests: ${paymentRequests.length}`);
    console.log('-----------------------------------');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

