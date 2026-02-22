const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const {
  getPortfolio,
  buyStock,
  sellStock,
  getTransactions,
} = require('../controllers/portfolioController');

router.use(authMiddleware); // All portfolio routes require auth

router.get('/', getPortfolio);
router.post('/buy', buyStock);
router.post('/sell', sellStock);
router.get('/transactions', getTransactions);

module.exports = router;