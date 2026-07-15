const { NseIndia } = require("stock-nse-india");

const nse = new NseIndia();

(async () => {
    try {
        const data = await nse.getEquityDetails("RELIANCE");
        console.log(data.priceInfo.lastPrice);
    } catch (e) {
        console.log(e.response?.status);
        console.log(e.config?.url);
        console.log(e.message);
    }
})();