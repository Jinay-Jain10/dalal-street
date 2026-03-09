const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
});
const { searchLocalStocks } = require('../data/stockList');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async (fn, retries = 3, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(delay);
    }
  }
};

const searchStocks = async (query) => {
  return await searchLocalStocks(query);
};

const getStockQuote = async (symbol) => {
  const [result, summary] = await Promise.all([
    withRetry(() => yahooFinance.quote(symbol)),
    withRetry(() => yahooFinance.quoteSummary(symbol, {
      modules: ['defaultKeyStatistics', 'summaryDetail', 'assetProfile'],
    })).catch(() => null),
  ]);

  if (!result) throw new Error('Stock not found');

  const stats = summary?.defaultKeyStatistics || {};
  const detail = summary?.summaryDetail || {};
  const profile = summary?.assetProfile || {};

  return {
    symbol: result.symbol,
    name: result.longName || result.shortName,
    price: result.regularMarketPrice,
    change: result.regularMarketChange,
    changePercent: result.regularMarketChangePercent,
    open: result.regularMarketOpen,
    high: result.regularMarketDayHigh,
    low: result.regularMarketDayLow,
    previousClose: result.regularMarketPreviousClose,
    volume: result.regularMarketVolume,
    avgVolume: result.averageDailyVolume3Month,
    marketCap: result.marketCap,
    fiftyTwoWeekHigh: result.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: result.fiftyTwoWeekLow,
    pe: result.trailingPE,
    eps: stats.trailingEps,
    beta: stats.beta,
    priceToBook: stats.priceToBook,
    dividendYield: detail.dividendYield,
    dividendRate: detail.dividendRate,
    faceValue: null,
    sector: profile.sector,
    industry: profile.industry,
    website: profile.website,
  };
};

const getHistoricalData = async (symbol, range) => {
  const periodMap = {
    '1W': { period1: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), interval: '1d' },
    '1M': { period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), interval: '1d' },
    '3M': { period1: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), interval: '1d' },
    '1Y': { period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), interval: '1wk' },
    '5Y': { period1: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000), interval: '1mo' },
  };

  const { period1, interval } = periodMap[range] || periodMap['1M'];

  const results = await withRetry(() => yahooFinance.chart(symbol, { period1, interval }));

  return (results.quotes || [])
    .filter((q) => q.close !== null)
    .map((q) => ({
      date: q.date.toISOString().split('T')[0],
      close: q.close,
      open: q.open,
      high: q.high,
      low: q.low,
      volume: q.volume,
    }));
};

module.exports = { searchStocks, getStockQuote, getHistoricalData };