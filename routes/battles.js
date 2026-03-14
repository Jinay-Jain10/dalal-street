const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const {
  createBattle, joinBattle, getBattles, getBattle,
  startBattle, getLeaderboard, buyStock, sellStock, getBattlePortfolio,deleteBattle
} = require('../controllers/battleController');

router.use(authMiddleware);

router.post('/create', createBattle);
router.post('/join', joinBattle);
router.get('/', getBattles);
router.get('/:id', getBattle);
router.post('/:id/start', startBattle);
router.get('/:id/leaderboard', getLeaderboard);
router.post('/:id/buy', buyStock);
router.post('/:id/sell', sellStock);
router.get('/:id/portfolio', getBattlePortfolio);
router.delete('/:id', deleteBattle);

module.exports = router;