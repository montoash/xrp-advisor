/**
 * Advanced Data Aggregator
 * Pulls from 10+ free data sources with no API keys
 * Streaming architecture with event-driven updates
 */

const fetch = require('node-fetch');
const RSSParser = require('rss-parser');
const { getAllInfluencers } = require('./influencer-db');

const rssParser = new RSSParser({
  timeout: 10000,
  headers: { 'User-Agent': 'XRP-Advisor/2.0' }
});

const HEADERS = { 'Accept': 'application/json', 'User-Agent': 'XRP-Advisor/2.0' };

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
  'https://zycrypto.com/feed/',
  'https://cryptopotato.com/feed/',
  'https://blockonomi.com/feed/',
  'https://cryptobriefing.com/feed/',
  'https://www.newsbtc.com/feed/',
  'https://thecryptobasic.com/feed/',
  'https://cryptonews.com/news/feed/',
];

const REDDIT_SUBS = [
  { sub: 'XRP', limit: 50 },
  { sub: 'Ripple', limit: 30 },
  { sub: 'CryptoCurrency', limit: 25 },
  { sub: 'CryptoMarkets', limit: 15 },
  { sub: 'SatoshiStreetBets', limit: 15 },
  { sub: 'altcoin', limit: 10 },
  { sub: 'xrphodlers', limit: 10 },
];

class DataAggregator {
  constructor() {
    this.cache = {};
    this.cacheExpiry = {};
  }

  _isCacheValid(key, ttlMs) {
    return this.cache[key] && this.cacheExpiry[key] && (Date.now() - this.cacheExpiry[key]) < ttlMs;
  }

  _setCache(key, data) {
    this.cache[key] = data;
    this.cacheExpiry[key] = Date.now();
  }

  // ─── CoinGecko ─────────────────────────────────────────────────────

  async fetchCoinGeckoPrice() {
    if (this._isCacheValid('cg_price', 30000)) return this.cache.cg_price;
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ripple,bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true';
    const res = await fetch(url, { headers: HEADERS, timeout: 10000 });
    if (!res.ok) throw new Error(`CoinGecko: ${res.status}`);
    const data = await res.json();
    this._setCache('cg_price', data);
    return data;
  }

  async fetchCoinGeckoMarket() {
    if (this._isCacheValid('cg_market', 60000)) return this.cache.cg_market;
    const url = 'https://api.coingecko.com/api/v3/coins/ripple?localization=false&tickers=false&community_data=true&developer_data=true&sparkline=true';
    const res = await fetch(url, { headers: HEADERS, timeout: 10000 });
    if (!res.ok) throw new Error(`CoinGecko market: ${res.status}`);
    const data = await res.json();
    this._setCache('cg_market', data);
    return data;
  }

  async fetchCoinGeckoGlobal() {
    if (this._isCacheValid('cg_global', 120000)) return this.cache.cg_global;
    const url = 'https://api.coingecko.com/api/v3/global';
    const res = await fetch(url, { headers: HEADERS, timeout: 10000 });
    if (!res.ok) throw new Error(`CoinGecko global: ${res.status}`);
    const data = await res.json();
    this._setCache('cg_global', data);
    return data;
  }

  async fetchTrending() {
    if (this._isCacheValid('cg_trending', 300000)) return this.cache.cg_trending;
    const url = 'https://api.coingecko.com/api/v3/search/trending';
    const res = await fetch(url, { headers: HEADERS, timeout: 10000 });
    if (!res.ok) return null;
    const data = await res.json();
    this._setCache('cg_trending', data);
    return data;
  }

  // ─── CoinPaprika (free, no key) ────────────────────────────────────

  async fetchCoinPaprika() {
    if (this._isCacheValid('paprika', 60000)) return this.cache.paprika;
    const url = 'https://api.coinpaprika.com/v1/tickers/xrp-xrp';
    const res = await fetch(url, { headers: HEADERS, timeout: 10000 });
    if (!res.ok) return null;
    const data = await res.json();
    this._setCache('paprika', data);
    return data;
  }

  // ─── CryptoCompare ─────────────────────────────────────────────────

  async fetchCryptoCompareSocial() {
    if (this._isCacheValid('cc_social', 120000)) return this.cache.cc_social;
    const url = 'https://min-api.cryptocompare.com/data/social/coin/latest?coinId=5031';
    const res = await fetch(url, { headers: HEADERS, timeout: 10000 });
    if (!res.ok) return null;
    const data = await res.json();
    this._setCache('cc_social', data);
    return data?.Data || null;
  }

  async fetchCryptoCompareNews() {
    if (this._isCacheValid('cc_news', 120000)) return this.cache.cc_news;
    const url = 'https://min-api.cryptocompare.com/data/v2/news/?categories=XRP,Ripple&excludeCategories=Sponsored';
    const res = await fetch(url, { headers: HEADERS, timeout: 10000 });
    if (!res.ok) return [];
    const data = await res.json();
    this._setCache('cc_news', data?.Data || []);
    return data?.Data || [];
  }

  // ─── Fear & Greed ──────────────────────────────────────────────────

  async fetchFearGreed() {
    if (this._isCacheValid('fng', 300000)) return this.cache.fng;
    const url = 'https://api.alternative.me/fng/?limit=30';
    const res = await fetch(url, { headers: HEADERS, timeout: 10000 });
    if (!res.ok) return null;
    const data = await res.json();
    const result = (data.data || []).map(d => ({
      value: parseInt(d.value),
      label: d.value_classification,
      timestamp: new Date(parseInt(d.timestamp) * 1000).toISOString()
    }));
    this._setCache('fng', result);
    return result;
  }

  // ─── DexScreener (free, no key) ────────────────────────────────────

  async fetchDexScreener() {
    if (this._isCacheValid('dex', 30000)) return this.cache.dex;
    const url = 'https://api.dexscreener.com/latest/dex/tokens/0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe'; // XRP on BSC for DEX data
    const res = await fetch(url, { headers: HEADERS, timeout: 10000 });
    if (!res.ok) return null;
    const data = await res.json();
    this._setCache('dex', data);
    return data;
  }

  // ─── Reddit ─────────────────────────────────────────────────────────

  async fetchRedditSub(subreddit, limit = 25) {
    const key = `reddit_${subreddit}`;
    if (this._isCacheValid(key, 60000)) return this.cache[key];
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'XRP-Advisor/2.0' }, timeout: 10000 });
    if (!res.ok) throw new Error(`Reddit ${subreddit}: ${res.status}`);
    const data = await res.json();
    const posts = (data.data?.children || []).map(child => ({
      title: child.data.title,
      author: child.data.author,
      score: child.data.score,
      numComments: child.data.num_comments,
      url: `https://reddit.com${child.data.permalink}`,
      created: new Date(child.data.created_utc * 1000).toISOString(),
      text: child.data.selftext?.substring(0, 500) || '',
      subreddit: child.data.subreddit,
      upvoteRatio: child.data.upvote_ratio,
      platform: 'reddit',
      flair: child.data.link_flair_text || ''
    }));
    this._setCache(key, posts);
    return posts;
  }

  async fetchAllReddit() {
    const results = await Promise.allSettled(
      REDDIT_SUBS.map(s => this.fetchRedditSub(s.sub, s.limit))
    );

    let allPosts = [];
    for (const r of results) {
      if (r.status === 'fulfilled') allPosts.push(...r.value);
    }

    // Filter for XRP relevance (non-XRP subs)
    allPosts = allPosts.filter(p => {
      if (['XRP', 'Ripple', 'xrphodlers'].includes(p.subreddit)) return true;
      return /xrp|ripple|xrpl|rlusd/i.test(p.title + ' ' + p.text);
    });

    // Deduplicate
    const seen = new Set();
    allPosts = allPosts.filter(p => {
      const key = p.title.toLowerCase().trim().substring(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by engagement score
    allPosts.sort((a, b) => {
      const scoreA = a.score + a.numComments * 3;
      const scoreB = b.score + b.numComments * 3;
      return scoreB - scoreA;
    });

    return allPosts;
  }

  // ─── RSS News ───────────────────────────────────────────────────────

  async fetchRSSFeed(url) {
    try {
      const feed = await rssParser.parseURL(url);
      return (feed.items || []).slice(0, 15).map(item => ({
        title: item.title,
        link: item.link,
        date: item.pubDate || item.isoDate,
        source: feed.title || url,
        snippet: (item.contentSnippet || item.content || '').substring(0, 300),
        platform: 'news'
      }));
    } catch { return []; }
  }

  async fetchAllNews() {
    if (this._isCacheValid('news', 120000)) return this.cache.news;

    const [rssResults, ccNews] = await Promise.allSettled([
      Promise.allSettled(NEWS_FEEDS.map(url => this.fetchRSSFeed(url))),
      this.fetchCryptoCompareNews()
    ]);

    let articles = [];

    // RSS feeds
    if (rssResults.status === 'fulfilled') {
      for (const r of rssResults.value) {
        if (r.status === 'fulfilled') articles.push(...r.value);
      }
    }

    // CryptoCompare news
    if (ccNews.status === 'fulfilled' && Array.isArray(ccNews.value)) {
      for (const n of ccNews.value) {
        articles.push({
          title: n.title,
          link: n.url,
          date: new Date(n.published_on * 1000).toISOString(),
          source: n.source_info?.name || 'CryptoCompare',
          snippet: n.body?.substring(0, 300) || '',
          platform: 'news',
          categories: n.categories
        });
      }
    }

    // Filter for XRP/Ripple
    articles = articles.filter(a =>
      /xrp|ripple|xrpl|rlusd|sec.*ripple|ripple.*sec|garlinghouse|schwartz/i.test(
        (a.title || '') + ' ' + (a.snippet || '') + ' ' + (a.categories || '')
      )
    );

    // Sort by date
    articles.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    // Deduplicate
    const seen = new Set();
    articles = articles.filter(a => {
      const key = a.title?.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 40);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const result = articles.slice(0, 50);
    this._setCache('news', result);
    return result;
  }

  // ─── Master Fetch ───────────────────────────────────────────────────

  async fetchAll() {
    const [cgPrice, cgMarket, cgGlobal, paprika, social, fearGreed, reddit, news, trending] =
      await Promise.allSettled([
        this.fetchCoinGeckoPrice(),
        this.fetchCoinGeckoMarket(),
        this.fetchCoinGeckoGlobal(),
        this.fetchCoinPaprika(),
        this.fetchCryptoCompareSocial(),
        this.fetchFearGreed(),
        this.fetchAllReddit(),
        this.fetchAllNews(),
        this.fetchTrending()
      ]);

    const v = r => r.status === 'fulfilled' ? r.value : null;

    return {
      coinGeckoPrice: v(cgPrice),
      coinGeckoMarket: v(cgMarket),
      coinGeckoGlobal: v(cgGlobal),
      coinPaprika: v(paprika),
      cryptoCompareSocial: v(social),
      fearGreed: v(fearGreed),
      redditPosts: v(reddit) || [],
      newsArticles: v(news) || [],
      trending: v(trending),
      influencers: getAllInfluencers(),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = DataAggregator;
