const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Public: Submit Review
exports.submitReview = async (req, res) => {
    const { rating, observation, attendant, ip, city, state, device, link_maps, companySlug } = req.body;

    if (!companySlug) {
        return res.status(400).json({ error: "Contexto de empresa (slug) é obrigatório." });
    }

    try {
        // 1. Find Company
        const company = await prisma.company.findUnique({
            where: { slug: companySlug }
        });

        if (!company) return res.status(404).json({ error: "Empresa não encontrada." });

        // 2. Find or Create Attendant within this Company
        let attendantRecord = await prisma.attendant.findFirst({
            where: {
                name: attendant || "Geral",
                companyId: company.id
            }
        });

        if (!attendantRecord) {
            attendantRecord = await prisma.attendant.create({
                data: {
                    name: attendant || "Geral",
                    companyId: company.id
                }
            });
        }

        const review = await prisma.review.create({
            data: {
                stars: parseInt(rating),
                comment: observation,
                ip,
                city,
                state,
                device,
                location: link_maps,
                attendantId: attendantRecord.id
            }
        });

        // Send to N8N Webhook (Dynamic from Company Settings)
        let notifications = company.notifications;

        if (typeof notifications === 'string') {
            try {
                notifications = JSON.parse(notifications);
            } catch (e) {
                console.error("[DEBUG] Error parsing notifications JSON:", e);
            }
        }

        const webhookUrl = notifications?.webhookUrl || process.env.N8N_WEBHOOK_URL;

        if (webhookUrl) {
            const payload = {
                id: review.id,
                stars: review.stars,
                comment: review.comment,
                attendant: attendantRecord.name,
                attendant_phone: attendantRecord.phone,
                attendant_sector: attendantRecord.sector,
                attendant_notify: attendantRecord.notify,
                attendant_integration_id: attendantRecord.integrationId,
                company: company.name,
                client_ip: ip,
                client_city: city,
                client_state: state,
                client_device: device,
                location_url: link_maps,
                created_at: review.createdAt,
                whatsapp_numbers: notifications?.whatsappNumbers || []
            };

            fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(err => console.error('[DEBUG] Error sending to N8N:', err));
        }

        res.json({ message: 'Avaliação recebida com sucesso!', id: review.id });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao salvar avaliação.' });
    }
};

// Update: Add Observation to existing review
exports.updateReview = async (req, res) => {
    const { id } = req.params;
    const { observation } = req.body;

    try {
        const review = await prisma.review.update({
            where: { id },
            data: { comment: observation }
        });
        res.json({ message: 'Observação atualizada!', review });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar avaliação.' });
    }
};

// Delete Review
exports.deleteReview = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.user; // Ensure user owns the review's company

    try {
        // Verify ownership
        const review = await prisma.review.findUnique({
            where: { id },
            include: { attendant: true }
        });

        if (!review) return res.status(404).json({ error: 'Avaliação não encontrada.' });
        if (review.attendant.companyId !== companyId) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        await prisma.review.delete({ where: { id } });
        res.json({ message: 'Avaliação excluída com sucesso!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir avaliação.' });
    }
};

// Private: Get Dashboard Data
exports.getDashboardData = async (req, res) => {
    const { companyId, role } = req.user;
    const { slug } = req.query;

    console.log(`[DASHBOARD] User: ${req.user.id}, Role: ${role}, CompanyID (Token): ${companyId}, Requested Slug: ${slug}`);

    let targetCompanyId = companyId;

    try {
        // If SAAS_ADMIN and slug is provided, find that company's ID
        if (role === 'SAAS_ADMIN' && slug) {
            const companyBySlug = await prisma.company.findUnique({
                where: { slug: slug },
                select: { id: true, name: true }
            });
            if (companyBySlug) {
                targetCompanyId = companyBySlug.id;
                console.log(`[DASHBOARD] Impersonating ${companyBySlug.name} (${targetCompanyId})`);
            } else {
                console.warn(`[DASHBOARD] Slug '${slug}' not found.`);
                return res.status(404).json({ error: "Empresa não encontrada pelo slug fornecido." });
            }
        }

        // If targetCompanyId is still null (e.g. SAAS_ADMIN without slug), error
        if (!targetCompanyId) {
            console.warn(`[DASHBOARD] No context found.`);
            return res.status(403).json({ error: "Contexto de empresa não encontrado." });
        }

        console.log(`[DASHBOARD] Fetching data for TargetCompanyID: ${targetCompanyId}`);

        const totalReviews = await prisma.review.count({
            where: { attendant: { companyId: targetCompanyId } }
        });

        const reviews = await prisma.review.findMany({
            where: { attendant: { companyId: targetCompanyId } },
            include: { attendant: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        // NPS Calculation
        const promoters = await prisma.review.count({ where: { stars: 5, attendant: { companyId: targetCompanyId } } });
        const detractors = await prisma.review.count({ where: { stars: { lte: 3 }, attendant: { companyId: targetCompanyId } } });
        const nps = totalReviews > 0 ? Math.round(((promoters - detractors) / totalReviews) * 100) : 0;

        // Average
        const aggs = await prisma.review.aggregate({
            _avg: { stars: true },
            where: { attendant: { companyId: targetCompanyId } }
        });

        // Attendants stats
        const attendants = await prisma.attendant.findMany({
            where: { companyId: targetCompanyId },
            include: {
                _count: { select: { reviews: true } }
            }
        });

        console.log(`[DASHBOARD] Stats: ${totalReviews} reviews, ${attendants.length} attendants.`);

        // CHARTS DATA
        // 1. By State (Map)
        const reviewsByState = await prisma.review.groupBy({
            by: ['state'],
            _count: { id: true },
            where: { attendant: { companyId: targetCompanyId }, state: { not: null } }
        });

        // 2. Trend (Last 30 Days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const last30DaysReviews = await prisma.review.findMany({
            where: {
                attendant: { companyId: targetCompanyId },
                createdAt: { gte: thirtyDaysAgo }
            },
            select: { createdAt: true }
        });

        // Group by day in JS
        const reviewsByDate = {};
        last30DaysReviews.forEach(r => {
            const day = r.createdAt.toISOString().split('T')[0];
            reviewsByDate[day] = (reviewsByDate[day] || 0) + 1;
        });

        // Company Details
        const company = await prisma.company.findUnique({
            where: { id: targetCompanyId },
            select: { name: true, plan: true, logo: true }
        });

        res.json({
            companyName: company?.name || "Minha Empresa",
            plan: company?.plan || "GRATIS",
            logo: company?.logo,
            metrics: {
                total: totalReviews,
                average: aggs._avg.stars || 0,
                nps: nps,
                activeAttendants: attendants.length
            },
            reviews,
            attendants,
            reviewsByState,
            reviewsByDate
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar dados.' });
    }
};

// Paginated Reviews (Load More) with Filters
exports.listReviews = async (req, res) => {
    const { companyId } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const search = req.query.search;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const minStars = req.query.minStars ? parseInt(req.query.minStars) : undefined;

    try {
        const where = {
            attendant: { companyId }
        };

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        if (minStars) {
            where.stars = { gte: minStars };
        }

        if (search) {
            where.OR = [
                { attendant: { name: { contains: search, mode: 'insensitive' } } },
                { city: { contains: search, mode: 'insensitive' } },
                { comment: { contains: search, mode: 'insensitive' } }
            ];
        }

        const reviews = await prisma.review.findMany({
            where: where,
            include: { attendant: true },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: skip
        });

        res.json(reviews);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar avaliações.' });
    }
};
