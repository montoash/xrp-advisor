/**
 * Real-Time Data Feeds
 * Streams live price data from exchange WebSockets
 * No API keys required - uses public endpoints
 *
 * Sources:
 *   - Binance WebSocket (XRP/USDT trades + order book) - with .US fallback
 *   - Kraken WebSocket (XRP/USD real-time prices) - reliable free backup
 *   - CoinCap WebSocket (real-time prices) - secondary backup
 *   - XRPL WebSocket (on-chain data)
 */

const WebSocket = require('ws');

class RealtimeFeeds {
  constructor() {
    this.listeners = new Map();
    this.connections = {};
    this.latestPrice = null;
    this.latestTrade = null;
    this.orderBook = { bids: [], asks: [] };
    this.tradeHistory = [];
    this.maxTrades = 500;
    this.ticker24h = null;
    this.reconnectAttempts = {};
    this.maxReconnect = 50;

    // Binance fallback state
    this._binanceEndpoints = [
      { url: 'wss://stream.binance.com:9443/stream?streams=xrpusdt@trade/xrpusdt@ticker/xrpusdt@depth5@100ms', label: 'Binance.com' },
      { url: 'wss://stream.binance.us:9443/stream?streams=xrpusd@trade/xrpusd@ticker/xrpusd@depth5@100ms', label: 'Binance.US' },
    ];
    this._binanceEndpointIndex = 0;
    this._binanceActive = false;
    this._binanceGaveUp = false;

    // Kraken state
    this._krakenActive = false;
    this._krakenGaveUp = false;

    // CoinCap state
    this._coincapActive = false;

    // Aggregated metrics
    this.metrics = {
      buyVolume1m: 0,
      sellVolume1m: 0,
      tradeCount1m: 0,
      buyCount1m: 0,
      sellCount1m: 0,
      largestTrade1m: 0,
      vwap1m: 0,
      priceChangeRate: 0,
    };

    // Rolling 1-minute window
    this.recentTrades = [];

    // XRPL metrics
    this.xrplMetrics = {
      ledgerIndex: null,
      txCount: 0,
      paymentCount: 0,
      escrowCount: 0,
      offerCount: 0,
      trustLineCount: 0,
      accountsCreated: 0,
      feeBurned: 0,
      lastLedgerTime: null,
    };

    // Heartbeat intervals
    this._heartbeats = {};
  }

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    const cbs = this.listeners.get(event) || [];
    for (const cb of cbs) {
      try { cb(data); } catch (e) { console.error(`Event ${event} handler error:`, e.message); }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BINANCE PUBLIC WEBSOCKET - with automatic .US fallback
  // ═══════════════════════════════════════════════════════════════════════

  connectBinance() {
    this._binanceEndpointIndex = 0;
    this._binanceGaveUp = false;
    this._tryBinanceEndpoint();
  }

  _tryBinanceEndpoint() {
    if (this._binanceEndpointIndex >= this._binanceEndpoints.length) {
      console.log('[WS] All Binance endpoints unavailable in your region');
      console.log('[WS] Using Kraken/CoinCap as primary price feed');
      this._binanceGaveUp = true;
      this._binanceActive = false;
      this.emit('binance_unavailable', {});
      return;
    }

    const endpoint = this._binanceEndpoints[this._binanceEndpointIndex];
    console.log(`[WS] Trying ${endpoint.label}...`);

    let ws;
    try {
      ws = new WebSocket(endpoint.url);
    } catch (e) {
      console.error(`[WS] ${endpoint.label} connection failed:`, e.message);
      this._binanceEndpointIndex++;
      setTimeout(() => this._tryBinanceEndpoint(), 1000);
      return;
    }

    this.connections.binance = ws;
    let switchedEndpoint = false;

    ws.on('open', () => {
      console.log(`[WS] Connected to ${endpoint.label}`);
      this._binanceActive = true;
      this._binanceGaveUp = false;
      this.reconnectAttempts.binance = 0;
      this.emit('connected', { source: 'binance' });
    });

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data);
        const stream = parsed.stream;
        const payload = parsed.data;

        if (stream && stream.includes('@trade')) {
          this._handleBinanceTrade(payload);
        } else if (stream && stream.includes('@ticker')) {
          this._handleBinanceTicker(payload);
        } else if (stream && stream.includes('depth')) {
          this._handleBinanceDepth(payload);
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    ws.on('error', (err) => {
      const msg = err.message || '';
      // HTTP 451 = region blocked, HTTP 403 = forbidden
      if (msg.includes('451') || msg.includes('403') || msg.includes('ENOTFOUND')) {
        console.log(`[WS] ${endpoint.label} blocked (${msg.split(':').pop().trim()})`);
        switchedEndpoint = true;
        this._binanceActive = false;
        this._binanceEndpointIndex++;
        // Don't let the close handler reconnect to the same endpoint
        try { ws.removeAllListeners('close'); } catch (e) {}
        setTimeout(() => this._tryBinanceEndpoint(), 1000);
      } else {
        console.error(`[WS] ${endpoint.label} error:`, msg);
      }
    });

    ws.on('close', () => {
      if (switchedEndpoint) return; // Already switching endpoints
      if (this.connections.binance !== ws) return; // Stale connection
      this._binanceActive = false;
      this.emit('disconnected', { source: 'binance' });
      this._reconnectBinance();
    });
  }

  _reconnectBinance() {
    if (this._binanceGaveUp) return;

    this.reconnectAttempts.binance = (this.reconnectAttempts.binance || 0) + 1;
    if (this.reconnectAttempts.binance > 10) {
      console.log('[WS] Binance max reconnects reached - using Kraken/CoinCap for price data');
      this._binanceGaveUp = true;
      this._binanceActive = false;
      this.emit('binance_unavailable', {});
      return;
    }

    const delay = Math.min(30000, Math.pow(2, Math.min(this.reconnectAttempts.binance, 10)) * 1000);
    console.log(`[WS] Binance reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts.binance})`);
    setTimeout(() => this._tryBinanceEndpoint(), delay);
  }

  _handleBinanceTrade(data) {
    const trade = {
      price: parseFloat(data.p),
      quantity: parseFloat(data.q),
      value: parseFloat(data.p) * parseFloat(data.q),
      side: data.m ? 'sell' : 'buy',
      timestamp: data.T,
      source: 'binance'
    };

    this.latestPrice = trade.price;
    this.latestTrade = trade;

    this.tradeHistory.push(trade);
    if (this.tradeHistory.length > this.maxTrades) {
      this.tradeHistory = this.tradeHistory.slice(-this.maxTrades);
    }

    // Rolling 1-minute metrics
    this.recentTrades.push(trade);
    const oneMinAgo = Date.now() - 60000;
    this.recentTrades = this.recentTrades.filter(t => t.timestamp > oneMinAgo);
    this._updateMetrics();

    this.emit('trade', trade);
    this.emit('price', { price: trade.price, source: 'binance', timestamp: trade.timestamp });
  }

  _handleBinanceTicker(data) {
    this.ticker24h = {
      symbol: 'XRP/USDT',
      price: parseFloat(data.c),
      change: parseFloat(data.p),
      changePercent: parseFloat(data.P),
      high: parseFloat(data.h),
      low: parseFloat(data.l),
      volume: parseFloat(data.v),
      quoteVolume: parseFloat(data.q),
      trades: parseInt(data.n),
      weightedAvg: parseFloat(data.w),
      openPrice: parseFloat(data.o),
      source: 'binance'
    };
    this.emit('ticker', this.ticker24h);
  }

  _handleBinanceDepth(data) {
    this.orderBook = {
      bids: (data.bids || []).map(([p, q]) => ({ price: parseFloat(p), quantity: parseFloat(q) })),
      asks: (data.asks || []).map(([p, q]) => ({ price: parseFloat(p), quantity: parseFloat(q) })),
      timestamp: Date.now(),
      source: 'binance'
    };

    const totalBids = this.orderBook.bids.reduce((s, b) => s + b.quantity, 0);
    const totalAsks = this.orderBook.asks.reduce((s, a) => s + a.quantity, 0);
    this.orderBook.imbalance = totalBids + totalAsks > 0
      ? ((totalBids - totalAsks) / (totalBids + totalAsks)) * 100
      : 0;
    this.orderBook.bidDepth = totalBids;
    this.orderBook.askDepth = totalAsks;
    this.orderBook.spread = this.orderBook.asks.length > 0 && this.orderBook.bids.length > 0
      ? ((this.orderBook.asks[0].price - this.orderBook.bids[0].price) / this.orderBook.asks[0].price) * 100
      : 0;

    this.emit('orderbook', this.orderBook);
  }

  _updateMetrics() {
    const trades = this.recentTrades;
    let buyVol = 0, sellVol = 0, buyCount = 0, sellCount = 0, largest = 0;
    let vwapNum = 0, vwapDen = 0;

    for (const t of trades) {
      if (t.side === 'buy') { buyVol += t.value; buyCount++; }
      else { sellVol += t.value; sellCount++; }
      if (t.value > largest) largest = t.value;
      vwapNum += t.price * t.quantity;
      vwapDen += t.quantity;
    }

    this.metrics = {
      buyVolume1m: buyVol,
      sellVolume1m: sellVol,
      tradeCount1m: trades.length,
      buyCount1m: buyCount,
      sellCount1m: sellCount,
      largestTrade1m: largest,
      vwap1m: vwapDen > 0 ? vwapNum / vwapDen : 0,
      buyPressure: (buyCount + sellCount) > 0 ? Math.round((buyCount / (buyCount + sellCount)) * 100) : 50,
      volumeRatio: sellVol > 0 ? (buyVol / sellVol).toFixed(2) : 'inf',
    };

    this.emit('metrics', this.metrics);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // KRAKEN PUBLIC WEBSOCKET - reliable, no API key needed
  // ═══════════════════════════════════════════════════════════════════════

  connectKraken() {
    const url = 'wss://ws.kraken.com';
    console.log('[WS] Connecting to Kraken...');

    let ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      console.error('[WS] Kraken connection failed:', e.message);
      this._reconnectKraken();
      return;
    }

    if (this.connections.kraken) {
      try { this.connections.kraken.close(); } catch (e) { /* ignore */ }
    }
    this.connections.kraken = ws;
    this.reconnectAttempts.kraken = this.reconnectAttempts.kraken || 0;

    ws.on('open', () => {
      console.log('[WS] Connected to Kraken');
      this._krakenActive = true;
      this._krakenGaveUp = false;
      this.reconnectAttempts.kraken = 0;
      this.emit('connected', { source: 'kraken' });

      // Subscribe to XRP/USD ticker
      ws.send(JSON.stringify({
        event: 'subscribe',
        pair: ['XRP/USD'],
        subscription: { name: 'ticker' }
      }));

      // Subscribe to XRP/USD trades
      ws.send(JSON.stringify({
        event: 'subscribe',
        pair: ['XRP/USD'],
        subscription: { name: 'trade' }
      }));

      // Heartbeat ping every 30s
      this._heartbeats.kraken = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event: 'ping' }));
        }
      }, 30000);
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // Skip system messages
        if (msg.event) return;

        // Kraken sends arrays: [channelID, data, channelName, pair]
        if (Array.isArray(msg) && msg.length >= 4) {
          const channelName = msg[2];
          const payload = msg[1];

          if (channelName === 'ticker') {
            this._handleKrakenTicker(payload);
          } else if (channelName === 'trade') {
            this._handleKrakenTrade(payload);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    ws.on('close', () => {
      this._krakenActive = false;
      if (this._heartbeats.kraken) {
        clearInterval(this._heartbeats.kraken);
        this._heartbeats.kraken = null;
      }
      this.emit('disconnected', { source: 'kraken' });
      this._reconnectKraken();
    });

    ws.on('error', (err) => {
      console.error('[WS] Kraken error:', err.message);
    });
  }

  _reconnectKraken() {
    if (this._krakenGaveUp) return;

    this.reconnectAttempts.kraken = (this.reconnectAttempts.kraken || 0) + 1;
    if (this.reconnectAttempts.kraken > this.maxReconnect) {
      console.error('[WS] Kraken max reconnect attempts reached');
      this._krakenGaveUp = true;
      return;
    }

    const delay = Math.min(30000, Math.pow(2, Math.min(this.reconnectAttempts.kraken, 10)) * 1000);
    if (this.reconnectAttempts.kraken <= 3 || this.reconnectAttempts.kraken % 5 === 0) {
      console.log(`[WS] Kraken reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts.kraken})`);
    }
    setTimeout(() => this.connectKraken(), delay);
  }

  _handleKrakenTicker(data) {
    // Kraken ticker: { c: [price, lotVolume], v: [today, last24h], ... }
    if (!data || !data.c) return;

    const price = parseFloat(data.c[0]);
    if (isNaN(price) || price <= 0) return;

    // When Binance is down, Kraken becomes primary
    if (!this._binanceActive) {
      this.latestPrice = price;
      this.emit('price', { price, source: 'kraken', timestamp: Date.now() });
    }

    this.emit('price_backup', { price, source: 'kraken', timestamp: Date.now() });
  }

  _handleKrakenTrade(trades) {
    // Kraken trades: [[price, volume, time, side, orderType, misc], ...]
    if (!Array.isArray(trades)) return;

    for (const t of trades) {
      const price = parseFloat(t[0]);
      const volume = parseFloat(t[1]);
      if (isNaN(price) || isNaN(volume)) continue;

      // When Binance is down, Kraken becomes primary
      if (!this._binanceActive) {
        this.latestPrice = price;
        this.emit('price', { price, source: 'kraken', timestamp: Date.now() });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // COINCAP WEBSOCKET - backup price source (may be unreliable)
  // ═══════════════════════════════════════════════════════════════════════

  connectCoinCap() {
    const urls = [
      'wss://ws.coincap.io/prices?assets=xrp,bitcoin,ethereum',
    ];

    this._tryCoinCapEndpoint(urls, 0);
  }

  _tryCoinCapEndpoint(urls, index) {
    if (index >= urls.length) {
      console.log('[WS] CoinCap endpoints exhausted - Kraken is backup');
      this._coincapActive = false;
      this.emit('disconnected', { source: 'coincap' });
      // Retry after delay
      setTimeout(() => this._tryCoinCapEndpoint(urls, 0), 30000);
      return;
    }

    const url = urls[index];
    console.log(`[WS] Connecting to CoinCap...`);

    let ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      console.error('[WS] CoinCap connection failed:', e.message);
      this._tryCoinCapEndpoint(urls, index + 1);
      return;
    }

    if (this.connections.coincap) {
      try { this.connections.coincap.close(); } catch (e) { /* ignore */ }
    }
    this.connections.coincap = ws;

    // Connection timeout - if not open within 10s, try next
    const connectTimeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        console.log('[WS] CoinCap connection timeout');
        try { ws.close(); } catch (e) { /* ignore */ }
        this._tryCoinCapEndpoint(urls, index + 1);
      }
    }, 10000);

    // Stale data detection - if no message within 60s, reconnect
    let lastMessage = Date.now();
    let staleCheck = null;

    ws.on('open', () => {
      clearTimeout(connectTimeout);
      console.log('[WS] Connected to CoinCap');
      this._coincapActive = true;
      this.reconnectAttempts.coincap = 0;
      this.emit('connected', { source: 'coincap' });

      lastMessage = Date.now();
      staleCheck = setInterval(() => {
        if (Date.now() - lastMessage > 60000) {
          console.log('[WS] CoinCap stale connection detected, reconnecting...');
          try { ws.close(); } catch (e) { /* ignore */ }
        }
      }, 15000);
    });

    ws.on('message', (data) => {
      lastMessage = Date.now();
      try {
        const prices = JSON.parse(data.toString());
        if (prices.xrp) {
          const price = parseFloat(prices.xrp);
          // When Binance & Kraken are down, CoinCap becomes primary
          if (!this._binanceActive && !this._krakenActive) {
            this.latestPrice = price;
            this.emit('price', { price, source: 'coincap', timestamp: Date.now() });
          }
          this.emit('price_backup', { price, source: 'coincap', timestamp: Date.now() });
        }
        if (prices.bitcoin) this.emit('btc_price', parseFloat(prices.bitcoin));
        if (prices.ethereum) this.emit('eth_price', parseFloat(prices.ethereum));
      } catch (e) {
        // Ignore
      }
    });

    ws.on('close', () => {
      clearTimeout(connectTimeout);
      if (staleCheck) clearInterval(staleCheck);
      this._coincapActive = false;
      this.emit('disconnected', { source: 'coincap' });
      this._reconnect('coincap', urls[0], null, null);
    });

    ws.on('error', (err) => {
      console.error('[WS] CoinCap error:', err.message);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // XRPL WEBSOCKET (on-chain data - completely free)
  // ═══════════════════════════════════════════════════════════════════════

  connectXRPL() {
    const url = 'wss://xrplcluster.com';
    this._connect('xrpl', url, (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'ledgerClosed') {
          this._handleLedgerClose(msg);
        } else if (msg.type === 'transaction') {
          this._handleXRPLTransaction(msg);
        }
      } catch (e) {
        // Ignore
      }
    }, () => {
      const ws = this.connections.xrpl;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          command: 'subscribe',
          streams: ['ledger', 'transactions']
        }));
      }
    });
  }

  _handleLedgerClose(data) {
    this.xrplMetrics.ledgerIndex = data.ledger_index;
    this.xrplMetrics.txCount = data.txn_count || 0;
    this.xrplMetrics.lastLedgerTime = data.ledger_time
      ? new Date((data.ledger_time + 946684800) * 1000).toISOString()
      : new Date().toISOString();

    this.emit('ledger', {
      index: data.ledger_index,
      txCount: data.txn_count,
      time: this.xrplMetrics.lastLedgerTime,
      fee: data.fee_base
    });
  }

  _handleXRPLTransaction(data) {
    const tx = data.transaction;
    if (!tx) return;

    switch (tx.TransactionType) {
      case 'Payment':
        this.xrplMetrics.paymentCount++;
        if (tx.Amount && typeof tx.Amount === 'string') {
          const drops = parseInt(tx.Amount);
          const xrp = drops / 1000000;
          if (xrp > 1000000) {
            this.emit('whale_alert', {
              type: 'payment',
              amount: xrp,
              from: tx.Account,
              to: tx.Destination,
              hash: tx.hash,
              timestamp: Date.now()
            });
          }
        }
        break;
      case 'EscrowCreate':
      case 'EscrowFinish':
        this.xrplMetrics.escrowCount++;
        break;
      case 'OfferCreate':
        this.xrplMetrics.offerCount++;
        break;
      case 'TrustSet':
        this.xrplMetrics.trustLineCount++;
        break;
      case 'AccountSet':
      case 'SetRegularKey':
        this.xrplMetrics.accountsCreated++;
        break;
    }

    if (data.meta?.TransactionResult === 'tesSUCCESS' && tx.Fee) {
      this.xrplMetrics.feeBurned += parseInt(tx.Fee) / 1000000;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // GENERIC CONNECTION MANAGER (for XRPL and fallback CoinCap reconnects)
  // ═══════════════════════════════════════════════════════════════════════

  _connect(name, url, onMessage, onOpen = null) {
    if (this.connections[name]) {
      try { this.connections[name].close(); } catch (e) { /* ignore */ }
    }

    console.log(`[WS] Connecting to ${name}...`);
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      console.error(`[WS] ${name} connection failed:`, e.message);
      this._reconnect(name, url, onMessage, onOpen);
      return;
    }
    this.connections[name] = ws;
    this.reconnectAttempts[name] = (this.reconnectAttempts[name] || 0);

    ws.on('open', () => {
      console.log(`[WS] Connected to ${name}`);
      this.reconnectAttempts[name] = 0;
      this.emit('connected', { source: name });
      if (onOpen) onOpen();
    });

    ws.on('message', (data) => {
      onMessage(data.toString());
    });

    ws.on('close', () => {
      this.emit('disconnected', { source: name });
      this._reconnect(name, url, onMessage, onOpen);
    });

    ws.on('error', (err) => {
      console.error(`[WS] ${name} error:`, err.message);
    });
  }

  _reconnect(name, url, onMessage, onOpen) {
    this.reconnectAttempts[name] = (this.reconnectAttempts[name] || 0) + 1;
    if (this.reconnectAttempts[name] > this.maxReconnect) {
      console.error(`[WS] ${name} max reconnect attempts reached`);
      return;
    }

    const delay = Math.min(30000, Math.pow(2, Math.min(this.reconnectAttempts[name], 10)) * 1000);
    // Only log every few attempts to reduce noise
    if (this.reconnectAttempts[name] <= 3 || this.reconnectAttempts[name] % 5 === 0) {
      console.log(`[WS] ${name} reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts[name]})`);
    }

    if (name === 'coincap') {
      // CoinCap uses its own connection logic
      setTimeout(() => this.connectCoinCap(), delay);
    } else if (onMessage) {
      setTimeout(() => this._connect(name, url, onMessage, onOpen), delay);
    }
  }

  startAll() {
    this.connectBinance();
    this.connectKraken();
    this.connectCoinCap();
    this.connectXRPL();
  }

  stopAll() {
    this.maxReconnect = 0;
    this._binanceGaveUp = true;
    this._krakenGaveUp = true;
    for (const key of Object.keys(this._heartbeats)) {
      if (this._heartbeats[key]) clearInterval(this._heartbeats[key]);
    }
    for (const [name, ws] of Object.entries(this.connections)) {
      try { ws.close(); } catch (e) { /* ignore */ }
    }
  }

  isBinanceActive() {
    return this._binanceActive;
  }

  isKrakenActive() {
    return this._krakenActive;
  }

  getSnapshot() {
    return {
      price: this.latestPrice,
      trade: this.latestTrade,
      ticker: this.ticker24h,
      orderBook: this.orderBook,
      metrics: this.metrics,
      xrpl: this.xrplMetrics,
      recentTrades: this.tradeHistory.slice(-20),
      connections: Object.keys(this.connections).reduce((acc, k) => {
        acc[k] = this.connections[k]?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected';
        return acc;
      }, {})
    };
  }
}

module.exports = RealtimeFeeds;
