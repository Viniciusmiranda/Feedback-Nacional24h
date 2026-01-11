const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getSuggestions = async (req, res) => {
    try {
        const suggestions = await prisma.suggestion.findMany({
            orderBy: { likes: 'desc' }
        });
        res.json(suggestions);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar sugestões' });
    }
};

exports.createSuggestion = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Texto obrigatório' });

        const suggestion = await prisma.suggestion.create({
            data: { text }
        });
        res.json(suggestion);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar sugestão' });
    }
};

exports.voteSuggestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.body; // 'like' or 'dislike'

        if (type === 'like') {
            await prisma.suggestion.update({
                where: { id: parseInt(id) },
                data: { likes: { increment: 1 } }
            });
        } else if (type === 'dislike') {
            await prisma.suggestion.update({
                where: { id: parseInt(id) },
                data: { dislikes: { increment: 1 } }
            });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao computar voto' });
    }
};
