const BLOCKED_EXTENSIONS = new Set(["exe", "dmg", "apk", "bat", "cmd", "scr", "msi", "jar", "js", "ps1", "sh"]);

const SHORTENERS = new Set(["amzn.to", "a.co", "bit.ly", "t.co", "tinyurl.com", "lnkd.in", "goo.gl"]);

export const DEFAULT_MERCHANTS = [
  {
    id: "amazon",
    name: "Amazon",
    domains: ["amazon.com", "amazon.co.uk", "amazon.ca", "amazon.de", "amazon.fr", "amazon.it", "amazon.es", "amazon.co.jp", "amazon.com.au", "amazon.in", "amazon.com.mx"],
    affiliateParam: "tag",
    configKey: "amazonTag",
    enabled: true,
    countries: "US,UK,CA,DE,FR,IT,ES,JP,AU,IN,MX",
  },
  { id: "walmart", name: "Walmart", domains: ["walmart.com"], affiliateParam: "wmlspartner", configKey: "walmartPublisherId", enabled: true, countries: "US" },
  { id: "target", name: "Target", domains: ["target.com"], affiliateParam: "afid", configKey: "targetPartnerId", enabled: true, countries: "US" },
  { id: "basspro", name: "Bass Pro Shops", domains: ["basspro.com"], affiliateParam: "affCode", configKey: "bassProPartnerId", enabled: true, countries: "US" },
  { id: "cabelas", name: "Cabela's", domains: ["cabelas.com"], affiliateParam: "affCode", configKey: "bassProPartnerId", enabled: true, countries: "US" },
  { id: "bestbuy", name: "Best Buy", domains: ["bestbuy.com"], affiliateParam: "irclickid", configKey: "bestBuyPartnerId", enabled: true, countries: "US" },
];

function hostMatches(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
}

export function isBlockedHost(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host.includes(":")) {
    return host === "::1" || host.startsWith("fe80:") || /^f[cd][0-9a-f:]/i.test(host);
  }
  const parts = host.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) return false;
  const nums = parts.map((part) => Number(part));
  if (nums.some((num) => num > 255)) return false;
  const [a, b] = nums;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function matchRetailer(host, merchants) {
  return (merchants || DEFAULT_MERCHANTS).find((merchant) =>
    String(merchant.domains || "")
      .split(",")
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean)
      .some((domain) => hostMatches(host, domain)),
  );
}

export function classifyProductUrl(raw, merchants = DEFAULT_MERCHANTS) {
  const text = String(raw || "").trim();
  if (!text) return { ok: false, reason: "Enter a product link or leave the link blank." };
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    return { ok: false, reason: "That link is not a valid web address." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "Only web links can be saved." };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: "Links with a username or password are not saved." };
  }
  const host = parsed.hostname.toLowerCase();
  if (isBlockedHost(host)) return { ok: false, reason: "That address is not a public retailer." };
  const extension = parsed.pathname.split(".").pop()?.toLowerCase();
  if (extension && BLOCKED_EXTENSIONS.has(extension)) {
    return { ok: false, reason: "That file cannot be saved as a gift link." };
  }
  const merchant = matchRetailer(host, merchants);
  const originalUrl = parsed.toString();
  if (SHORTENERS.has(host)) {
    return {
      ok: true,
      shortened: true,
      retailer: "",
      originalUrl,
      shoppingUrl: originalUrl,
      affiliateApplied: false,
    };
  }
  return {
    ok: true,
    shortened: false,
    retailer: merchant?.id || "",
    merchant,
    originalUrl,
    host,
  };
}

export function shoppingDestination(classification, config, merchants = DEFAULT_MERCHANTS) {
  if (!classification?.ok || classification.shortened || !classification.retailer) {
    return {
      ...classification,
      shoppingUrl: classification?.originalUrl || "",
      affiliateApplied: false,
    };
  }
  const merchant = (merchants || DEFAULT_MERCHANTS).find((item) => item.id === classification.retailer) || classification.merchant;
  const tag = merchant?.enabled && merchant.affiliateParam && merchant.configKey ? config?.[merchant.configKey] : "";
  if (!tag) {
    return { ...classification, shoppingUrl: classification.originalUrl, affiliateApplied: false };
  }
  const parsed = new URL(classification.originalUrl);
  parsed.searchParams.set(merchant.affiliateParam, tag);
  const shoppingUrl = parsed.toString();
  return {
    ...classification,
    shoppingUrl,
    affiliateApplied: shoppingUrl !== classification.originalUrl,
  };
}

export function prepareShoppingLink(raw, config, merchants = DEFAULT_MERCHANTS) {
  const classified = classifyProductUrl(raw, merchants);
  if (!classified.ok) return classified;
  return shoppingDestination(classified, config, merchants);
}

export async function followRedirects(startUrl, { fetchImpl = globalThis.fetch, lookupImpl } = {}) {
  let current = startUrl;
  for (let hop = 0; hop < 4; hop += 1) {
    let parsed;
    try {
      parsed = new URL(current);
    } catch {
      return { ok: false, reason: "That link is not a valid web address." };
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, reason: "Only web links can be saved." };
    }
    if (isBlockedHost(parsed.hostname)) return { ok: false, reason: "That address is not a public retailer." };
    if (lookupImpl) {
      try {
        const records = await lookupImpl(parsed.hostname);
        const list = Array.isArray(records) ? records : [records];
        if (list.some((row) => isBlockedHost(row.address || row))) {
          return { ok: false, reason: "That address is not a public retailer." };
        }
      } catch {
        return { ok: true, unresolved: true };
      }
    }
    if (hop > 0 && !SHORTENERS.has(parsed.hostname.toLowerCase())) {
      return { ok: true, finalUrl: parsed.toString() };
    }
    let response;
    try {
      response = await fetchImpl(parsed.toString(), { method: "GET", redirect: "manual" });
    } catch {
      return { ok: true, unresolved: true };
    }
    const location = response.headers?.get?.("location") || response.headers?.location || "";
    if (!location || response.status < 300 || response.status >= 400) return { ok: true, unresolved: true };
    current = new URL(location, parsed).toString();
  }
  return { ok: false, reason: "That short link did not resolve to a retailer." };
}

export async function finalizeShoppingLink(raw, config, options = {}) {
  const merchants = options.merchants || DEFAULT_MERCHANTS;
  const first = classifyProductUrl(raw, merchants);
  if (!first.ok) return first;
  if (!first.shortened) return shoppingDestination(first, config, merchants);
  const followed = await followRedirects(first.originalUrl, options);
  if (!followed.ok) return followed;
  if (followed.unresolved) {
    return { ...first, shoppingUrl: first.originalUrl, affiliateApplied: false, unresolved: true };
  }
  const landed = classifyProductUrl(followed.finalUrl, merchants);
  if (!landed.ok) return landed;
  const ready = shoppingDestination(landed, config, merchants);
  return { ...ready, shortened: true, originalUrl: first.originalUrl };
}
