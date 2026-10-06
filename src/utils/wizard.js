import { emptySecretSantaEvent } from '../data/mockData.js';
import { generateSecretSantaDraw } from './shuffle.js';

export const WIZARD_STEPS = ['names', 'exclusions', 'details', 'draw', 'share'];

export const OCCASIONS = [
  { id: 'christmas', label: 'Christmas', emoji: '🎄' },
  { id: 'secret-santa', label: 'Secret Santa', emoji: '🎁' },
  { id: 'hanukkah', label: 'Hanukkah', emoji: '🕎' },
  { id: 'kwanzaa', label: 'Kwanzaa', emoji: '🕯️' },
  { id: 'new-years', label: "New Year's", emoji: '🎉' },
  { id: 'white-elephant', label: 'White Elephant', emoji: '🐘' },
  { id: 'other', label: 'Other', emoji: '✨' },
];

export const BUDGET_PRESETS = ['$15', '$25', '$30 – $40', '$50', '$75', '$100'];

export function holidayYear(date = new Date()) {
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month === 11 && date.getDate() > 26) return year + 1;
  return year;
}

export function datePresets(year = holidayYear()) {
  return [
    { id: 'dec23', label: 'Dec 23', value: `${year}-12-23` },
    { id: 'dec24', label: 'Dec 24', value: `${year}-12-24` },
    { id: 'dec25', label: 'Dec 25', value: `${year}-12-25` },
    { id: 'dec31', label: 'Dec 31', value: `${year}-12-31` },
  ];
}

export function occasionById(id) {
  return OCCASIONS.find((item) => item.id === id) || null;
}

export function occasionTitle(occasionId, year = holidayYear()) {
  const occasion = occasionById(occasionId);
  if (!occasion || occasion.id === 'other') return '';
  return `${occasion.label} Gift Exchange ${year}`;
}

export function createId(prefix = 'p') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-3)}`;
}

export function blankGuestDrafts() {
  return [
    { id: createId('g'), name: '' },
    { id: createId('g'), name: '' },
  ];
}

/** A brand-new exchange. Sample party data is never the default. */
export function freshSecretSantaEvent() {
  return {
    ...emptySecretSantaEvent,
    guestDrafts: blankGuestDrafts(),
    participants: [],
    exclusions: [],
    matches: null,
    setupComplete: false,
    wizardStep: 0,
  };
}

/**
 * Legacy saves have no setup flag. A filled roster stays in the studio.
 * An explicit incomplete setup, or an empty roster, opens the wizard.
 */
export function shouldShowWizard(event) {
  if (!event) return true;
  if (event.setupComplete === true) return false;
  if (event.setupComplete === false) return true;
  return !event.participants || event.participants.length === 0;
}

export function ensureWizardDrafts(event) {
  if (event.guestDrafts && event.guestDrafts.length > 0) return event;
  const participants = event.participants || [];
  const organizer = participants.find((p) => p.role === 'organizer' || p.id === 'organizer');
  const guests = participants.filter((p) => p !== organizer);
  return {
    ...event,
    organizerName: event.organizerName || organizer?.name || '',
    organizerIncluded: event.organizerIncluded !== false,
    guestDrafts: guests.length
      ? guests.map((g) => ({ id: g.id, name: g.name }))
      : blankGuestDrafts(),
  };
}

/** Rebuild name rows from the saved roster so studio edits show up in the wizard. */
export function syncDraftsFromParticipants(event) {
  const participants = event.participants || [];
  if (participants.length === 0) return ensureWizardDrafts(event);
  const organizer = participants.find((p) => p.role === 'organizer' || p.id === 'organizer');
  const guests = participants.filter((p) => p !== organizer);
  return {
    ...event,
    organizerName: organizer ? organizer.name : (event.organizerName || ''),
    organizerIncluded: Boolean(organizer),
    guestDrafts: guests.length
      ? guests.map((g) => ({ id: g.id, name: g.name }))
      : blankGuestDrafts(),
  };
}

export function namedPeopleCount(event) {
  let count = 0;
  if (event.organizerIncluded !== false && (event.organizerName || '').trim()) count += 1;
  for (const guest of event.guestDrafts || []) {
    if ((guest.name || '').trim()) count += 1;
  }
  return count;
}

function sameRoster(previous, next) {
  if (!previous || previous.length !== next.length) return false;
  return next.every((person, index) => (
    previous[index]?.id === person.id && previous[index]?.name === person.name
  ));
}

/** Turn the name step into participants, dropping blank rows and stale exclusions. */
export function commitNames(event) {
  const participants = [];
  const organizerName = (event.organizerName || '').trim();
  if (event.organizerIncluded !== false && organizerName) {
    const prev = (event.participants || []).find(
      (p) => p.role === 'organizer' || p.id === 'organizer'
    );
    participants.push({
      id: 'organizer',
      role: 'organizer',
      name: organizerName,
      email: prev?.email || '',
      wishlist: prev?.wishlist || [],
      likes: prev?.likes || '',
      dislikes: prev?.dislikes || '',
    });
  }

  for (const guest of event.guestDrafts || []) {
    const name = (guest.name || '').trim();
    if (!name) continue;
    const prev = (event.participants || []).find((p) => p.id === guest.id);
    participants.push({
      id: guest.id,
      name,
      email: prev?.email || '',
      wishlist: prev?.wishlist || [],
      likes: prev?.likes || '',
      dislikes: prev?.dislikes || '',
    });
  }

  const ids = new Set(participants.map((p) => p.id));
  const exclusions = (event.exclusions || []).filter(
    (ex) => ids.has(ex.giverId) && ids.has(ex.receiverId)
  );
  const unchanged = sameRoster(event.participants, participants);

  return {
    ...event,
    participants,
    exclusions,
    matches: unchanged ? event.matches : null,
  };
}

export function isExcluded(exclusions, giverId, receiverId) {
  return (exclusions || []).some(
    (ex) => ex.giverId === giverId && ex.receiverId === receiverId
  );
}

export function toggleExclusion(exclusions, giverId, receiverId, mutual) {
  const list = exclusions || [];
  const has = isExcluded(list, giverId, receiverId);
  const next = list.filter((ex) => {
    const forward = ex.giverId === giverId && ex.receiverId === receiverId;
    const reverse = mutual && ex.giverId === receiverId && ex.receiverId === giverId;
    return !forward && !reverse;
  });
  if (!has && giverId !== receiverId) {
    next.push({ giverId, receiverId });
    if (mutual) {
      const reverseAlready = next.some(
        (ex) => ex.giverId === receiverId && ex.receiverId === giverId
      );
      if (!reverseAlready) next.push({ giverId: receiverId, receiverId: giverId });
    }
  }
  return next;
}

export function applyOccasion(event, occasionId, year = holidayYear()) {
  const nextAuto = occasionTitle(occasionId, year);
  const titleWasAuto = !event.title || event.title === event.autoTitle;
  return {
    ...event,
    occasion: occasionId,
    autoTitle: nextAuto || event.autoTitle || '',
    title: titleWasAuto ? (nextAuto || event.title || '') : event.title,
  };
}

export function drawEvent(event) {
  const result = generateSecretSantaDraw(event.participants, event.exclusions || [], true);
  if (!result.success) {
    return { ok: false, error: result.error, event };
  }
  return { ok: true, event: { ...event, matches: result.matches } };
}

export function formatExchangeDate(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
