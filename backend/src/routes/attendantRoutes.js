const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middlewares/authMiddleware');
const prisma = new PrismaClient();

// Create Attendant (Private)
router.post('/', auth, async (req, res) => {
    const { name } = req.body;
    try {
        // Find user's company or default
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        let companyId = user.companyId;

        if (!companyId) {
            // Fallback for this demo if user has no company
            let company = await prisma.company.findFirst();
            if (!company) {
                company = await prisma.company.create({
                    data: { name: "Nacional Assistência", domain: "nacional.com.br" }
                });
            }
            companyId = company.id;

            // Auto-link user to this company for future consistency
            await prisma.user.update({
                where: { id: user.id },
                data: { companyId: company.id }
            });
        }

        const newAttendant = await prisma.attendant.create({
            data: { name, companyId }
        });

        res.json(newAttendant);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao criar atendente.' });
    }
});

// Get All
router.get('/', auth, async (req, res) => {
    try {
        const list = await prisma.attendant.findMany();
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: 'Erro.' });
    }
});

// Delete (Private)
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        // Optional: cascaded delete of reviews? Or keep them? 
        // Usually safer to keep reviews or soft delete. For this demo, we delete.
        // Prisma default might prevent if relations exist. We should delete reviews first.
        await prisma.review.deleteMany({ where: { attendantId: id } });
        await prisma.attendant.delete({ where: { id: id } });
        res.json({ message: 'Deletado com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao deletar.' });
    }
});

module.exports = router;
