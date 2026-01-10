const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Public: Submit Review
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

        console.log(`[DEBUG] Company: ${company.slug}, Notifications (Raw):`, notifications);

        if (typeof notifications === 'string') {
            try {
                notifications = JSON.parse(notifications);
                console.log(`[DEBUG] Notifications (Parsed):`, notifications);
            } catch (e) {
                console.error("[DEBUG] Error parsing notifications JSON:", e);
            }
        }

        const webhookUrl = notifications?.webhookUrl || process.env.N8N_WEBHOOK_URL;
        console.log(`[DEBUG] Webhook URL determined: ${webhookUrl}`);

        if (webhookUrl) {
            console.log(`[DEBUG] Sending payload to N8N...`);
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
            })
                .then(res => {
                    console.log(`[DEBUG] N8N Response Status: ${res.status}`);
                    return res.text().then(txt => console.log(`[DEBUG] N8N Response Body: ${txt}`));
                })
                .catch(err => console.error('[DEBUG] Error sending to N8N:', err));
        } else {
            console.log(`[DEBUG] No Webhook URL configured.`);
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

// Private: Get Dashboard Data
exports.getDashboardData = async (req, res) => {
    const { companyId } = req.user;

    if (!companyId) {
        return res.status(403).json({ error: "Contexto de empresa não encontrado." });
    }

    try {
        const totalReviews = await prisma.review.count({
            where: { attendant: { companyId } }
        });

        const reviews = await prisma.review.findMany({
            where: { attendant: { companyId } },
            include: { attendant: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        // NPS Calculation
        const promoters = await prisma.review.count({ where: { stars: 5, attendant: { companyId } } });
        const detractors = await prisma.review.count({ where: { stars: { lte: 3 }, attendant: { companyId } } });
        const nps = totalReviews > 0 ? Math.round(((promoters - detractors) / totalReviews) * 100) : 0;

        // Average
        const aggs = await prisma.review.aggregate({
            _avg: { stars: true },
            where: { attendant: { companyId } }
        });

        // Attendants stats
        const attendants = await prisma.attendant.findMany({
            where: { companyId },
            include: {
                _count: { select: { reviews: true } }
            }
        });

        // Company Details
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { name: true, plan: true }
        });

        res.json({
            companyName: company?.name || "Minha Empresa",
            plan: company?.plan || "GRATIS",
            metrics: {
                total: totalReviews,
                average: aggs._avg.stars || 0,
                nps: nps,
                activeAttendants: attendants.length
            },
            reviews,
            attendants
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

    // Filters
    const search = req.query.search;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const minStars = req.query.minStars ? parseInt(req.query.minStars) : undefined;

    try {
        const where = {
            attendant: { companyId }
        };

        // Date Range
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        // Min Stars
        if (minStars) {
            where.stars = { gte: minStars };
        }

        // Search (Attendant Name, City, Comment)
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
