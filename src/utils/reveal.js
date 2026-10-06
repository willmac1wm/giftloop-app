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
