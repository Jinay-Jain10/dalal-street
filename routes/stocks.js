const express = require('express');
const router = express.Router();
const { search, getQuote, getHistory, getMarketOverview } = require('../controllers/stockController');

router.get('/market/overview', getMarketOverview);
router.get('/search', search);
router.get('/:symbol/history', getHistory);
router.get('/:symbol', getQuote);

module.exports = router;