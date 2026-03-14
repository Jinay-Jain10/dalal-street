const { searchStocks, getStockQuote, getHistoricalData } = require('../services/stockService');

// Market overview cache
let marketOverviewCache = null;
let marketOverviewCacheTime = null;
const MARKET_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

const getMarketOverview = async (req, res) => {
  try {
    // Return cached data if still fresh
    if (marketOverviewCache && Date.now() - marketOverviewCacheTime < MARKET_CACHE_TTL) {
      return res.json(marketOverviewCache);
    }

    const { NseIndia } = require('stock-nse-india');
    const nse = new NseIndia();

    const [nifty50, niftyBank] = await Promise.all([
      nse.getEquityStockIndices('NIFTY 50'),
      nse.getEquityStockIndices('NIFTY BANK'),
    ]);

    const formatIndex = (data) => ({
      name: data.metadata.indexName,
      last: data.metadata.last,
      change: data.metadata.change,
      pChange: data.metadata.percChange,
      high: data.metadata.high,
      low: data.metadata.low,
    });

    const stocks = nifty50.data.filter((s) => s.symbol !== 'NIFTY 50');
    const sorted = [...stocks].sort((a, b) => b.pChange - a.pChange);
    const gainers = sorted.slice(0, 5).map((s) => ({
      symbol: s.symbol,
      name: s.meta?.companyName || s.symbol,
      price: s.lastPrice,
      change: s.change,
      pChange: s.pChange,
    }));
    const losers = sorted.slice(-5).reverse().map((s) => ({
      symbol: s.symbol,
      name: s.meta?.companyName || s.symbol,
      price: s.lastPrice,
      change: s.change,
      pChange: s.pChange,
    }));

    const result = {
      indices: [formatIndex(nifty50), formatIndex(niftyBank)],
      gainers,
      losers,
      fetchedAt: new Date().toLocaleTimeString('en-IN'),
    };

    // Cache the result
    marketOverviewCache = result;
    marketOverviewCacheTime = Date.now();

    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to fetch market overview' });
  }
};

module.exports = { search, getQuote, getHistory, getMarketOverview };