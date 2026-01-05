require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);
    const slug = args[0];
    const newPlan = args[1] ? args[1].toUpperCase() : null;

    // List all companies if no arguments
    if (!slug) {
        console.log("📍 Lista de Empresas:");
        const companies = await prisma.company.findMany();
        console.table(companies.map(c => ({
            Nome: c.name,
            Slug: c.slug,
            Plano: c.plan
        })));
        console.log("\n👉 Para atualizar, use: node scripts/update_plan.js <SLUG_DA_EMPRESA> <NOVO_PLANO>");
        console.log("   Exemplo: node scripts/update_plan.js minha-loja PEQUENAS");
        console.log("   Planos válidos: GRATIS, PEQUENAS, GRANDES");
        return;
    }

    if (!newPlan || !['GRATIS', 'PEQUENAS', 'GRANDES'].includes(newPlan)) {
        console.log("❌ Erro: Plano inválido ou não informado.");
        console.log("   Planos válidos: GRATIS, PEQUENAS, GRANDES");
        return;
    }

    try {
        const updated = await prisma.company.update({
            where: { slug: slug },
            data: { plan: newPlan }
        });
        console.log(`✅ Sucesso! Empresa '${updated.name}' atualizada para o plano ${updated.plan}.`);
    } catch (e) {
        console.error("❌ Erro ao atualizar (verifique o slug):", e.message);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
