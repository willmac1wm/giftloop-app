/** First-run Secret Santa event, and how a saved event decides wizard vs studio. */

export const WIZARD_STEPS = ['start', 'names', 'exclusions', 'details', 'message', 'draw', 'share'];

let idSeq = 0;

export function makeId(prefix) {
  idSeq += 1;
  return `${prefix}_${Date.now().toString(36)}_${idSeq.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createNameRow() {
  return { id: makeId('p'), name: '' };
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
      email: '',
      wishlist: [],
      likes: '',
      dislikes: '',
      ...prev,
      id: event.organizerId,
      name: organizerName,
      isOrganizer: true,
    });
  }

  for (const row of event.nameRows || []) {
    const name = (row.name || '').trim();
    if (!name) continue;
    const prev = existing.get(row.id) || {};
    next.push({
      email: '',
      wishlist: [],
      likes: '',
      dislikes: '',
      ...prev,
      id: row.id,
      name,
      isOrganizer: false,
    });
  }

  return next;
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
