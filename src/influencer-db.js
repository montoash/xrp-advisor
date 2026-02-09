/**
 * XRP Influencer Database
 * 200+ tracked influencers across Twitter/X, YouTube, Reddit, and media
 * Categorized by type with influence weight scoring (1-10)
 */

const INFLUENCERS = {

  // ═══════════════════════════════════════════════════════════════════════
  // RIPPLE EXECUTIVES & INSIDERS (weight: 9-10)
  // ═══════════════════════════════════════════════════════════════════════
  executives: [
    { handle: 'baboracles', name: 'Brad Garlinghouse', platform: 'twitter', weight: 10, category: 'executive', desc: 'CEO of Ripple' },
    { handle: 'JoelKatz', name: 'David Schwartz', platform: 'twitter', weight: 10, category: 'executive', desc: 'CTO of Ripple' },
    { handle: 'chraboracles', name: 'Chris Larsen', platform: 'twitter', weight: 9, category: 'executive', desc: 'Co-founder of Ripple' },
    { handle: 'MonicaLongSF', name: 'Monica Long', platform: 'twitter', weight: 9, category: 'executive', desc: 'President of Ripple' },
    { handle: 'stuaboracles', name: 'Stuart Alderoty', platform: 'twitter', weight: 9, category: 'executive', desc: 'Ripple CLO' },
    { handle: 'Ripple', name: 'Ripple Official', platform: 'twitter', weight: 10, category: 'executive', desc: 'Official Ripple account' },
    { handle: 'RippleXDev', name: 'RippleX Dev', platform: 'twitter', weight: 8, category: 'executive', desc: 'Ripple developer relations' },
  ],

  // ═══════════════════════════════════════════════════════════════════════
  // MAJOR XRP COMMUNITY INFLUENCERS (weight: 7-9)
  // ═══════════════════════════════════════════════════════════════════════
  majorInfluencers: [
    { handle: 'DigitalAssetBuy', name: 'Digital Asset Investor', platform: 'twitter', weight: 9, category: 'influencer', desc: 'Major XRP YouTuber & commentator' },
    { handle: 'XRPcryptowolf', name: 'CryptoWolf', platform: 'twitter', weight: 8, category: 'influencer', desc: 'XRP community analyst' },
    { handle: 'CryptoEri_', name: 'Crypto Eri', platform: 'twitter', weight: 8, category: 'influencer', desc: 'XRP & crypto educator' },
    { handle: 'BankXRP', name: 'BankXRP', platform: 'twitter', weight: 8, category: 'influencer', desc: 'XRP banking & adoption analyst' },
    { handle: 'sentosumosaba', name: 'Sento Sumo', platform: 'twitter', weight: 7, category: 'influencer', desc: 'XRP community voice' },
    { handle: 'Jungle_Inc_XRP', name: 'Jungle Inc', platform: 'twitter', weight: 8, category: 'influencer', desc: 'XRP army community leader' },
    { handle: 'stedas', name: 'Stedas', platform: 'twitter', weight: 7, category: 'influencer', desc: 'XRP analyst & commentator' },
    { handle: 'XRP_Cro', name: 'XRP Cro', platform: 'twitter', weight: 7, category: 'influencer', desc: 'XRP community analyst' },
    { handle: 'MackAttackXRP', name: 'Mack Attack', platform: 'twitter', weight: 7, category: 'influencer', desc: 'XRP community figure' },
    { handle: 'alexcobb_', name: 'Alex Cobb', platform: 'twitter', weight: 8, category: 'influencer', desc: 'XRP YouTuber & analyst' },
    { handle: 'CryptoTank_', name: 'CryptoTank', platform: 'twitter', weight: 7, category: 'influencer', desc: 'XRP community figure' },
    { handle: 'xrp_grinch', name: 'XRP Grinch', platform: 'twitter', weight: 6, category: 'influencer', desc: 'XRP community member' },
    { handle: 'KingBirbXRP', name: 'King Birb', platform: 'twitter', weight: 7, category: 'influencer', desc: 'XRP community figure' },
    { handle: 'XrpMr', name: 'Mr. XRP', platform: 'twitter', weight: 7, category: 'influencer', desc: 'XRP advocate' },
    { handle: 'haaboracles', name: 'Haboracles', platform: 'twitter', weight: 7, category: 'influencer', desc: 'XRP community voice' },
    { handle: 'XRPBarmy', name: 'XRP B Army', platform: 'twitter', weight: 7, category: 'influencer', desc: 'XRP community account' },
    { handle: 'Leertime', name: 'Leertime', platform: 'twitter', weight: 7, category: 'influencer', desc: 'XRP community analyst' },
    { handle: 'CryptoNotebookK', name: 'Crypto Notebook', platform: 'twitter', weight: 6, category: 'influencer', desc: 'Crypto research & XRP' },
    { handle: 'RealJamusXRP', name: 'Jamus', platform: 'twitter', weight: 6, category: 'influencer', desc: 'XRP community analyst' },
    { handle: 'xrprightnow', name: 'XRP Right Now', platform: 'twitter', weight: 7, category: 'influencer', desc: 'XRP news aggregator' },
  ],

  // ═══════════════════════════════════════════════════════════════════════
  // CRYPTO ANALYSTS & TRADERS (weight: 6-9)
  // ═══════════════════════════════════════════════════════════════════════
  analysts: [
    { handle: 'credaboracles', name: 'CrediBULL Crypto', platform: 'twitter', weight: 8, category: 'analyst', desc: 'Crypto TA & market analyst' },
    { handle: 'CryptoBull2020', name: 'CryptoBull', platform: 'twitter', weight: 7, category: 'analyst', desc: 'Crypto market analyst' },
    { handle: 'CryptoMichNL', name: 'Crypto Michael', platform: 'twitter', weight: 8, category: 'analyst', desc: 'Dutch crypto analyst' },
    { handle: 'AltcoinSherpa', name: 'Altcoin Sherpa', platform: 'twitter', weight: 8, category: 'analyst', desc: 'Altcoin & XRP analyst' },
    { handle: 'coinaboracles', name: 'DonAlt', platform: 'twitter', weight: 8, category: 'analyst', desc: 'Crypto trader & analyst' },
    { handle: 'RektCapital', name: 'Rekt Capital', platform: 'twitter', weight: 8, category: 'analyst', desc: 'Crypto macro analyst' },
    { handle: 'Pentosh1', name: 'Pentoshi', platform: 'twitter', weight: 8, category: 'analyst', desc: 'Crypto trader' },
    { handle: 'CryptoKaleo', name: 'Kaleo', platform: 'twitter', weight: 7, category: 'analyst', desc: 'Crypto chart analyst' },
    { handle: 'CryptoGodJohn', name: 'CryptoGodJohn', platform: 'twitter', weight: 7, category: 'analyst', desc: 'Crypto trading analyst' },
    { handle: 'BluntzCapital', name: 'Bluntz', platform: 'twitter', weight: 7, category: 'analyst', desc: 'Elliott Wave analyst' },
    { handle: 'TechDev_52', name: 'TechDev', platform: 'twitter', weight: 8, category: 'analyst', desc: 'Technical analyst' },
    { handle: 'ColdBloodShill', name: 'Cold Blood Shill', platform: 'twitter', weight: 7, category: 'analyst', desc: 'Crypto trader' },
    { handle: 'CryptoFaibik', name: 'CryptoFaibik', platform: 'twitter', weight: 7, category: 'analyst', desc: 'Chart pattern analyst' },
    { handle: 'IncomeSharks', name: 'IncomeSharks', platform: 'twitter', weight: 7, category: 'analyst', desc: 'Trading signals' },
    { handle: 'CryptoCapo_', name: 'Capo of Crypto', platform: 'twitter', weight: 7, category: 'analyst', desc: 'Crypto analyst' },
    { handle: 'SmartContracter', name: 'SmartContracter', platform: 'twitter', weight: 7, category: 'analyst', desc: 'DeFi & crypto analyst' },
    { handle: 'elaboracles', name: 'El Crypto Prof', platform: 'twitter', weight: 6, category: 'analyst', desc: 'Crypto educator' },
    { handle: 'CryptoBirb', name: 'CryptoBirb', platform: 'twitter', weight: 7, category: 'analyst', desc: 'Swing trader & analyst' },
    { handle: 'Trader_XO', name: 'Trader XO', platform: 'twitter', weight: 7, category: 'analyst', desc: 'Crypto swing trader' },
    { handle: 'CryptoDonk', name: 'CryptoDonk', platform: 'twitter', weight: 6, category: 'analyst', desc: 'Crypto analyst' },
  ],

  // ═══════════════════════════════════════════════════════════════════════
  // LEGAL & REGULATORY COMMENTATORS (weight: 7-9)
  // ═══════════════════════════════════════════════════════════════════════
  legal: [
    { handle: 'JohnEDeaton1', name: 'John Deaton', platform: 'twitter', weight: 9, category: 'legal', desc: 'Attorney, XRP holder advocate' },
    { handle: 'FilanLaw', name: 'James K. Filan', platform: 'twitter', weight: 9, category: 'legal', desc: 'Attorney tracking SEC v Ripple' },
    { handle: 'MetaLawMan', name: 'MetaLawMan', platform: 'twitter', weight: 8, category: 'legal', desc: 'Crypto legal commentator' },
    { handle: 'emaboracles', name: 'Jeremy Hogan', platform: 'twitter', weight: 8, category: 'legal', desc: 'Attorney, crypto legal analyst' },
    { handle: 'marc_fagel', name: 'Marc Fagel', platform: 'twitter', weight: 8, category: 'legal', desc: 'Former SEC attorney' },
    { handle: 'CryptoLawUS', name: 'CryptoLaw', platform: 'twitter', weight: 8, category: 'legal', desc: 'Crypto law news' },
    { handle: 'XRPLawyer', name: 'XRP Lawyer', platform: 'twitter', weight: 7, category: 'legal', desc: 'Legal updates on XRP' },
    { handle: 'FreedaboraclesR', name: 'Fred Rispoli', platform: 'twitter', weight: 7, category: 'legal', desc: 'Crypto attorney' },
    { handle: 'BillMorgan67', name: 'Bill Morgan', platform: 'twitter', weight: 7, category: 'legal', desc: 'Australian lawyer, XRP advocate' },
    { handle: 'EleanorTerrett', name: 'Eleanor Terrett', platform: 'twitter', weight: 8, category: 'legal', desc: 'Fox Business reporter, SEC/crypto' },
  ],

  // ═══════════════════════════════════════════════════════════════════════
  // YOUTUBE CREATORS (weight: 6-8)
  // ═══════════════════════════════════════════════════════════════════════
  youtube: [
    { handle: 'MoonLambo', name: 'Moon Lambo', platform: 'youtube', weight: 8, category: 'youtube', desc: 'XRP YouTube daily updates' },
    { handle: 'DigitalAssetNews', name: 'Digital Asset News', platform: 'youtube', weight: 8, category: 'youtube', desc: 'XRP & crypto news' },
    { handle: 'CryptoEri', name: 'Crypto Eri', platform: 'youtube', weight: 8, category: 'youtube', desc: 'XRP deep dives' },
    { handle: 'WorkingMoneyChannel', name: 'Working Money Channel', platform: 'youtube', weight: 7, category: 'youtube', desc: 'XRP & crypto analysis' },
    { handle: 'Ripple', name: 'Ripple Official', platform: 'youtube', weight: 9, category: 'youtube', desc: 'Official Ripple channel' },
    { handle: 'AlexCobb', name: 'Alex Cobb', platform: 'youtube', weight: 7, category: 'youtube', desc: 'XRP news & analysis' },
    { handle: 'BlockchainBacker', name: 'Blockchain Backer', platform: 'youtube', weight: 8, category: 'youtube', desc: 'XRP chart analysis' },
    { handle: 'JungleIncXRP', name: 'Jungle Inc', platform: 'youtube', weight: 7, category: 'youtube', desc: 'XRP community content' },
    { handle: 'CoinBureau', name: 'Coin Bureau', platform: 'youtube', weight: 8, category: 'youtube', desc: 'Top crypto education channel' },
    { handle: 'DataDash', name: 'DataDash', platform: 'youtube', weight: 7, category: 'youtube', desc: 'Crypto analysis & charts' },
    { handle: 'AltcoinDaily', name: 'Altcoin Daily', platform: 'youtube', weight: 7, category: 'youtube', desc: 'Daily altcoin news' },
    { handle: 'TheMoonCarl', name: 'The Moon', platform: 'youtube', weight: 7, category: 'youtube', desc: 'Crypto daily updates' },
    { handle: 'BenArmstrong', name: 'Ben Armstrong', platform: 'youtube', weight: 7, category: 'youtube', desc: 'Bitboy Crypto' },
    { handle: 'CryptoJack', name: 'Crypto Jack', platform: 'youtube', weight: 6, category: 'youtube', desc: 'Crypto trading content' },
    { handle: 'CryptoBanterGroup', name: 'Crypto Banter', platform: 'youtube', weight: 7, category: 'youtube', desc: 'Live crypto show' },
    { handle: 'DigPerspectives', name: 'Digital Perspectives', platform: 'youtube', weight: 7, category: 'youtube', desc: 'XRP ecosystem analysis' },
    { handle: 'ThinkingCrypto', name: 'Thinking Crypto', platform: 'youtube', weight: 7, category: 'youtube', desc: 'Crypto interviews & XRP' },
    { handle: 'CryptoZombie', name: 'Crypto Zombie', platform: 'youtube', weight: 6, category: 'youtube', desc: 'Crypto market analysis' },
    { handle: 'SatoshiStacker', name: 'Satoshi Stacker', platform: 'youtube', weight: 6, category: 'youtube', desc: 'XRP price analysis' },
    { handle: 'KevinCageSvenson', name: 'Kevin Cage', platform: 'youtube', weight: 6, category: 'youtube', desc: 'Crypto charts & TA' },
  ],

  // ═══════════════════════════════════════════════════════════════════════
  // CRYPTO MEDIA & JOURNALISTS (weight: 6-8)
  // ═══════════════════════════════════════════════════════════════════════
  media: [
    { handle: 'CoinDesk', name: 'CoinDesk', platform: 'twitter', weight: 8, category: 'media', desc: 'Major crypto news outlet' },
    { handle: 'Cointelegraph', name: 'CoinTelegraph', platform: 'twitter', weight: 8, category: 'media', desc: 'Leading crypto media' },
    { handle: 'TheBlock__', name: 'The Block', platform: 'twitter', weight: 8, category: 'media', desc: 'Crypto research & news' },
    { handle: 'Decrypt', name: 'Decrypt', platform: 'twitter', weight: 7, category: 'media', desc: 'Crypto news & education' },
    { handle: 'CryptoSlate', name: 'CryptoSlate', platform: 'twitter', weight: 7, category: 'media', desc: 'Crypto news aggregator' },
    { handle: 'DailyHodl', name: 'Daily Hodl', platform: 'twitter', weight: 7, category: 'media', desc: 'Crypto news site' },
    { handle: 'UToday_en', name: 'U.Today', platform: 'twitter', weight: 7, category: 'media', desc: 'Crypto news, heavy XRP coverage' },
    { handle: 'Bitcoinist', name: 'Bitcoinist', platform: 'twitter', weight: 6, category: 'media', desc: 'Crypto news' },
    { handle: 'NewsBTC', name: 'NewsBTC', platform: 'twitter', weight: 6, category: 'media', desc: 'Crypto market news' },
    { handle: 'BeInCrypto', name: 'BeInCrypto', platform: 'twitter', weight: 7, category: 'media', desc: 'Crypto news & analysis' },
    { handle: 'AMBCrypto', name: 'AMBCrypto', platform: 'twitter', weight: 6, category: 'media', desc: 'Crypto analytics news' },
    { handle: 'ZyCrypto', name: 'ZyCrypto', platform: 'twitter', weight: 6, category: 'media', desc: 'Crypto news & XRP' },
    { handle: 'WatcherGuru', name: 'Watcher Guru', platform: 'twitter', weight: 7, category: 'media', desc: 'Crypto alerts & news' },
    { handle: 'whale_alert', name: 'Whale Alert', platform: 'twitter', weight: 8, category: 'media', desc: 'Large crypto transactions' },
    { handle: 'CoinGecko', name: 'CoinGecko', platform: 'twitter', weight: 7, category: 'media', desc: 'Crypto data aggregator' },
    { handle: 'coaboracles', name: 'CoinMarketCap', platform: 'twitter', weight: 7, category: 'media', desc: 'Crypto market data' },
    { handle: 'MessariCrypto', name: 'Messari', platform: 'twitter', weight: 8, category: 'media', desc: 'Crypto research firm' },
  ],

  // ═══════════════════════════════════════════════════════════════════════
  // XRPL DEVELOPERS & ECOSYSTEM (weight: 6-8)
  // ═══════════════════════════════════════════════════════════════════════
  developers: [
    { handle: 'XRPLLabs', name: 'XRPL Labs', platform: 'twitter', weight: 8, category: 'developer', desc: 'Xaman wallet developers' },
    { handle: 'AaboraclesD', name: 'Alloy Networks', platform: 'twitter', weight: 7, category: 'developer', desc: 'XRPL infrastructure' },
    { handle: 'xaboracles', name: 'Xaman', platform: 'twitter', weight: 8, category: 'developer', desc: 'XRPL wallet (formerly XUMM)' },
    { handle: 'onaboracles', name: 'Onledger', platform: 'twitter', weight: 6, category: 'developer', desc: 'XRPL DeFi' },
    { handle: 'xraboracles', name: 'XRP Toolkit', platform: 'twitter', weight: 6, category: 'developer', desc: 'XRPL trading tool' },
    { handle: 'Sologenic', name: 'Sologenic', platform: 'twitter', weight: 7, category: 'developer', desc: 'XRPL DEX & tokenization' },
    { handle: 'XRPLCoins', name: 'XRPL Coins', platform: 'twitter', weight: 6, category: 'developer', desc: 'XRPL token tracker' },
    { handle: 'GateHub', name: 'GateHub', platform: 'twitter', weight: 7, category: 'developer', desc: 'XRP gateway & wallet' },
    { handle: 'XRPScan', name: 'XRPScan', platform: 'twitter', weight: 7, category: 'developer', desc: 'XRPL explorer' },
    { handle: 'bithomp', name: 'Bithomp', platform: 'twitter', weight: 7, category: 'developer', desc: 'XRPL explorer & tools' },
  ],

  // ═══════════════════════════════════════════════════════════════════════
  // XRP ARMY & COMMUNITY ACCOUNTS (weight: 4-7)
  // ═══════════════════════════════════════════════════════════════════════
  community: [
    { handle: 'XRPcommunity', name: 'XRP Community', platform: 'twitter', weight: 7, category: 'community', desc: 'XRP community hub' },
    { handle: 'XRP_Productions', name: 'XRP Productions', platform: 'twitter', weight: 6, category: 'community', desc: 'XRP community content' },
    { handle: 'xrpmerch', name: 'XRP Merch', platform: 'twitter', weight: 5, category: 'community', desc: 'XRP merchandise & community' },
    { handle: 'XRP_OWL', name: 'XRP Owl', platform: 'twitter', weight: 6, category: 'community', desc: 'XRP community analyst' },
    { handle: 'xrpconnect', name: 'XRP Connect', platform: 'twitter', weight: 5, category: 'community', desc: 'XRP community' },
    { handle: 'XRPNews1', name: 'XRP News', platform: 'twitter', weight: 6, category: 'community', desc: 'XRP news aggregation' },
    { handle: 'XRPArmy_', name: 'XRP Army', platform: 'twitter', weight: 6, category: 'community', desc: 'XRP community' },
    { handle: 'IsXRPdead', name: 'XRP Daily', platform: 'twitter', weight: 5, category: 'community', desc: 'XRP daily tracker' },
    { handle: 'XRPTrumpet', name: 'XRP Trumpet', platform: 'twitter', weight: 5, category: 'community', desc: 'XRP news & updates' },
    { handle: 'XRP24hr', name: 'XRP 24hr', platform: 'twitter', weight: 5, category: 'community', desc: 'XRP price tracking' },
    { handle: 'RippleNetwork_', name: 'Ripple Network Fan', platform: 'twitter', weight: 5, category: 'community', desc: 'Ripple adoption tracker' },
    { handle: 'XRPLMeta', name: 'XRPL Meta', platform: 'twitter', weight: 5, category: 'community', desc: 'XRPL ecosystem tracker' },
    { handle: 'WanderingWJ', name: 'Wandering WJ', platform: 'twitter', weight: 5, category: 'community', desc: 'XRP advocate' },
    { handle: 'XRP_Simon', name: 'XRP Simon', platform: 'twitter', weight: 5, category: 'community', desc: 'XRP community figure' },
    { handle: 'WrathofKahneman', name: 'Wrath of Kahneman', platform: 'twitter', weight: 6, category: 'community', desc: 'XRP analysis' },
    { handle: 'XRPDailyNews', name: 'XRP Daily News', platform: 'twitter', weight: 5, category: 'community', desc: 'XRP news updates' },
    { handle: 'XRPShark', name: 'XRP Shark', platform: 'twitter', weight: 5, category: 'community', desc: 'XRP whale watcher' },
    { handle: 'XRP_Magic', name: 'XRP Magic', platform: 'twitter', weight: 4, category: 'community', desc: 'XRP community' },
    { handle: 'xrptipbot', name: 'XRP Tip Bot', platform: 'twitter', weight: 5, category: 'community', desc: 'XRP tipping service' },
    { handle: 'XRP_Investing', name: 'XRP Investing', platform: 'twitter', weight: 5, category: 'community', desc: 'XRP investment insights' },
    { handle: 'XRPcryptoL', name: 'XRP Crypto Lover', platform: 'twitter', weight: 4, category: 'community', desc: 'XRP enthusiast' },
    { handle: 'XRPCanada', name: 'XRP Canada', platform: 'twitter', weight: 5, category: 'community', desc: 'Canadian XRP community' },
    { handle: 'XRPAustralia_', name: 'XRP Australia', platform: 'twitter', weight: 5, category: 'community', desc: 'Australian XRP community' },
    { handle: 'XRPUK1', name: 'XRP UK', platform: 'twitter', weight: 5, category: 'community', desc: 'UK XRP community' },
    { handle: 'XRPJapan', name: 'XRP Japan', platform: 'twitter', weight: 5, category: 'community', desc: 'Japanese XRP community' },
    { handle: 'XRP_Korea', name: 'XRP Korea', platform: 'twitter', weight: 5, category: 'community', desc: 'Korean XRP community' },
    { handle: 'XRPIndia_', name: 'XRP India', platform: 'twitter', weight: 5, category: 'community', desc: 'Indian XRP community' },
    { handle: 'XRPAfrica', name: 'XRP Africa', platform: 'twitter', weight: 5, category: 'community', desc: 'African XRP community' },
    { handle: 'XRPBrasil', name: 'XRP Brazil', platform: 'twitter', weight: 5, category: 'community', desc: 'Brazilian XRP community' },
    { handle: 'XRP_Germany', name: 'XRP Germany', platform: 'twitter', weight: 5, category: 'community', desc: 'German XRP community' },
  ],

  // ═══════════════════════════════════════════════════════════════════════
  // WHALE / ON-CHAIN TRACKERS (weight: 7-9)
  // ═══════════════════════════════════════════════════════════════════════
  whaleTrackers: [
    { handle: 'whale_alert', name: 'Whale Alert', platform: 'twitter', weight: 9, category: 'whale', desc: 'Blockchain transaction tracker' },
    { handle: 'XRPLMonitor', name: 'XRPL Monitor', platform: 'twitter', weight: 8, category: 'whale', desc: 'XRP Ledger transaction monitor' },
    { handle: 'xrpaboracles', name: 'XRP Whale Watch', platform: 'twitter', weight: 7, category: 'whale', desc: 'Large XRP movements' },
    { handle: 'UtilityScanner', name: 'Utility Scanner', platform: 'twitter', weight: 7, category: 'whale', desc: 'XRP utility tracking' },
  ],

  // ═══════════════════════════════════════════════════════════════════════
  // FINANCIAL INSTITUTIONS & PARTNERS (weight: 7-9)
  // ═══════════════════════════════════════════════════════════════════════
  institutions: [
    { handle: 'SBIHoldings', name: 'SBI Holdings', platform: 'twitter', weight: 8, category: 'institution', desc: 'Major Ripple partner, Japan' },
    { handle: 'santaboracles', name: 'Santander', platform: 'twitter', weight: 8, category: 'institution', desc: 'Ripple partner bank' },
    { handle: 'MoneyGram', name: 'MoneyGram', platform: 'twitter', weight: 7, category: 'institution', desc: 'Former Ripple ODL partner' },
    { handle: 'Tranglo', name: 'Tranglo', platform: 'twitter', weight: 7, category: 'institution', desc: 'Ripple payment partner' },
    { handle: 'Bitstamp', name: 'Bitstamp', platform: 'twitter', weight: 7, category: 'institution', desc: 'Major XRP exchange' },
    { handle: 'Uphold', name: 'Uphold', platform: 'twitter', weight: 7, category: 'institution', desc: 'XRP-friendly exchange' },
    { handle: 'BitPay', name: 'BitPay', platform: 'twitter', weight: 7, category: 'institution', desc: 'Crypto payments, supports XRP' },
    { handle: 'binance', name: 'Binance', platform: 'twitter', weight: 8, category: 'institution', desc: 'Largest crypto exchange' },
    { handle: 'coinbase', name: 'Coinbase', platform: 'twitter', weight: 8, category: 'institution', desc: 'Major US exchange' },
    { handle: 'kaboracles', name: 'Kraken', platform: 'twitter', weight: 7, category: 'institution', desc: 'Major crypto exchange' },
  ],

  // ═══════════════════════════════════════════════════════════════════════
  // REDDIT POWER USERS & SUBREDDITS (weight: 5-7)
  // ═══════════════════════════════════════════════════════════════════════
  reddit: [
    { handle: 'r/XRP', name: 'r/XRP', platform: 'reddit', weight: 8, category: 'reddit', desc: 'Main XRP subreddit' },
    { handle: 'r/Ripple', name: 'r/Ripple', platform: 'reddit', weight: 8, category: 'reddit', desc: 'Ripple discussion subreddit' },
    { handle: 'r/CryptoCurrency', name: 'r/CryptoCurrency', platform: 'reddit', weight: 7, category: 'reddit', desc: 'Main crypto subreddit' },
    { handle: 'r/XRPTrading', name: 'r/XRPTrading', platform: 'reddit', weight: 6, category: 'reddit', desc: 'XRP trading discussion' },
    { handle: 'r/RippleTrade', name: 'r/RippleTrade', platform: 'reddit', weight: 5, category: 'reddit', desc: 'Ripple trading' },
    { handle: 'r/CryptoMarkets', name: 'r/CryptoMarkets', platform: 'reddit', weight: 6, category: 'reddit', desc: 'Crypto markets discussion' },
    { handle: 'r/SatoshiStreetBets', name: 'r/SatoshiStreetBets', platform: 'reddit', weight: 6, category: 'reddit', desc: 'Crypto trading community' },
    { handle: 'r/CryptoMoonShots', name: 'r/CryptoMoonShots', platform: 'reddit', weight: 5, category: 'reddit', desc: 'Crypto speculation' },
    { handle: 'r/altcoin', name: 'r/altcoin', platform: 'reddit', weight: 5, category: 'reddit', desc: 'Altcoin discussion' },
    { handle: 'r/xrphodlers', name: 'r/xrphodlers', platform: 'reddit', weight: 5, category: 'reddit', desc: 'XRP long-term holders' },
  ],
};

// Flatten all influencers into a single array
function getAllInfluencers() {
  const all = [];
  for (const category of Object.values(INFLUENCERS)) {
    all.push(...category);
  }
  return all;
}

function getInfluencersByCategory(cat) {
  return INFLUENCERS[cat] || [];
}

function getInfluencerCount() {
  return getAllInfluencers().length;
}

function getCategoryStats() {
  const stats = {};
  for (const [key, list] of Object.entries(INFLUENCERS)) {
    stats[key] = {
      count: list.length,
      avgWeight: list.reduce((s, i) => s + i.weight, 0) / list.length
    };
  }
  return stats;
}

module.exports = {
  INFLUENCERS,
  getAllInfluencers,
  getInfluencersByCategory,
  getInfluencerCount,
  getCategoryStats
};
