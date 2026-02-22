const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

// Search for Indian stocks
const searchStocks = async (query) => {
    const results = await yahooFinance.search(query, { region: 'IN', lang: 'en-IN' });
  
    return (results.quotes || [])
      .filter((q) => {
        if (!q.symbol) return false;
        return (
          q.exchange === 'NSI' ||
          q.exchange === 'BSE' ||
          q.symbol.endsWith('.NS') ||
          q.symbol.endsWith('.BO')
        );
      })
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchange,
      }));
  };
  
// Get live quote
const getStockQuote = async (symbol) => {
  const result = await yahooFinance.quote(symbol);
  if (!result) throw new Error('Stock not found');

  return {
    symbol: result.symbol,
    name: result.longName || result.shortName,
    price: result.regularMarketPrice,
    change: result.regularMarketChange,
    changePercent: result.regularMarketChangePercent,
    open: result.regularMarketOpen,
    high: result.regularMarketDayHigh,
    low: result.regularMarketDayLow,
    volume: result.regularMarketVolume,
    marketCap: result.marketCap,
    fiftyTwoWeekHigh: result.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: result.fiftyTwoWeekLow,
    pe: result.trailingPE,
  };
};

// Get historical data
const getHistoricalData = async (symbol, range) => {
  const periodMap = {
    '1W': { period1: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), interval: '1d' },
    '1M': { period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), interval: '1d' },
    '3M': { period1: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), interval: '1d' },
    '1Y': { period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), interval: '1wk' },
  };

  const { period1, interval } = periodMap[range] || periodMap['1M'];

  const results = await yahooFinance.chart(symbol, {
    period1,
    interval,
  });

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
