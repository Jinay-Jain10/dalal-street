const { Op } = require('sequelize');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const GroupTransaction = require('../models/GroupTransaction');
const User = require('../models/User');
const { getStockQuote } = require('../services/stockService');

// Helper: generate unique invite code
const generateCode = async () => {
  let code, exists;
  do {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
    exists = await Group.findOne({ where: { invite_code: code } });
  } while (exists);
  return code;
};

// Helper: get holdings for a user in a specific group
const getBattleHoldings = async (groupId, userId) => {
  const transactions = await GroupTransaction.findAll({
    where: { group_id: groupId, user_id: userId },
  });

  const holdingsMap = {};
  transactions.forEach((t) => {
    if (!holdingsMap[t.symbol]) {
      holdingsMap[t.symbol] = {
        symbol: t.symbol,
        company_name: t.company_name,
        quantity: 0,
        total_invested: 0,
      };
    }
    if (t.type === 'BUY') {
      holdingsMap[t.symbol].quantity += t.quantity;
      holdingsMap[t.symbol].total_invested += parseFloat(t.total_value);
    } else {
      holdingsMap[t.symbol].quantity -= t.quantity;
      holdingsMap[t.symbol].total_invested -= parseFloat(t.total_value);
    }
  });

  return Object.values(holdingsMap).filter((h) => h.quantity > 0);
};

// Helper: check and auto-end battle
const checkAndEndBattle = async (group) => {
  if (group.status === 'active' && new Date() > new Date(group.ends_at)) {
    await group.update({ status: 'ended' });
  }
};

// POST /api/battles/create
const createBattle = async (req, res) => {
  try {
    const { name, initial_balance, duration } = req.body;
    if (!name || !duration) {
      return res.status(400).json({ message: 'name and duration are required' });
    }

    const invite_code = await generateCode();

    const group = await Group.create({
      name,
      invite_code,
      created_by: req.user.id,
      initial_balance: initial_balance || 100000,
      duration,
    });

    // Creator automatically joins
    await GroupMember.create({
      group_id: group.id,
      user_id: req.user.id,
      battle_balance: group.initial_balance,
    });

    res.status(201).json({ group });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to create battle' });
  }
};

// POST /api/battles/join
const joinBattle = async (req, res) => {
  try {
    const { invite_code } = req.body;
    if (!invite_code) return res.status(400).json({ message: 'invite_code is required' });

    const group = await Group.findOne({ where: { invite_code: invite_code.toUpperCase() } });
    if (!group) return res.status(404).json({ message: 'Invalid invite code' });
    if (group.status !== 'waiting') return res.status(400).json({ message: 'Battle has already started or ended' });

    const alreadyMember = await GroupMember.findOne({
      where: { group_id: group.id, user_id: req.user.id },
    });
    if (alreadyMember) return res.status(400).json({ message: 'You are already in this battle' });

    await GroupMember.create({
      group_id: group.id,
      user_id: req.user.id,
      battle_balance: group.initial_balance,
    });

    res.json({ group });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to join battle' });
  }
};

// GET /api/battles
const getBattles = async (req, res) => {
  try {
    const members = await GroupMember.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Group, include: [{ model: User, as: 'creator', attributes: ['name'] }] }],
      order: [[Group, 'createdAt', 'DESC']],
    });

    const battles = members.map((m) => {
      const g = m.Group;
      return {
        id: g.id,
        name: g.name,
        invite_code: g.invite_code,
        status: g.status,
        duration: g.duration,
        initial_balance: g.initial_balance,
        starts_at: g.starts_at,
        ends_at: g.ends_at,
        created_by: g.creator?.name,
        is_creator: g.created_by === req.user.id,
      };
    });

    res.json({ battles });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to fetch battles' });
  }
};

// GET /api/battles/:id
const getBattle = async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id, {
      include: [
        { model: User, as: 'creator', attributes: ['name'] },
        { model: GroupMember, include: [{ model: User, attributes: ['id', 'name'] }] },
      ],
    });

    if (!group) return res.status(404).json({ message: 'Battle not found' });

    await checkAndEndBattle(group);

    const isMember = group.GroupMembers.some((m) => m.user_id === req.user.id);
    if (!isMember) return res.status(403).json({ message: 'You are not a member of this battle' });

    res.json({ group });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to fetch battle' });
  }
};

// POST /api/battles/:id/start
const startBattle = async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ message: 'Battle not found' });
    if (group.created_by !== req.user.id) return res.status(403).json({ message: 'Only the creator can start the battle' });
    if (group.status !== 'waiting') return res.status(400).json({ message: 'Battle cannot be started' });

    const memberCount = await GroupMember.count({ where: { group_id: group.id } });
    if (memberCount < 2) return res.status(400).json({ message: 'At least 2 members required to start' });

    const starts_at = new Date();
    const durationMap = { '24h': 24, '48h': 48, '5d': 120 };
    const hours = durationMap[group.duration];
    const ends_at = new Date(starts_at.getTime() + hours * 60 * 60 * 1000);

    await group.update({ status: 'active', starts_at, ends_at });

    res.json({ group });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to start battle' });
  }
};

// GET /api/battles/:id/leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id, {
      include: [{ model: GroupMember, include: [{ model: User, attributes: ['id', 'name'] }] }],
    });

    if (!group) return res.status(404).json({ message: 'Battle not found' });
    await checkAndEndBattle(group);

    // Get all holdings for all members
    const memberHoldings = await Promise.all(
      group.GroupMembers.map(async (member) => {
        const holdings = await getBattleHoldings(group.id, member.user_id);
        return { member, holdings };
      })
    );

    // Deduplicate symbols for batch price fetch
    const allSymbols = [...new Set(
      memberHoldings.flatMap((m) => m.holdings.map((h) => h.symbol))
    )];

    // Fetch all prices in one batch
    const priceMap = {};
    await Promise.all(
      allSymbols.map(async (symbol) => {
        try {
          const quote = await getStockQuote(symbol);
          priceMap[symbol] = quote.price;
        } catch {
          priceMap[symbol] = null;
        }
      })
    );

    // Calculate rankings
    const rankings = memberHoldings.map(({ member, holdings }) => {
      const holdingsValue = holdings.reduce((sum, h) => {
        const price = priceMap[h.symbol] || 0;
        return sum + price * h.quantity;
      }, 0);

      const totalValue = parseFloat(member.battle_balance) + holdingsValue;
      const pnl = totalValue - parseFloat(group.initial_balance);
      const pnlPercent = (pnl / parseFloat(group.initial_balance)) * 100;

      return {
        user_id: member.user_id,
        name: member.User.name,
        battle_balance: parseFloat(member.battle_balance),
        holdings_value: holdingsValue.toFixed(2),
        total_value: totalValue.toFixed(2),
        pnl: pnl.toFixed(2),
        pnl_percent: pnlPercent.toFixed(2),
        is_you: member.user_id === req.user.id,
      };
    });

    rankings.sort((a, b) => parseFloat(b.total_value) - parseFloat(a.total_value));
    rankings.forEach((r, i) => r.rank = i + 1);

    res.json({
      group: {
        id: group.id,
        name: group.name,
        status: group.status,
        starts_at: group.starts_at,
        ends_at: group.ends_at,
        initial_balance: group.initial_balance,
        invite_code: group.invite_code,
        is_creator: group.created_by === req.user.id,
      },
      rankings,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
};

// POST /api/battles/:id/buy
const buyStock = async (req, res) => {
  try {
    const { symbol, company_name, quantity } = req.body;
    if (!symbol || !company_name || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'symbol, company_name and quantity are required' });
    }

    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ message: 'Battle not found' });
    if (group.status !== 'active') return res.status(400).json({ message: 'Battle is not active' });

    await checkAndEndBattle(group);
    if (group.status === 'ended') return res.status(400).json({ message: 'Battle has ended' });

    const member = await GroupMember.findOne({
      where: { group_id: group.id, user_id: req.user.id },
    });
    if (!member) return res.status(403).json({ message: 'You are not a member of this battle' });

    const quote = await getStockQuote(symbol);
    const total_value = quote.price * quantity;

    if (parseFloat(member.battle_balance) < total_value) {
      return res.status(400).json({ message: 'Insufficient battle balance' });
    }

    await member.update({
      battle_balance: parseFloat(member.battle_balance) ,
    });

    const transaction = await GroupTransaction.create({
      group_id: group.id,
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
      new_balance: parseFloat(member.battle_balance) - total_value,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to buy stock' });
  }
};

// POST /api/battles/:id/sell
const sellStock = async (req, res) => {
  try {
    const { symbol, quantity } = req.body;
    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'symbol and quantity are required' });
    }

    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ message: 'Battle not found' });
    if (group.status !== 'active') return res.status(400).json({ message: 'Battle is not active' });

    await checkAndEndBattle(group);
    if (group.status === 'ended') return res.status(400).json({ message: 'Battle has ended' });

    const member = await GroupMember.findOne({
      where: { group_id: group.id, user_id: req.user.id },
    });
    if (!member) return res.status(403).json({ message: 'You are not a member of this battle' });

    const holdings = await getBattleHoldings(group.id, req.user.id);
    const holding = holdings.find((h) => h.symbol === symbol);
    if (!holding || holding.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient shares to sell' });
    }

    const quote = await getStockQuote(symbol);
    const total_value = quote.price * quantity;

    await member.update({
      battle_balance: parseFloat(member.battle_balance) + total_value,
    });

    const transaction = await GroupTransaction.create({
      group_id: group.id,
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
      new_balance: parseFloat(member.battle_balance),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to sell stock' });
  }
};

// GET /api/battles/:id/portfolio
const getBattlePortfolio = async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ message: 'Battle not found' });

    await checkAndEndBattle(group);

    const member = await GroupMember.findOne({
      where: { group_id: group.id, user_id: req.user.id },
    });
    if (!member) return res.status(403).json({ message: 'You are not a member' });

    const holdings = await getBattleHoldings(group.id, req.user.id);

    const holdingsWithPrices = await Promise.all(
      holdings.map(async (h) => {
        try {
          const quote = await getStockQuote(h.symbol);
          const currentValue = quote.price * h.quantity;
          const avgBuyPrice = h.total_invested / h.quantity;
          const pnl = currentValue - h.total_invested;
          return {
            symbol: h.symbol,
            company_name: h.company_name,
            quantity: h.quantity,
            avg_buy_price: avgBuyPrice.toFixed(2),
            current_price: quote.price,
            current_value: currentValue.toFixed(2),
            pnl: pnl.toFixed(2),
            pnl_percent: ((pnl / h.total_invested) * 100).toFixed(2),
          };
        } catch {
          return { ...h, error: 'Could not fetch live price' };
        }
      })
    );

    res.json({
      battle_balance: parseFloat(member.battle_balance),
      holdings: holdingsWithPrices,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to fetch battle portfolio' });
  }
};

module.exports = {
  createBattle, joinBattle, getBattles, getBattle,
  startBattle, getLeaderboard, buyStock, sellStock, getBattlePortfolio,
};