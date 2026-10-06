/** Blank exchange shown on a fresh visit. Sample data stays in `initialSecretSantaEvent`. */
export const emptySecretSantaEvent = {
  title: '',
  budget: '',
  exchangeDate: '',
  occasion: '',
  rules: '',
  organizerName: '',
  organizerIncluded: true,
  mutualExclusions: true,
  guestDrafts: [
    { id: 'guest_1', name: '' },
    { id: 'guest_2', name: '' },
  ],
  participants: [],
  exclusions: [],
  matches: null,
  setupComplete: false,
  wizardStep: 0,
};

export const initialSecretSantaEvent = {
  title: 'Holiday Friends & Family 2026',
  budget: '$30 - $40',
  exchangeDate: '2026-12-24',
  rules: 'Keep gifts wrapped until party time! Homemade treats and thoughtful gag gifts welcome.',
  participants: [
    {
      id: 'p1',
      name: 'Maya Lin',
      email: 'maya@example.com',
      wishlist: ['Hand-poured cedarwood candle', 'Ceramic pour-over dripper', 'Warm wool beanie'],
      likes: 'Coffee, sci-fi novels, pottery, plants',
      dislikes: 'Scented lotions, plastic knick-knacks',
    },
    {
      id: 'p2',
      name: 'Liam Chen',
      email: 'liam@example.com',
      wishlist: ['Board game (Wingspan or Cascadia)', 'Matcha whisk set', 'Japanese pens'],
      likes: 'Board games, cooking, mechanical keyboards',
      dislikes: 'Sweets with nuts (peanut allergy)',
    },
    {
      id: 'p3',
      name: 'Sophia Rodriguez',
      email: 'sophia@example.com',
      wishlist: ['Travel cocktail shaker', 'French press', 'Silk sleep mask'],
      likes: 'Mixology, travel, indie cinema, yoga',
      dislikes: 'Dairy chocolates, novelty socks',
    },
    {
      id: 'p4',
      name: 'Marcus Vance',
      email: 'marcus@example.com',
      wishlist: ['Cast iron skillet cleaner chainmail', 'Hot sauce sampler', 'Field Notes notebooks'],
      likes: 'Cooking outdoors, vinyl records, woodworking',
      dislikes: 'Cluttered desk ornaments',
    },
    {
      id: 'p5',
      name: 'Elena Rostova',
      email: 'elena@example.com',
      wishlist: ['Insulated tumbler (20oz)', 'Aromatherapy bath salts', 'Baking spatula set'],
      likes: 'Baking, hiking, cozy mystery books',
      dislikes: 'Cologne / perfume',
    },
    {
      id: 'p6',
      name: 'Oliver Thorne',
      email: 'oliver@example.com',
      wishlist: ['Pocket multitool (Gerber/Leatherman)', 'Gourmet hot cocoa mix', 'Wool hiking socks'],
      likes: 'Camping, photography, craft beers',
      dislikes: 'Cheap plastic flashlights',
    },
  ],
  exclusions: [
    // Maya & Liam are partners -> don't draw each other
    { giverId: 'p1', receiverId: 'p2' },
    { giverId: 'p2', receiverId: 'p1' },
    // Sophia & Marcus were pairs last year
    { giverId: 'p3', receiverId: 'p4' },
    { giverId: 'p4', receiverId: 'p3' },
  ],
  matches: null, // Will populate on draw
};

export const emptyWhiteElephantEvent = {
  title: 'White Elephant',
  maxStealsPerGift: 3,
  roundOneRedemption: true,
  players: [],
  currentTurn: 1,
  gameStage: 'setup',
  gifts: [],
  logs: [],
};

export const initialWhiteElephantEvent = {
  title: 'Holiday White Elephant Gala',
  maxStealsPerGift: 3,
  roundOneRedemption: true,
  players: [
    { id: 'we1', name: 'Maya Lin', order: 1 },
    { id: 'we2', name: 'Liam Chen', order: 2 },
    { id: 'we3', name: 'Sophia Rodriguez', order: 3 },
    { id: 'we4', name: 'Marcus Vance', order: 4 },
    { id: 'we5', name: 'Elena Rostova', order: 5 },
    { id: 'we6', name: 'Oliver Thorne', order: 6 },
  ],
  currentTurn: 1,
  gameStage: 'setup', // 'setup' | 'in_progress' | 'completed'
  gifts: [],
  logs: [],
};

export const curatedGiftIdeas = [
  {
    category: 'White Elephant Favorites (Gag & Fun)',
    items: [
      { name: 'Burrito Swaddle Blanket', price: '$22', desc: 'Hilarious realistic giant tortilla plush blanket' },
      { name: 'Desktop Miniature Wacky Flailing Inflatable Tube Guy', price: '$12', desc: 'Instant office morale booster' },
      { name: 'Bacon-Flavored Dental Floss & Toothpaste', price: '$10', desc: 'Quirky gag stocking stuffer' },
      { name: 'Bob Ross Chia Pet', price: '$24', desc: 'Happy little chia plants sprouting on Bob’s head' },
      { name: 'Shower Beer Can / Beverage Holder', price: '$14', desc: 'Silicone suction grip for shower relaxation' },
    ],
  },
  {
    category: 'Cozy & Home ($20 - $35)',
    items: [
      { name: 'Electric Candle Warmer Lamp with Timer', price: '$28', desc: 'Melt scented candles safely with no flame or soot' },
      { name: 'Chunky Knit Chenille Throw Blanket', price: '$35', desc: 'Ultra-soft cozy winter staple' },
      { name: 'Handcrafted Ceramic Mug with Stirrer', price: '$22', desc: 'Heavy textured stoneware mug' },
      { name: 'Simmer Pot Potpourri Holiday Blend', price: '$16', desc: 'Dehydrated oranges, cinnamon sticks & cloves' },
    ],
  },
  {
    category: 'Foodie & Kitchen ($25 - $45)',
    items: [
      { name: 'TRUFF Original Black Truffle Hot Sauce', price: '$18', desc: 'Gourmet chili sauce infused with black truffle' },
      { name: 'Microplane Premium Classic Zester / Grater', price: '$17', desc: 'The gold standard for parmesan, lemon zest and garlic' },
      { name: 'Lodge 10.25-Inch Cast Iron Skillet', price: '$24', desc: 'Heirloom quality seasoned cast iron' },
      { name: 'Bespoke Gourmet Popcorn Seasoning Trio', price: '$21', desc: 'White cheddar, spicy sriracha, sweet churro' },
    ],
  },
  {
    category: 'Tech & EDC Gadgets ($25 - $50)',
    items: [
      { name: 'Anker MagGo 3-in-1 Foldable Charger', price: '$39', desc: 'Travel friendly Qi2 wireless charging pad' },
      { name: 'Tile Mate Bluetooth Item Tracker (2-Pack)', price: '$34', desc: 'Find keys, wallets and bags with iOS/Android' },
      { name: 'JBL GO 3 Ultra-Portable Waterproof Speaker', price: '$38', desc: 'Punchy bass, IP67 waterproof, lanyard loop' },
      { name: 'USB Rechargeable Arc Candle Lighter', price: '$15', desc: 'Windproof electric plasma beam lighter' },
    ],
  },
];
