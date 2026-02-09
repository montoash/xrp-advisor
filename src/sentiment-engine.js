/**
 * Advanced Sentiment Engine
 * VADER-inspired valence-aware sentiment analysis for crypto/XRP text
 * Features:
 *   - Intensity modifiers (boosters/dampeners)
 *   - Negation handling
 *   - Emoji sentiment
 *   - Crypto-specific lexicon with weighted scores
 *   - Context-aware phrase detection
 *   - Engagement-weighted aggregation
 *   - Time-decay weighting (recent posts matter more)
 *   - Social velocity detection (sudden volume spikes)
 */

// Crypto-specific sentiment lexicon with intensity scores (-5 to +5)
const LEXICON = {
  // ── Extremely Bullish (+4 to +5) ──
  'mooning': 5, 'parabolic': 5, 'skyrocketing': 5, 'exploding': 4.5,
  'moonshot': 5, '100x': 5, '10x': 4, 'to the moon': 5, 'generational wealth': 5,
  'life changing': 4.5, 'lambo': 4, 'face melting': 4.5, 'god candle': 5,
  'mega pump': 5, 'send it': 4, 'ultra bullish': 5, 'insanely bullish': 5,

  // ── Very Bullish (+3 to +4) ──
  'bullish': 3.5, 'bull run': 4, 'breakout': 3.5, 'moon': 3, 'pump': 3,
  'surge': 3.5, 'rally': 3.5, 'soar': 3.5, 'rocket': 3.5, 'blast off': 4,
  'accumulate': 3, 'diamond hands': 3.5, 'hodl': 3, 'btfd': 3.5,
  'buy the dip': 3, 'golden cross': 4, 'bull flag': 3.5, 'cup and handle': 3.5,
  'higher highs': 3, 'higher lows': 3, 'ascending triangle': 3.5,

  // ── Bullish (+1.5 to +3) ──
  'buy': 2, 'long': 2, 'support': 2, 'bounce': 2.5, 'recovery': 2.5,
  'uptrend': 2.5, 'gains': 2.5, 'profit': 2, 'green': 2, 'strong': 2,
  'promising': 2, 'exciting': 2, 'momentum': 2, 'demand': 2.5,
  'adoption': 3, 'partnership': 3, 'institutional': 3, 'mainstream': 2.5,
  'approval': 3, 'etf': 3, 'clarity': 2.5, 'listing': 2.5, 'integration': 2.5,
  'milestone': 2.5, 'upgrade': 2.5, 'launch': 2, 'innovation': 2.5,
  'bullish divergence': 3, 'oversold': 2.5, 'accumulation zone': 3,
  'smart money': 2.5, 'whale buying': 3, 'undervalued': 2.5,
  'favorable': 2.5, 'victory': 3, 'win': 2.5, 'won': 2.5, 'ruling': 2,
  'positive': 2, 'growth': 2, 'opportunity': 2, 'potential': 1.5,
  'staking': 2, 'yield': 2, 'airdrop': 2.5, 'reward': 2,

  // ── Mildly Bullish (+0.5 to +1.5) ──
  'hold': 1, 'stable': 1, 'consolidation': 0.5, 'sideways': 0.5,
  'interesting': 1, 'good': 1.5, 'nice': 1, 'great': 1.5,
  'amazing': 2, 'awesome': 2, 'love': 1.5, 'hope': 1,

  // ── Mildly Bearish (-0.5 to -1.5) ──
  'concern': -1, 'risk': -1, 'careful': -1, 'caution': -1, 'uncertain': -1,
  'volatile': -0.5, 'overvalued': -1.5, 'resistance': -1, 'rejected': -1.5,
  'slow': -0.5, 'delay': -1, 'worry': -1.5, 'trouble': -1.5,

  // ── Bearish (-1.5 to -3) ──
  'sell': -2, 'short': -2, 'bearish': -3.5, 'dump': -3, 'crash': -3.5,
  'decline': -2, 'drop': -2, 'loss': -2, 'red': -1.5, 'weak': -2,
  'downtrend': -2.5, 'correction': -2, 'dip': -1.5, 'pullback': -1.5,
  'resistance': -1.5, 'rejected': -2, 'failed': -2, 'struggle': -2,
  'fud': -2.5, 'fear': -2.5, 'panic': -3, 'capitulation': -3.5,
  'dead cat bounce': -3, 'death cross': -3.5, 'head and shoulders': -3,
  'bearish divergence': -3, 'overbought': -2, 'distribution': -2.5,
  'lower highs': -2.5, 'lower lows': -2.5, 'descending triangle': -3,

  // ── Very Bearish (-3 to -4) ──
  'collapse': -4, 'plunge': -3.5, 'tank': -3.5, 'bleed': -3, 'bleeding': -3,
  'rekt': -4, 'liquidated': -4, 'rug pull': -4.5, 'scam': -4,
  'ponzi': -4.5, 'fraud': -4, 'hack': -4, 'exploit': -3.5,
  'ban': -3.5, 'illegal': -3.5, 'crackdown': -3.5, 'enforcement': -3,

  // ── Extremely Bearish (-4 to -5) ──
  'catastrophic': -5, 'devastating': -5, 'obliterated': -5, 'destroyed': -4.5,
  'zero': -4.5, 'worthless': -5, 'dead': -4, 'exit scam': -5,
  'ponzi scheme': -5, 'bank run': -5, 'insolvency': -5, 'bankruptcy': -5,

  // ── XRP/Ripple Specific ──
  'sec settlement': 3.5, 'sec win': 4, 'sec loss': -4, 'sec appeal': -2,
  'xrp etf': 4, 'ripple ipo': 4, 'odl': 3, 'on demand liquidity': 3,
  'ripplenet': 2.5, 'xrpl': 2, 'sidechain': 2, 'amm': 2.5,
  'cbdc': 2.5, 'stablecoin': 2, 'rlusd': 3,
  'relisting': 3.5, 'delisting': -4, 'not a security': 4.5,
  'programmatic sales': 2, 'utility token': 3,
  'swift replacement': 4, 'cross border': 2.5, 'remittance': 2,
  'iso 20022': 3, 'interledger': 2.5, 'paystring': 2,
};

// Intensity boosters
const BOOSTERS = {
  'very': 1.3, 'extremely': 1.5, 'incredibly': 1.5, 'absolutely': 1.4,
  'really': 1.2, 'super': 1.3, 'mega': 1.5, 'ultra': 1.5,
  'highly': 1.3, 'seriously': 1.3, 'insanely': 1.5, 'massively': 1.4,
  'huge': 1.3, 'massive': 1.3, 'enormous': 1.4, 'major': 1.2,
  'significantly': 1.3, 'substantially': 1.2, 'tremendously': 1.4,
  'especially': 1.2, 'particularly': 1.2, 'most': 1.2, 'more': 1.1,
};

// Dampeners
const DAMPENERS = {
  'slightly': 0.7, 'somewhat': 0.7, 'a bit': 0.8, 'a little': 0.8,
  'kind of': 0.7, 'sort of': 0.7, 'maybe': 0.6, 'perhaps': 0.6,
  'might': 0.7, 'could': 0.7, 'possibly': 0.6, 'barely': 0.5,
  'hardly': 0.5, 'marginally': 0.6, 'less': 0.7,
};

// Negation words
const NEGATIONS = new Set([
  'not', "n't", 'no', 'never', 'neither', 'nor', 'none', 'nothing',
  'nowhere', 'hardly', 'barely', 'scarcely', 'without', 'dont', "don't",
  'doesnt', "doesn't", 'didnt', "didn't", 'wont', "won't", 'cant', "can't",
  'isnt', "isn't", 'wasnt', "wasn't", 'arent', "aren't", 'havent', "haven't",
]);

// Emoji sentiment
const EMOJI_SENTIMENT = {
  '🚀': 4, '🌙': 3.5, '💎': 3, '🙌': 2.5, '🔥': 3, '💪': 2.5,
  '📈': 3, '✅': 2, '🎯': 2, '💰': 2.5, '🏆': 2.5, '⬆️': 2,
  '🐂': 3, '💚': 2, '🤑': 3, '😍': 2, '🎉': 2.5, '👑': 2,
  '📉': -3, '💀': -3, '🐻': -3, '😱': -3, '🔴': -2, '⬇️': -2,
  '💩': -2.5, '😭': -2.5, '🤮': -3, '⚠️': -1.5, '🚨': -2,
  '😡': -2.5, '👎': -2, '❌': -2, '😢': -2, '🪦': -4,
};

class SentimentEngine {
  constructor() {
    this.history = [];
    this.maxHistory = 5000;
    this.socialVelocity = { timestamps: [], counts: [] };
  }

  /**
   * Analyze a single text and return detailed sentiment
   */
  analyzeText(text) {
    if (!text) return { score: 0, comparative: 0, tokens: 0 };

    const original = text;
    const lower = text.toLowerCase();

    // Tokenize
    const words = lower.replace(/[^\w\s'-]/g, ' ').split(/\s+/).filter(w => w.length > 0);
    let totalScore = 0;
    let tokenCount = 0;
    let hits = [];

    // Multi-word phrase detection first (longer phrases take priority)
    const phraseEntries = Object.entries(LEXICON)
      .filter(([k]) => k.includes(' '))
      .sort((a, b) => b[0].length - a[0].length);

    let processedText = lower;
    for (const [phrase, score] of phraseEntries) {
      if (processedText.includes(phrase)) {
        // Check for negation before the phrase
        const idx = processedText.indexOf(phrase);
        const before = processedText.substring(Math.max(0, idx - 20), idx);
        const beforeWords = before.trim().split(/\s+/);
        const lastWord = beforeWords[beforeWords.length - 1] || '';

        let finalScore = score;
        if (NEGATIONS.has(lastWord)) {
          finalScore *= -0.75;
        }

        // Check for boosters
        for (const [booster, mult] of Object.entries(BOOSTERS)) {
          if (before.includes(booster)) {
            finalScore *= mult;
            break;
          }
        }

        totalScore += finalScore;
        tokenCount++;
        hits.push({ term: phrase, score: finalScore, type: 'phrase' });

        // Remove to avoid double counting
        processedText = processedText.replace(phrase, ' '.repeat(phrase.length));
      }
    }

    // Single word analysis with context
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!(word in LEXICON)) continue;

      let score = LEXICON[word];

      // Check negation (up to 3 words before)
      const negWindow = words.slice(Math.max(0, i - 3), i);
      const isNegated = negWindow.some(w => NEGATIONS.has(w));
      if (isNegated) score *= -0.75;

      // Check booster/dampener (1 word before)
      const prev = words[i - 1] || '';
      if (prev in BOOSTERS) score *= BOOSTERS[prev];
      if (prev in DAMPENERS) score *= DAMPENERS[prev];

      totalScore += score;
      tokenCount++;
      hits.push({ term: word, score, type: 'word' });
    }

    // Emoji analysis
    for (const [emoji, score] of Object.entries(EMOJI_SENTIMENT)) {
      const count = (original.match(new RegExp(emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      if (count > 0) {
        totalScore += score * count;
        tokenCount += count;
        hits.push({ term: emoji, score: score * count, type: 'emoji' });
      }
    }

    // ALL CAPS detection (intensifier)
    const capsWords = original.split(/\s+/).filter(w => w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w));
    if (capsWords.length > 2) {
      totalScore *= 1.2;
    }

    // Exclamation marks (intensifier)
    const excl = (original.match(/!/g) || []).length;
    if (excl > 1) totalScore *= 1 + Math.min(0.3, excl * 0.05);

    // Question marks with positive/negative context (uncertainty dampener)
    const ques = (original.match(/\?/g) || []).length;
    if (ques > 0) totalScore *= 0.9;

    // Normalize: compound score like VADER (-1 to +1)
    const compound = totalScore / Math.sqrt(totalScore * totalScore + 15);

    return {
      score: totalScore,
      compound,
      comparative: tokenCount > 0 ? totalScore / tokenCount : 0,
      tokens: tokenCount,
      hits,
      capsIntensity: capsWords.length,
    };
  }

  /**
   * Analyze a collection of posts with engagement weighting
   * Returns a LunarCrush-style social intelligence report
   */
  analyzeBatch(posts) {
    if (!posts || posts.length === 0) {
      return this.emptyReport();
    }

    const now = Date.now();
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    let strongBull = 0;
    let strongBear = 0;

    const analyzed = posts.map(post => {
      const text = (post.title || '') + ' ' + (post.text || '') + ' ' + (post.snippet || '');
      const result = this.analyzeText(text);

      // Engagement weight (likes, comments, score)
      const engagement = Math.log2(1 +
        (post.score || 0) +
        (post.numComments || 0) * 3 +
        (post.likes || 0) * 2 +
        (post.retweets || 0) * 4
      );

      // Time decay: posts from the last hour weight 3x, last 6h weight 2x, last 24h weight 1.5x
      const ageMs = now - new Date(post.created || post.date || now).getTime();
      const ageHours = ageMs / 3600000;
      let timeWeight = 1;
      if (ageHours < 1) timeWeight = 3;
      else if (ageHours < 6) timeWeight = 2;
      else if (ageHours < 24) timeWeight = 1.5;
      else if (ageHours < 72) timeWeight = 1;
      else timeWeight = 0.5;

      // Author weight (if influencer)
      const authorWeight = post.influencerWeight || 1;

      const weight = engagement * timeWeight * authorWeight;
      totalWeightedScore += result.compound * weight;
      totalWeight += weight;

      // Categorize
      if (result.compound > 0.2) {
        positiveCount++;
        if (result.compound > 0.6) strongBull++;
      } else if (result.compound < -0.2) {
        negativeCount++;
        if (result.compound < -0.6) strongBear++;
      } else {
        neutralCount++;
      }

      return { ...post, sentiment: result, weight };
    });

    const total = posts.length;
    const weightedSentiment = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

    // ── Galaxy Score (LunarCrush-style, 0-100) ──────────────────────
    // Combines sentiment, volume, engagement, and consistency
    const sentimentComponent = (weightedSentiment + 1) * 25; // 0-50
    const volumeComponent = Math.min(25, Math.log2(1 + total) * 5); // 0-25
    const engagementComponent = Math.min(25, Math.log2(1 + totalWeight) * 3); // 0-25
    const galaxyScore = Math.round(Math.min(100, sentimentComponent + volumeComponent + engagementComponent));

    // ── Social Dominance ──────────────────────────────────────────────
    const bullishPercent = Math.round((positiveCount / total) * 100);
    const bearishPercent = Math.round((negativeCount / total) * 100);
    const neutralPercent = 100 - bullishPercent - bearishPercent;

    // ── Sentiment Volatility (how divided the community is) ─────────
    const sentiments = analyzed.map(a => a.sentiment.compound);
    const avgSent = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
    const sentVariance = sentiments.reduce((s, v) => s + Math.pow(v - avgSent, 2), 0) / sentiments.length;
    const sentVolatility = Math.round(Math.sqrt(sentVariance) * 100);

    // ── Social Velocity (posts per hour trend) ──────────────────────
    this.socialVelocity.timestamps.push(now);
    this.socialVelocity.counts.push(total);
    if (this.socialVelocity.timestamps.length > 60) {
      this.socialVelocity.timestamps = this.socialVelocity.timestamps.slice(-60);
      this.socialVelocity.counts = this.socialVelocity.counts.slice(-60);
    }

    let velocityChange = 0;
    if (this.socialVelocity.counts.length >= 2) {
      const recent = this.socialVelocity.counts.slice(-3);
      const older = this.socialVelocity.counts.slice(-6, -3);
      if (older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        velocityChange = olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0;
      }
    }

    // ── AltRank-style Score (1-100, lower is better) ────────────────
    // Based on sentiment strength, volume, and momentum
    const sentStrength = Math.abs(weightedSentiment) * 30;
    const volStrength = Math.min(30, total / 2);
    const momStrength = Math.min(40, Math.abs(velocityChange) / 2);
    const altRank = Math.max(1, Math.round(100 - sentStrength - volStrength - momStrength));

    // ── Label ─────────────────────────────────────────────────────────
    let label, intensity;
    if (weightedSentiment > 0.5) { label = 'Extremely Bullish'; intensity = 5; }
    else if (weightedSentiment > 0.3) { label = 'Very Bullish'; intensity = 4; }
    else if (weightedSentiment > 0.1) { label = 'Bullish'; intensity = 3; }
    else if (weightedSentiment > 0.03) { label = 'Slightly Bullish'; intensity = 2; }
    else if (weightedSentiment > -0.03) { label = 'Neutral'; intensity = 0; }
    else if (weightedSentiment > -0.1) { label = 'Slightly Bearish'; intensity = -2; }
    else if (weightedSentiment > -0.3) { label = 'Bearish'; intensity = -3; }
    else if (weightedSentiment > -0.5) { label = 'Very Bearish'; intensity = -4; }
    else { label = 'Extremely Bearish'; intensity = -5; }

    // ── Top Keywords ──────────────────────────────────────────────────
    const keywordMap = {};
    for (const item of analyzed) {
      for (const hit of (item.sentiment.hits || [])) {
        const term = hit.term;
        if (!keywordMap[term]) keywordMap[term] = { count: 0, totalScore: 0 };
        keywordMap[term].count++;
        keywordMap[term].totalScore += hit.score;
      }
    }
    const topKeywords = Object.entries(keywordMap)
      .map(([term, data]) => ({ term, count: data.count, avgScore: data.totalScore / data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const report = {
      // Core metrics
      score: Math.round(weightedSentiment * 100),
      compound: weightedSentiment,
      label,
      intensity,

      // LunarCrush-style metrics
      galaxyScore,
      altRank,
      socialVolume: total,
      socialVelocity: velocityChange,
      sentimentVolatility,

      // Breakdown
      positive: positiveCount,
      negative: negativeCount,
      neutral: neutralCount,
      strongBull,
      strongBear,
      bullishPercent,
      bearishPercent,
      neutralPercent,

      // Engagement
      totalEngagement: Math.round(totalWeight),
      avgEngagement: Math.round(totalWeight / total),

      // Keywords
      topKeywords,

      // Timestamp
      timestamp: new Date().toISOString()
    };

    this.history.push(report);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    return report;
  }

  emptyReport() {
    return {
      score: 0, compound: 0, label: 'No Data', intensity: 0,
      galaxyScore: 50, altRank: 50, socialVolume: 0, socialVelocity: 0,
      sentimentVolatility: 0, positive: 0, negative: 0, neutral: 0,
      strongBull: 0, strongBear: 0, bullishPercent: 0, bearishPercent: 0,
      neutralPercent: 100, totalEngagement: 0, avgEngagement: 0,
      topKeywords: [], timestamp: new Date().toISOString()
    };
  }

  getHistory() { return this.history; }

  // Get sentiment trend (are things getting more bullish or bearish?)
  getTrend(periods = 5) {
    if (this.history.length < 2) return { direction: 'flat', change: 0 };
    const recent = this.history.slice(-periods);
    const older = this.history.slice(-periods * 2, -periods);
    if (older.length === 0) return { direction: 'flat', change: 0 };

    const recentAvg = recent.reduce((s, r) => s + r.compound, 0) / recent.length;
    const olderAvg = older.reduce((s, r) => s + r.compound, 0) / older.length;
    const change = recentAvg - olderAvg;

    return {
      direction: change > 0.05 ? 'improving' : change < -0.05 ? 'declining' : 'stable',
      change: Math.round(change * 100),
      recentAvg: Math.round(recentAvg * 100),
      olderAvg: Math.round(olderAvg * 100)
    };
  }
}

module.exports = SentimentEngine;
