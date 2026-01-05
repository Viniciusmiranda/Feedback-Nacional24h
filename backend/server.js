const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const path = require('path'); // Moved to top
const fs = require('fs'); // Added fs
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

// Ensure Uploads Directory Exists
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve Frontend Static Files
// Docker Volume Mounts ./frontend to /frontend
const frontendPath = '/frontend';
app.use(express.static(frontendPath, { index: false }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/avaliacoes', reviewRoutes);
app.use('/api/atendentes', attendantRoutes);
const companyRoutes = require('./src/routes/companyRoutes');
app.use('/api/company', companyRoutes);

// Serve Uploads
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Landing / Login / Register
app.get('/', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
app.get('/cadastro', (req, res) => res.sendFile(path.join(frontendPath, 'register.html')));

// Dynamic Routes (Must come after API routes)
// 1. Dashboard: /:companySlug/dashboard
app.get('/:slug/dashboard', (req, res) => {
    res.sendFile(path.join(frontendPath, 'dashboard.html'));
});

// 2. Evaluation: /:companySlug/:attendantName
app.get('/:slug/:attendant', (req, res) => {
    res.sendFile(path.join(frontendPath, 'ex-atd.html'));
});

// 3. Fallback for /:companySlug -> Redirect to login or dashboard
app.get('/:slug', (req, res) => {
    // Could check if slug exists, but for now serve login
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Seed Initial Admin (If empty)
// Seed/Update Admin
async function seedHelper() {
    try {
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash("nacional_2026", 10);

        await prisma.user.upsert({
            where: { email: "admin@nacional.com" },
            update: { password: hash },
            create: {
                name: "Gestor Admin",
                email: "admin@nacional.com",
                password: hash,
                role: "admin"
            }
        });
        console.log("Admin ensured: admin@nacional.com / nacional_2026");
    } catch (error) {
        console.error("Error seeding admin:", error);
    }
}
seedHelper();

// Start
app.listen(PORT, '0.0.0.0', () => { // Adicione '0.0.0.0' aqui
    console.log(`Server running on port ${PORT} `);
});
