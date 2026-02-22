const { getNewsForStock } = require('../services/newsService');
const { analyzeSentimentBatch } = require('../services/sentimentService');

const getNews = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ message: 'Company name is required as ?name= query param' });

    const articles = await getNewsForStock(name);
    const articlesWithSentiment = await analyzeSentimentBatch(articles);

    res.json({ articles: articlesWithSentiment });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to fetch news' });
  }
};

module.exports = { getNews };