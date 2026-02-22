const { Op } = require('sequelize');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { getStockQuote } = require('../services/stockService');

// Helper: get current holdings from transactions
const getHoldings = async (userId) => {
  const transactions = await Transaction.findAll({ where: { user_id: userId } });

  const holdingsMap = {};
  transactions.forEach((t) => {
    const symbol = t.symbol;
    if (!holdingsMap[symbol]) {
      holdingsMap[symbol] = {
        symbol,
        company_name: t.company_name,
        quantity: 0,
        total_invested: 0,
      };
    }
    if (t.type === 'BUY') {
      holdingsMap[symbol].quantity += t.quantity;
      holdingsMap[symbol].total_invested += parseFloat(t.total_value);
    } else {
      holdingsMap[symbol].quantity -= t.quantity;
      holdingsMap[symbol].total_invested -= parseFloat(t.total_value);
    }
  });

  // Filter out stocks with 0 quantity (fully sold)
  return Object.values(holdingsMap).filter((h) => h.quantity > 0);
};

// GET /api/portfolio
const getPortfolio = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'virtual_balance'],
    });

    const holdings = await getHoldings(req.user.id);

    // Fetch live prices for all holdings in parallel
    const holdingsWithPrices = await Promise.all(
      holdings.map(async (h) => {
        try {
          const quote = await getStockQuote(h.symbol);
          const currentValue = quote.price * h.quantity;
          const avgBuyPrice = h.total_invested / h.quantity;
          const pnl = currentValue - h.total_invested;
          const pnlPercent = (pnl / h.total_invested) * 100;

          return {
            symbol: h.symbol,
            company_name: h.company_name,
            quantity: h.quantity,
            avg_buy_price: avgBuyPrice.toFixed(2),
            current_price: quote.price,
            current_value: currentValue.toFixed(2),
            pnl: pnl.toFixed(2),
            pnl_percent: pnlPercent.toFixed(2),
          };
        } catch {
          return { ...h, error: 'Could not fetch live price' };
        }
      })
    );

    const totalInvested = holdingsWithPrices.reduce(
      (sum, h) => sum + (parseFloat(h.avg_buy_price) * h.quantity), 0
    );
    const totalCurrentValue = holdingsWithPrices.reduce(
      (sum, h) => sum + parseFloat(h.current_value || 0), 0
    );
    const totalPnl = totalCurrentValue - totalInvested;

    res.json({
      user,
      holdings: holdingsWithPrices,
      summary: {
        total_invested: totalInvested.toFixed(2),
        total_current_value: totalCurrentValue.toFixed(2),
        total_pnl: totalPnl.toFixed(2),
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to fetch portfolio' });
  }
};

// POST /api/portfolio/buy
const buyStock = async (req, res) => {
  try {
    const { symbol, company_name, quantity } = req.body;

    if (!symbol || !company_name || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'symbol, company_name and quantity are required' });
    }

    const user = await User.findByPk(req.user.id);
    const quote = await getStockQuote(symbol);
    const total_value = quote.price * quantity;

    if (parseFloat(user.virtual_balance) < total_value) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Deduct balance
    await user.update({
      virtual_balance: parseFloat(user.virtual_balance) - total_value,
    });

    // Record transaction
    const transaction = await Transaction.create({
      user_id: req.user.id,
      symbol,
      company_name,
      type: 'BUY',
      quantity,
      price_at_transaction: quote.price,
      total_value,
    });

    res.status(201).json({
      message: `Successfully bought ${quantity} shares of ${symbol} at ₹${quote.price}`,
      transaction,
      new_balance: user.virtual_balance,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to buy stock' });
  }
};

// POST /api/portfolio/sell
const sellStock = async (req, res) => {
  try {
    const { symbol, quantity } = req.body;

    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'symbol and quantity are required' });
    }

    // Check if user has enough shares
    const holdings = await getHoldings(req.user.id);
    const holding = holdings.find((h) => h.symbol === symbol);

    if (!holding || holding.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient shares to sell' });
    }

    const user = await User.findByPk(req.user.id);
    const quote = await getStockQuote(symbol);
    const total_value = quote.price * quantity;

    // Add balance back
    await user.update({
      virtual_balance: parseFloat(user.virtual_balance) + total_value,
    });

    // Record transaction
    const transaction = await Transaction.create({
      user_id: req.user.id,
      symbol,
      company_name: holding.company_name,
      type: 'SELL',
      quantity,
      price_at_transaction: quote.price,
      total_value,
    });

    res.json({
      message: `Successfully sold ${quantity} shares of ${symbol} at ₹${quote.price}`,
      transaction,
      new_balance: parseFloat(user.virtual_balance).toFixed(2),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to sell stock' });
  }
};

// GET /api/portfolio/transactions
const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json({ transactions });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
};

module.exports = { getPortfolio, buyStock, sellStock, getTransactions };