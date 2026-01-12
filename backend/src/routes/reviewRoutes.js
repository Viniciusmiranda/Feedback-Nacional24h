const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const auth = require('../middlewares/authMiddleware');

// Public
router.post('/', reviewController.submitReview);
router.put('/:id', reviewController.updateReview); // Public update for flow
router.delete('/:id', auth, reviewController.deleteReview);


// Private
router.get('/dashboard', auth, reviewController.getDashboardData);
router.get('/list', auth, reviewController.listReviews);

module.exports = router;
