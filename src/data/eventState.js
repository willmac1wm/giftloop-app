/** First-run Secret Santa event, and how a saved event decides wizard vs studio. */

export const WIZARD_STEPS = ['start', 'names', 'wishes', 'exclusions', 'details', 'message', 'draw', 'share'];

let idSeq = 0;

export function makeId(prefix) {
  idSeq += 1;
  return `${prefix}_${Date.now().toString(36)}_${idSeq.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createNameRow(partial = {}) {
  return {
    id: makeId('p'),
    name: '',
    email: '',
    phone: '',
    listTitle: '',
    ageBand: '',
    shopFor: '',
    wishes: '',
    ...partial,
  };
}

export function createBlankSecretSantaEvent() {
  return {
    title: '',
    titleEdited: false,
    budget: '',
    budgetPreset: null,
    exchangeDate: '',
    dateChoice: null,
    rules: '',
    occasion: '',
    occasionLabel: '',
    inviteMessage: '',
    inviteMessageEdited: false,
    organizerId: makeId('org'),
    organizerName: '',
    organizerEmail: '',
    organizerPhone: '',
    organizerListTitle: '',
    organizerAgeBand: '',
    organizerShopFor: '',
    organizerWishes: '',
    includeOrganizer: true,
    nameRows: [createNameRow(), createNameRow()],
    exclusionsChoice: null,
    wizardStep: 'start',
    wizardFurthest: 'start',
    setupComplete: false,
    participants: [],
    exclusions: [],
    matches: null,
  };
}

export function materializeParticipants(event) {
  const existing = new Map((event.participants || []).map((p) => [p.id, p]));
  const next = [];
  const organizerName = (event.organizerName || '').trim();

  if (event.includeOrganizer !== false && organizerName && event.organizerId) {
    const prev = existing.get(event.organizerId) || {};
    next.push({
      likes: '',
      dislikes: '',
      ...prev,
      id: event.organizerId,
      name: organizerName,
      email: (event.organizerEmail || '').trim(),
      phone: (event.organizerPhone || '').trim(),
      listTitle: (event.organizerListTitle || '').trim(),
      ageBand: event.organizerAgeBand || '',
      shopFor: event.organizerShopFor || '',
      wishlist: wishLines(event.organizerWishes, prev.wishlist),
      isOrganizer: true,
    });
  }

  for (const row of event.nameRows || []) {
    const name = (row.name || '').trim();
    if (!name) continue;
    const prev = existing.get(row.id) || {};
    next.push({
      likes: '',
      dislikes: '',
      ...prev,
      id: row.id,
      name,
      email: (row.email || '').trim(),
      phone: (row.phone || '').trim(),
      listTitle: (row.listTitle || '').trim(),
      ageBand: row.ageBand || '',
      shopFor: row.shopFor || '',
      wishlist: wishLines(row.wishes, prev.wishlist),
      isOrganizer: false,
    });
  }

  return next;
}

export function withGiverContact(event, giverId, fields) {
  const apply = (person) => (person && person.id === giverId ? { ...person, ...fields } : person);
  const organizer = giverId === event.organizerId
    ? {
      organizerEmail: fields.email !== undefined ? fields.email : event.organizerEmail,
      organizerPhone: fields.phone !== undefined ? fields.phone : event.organizerPhone,
    }
    : {};
  return {
    ...event,
    ...organizer,
    participants: (event.participants || []).map(apply),
    matches: (event.matches || []).map((match) => ({
      ...match,
      giver: apply(match.giver),
    })),
    nameRows: (event.nameRows || []).map((row) => (row.id === giverId ? { ...row, ...fields } : row)),
  };
}

function wishLines(text, previous) {
  if (text == null || String(text).trim() === '') return previous || [];
  return String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

const EMAIL_IN_LINE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export function parsePeopleList(text) {
  const people = [];
  const lines = String(text || '').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || people.length >= 100) continue;
    const emailMatch = line.match(EMAIL_IN_LINE);
    const email = emailMatch ? emailMatch[0] : '';
    let rest = email ? line.replace(email, ' ') : line;
    const phoneMatch = rest.match(/(\+?\d[\d\s().-]{6,}\d)/);
    const phone = phoneMatch ? phoneMatch[1].trim() : '';
    if (phone) rest = rest.replace(phone, ' ');
    const name = rest.replace(/[,|;<>]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!name && !email) continue;
    people.push({
      name: name || email.split('@')[0],
      email,
      phone,
    });
  }
  return people;
}

export function applyImportedPeople(event, people) {
  if (!people || people.length === 0) return event;
  const [first, ...rest] = people;
  return {
    ...event,
    organizerName: first.name,
    organizerEmail: first.email,
    organizerPhone: first.phone,
    includeOrganizer: true,
    nameRows: (rest.length ? rest : [{}]).map((person) => createNameRow({
      name: person.name || '',
      email: person.email || '',
      phone: person.phone || '',
    })),
    matches: null,
    participants: [],
  };
}

export function pruneExclusions(exclusions, participants) {
  const ids = new Set((participants || []).map((p) => p.id));
  return (exclusions || []).filter(
    (ex) => ids.has(ex.giverId) && ids.has(ex.receiverId) && ex.giverId !== ex.receiverId,
  );
}

function sameParticipantIds(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  const ids = new Set(a.map((p) => p.id));
  return b.every((p) => ids.has(p.id));
}

/**
 * Legacy saves with no setupComplete flag open the studio.
 * An untouched copy of the seeded demo opens the wizard instead.
 */
export function isUntouchedSeedDemo(event, seed) {
  if (!event || !seed) return false;
  if (event.setupComplete === true || event.setupComplete === false) return false;
  if (event.matches) return false;
  if (event.title !== seed.title) return false;
  if (event.budget !== seed.budget) return false;
  if (event.exchangeDate !== seed.exchangeDate) return false;
  if (!sameParticipantIds(event.participants, seed.participants)) return false;
  const seedIds = seed.participants.map((p) => p.id);
  const ids = (event.participants || []).map((p) => p.id);
  if (ids.some((id, index) => id !== seedIds[index])) return false;

  const exclusions = event.exclusions || [];
  const seedExclusions = seed.exclusions || [];
  if (exclusions.length !== seedExclusions.length) return false;
  return exclusions.every(
    (rule, index) =>
      rule.giverId === seedExclusions[index].giverId &&
      rule.receiverId === seedExclusions[index].receiverId,
  );
}

export function normalizeLoadedEvent(saved, seed, createBlank = createBlankSecretSantaEvent) {
  if (!saved || typeof saved !== 'object') return createBlank();
  if (saved.setupComplete === false) return saved;
  if (saved.setupComplete === true) return saved;
  if (isUntouchedSeedDemo(saved, seed)) return createBlank();
  return { ...saved, setupComplete: true };
}
