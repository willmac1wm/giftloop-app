import { curatedGiftIdeas } from '../data/mockData.js';

const ADULT = ['18-24', '25-34', '35-44', '45-54', '55+'];
const TEEN_UP = ['teen', ...ADULT];

const TAGS = {
  'Burrito Swaddle Blanket': { shopFor: 'anyone', ages: TEEN_UP },
  'Desktop Miniature Wacky Flailing Inflatable Tube Guy': { shopFor: 'anyone', ages: TEEN_UP },
  'Bacon-Flavored Dental Floss & Toothpaste': { shopFor: 'anyone', ages: TEEN_UP },
  'Bob Ross Chia Pet': { shopFor: 'anyone', ages: TEEN_UP },
  'Shower Beer Can / Beverage Holder': { shopFor: 'man', ages: ADULT },
  'Electric Candle Warmer Lamp with Timer': { shopFor: 'woman', ages: ADULT },
  'Chunky Knit Chenille Throw Blanket': { shopFor: 'anyone', ages: TEEN_UP },
  'Handcrafted Ceramic Mug with Stirrer': { shopFor: 'anyone', ages: TEEN_UP },
  'Simmer Pot Potpourri Holiday Blend': { shopFor: 'woman', ages: ADULT },
  'TRUFF Original Black Truffle Hot Sauce': { shopFor: 'anyone', ages: ADULT },
  'Microplane Premium Classic Zester / Grater': { shopFor: 'anyone', ages: ADULT },
  'Lodge 10.25-Inch Cast Iron Skillet': { shopFor: 'anyone', ages: ADULT },
  'Bespoke Gourmet Popcorn Seasoning Trio': { shopFor: 'anyone', ages: TEEN_UP },
  'Anker MagGo 3-in-1 Foldable Charger': { shopFor: 'anyone', ages: TEEN_UP },
  'Tile Mate Bluetooth Item Tracker (2-Pack)': { shopFor: 'anyone', ages: TEEN_UP },
  'JBL GO 3 Ultra-Portable Waterproof Speaker': { shopFor: 'anyone', ages: TEEN_UP },
  'USB Rechargeable Arc Candle Lighter': { shopFor: 'man', ages: ADULT },
};

const EXTRA = [
  { category: 'For kids', name: 'Dinosaur floor puzzle', price: '$16', desc: '100 pieces, thick board, for a rainy afternoon', shopFor: 'anyone', ages: ['child'] },
  { category: 'For kids', name: 'Washable art caddy', price: '$18', desc: 'Markers, crayons, and a smock that goes in the wash', shopFor: 'anyone', ages: ['child', 'teen'] },
  { category: 'Cozy & Home', name: 'Silk sleep mask', price: '$16', desc: 'Soft band that stays on through the night', shopFor: 'woman', ages: ADULT },
  { category: 'Everyday carry', name: 'Leather card wallet', price: '$28', desc: 'Slim wallet that holds cards and a folded bill', shopFor: 'man', ages: ADULT },
];

const PHOTOS = {
  play: '/shopping/photo-play.jpg',
  home: '/shopping/photo-home.jpg',
  cozy: '/shopping/photo-cozy.jpg',
  kitchen: '/shopping/photo-kitchen.jpg',
  tech: '/shopping/photo-tech.jpg',
  kids: '/shopping/photo-kids.jpg',
  style: '/shopping/photo-style.jpg',
  outdoors: '/shopping/photo-outdoors.jpg',
};

const PHOTO_BY_NAME = {
  'Electric Candle Warmer Lamp with Timer': PHOTOS.cozy,
  'Simmer Pot Potpourri Holiday Blend': PHOTOS.cozy,
  'Silk sleep mask': PHOTOS.style,
  'Shower Beer Can / Beverage Holder': PHOTOS.outdoors,
  'USB Rechargeable Arc Candle Lighter': PHOTOS.outdoors,
};

const PHOTO_BY_CATEGORY = {
  'Playful Gifts': PHOTOS.play,
  'Cozy & Home': PHOTOS.home,
  'Foodie & Kitchen': PHOTOS.kitchen,
  'Tech & EDC Gadgets': PHOTOS.tech,
  'For kids': PHOTOS.kids,
  'Everyday carry': PHOTOS.style,
};

function priceValue(price) {
  return Number(String(price).replace(/[^0-9.]/g, '')) || 0;
}

export function giftCatalog() {
  const fromCurated = curatedGiftIdeas.flatMap((group) => group.items.map((item) => {
    const tags = TAGS[item.name] || {};
    return {
      name: item.name,
      desc: item.desc,
      price: item.price,
      priceValue: priceValue(item.price),
      category: group.category.replace(/\s*\(.*\)$/, ''),
      shopFor: tags.shopFor || 'anyone',
      ages: tags.ages || TEEN_UP,
      photo: PHOTO_BY_NAME[item.name] || PHOTO_BY_CATEGORY[group.category.replace(/\s*\(.*\)$/, '')] || PHOTOS.home,
    };
  }));
  return [
    ...fromCurated,
    ...EXTRA.map((item) => ({
      ...item,
      priceValue: priceValue(item.price),
      photo: PHOTO_BY_CATEGORY[item.category] || PHOTOS.home,
    })),
  ];
}

export const FINDER_CATEGORIES = ['All', ...new Set(giftCatalog().map((item) => item.category))];

export function filterGifts({ query = '', maxPrice = null, shopFor = '', ageBand = '', category = 'All', sort = 'featured' } = {}) {
  const needle = query.trim().toLowerCase();
  let items = giftCatalog().filter((item) => {
    if (category && category !== 'All' && item.category !== category) return false;
    if (maxPrice != null && item.priceValue > maxPrice) return false;
    if (shopFor === 'woman' && item.shopFor === 'man') return false;
    if (shopFor === 'man' && item.shopFor === 'woman') return false;
    if (ageBand && !item.ages.includes(ageBand)) return false;
    if (!needle) return true;
    return `${item.name} ${item.desc} ${item.category}`.toLowerCase().includes(needle);
  });
  if (sort === 'price-asc') items = [...items].sort((a, b) => a.priceValue - b.priceValue);
  if (sort === 'price-desc') items = [...items].sort((a, b) => b.priceValue - a.priceValue);
  return items;
}
