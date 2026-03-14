const { NseIndia } = require('stock-nse-india');
const nse = new NseIndia();

async function test() {
  try {
    // Test full equity details structure
    const details = await nse.getEquityDetails('RELIANCE');
    console.log('Full priceInfo:', JSON.stringify(details.priceInfo, null, 2));
    console.log('industryInfo:', JSON.stringify(details.industryInfo, null, 2));
    console.log('metadata:', JSON.stringify(details.metadata, null, 2));
    console.log('securityInfo:', JSON.stringify(details.securityInfo, null, 2));
    const data = await nse.getEquityDetails('RELIANCE');
console.log('marketDeptOrderBook:', JSON.stringify(data.marketDeptOrderBook, null, 2));
console.log('securityInfo:', JSON.stringify(data.securityInfo, null, 2));
console.log('metadata keys:', Object.keys(data.metadata));
    // Test historical data raw response
    // console.log('\nTesting historical...');
    // const history = await nse.getEquityHistoricalData('RELIANCE', {
    //   start: '2025-01-01',
    //   end: '2026-03-13'
    // });
    // console.log('History raw:', JSON.stringify(history, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err);
  }
}

test();