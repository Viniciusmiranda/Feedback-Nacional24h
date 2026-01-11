const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const bcrypt = require('bcryptjs');

// Get Settings (Logo, Color, etc)
exports.getSettings = async (req, res) => {
    try {
        const { companyId } = req.user;
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: {
                logo: true,
                primaryColor: true,
                settings: true,
                notifications: true,
                slug: true,
                name: true,
                area: true,
                whatsapp: true,
                plan: true
            }
        });

        if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

        res.json(company);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
};

// Update Settings
exports.updateSettings = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { primaryColor, settings, notifications, name, area, whatsapp } = req.body;
        // File from multer
        const logoFile = req.file;

        const updateData = {};
        if (primaryColor) updateData.primaryColor = primaryColor;
        if (name) updateData.name = name;
        if (area) updateData.area = area;
        if (whatsapp) updateData.whatsapp = whatsapp;

        // Handle JSON fields (FormData sends as strings)
        if (settings) updateData.settings = typeof settings === 'string' ? JSON.parse(settings) : settings;
        if (notifications) updateData.notifications = typeof notifications === 'string' ? JSON.parse(notifications) : notifications;

        if (logoFile) {
            // Save relative path
            updateData.logo = `/uploads/${logoFile.filename}`;
        }

        const company = await prisma.company.update({
            where: { id: companyId },
            data: updateData
        });

        res.json({ message: 'Configurações atualizadas!', company });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
};

// Public Settings (For Evaluation Page - No Auth)
exports.getPublicSettings = async (req, res) => {
    try {
        const { slug } = req.params;
        const company = await prisma.company.findUnique({
            where: { slug: slug },
            select: { logo: true, primaryColor: true, settings: true, name: true }
        });

        if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

        res.json(company);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar dados públicos' });
    }
};

// --- USER MANAGEMENT ---

// List Users
exports.getUsers = async (req, res) => {
    try {
        const { companyId } = req.user;
        const users = await prisma.user.findMany({
            where: { companyId },
            select: { id: true, name: true, email: true, role: true, active: true }
        });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
};

// Invite/Create User
exports.inviteUser = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { name, email, password, role } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
        }

        // Check if user exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'E-mail já cadastrado.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'gestor',
                companyId
            }
        });

        res.json({ message: 'Usuário criado com sucesso!', user: { id: newUser.id, name: newUser.name, email: newUser.email } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
};

exports.updateUserPassword = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres.' });
        }

        const user = await prisma.user.findFirst({ where: { id: id, companyId: companyId } });
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { id: id },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Senha atualizada com sucesso.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao atualizar senha.' });
    }
};
