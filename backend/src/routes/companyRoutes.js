const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { verifyToken } = require('../utils/auth');
const multer = require('multer');
const path = require('path');

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Routes
router.get('/settings', verifyToken, companyController.getSettings);
router.put('/settings', verifyToken, upload.single('logo'), companyController.updateSettings);

// User Management
router.get('/users', verifyToken, companyController.getUsers);
router.post('/users', verifyToken, companyController.inviteUser);
router.put('/users/:id/password', verifyToken, companyController.updateUserPassword);

// Public route for evaluation page
router.get('/public/:slug', companyController.getPublicSettings);

module.exports = router;
