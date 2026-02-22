const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

let stockList = [];

const loadStocks = () => {
  return new Promise((resolve, reject) => {
    if (stockList.length > 0) return resolve(stockList);

    fs.createReadStream(path.join(__dirname, 'nse_stocks.csv'))
      .pipe(csv())
      .on('data', (row) => {
        const series = row[' SERIES']?.trim() || row['SERIES']?.trim();
        const symbol = row['SYMBOL']?.trim();
        const name = row['NAME OF COMPANY']?.trim();

        if (series === 'EQ' && symbol && name) {
          stockList.push({
            symbol: `${symbol}.NS`,
            name,
            exchange: 'NSI',
          });
        }
      })
      .on('end', () => {
        console.log(`Loaded ${stockList.length} NSE stocks`);
        resolve(stockList);
      })
      .on('error', reject);
  });
};

const searchLocalStocks = async (query) => {
  const stocks = await loadStocks();
  const q = query.toLowerCase();
  return stocks
    .filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
    )
    .slice(0, 15);
};

module.exports = { searchLocalStocks };
