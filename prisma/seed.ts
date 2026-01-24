import prisma from '../src/lib/prisma';

async function main() {
    console.log('Start seeding test users...');

    const departments = ['Finance', 'Treasury', 'Operations', 'HR', 'IT', 'Admin'];
    const seniorities = ['Junior', 'Senior', 'Exec'];

    const usersToCreate = [];

    // Fixed Executives
    usersToCreate.push({
        name: 'Sarah Finance-Exec',
        email: 'sarah.exec@finance.com',
        department: 'Finance',
        role: 'executive',
    });

    usersToCreate.push({
        name: 'Mike Ops-Exec',
        email: 'mike.exec@operations.com',
        department: 'Operations',
        role: 'executive',
    });

    const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

    // Add a Manager and Senior Manager for each department
    departments.forEach((dept, index) => {
        usersToCreate.push({
            name: `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]} (Sr. Manager)`,
            email: `${dept.toLowerCase()}.sr.manager@example.com`,
            department: dept,
            role: 'senior_manager',
        });
        usersToCreate.push({
            name: `${firstNames[(index + 10) % firstNames.length]} ${lastNames[(index + 5) % lastNames.length]} (Manager)`,
            email: `${dept.toLowerCase()}.manager@example.com`,
            department: dept,
            role: 'manager',
        });
    });

    // Generate the rest (randoms)
    for (let i = 0; i < 36; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const dept = departments[Math.floor(Math.random() * departments.length)];
        const seniority = seniorities[Math.floor(Math.random() * 2)]; // Junior or Senior

        usersToCreate.push({
            name: `${firstName} ${lastName} (${seniority})`,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i + 100}@example.com`,
            department: dept,
            role: seniority === 'Senior' ? 'manager' : 'user', // Map Senior Staff to manager role for demo
        });
    }

    for (const user of usersToCreate) {
        await prisma.user.upsert({
            where: { email: user.email },
            update: {},
            create: user,
        });
    }

    console.log(`Seeding finished. Created/Updated ${usersToCreate.length} users.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
