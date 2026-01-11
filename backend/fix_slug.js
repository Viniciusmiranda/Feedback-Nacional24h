require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    try {
        const company = await prisma.company.findUnique({ where: { slug: 'nacional' } });
        if (company) {
            console.log("Updating slug for", company.name);
            await prisma.company.update({
                where: { id: company.id },
                data: { slug: 'nacional-24h' }
            });
            console.log("Slug updated to 'nacional-24h'");
        } else {
            console.log("Company with slug 'nacional' not found. It might be already updated.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

fix();
