const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const auth = require('../middlewares/authMiddleware');

// Public
router.post('/', reviewController.submitReview);
router.put('/:id', reviewController.updateReview); // Public update for flow


// Private
router.get('/dashboard', auth, reviewController.getDashboardData);

module.exports = router;
