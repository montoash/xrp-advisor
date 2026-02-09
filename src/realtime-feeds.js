/**
 * Real-Time Data Feeds
 * Streams live price data from exchange WebSockets
 * No API keys required - uses public endpoints
 *
 * Sources:
 *   - Binance WebSocket (XRP/USDT trades + order book)
 *   - CoinCap WebSocket (real-time prices)
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
  // BINANCE PUBLIC WEBSOCKET (real-time XRP/USDT)
  // ═══════════════════════════════════════════════════════════════════════

  connectBinance() {
    const url = 'wss://stream.binance.com:9443/stream?streams=xrpusdt@trade/xrpusdt@ticker/xrpusdt@depth5@100ms';
    this._connect('binance', url, (data) => {
      try {
        const parsed = JSON.parse(data);
        const stream = parsed.stream;
        const payload = parsed.data;

        if (stream === 'xrpusdt@trade') {
          this._handleBinanceTrade(payload);
        } else if (stream === 'xrpusdt@ticker') {
          this._handleBinanceTicker(payload);
        } else if (stream.includes('depth')) {
          this._handleBinanceDepth(payload);
        }
      } catch (e) {
        // Ignore parse errors
      }
    });
  }

  _handleBinanceTrade(data) {
    const trade = {
      price: parseFloat(data.p),
      quantity: parseFloat(data.q),
      value: parseFloat(data.p) * parseFloat(data.q),
      side: data.m ? 'sell' : 'buy', // m = is market maker (buyer is maker = sell)
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

    // Calculate order book imbalance
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
  // COINCAP WEBSOCKET (backup price feed)
  // ═══════════════════════════════════════════════════════════════════════

  connectCoinCap() {
    const url = 'wss://ws.coincap.io/prices?assets=xrp,bitcoin,ethereum';
    this._connect('coincap', url, (data) => {
      try {
        const prices = JSON.parse(data);
        if (prices.xrp) {
          const price = parseFloat(prices.xrp);
          if (!this.latestPrice) this.latestPrice = price;
          this.emit('price_backup', { price, source: 'coincap', timestamp: Date.now() });
        }
        // BTC/ETH for correlation
        if (prices.bitcoin) this.emit('btc_price', parseFloat(prices.bitcoin));
        if (prices.ethereum) this.emit('eth_price', parseFloat(prices.ethereum));
      } catch (e) {
        // Ignore
      }
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
      // On connect, subscribe to ledger and transactions
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
        // Check for large XRP payments (whale alert)
        if (tx.Amount && typeof tx.Amount === 'string') {
          const drops = parseInt(tx.Amount);
          const xrp = drops / 1000000;
          if (xrp > 1000000) { // 1M+ XRP
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

    // Track fee burns
    if (data.meta?.TransactionResult === 'tesSUCCESS' && tx.Fee) {
      this.xrplMetrics.feeBurned += parseInt(tx.Fee) / 1000000;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CONNECTION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════

  _connect(name, url, onMessage, onOpen = null) {
    if (this.connections[name]) {
      try { this.connections[name].close(); } catch (e) { /* ignore */ }
    }

    console.log(`[WS] Connecting to ${name}...`);
    const ws = new WebSocket(url);
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
      console.log(`[WS] ${name} disconnected`);
      this.emit('disconnected', { source: name });
      this._reconnect(name, url, onMessage, onOpen);
    });

    ws.on('error', (err) => {
      console.error(`[WS] ${name} error:`, err.message);
      // Don't close here - the close event will fire
    });
  }

  _reconnect(name, url, onMessage, onOpen) {
    this.reconnectAttempts[name] = (this.reconnectAttempts[name] || 0) + 1;
    if (this.reconnectAttempts[name] > this.maxReconnect) {
      console.error(`[WS] ${name} max reconnect attempts reached`);
      return;
    }

    const delay = Math.min(30000, Math.pow(2, Math.min(this.reconnectAttempts[name], 10)) * 1000);
    console.log(`[WS] ${name} reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts[name]})`);
    setTimeout(() => this._connect(name, url, onMessage, onOpen), delay);
  }

  startAll() {
    this.connectBinance();
    this.connectCoinCap();
    this.connectXRPL();
  }

  stopAll() {
    for (const [name, ws] of Object.entries(this.connections)) {
      try {
        this.maxReconnect = 0; // Prevent reconnect
        ws.close();
      } catch (e) { /* ignore */ }
    }
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
