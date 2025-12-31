const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Public: Submit Review
exports.submitReview = async (req, res) => {
    const { rating, observation, attendant, ip, city, state, device, link_maps } = req.body;

    // We accept "attendant" as a Name String from the frontend (url param)
    // We need to find or create a dummy Attendant for that name if not exists, 
    // OR we should have a real ID. 
    // For this implementation, let's assume we find by name.

    try {
        let attendantRecord = await prisma.attendant.findFirst({
            where: { name: attendant }
        });

        // If not found, and we want to allow dynamic creation (or fallback to General)
        if (!attendantRecord) {
            // Check if "Geral" exists
            attendantRecord = await prisma.attendant.findFirst({ where: { name: 'Geral' } });

            if (!attendantRecord) {
                // Create Default Company if needed
                let company = await prisma.company.findFirst();
                if (!company) {
                    company = await prisma.company.create({ data: { name: "Nacional Assistência" } });
                }

                // Create "Geral" or the specific name
                attendantRecord = await prisma.attendant.create({
                    data: {
                        name: attendant || "Geral",
                        companyId: company.id
                    }
                });
            }
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

        // Send to N8N Webhook (Fire and Forget)
        if (process.env.N8N_WEBHOOK_URL) {
            fetch(process.env.N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: review.id,
                    stars: review.stars,
                    comment: review.comment,
                    attendant: attendantRecord.name,
                    client_ip: ip,
                    client_city: city,
                    client_state: state,
                    client_device: device,
                    location_url: link_maps,
                    created_at: review.createdAt
                })
            }).catch(err => console.error('Error sending to N8N:', err));
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

    try {
        // Here we would filter by Company ID from req.user
        // For now, get all
        const totalReviews = await prisma.review.count();
        const reviews = await prisma.review.findMany({
            include: { attendant: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        const aggs = await prisma.review.aggregate({
            _avg: { stars: true }
        });

        const attendants = await prisma.attendant.findMany({
            include: {
                _count: { select: { reviews: true } }
            }
        });

        // Calculate NPS (Promoters 9-10 (we use 5stars), Detractors 0-6 (1-3 stars))
        // Simplified: 5=Promoter, 4=Passive, 1-3=Detractor
        const promoters = await prisma.review.count({ where: { stars: 5 } });
        const detractors = await prisma.review.count({ where: { stars: { lte: 3 } } });
        const nps = totalReviews > 0 ? Math.round(((promoters - detractors) / totalReviews) * 100) : 0;

        res.json({
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
