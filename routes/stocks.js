const express = require('express');
const router = express.Router();
const { search, getQuote, getHistory } = require('../controllers/stockController');

router.get('/search', search);
router.get('/:symbol/history', getHistory);
router.get('/:symbol', getQuote);

module.exports = router;