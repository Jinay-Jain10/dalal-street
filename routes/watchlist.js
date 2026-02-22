const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const { getWatchlist, addToWatchlist, removeFromWatchlist } = require('../controllers/watchListController');

router.use(authMiddleware);
router.get('/', getWatchlist);
router.post('/', addToWatchlist);
router.delete('/:symbol', removeFromWatchlist);

module.exports = router;