require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
    try {
        console.log("--- Users ---");
        const users = await prisma.user.findMany({
            include: { company: true }
        });
        users.forEach(u => console.log(`${u.email} (Role: ${u.role}) -> Company: ${u.company?.name || 'None'} (ID: ${u.companyId})`));

        console.log("\n--- Companies ---");
        const companies = await prisma.company.findMany({
            include: {
                _count: { select: { attendants: true } }
            }
        });
        companies.forEach(c => console.log(`${c.name} (Slug: ${c.slug}, ID: ${c.id}) -> Attendants: ${c._count.attendants}`));

        console.log("\n--- Reviews Check for Nacional ---");
        const nacional = companies.find(c => c.slug === 'nacional-24h' || c.name.includes('Nacional'));
        if (nacional) {
            const reviewCount = await prisma.review.count({
                where: { attendant: { companyId: nacional.id } }
            });
            console.log(`Reviews for ${nacional.name}: ${reviewCount}`);

            const attendants = await prisma.attendant.findMany({
                where: { companyId: nacional.id },
                include: { _count: { select: { reviews: true } } }
            });
            console.log("Attendants:", attendants.map(a => `${a.name} (${a._count.reviews} reviews)`));
        } else {
            console.log("Nacional company not found.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

inspect();
