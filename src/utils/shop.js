import { curatedGiftIdeas } from '../data/mockData.js';
import { profileGiftQuery } from '../data/giftProfile.js';

export function budgetCeiling(budget) {
  const nums = String(budget || '').match(/\d+(?:\.\d+)?/g);
  if (!nums || nums.length === 0) return null;
  return Math.max(...nums.map(Number));
}

export function ideasWithinBudget(budget, limit = 4) {
  const ceiling = budgetCeiling(budget);
  const items = curatedGiftIdeas.flatMap((category) => category.items.map((item) => ({
    ...item,
    priceValue: Number(String(item.price).replace(/[^0-9.]/g, '')) || null,
  })));
  const fitting = ceiling == null
    ? items
    : items.filter((item) => item.priceValue != null && item.priceValue <= ceiling + 5);
  const pool = fitting.length >= 3 ? fitting : items;
  return pool.slice(0, limit);
}

export function shopQuery({ receiverName, likes, wishlist, budget, ageBand, shopFor }) {
  const wishes = wishlist || [];
  for (const item of wishes) {
    const title = typeof item === 'object' && item ? item.title : item;
    if (title && !String(title).startsWith('http')) return String(title);
  }
  const like = String(likes || '').split(/[,.]/).map((part) => part.trim()).find(Boolean);
  if (like) return like;
  const profile = profileGiftQuery({ shopFor, ageBand });
  const ceiling = budgetCeiling(budget);
  if (profile && ceiling) return `gifts for a ${profile} under $${ceiling}`;
  if (profile) return `gifts for a ${profile}`;
  if (ceiling) return `gifts under $${ceiling}`;
  return receiverName ? `gift for ${receiverName}` : 'gift ideas';
}
