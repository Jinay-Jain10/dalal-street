const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const analyzeSentimentBatch = async (articles) => {
  try {
    const numbered = articles
      .map((a, i) => `${i + 1}. "${a.title}. ${a.description || ''}"`)
      .join('\n');

    const prompt = `You are a financial news sentiment analyzer for Indian stocks.
Analyze the sentiment of each headline below and respond with exactly one word per line: POSITIVE, NEGATIVE, or NEUTRAL.
Do not include numbers, punctuation, or any other text — just one word per line in the same order.

${numbered}`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    });

    const lines = response.choices[0].message.content.trim().split('\n');

    return articles.map((article, i) => {
      const sentiment = lines[i]?.trim().toUpperCase();
      return {
        ...article,
        sentiment: ['POSITIVE', 'NEGATIVE', 'NEUTRAL'].includes(sentiment)
          ? sentiment
          : 'NEUTRAL',
      };
    });
  } catch (err) {
    console.error('Batch sentiment analysis failed:', err.message);
    return articles.map((article) => ({ ...article, sentiment: 'NEUTRAL' }));
  }
};

module.exports = { analyzeSentimentBatch };