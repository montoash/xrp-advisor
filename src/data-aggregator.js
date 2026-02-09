const fetch = require('node-fetch');
const RSSParser = require('rss-parser');

const rssParser = new RSSParser({
  timeout: 10000,
  headers: { 'User-Agent': 'XRP-Advisor/1.0' }
});

// Known XRP influencers / community voices to track
const XRP_INFLUENCERS = [
  { handle: 'Ripple', platform: 'twitter', weight: 10 },
  { handle: 'baboracles', platform: 'twitter', weight: 8 },
  { handle: 'DigitalAssetBuy', platform: 'twitter', weight: 7 },
  { handle: 'XRPcryptowolf', platform: 'twitter', weight: 7 },
  { handle: 'CryptoEri_', platform: 'twitter', weight: 7 },
  { handle: 'JoelKatz', platform: 'twitter', weight: 9 },
  { handle: 'sentosumosaba', platform: 'twitter', weight: 6 },
  { handle: 'Jungle_Inc_XRP', platform: 'twitter', weight: 7 },
  { handle: 'stedas', platform: 'twitter', weight: 6 },
  { handle: 'XRP_Cro', platform: 'twitter', weight: 6 },
  { handle: 'BankXRP', platform: 'twitter', weight: 6 },
  { handle: 'MackAttackXRP', platform: 'twitter', weight: 6 },
  { handle: 'alexcobb_', platform: 'twitter', weight: 7 },
  { handle: 'CryptoTank_', platform: 'twitter', weight: 6 },
  { handle: 'xrp_grinch', platform: 'twitter', weight: 5 },
  { handle: 'Ripple', platform: 'youtube', weight: 9 },
  { handle: 'MoonLambo', platform: 'youtube', weight: 7 },
  { handle: 'DigitalAssetNews', platform: 'youtube', weight: 7 },
  { handle: 'CryptoEri', platform: 'youtube', weight: 7 },
  { handle: 'WorkingMoneyChannel', platform: 'youtube', weight: 6 },
];

// RSS feeds for XRP/crypto news
const NEWS_FEEDS = [
  'https://cointelegraph.com/rss/tag/xrp',
  'https://cointelegraph.com/rss/tag/ripple',
  'https://cryptoslate.com/feed/',
  'https://www.coindesk.com/arc/outboundfeeds/rss/',
  'https://decrypt.co/feed',
  'https://bitcoinist.com/feed/',
  'https://newsbtc.com/feed/',
  'https://u.today/rss',
  'https://ambcrypto.com/feed/',
  'https://dailyhodl.com/feed/',
  'https://beincrypto.com/feed/',
  'https://zycrypto.com/feed/'
];

// Sentiment word lists
const POSITIVE_WORDS = [
  'bullish', 'moon', 'pump', 'surge', 'rally', 'breakout', 'buy', 'long',
  'accumulate', 'support', 'adoption', 'partnership', 'win', 'victory', 'ruling',
  'favorable', 'positive', 'growth', 'gains', 'profit', 'uptrend', 'highs',
  'launch', 'approval', 'etf', 'institutional', 'whale', 'bullrun', 'blast',
  'soar', 'spike', 'rocket', 'explode', 'skyrocket', 'parabolic', 'golden',
  'upgrade', 'innovation', 'milestone', 'breakthrough', 'clarity', 'regulation',
  'mainstream', 'massive', 'huge', 'exciting', 'promising', 'strong', 'recovery',
  'bounce', 'reversal', 'demand', 'volume', 'momentum', 'opportunity', 'undervalued'
];

const NEGATIVE_WORDS = [
  'bearish', 'dump', 'crash', 'sell', 'short', 'resistance', 'sec', 'lawsuit',
  'fine', 'penalty', 'negative', 'decline', 'drop', 'loss', 'downtrend', 'lows',
  'ban', 'reject', 'fail', 'fear', 'fud', 'scam', 'fraud', 'hack', 'vulnerability',
  'delay', 'concern', 'risk', 'warning', 'danger', 'collapse', 'plunge', 'tank',
  'bleed', 'capitulation', 'panic', 'overvalued', 'bubble', 'correction', 'dip',
  'weak', 'struggle', 'uncertain', 'volatile', 'trouble', 'problem', 'issue',
  'investigation', 'enforcement', 'crackdown', 'regulation', 'restriction'
];

class DataAggregator {
  constructor() {
    this.priceHistory = [];
    this.maxHistory = 1440; // 24h of minute data
  }

  // ─── CoinGecko: Price & Market Data (free, no key) ──────────────────

  async fetchPrice() {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true';
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'XRP-Advisor/1.0' },
      timeout: 10000
    });
    if (!res.ok) throw new Error(`CoinGecko price error: ${res.status}`);
    const data = await res.json();
    const xrp = data.ripple;

    const pricePoint = {
      price: xrp.usd,
      change24h: xrp.usd_24h_change,
      volume24h: xrp.usd_24h_vol,
      marketCap: xrp.usd_market_cap,
      timestamp: Date.now()
    };

    this.priceHistory.push(pricePoint);
    if (this.priceHistory.length > this.maxHistory) {
      this.priceHistory = this.priceHistory.slice(-this.maxHistory);
    }

    return pricePoint;
  }

  async fetchMarketData() {
    const url = 'https://api.coingecko.com/api/v3/coins/ripple?localization=false&tickers=false&community_data=true&developer_data=false&sparkline=true';
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'XRP-Advisor/1.0' },
      timeout: 10000
    });
    if (!res.ok) throw new Error(`CoinGecko market error: ${res.status}`);
    const data = await res.json();

    return {
      rank: data.market_cap_rank,
      ath: data.market_data?.ath?.usd,
      athDate: data.market_data?.ath_date?.usd,
      athChangePercent: data.market_data?.ath_change_percentage?.usd,
      atl: data.market_data?.atl?.usd,
      high24h: data.market_data?.high_24h?.usd,
      low24h: data.market_data?.low_24h?.usd,
      priceChange7d: data.market_data?.price_change_percentage_7d,
      priceChange14d: data.market_data?.price_change_percentage_14d,
      priceChange30d: data.market_data?.price_change_percentage_30d,
      circulatingSupply: data.market_data?.circulating_supply,
      totalSupply: data.market_data?.total_supply,
      sparkline7d: data.market_data?.sparkline_7d?.price || [],
      communityScore: data.community_score,
      redditSubscribers: data.community_data?.reddit_subscribers,
      redditActive: data.community_data?.reddit_accounts_active_48h,
      twitterFollowers: data.community_data?.twitter_followers,
      sentimentUp: data.sentiment_votes_up_percentage,
      sentimentDown: data.sentiment_votes_down_percentage,
      coingeckoScore: data.coingecko_score,
      liquidityScore: data.liquidity_score
    };
  }

  // ─── CoinGecko: OHLC for charts (free, no key) ─────────────────────

  async fetchOHLC(days = 7) {
    const url = `https://api.coingecko.com/api/v3/coins/ripple/ohlc?vs_currency=usd&days=${days}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'XRP-Advisor/1.0' },
      timeout: 10000
    });
    if (!res.ok) throw new Error(`CoinGecko OHLC error: ${res.status}`);
    return res.json(); // [[timestamp, open, high, low, close], ...]
  }

  // ─── Reddit (public JSON, no API key) ───────────────────────────────

  async fetchRedditPosts(subreddit, limit = 25) {
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'XRP-Advisor/1.0' },
      timeout: 10000
    });
    if (!res.ok) throw new Error(`Reddit error: ${res.status}`);
    const data = await res.json();
    return (data.data?.children || []).map(child => ({
      title: child.data.title,
      author: child.data.author,
      score: child.data.score,
      numComments: child.data.num_comments,
      url: `https://reddit.com${child.data.permalink}`,
      created: new Date(child.data.created_utc * 1000).toISOString(),
      text: child.data.selftext?.substring(0, 300) || '',
      subreddit: child.data.subreddit,
      upvoteRatio: child.data.upvote_ratio,
      platform: 'reddit'
    }));
  }

  // ─── RSS News Feeds (free, no key) ──────────────────────────────────

  async fetchRSSFeed(url) {
    try {
      const feed = await rssParser.parseURL(url);
      return (feed.items || []).slice(0, 10).map(item => ({
        title: item.title,
        link: item.link,
        date: item.pubDate || item.isoDate,
        source: feed.title || url,
        snippet: (item.contentSnippet || item.content || '').substring(0, 200)
      }));
    } catch {
      return [];
    }
  }

  // ─── CryptoCompare Social Stats (free tier, no key) ─────────────────

  async fetchCryptoCompareSocial() {
    try {
      const url = 'https://min-api.cryptocompare.com/data/social/coin/latest?coinId=5031';
      const res = await fetch(url, {
        headers: { 'User-Agent': 'XRP-Advisor/1.0' },
        timeout: 10000
      });
      if (!res.ok) return null;
      const data = await res.json();
      const reddit = data.Data?.Reddit || {};
      const twitter = data.Data?.Twitter || {};
      const codeRepo = data.Data?.CodeRepository || {};
      return {
        redditSubscribers: reddit.subscribers,
        redditActiveUsers: reddit.active_users,
        redditPostsPerDay: reddit.posts_per_day,
        redditCommentsPerDay: reddit.comments_per_day,
        twitterFollowers: twitter.followers,
        twitterStatuses: twitter.statuses,
        twitterFavourites: twitter.favourites,
        githubStars: codeRepo.stars,
        githubForks: codeRepo.forks
      };
    } catch {
      return null;
    }
  }

  // ─── Alternative.me Fear & Greed Index (free, no key) ───────────────

  async fetchFearGreedIndex() {
    try {
      const url = 'https://api.alternative.me/fng/?limit=10';
      const res = await fetch(url, {
        headers: { 'User-Agent': 'XRP-Advisor/1.0' },
        timeout: 10000
      });
      if (!res.ok) return null;
      const data = await res.json();
      return (data.data || []).map(d => ({
        value: parseInt(d.value),
        label: d.value_classification,
        timestamp: new Date(parseInt(d.timestamp) * 1000).toISOString()
      }));
    } catch {
      return null;
    }
  }

  // ─── Combined Social Data Fetch ─────────────────────────────────────

  async fetchSocialData() {
    const [redditXRP, redditRipple, redditCrypto, cryptoCompare, fearGreed] = await Promise.allSettled([
      this.fetchRedditPosts('XRP', 30),
      this.fetchRedditPosts('Ripple', 20),
      this.fetchRedditPosts('CryptoCurrency', 15),
      this.fetchCryptoCompareSocial(),
      this.fetchFearGreedIndex()
    ]);

    const allPosts = [
      ...(redditXRP.status === 'fulfilled' ? redditXRP.value : []),
      ...(redditRipple.status === 'fulfilled' ? redditRipple.value : []),
      ...(redditCrypto.status === 'fulfilled' ? redditCrypto.value.filter(p =>
        /xrp|ripple/i.test(p.title + ' ' + p.text)
      ) : [])
    ];

    // Deduplicate
    const seen = new Set();
    const uniquePosts = allPosts.filter(p => {
      const key = p.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by engagement
    uniquePosts.sort((a, b) => (b.score + b.numComments * 2) - (a.score + a.numComments * 2));

    // Compute sentiment
    const sentiment = this.analyzeSentiment(uniquePosts);

    // Attach influencer info
    const influencerList = XRP_INFLUENCERS.map(inf => ({
      ...inf,
      tracked: true,
      recentMentions: uniquePosts.filter(p =>
        p.author?.toLowerCase() === inf.handle.toLowerCase()
      ).length
    }));

    return {
      posts: uniquePosts.slice(0, 50),
      influencers: influencerList,
      sentiment: {
        ...sentiment,
        fearGreed: fearGreed.status === 'fulfilled' ? fearGreed.value : null,
        cryptoCompare: cryptoCompare.status === 'fulfilled' ? cryptoCompare.value : null
      }
    };
  }

  // ─── News Aggregation ───────────────────────────────────────────────

  async fetchNews() {
    const results = await Promise.allSettled(
      NEWS_FEEDS.map(url => this.fetchRSSFeed(url))
    );

    let articles = [];
    for (const r of results) {
      if (r.status === 'fulfilled') articles.push(...r.value);
    }

    // Filter for XRP/Ripple relevance
    articles = articles.filter(a =>
      /xrp|ripple|xrpl|sec.*ripple|ripple.*sec/i.test(
        (a.title || '') + ' ' + (a.snippet || '')
      )
    );

    // Sort by date descending
    articles.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    // Deduplicate by title similarity
    const seen = new Set();
    articles = articles.filter(a => {
      const key = a.title?.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return articles.slice(0, 30);
  }

  // ─── Sentiment Analysis ─────────────────────────────────────────────

  analyzeSentiment(posts) {
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    let totalScore = 0;
    let weightedScore = 0;
    let totalWeight = 0;

    for (const post of posts) {
      const text = (post.title + ' ' + (post.text || '')).toLowerCase();
      let posHits = 0;
      let negHits = 0;

      for (const word of POSITIVE_WORDS) {
        if (text.includes(word)) posHits++;
      }
      for (const word of NEGATIVE_WORDS) {
        if (text.includes(word)) negHits++;
      }

      const engagement = Math.log2(Math.max(1, post.score || 1) + (post.numComments || 0) * 2);
      let sentimentVal = 0;

      if (posHits > negHits) {
        positiveCount++;
        sentimentVal = Math.min(1, (posHits - negHits) * 0.2);
      } else if (negHits > posHits) {
        negativeCount++;
        sentimentVal = -Math.min(1, (negHits - posHits) * 0.2);
      } else {
        neutralCount++;
      }

      totalScore += sentimentVal;
      weightedScore += sentimentVal * engagement;
      totalWeight += engagement;
    }

    const total = posts.length || 1;
    const avgSentiment = totalScore / total;
    const weightedAvg = totalWeight > 0 ? weightedScore / totalWeight : 0;

    // Normalize to -100 to +100
    const sentimentScore = Math.round(weightedAvg * 100);

    let label = 'Neutral';
    if (sentimentScore > 30) label = 'Very Bullish';
    else if (sentimentScore > 10) label = 'Bullish';
    else if (sentimentScore < -30) label = 'Very Bearish';
    else if (sentimentScore < -10) label = 'Bearish';

    return {
      score: sentimentScore,
      label,
      positive: positiveCount,
      negative: negativeCount,
      neutral: neutralCount,
      total,
      bullishPercent: Math.round((positiveCount / total) * 100),
      bearishPercent: Math.round((negativeCount / total) * 100)
    };
  }

  // ─── Technical Indicators from Price History ────────────────────────

  getTechnicals() {
    if (this.priceHistory.length < 2) return null;

    const prices = this.priceHistory.map(p => p.price);
    const latest = prices[prices.length - 1];

    // Simple Moving Averages
    const sma = (arr, period) => {
      if (arr.length < period) return null;
      const slice = arr.slice(-period);
      return slice.reduce((a, b) => a + b, 0) / period;
    };

    // RSI
    const calcRSI = (arr, period = 14) => {
      if (arr.length < period + 1) return null;
      const changes = [];
      for (let i = arr.length - period; i < arr.length; i++) {
        changes.push(arr[i] - arr[i - 1]);
      }
      const gains = changes.filter(c => c > 0);
      const losses = changes.filter(c => c < 0).map(c => -c);
      const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
      const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;
      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return 100 - (100 / (1 + rs));
    };

    // MACD
    const ema = (arr, period) => {
      if (arr.length < period) return null;
      const k = 2 / (period + 1);
      let emaVal = arr.slice(0, period).reduce((a, b) => a + b, 0) / period;
      for (let i = period; i < arr.length; i++) {
        emaVal = arr[i] * k + emaVal * (1 - k);
      }
      return emaVal;
    };

    const ema12 = ema(prices, 12);
    const ema26 = ema(prices, 26);
    const macd = ema12 && ema26 ? ema12 - ema26 : null;

    // Bollinger Bands
    const bbPeriod = 20;
    const bbSMA = sma(prices, bbPeriod);
    let bbUpper = null, bbLower = null;
    if (bbSMA && prices.length >= bbPeriod) {
      const slice = prices.slice(-bbPeriod);
      const stdDev = Math.sqrt(slice.reduce((sum, p) => sum + Math.pow(p - bbSMA, 2), 0) / bbPeriod);
      bbUpper = bbSMA + 2 * stdDev;
      bbLower = bbSMA - 2 * stdDev;
    }

    // Momentum
    const momentum = prices.length >= 10 ? ((latest - prices[prices.length - 10]) / prices[prices.length - 10]) * 100 : null;

    // VWAP approximation (volume-weighted average from recent history)
    const recentPoints = this.priceHistory.slice(-60);
    let vwap = null;
    if (recentPoints.length > 1) {
      let sumPV = 0, sumV = 0;
      for (const p of recentPoints) {
        const vol = p.volume24h || 1;
        sumPV += p.price * vol;
        sumV += vol;
      }
      vwap = sumV > 0 ? sumPV / sumV : null;
    }

    return {
      price: latest,
      sma10: sma(prices, 10),
      sma20: sma(prices, 20),
      sma50: sma(prices, 50),
      ema12,
      ema26,
      rsi: calcRSI(prices),
      macd,
      bollingerUpper: bbUpper,
      bollingerMiddle: bbSMA,
      bollingerLower: bbLower,
      momentum,
      vwap,
      priceVsSMA20: bbSMA ? ((latest - bbSMA) / bbSMA) * 100 : null,
      dataPoints: prices.length
    };
  }
}

module.exports = DataAggregator;
