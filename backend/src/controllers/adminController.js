const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// DASHBOARD METRICS
exports.getDashboardMetrics = async (req, res) => {
    try {
        // 1. Total Companies
        const totalCompanies = await prisma.company.count();

        // 2. Active Companies
        const activeCompanies = await prisma.company.count({ where: { active: true } });

        // 3. Total Reviews (SUM of all reviews)
        const totalReviews = await prisma.review.count();

        // 4. Total Attendants
        const totalAttendants = await prisma.attendant.count();

        // 5. Active Attendants
        const activeAttendants = await prisma.attendant.count({ where: { active: true } });

        // 6. Companies by Plan (Pie Chart Data)
        const byPlan = await prisma.company.groupBy({
            by: ['plan'],
            _count: { id: true }
        });

        res.json({
            companies: { total: totalCompanies, active: activeCompanies },
            reviews: { total: totalReviews },
            attendants: { total: totalAttendants, active: activeAttendants },
            byPlan
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar métricas.' });
    }
};

// LIST COMPANIES
exports.listCompanies = async (req, res) => {
    try {
        const companies = await prisma.company.findMany({
            include: {
                _count: {
                    select: {
                        attendants: true,
                        // reviews is connected to attendant, not directly to company in schema?
                        // Schema: Attendant -> Review. Company -> Attendant.
                        // We need nested count or separate query?
                        // Prisma doesn't support deep nested _count in findMany easily for sum.
                        // We will iterate or use raw query if needed. 
                        // But for simplicity, let's just count attendants first.
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Enrich with Review Counts (Expensive but OK for admin for now)
        // Alternatively, we can use a raw query for performance later.
        const enriched = await Promise.all(companies.map(async (c) => {
            const reviews = await prisma.review.count({
                where: { attendant: { companyId: c.id } }
            });
            return {
                ...c,
                _count: { ...c._count, reviews }
            };
        }));

        res.json(enriched);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao listar empresas.' });
    }
};

// UPDATE COMPANY
exports.updateCompany = async (req, res) => {
    const { id } = req.params;
    const { plan, active, name } = req.body;

    try {
        const company = await prisma.company.update({
            where: { id },
            data: {
                plan,
                active,
                name
            }
        });
        res.json(company);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar empresa.' });
    }
};
