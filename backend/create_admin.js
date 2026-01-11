const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@avaliaja.app.br';
    const password = '12f46g63H:)';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        console.log(`User ${email} already exists. Updating role to SAAS_ADMIN...`);
        await prisma.user.update({
            where: { email },
            data: {
                role: 'SAAS_ADMIN',
                password: hashedPassword // Ensure password is correct
            }
        });
    } else {
        console.log(`Creating user ${email}...`);
        await prisma.user.create({
            data: {
                name: 'Super Admin',
                email: email,
                password: hashedPassword,
                role: 'SAAS_ADMIN',
                active: true
            }
        });
    }

    console.log('Admin user ready.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
