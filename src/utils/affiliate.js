// Shared shop tags for any gift-type app. The draw algorithm does not live here.

export const DEFAULT_AFFILIATE_CONFIG = {
  enabled: true,
  amazonTag: 'giftloop-20',
  walmartPublisherId: 'giftloop',
  bassProPartnerId: 'giftloop',
  targetPartnerId: 'giftloop',
  bestBuyPartnerId: 'giftloop',
};

export const CENTER_STORES = [
  { id: 'amazon', name: 'Amazon', photo: '/shopping/photo-tech.jpg', position: 'center' },
  { id: 'walmart', name: 'Walmart', photo: '/shopping/photo-home.jpg', position: 'center' },
  { id: 'target', name: 'Target', photo: '/shopping/photo-style.jpg', position: 'center' },
  { id: 'basspro', name: 'Bass Pro Shops', photo: '/shopping/photo-outdoors.jpg', position: 'left center' },
  { id: 'cabelas', name: "Cabela's", photo: '/shopping/photo-outdoors.jpg', position: 'right center' },
  { id: 'bestbuy', name: 'Best Buy', photo: '/shopping/photo-play.jpg', position: 'center' },
];

/** Query keys Gift Loop reads when a full affiliate link is pasted into a store field. */
export const AFFILIATE_PARAM_KEYS = {
  amazon: ['tag'],
  walmart: ['wmlspartner', 'affiliate_id'],
  basspro: ['affCode'],
  cabelas: ['affCode'],
  target: ['afid', 'clkid'],
  bestbuy: ['irclickid'],
};

const SAMPLE_CODE_KEYS = ['amazonTag', 'walmartPublisherId', 'bassProPartnerId', 'targetPartnerId', 'bestBuyPartnerId'];

export const SUPPORTED_STORES = [
  { id: 'amazon', name: 'Amazon', domain: 'amazon.com', icon: '📦', color: '#ff9900' },
  { id: 'walmart', name: 'Walmart', domain: 'walmart.com', icon: '🛒', color: '#0071dc' },
  { id: 'basspro', name: 'Bass Pro Shops', domain: 'basspro.com', icon: '🎣', color: '#b91c1c' },
  { id: 'cabelas', name: "Cabela's", domain: 'cabelas.com', icon: '🦌', color: '#14532d' },
  { id: 'target', name: 'Target', domain: 'target.com', icon: '🎯', color: '#cc0000' },
  { id: 'bestbuy', name: 'Best Buy', domain: 'bestbuy.com', icon: '⚡', color: '#ffe000' },
];

/**
 * Turns a typed partner code, or a pasted affiliate link, into the id stored for that store.
 * A plain code is kept. A link is reduced to its partner parameter.
 */
export function readAffiliateValue(storeId, raw) {
  const text = String(raw ?? '').trim();
  if (!text) return { value: '', status: 'code' };
  if (!/^https?:\/\//i.test(text)) return { value: text, status: 'code' };

  try {
    const parsed = new URL(text);
    const keys = AFFILIATE_PARAM_KEYS[storeId] || [];
    for (const key of keys) {
      const value = parsed.searchParams.get(key);
      if (value && value.trim()) return { value: value.trim(), status: 'code' };
    }
    return { value: '', status: 'missing' };
  } catch {
    return { value: text, status: 'code' };
  }
}

/** True while every store still has the built-in Gift Loop sample code. */
export function usesSampleAffiliateCodes(config = DEFAULT_AFFILIATE_CONFIG) {
  return SAMPLE_CODE_KEYS.every((key) => config?.[key] === DEFAULT_AFFILIATE_CONFIG[key]);
}

/**
 * Loads current affiliate config from localStorage
 */
export function getStoredAffiliateConfig() {
  try {
    const saved = localStorage.getItem('giftloop_affiliate_config_v1');
    return saved ? { ...DEFAULT_AFFILIATE_CONFIG, ...JSON.parse(saved) } : DEFAULT_AFFILIATE_CONFIG;
  } catch {
    return DEFAULT_AFFILIATE_CONFIG;
  }
}

/**
 * Saves affiliate config to localStorage
 */
export function saveStoredAffiliateConfig(config) {
  try {
    localStorage.setItem('giftloop_affiliate_config_v1', JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save affiliate config:', err);
  }
}

/**
 * Detects which retailer a URL belongs to
 */
export function detectStore(url) {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (lower.includes('amazon.') || lower.includes('amzn.to')) return 'amazon';
  if (lower.includes('walmart.')) return 'walmart';
  if (lower.includes('cabelas.')) return 'cabelas';
  if (lower.includes('basspro.')) return 'basspro';
  if (lower.includes('target.')) return 'target';
  if (lower.includes('bestbuy.')) return 'bestbuy';
  return 'other';
}

/**
 * Automatically attaches the appropriate affiliate tag/parameters to any retailer URL
 */
export function applyAffiliateTag(url, config = getStoredAffiliateConfig()) {
  if (!url || !config.enabled) return url;

  try {
    const store = detectStore(url);
    const parsed = new URL(url);

    if (store === 'amazon' && config.amazonTag) {
      parsed.searchParams.set('tag', config.amazonTag);
      return parsed.toString();
    }

    if (store === 'walmart' && config.walmartPublisherId) {
      // Walmart affiliate parameter (Impact/Rakuten standard)
      parsed.searchParams.set('wmlspartner', config.walmartPublisherId);
      return parsed.toString();
    }

    if ((store === 'basspro' || store === 'cabelas') && config.bassProPartnerId) {
      parsed.searchParams.set('affCode', config.bassProPartnerId);
      parsed.searchParams.set('utm_source', 'affiliate');
      return parsed.toString();
    }

    if (store === 'target' && config.targetPartnerId) {
      parsed.searchParams.set('afid', config.targetPartnerId);
      return parsed.toString();
    }

    if (store === 'bestbuy' && config.bestBuyPartnerId) {
      parsed.searchParams.set('irclickid', config.bestBuyPartnerId);
      return parsed.toString();
    }

    return url;
  } catch {
    // If not a valid absolute URL, return as-is
    return url;
  }
}

/**
 * Generates an instant product search link for a retailer with affiliate tag attached
 */
export function generateStoreSearchUrl(query, store = 'amazon', config = getStoredAffiliateConfig()) {
  const encQuery = encodeURIComponent(query);

  if (store === 'amazon') {
    const base = `https://www.amazon.com/s?k=${encQuery}`;
    return config.enabled && config.amazonTag ? `${base}&tag=${encodeURIComponent(config.amazonTag)}` : base;
  }

  if (store === 'walmart') {
    const base = `https://www.walmart.com/search?q=${encQuery}`;
    return config.enabled && config.walmartPublisherId
      ? `${base}&wmlspartner=${encodeURIComponent(config.walmartPublisherId)}`
      : base;
  }

  if (store === 'basspro' || store === 'cabelas') {
    const host = store === 'cabelas' ? 'www.cabelas.com' : 'www.basspro.com';
    const base = `https://${host}/shop/en/SearchDisplay?searchTerm=${encQuery}`;
    return config.enabled && config.bassProPartnerId
      ? `${base}&affCode=${encodeURIComponent(config.bassProPartnerId)}`
      : base;
  }

  if (store === 'target') {
    const base = `https://www.target.com/s?searchTerm=${encQuery}`;
    return config.enabled && config.targetPartnerId
      ? `${base}&afid=${encodeURIComponent(config.targetPartnerId)}`
      : base;
  }

  if (store === 'bestbuy') {
    const base = `https://www.bestbuy.com/site/searchpage.jsp?st=${encQuery}`;
    return config.enabled && config.bestBuyPartnerId
      ? `${base}&irclickid=${encodeURIComponent(config.bestBuyPartnerId)}`
      : base;
  }

  return `https://www.google.com/search?q=${encQuery}`;
}
