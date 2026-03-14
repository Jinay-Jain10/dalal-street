const { NseIndia } = require('stock-nse-india');
const { searchLocalStocks } = require('../data/stockList');

const nse = new NseIndia();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(delay);
    }
  }
};

// Strip .NS or .BO suffix — NSE India uses plain symbols like RELIANCE not RELIANCE.NS
const cleanSymbol = (symbol) => symbol.replace(/\.(NS|BO)$/i, '');

const searchStocks = async (query) => {
  return await searchLocalStocks(query);
};

const getStockQuote = async (symbol) => {
  const clean = cleanSymbol(symbol);

  const data = await withRetry(() => nse.getEquityDetails(clean));

  const price = data.priceInfo;
  const industry = data.industryInfo || {};
  const security = data.securityInfo || {};
  const metadata = data.metadata || {};
  const info = data.info || {};

  // Calculate market cap from issued shares × current price
  const marketCap = security.issuedSize && price.lastPrice
    ? security.issuedSize * price.lastPrice
    : null;

  // Volume from marketDeptOrderBook when market is open, otherwise null
  const volume = data.marketDeptOrderBook?.tradeInfo?.totalTradedVolume || null;

  return {
    symbol: clean + '.NS',
    name: info.companyName || clean,
    price: price.lastPrice,
    change: price.change,
    changePercent: price.pChange,
    open: price.open,
    high: price.intraDayHighLow?.max,
    low: price.intraDayHighLow?.min,
    previousClose: price.previousClose,
    volume,
    avgVolume: null,
    marketCap,
    fiftyTwoWeekHigh: price.weekHighLow?.max,
    fiftyTwoWeekLow: price.weekHighLow?.min,
    pe: metadata.pdSymbolPe || null,
    eps: null,
    beta: null,
    priceToBook: null,
    dividendYield: null,
    dividendRate: null,
  vwap: price.vwap || null,
  listingDate: metadata.listingDate || null,
  basicIndustry: industry.basicIndustry || null,
  sector: industry.sector || null,
  industry: industry.industry || null,
  website: null,
  };
};

const getHistoricalData = async (symbol, range) => {
  const clean = cleanSymbol(symbol);

  const now = new Date();
  const startMap = {
    '1W': new Date(now - 7 * 24 * 60 * 60 * 1000),
    '1M': new Date(now - 30 * 24 * 60 * 60 * 1000),
    '3M': new Date(now - 90 * 24 * 60 * 60 * 1000),
    '1Y': new Date(now - 365 * 24 * 60 * 60 * 1000),
    '5Y': new Date(now - 5 * 365 * 24 * 60 * 60 * 1000),
  };

  const start = startMap[range] || startMap['1M'];

  const formatDate = (d) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  };

  const data = await withRetry(() =>
    nse.getEquityHistoricalData(clean, {
      start: formatDate(start),
      end: formatDate(now),
    })
  );

  // Response is an array of chunks, each with a .data array — flatten them
  const allRecords = Array.isArray(data)
    ? data.flatMap((chunk) => chunk.data || [])
    : (data?.data || []);

  // Sort by date ascending
  const sorted = allRecords.sort((a, b) => {
    return new Date(a.mtimestamp) - new Date(b.mtimestamp);
  });

  // For longer ranges, reduce data points to avoid overcrowding the chart
  let result = sorted;
  if (range === '1Y' && sorted.length > 52) {
    // Keep every ~5th record for 1Y
    result = sorted.filter((_, i) => i % 5 === 0);
  } else if (range === '5Y' && sorted.length > 60) {
    // Keep every ~20th record for 5Y
    result = sorted.filter((_, i) => i % 20 === 0);
  }

  return result.map((q) => ({
    date: q.mtimestamp,
    close: q.chClosingPrice,
    open: q.chOpeningPrice,
    high: q.chTradeHighPrice,
    low: q.chTradeLowPrice,
    volume: q.chTotTradedQty,
  }));
};

module.exports = { searchStocks, getStockQuote, getHistoricalData };