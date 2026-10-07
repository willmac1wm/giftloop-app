import { applyAffiliateTag } from "../utils/affiliate.js";

const BLOCKED_EXTENSIONS = new Set(["exe", "dmg", "apk", "bat", "cmd", "scr", "msi", "jar", "js", "ps1", "sh"]);

const SHORTENERS = new Set(["amzn.to", "a.co", "bit.ly", "t.co", "tinyurl.com", "lnkd.in", "goo.gl"]);

const RETAILERS = [
  { id: "amazon", domains: ["amazon.com", "amazon.co.uk", "amazon.ca", "amazon.de", "amazon.fr", "amazon.it", "amazon.es", "amazon.co.jp", "amazon.com.au", "amazon.in", "amazon.com.mx"] },
  { id: "walmart", domains: ["walmart.com"] },
  { id: "target", domains: ["target.com"] },
  { id: "basspro", domains: ["basspro.com"] },
  { id: "cabelas", domains: ["cabelas.com"] },
  { id: "bestbuy", domains: ["bestbuy.com"] },
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

function matchRetailer(host) {
  return RETAILERS.find((retailer) => retailer.domains.some((domain) => hostMatches(host, domain)))?.id || "";
}

export function classifyProductUrl(raw) {
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
    retailer: matchRetailer(host),
    originalUrl,
    host,
  };
}

export function shoppingDestination(classification, config) {
  if (!classification?.ok || classification.shortened || !classification.retailer) {
    return {
      ...classification,
      shoppingUrl: classification?.originalUrl || "",
      affiliateApplied: false,
    };
  }
  const shoppingUrl = applyAffiliateTag(classification.originalUrl, config);
  return {
    ...classification,
    shoppingUrl,
    affiliateApplied: shoppingUrl !== classification.originalUrl,
  };
}

export function prepareShoppingLink(raw, config) {
  const classified = classifyProductUrl(raw);
  if (!classified.ok) return classified;
  return shoppingDestination(classified, config);
}
