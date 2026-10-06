import { encodeSecretPayload } from './crypto.js';

export function buildRevealPayload(event, match) {
  return {
    giverName: match.giver.name,
    receiverName: match.receiver.name,
    wishlist: match.receiver.wishlist || [],
    likes: match.receiver.likes || '',
    dislikes: match.receiver.dislikes || '',
    budget: event.budget,
    exchangeDate: event.exchangeDate,
    eventTitle: event.title,
    rules: event.rules,
  };
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
