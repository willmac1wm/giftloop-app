// Shared send path for any gift-type app: email, text, and the reveal link.
import { encodeSecretPayload } from './crypto.js';
import { getStoredAffiliateConfig } from './affiliate.js';

function livePerson(event, person) {
  if (!person) return {};
  const current = (event.participants || []).find((item) => item.id === person.id);
  return { ...person, ...(current || {}) };
}

function affiliateSnapshot() {
  try {
    if (typeof localStorage === 'undefined') return undefined;
    return getStoredAffiliateConfig();
  } catch {
    return undefined;
  }
}

export function buildRevealPayload(event, match) {
  const giver = livePerson(event, match.giver);
  const receiver = livePerson(event, match.receiver);
  const payload = {
    giverName: giver.name,
    receiverName: receiver.name,
    wishlist: receiver.wishlist || [],
    listTitle: receiver.listTitle || '',
    ageBand: receiver.ageBand || '',
    shopFor: receiver.shopFor || '',
    likes: receiver.likes || '',
    dislikes: receiver.dislikes || '',
    budget: event.budget,
    exchangeDate: event.exchangeDate,
    eventTitle: event.title,
    rules: event.rules,
  };
  const affiliate = affiliateSnapshot();
  if (affiliate) payload.affiliate = affiliate;
  return payload;
}

export function buildRevealUrl(event, match) {
  const token = encodeSecretPayload(buildRevealPayload(event, match));
  const origin = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  return `${origin}?view=reveal&t=${token}`;
}

export function whatsAppText(event, giverName, url) {
  const custom = (event.inviteMessage || '').trim();
  if (custom) {
    return `Hi ${giverName}! ${custom}\n\nYour private link:\n${url}`;
  }
  return `🎄 Hi ${giverName}! Here is your secret Secret Santa draw link for "${event.title}":\n\n${url}\n\nTap to unwrap your match! 🤫`;
}

export function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function emailHref(event, giverName, email, url) {
  const to = looksLikeEmail(email) ? String(email).trim() : '';
  const subject = encodeURIComponent(`Your private link for ${event.title || 'Secret Santa'}`);
  const body = encodeURIComponent(smsText(event, giverName, url));
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

export function smsHref(phone, body) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  const encoded = encodeURIComponent(body);
  if (!digits) return `sms:?&body=${encoded}`;
  return `sms:${digits}?&body=${encoded}`;
}

export function smsText(event, giverName, url) {
  const custom = (event.inviteMessage || '').trim();
  if (custom) {
    return `Hi ${giverName}! ${custom}\n\nYour private link:\n${url}`;
  }
  return `Hi ${giverName}! Here is your Secret Santa draw link: ${url}`;
}

export function nativeShareText(event, giverName) {
  const custom = (event.inviteMessage || '').trim();
  if (custom) return `Hi ${giverName}! ${custom}`;
  return `🎄 Hi ${giverName}! Here is your secret Secret Santa draw link. Tap to unwrap:`;
}

export function copyAllText(event, matches) {
  const lines = matches.map((match) => {
    const url = buildRevealUrl(event, match);
    return `🎁 ${match.giver.name}: ${url}`;
  }).join('\n\n');

  const custom = (event.inviteMessage || '').trim();
  if (custom) {
    return `🎁 ${event.title}\n${custom}\n\n${lines}`;
  }
  return `🎄 Secret Santa Links - ${event.title}\n\n${lines}`;
}
