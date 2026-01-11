const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');

// Middleware to ensure SAAS_ADMIN role
const verifyAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'SAAS_ADMIN') {
        next();
    } else {
        res.status(403).json({ error: 'Acesso negado. Apenas Super Admin.' });
    }
};

// Apply Auth & Admin Check globally to this router
router.use(authMiddleware);
router.use(verifyAdmin);

router.get('/dashboard', adminController.getDashboardMetrics);
router.get('/companies', adminController.listCompanies);
router.put('/companies/:id', adminController.updateCompany);

module.exports = router;
