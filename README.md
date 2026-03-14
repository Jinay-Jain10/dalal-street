# Dalal Street -- Backend API

**Frontend Repo:** [dalal-street-frontend](https://github.com/Jinay-Jain10/dalal-street-frontend.git)  
**Live Demo:** [dalal-street.vercel.app](https://dalal-street.vercel.app/)

---

## The Problem We're Solving

Every stock market simulator lets you trade alone. You buy, you sell, you watch numbers go up or down- but there's no competition, no stakes, no reason to care beyond yourself.

**Dalal Street fixes this with Stock Battles.**

Stock Battles is a multiplayer trading competition system- the only feature of its kind in any free Indian stock market simulator. You create a battle, invite friends via a 6-character code, and everyone gets the same starting balance. Whoever builds the highest portfolio value by the end wins. Real NSE prices, real market conditions, real competition.

This transforms stock market simulation from a solo learning tool into a social, competitive experience- the way fantasy cricket transformed watching cricket.

---

## Features

**Stock Battles (USP)**
- Create private multiplayer trading competitions with a 6-character invite code
- Choose starting balance (₹50K to ₹10L) and duration (24h, 48h, 5 days)
- Live leaderboard ranked by total portfolio value using real NSE prices
- Battle balance completely isolated from personal virtual balance
- Join multiple battles simultaneously
- Auto-end when duration expires, leaderboard freezes at final prices
- Creator controls- start battle, delete waiting battles

**Stock Market**
- Live NSE stock quotes via `stock-nse-india` package
- Price history for 1W, 1M, 3M, 1Y, 5Y ranges
- Market overview- Nifty 50, Bank Nifty, top gainers/losers
- Search 2100+ NSE listed stocks from local CSV
- In-memory quote caching (5 minute TTL) to prevent rate limiting

**News & Sentiment**
- News fetching via NewsAPI
- AI-powered sentiment analysis via Groq (Llama 3.3 70B)
- Articles tagged POSITIVE, NEGATIVE, or NEUTRAL in a single batch API call

**Portfolio & Watchlist**
- Virtual portfolio with ₹1,00,000 starting balance
- Holdings derived from transaction aggregation- no separate holdings table
- Full transaction history
- Watchlist management

**Auth**
- JWT authentication with bcrypt password hashing
- Persistent sessions via Bearer tokens

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL (Neon.tech) |
| ORM | Sequelize |
| Stock Data | stock-nse-india |
| News | NewsAPI.org |
| AI Sentiment | Groq SDK (llama-3.3-70b-versatile) |
| Auth | JWT + bcrypt |
| Hosting | Railway |

---

## Architecture Decisions

**NSE India over Yahoo Finance** — Yahoo Finance aggressively blocks datacenter IPs. The `stock-nse-india` package wraps NSE's unofficial API and works reliably from cloud servers without rate limiting issues.

**In-memory caching** — Stock quotes are cached for 5 minutes in memory. This prevents rate limiting from NSE and keeps response times fast when multiple users view the same stock simultaneously.

**Holdings derived from transactions** — There is no separate holdings table. Portfolio holdings are calculated by aggregating buy/sell transactions at query time. This keeps the schema simple and ensures transaction history is always the source of truth.

**Battle balance isolated from personal balance** — Each battle member has their own `battle_balance` completely separate from their personal `virtual_balance`. This allows participation in multiple battles simultaneously without conflicts.

**Lazy battle auto-end** — Rather than running a background cron job, battles are checked and ended lazily on every leaderboard, portfolio, buy, or sell request. This avoids unnecessary server load while still ensuring battles end correctly.

---

## Database Schema
```
Users             — id, name, email, password_hash, virtual_balance
Transactions      — id, user_id, symbol, company_name, type, quantity, price, total_value
Watchlist         — id, user_id, symbol, company_name
Groups            — id, name, invite_code, created_by, initial_balance, duration, status, starts_at, ends_at
GroupMembers      — id, group_id, user_id, battle_balance
GroupTransactions — id, group_id, user_id, symbol, type, quantity, price, total_value
```

---

## API Endpoints

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
```

### Stocks
```
GET    /api/stocks/market/overview
GET    /api/stocks/search?q=reliance
GET    /api/stocks/:symbol
GET    /api/stocks/:symbol/history?range=1M
```

### News
```
GET    /api/news/:symbol?name=Reliance Industries
```

### Portfolio
```
GET    /api/portfolio
POST   /api/portfolio/buy
POST   /api/portfolio/sell
GET    /api/portfolio/transactions
```

### Watchlist
```
GET    /api/watchlist
POST   /api/watchlist
DELETE /api/watchlist/:symbol
```

### Battles — Multiplayer Trading Competitions
```
POST   /api/battles/create          — Create a new battle
POST   /api/battles/join            — Join via invite code
GET    /api/battles                 — List all battles for current user
GET    /api/battles/:id             — Get battle details
POST   /api/battles/:id/start       — Start battle (creator only, min 2 members)
GET    /api/battles/:id/leaderboard — Live rankings with real-time P&L
POST   /api/battles/:id/buy         — Buy stock within a battle
POST   /api/battles/:id/sell        — Sell stock within a battle
GET    /api/battles/:id/portfolio   — Your holdings within a battle
DELETE /api/battles/:id             — Delete a waiting battle (creator only)
```

---

## Local Setup

**Prerequisites:** Node.js 18+, PostgreSQL
```bash
# Clone the repo
git clone https://github.com/Jinay-Jain10/dalal-street.git
cd dalal-street-server

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Fill in your values

# Start the server
node index.js
```

Server runs at `http://localhost:5000`

---

## Environment Variables
```env
PORT=5000
DB_NAME=dalal_street
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
JWT_SECRET=your_jwt_secret
NEWS_API_KEY=your_newsapi_key
GROQ_API_KEY=your_groq_api_key

# For production (Neon.tech)
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
```

---

## Deployment

- **Platform:** Railway
- **Database:** Neon.tech (PostgreSQL, never expires on free tier)
- Set all environment variables in Railway dashboard
- Railway auto-deploys on every push to `main`
- Note: Railway free tier spins down after inactivity- first request after idle may take 20-30 seconds
