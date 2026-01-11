const express = require('express');
const router = express.Router();
const suggestionController = require('../controllers/suggestionController');
const { verifyToken } = require('../utils/auth');

router.get('/', suggestionController.getSuggestions);
router.post('/', verifyToken, suggestionController.createSuggestion);
router.post('/:id/vote', verifyToken, suggestionController.voteSuggestion);

module.exports = router;
