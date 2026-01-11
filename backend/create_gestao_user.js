require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'gestao@nacional.com';
    const password = 'nacional_2026';
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Find Company
    const company = await prisma.company.findUnique({
        where: { slug: 'nacional-24h' }
    });

    if (!company) {
        console.error("Company 'nacional-24h' not found!");
        return;
    }

    console.log(`Found company: ${company.name} (${company.id})`);

    // 2. Check/Create User
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        console.log(`User ${email} already exists. Updating...`);
        await prisma.user.update({
            where: { email },
            data: {
                companyId: company.id,
                role: 'gestor',
                password: hashedPassword
            }
        });
    } else {
        console.log(`Creating user ${email}...`);
        await prisma.user.create({
            data: {
                name: 'Gestor Nacional',
                email: email,
                password: hashedPassword,
                role: 'gestor',
                companyId: company.id,
                active: true
            }
        });
    }

    console.log('User ready and linked.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
