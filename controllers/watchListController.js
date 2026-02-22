const Watchlist = require('../models/Watchlist');

const getWatchlist = async (req, res) => {
  try {
    const watchlist = await Watchlist.findAll({ where: { user_id: req.user.id }, order: [['createdAt', 'DESC']] });
    res.json({ watchlist });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch watchlist' });
  }
};

const addToWatchlist = async (req, res) => {
  try {
    const { symbol, company_name } = req.body;
    if (!symbol || !company_name) return res.status(400).json({ message: 'symbol and company_name are required' });

    const existing = await Watchlist.findOne({ where: { user_id: req.user.id, symbol } });
    if (existing) return res.status(400).json({ message: 'Stock already in watchlist' });

    const item = await Watchlist.create({ user_id: req.user.id, symbol, company_name });
    res.status(201).json({ item });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add to watchlist' });
  }
};

const removeFromWatchlist = async (req, res) => {
  try {
    const { symbol } = req.params;
    await Watchlist.destroy({ where: { user_id: req.user.id, symbol } });
    res.json({ message: 'Removed from watchlist' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove from watchlist' });
  }
};

module.exports = { getWatchlist, addToWatchlist, removeFromWatchlist };