const { searchStocks, getStockQuote, getHistoricalData } = require('../services/stockService');

// GET /api/stocks/search?q=reliance
const search = async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.status(400).json({ message: 'Query is required' });
  
      const results = await searchStocks(q);
      res.json({ results });
    } catch (err) {
      console.error(err.response?.data || err.message);
      res.status(500).json({ message: err.response?.data || err.message });
    }
  };

// GET /api/stocks/:symbol
const getQuote = async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await getStockQuote(symbol);
      res.json({ data });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to fetch stock data' });
  }
};

// GET /api/stocks/:symbol/history?range=1M
const getHistory = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { range } = req.query;
    const data = await getHistoricalData(symbol, range || '1M');
    res.json({ data });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to fetch historical data' });
  }
};


module.exports = { search, getQuote, getHistory };