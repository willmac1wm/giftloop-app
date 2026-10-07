import { DEFAULT_AFFILIATE_CONFIG } from './affiliate.js';

const PRIME_BIG_DEAL_DAYS_START = Date.parse('2026-10-06T07:01:00.000Z');
const PRIME_BIG_DEAL_DAYS_END = Date.parse('2026-10-08T06:59:59.000Z');

export function isPrimeBigDealDays(now = new Date()) {
  const time = now instanceof Date ? now.getTime() : Date.parse(now);
  return time >= PRIME_BIG_DEAL_DAYS_START && time <= PRIME_BIG_DEAL_DAYS_END;
}

function withTag(url, enabled, key, value) {
  if (!enabled || !value) return url;
  const parsed = new URL(url);
  parsed.searchParams.set(key, value);
  return parsed.toString();
}

export function dealLinks(config = DEFAULT_AFFILIATE_CONFIG, now = new Date()) {
  const live = isPrimeBigDealDays(now);
  const enabled = config.enabled !== false;
  const amazon = live
    ? 'https://www.amazon.com/primebigdealdays'
    : 'https://www.amazon.com/deals';
  return {
    live,
    title: live ? 'Prime Big Deal Days is here' : 'Holiday deals are here',
    lede: live
      ? 'Amazon’s October sale is open through October 7. Store buttons use Gift Loop referral links.'
      : 'Shop the season. Store buttons use Gift Loop referral links.',
    stores: [
      {
        id: 'amazon',
        name: 'Amazon',
        href: withTag(amazon, enabled, 'tag', config.amazonTag),
      },
      {
        id: 'walmart',
        name: 'Walmart',
        href: withTag('https://www.walmart.com/shop/deals', enabled, 'wmlspartner', config.walmartPublisherId),
      },
      {
        id: 'target',
        name: 'Target',
        href: withTag('https://www.target.com/c/deals/-/N-4xw74', enabled, 'afid', config.targetPartnerId),
      },
      {
        id: 'bestbuy',
        name: 'Best Buy',
        href: withTag(
          'https://www.bestbuy.com/site/electronics/top-deals/pcmcat1563299784494.c?id=pcmcat1563299784494',
          enabled,
          'irclickid',
          config.bestBuyPartnerId,
        ),
      },
      {
        id: 'basspro',
        name: 'Bass Pro Shops',
        href: withTag(
          'https://www.basspro.com/shop/en/SearchDisplay?searchTerm=sale',
          enabled,
          'affCode',
          config.bassProPartnerId,
        ),
      },
      {
        id: 'cabelas',
        name: "Cabela's",
        href: withTag(
          'https://www.cabelas.com/shop/en/SearchDisplay?searchTerm=sale',
          enabled,
          'affCode',
          config.bassProPartnerId,
        ),
      },
    ],
  };
}
