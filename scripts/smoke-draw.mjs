import { initialSecretSantaEvent } from '../src/data/mockData.js';
import {
  createBlankSecretSantaEvent,
  isUntouchedSeedDemo,
  materializeParticipants,
  normalizeLoadedEvent,
  pruneExclusions,
} from '../src/data/eventState.js';
import {
  BUDGET_PRESETS,
  datePresetsFor,
  defaultInviteMessage,
  isDetailsComplete,
} from '../src/data/exchangePresets.js';
import { generateSecretSantaDraw } from '../src/utils/shuffle.js';
import { buildRevealPayload } from '../src/utils/revealLink.js';
import { decodeSecretPayload, encodeSecretPayload } from '../src/utils/crypto.js';

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

console.log('smoke ok');
console.log('christmas presets:', christmas.join(', '));
console.log('sample match:', `${draw.matches[0].giver.name} → ${draw.matches[0].receiver.name}`);
