/**
 * XRP Perpetual Trade Signal Engine
 * Generates LONG/SHORT/NEUTRAL signals for perpetual futures
 * with configurable leverage (default 1.68x)
 */

class SignalEngine {
  constructor() {
    this.signalHistory = [];
    this.maxHistory = 500;
  }

  generateSignal({ price, market, sentiment, technicals, leverage = 1.68 }) {
    const factors = [];
    let totalScore = 0;
    let totalWeight = 0;

    // ─── 1. Social Sentiment Score (weight: 25%) ─────────────────────
    if (sentiment) {
      const sentWeight = 25;
      let sentScore = 0;

      // Reddit community sentiment
      if (sentiment.score !== undefined) {
        sentScore = Math.max(-100, Math.min(100, sentiment.score));
      }

      // Fear & Greed Index
      if (sentiment.fearGreed && sentiment.fearGreed.length > 0) {
        const fg = sentiment.fearGreed[0].value;
        // Contrarian: extreme fear = bullish, extreme greed = bearish
        const fgSignal = fg < 25 ? 30 : fg < 40 ? 15 : fg > 75 ? -30 : fg > 60 ? -15 : 0;
        sentScore = (sentScore + fgSignal) / 2;
      }

      // CoinGecko community sentiment
      if (market?.sentimentUp) {
        const cgSent = (market.sentimentUp - 50) * 2; // normalize to -100 to +100
        sentScore = (sentScore * 2 + cgSent) / 3;
      }

      factors.push({
        name: 'Social Sentiment',
        score: sentScore,
        weight: sentWeight,
        detail: sentiment.label || 'Unknown'
      });
      totalScore += sentScore * sentWeight;
      totalWeight += sentWeight;
    }

    // ─── 2. Technical Indicators (weight: 35%) ───────────────────────
    if (technicals) {
      const techWeight = 35;
      let techScore = 0;
      let techFactors = 0;

      // RSI
      if (technicals.rsi !== null) {
        let rsiSignal = 0;
        if (technicals.rsi < 30) rsiSignal = 60;       // Oversold = bullish
        else if (technicals.rsi < 40) rsiSignal = 30;
        else if (technicals.rsi > 70) rsiSignal = -60;  // Overbought = bearish
        else if (technicals.rsi > 60) rsiSignal = -30;
        else rsiSignal = 0;
        techScore += rsiSignal;
        techFactors++;
      }

      // MACD
      if (technicals.macd !== null) {
        const macdSignal = technicals.macd > 0 ? 40 : technicals.macd < 0 ? -40 : 0;
        techScore += macdSignal;
        techFactors++;
      }

      // Price vs SMA20 (trend)
      if (technicals.priceVsSMA20 !== null) {
        const trendSignal = Math.max(-50, Math.min(50, technicals.priceVsSMA20 * 10));
        techScore += trendSignal;
        techFactors++;
      }

      // Bollinger Band position
      if (technicals.bollingerUpper && technicals.bollingerLower) {
        const bbRange = technicals.bollingerUpper - technicals.bollingerLower;
        if (bbRange > 0) {
          const bbPos = (technicals.price - technicals.bollingerLower) / bbRange;
          let bbSignal = 0;
          if (bbPos < 0.1) bbSignal = 50;        // Near lower band = buy
          else if (bbPos < 0.3) bbSignal = 25;
          else if (bbPos > 0.9) bbSignal = -50;   // Near upper band = sell
          else if (bbPos > 0.7) bbSignal = -25;
          techScore += bbSignal;
          techFactors++;
        }
      }

      // Momentum
      if (technicals.momentum !== null) {
        const momSignal = Math.max(-40, Math.min(40, technicals.momentum * 5));
        techScore += momSignal;
        techFactors++;
      }

      if (techFactors > 0) {
        techScore = techScore / techFactors;
      }

      factors.push({
        name: 'Technical Analysis',
        score: techScore,
        weight: techWeight,
        detail: `RSI: ${technicals.rsi?.toFixed(1) || 'N/A'}, MACD: ${technicals.macd?.toFixed(6) || 'N/A'}`
      });
      totalScore += techScore * techWeight;
      totalWeight += techWeight;
    }

    // ─── 3. Market Data / Price Action (weight: 25%) ─────────────────
    if (price || market) {
      const mktWeight = 25;
      let mktScore = 0;
      let mktFactors = 0;

      // 24h change
      if (price?.change24h) {
        const change = Math.max(-50, Math.min(50, price.change24h * 5));
        mktScore += change;
        mktFactors++;
      }

      // 7d change momentum
      if (market?.priceChange7d) {
        const weekChange = Math.max(-40, Math.min(40, market.priceChange7d * 3));
        mktScore += weekChange;
        mktFactors++;
      }

      // 30d trend
      if (market?.priceChange30d) {
        const monthChange = Math.max(-30, Math.min(30, market.priceChange30d * 2));
        mktScore += monthChange;
        mktFactors++;
      }

      // Volume analysis (high volume confirms trend)
      if (price?.volume24h && price.volume24h > 0) {
        // We don't have historical volume so just note it
        mktFactors++;
      }

      if (mktFactors > 0) {
        mktScore = mktScore / mktFactors;
      }

      factors.push({
        name: 'Market Momentum',
        score: mktScore,
        weight: mktWeight,
        detail: `24h: ${price?.change24h?.toFixed(2) || 'N/A'}%, 7d: ${market?.priceChange7d?.toFixed(2) || 'N/A'}%`
      });
      totalScore += mktScore * mktWeight;
      totalWeight += mktWeight;
    }

    // ─── 4. News Sentiment / Social Volume (weight: 15%) ─────────────
    if (sentiment) {
      const newsWeight = 15;
      let newsScore = 0;

      // Bullish/bearish ratio from posts
      if (sentiment.total > 0) {
        const bullBearRatio = (sentiment.bullishPercent - sentiment.bearishPercent);
        newsScore = Math.max(-60, Math.min(60, bullBearRatio * 1.5));
      }

      // Social volume factor
      if (sentiment.cryptoCompare) {
        const postsPerDay = sentiment.cryptoCompare.redditPostsPerDay || 0;
        // High social volume amplifies the direction
        if (postsPerDay > 100 && newsScore > 0) newsScore *= 1.2;
        if (postsPerDay > 100 && newsScore < 0) newsScore *= 1.2;
      }

      factors.push({
        name: 'News & Social Volume',
        score: newsScore,
        weight: newsWeight,
        detail: `Posts: ${sentiment.total}, Bull: ${sentiment.bullishPercent}%, Bear: ${sentiment.bearishPercent}%`
      });
      totalScore += newsScore * newsWeight;
      totalWeight += newsWeight;
    }

    // ─── Calculate Final Signal ──────────────────────────────────────
    const rawScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const normalizedScore = Math.max(-100, Math.min(100, rawScore));

    // Confidence = how strong the signal is (0-100)
    const confidence = Math.min(100, Math.round(Math.abs(normalizedScore)));

    // Signal thresholds (adjusted for leverage risk)
    // Higher leverage = need stronger conviction
    const leverageRiskFactor = 1 + (leverage - 1) * 0.5;
    const longThreshold = 15 * leverageRiskFactor;
    const shortThreshold = -15 * leverageRiskFactor;
    const strongThreshold = 35 * leverageRiskFactor;

    let signal = 'NEUTRAL';
    let action = 'HOLD - Wait for clearer signal';

    if (normalizedScore > strongThreshold) {
      signal = 'STRONG LONG';
      action = `LONG XRP Perp @ ${leverage}x leverage - Strong bullish convergence`;
    } else if (normalizedScore > longThreshold) {
      signal = 'LONG';
      action = `LONG XRP Perp @ ${leverage}x leverage - Bullish bias`;
    } else if (normalizedScore < -strongThreshold) {
      signal = 'STRONG SHORT';
      action = `SHORT XRP Perp @ ${leverage}x leverage - Strong bearish convergence`;
    } else if (normalizedScore < shortThreshold) {
      signal = 'SHORT';
      action = `SHORT XRP Perp @ ${leverage}x leverage - Bearish bias`;
    }

    // Risk management for leveraged position
    const riskMetrics = this.calculateRisk(normalizedScore, leverage, price);

    const result = {
      signal,
      action,
      score: Math.round(normalizedScore * 10) / 10,
      confidence,
      leverage,
      factors,
      risk: riskMetrics,
      timestamp: new Date().toISOString()
    };

    this.signalHistory.push(result);
    if (this.signalHistory.length > this.maxHistory) {
      this.signalHistory = this.signalHistory.slice(-this.maxHistory);
    }

    return result;
  }

  calculateRisk(score, leverage, price) {
    const currentPrice = price?.price || 0;

    // Position sizing recommendation (% of portfolio)
    let positionSize;
    const absScore = Math.abs(score);
    if (absScore > 50) positionSize = 15;
    else if (absScore > 30) positionSize = 10;
    else if (absScore > 15) positionSize = 5;
    else positionSize = 0;

    // Effective exposure
    const effectiveExposure = positionSize * leverage;

    // Stop loss (tighter for leveraged positions)
    const baseSL = 3; // 3% base
    const stopLossPercent = baseSL / leverage;
    const stopLossPrice = score > 0
      ? currentPrice * (1 - stopLossPercent / 100)
      : currentPrice * (1 + stopLossPercent / 100);

    // Take profit
    const baseTP = 5; // 5% base
    const takeProfitPercent = baseTP / leverage;
    const takeProfitPrice = score > 0
      ? currentPrice * (1 + takeProfitPercent / 100)
      : currentPrice * (1 - takeProfitPercent / 100);

    // Liquidation price approximation
    const liquidationPercent = 100 / leverage;
    const liquidationPrice = score > 0
      ? currentPrice * (1 - liquidationPercent / 100)
      : currentPrice * (1 + liquidationPercent / 100);

    // Risk/Reward ratio
    const riskReward = stopLossPercent > 0 ? (takeProfitPercent / stopLossPercent).toFixed(2) : 'N/A';

    // Overall risk level
    let riskLevel = 'LOW';
    if (leverage > 5) riskLevel = 'EXTREME';
    else if (leverage > 3) riskLevel = 'HIGH';
    else if (leverage > 2) riskLevel = 'MODERATE';
    else if (leverage > 1) riskLevel = 'LOW-MODERATE';

    return {
      positionSize: `${positionSize}% of portfolio`,
      effectiveExposure: `${effectiveExposure.toFixed(1)}%`,
      leverage: `${leverage}x`,
      stopLoss: {
        percent: `${stopLossPercent.toFixed(2)}%`,
        price: stopLossPrice ? `$${stopLossPrice.toFixed(4)}` : 'N/A'
      },
      takeProfit: {
        percent: `${takeProfitPercent.toFixed(2)}%`,
        price: takeProfitPrice ? `$${takeProfitPrice.toFixed(4)}` : 'N/A'
      },
      liquidationPrice: liquidationPrice ? `$${liquidationPrice.toFixed(4)}` : 'N/A',
      riskReward,
      riskLevel,
      maxLoss: `${(stopLossPercent * leverage).toFixed(2)}% of position`,
      maxGain: `${(takeProfitPercent * leverage).toFixed(2)}% of position`
    };
  }

  getHistory() {
    return this.signalHistory;
  }
}

module.exports = SignalEngine;
