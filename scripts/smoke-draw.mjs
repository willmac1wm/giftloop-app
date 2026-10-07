import { initialSecretSantaEvent } from '../src/data/mockData.js';
import {
  createBlankSecretSantaEvent,
  isUntouchedSeedDemo,
  applyImportedPeople,
  materializeParticipants,
  normalizeLoadedEvent,
  parsePeopleList,
  pruneExclusions,
} from '../src/data/eventState.js';
import {
  BUDGET_PRESETS,
  datePresetsFor,
  defaultInviteMessage,
  isDetailsComplete,
} from '../src/data/exchangePresets.js';
import { generateSecretSantaDraw } from '../src/utils/shuffle.js';
import { buildRevealPayload, emailHref, smsHref } from '../src/utils/revealLink.js';
import { decodeSecretPayload, encodeSecretPayload } from '../src/utils/crypto.js';
import {
  DEFAULT_AFFILIATE_CONFIG,
  generateStoreSearchUrl,
  readAffiliateValue,
  usesSampleAffiliateCodes,
} from '../src/utils/affiliate.js';
import { dealLinks, isPrimeBigDealDays } from '../src/utils/deals.js';
import { ideasWithinBudget, shopQuery } from '../src/utils/shop.js';
import { filterGifts } from '../src/utils/giftFinder.js';
import { normalizeSmsTo, readProviders } from '../src/server/messages.js';
import { drawMembers, revealUrl } from '../src/server/assignments.js';

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
}

const today = new Date(2026, 9, 6);
const christmas = datePresetsFor('christmas', today).map((item) => item.iso);
assert(christmas.includes('2026-12-19'), `expected Dec 19 preset, got ${christmas.join(', ')}`);
assert(christmas.includes('2026-12-24'), `expected Dec 24 preset, got ${christmas.join(', ')}`);
assert(christmas.includes('2026-12-25'), `expected Dec 25 preset, got ${christmas.join(', ')}`);

const secretSanta = datePresetsFor('secret-santa', today).map((item) => item.iso);
assert(secretSanta.includes('2026-12-25'), 'Secret Santa should offer a Christmas-week date');

const thanksgiving = datePresetsFor('thanksgiving', today).map((item) => item.iso);
assert(thanksgiving.includes('2026-11-26'), `expected Thanksgiving 2026-11-26, got ${thanksgiving.join(', ')}`);

const easter = datePresetsFor('easter', new Date(2026, 0, 15)).map((item) => item.iso);
assert(easter.includes('2026-04-05'), `expected Easter 2026-04-05, got ${easter.join(', ')}`);

assert(BUDGET_PRESETS.includes('$20') && BUDGET_PRESETS.includes('$100'), 'budget presets should span $20–$100');

const blank = createBlankSecretSantaEvent();
assert(blank.setupComplete === false, 'new events start in the wizard');
assert(blank.participants.length === 0, 'new events are not pre-filled');
assert(blank.title === '', 'new events have an empty title');
assert(blank.includeOrganizer === true, 'organizer is included by default');

const seeded = normalizeLoadedEvent(
  JSON.parse(JSON.stringify(initialSecretSantaEvent)),
  { ...initialSecretSantaEvent, setupComplete: undefined },
  createBlankSecretSantaEvent,
);
assert(seeded.setupComplete === true, 'explicit demo load stays in the studio');

const legacyUntouched = JSON.parse(JSON.stringify(initialSecretSantaEvent));
delete legacyUntouched.setupComplete;
const seedWithoutFlag = JSON.parse(JSON.stringify(initialSecretSantaEvent));
delete seedWithoutFlag.setupComplete;
assert(isUntouchedSeedDemo(legacyUntouched, seedWithoutFlag), 'untouched demo should be detected');
const migrated = normalizeLoadedEvent(legacyUntouched, seedWithoutFlag, createBlankSecretSantaEvent);
assert(migrated.setupComplete === false && migrated.participants.length === 0, 'untouched demo opens the wizard');

const customLegacy = {
  ...legacyUntouched,
  title: 'Office party',
};
const kept = normalizeLoadedEvent(customLegacy, seedWithoutFlag, createBlankSecretSantaEvent);
assert(kept.setupComplete === true && kept.title === 'Office party', 'edited legacy events stay in the studio');

const draft = {
  ...blank,
  organizerName: 'Ada',
  includeOrganizer: true,
  nameRows: [
    { id: 'p_bea', name: 'Bea' },
    { id: 'p_cam', name: ' Cam ' },
    { id: 'p_dee', name: 'Dee' },
    { id: 'p_blank', name: '   ' },
  ],
};
const people = materializeParticipants(draft);
assert(people.map((p) => p.name).join(',') === 'Ada,Bea,Cam,Dee', `names materialized wrong: ${people.map((p) => p.name)}`);
assert(people[0].isOrganizer === true, 'organizer flag');

const notJoining = materializeParticipants({ ...draft, includeOrganizer: false });
assert(notJoining.map((p) => p.name).join(',') === 'Bea,Cam,Dee', 'organizer can sit out');

const exclusions = [
  { giverId: people[0].id, receiverId: people[1].id },
  { giverId: people[1].id, receiverId: people[0].id },
  { giverId: 'missing', receiverId: people[2].id },
];
const pruned = pruneExclusions(exclusions, people);
assert(pruned.length === 2, 'stale exclusions are dropped');

const draw = generateSecretSantaDraw(people, pruned, true);
assert(draw.success, draw.error || 'draw failed');
for (const match of draw.matches) {
  assert(match.giver.id !== match.receiver.id, 'self-draw');
  assert(
    !pruned.some((ex) => ex.giverId === match.giver.id && ex.receiverId === match.receiver.id),
    'exclusion violated',
  );
}
const receivers = new Set(draw.matches.map((match) => match.receiver.id));
assert(receivers.size === people.length, 'everyone receives one gift');

const impossible = generateSecretSantaDraw(
  people.slice(0, 2),
  [
    { giverId: people[0].id, receiverId: people[1].id },
    { giverId: people[1].id, receiverId: people[0].id },
  ],
  true,
);
assert(impossible.success === false, 'mutual exclusion of a pair of two must fail');

const event = {
  ...blank,
  title: 'Christmas 2026',
  occasion: 'christmas',
  occasionLabel: 'Christmas',
  exchangeDate: '2026-12-25',
  budget: '$25',
  rules: 'Wrapped gifts.',
  inviteMessage: defaultInviteMessage({
    title: 'Christmas 2026',
    occasionLabel: 'Christmas',
    exchangeDate: '2026-12-25',
    budget: '$25',
  }),
};
assert(isDetailsComplete(event), 'complete details should pass');
assert(!isDetailsComplete({ ...event, budget: '' }), 'budget is required');
assert(event.inviteMessage.includes('Christmas 2026'), 'invite message uses the exchange name');
assert(event.inviteMessage.includes('$25'), 'invite message uses the budget');

const payload = buildRevealPayload(event, draw.matches[0]);
const decoded = decodeSecretPayload(encodeSecretPayload(payload));
assert(decoded.receiverName === draw.matches[0].receiver.name, 'reveal token round-trip');
assert(decoded.budget === '$25', 'budget is stored on the reveal token');
assert(decoded.eventTitle === 'Christmas 2026', 'title is stored on the reveal token');
assert(!JSON.stringify(decoded).includes('@'), 'reveal payload from the wizard has no email');

const contacted = materializeParticipants({
  ...blank,
  organizerName: 'Ada',
  organizerEmail: 'ada@example.com',
  organizerPhone: '555-0100',
  includeOrganizer: true,
  nameRows: [{ id: 'p_bea', name: 'Bea', email: 'bea@example.com', phone: '555-0101' }],
});
assert(contacted[0].email === 'ada@example.com' && contacted[0].phone === '555-0100', 'organizer contact');
assert(contacted[1].email === 'bea@example.com' && contacted[1].phone === '555-0101', 'friend contact');

const mail = emailHref(event, 'Bea', 'bea@example.com', 'https://giftloop.test/?view=reveal&t=abc');
assert(mail.startsWith('mailto:bea@example.com?'), mail);
assert(decodeURIComponent(mail).includes('https://giftloop.test'), 'email body includes the private link');

const text = smsHref('(555) 010-0101', 'Hi Bea');
assert(text.startsWith('sms:5550100101'), text);
assert(text.includes('body=Hi%20Bea'), 'text body is included');

const amazon = generateStoreSearchUrl('wool socks', 'amazon', DEFAULT_AFFILIATE_CONFIG);
assert(amazon.includes('tag=giftloop-20'), amazon);

const duringSale = dealLinks(DEFAULT_AFFILIATE_CONFIG, new Date('2026-10-06T18:00:00.000Z'));
assert(duringSale.live && duringSale.title.includes('Prime Big Deal Days'), duringSale.title);
assert(duringSale.stores[0].href.includes('primebigdealdays') && duringSale.stores[0].href.includes('tag=giftloop-20'), duringSale.stores[0].href);
assert(duringSale.stores.every((store) => store.href.includes('giftloop')), 'every deal link carries a referral id');
const cabelas = generateStoreSearchUrl('wool socks', 'cabelas', DEFAULT_AFFILIATE_CONFIG);
assert(cabelas.includes('cabelas.com') && cabelas.includes('affCode=giftloop'), cabelas);

const pastedAmazon = readAffiliateValue('amazon', 'https://www.amazon.com/s?k=socks&tag=mytag-20');
assert(pastedAmazon.value === 'mytag-20' && pastedAmazon.status === 'code', JSON.stringify(pastedAmazon));
assert(readAffiliateValue('amazon', '  mytag-20  ').value === 'mytag-20', 'plain amazon code');
assert(readAffiliateValue('walmart', 'https://www.walmart.com/search?q=hat&wmlspartner=pub123').value === 'pub123', 'walmart link');
assert(readAffiliateValue('basspro', 'https://www.cabelas.com/shop/en/SearchDisplay?searchTerm=tent&affCode=outdoor1').value === 'outdoor1', 'cabelas link');
assert(readAffiliateValue('target', 'https://www.target.com/s?searchTerm=mug&clkid=tgt9').value === 'tgt9', 'target link');
assert(readAffiliateValue('bestbuy', 'https://www.bestbuy.com/site/searchpage.jsp?st=headphones&irclickid=bb42').value === 'bb42', 'best buy link');
assert(readAffiliateValue('amazon', 'https://www.amazon.com/s?k=socks').status === 'missing', 'link without a tag');
const customCodes = { ...DEFAULT_AFFILIATE_CONFIG, amazonTag: 'mytag-20', bestBuyPartnerId: 'bb42' };
assert(generateStoreSearchUrl('wool socks', 'amazon', customCodes).includes('tag=mytag-20'), 'custom amazon search');
assert(generateStoreSearchUrl('headphones', 'bestbuy', customCodes).includes('irclickid=bb42'), 'custom best buy search');
assert(usesSampleAffiliateCodes(DEFAULT_AFFILIATE_CONFIG), 'defaults are the sample codes');
assert(!usesSampleAffiliateCodes(customCodes), 'a replaced tag is no longer the sample set');
const afterSale = dealLinks(DEFAULT_AFFILIATE_CONFIG, new Date('2026-10-09T00:00:00.000Z'));
assert(!afterSale.live && afterSale.stores[0].href.includes('/deals'), afterSale.stores[0].href);
assert(isPrimeBigDealDays(new Date('2026-10-07T20:00:00.000Z')), 'sale still open on Oct 7 evening Pacific');

const imported = parsePeopleList('Ada, ada@example.com\nBea bea@example.com 555-0101\n');
assert(imported.length === 2 && imported[0].name === 'Ada' && imported[1].phone.includes('555'), JSON.stringify(imported));
const importedEvent = applyImportedPeople(blank, imported);
const importedPeople = materializeParticipants({
  ...importedEvent,
  organizerListTitle: "Ada's list",
  organizerAgeBand: '25-34',
  organizerShopFor: 'woman',
  organizerWishes: 'Wool socks\nCandle',
});
assert(importedPeople[0].wishlist.join('|') === 'Wool socks|Candle', importedPeople[0].wishlist.join('|'));
const query = shopQuery({
  receiverName: 'Ada',
  wishlist: [],
  budget: '$25',
  ageBand: '25-34',
  shopFor: 'woman',
});
assert(query.includes('woman') && query.includes('under $25'), query);
const forKids = filterGifts({ ageBand: 'child', shopFor: 'anyone' });
assert(forKids.length > 0 && forKids.every((item) => item.ages.includes('child')), 'child filter');
const underFifteen = filterGifts({ maxPrice: 15 });
assert(underFifteen.every((item) => item.priceValue <= 15), 'price filter');
const forMen = filterGifts({ shopFor: 'man' });
assert(forMen.every((item) => item.shopFor !== 'woman'), 'man filter hides gifts tagged for women');
const ideas = ideasWithinBudget('$25');
assert(ideas.length >= 3, 'shop ideas for a $25 budget');
assert(ideas.every((item) => item.priceValue <= 30), `idea over budget: ${ideas.map((item) => item.price).join(', ')}`);

assert(normalizeSmsTo('(555) 010-0101') === '+15550100101', 'ten digit phones become E.164');
assert(normalizeSmsTo('+44 20 7946 0958') === '+442079460958', 'international numbers keep their country code');
assert(!readProviders({}).emailReady && !readProviders({}).smsReady, 'providers stay off without keys');
assert(readProviders({ RESEND_API_KEY: 'key', EMAIL_FROM: 'gifts@example.com' }).emailReady, 'resend is ready when both email vars exist');
assert(readProviders({ TWILIO_ACCOUNT_SID: 'AC', TWILIO_AUTH_TOKEN: 'tok', TWILIO_FROM_NUMBER: '+15550001111' }).smsReady, 'twilio is ready when all three vars exist');
const serverDraw = drawMembers([{ id: 'a', name: 'Ada' }, { id: 'b', name: 'Bea' }]);
assert(serverDraw.success && serverDraw.matches.length === 2, 'server draw pairs the guest list');
const serverUrl = revealUrl({
  origin: 'https://giftloop.test',
  event: { title: 'Family', budget: '$25', eventDate: '2026-12-25' },
  giver: { name: 'Ada' },
  receiver: { name: 'Bea', wishes: 'Wool socks\nCandle', listTitle: 'Bea list', hobbies: 'hiking' },
  affiliate: { amazonTag: 'mytag-20' },
});
const serverPayload = decodeSecretPayload(new URL(serverUrl).searchParams.get('t'));
assert(serverUrl.startsWith('https://giftloop.test/?view=reveal&t='), serverUrl);
assert(serverPayload.giverName === 'Ada' && serverPayload.receiverName === 'Bea', 'reveal token names the match');
assert(serverPayload.wishlist.join('|') === 'Wool socks|Candle', 'reveal token carries the wish list');
assert(serverPayload.affiliate.amazonTag === 'mytag-20', 'reveal token carries the organizer affiliate tag');

console.log('smoke ok');
console.log('christmas presets:', christmas.join(', '));
console.log('sample match:', `${draw.matches[0].giver.name} → ${draw.matches[0].receiver.name}`);
