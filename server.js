const express = require('express');
const path = require('path');
const { WebSocketServer } = require('ws');
const http = require('http');
const DataAggregator = require('./src/data-aggregator');
const SignalEngine = require('./src/signal-engine');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Data aggregator instance
const aggregator = new DataAggregator();
const signalEngine = new SignalEngine();

// Store latest data
let latestData = {
  price: null,
  market: null,
  sentiment: null,
  socialFeed: [],
  influencers: [],
  newsArticles: [],
  technicals: null,
  signal: null,
  lastUpdated: null
};

// REST API endpoints
app.get('/api/dashboard', (req, res) => {
  res.json(latestData);
});

app.get('/api/price', async (req, res) => {
  try {
    const price = await aggregator.fetchPrice();
    res.json(price);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/market', async (req, res) => {
  try {
    const market = await aggregator.fetchMarketData();
    res.json(market);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/social', async (req, res) => {
  try {
    const social = await aggregator.fetchSocialData();
    res.json(social);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/signal', (req, res) => {
  res.json(latestData.signal || { signal: 'NEUTRAL', confidence: 0 });
});

// WebSocket broadcast
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}

// Main data refresh loop
async function refreshData() {
  console.log(`[${new Date().toISOString()}] Refreshing data...`);
  try {
    const [price, market, social, news] = await Promise.allSettled([
      aggregator.fetchPrice(),
      aggregator.fetchMarketData(),
      aggregator.fetchSocialData(),
      aggregator.fetchNews()
    ]);

    if (price.status === 'fulfilled') latestData.price = price.value;
    if (market.status === 'fulfilled') latestData.market = market.value;
    if (social.status === 'fulfilled') {
      latestData.sentiment = social.value.sentiment;
      latestData.socialFeed = social.value.posts;
      latestData.influencers = social.value.influencers;
    }
    if (news.status === 'fulfilled') latestData.newsArticles = news.value;

    // Generate technicals from price history
    latestData.technicals = aggregator.getTechnicals();

    // Generate trade signal
    latestData.signal = signalEngine.generateSignal({
      price: latestData.price,
      market: latestData.market,
      sentiment: latestData.sentiment,
      technicals: latestData.technicals,
      leverage: 1.68
    });

    latestData.lastUpdated = new Date().toISOString();

    broadcast({ type: 'update', data: latestData });
    console.log(`[${new Date().toISOString()}] Data refreshed. Signal: ${latestData.signal?.signal} (${latestData.signal?.confidence}%)`);
  } catch (err) {
    console.error('Refresh error:', err.message);
  }
}

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.send(JSON.stringify({ type: 'update', data: latestData }));
  ws.on('close', () => console.log('Client disconnected'));
});

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  XRP ADVISOR DASHBOARD`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`========================================\n`);

  // Initial fetch then refresh every 60s
  refreshData();
  setInterval(refreshData, 60000);
});
