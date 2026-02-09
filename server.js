const express = require('express');
const path = require('path');
const { WebSocketServer } = require('ws');
const http = require('http');

const DataAggregator = require('./src/data-aggregator');
const SentimentEngine = require('./src/sentiment-engine');
const TechnicalAnalysis = require('./src/technical-analysis');
const SignalEngine = require('./src/signal-engine');
const RealtimeFeeds = require('./src/realtime-feeds');
const { getAllInfluencers, getInfluencerCount, getCategoryStats } = require('./src/influencer-db');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;

// ─── Security Middleware ──────────────────────────────────────────────
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Don't leak referrer info
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Disable dangerous browser features
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  // Content Security Policy - only allow local resources and WebSocket
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    "connect-src 'self' ws://localhost:* ws://127.0.0.1:*",
    "img-src 'self' data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '));
  // Prevent caching of sensitive data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
});

// Simple rate limiter (100 requests per minute per IP)
const rateLimitMap = new Map();
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60000;
  const maxRequests = 100;
  if (!rateLimitMap.has(ip)) rateLimitMap.set(ip, []);
  const timestamps = rateLimitMap.get(ip).filter(t => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  next();
});
// Clean up rate limit map every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter(t => now - t < 60000);
    if (valid.length === 0) rateLimitMap.delete(ip);
    else rateLimitMap.set(ip, valid);
  }
}, 300000);

// Core engines
const aggregator = new DataAggregator();
const sentimentEngine = new SentimentEngine();
const ta = new TechnicalAnalysis();
const signalEngine = new SignalEngine();
const realtime = new RealtimeFeeds();

// ─── State ────────────────────────────────────────────────────────────
const state = {
  // Price
  price: null,
  priceSource: null,
  ticker: null,

  // Market
  market: null,
  globalMarket: null,
  coinPaprika: null,

  // Social
  sentiment: null,
  redditPosts: [],
  newsArticles: [],
  influencers: getAllInfluencers(),
  influencerCount: getInfluencerCount(),
  categoryStats: getCategoryStats(),

  // Technical
  technicals: null,

  // On-chain
  xrpl: null,
  whaleAlerts: [],

  // Order flow
  orderFlow: null,
  orderBook: null,
  recentTrades: [],

  // Signal
  signal: null,
  fearGreed: null,

  // Meta
  connections: {},
  lastUpdated: null,
  dataSourceStatus: {},
};

// ─── Serve Static ─────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── REST API ─────────────────────────────────────────────────────────
app.get('/api/dashboard', (req, res) => res.json(state));
app.get('/api/signal', (req, res) => res.json(state.signal));
app.get('/api/technicals', (req, res) => res.json(state.technicals));
app.get('/api/sentiment', (req, res) => res.json(state.sentiment));
app.get('/api/influencers', (req, res) => res.json({ influencers: state.influencers, count: state.influencerCount, categories: state.categoryStats }));

// ─── WebSocket Broadcast ──────────────────────────────────────────────
function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, ts: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

// ─── Real-Time Feed Event Handlers ────────────────────────────────────

// Price updates from Binance (every trade, ~50-200ms)
realtime.on('price', (data) => {
  state.price = { price: data.price, source: data.source, timestamp: data.timestamp };
  ta.addDataPoint(data.price, 0, data.timestamp);
  broadcast('price', data);
});

// Ticker updates (24h stats)
realtime.on('ticker', (data) => {
  state.ticker = data;
  if (data.changePercent != null && state.price) {
    state.price.change24h = data.changePercent;
    state.price.volume24h = data.quoteVolume;
    state.price.high24h = data.high;
    state.price.low24h = data.low;
  }
  broadcast('ticker', data);
});

// Order book updates
realtime.on('orderbook', (data) => {
  state.orderBook = data;
  state.orderFlow = {
    buyPressure: realtime.metrics.buyPressure,
    imbalance: data.imbalance,
    volumeRatio: realtime.metrics.volumeRatio,
    bidDepth: data.bidDepth,
    askDepth: data.askDepth,
    spread: data.spread,
  };
  broadcast('orderbook', { imbalance: data.imbalance, bidDepth: data.bidDepth, askDepth: data.askDepth, spread: data.spread });
});

// Trade flow metrics
realtime.on('metrics', (data) => {
  broadcast('metrics', data);
});

// Individual trades (for trade feed)
realtime.on('trade', (data) => {
  state.recentTrades = realtime.tradeHistory.slice(-30);
  // Only broadcast large trades
  if (data.value > 5000) {
    broadcast('large_trade', data);
  }
});

// XRPL ledger
realtime.on('ledger', (data) => {
  state.xrpl = { ...realtime.xrplMetrics };
  broadcast('ledger', data);
});

// Whale alerts from XRPL
realtime.on('whale_alert', (data) => {
  state.whaleAlerts.push(data);
  if (state.whaleAlerts.length > 50) state.whaleAlerts = state.whaleAlerts.slice(-50);
  broadcast('whale_alert', data);
});

// BTC/ETH prices for correlation
let btcPrice = 0, ethPrice = 0;
realtime.on('btc_price', (p) => { btcPrice = p; });
realtime.on('eth_price', (p) => { ethPrice = p; });

// Connection status
realtime.on('connected', (data) => {
  state.connections[data.source] = 'connected';
  broadcast('connection', state.connections);
});
realtime.on('disconnected', (data) => {
  state.connections[data.source] = 'disconnected';
  broadcast('connection', state.connections);
});

// ─── Periodic Data Refresh (social, news, market data) ────────────────

async function refreshData() {
  console.log(`[${new Date().toISOString()}] Refreshing aggregated data...`);
  try {
    const data = await aggregator.fetchAll();

    // Process market data
    if (data.coinGeckoMarket) {
      const m = data.coinGeckoMarket;
      state.market = {
        rank: m.market_cap_rank,
        ath: m.market_data?.ath?.usd,
        athDate: m.market_data?.ath_date?.usd,
        athChange: m.market_data?.ath_change_percentage?.usd,
        high24h: m.market_data?.high_24h?.usd,
        low24h: m.market_data?.low_24h?.usd,
        priceChange7d: m.market_data?.price_change_percentage_7d,
        priceChange14d: m.market_data?.price_change_percentage_14d,
        priceChange30d: m.market_data?.price_change_percentage_30d,
        priceChange1y: m.market_data?.price_change_percentage_1y,
        marketCap: m.market_data?.market_cap?.usd,
        volume24h: m.market_data?.total_volume?.usd,
        circulatingSupply: m.market_data?.circulating_supply,
        totalSupply: m.market_data?.total_supply,
        sparkline7d: m.market_data?.sparkline_7d?.price || [],
        communityScore: m.community_score,
        devScore: m.developer_score,
        liquidityScore: m.liquidity_score,
        coingeckoScore: m.coingecko_score,
        sentimentUp: m.sentiment_votes_up_percentage,
        sentimentDown: m.sentiment_votes_down_percentage,
        redditSubs: m.community_data?.reddit_subscribers,
        redditActive: m.community_data?.reddit_accounts_active_48h,
        twitterFollowers: m.community_data?.twitter_followers,
        githubStars: m.developer_data?.stars,
        githubForks: m.developer_data?.forks,
      };

      // Load sparkline into TA engine
      if (state.market.sparkline7d.length > 0) {
        ta.addSparklineData(state.market.sparkline7d);
      }
    }

    // CoinGecko price as fallback
    if (data.coinGeckoPrice?.ripple && !state.price?.price) {
      const xrp = data.coinGeckoPrice.ripple;
      state.price = {
        price: xrp.usd,
        change24h: xrp.usd_24h_change,
        volume24h: xrp.usd_24h_vol,
        marketCap: xrp.usd_market_cap,
        source: 'coingecko'
      };
    }

    // Global market
    if (data.coinGeckoGlobal?.data) {
      const g = data.coinGeckoGlobal.data;
      state.globalMarket = {
        totalMarketCap: g.total_market_cap?.usd,
        totalVolume: g.total_volume?.usd,
        btcDominance: g.market_cap_percentage?.btc,
        ethDominance: g.market_cap_percentage?.eth,
        xrpDominance: g.market_cap_percentage?.xrp,
        activeCryptos: g.active_cryptocurrencies,
        marketCapChange24h: g.market_cap_change_percentage_24h_usd,
      };
    }

    // CoinPaprika
    if (data.coinPaprika) {
      state.coinPaprika = {
        rank: data.coinPaprika.rank,
        betaValue: data.coinPaprika.quotes?.USD?.ath_price,
        percentFromAth: data.coinPaprika.quotes?.USD?.percent_from_price_ath,
        volume24h: data.coinPaprika.quotes?.USD?.volume_24h,
        volumeChange24h: data.coinPaprika.quotes?.USD?.volume_24h_change_24h,
        marketCapChange24h: data.coinPaprika.quotes?.USD?.market_cap_change_24h,
      };
    }

    // Sentiment analysis
    const allPosts = [...data.redditPosts];
    // Also analyze news as posts
    for (const article of data.newsArticles) {
      allPosts.push({
        title: article.title,
        text: article.snippet,
        created: article.date,
        score: 10, // Base engagement for news
        numComments: 0,
        platform: 'news'
      });
    }
    state.sentiment = sentimentEngine.analyzeBatch(allPosts);
    state.redditPosts = data.redditPosts.slice(0, 50);

    // Add sentiment scores to news
    state.newsArticles = data.newsArticles.map(a => {
      const s = sentimentEngine.analyzeText((a.title || '') + ' ' + (a.snippet || ''));
      return { ...a, sentimentScore: s.compound };
    });

    // Fear & Greed
    state.fearGreed = data.fearGreed;

    // CryptoCompare social
    if (data.cryptoCompareSocial) {
      state.cryptoCompareSocial = {
        redditSubs: data.cryptoCompareSocial.Reddit?.subscribers,
        redditActive: data.cryptoCompareSocial.Reddit?.active_users,
        redditPostsPerDay: data.cryptoCompareSocial.Reddit?.posts_per_day,
        redditCommentsPerDay: data.cryptoCompareSocial.Reddit?.comments_per_day,
        twitterFollowers: data.cryptoCompareSocial.Twitter?.followers,
        twitterStatuses: data.cryptoCompareSocial.Twitter?.statuses,
        githubStars: data.cryptoCompareSocial.CodeRepository?.stars,
        githubForks: data.cryptoCompareSocial.CodeRepository?.forks,
      };
    }

    // Technical analysis
    state.technicals = ta.getFullAnalysis();

    // Generate signal
    state.signal = signalEngine.generateSignal({
      sentiment: state.sentiment,
      technicals: state.technicals,
      market: state.market,
      price: state.price,
      news: state.newsArticles,
      onChain: state.xrpl ? { ...state.xrpl, whaleAlerts: state.whaleAlerts.slice(-10) } : null,
      orderFlow: state.orderFlow,
      fearGreed: state.fearGreed,
      leverage: 1.68
    });

    state.lastUpdated = new Date().toISOString();
    state.dataSourceStatus = {
      binance: state.connections.binance || 'pending',
      coincap: state.connections.coincap || 'pending',
      xrpl: state.connections.xrpl || 'pending',
      coingecko: data.coinGeckoPrice ? 'ok' : 'error',
      reddit: data.redditPosts.length > 0 ? 'ok' : 'error',
      news: data.newsArticles.length > 0 ? 'ok' : 'error',
      coinpaprika: data.coinPaprika ? 'ok' : 'error',
      cryptocompare: data.cryptoCompareSocial ? 'ok' : 'error',
      feargreed: data.fearGreed ? 'ok' : 'error',
    };

    // Broadcast full update
    broadcast('full_update', {
      price: state.price,
      ticker: state.ticker,
      market: state.market,
      globalMarket: state.globalMarket,
      sentiment: state.sentiment,
      technicals: state.technicals,
      signal: state.signal,
      fearGreed: state.fearGreed,
      newsArticles: state.newsArticles?.slice(0, 30),
      redditPosts: state.redditPosts?.slice(0, 30),
      influencerCount: state.influencerCount,
      categoryStats: state.categoryStats,
      xrpl: state.xrpl,
      whaleAlerts: state.whaleAlerts.slice(-10),
      orderFlow: state.orderFlow,
      cryptoCompareSocial: state.cryptoCompareSocial,
      coinPaprika: state.coinPaprika,
      connections: state.connections,
      dataSourceStatus: state.dataSourceStatus,
      lastUpdated: state.lastUpdated,
    });

    console.log(`[${new Date().toISOString()}] Data refreshed. Signal: ${state.signal?.signal} (${state.signal?.confidence}%) | ${state.redditPosts.length} posts | ${state.newsArticles?.length} articles | ${state.influencerCount} influencers tracked`);
  } catch (err) {
    console.error('Refresh error:', err.message);
  }
}

// Re-run signal every 15s using latest real-time data
function refreshSignal() {
  if (!state.price?.price) return;
  state.technicals = ta.getFullAnalysis();
  state.signal = signalEngine.generateSignal({
    sentiment: state.sentiment,
    technicals: state.technicals,
    market: state.market,
    price: state.price,
    news: state.newsArticles,
    onChain: state.xrpl ? { ...state.xrpl, whaleAlerts: state.whaleAlerts.slice(-10) } : null,
    orderFlow: state.orderFlow,
    fearGreed: state.fearGreed,
    leverage: 1.68
  });
  broadcast('signal', state.signal);
}

// ─── WebSocket Client Connections ─────────────────────────────────────
wss.on('connection', (ws) => {
  console.log('Dashboard client connected');

  // Send full state on connect
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      price: state.price,
      ticker: state.ticker,
      market: state.market,
      globalMarket: state.globalMarket,
      sentiment: state.sentiment,
      technicals: state.technicals,
      signal: state.signal,
      fearGreed: state.fearGreed,
      newsArticles: state.newsArticles?.slice(0, 30),
      redditPosts: state.redditPosts?.slice(0, 30),
      influencers: state.influencers,
      influencerCount: state.influencerCount,
      categoryStats: state.categoryStats,
      xrpl: state.xrpl,
      whaleAlerts: state.whaleAlerts.slice(-10),
      orderFlow: state.orderFlow,
      orderBook: state.orderBook,
      recentTrades: state.recentTrades,
      cryptoCompareSocial: state.cryptoCompareSocial,
      coinPaprika: state.coinPaprika,
      connections: state.connections,
      dataSourceStatus: state.dataSourceStatus,
      lastUpdated: state.lastUpdated,
    },
    ts: Date.now()
  }));

  ws.on('close', () => console.log('Dashboard client disconnected'));
});

// ─── Start (bound to localhost only for security) ─────────────────────
server.listen(PORT, '127.0.0.1', () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║              XRP ADVISOR v2.0 - POWERHOUSE              ║
║          Professional Trading Intelligence              ║
╠══════════════════════════════════════════════════════════╣
║  Dashboard:   http://localhost:${PORT}                     ║
║  API:         http://localhost:${PORT}/api/dashboard        ║
║                                                          ║
║  Real-Time:   Binance WS + CoinCap WS + XRPL WS        ║
║  Data:        CoinGecko, Reddit, 18 RSS, CoinPaprika    ║
║  Sentiment:   VADER-style NLP + Galaxy Score             ║
║  Technicals:  20+ indicators, multi-timeframe            ║
║  Influencers: ${String(getInfluencerCount()).padEnd(4)} tracked across all platforms       ║
║  Signal:      7-factor model @ 1.68x leverage            ║
╠══════════════════════════════════════════════════════════╣
║  SECURITY:                                               ║
║    Bound to localhost only (not accessible externally)   ║
║    CSP headers enabled | XSS protection active           ║
║    Rate limiting: 100 req/min | No data stored to disk   ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Start real-time WebSocket feeds
  realtime.startAll();

  // Initial data fetch + periodic refresh
  refreshData();
  setInterval(refreshData, 45000);  // Full refresh every 45s
  setInterval(refreshSignal, 15000); // Signal recalc every 15s
});
