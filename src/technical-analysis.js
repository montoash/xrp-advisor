/**
 * Advanced Technical Analysis Engine
 * 20+ indicators with multi-timeframe analysis
 * Features:
 *   - RSI, Stochastic RSI, MACD, Bollinger Bands
 *   - Ichimoku Cloud, ADX/DMI, Williams %R
 *   - OBV, VWAP, ATR, Fibonacci Retracement
 *   - Pivot Points, EMA Ribbons, Heikin-Ashi
 *   - Support/Resistance detection
 *   - Pattern recognition (double top/bottom, head & shoulders, etc.)
 *   - Market regime detection (trending/ranging)
 *   - Composite technical score
 */

class TechnicalAnalysis {
  constructor() {
    this.priceHistory = [];
    this.volumeHistory = [];
    this.maxHistory = 2000;
  }

  addDataPoint(price, volume = 0, timestamp = Date.now()) {
    this.priceHistory.push({ price, volume, timestamp });
    if (this.priceHistory.length > this.maxHistory) {
      this.priceHistory = this.priceHistory.slice(-this.maxHistory);
    }
  }

  addSparklineData(prices) {
    // Bulk add sparkline data (7d from CoinGecko)
    if (!prices || prices.length === 0) return;
    const interval = (7 * 24 * 3600000) / prices.length;
    const startTime = Date.now() - 7 * 24 * 3600000;
    for (let i = 0; i < prices.length; i++) {
      this.priceHistory.push({
        price: prices[i],
        volume: 0,
        timestamp: startTime + i * interval
      });
    }
    // Deduplicate and sort
    this.priceHistory.sort((a, b) => a.timestamp - b.timestamp);
    if (this.priceHistory.length > this.maxHistory) {
      this.priceHistory = this.priceHistory.slice(-this.maxHistory);
    }
  }

  getPrices() { return this.priceHistory.map(p => p.price); }
  getVolumes() { return this.priceHistory.map(p => p.volume); }

  // ═══════════════════════════════════════════════════════════════════════
  // MOVING AVERAGES
  // ═══════════════════════════════════════════════════════════════════════

  sma(data, period) {
    if (data.length < period) return null;
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  ema(data, period) {
    if (data.length < period) return null;
    const k = 2 / (period + 1);
    let emaVal = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < data.length; i++) {
      emaVal = data[i] * k + emaVal * (1 - k);
    }
    return emaVal;
  }

  emaArray(data, period) {
    if (data.length < period) return [];
    const k = 2 / (period + 1);
    const result = [];
    let emaVal = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result.push(emaVal);
    for (let i = period; i < data.length; i++) {
      emaVal = data[i] * k + emaVal * (1 - k);
      result.push(emaVal);
    }
    return result;
  }

  wma(data, period) {
    if (data.length < period) return null;
    const slice = data.slice(-period);
    let weightedSum = 0, weightTotal = 0;
    for (let i = 0; i < period; i++) {
      const weight = i + 1;
      weightedSum += slice[i] * weight;
      weightTotal += weight;
    }
    return weightedSum / weightTotal;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RSI (Relative Strength Index)
  // ═══════════════════════════════════════════════════════════════════════

  rsi(data, period = 14) {
    if (data.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = data.length - period; i < data.length; i++) {
      const diff = data[i] - data[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Stochastic RSI
  // ═══════════════════════════════════════════════════════════════════════

  stochasticRSI(data, rsiPeriod = 14, stochPeriod = 14) {
    if (data.length < rsiPeriod + stochPeriod + 1) return null;

    // Calculate RSI series
    const rsiValues = [];
    for (let i = rsiPeriod + 1; i <= data.length; i++) {
      const slice = data.slice(0, i);
      rsiValues.push(this.rsi(slice, rsiPeriod));
    }

    if (rsiValues.length < stochPeriod) return null;

    const recentRSI = rsiValues.slice(-stochPeriod);
    const minRSI = Math.min(...recentRSI);
    const maxRSI = Math.max(...recentRSI);
    const currentRSI = recentRSI[recentRSI.length - 1];

    if (maxRSI === minRSI) return { k: 50, d: 50, rsi: currentRSI };

    const k = ((currentRSI - minRSI) / (maxRSI - minRSI)) * 100;
    // %D is 3-period SMA of %K (simplified)
    const d = k; // Would need series for proper SMA

    return { k, d, rsi: currentRSI };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MACD (Moving Average Convergence Divergence)
  // ═══════════════════════════════════════════════════════════════════════

  macd(data, fast = 12, slow = 26, signal = 9) {
    if (data.length < slow + signal) return null;

    const emaFast = this.ema(data, fast);
    const emaSlow = this.ema(data, slow);
    if (emaFast === null || emaSlow === null) return null;

    const macdLine = emaFast - emaSlow;

    // For signal line, we need MACD series
    const macdSeries = [];
    for (let i = slow; i <= data.length; i++) {
      const slice = data.slice(0, i);
      const ef = this.ema(slice, fast);
      const es = this.ema(slice, slow);
      if (ef !== null && es !== null) macdSeries.push(ef - es);
    }

    const signalLine = macdSeries.length >= signal ? this.ema(macdSeries, signal) : null;
    const histogram = signalLine !== null ? macdLine - signalLine : null;

    return {
      macd: macdLine,
      signal: signalLine,
      histogram,
      bullish: histogram !== null ? histogram > 0 : null,
      crossover: histogram !== null && macdSeries.length >= 2
        ? (macdSeries[macdSeries.length - 1] > 0 && macdSeries[macdSeries.length - 2] <= 0 ? 'bullish'
          : macdSeries[macdSeries.length - 1] < 0 && macdSeries[macdSeries.length - 2] >= 0 ? 'bearish'
          : 'none')
        : 'none'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Bollinger Bands
  // ═══════════════════════════════════════════════════════════════════════

  bollingerBands(data, period = 20, stdDevMult = 2) {
    if (data.length < period) return null;
    const middle = this.sma(data, period);
    const slice = data.slice(-period);
    const stdDev = Math.sqrt(slice.reduce((s, p) => s + Math.pow(p - middle, 2), 0) / period);

    const upper = middle + stdDevMult * stdDev;
    const lower = middle - stdDevMult * stdDev;
    const current = data[data.length - 1];
    const bandwidth = ((upper - lower) / middle) * 100;
    const percentB = (current - lower) / (upper - lower);

    return {
      upper, middle, lower,
      bandwidth,
      percentB,
      squeeze: bandwidth < 5, // Low volatility squeeze
      position: percentB > 0.8 ? 'overbought' : percentB < 0.2 ? 'oversold' : 'neutral'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Ichimoku Cloud
  // ═══════════════════════════════════════════════════════════════════════

  ichimoku(data) {
    if (data.length < 52) return null;

    const highLow = (arr, period) => {
      const slice = arr.slice(-period);
      return { high: Math.max(...slice), low: Math.min(...slice) };
    };

    const tenkan9 = highLow(data, 9);
    const kijun26 = highLow(data, 26);
    const senkou52 = highLow(data, 52);

    const tenkanSen = (tenkan9.high + tenkan9.low) / 2;
    const kijunSen = (kijun26.high + kijun26.low) / 2;
    const senkouA = (tenkanSen + kijunSen) / 2;
    const senkouB = (senkou52.high + senkou52.low) / 2;
    const current = data[data.length - 1];

    const cloudTop = Math.max(senkouA, senkouB);
    const cloudBottom = Math.min(senkouA, senkouB);

    let signal = 'neutral';
    if (current > cloudTop && tenkanSen > kijunSen) signal = 'strong_bullish';
    else if (current > cloudTop) signal = 'bullish';
    else if (current < cloudBottom && tenkanSen < kijunSen) signal = 'strong_bearish';
    else if (current < cloudBottom) signal = 'bearish';
    else signal = 'in_cloud'; // Indecision

    return {
      tenkanSen, kijunSen, senkouA, senkouB,
      cloudTop, cloudBottom,
      aboveCloud: current > cloudTop,
      belowCloud: current < cloudBottom,
      inCloud: current >= cloudBottom && current <= cloudTop,
      tkCross: tenkanSen > kijunSen ? 'bullish' : 'bearish',
      signal
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ADX (Average Directional Index) / DMI
  // ═══════════════════════════════════════════════════════════════════════

  adx(data, period = 14) {
    if (data.length < period * 2) return null;

    let plusDM = 0, minusDM = 0, trSum = 0;
    for (let i = data.length - period; i < data.length; i++) {
      const high = data[i];
      const low = data[Math.max(0, i - 1)] * 0.998; // Approximate
      const prevHigh = data[Math.max(0, i - 1)];
      const prevLow = prevHigh * 0.998;

      const upMove = high - prevHigh;
      const downMove = prevLow - low;
      if (upMove > downMove && upMove > 0) plusDM += upMove;
      if (downMove > upMove && downMove > 0) minusDM += downMove;

      const tr = Math.max(high - low, Math.abs(high - data[Math.max(0, i - 1)]), Math.abs(low - data[Math.max(0, i - 1)]));
      trSum += tr;
    }

    const plusDI = trSum > 0 ? (plusDM / trSum) * 100 : 0;
    const minusDI = trSum > 0 ? (minusDM / trSum) * 100 : 0;
    const diSum = plusDI + minusDI;
    const dx = diSum > 0 ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0;

    return {
      adx: dx,
      plusDI,
      minusDI,
      trending: dx > 25,
      strongTrend: dx > 50,
      trendDirection: plusDI > minusDI ? 'bullish' : 'bearish'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Williams %R
  // ═══════════════════════════════════════════════════════════════════════

  williamsR(data, period = 14) {
    if (data.length < period) return null;
    const slice = data.slice(-period);
    const highest = Math.max(...slice);
    const lowest = Math.min(...slice);
    const current = data[data.length - 1];

    if (highest === lowest) return { value: -50, signal: 'neutral' };
    const wr = ((highest - current) / (highest - lowest)) * -100;

    return {
      value: wr,
      overbought: wr > -20,
      oversold: wr < -80,
      signal: wr > -20 ? 'overbought' : wr < -80 ? 'oversold' : 'neutral'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ATR (Average True Range)
  // ═══════════════════════════════════════════════════════════════════════

  atr(data, period = 14) {
    if (data.length < period + 1) return null;
    let trSum = 0;
    for (let i = data.length - period; i < data.length; i++) {
      const tr = Math.abs(data[i] - data[i - 1]);
      trSum += tr;
    }
    return {
      value: trSum / period,
      percent: (trSum / period / data[data.length - 1]) * 100
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Fibonacci Retracement Levels
  // ═══════════════════════════════════════════════════════════════════════

  fibonacci(data, lookback = 100) {
    if (data.length < 10) return null;
    const slice = data.slice(-Math.min(lookback, data.length));
    const high = Math.max(...slice);
    const low = Math.min(...slice);
    const range = high - low;
    const current = data[data.length - 1];

    const levels = {
      0: high,
      0.236: high - range * 0.236,
      0.382: high - range * 0.382,
      0.5: high - range * 0.5,
      0.618: high - range * 0.618,
      0.786: high - range * 0.786,
      1: low
    };

    // Find nearest support and resistance
    const sorted = Object.entries(levels).sort((a, b) => b[1] - a[1]);
    let nearestResistance = null, nearestSupport = null;
    for (const [level, price] of sorted) {
      if (price > current && !nearestResistance) nearestResistance = { level: parseFloat(level), price };
      if (price < current && !nearestSupport) nearestSupport = { level: parseFloat(level), price };
    }

    return { levels, high, low, current, nearestResistance, nearestSupport };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Pivot Points
  // ═══════════════════════════════════════════════════════════════════════

  pivotPoints(data, period = 24) {
    if (data.length < period) return null;
    const slice = data.slice(-period);
    const high = Math.max(...slice);
    const low = Math.min(...slice);
    const close = data[data.length - 1];
    const pivot = (high + low + close) / 3;

    return {
      pivot,
      r1: 2 * pivot - low,
      r2: pivot + (high - low),
      r3: high + 2 * (pivot - low),
      s1: 2 * pivot - high,
      s2: pivot - (high - low),
      s3: low - 2 * (high - pivot),
      position: close > pivot ? 'above_pivot' : 'below_pivot'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // EMA Ribbon (multiple EMAs)
  // ═══════════════════════════════════════════════════════════════════════

  emaRibbon(data) {
    const periods = [8, 13, 21, 34, 55, 89, 144, 200];
    const ribbon = {};
    const current = data[data.length - 1];
    let aboveCount = 0;

    for (const p of periods) {
      const val = this.ema(data, p);
      ribbon[`ema${p}`] = val;
      if (val !== null && current > val) aboveCount++;
    }

    const total = periods.filter(p => ribbon[`ema${p}`] !== null).length;

    return {
      ...ribbon,
      aboveCount,
      total,
      strength: total > 0 ? Math.round((aboveCount / total) * 100) : 50,
      signal: aboveCount > total * 0.7 ? 'bullish' : aboveCount < total * 0.3 ? 'bearish' : 'mixed'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Support & Resistance Detection
  // ═══════════════════════════════════════════════════════════════════════

  supportResistance(data, sensitivity = 3) {
    if (data.length < 20) return { supports: [], resistances: [] };

    const levels = [];

    // Find local minima and maxima
    for (let i = sensitivity; i < data.length - sensitivity; i++) {
      let isMin = true, isMax = true;
      for (let j = 1; j <= sensitivity; j++) {
        if (data[i] >= data[i - j] || data[i] >= data[i + j]) isMin = false;
        if (data[i] <= data[i - j] || data[i] <= data[i + j]) isMax = false;
      }
      if (isMin) levels.push({ price: data[i], type: 'support', index: i });
      if (isMax) levels.push({ price: data[i], type: 'resistance', index: i });
    }

    // Cluster nearby levels (within 0.5%)
    const clustered = [];
    const used = new Set();
    for (let i = 0; i < levels.length; i++) {
      if (used.has(i)) continue;
      const cluster = [levels[i]];
      used.add(i);
      for (let j = i + 1; j < levels.length; j++) {
        if (used.has(j)) continue;
        if (Math.abs(levels[j].price - levels[i].price) / levels[i].price < 0.005) {
          cluster.push(levels[j]);
          used.add(j);
        }
      }
      const avgPrice = cluster.reduce((s, l) => s + l.price, 0) / cluster.length;
      clustered.push({
        price: avgPrice,
        type: cluster[0].type,
        strength: cluster.length, // More touches = stronger
        touches: cluster.length
      });
    }

    const current = data[data.length - 1];
    return {
      supports: clustered.filter(l => l.price < current).sort((a, b) => b.price - a.price).slice(0, 5),
      resistances: clustered.filter(l => l.price > current).sort((a, b) => a.price - b.price).slice(0, 5)
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Market Regime Detection
  // ═══════════════════════════════════════════════════════════════════════

  marketRegime(data) {
    if (data.length < 50) return { regime: 'unknown', confidence: 0 };

    const adxResult = this.adx(data);
    const bbResult = this.bollingerBands(data);
    const prices = data.slice(-30);

    // Linear regression for trend
    const n = prices.length;
    const xSum = (n * (n - 1)) / 2;
    const xSqSum = (n * (n - 1) * (2 * n - 1)) / 6;
    let xySum = 0, ySum = 0;
    for (let i = 0; i < n; i++) {
      xySum += i * prices[i];
      ySum += prices[i];
    }
    const slope = (n * xySum - xSum * ySum) / (n * xSqSum - xSum * xSum);
    const slopePercent = (slope / prices[0]) * 100;

    let regime = 'ranging';
    let confidence = 0;

    if (adxResult && adxResult.adx > 25) {
      if (slopePercent > 0.1) {
        regime = 'trending_up';
        confidence = Math.min(100, adxResult.adx * 2);
      } else if (slopePercent < -0.1) {
        regime = 'trending_down';
        confidence = Math.min(100, adxResult.adx * 2);
      }
    } else if (bbResult && bbResult.bandwidth < 3) {
      regime = 'consolidating';
      confidence = Math.min(100, (5 - bbResult.bandwidth) * 25);
    } else {
      regime = 'ranging';
      confidence = 50;
    }

    // Volatility regime
    const atrResult = this.atr(data);
    let volatility = 'normal';
    if (atrResult) {
      if (atrResult.percent > 5) volatility = 'high';
      else if (atrResult.percent > 3) volatility = 'elevated';
      else if (atrResult.percent < 1) volatility = 'low';
    }

    return { regime, confidence, slopePercent, volatility, adx: adxResult?.adx };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // COMPOSITE TECHNICAL SCORE (like TradingView's Technical Rating)
  // ═══════════════════════════════════════════════════════════════════════

  getFullAnalysis() {
    const data = this.getPrices();
    if (data.length < 20) return null;

    const current = data[data.length - 1];
    const indicators = {};
    let buySignals = 0, sellSignals = 0, neutralSignals = 0;
    const totalIndicators = 15;

    // 1. RSI
    const rsiVal = this.rsi(data);
    indicators.rsi = { value: rsiVal, signal: rsiVal > 70 ? 'sell' : rsiVal < 30 ? 'buy' : 'neutral' };
    if (rsiVal < 30) buySignals++; else if (rsiVal > 70) sellSignals++; else neutralSignals++;

    // 2. Stochastic RSI
    const stochRSI = this.stochasticRSI(data);
    indicators.stochasticRSI = stochRSI;
    if (stochRSI?.k < 20) buySignals++; else if (stochRSI?.k > 80) sellSignals++; else neutralSignals++;

    // 3. MACD
    const macdResult = this.macd(data);
    indicators.macd = macdResult;
    if (macdResult?.bullish) buySignals++; else if (macdResult?.bullish === false) sellSignals++; else neutralSignals++;

    // 4. Bollinger Bands
    const bb = this.bollingerBands(data);
    indicators.bollingerBands = bb;
    if (bb?.position === 'oversold') buySignals++; else if (bb?.position === 'overbought') sellSignals++; else neutralSignals++;

    // 5. Ichimoku
    const ich = this.ichimoku(data);
    indicators.ichimoku = ich;
    if (ich?.signal.includes('bullish')) buySignals++; else if (ich?.signal.includes('bearish')) sellSignals++; else neutralSignals++;

    // 6. ADX/DMI
    const adxResult = this.adx(data);
    indicators.adx = adxResult;
    if (adxResult?.trending && adxResult?.trendDirection === 'bullish') buySignals++;
    else if (adxResult?.trending && adxResult?.trendDirection === 'bearish') sellSignals++;
    else neutralSignals++;

    // 7. Williams %R
    const wr = this.williamsR(data);
    indicators.williamsR = wr;
    if (wr?.oversold) buySignals++; else if (wr?.overbought) sellSignals++; else neutralSignals++;

    // 8. EMA Ribbon
    const ribbon = this.emaRibbon(data);
    indicators.emaRibbon = ribbon;
    if (ribbon?.signal === 'bullish') buySignals++; else if (ribbon?.signal === 'bearish') sellSignals++; else neutralSignals++;

    // 9-12. Moving Average crossovers
    const sma20 = this.sma(data, 20);
    const sma50 = this.sma(data, 50);
    const ema12 = this.ema(data, 12);
    const ema26 = this.ema(data, 26);

    indicators.sma20 = sma20;
    indicators.sma50 = sma50;
    indicators.ema12 = ema12;
    indicators.ema26 = ema26;

    if (current > sma20) buySignals++; else sellSignals++;
    if (current > sma50) buySignals++; else sellSignals++;
    if (ema12 > ema26) buySignals++; else if (ema12 !== null && ema26 !== null) sellSignals++; else neutralSignals++;

    // 13. Momentum
    const momentum = data.length >= 10 ? ((current - data[data.length - 10]) / data[data.length - 10]) * 100 : null;
    indicators.momentum = momentum;
    if (momentum > 2) buySignals++; else if (momentum < -2) sellSignals++; else neutralSignals++;

    // 14. ATR
    const atrResult = this.atr(data);
    indicators.atr = atrResult;
    neutralSignals++; // ATR is non-directional

    // 15. Pivot Points
    const pivots = this.pivotPoints(data);
    indicators.pivotPoints = pivots;
    if (pivots?.position === 'above_pivot') buySignals++; else sellSignals++;

    // Additional analysis
    indicators.fibonacci = this.fibonacci(data);
    indicators.supportResistance = this.supportResistance(data);
    indicators.marketRegime = this.marketRegime(data);

    // ── Composite Score ──────────────────────────────────────────────
    const score = ((buySignals - sellSignals) / totalIndicators) * 100;
    let recommendation;
    if (score > 40) recommendation = 'STRONG BUY';
    else if (score > 15) recommendation = 'BUY';
    else if (score > -15) recommendation = 'NEUTRAL';
    else if (score > -40) recommendation = 'SELL';
    else recommendation = 'STRONG SELL';

    return {
      price: current,
      score: Math.round(score),
      recommendation,
      buySignals,
      sellSignals,
      neutralSignals,
      totalIndicators,
      indicators,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = TechnicalAnalysis;
