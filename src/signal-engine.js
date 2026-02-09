/**
 * Advanced Multi-Factor Signal Engine
 * Generates LONG/SHORT/NEUTRAL signals for 1.68x leverage perpetuals
 *
 * 7 Factor Model:
 *   1. Social Sentiment (VADER-style) - 15%
 *   2. Technical Analysis (20+ indicators) - 25%
 *   3. Market Momentum (price action) - 15%
 *   4. News Sentiment - 10%
 *   5. On-Chain Activity (XRPL) - 10%
 *   6. Order Flow (buy/sell pressure) - 15%
 *   7. Market Regime & Correlation - 10%
 */

class SignalEngine {
  constructor() {
    this.signalHistory = [];
    this.maxHistory = 1000;
  }

  generateSignal({ sentiment, technicals, market, price, news, onChain, orderFlow, fearGreed, leverage = 1.68 }) {
    const factors = [];
    let totalScore = 0;
    let totalWeight = 0;

    // ─── 1. Social Sentiment (15%) ───────────────────────────────────
    if (sentiment) {
      const w = 15;
      let s = 0;
      // Galaxy Score contribution
      if (sentiment.galaxyScore != null) s += (sentiment.galaxyScore - 50) * 0.8;
      // Compound sentiment
      if (sentiment.compound != null) s += sentiment.compound * 40;
      // Social velocity (rapid increase in chatter = amplifier)
      if (sentiment.socialVelocity > 50) s *= 1.3;
      else if (sentiment.socialVelocity < -30) s *= 0.7;

      s = clamp(s, -100, 100);
      factors.push({ name: 'Social Sentiment', score: s, weight: w,
        detail: `Galaxy: ${sentiment.galaxyScore || '--'} | ${sentiment.label || 'N/A'} | Vol: ${sentiment.socialVolume || 0} posts`,
        icon: 'chat' });
      totalScore += s * w;
      totalWeight += w;
    }

    // ─── 2. Technical Analysis (25%) ─────────────────────────────────
    if (technicals) {
      const w = 25;
      let s = technicals.score || 0; // Already -100 to +100 from TA engine
      factors.push({ name: 'Technical Analysis', score: s, weight: w,
        detail: `${technicals.recommendation || 'N/A'} | Buy: ${technicals.buySignals || 0} Sell: ${technicals.sellSignals || 0} | RSI: ${technicals.indicators?.rsi?.value?.toFixed(1) || 'N/A'}`,
        icon: 'chart' });
      totalScore += s * w;
      totalWeight += w;
    }

    // ─── 3. Market Momentum (15%) ────────────────────────────────────
    if (market) {
      const w = 15;
      let s = 0;
      let parts = [];

      if (market.priceChange7d != null) {
        s += clamp(market.priceChange7d * 3, -40, 40);
        parts.push(`7d: ${market.priceChange7d?.toFixed(1)}%`);
      }
      if (market.priceChange30d != null) {
        s += clamp(market.priceChange30d * 1.5, -30, 30);
        parts.push(`30d: ${market.priceChange30d?.toFixed(1)}%`);
      }
      if (price?.change24h != null) {
        s += clamp(price.change24h * 5, -30, 30);
        parts.push(`24h: ${price.change24h?.toFixed(2)}%`);
      }

      s = clamp(s, -100, 100);
      factors.push({ name: 'Market Momentum', score: s, weight: w,
        detail: parts.join(' | ') || 'N/A', icon: 'trending' });
      totalScore += s * w;
      totalWeight += w;
    }

    // ─── 4. News Sentiment (10%) ─────────────────────────────────────
    if (news && news.length > 0) {
      const w = 10;
      // Use sentiment engine scores from news articles
      let newsScore = 0;
      for (const article of news.slice(0, 20)) {
        if (article.sentimentScore) newsScore += article.sentimentScore;
      }
      let s = clamp(newsScore * 5, -100, 100);
      factors.push({ name: 'News Flow', score: s, weight: w,
        detail: `${news.length} articles | Score: ${s > 0 ? '+' : ''}${s.toFixed(0)}`,
        icon: 'news' });
      totalScore += s * w;
      totalWeight += w;
    }

    // ─── 5. On-Chain Activity (10%) ──────────────────────────────────
    if (onChain) {
      const w = 10;
      let s = 0;
      // Higher tx count = more activity = bullish
      if (onChain.txCount > 10) s += 15;
      if (onChain.paymentCount > 5) s += 10;
      // Whale alerts
      if (onChain.whaleAlerts?.length > 0) {
        // Large whale movements can go either way, but generally create volatility
        s += onChain.whaleAlerts.length * 5;
      }
      // Escrow activity (Ripple releases)
      if (onChain.escrowCount > 0) s -= 5;

      s = clamp(s, -100, 100);
      factors.push({ name: 'On-Chain (XRPL)', score: s, weight: w,
        detail: `Ledger: ${onChain.ledgerIndex || 'N/A'} | Tx: ${onChain.txCount || 0} | Payments: ${onChain.paymentCount || 0}`,
        icon: 'link' });
      totalScore += s * w;
      totalWeight += w;
    }

    // ─── 6. Order Flow (15%) ─────────────────────────────────────────
    if (orderFlow) {
      const w = 15;
      let s = 0;

      // Buy/Sell pressure from Binance order book & trades
      if (orderFlow.buyPressure != null) {
        s += (orderFlow.buyPressure - 50) * 2; // 0-100 centered at 50
      }
      // Order book imbalance
      if (orderFlow.imbalance != null) {
        s += clamp(orderFlow.imbalance * 1.5, -30, 30);
      }
      // Volume ratio (buy/sell)
      if (orderFlow.volumeRatio && orderFlow.volumeRatio !== 'inf') {
        const ratio = parseFloat(orderFlow.volumeRatio);
        s += clamp((ratio - 1) * 30, -30, 30);
      }

      s = clamp(s, -100, 100);
      factors.push({ name: 'Order Flow', score: s, weight: w,
        detail: `Buy: ${orderFlow.buyPressure || 50}% | OB Imbalance: ${orderFlow.imbalance?.toFixed(1) || 0}% | Vol Ratio: ${orderFlow.volumeRatio || '--'}`,
        icon: 'flow' });
      totalScore += s * w;
      totalWeight += w;
    }

    // ─── 7. Market Regime & Macro (10%) ──────────────────────────────
    {
      const w = 10;
      let s = 0;

      // Fear & Greed (contrarian)
      if (fearGreed && fearGreed.length > 0) {
        const fg = fearGreed[0].value;
        if (fg < 20) s += 30;       // Extreme fear = contrarian buy
        else if (fg < 35) s += 15;
        else if (fg > 80) s -= 30;   // Extreme greed = contrarian sell
        else if (fg > 65) s -= 15;
      }

      // Market regime from technicals
      if (technicals?.indicators?.marketRegime) {
        const regime = technicals.indicators.marketRegime;
        if (regime.regime === 'trending_up') s += 20;
        else if (regime.regime === 'trending_down') s -= 20;
        else if (regime.regime === 'consolidating') s += 5; // Breakout potential
      }

      // CoinGecko sentiment
      if (market?.sentimentUp) {
        s += (market.sentimentUp - 50) * 0.5;
      }

      s = clamp(s, -100, 100);
      factors.push({ name: 'Market Regime', score: s, weight: w,
        detail: `F&G: ${fearGreed?.[0]?.value || '--'} (${fearGreed?.[0]?.label || '--'}) | Regime: ${technicals?.indicators?.marketRegime?.regime || 'unknown'}`,
        icon: 'globe' });
      totalScore += s * w;
      totalWeight += w;
    }

    // ─── Final Signal Calculation ────────────────────────────────────
    const rawScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const score = clamp(rawScore, -100, 100);
    const confidence = Math.min(100, Math.round(Math.abs(score)));

    // Leverage-adjusted thresholds (higher leverage = higher bar for entry)
    const leverageFactor = 1 + (leverage - 1) * 0.5;
    const strongThreshold = 40 * leverageFactor;
    const entryThreshold = 18 * leverageFactor;

    let signal, action, emoji;
    if (score > strongThreshold) {
      signal = 'STRONG LONG'; action = `Open LONG @ ${leverage}x - Strong bullish convergence across factors`; emoji = 'rocket';
    } else if (score > entryThreshold) {
      signal = 'LONG'; action = `Open LONG @ ${leverage}x - Bullish bias with moderate confidence`; emoji = 'up';
    } else if (score < -strongThreshold) {
      signal = 'STRONG SHORT'; action = `Open SHORT @ ${leverage}x - Strong bearish convergence across factors`; emoji = 'skull';
    } else if (score < -entryThreshold) {
      signal = 'SHORT'; action = `Open SHORT @ ${leverage}x - Bearish bias with moderate confidence`; emoji = 'down';
    } else {
      signal = 'NEUTRAL'; action = `HOLD / No position - Wait for clearer signal alignment`; emoji = 'pause';
    }

    // Risk management
    const risk = this._calcRisk(score, leverage, price?.price);

    const result = {
      signal, action, emoji,
      score: Math.round(score * 10) / 10,
      confidence,
      leverage,
      factors,
      risk,
      factorCount: factors.length,
      timestamp: new Date().toISOString()
    };

    this.signalHistory.push(result);
    if (this.signalHistory.length > this.maxHistory) {
      this.signalHistory = this.signalHistory.slice(-this.maxHistory);
    }

    return result;
  }

  _calcRisk(score, leverage, currentPrice) {
    if (!currentPrice) return null;
    const isLong = score > 0;
    const absScore = Math.abs(score);

    // Position sizing
    let positionPct;
    if (absScore > 60) positionPct = 20;
    else if (absScore > 40) positionPct = 15;
    else if (absScore > 20) positionPct = 10;
    else positionPct = 0;

    const effectiveExposure = positionPct * leverage;

    // Stop loss / Take profit (tighter for leverage)
    const stopPct = 3.5 / leverage;
    const tpPct = 6 / leverage;

    const stopPrice = isLong
      ? currentPrice * (1 - stopPct / 100)
      : currentPrice * (1 + stopPct / 100);
    const tpPrice = isLong
      ? currentPrice * (1 + tpPct / 100)
      : currentPrice * (1 - tpPct / 100);

    // Liquidation
    const liqPct = (1 / leverage) * 100 * 0.9; // 90% of margin
    const liqPrice = isLong
      ? currentPrice * (1 - liqPct / 100)
      : currentPrice * (1 + liqPct / 100);

    const riskReward = (tpPct / stopPct).toFixed(2);

    let riskLevel;
    if (leverage > 5) riskLevel = 'EXTREME';
    else if (leverage > 3) riskLevel = 'HIGH';
    else if (leverage > 2) riskLevel = 'MODERATE';
    else riskLevel = 'LOW-MODERATE';

    return {
      positionSize: positionPct,
      effectiveExposure: parseFloat(effectiveExposure.toFixed(1)),
      stopLoss: { pct: parseFloat(stopPct.toFixed(2)), price: parseFloat(stopPrice.toFixed(4)) },
      takeProfit: { pct: parseFloat(tpPct.toFixed(2)), price: parseFloat(tpPrice.toFixed(4)) },
      liquidation: parseFloat(liqPrice.toFixed(4)),
      riskReward: parseFloat(riskReward),
      riskLevel,
      maxLoss: parseFloat((stopPct * leverage).toFixed(2)),
      maxGain: parseFloat((tpPct * leverage).toFixed(2)),
      direction: isLong ? 'LONG' : 'SHORT'
    };
  }

  getHistory() { return this.signalHistory; }
}

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

module.exports = SignalEngine;
