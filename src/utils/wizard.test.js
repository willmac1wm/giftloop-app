import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeSecretPayload } from './crypto.js';
import { buildRevealPayload, buildRevealUrl } from './reveal.js';
import {
  applyOccasion,
  commitNames,
  drawEvent,
  holidayYear,
  namedPeopleCount,
  shouldShowWizard,
  toggleExclusion,
} from './wizard.js';

test('holidayYear stays on the current Christmas until Dec 27', () => {
  assert.equal(holidayYear(new Date(2026, 9, 6)), 2026);
  assert.equal(holidayYear(new Date(2026, 11, 26)), 2026);
  assert.equal(holidayYear(new Date(2026, 11, 27)), 2027);
});

test('fresh and legacy events choose wizard vs studio', () => {
  assert.equal(shouldShowWizard(null), true);
  assert.equal(shouldShowWizard({ setupComplete: false, participants: [{ id: 'a' }] }), true);
  assert.equal(shouldShowWizard({ setupComplete: true, participants: [] }), false);
  assert.equal(shouldShowWizard({ participants: [{ id: 'a' }] }), false);
  assert.equal(shouldShowWizard({ participants: [] }), true);
});

test('commitNames keeps the organizer optional and drops blank guests', () => {
  const committed = commitNames({
    organizerName: '  Ada ',
    organizerIncluded: true,
    guestDrafts: [
      { id: 'g1', name: 'Bea' },
      { id: 'g2', name: '   ' },
    ],
    participants: [
      { id: 'g2', name: 'Old', wishlist: ['mug'], likes: 'tea', dislikes: 'nuts', email: 'old@example.com' },
    ],
    exclusions: [{ giverId: 'g2', receiverId: 'g1' }],
    matches: [{ giver: { id: 'g2' }, receiver: { id: 'g1' } }],
  });

  assert.deepEqual(committed.participants.map((p) => p.name), ['Ada', 'Bea']);
  assert.equal(committed.participants[0].id, 'organizer');
  assert.equal(committed.participants[0].role, 'organizer');
  assert.deepEqual(committed.exclusions, []);
  assert.equal(committed.matches, null);
  assert.equal(namedPeopleCount({
    organizerName: 'Ada',
    organizerIncluded: false,
    guestDrafts: [{ id: 'g1', name: 'Bea' }, { id: 'g2', name: '' }],
  }), 1);
});

test('commitNames preserves wishlists and a draw when the roster is unchanged', () => {
  const event = {
    organizerName: 'Ada',
    organizerIncluded: true,
    guestDrafts: [{ id: 'g1', name: 'Bea' }],
    participants: [
      { id: 'organizer', role: 'organizer', name: 'Ada', wishlist: ['book'], likes: 'sci-fi', dislikes: '', email: '' },
      { id: 'g1', name: 'Bea', wishlist: ['tea'], likes: '', dislikes: 'nuts', email: '' },
    ],
    exclusions: [],
    matches: [{ giver: { id: 'organizer' }, receiver: { id: 'g1' } }],
  };
  const again = commitNames(event);
  assert.equal(again.matches, event.matches);
  assert.deepEqual(again.participants[0].wishlist, ['book']);
  assert.equal(again.participants[1].dislikes, 'nuts');

  const renamed = commitNames({ ...event, organizerName: 'Ada Lovelace' });
  assert.equal(renamed.matches, null);
  assert.deepEqual(renamed.participants[0].wishlist, ['book']);
});

test('toggleExclusion adds and removes one direction or both', () => {
  const mutual = toggleExclusion([], 'a', 'b', true);
  assert.equal(mutual.length, 2);
  assert.deepEqual(toggleExclusion(mutual, 'b', 'a', true), []);

  const oneWay = toggleExclusion([], 'a', 'b', false);
  assert.deepEqual(oneWay, [{ giverId: 'a', receiverId: 'b' }]);
  assert.deepEqual(toggleExclusion(oneWay, 'a', 'b', false), []);
});

test('applyOccasion fills an automatic title and leaves a custom one', () => {
  const christmas = applyOccasion({ title: '', autoTitle: '' }, 'christmas', 2026);
  assert.equal(christmas.occasion, 'christmas');
  assert.equal(christmas.title, 'Christmas Gift Exchange 2026');

  const custom = applyOccasion({ title: 'Office Party', autoTitle: '' }, 'christmas', 2026);
  assert.equal(custom.title, 'Office Party');

  const hanukkah = applyOccasion(christmas, 'hanukkah', 2026);
  assert.equal(hanukkah.title, 'Hanukkah Gift Exchange 2026');
});

test('drawEvent reuses the shuffle engine and honors exclusions', () => {
  const people = [
    { id: 'a', name: 'Ada' },
    { id: 'b', name: 'Bea' },
    { id: 'c', name: 'Cy' },
  ];
  const drawn = drawEvent({ participants: people, exclusions: [] });
  assert.equal(drawn.ok, true);
  assert.equal(drawn.event.matches.length, 3);
  for (const match of drawn.event.matches) {
    assert.notEqual(match.giver.id, match.receiver.id);
  }

  const previous = [{ giver: { id: 'a' }, receiver: { id: 'b' } }];
  const impossible = drawEvent({
    participants: [
      { id: 'a', name: 'Ada' },
      { id: 'b', name: 'Bea' },
    ],
    exclusions: [
      { giverId: 'a', receiverId: 'b' },
      { giverId: 'b', receiverId: 'a' },
    ],
    matches: previous,
  });
  assert.equal(impossible.ok, false);
  assert.equal(impossible.event.matches, previous);
});

test('reveal links still encode the giftee, wishlist, and budget', () => {
  const event = {
    title: 'Tree',
    budget: '$25',
    exchangeDate: '2026-12-24',
    rules: 'Fun',
  };
  const match = {
    giver: { name: 'Ada' },
    receiver: { name: 'Bea', wishlist: ['book'], likes: 'sci-fi', dislikes: 'nuts' },
  };
  const payload = buildRevealPayload(event, match);
  assert.equal(payload.receiverName, 'Bea');
  assert.deepEqual(payload.wishlist, ['book']);
  assert.equal(payload.likes, 'sci-fi');

  const url = buildRevealUrl(event, match);
  const token = new URL(url, 'http://localhost').searchParams.get('t');
  const decoded = decodeSecretPayload(token);
  assert.equal(decoded.giverName, 'Ada');
  assert.equal(decoded.receiverName, 'Bea');
  assert.equal(decoded.budget, '$25');
  assert.equal(decoded.eventTitle, 'Tree');
});
