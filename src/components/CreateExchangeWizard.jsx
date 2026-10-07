import React, { useState } from 'react';
import { celebrateDraw } from '../utils/christmasConfetti';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Gift,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { sound } from '../utils/audio';
import { generateSecretSantaDraw } from '../utils/shuffle';
import {
  BUDGET_PRESETS,
  MORE_OCCASIONS,
  PRIMARY_OCCASIONS,
  datePresetsFor,
  defaultInviteMessage,
  defaultTitle,
  formatLongDate,
  isDetailsComplete,
  occasionById,
} from '../data/exchangePresets';
import {
  WIZARD_STEPS,
  applyImportedPeople,
  parsePeopleList,
  createNameRow,
  materializeParticipants,
  pruneExclusions,
} from '../data/eventState';
import RevealLinksPanel from './RevealLinksPanel';
import GiftFinder from './GiftFinder';
import ExchangeWishLinks from './ExchangeWishLinks';
import { organizerMatch } from '../exchange/progress';
import { buildRevealPayload } from '../utils/revealLink';

const PROGRESS_STEPS = [
  { id: 'names', label: 'Names' },
  { id: 'wishes', label: 'Wishes' },
  { id: 'exclusions', label: 'Exclusions' },
  { id: 'details', label: 'Details' },
  { id: 'message', label: 'Message' },
  { id: 'draw', label: 'Draw' },
  { id: 'share', label: 'Share' },
];

function stepIndex(id) {
  return WIZARD_STEPS.indexOf(id);
}

export default function CreateExchangeWizard({
  event,
  onUpdateEvent,
  onPreviewReveal,
  onLoadSample,
  onFinish,
}) {
  const [showMoreOccasions, setShowMoreOccasions] = useState(
    () => MORE_OCCASIONS.some((item) => item.id === event.occasion),
  );
  const [picker, setPicker] = useState(null);
  const [drawError, setDrawError] = useState(null);

  const patch = (partial) => onUpdateEvent({ ...event, ...partial });
  const step = WIZARD_STEPS.includes(event.wizardStep) ? event.wizardStep : 'start';

  const goToStep = (target) => {
    if (!WIZARD_STEPS.includes(target)) return;
    const from = stepIndex(step);
    const to = stepIndex(target);
    if (to > stepIndex(event.wizardFurthest || step) && to > from + 1) return;

    let next = { ...event, wizardStep: target };
    if (stepIndex(target) > stepIndex('wishes')) {
      const participants = materializeParticipants(event);
      if ((event.organizerName || '').trim().length === 0 || participants.length < 2) return;
      const exclusions = pruneExclusions(event.exclusions, participants);
      const samePeople =
        participants.length === (event.participants || []).length &&
        participants.every((p, i) => event.participants[i]?.id === p.id && event.participants[i]?.name === p.name);
      next = {
        ...next,
        participants,
        exclusions,
        matches: samePeople ? event.matches : null,
      };
    }

    if (to > stepIndex('details')) {
      next = withDerivedTitle(next);
      if (!isDetailsComplete(next)) return;
    }

    if (stepIndex(target) > stepIndex('exclusions') && !next.exclusionsChoice) return;
    if (stepIndex(target) > stepIndex('names') && materializeParticipants(next).length < 2) return;
    if (target === 'share' && !next.matches) {
      next.wizardStep = 'draw';
    }

    const landed = next.wizardStep;
    if (stepIndex(landed) >= stepIndex('message') && !next.inviteMessageEdited) {
      next = withDerivedTitle(next);
      next.inviteMessage = defaultInviteMessage(next);
      next.wizardStep = landed;
    }

    const furthest = stepIndex(next.wizardFurthest || 'start');
    if (stepIndex(next.wizardStep) > furthest) next.wizardFurthest = next.wizardStep;

    sound.playClick();
    setDrawError(null);
    onUpdateEvent(next);
  };

  const continueFrom = (current) => {
    const order = WIZARD_STEPS;
    const nextId = order[order.indexOf(current) + 1];
    if (nextId) goToStep(nextId);
  };

  const handleDraw = () => {
    setDrawError(null);
    sound.playChime();
    const prepared = withDerivedTitle({
      ...event,
      participants: materializeParticipants(event),
    });
    const result = generateSecretSantaDraw(prepared.participants, prepared.exclusions || [], true);
    if (!result.success) {
      setDrawError(result.error);
      onUpdateEvent({
        ...prepared,
        wizardStep: 'draw',
        matches: event.matches,
      });
      return;
    }
    onUpdateEvent({
      ...prepared,
      matches: result.matches,
      wizardStep: 'share',
      wizardFurthest: 'share',
      inviteMessage: prepared.inviteMessageEdited ? prepared.inviteMessage : defaultInviteMessage(prepared),
    });
    celebrateDraw();
  };

  return (
    <div className={`wizard-shell ${step === 'share' || step === 'wishes' ? 'wizard-shell-wide' : ''}`}>
      {step !== 'start' && (
        <ol className="wizard-progress" aria-label="Create exchange steps">
          {PROGRESS_STEPS.map((item) => {
            const reachable = stepIndex(item.id) <= stepIndex(event.wizardFurthest || step);
            const current = item.id === step;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={current ? 'step' : undefined}
                  disabled={!reachable || current}
                  onClick={() => goToStep(item.id)}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {step !== 'start' && (
        <ExchangeWishLinks
          event={event}
          onOpenMine={() => goToStep('wishes')}
          onPreview={() => {
            const match = organizerMatch(event);
            if (match) onPreviewReveal(buildRevealPayload(event, match));
          }}
        />
      )}

      {step === 'start' && (
        <StartStep
          onStart={() => {
            sound.playClick();
            patch({ wizardStep: 'names', wizardFurthest: 'names' });
          }}
          onLoadSample={onLoadSample}
        />
      )}

      {step === 'names' && (
        <NamesStep
          event={event}
          patch={patch}
          onBack={() => goToStep('start')}
          onContinue={() => continueFrom('names')}
        />
      )}

      {step === 'wishes' && (
        <WishesStep
          event={event}
          patch={patch}
          onBack={() => goToStep('names')}
          onContinue={() => continueFrom('wishes')}
        />
      )}

      {step === 'exclusions' && (
        <ExclusionsStep
          event={event}
          patch={patch}
          picker={picker}
          setPicker={setPicker}
          onBack={() => goToStep('wishes')}
          onContinue={() => continueFrom('exclusions')}
        />
      )}

      {step === 'details' && (
        <DetailsStep
          event={event}
          patch={patch}
          showMoreOccasions={showMoreOccasions}
          setShowMoreOccasions={setShowMoreOccasions}
          onBack={() => goToStep('exclusions')}
          onContinue={() => continueFrom('details')}
        />
      )}

      {step === 'message' && (
        <MessageStep
          event={event}
          patch={patch}
          onBack={() => goToStep('details')}
          onContinue={() => continueFrom('message')}
        />
      )}

      {step === 'draw' && (
        <DrawStep
          event={event}
          drawError={drawError}
          onBack={() => goToStep('message')}
          onDraw={handleDraw}
          onEditExclusions={() => goToStep('exclusions')}
        />
      )}

      {step === 'share' && (
        <ShareStep
          event={event}
          onPreviewReveal={onPreviewReveal}
          onUpdateEvent={onUpdateEvent}
          onBack={() => goToStep('draw')}
          onRedraw={handleDraw}
          onFinish={() => {
            sound.playClick();
            onFinish(withDerivedTitle(event));
          }}
        />
      )}
    </div>
  );
}

function withDerivedTitle(event) {
  const occasion = occasionById(event.occasion);
  const label = event.occasion === 'other'
    ? (event.occasionLabel || '').trim()
    : (event.occasionLabel || occasion?.label || '');
  const titled = { ...event, occasionLabel: label };
  if (event.titleEdited && (event.title || '').trim()) return titled;
  return { ...titled, title: defaultTitle(label, event.exchangeDate) };
}

function StepCard({ title, lede, children }) {
  return (
    <section className="glass-panel p-5 sm:p-6 border border-white/10">
      <h2 className="text-2xl font-bold font-heading text-white">{title}</h2>
      {lede && <p className="text-sm text-slate-400 mt-1 mb-4">{lede}</p>}
      {children}
    </section>
  );
}

function StepNav({ onBack, onContinue, continueLabel = 'Continue', continueDisabled = false }) {
  return (
    <div className="wizard-nav">
      <button type="button" onClick={onBack} className="btn btn-secondary text-sm">
        <ChevronLeft size={16} />
        Back
      </button>
      <button
        type="button"
        onClick={onContinue}
        disabled={continueDisabled}
        className="btn btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {continueLabel}
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function StartStep({ onStart, onLoadSample }) {
  return (
    <section className="glass-panel-elevated p-6 sm:p-8 border border-white/15 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center mb-4">
        <Gift size={28} />
      </div>
      <h2 className="text-3xl font-bold font-heading text-white">Create an exchange</h2>
        <p className="text-sm text-slate-300 mt-2 mb-5 max-w-md mx-auto">
          Add your group, then draw names. No account needed. Names stay on this device, and exclusions come before the draw.
        </p>
      <button type="button" onClick={onStart} className="btn btn-primary text-base px-5 py-3">
        <Sparkles size={18} />
        Continue
      </button>
      {onLoadSample && (
        <button
          type="button"
          className="btn btn-secondary text-xs mt-4"
          onClick={() => {
            if (window.confirm('Load the sample holiday group? This replaces the exchange you are starting.')) {
              onLoadSample();
            }
          }}
        >
          Look at a sample group
        </button>
      )}
    </section>
  );
}

function NamesStep({ event, patch, onBack, onContinue }) {
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const organizerReady = (event.organizerName || '').trim().length > 0;
  const previewCount = materializeParticipants(event).length;
  const canContinue = organizerReady && previewCount >= 2;

  const commitImport = () => {
    const people = parsePeopleList(importText);
    if (people.length < 2) {
      setImportError('Add at least two lines. Put yourself first, then one name and email per line.');
      return;
    }
    sound.playClick();
    patch(applyImportedPeople(event, people));
    setImportOpen(false);
    setImportError('');
  };

  const updateRow = (id, partial) => {
    patch({
      nameRows: (event.nameRows || []).map((row) => (row.id === id ? { ...row, ...partial } : row)),
    });
  };

  return (
    <StepCard
      title="Who is drawing names?"
      lede="Add an email or mobile for each person. That’s how you’ll send their private link after the draw. Nothing is sent yet."
    >
      <div className="friend-card mb-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400" htmlFor="organizer-name">
          Your name
        </label>
        <input
          id="organizer-name"
          type="text"
          value={event.organizerName || ''}
          onChange={(e) => patch({ organizerName: e.target.value })}
          placeholder="Your name"
          className="glass-input w-full"
          autoComplete="name"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="email"
            value={event.organizerEmail || ''}
            onChange={(e) => patch({ organizerEmail: e.target.value })}
            placeholder="Your email"
            aria-label="Your email"
            className="glass-input w-full text-sm"
            autoComplete="email"
          />
          <input
            type="tel"
            value={event.organizerPhone || ''}
            onChange={(e) => patch({ organizerPhone: e.target.value })}
            placeholder="Your mobile"
            aria-label="Your mobile"
            className="glass-input w-full text-sm"
            autoComplete="tel"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-200">
          <input
            type="checkbox"
            checked={event.includeOrganizer !== false}
            onChange={(e) => patch({ includeOrganizer: e.target.checked })}
            className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
          />
          Include me in the draw
        </label>
      </div>

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <Users size={13} className="text-emerald-400" />
          Friends
        </div>
        <button
          type="button"
          className="btn btn-secondary text-xs py-1.5 px-2.5"
          onClick={() => {
            sound.playClick();
            setImportOpen((open) => !open);
            setImportError('');
          }}
        >
          Import
        </button>
      </div>
      {importOpen && (
        <div className="friend-card mb-3">
          <p className="text-sm text-slate-200 font-semibold">Import names and email addresses</p>
          <p className="text-xs text-slate-400">
            One person per line. Put yourself first. Email and mobile are optional.
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={6}
            className="glass-input w-full text-sm"
            placeholder={'Ada, ada@example.com\nBea, bea@example.com, 555-0101'}
            aria-label="Names and email addresses"
          />
          {importError && <p className="text-xs text-rose-300">{importError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary text-xs" onClick={() => setImportOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary text-xs" onClick={commitImport}>
              Import
            </button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {(event.nameRows || []).map((row, index) => (
          <div key={row.id} className="friend-card">
            <div className="friend-card-head">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Friend {index + 1}
              </span>
              {(event.nameRows || []).length > 1 && (
                <button
                  type="button"
                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                  onClick={() => {
                    sound.playClick();
                    patch({ nameRows: event.nameRows.filter((item) => item.id !== row.id) });
                  }}
                  aria-label={`Remove friend ${index + 1}`}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <input
              type="text"
              value={row.name}
              onChange={(e) => updateRow(row.id, { name: e.target.value })}
              placeholder="Name"
              className="glass-input w-full"
              aria-label={`Friend ${index + 1} name`}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="email"
                value={row.email || ''}
                onChange={(e) => updateRow(row.id, { email: e.target.value })}
                placeholder="Email"
                aria-label={`Friend ${index + 1} email`}
                className="glass-input w-full text-sm"
              />
              <input
                type="tel"
                value={row.phone || ''}
                onChange={(e) => updateRow(row.id, { phone: e.target.value })}
                placeholder="Mobile"
                aria-label={`Friend ${index + 1} mobile`}
                className="glass-input w-full text-sm"
              />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-secondary text-xs mt-3"
        onClick={() => {
          sound.playClick();
          patch({ nameRows: [...(event.nameRows || []), createNameRow()] });
        }}
      >
        <Plus size={14} />
        Add a friend
      </button>
      <p className="text-xs text-slate-500 mt-3">
        {previewCount} {previewCount === 1 ? 'person' : 'people'} in the draw. At least 2 are required.
      </p>
      <StepNav onBack={onBack} onContinue={onContinue} continueDisabled={!canContinue} />
    </StepCard>
  );
}

function exclusionSummary(giverId, participants, exclusions) {
  const blocked = exclusions
    .filter((ex) => ex.giverId === giverId)
    .map((ex) => participants.find((p) => p.id === ex.receiverId)?.name)
    .filter(Boolean);
  if (blocked.length === 0) return 'Can draw anyone';
  if (blocked.length === 1) return `Won't draw ${blocked[0]}`;
  return `Won't draw ${blocked.length} people`;
}

function profilePatch(event, person, fields) {
  if (person.isOrganizer) {
    return {
      organizerListTitle: fields.listTitle !== undefined ? fields.listTitle : event.organizerListTitle,
      organizerAgeBand: fields.ageBand !== undefined ? fields.ageBand : event.organizerAgeBand,
      organizerShopFor: fields.shopFor !== undefined ? fields.shopFor : event.organizerShopFor,
      organizerWishes: fields.wishes !== undefined ? fields.wishes : event.organizerWishes,
      organizerHobbies: fields.hobbies !== undefined ? fields.hobbies : event.organizerHobbies,
    };
  }
  return {
    nameRows: (event.nameRows || []).map((row) => (row.id === person.id ? { ...row, ...fields } : row)),
  };
}

function personFields(event, person) {
  if (person.isOrganizer) {
    return {
      listTitle: event.organizerListTitle || '',
      ageBand: event.organizerAgeBand || '',
      shopFor: event.organizerShopFor || '',
      wishes: event.organizerWishes || '',
      hobbies: event.organizerHobbies || '',
    };
  }
  const row = (event.nameRows || []).find((item) => item.id === person.id) || {};
  return {
    listTitle: row.listTitle || '',
    ageBand: row.ageBand || '',
    shopFor: row.shopFor || '',
    wishes: row.wishes || '',
    hobbies: row.hobbies || '',
  };
}

function WishesStep({ event, patch, onBack, onContinue }) {
  const people = materializeParticipants(event);
  const [activeId, setActiveId] = useState(people[0]?.id || '');
  const person = people.find((item) => item.id === activeId) || people[0];
  const fields = person ? personFields(event, person) : {};
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold font-heading text-white">My wish list</h2>
        <p className="text-sm text-slate-300 mt-1">
          Add a product link or a gift idea. Filter by price, age, and who the gift is for when you want more ideas. Nothing here needs an account.
        </p>
      </div>
      {person && (
        <GiftFinder
          key={person.id}
          people={people}
          activePersonId={person.id}
          onSelectPerson={setActiveId}
          personName={person.name}
          budget={event.budget}
          onChange={(partial) => patch(profilePatch(event, person, partial))}
          {...fields}
        />
      )}
      <StepNav onBack={onBack} onContinue={onContinue} continueLabel="Save wish lists" />
    </div>
  );
}

function ExclusionsStep({ event, patch, picker, setPicker, onBack, onContinue }) {
  const participants = event.participants || [];
  const choice = event.exclusionsChoice;

  const openPicker = (giverId) => {
    sound.playClick();
    setPicker({
      giverId,
      snapshotExclusions: event.exclusions || [],
      snapshotMatches: event.matches,
    });
  };

  const toggle = (giverId, receiverId) => {
    const exists = (event.exclusions || []).some(
      (ex) => ex.giverId === giverId && ex.receiverId === receiverId,
    );
    const exclusions = exists
      ? event.exclusions.filter((ex) => !(ex.giverId === giverId && ex.receiverId === receiverId))
      : [...(event.exclusions || []), { giverId, receiverId }];
    patch({ exclusions, matches: null, exclusionsChoice: 'set' });
  };

  const giver = picker ? participants.find((p) => p.id === picker.giverId) : null;

  return (
    <StepCard
      title="Want to exclude certain draws?"
      lede="Stop couples, roommates, or siblings from drawing each other. Only you see these rules."
    >
      <div className="wizard-choice-list mb-4">
        <button
          type="button"
          className="btn wizard-choice"
          aria-pressed={choice === 'none'}
          onClick={() => {
            sound.playClick();
            patch({ exclusionsChoice: 'none', exclusions: [], matches: null });
          }}
        >
          No exclusions
        </button>
        <button
          type="button"
          className="btn wizard-choice"
          aria-pressed={choice === 'set'}
          onClick={() => {
            sound.playClick();
            patch({ exclusionsChoice: 'set' });
          }}
        >
          <ShieldAlert size={16} className="text-rose-400" />
          Set exclusions
        </button>
      </div>

      {choice === 'set' && (
        <div className="space-y-2">
          {participants.map((person) => (
            <div key={person.id} className="wizard-person-row">
              <div>
                <div className="font-semibold text-white text-sm">{person.name}</div>
                <div className="text-xs text-slate-400">
                  {exclusionSummary(person.id, participants, event.exclusions || [])}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary text-xs py-2 px-3"
                onClick={() => openPicker(person.id)}
              >
                Select names
                <ArrowRight size={14} />
              </button>
            </div>
          ))}
          <ExclusionWarning participants={participants} exclusions={event.exclusions || []} />
        </div>
      )}

      {choice === 'none' && (
        <p className="text-xs text-slate-400">Anyone can draw anyone, except themselves.</p>
      )}

      <StepNav
        onBack={onBack}
        onContinue={onContinue}
        continueDisabled={!choice}
      />

      {giver && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div
            className="glass-panel-elevated w-full max-w-md p-5 border border-white/20"
            style={{ background: 'rgba(15, 23, 42, 0.96)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wont-draw-title"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 id="wont-draw-title" className="text-lg font-bold font-heading text-white">
                  {giver.name} won't draw
                </h3>
                <p className="text-xs text-slate-400">Check anyone they should not be paired with.</p>
              </div>
              <button
                type="button"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                onClick={() => {
                  patch({ exclusions: picker.snapshotExclusions, matches: picker.snapshotMatches });
                  setPicker(null);
                }}
                aria-label="Cancel"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
              {participants.filter((p) => p.id !== giver.id).map((other) => {
                const checked = (event.exclusions || []).some(
                  (ex) => ex.giverId === giver.id && ex.receiverId === other.id,
                );
                return (
                  <label key={other.id} className="wizard-check-row">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(giver.id, other.id)}
                      className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-white">{other.name}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={() => {
                  patch({ exclusions: picker.snapshotExclusions, matches: picker.snapshotMatches });
                  setPicker(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary text-xs"
                onClick={() => {
                  sound.playClick();
                  setPicker(null);
                }}
              >
                <Check size={14} />
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </StepCard>
  );
}

function ExclusionWarning({ participants, exclusions }) {
  for (const person of participants) {
    const blocked = new Set(
      exclusions.filter((ex) => ex.giverId === person.id).map((ex) => ex.receiverId),
    );
    const options = participants.filter((other) => other.id !== person.id && !blocked.has(other.id));
    if (options.length === 0) {
      return (
        <p className="text-xs text-rose-300 mt-2">
          {person.name} has nobody left to draw. Relax a rule or the draw will fail.
        </p>
      );
    }
  }
  return null;
}

function DetailsStep({ event, patch, showMoreOccasions, setShowMoreOccasions, onBack, onContinue }) {
  const presets = event.occasion && event.occasion !== 'other' ? datePresetsFor(event.occasion) : [];

  const selectOccasion = (item) => {
    sound.playClick();
    const label = item.id === 'other' ? '' : item.label;
    patch({
      occasion: item.id,
      occasionLabel: label,
      exchangeDate: '',
      dateChoice: null,
      title: event.titleEdited ? event.title : defaultTitle(label, ''),
    });
  };

  const selectDate = (iso, choice) => {
    sound.playClick();
    const label = event.occasion === 'other'
      ? (event.occasionLabel || '').trim()
      : (event.occasionLabel || occasionById(event.occasion)?.label || '');
    patch({
      exchangeDate: iso,
      dateChoice: choice,
      title: event.titleEdited ? event.title : defaultTitle(label, iso),
    });
  };

  const showCustomDate = event.dateChoice === 'custom'
    || event.occasion === 'other'
    || (event.occasion && presets.length === 0);

  return (
    <StepCard
      title="Occasion, date, and budget"
      lede="Pick a holiday, when you will celebrate, and what people should spend."
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Occasion</div>
      <div className="wizard-grid-chips mb-2">
        {PRIMARY_OCCASIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="choice-chip"
            aria-pressed={event.occasion === item.id}
            onClick={() => selectOccasion(item)}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-secondary text-xs"
          aria-expanded={showMoreOccasions}
          onClick={() => setShowMoreOccasions((open) => !open)}
        >
          {showMoreOccasions ? 'Show fewer' : 'More holidays'}
        </button>
      </div>
      {showMoreOccasions && (
        <div className="wizard-grid-chips mb-3">
          {MORE_OCCASIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="choice-chip"
              aria-pressed={event.occasion === item.id}
              onClick={() => selectOccasion(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {event.occasion === 'other' && (
        <div className="mb-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1" htmlFor="occasion-label">
            Occasion name
          </label>
          <input
            id="occasion-label"
            type="text"
            value={event.occasionLabel || ''}
            onChange={(e) => {
              const occasionLabel = e.target.value;
              patch({
                occasionLabel,
                title: event.titleEdited ? event.title : defaultTitle(occasionLabel, event.exchangeDate),
              });
            }}
            placeholder="Office party, Friendsgiving..."
            className="glass-input w-full"
          />
        </div>
      )}

      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1 mt-3" htmlFor="exchange-title">
        Exchange name
      </label>
      <input
        id="exchange-title"
        type="text"
        value={event.title || ''}
        onChange={(e) => patch({ title: e.target.value, titleEdited: true })}
        placeholder="Secret Santa 2026"
        className="glass-input w-full mb-4"
      />

      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
        <Calendar size={13} className="text-rose-400" />
        Celebration date
      </div>
      <div className="wizard-grid-chips mb-2">
        {presets.map((item) => (
          <button
            key={item.iso}
            type="button"
            className="choice-chip"
            aria-pressed={event.exchangeDate === item.iso && event.dateChoice !== 'custom'}
            onClick={() => selectDate(item.iso, item.iso)}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          className="choice-chip"
          aria-pressed={event.dateChoice === 'custom'}
          onClick={() => {
            sound.playClick();
            patch({
              dateChoice: 'custom',
              exchangeDate: presets.some((item) => item.iso === event.exchangeDate) ? '' : (event.exchangeDate || ''),
            });
          }}
        >
          Other
        </button>
      </div>
      {showCustomDate && (
        <input
          type="date"
          value={event.dateChoice === 'custom' || presets.length === 0 || event.occasion === 'other' ? (event.exchangeDate || '') : ''}
          onChange={(e) => selectDate(e.target.value, 'custom')}
          className="glass-input w-full mb-4 text-slate-200"
          aria-label="Custom celebration date"
        />
      )}

      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1 mt-2">
        <DollarSign size={13} className="text-amber-400" />
        Gift budget
      </div>
      <div className="wizard-grid-chips mb-2">
        {BUDGET_PRESETS.map((amount) => (
          <button
            key={amount}
            type="button"
            className="choice-chip"
            aria-pressed={event.budget === amount && event.budgetPreset !== 'custom'}
            onClick={() => {
              sound.playClick();
              patch({ budget: amount, budgetPreset: amount });
            }}
          >
            {amount}
          </button>
        ))}
        <button
          type="button"
          className="choice-chip"
          aria-pressed={event.budgetPreset === 'custom'}
          onClick={() => {
            sound.playClick();
            patch({
              budgetPreset: 'custom',
              budget: BUDGET_PRESETS.includes(event.budget) ? '' : event.budget,
            });
          }}
        >
          Other
        </button>
      </div>
      {event.budgetPreset === 'custom' && (
        <input
          type="text"
          value={event.budget || ''}
          onChange={(e) => patch({ budget: e.target.value, budgetPreset: 'custom' })}
          placeholder="$15 - $40"
          className="glass-input w-full"
          aria-label="Custom budget"
        />
      )}
      <StepNav onBack={onBack} onContinue={onContinue} continueDisabled={!isDetailsComplete(event)} />
    </StepCard>
  );
}

function MessageStep({ event, patch, onBack, onContinue }) {
  return (
    <StepCard
      title="Message for the group"
      lede="This is included when you text, copy, or share a reveal link. You can change it later."
    >
      <label className="sr-only" htmlFor="invite-message">Invite message</label>
      <textarea
        id="invite-message"
        value={event.inviteMessage || ''}
        onChange={(e) => patch({ inviteMessage: e.target.value, inviteMessageEdited: true })}
        rows={5}
        className="glass-input w-full text-sm"
      />
      <button
        type="button"
        className="btn btn-secondary text-xs mt-3"
        onClick={() => {
          sound.playClick();
          const titled = withDerivedTitle(event);
          patch({
            title: titled.title,
            occasionLabel: titled.occasionLabel,
            inviteMessage: defaultInviteMessage(titled),
            inviteMessageEdited: false,
          });
        }}
      >
        Reset message
      </button>
      <StepNav onBack={onBack} onContinue={onContinue} continueLabel="Review draw" />
    </StepCard>
  );
}

function DrawStep({ event, drawError, onBack, onDraw, onEditExclusions }) {
  const exclusionCount = (event.exclusions || []).length;
  return (
    <StepCard
      title="Draw names"
      lede="Everyone gives one gift and receives one gift. Nobody draws themselves."
    >
      <dl className="wizard-summary">
        <div>
          <dt>Exchange</dt>
          <dd>{event.title || 'Secret Santa'}</dd>
        </div>
        <div>
          <dt>Occasion</dt>
          <dd>{event.occasionLabel || 'Secret Santa'}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{formatLongDate(event.exchangeDate) || 'Not set'}</dd>
        </div>
        <div>
          <dt>Budget</dt>
          <dd>{event.budget || 'Not set'}</dd>
        </div>
        <div>
          <dt>People</dt>
          <dd>{(event.participants || []).map((p) => p.name).join(', ')}</dd>
        </div>
        <div>
          <dt>Exclusions</dt>
          <dd>
            {event.exclusionsChoice === 'none' || exclusionCount === 0
              ? 'None'
              : `${exclusionCount} one-way ${exclusionCount === 1 ? 'rule' : 'rules'}`}
          </dd>
        </div>
      </dl>

      {drawError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-sm flex items-start gap-2.5 mt-4">
          <AlertCircle size={18} className="text-rose-400 mt-0.5 shrink-0" />
          <div>
            <strong>Pairing impossible.</strong> {drawError}
            <button type="button" className="btn btn-secondary text-xs mt-2" onClick={onEditExclusions}>
              Edit exclusions
            </button>
          </div>
        </div>
      )}

      <div className="wizard-nav">
        <button type="button" onClick={onBack} className="btn btn-secondary text-sm">
          <ChevronLeft size={16} />
          Back
        </button>
        <button
          type="button"
          onClick={onDraw}
          disabled={(event.participants || []).length < 2}
          className="btn btn-primary text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-40"
        >
          <Sparkles size={16} />
          Shuffle & draw names
        </button>
      </div>
    </StepCard>
  );
}

function ShareStep({ event, onPreviewReveal, onUpdateEvent, onBack, onRedraw, onFinish }) {
  return (
    <section className="glass-panel-elevated p-5 sm:p-6 border border-emerald-500/30 space-y-4">
      <div>
        <h2 className="text-2xl font-bold font-heading text-white">Share each link</h2>
        <p className="text-sm text-slate-300 mt-1">
          Open Share for one person. Email and text use your own apps.
        </p>
      </div>
      <RevealLinksPanel event={event} onPreviewReveal={onPreviewReveal} onUpdateEvent={onUpdateEvent} />
      <div className="wizard-nav">
        <button type="button" onClick={onBack} className="btn btn-secondary text-sm">
          <ChevronLeft size={16} />
          Back
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onRedraw} className="btn btn-secondary text-sm">
            <Sparkles size={15} />
            Draw again
          </button>
          <button type="button" onClick={onFinish} className="btn btn-primary text-sm">
            Open the exchange
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
