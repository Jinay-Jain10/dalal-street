const axios = require('axios');

const getNewsForStock = async (companyName) => {
  const response = await axios.get('https://newsapi.org/v2/everything', {
    params: {
      q: `${companyName} India stock`,
      language: 'en',
      sortBy: 'publishedAt',
      pageSize: 10,
      apiKey: process.env.NEWS_API_KEY,
    },
  });

  return (response.data.articles || []).map((article) => ({
    title: article.title,
    description: article.description,
    url: article.url,
    source: article.source.name,
    publishedAt: article.publishedAt,
    urlToImage: article.urlToImage,
  }));
};

module.exports = { getNewsForStock };