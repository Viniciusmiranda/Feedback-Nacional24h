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

// Request Logger
// Request Logger
app.use((req, res, next) => {
    const logLine = `[${new Date().toISOString()}] ${req.method} ${req.url}\n`;
    console.log(logLine.trim());
    try { fs.appendFileSync(path.join(__dirname, 'server_requests.log'), logLine); } catch (e) { }
    next();
});

// Ensure Uploads Directory Exists
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve Frontend Static Files
// Robust Path Detection
let frontendPath = null;
const possiblePaths = [
    '/frontend', // Docker absolute volume
    path.join(__dirname, '../frontend'), // Relative development
    path.join(process.cwd(), 'frontend') // CWD fallback
];

for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
        frontendPath = p;
        break;
    }
}

if (!frontendPath) {
    console.error("CRITICAL: Frontend folder not found in any expected location:", possiblePaths);
    // Fallback to avoid crash, but will likely 404
    frontendPath = path.join(__dirname, '../frontend');
} else {
    console.log(`Frontend served from: ${frontendPath}`);
}

app.use(express.static(frontendPath, { index: false }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/avaliacoes', reviewRoutes);
app.use('/api/atendentes', attendantRoutes);
const companyRoutes = require('./src/routes/companyRoutes');
app.use('/api/company', companyRoutes);
const suggestionRoutes = require('./src/routes/suggestionRoutes');
app.use('/api/suggestions', suggestionRoutes);
const adminRoutes = require('./src/routes/adminRoutes');
app.use('/api/admin', adminRoutes);

// Serve Uploads
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Landing / Login / Register
app.get('/', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
app.get('/cadastro', (req, res) => res.sendFile(path.join(frontendPath, 'register.html')));

// Dynamic Routes (Must come after API routes)
// Health Check (Move up)
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Dynamic Routes (Must come after API routes)
// 1. Dashboard: /:companySlug/dashboard
app.get('/:slug/dashboard', (req, res) => {
    res.sendFile(path.join(frontendPath, 'dashboard.html'));
});

// 2. Evaluation: /:companySlug/:attendantName
app.get('/:slug/:attendant', async (req, res) => {
    try {
        const { slug, attendant: attendantSlug } = req.params;
        const filePath = path.join(frontendPath, 'ex-atd.html');
        let html = fs.readFileSync(filePath, 'utf8');

        // 1. Fetch Company & Attendant
        const company = await prisma.company.findUnique({
            where: { slug: slug },
            select: { name: true, logo: true }
        });

        // Try to find attendant (slug can be ID or slugified name, but usually we just need the name for the title)
        // For now, let's treat the :attendant param as the display name (decoded)
        const attendantName = decodeURIComponent(attendantSlug);

        // 2. Prepare Metadata
        const companyName = company ? company.name : 'Avalia Já';
        const ogTitle = `Avalie o atendimento de ${attendantName}!`;
        const ogDescription = `Sua opinião é fundamental para a ${companyName}. Deixe seu feedback agora.`;

        // 3. Image Logic (Company Logo or Professional Default)
        let ogImage = "https://app.avaliaja.app.br/logo.png"; // Official App Logo
        if (company && company.logo) {
            ogImage = `https://app.avaliaja.app.br${company.logo}`;
        }

        // 4. Perform Replacements
        html = html.replace('__OG_TITLE__', ogTitle);
        html = html.replace('__OG_DESCRIPTION__', ogDescription);
        html = html.replace('__OG_IMAGE__', ogImage);

        res.send(html);
    } catch (err) {
        console.error("Error serving ex-atd.html:", err);
        res.sendFile(path.join(frontendPath, 'ex-atd.html'));
    }
});

// 3. Fallback for /:companySlug -> Redirect to login or dashboard
app.get('/:slug', (req, res) => {
    // Could check if slug exists, but for now serve login
    res.sendFile(path.join(frontendPath, 'index.html'));
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

// Global 404 Handler (JSON fallback to prevent HTML errors in API)
app.use((req, res, next) => {
    if (req.accepts('json') || req.path.startsWith('/api/')) {
        res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
    } else {
        next();
    }
});

// Start
app.listen(PORT, '0.0.0.0', () => { // Adicione '0.0.0.0' aqui
    console.log(`Server running on port ${PORT} `);
});
