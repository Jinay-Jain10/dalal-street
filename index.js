require('dotenv').config();

const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
require('./models/index');

const authRoutes = require('./routes/auth');
const stockRoutes = require('./routes/stocks');
const newsRoutes = require('./routes/news');
const portfolioRoutes = require('./routes/portfolio');
const watchlistRoutes = require('./routes/watchlist');
const battleRoutes = require('./routes/battles');


const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/battles', battleRoutes);


app.get('/', (req, res) => {
  res.json({ message: 'Dalal Street API is running' });
});

const PORT = process.env.PORT || 5000;

sequelize.authenticate()
  .then(() => {
    console.log('PostgreSQL connected');
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
  });