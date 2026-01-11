const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
    console.log("=== DIAGNOSTIC REPORT ===");
    console.log(new Date().toISOString());

    try {
        // 1. Check all Users
        const users = await prisma.user.findMany({
            include: { company: true }
        });
        console.log(`\n1. USERS FOUND: ${users.length}`);
        users.forEach(u => {
            console.log(` - ID: ${u.id} | Name: ${u.name} | Email: ${u.email} | Role: ${u.role} | CompanyID: ${u.companyId} | CompanyName: ${u.company?.name || 'N/A'}`);
        });

        // 2. Check all Companies
        const companies = await prisma.company.findMany();
        console.log(`\n2. COMPANIES FOUND: ${companies.length}`);
        companies.forEach(c => {
            console.log(` - ID: ${c.id} | Name: ${c.name} | Slug: ${c.slug} | Plan: ${c.plan}`);
        });

        // 3. Check specific check for potential disconnects
        const orphans = users.filter(u => !u.companyId);
        if (orphans.length > 0) {
            console.log(`\n⚠️ WARNING: ${orphans.length} users have no Company linked!`);
        }

        // 4. Check Data Volume for first company found
        if (companies.length > 0) {
            const c = companies[0];
            const attendantCount = await prisma.attendant.count({ where: { companyId: c.id } });
            const reviewCount = await prisma.review.count({ where: { attendant: { companyId: c.id } } });
            console.log(`\n3. DATA FOR COMPANY '${c.name}' (ID: ${c.id}):`);
            console.log(` - Attendants: ${attendantCount}`);
            console.log(` - Reviews: ${reviewCount}`);
        } else {
            console.log("\n⚠️ NO COMPANIES FOUND IN DB.");
        }

    } catch (e) {
        console.error("DIAGNOSTIC FAILED:", e);
    } finally {
        await prisma.$disconnect();
    }
}

diagnose();
