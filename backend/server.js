const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('./src/routes/authRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const attendantRoutes = require('./src/routes/attendantRoutes');

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve Frontend Static Files
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/avaliacoes', reviewRoutes);
app.use('/api/atendentes', attendantRoutes);

// Root Route (Serve index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Seed Initial Admin (If empty)
async function seedHelper() {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
        console.log("Seeding initial admin...");
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash("123456", 10);
        await prisma.user.create({
            data: {
                name: "Gestor Admin",
                email: "admin@nacional.com",
                password: hash,
                role: "admin"
            }
        });
        console.log("Admin created: admin@nacional.com / 123456");
    }
}
seedHelper();

// Start
app.listen(PORT, '0.0.0.0', () => { // Adicione '0.0.0.0' aqui
    console.log(`Server running on port ${PORT}`);
});
