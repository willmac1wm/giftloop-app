import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  AlertCircle, Calendar, Check, ChevronDown, ChevronLeft, ChevronRight,
  DollarSign, Plus, ShieldAlert, Sparkles, Trash2, Users,
} from 'lucide-react';
import { sound } from '../utils/audio';
import {
  BUDGET_PRESETS,
  OCCASIONS,
  WIZARD_STEPS,
  applyOccasion,
  commitNames,
  datePresets,
  drawEvent,
  ensureWizardDrafts,
  formatExchangeDate,
  isExcluded,
  namedPeopleCount,
  occasionById,
  occasionTitle,
  toggleExclusion,
  createId,
} from '../utils/wizard';
import ShareLinksPanel from './ShareLinksPanel';

const STEP_COPY = [
  {
    title: "Who's drawing names?",
    body: 'Add everyone in the exchange. Nothing is emailed — names stay on this device until you share a private link.',
  },
  {
    title: "Anyone who shouldn't draw each other?",
    body: 'Block couples, roommates, or last year’s pairs. Leave everyone open if anyone can draw anyone.',
  },
  {
    title: "What's the occasion?",
    body: 'Pick a holiday, a date, and a budget. You can still change these after the draw.',
  },
  {
    title: 'Draw names',
    body: 'One circle, nobody gets themselves, and exclusions are respected. Only each person’s link reveals their match.',
  },
  {
    title: 'Share the private links',
    body: 'Copy, text, WhatsApp, QR, or print. Each person unwraps only their own giftee.',
  },
];

function Stepper({ step, onStep }) {
  const labels = ['Names', 'Exclusions', 'Details', 'Draw', 'Share'];
  return (
    <ol className="flex w-full min-w-0 items-center gap-1 overflow-x-auto pb-1" aria-label="Setup steps">
      {labels.map((label, index) => {
        const active = index === step;
        const done = index < step;
        return (
          <li key={label} className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => done && onStep(index)}
              disabled={!done}
              className={`flex items-center gap-1.5 rounded-full px-1.5 py-1 text-xs font-semibold ${
                active ? 'text-emerald-300' : done ? 'text-slate-200 hover:text-white' : 'text-slate-500'
              }`}
              aria-current={active ? 'step' : undefined}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${
                  active
                    ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-100'
                    : done
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-white/10 text-slate-500'
                }`}
              >
                {done ? '✓' : index + 1}
              </span>
              <span className={active ? 'inline' : 'hidden sm:inline'}>{label}</span>
            </button>
            {index < labels.length - 1 && <span className="h-px w-3 bg-white/15 sm:w-5" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

function ChoiceChip({ selected, onClick, children, tone = 'emerald' }) {
  const selectedClass = tone === 'rose'
    ? 'border-rose-400/60 bg-rose-500/15 text-rose-100'
    : 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
        selected ? selectedClass : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/25'
      }`}
    >
      {children}
    </button>
  );
}

export default function CreateWizard({ event, onUpdateEvent, onPreviewReveal, onLoadDemo, onUseStudio }) {
  const [drawError, setDrawError] = useState(null);
  const [openExclusionId, setOpenExclusionId] = useState(null);
  const step = Math.max(0, Math.min(WIZARD_STEPS.length - 1, event.wizardStep || 0));
  const copy = STEP_COPY[step];
  const peopleCount = namedPeopleCount(event);
  const dates = datePresets();

  useEffect(() => {
    if (!event.guestDrafts || event.guestDrafts.length === 0) {
      onUpdateEvent(ensureWizardDrafts(event));
    }
    // Drafts only need to be seeded once when the wizard opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (partial) => onUpdateEvent({ ...event, ...partial });

  const goToStep = (index) => {
    if (index >= step) return;
    sound.playClick();
    const base = step === 0 ? commitNames(event) : event;
    onUpdateEvent({ ...base, wizardStep: index });
  };

  const continueNames = () => {
    if (peopleCount < 2) return;
    sound.playClick();
    onUpdateEvent({ ...commitNames(event), wizardStep: 1 });
  };

  const handleDraw = () => {
    setDrawError(null);
    sound.playChime();
    const result = drawEvent(commitNames(event));
    if (!result.ok) {
      setDrawError(result.error);
      return;
    }
    onUpdateEvent({ ...result.event, wizardStep: step });
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#f43f5e', '#fbbf24', '#ffffff'],
    });
  };

  const wide = step >= 4;
  const guests = event.guestDrafts || [];
  const includeMe = event.organizerIncluded !== false;

  return (
    <div className={`mx-auto w-full min-w-0 animate-fade-in ${wide ? 'max-w-5xl' : 'max-w-xl'}`}>
      <div className="glass-panel-elevated w-full min-w-0 border border-white/15 p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <span className="badge badge-emerald">No account · stays on this device</span>
          {step === 0 && onLoadDemo && (
            <button type="button" onClick={onLoadDemo} className="text-xs font-semibold text-slate-400 hover:text-white">
              Load sample party
            </button>
          )}
        </div>

        <Stepper step={step} onStep={goToStep} />

        <h2 className="mt-4 font-heading text-2xl font-bold text-white sm:text-3xl">{copy.title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-300">{copy.body}</p>

        <div className="mt-5">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="organizer-name" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Your name
                </label>
                <input
                  id="organizer-name"
                  type="text"
                  value={event.organizerName || ''}
                  autoComplete="name"
                  placeholder="e.g. Jordan"
                  onChange={(e) => patch({ organizerName: e.target.value })}
                  className="glass-input w-full min-w-0 text-base font-semibold"
                />
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={includeMe}
                    onChange={(e) => patch({ organizerIncluded: e.target.checked })}
                    className="h-4 w-4 cursor-pointer rounded accent-emerald-500"
                  />
                  Include me in the draw
                </label>
                {!includeMe && (
                  <p className="mt-1 text-xs text-slate-400">You’ll organize the links and won’t be assigned a giftee.</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Everyone else</div>
                {guests.map((guest, index) => (
                  <div key={guest.id} className="flex min-w-0 gap-2">
                    <input
                      type="text"
                      value={guest.name}
                      aria-label={`Participant ${index + 1}`}
                      placeholder={includeMe ? `Add name ${index + 2}` : `Add name ${index + 1}`}
                      onChange={(e) => patch({
                        guestDrafts: guests.map((row) => (
                          row.id === guest.id ? { ...row, name: e.target.value } : row
                        )),
                      })}
                      className="glass-input min-w-0 w-full"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        patch({ guestDrafts: guests.filter((row) => row.id !== guest.id) });
                      }}
                      className="rounded-xl p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"
                      aria-label={`Remove name ${index + 1}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    patch({ guestDrafts: [...guests, { id: createId('g'), name: '' }] });
                  }}
                  className="btn btn-secondary px-3 py-2 text-xs"
                >
                  <Plus size={15} className="text-emerald-400" />
                  Add another name
                </button>
              </div>

              <p className="text-xs text-slate-400">
                {peopleCount === 0 && 'Add at least two people to continue.'}
                {peopleCount === 1 && includeMe && !(event.organizerName || '').trim() && 'Enter your name, or add another person.'}
                {peopleCount === 1 && !(includeMe && !(event.organizerName || '').trim()) && 'Add one more person. A draw needs two names.'}
                {peopleCount >= 2 && `${peopleCount} people in this draw.`}
              </p>
            </div>
          )}

          {step === 1 && (
            <ExclusionsStep
              event={event}
              openId={openExclusionId}
              setOpenId={setOpenExclusionId}
              onToggle={(giverId, receiverId) => {
                sound.playClick();
                patch({
                  exclusions: toggleExclusion(
                    event.exclusions,
                    giverId,
                    receiverId,
                    event.mutualExclusions !== false
                  ),
                  matches: null,
                });
              }}
              onMutual={(checked) => patch({ mutualExclusions: checked })}
            />
          )}

          {step === 2 && (
            <DetailsStep
              event={event}
              dates={dates}
              onOccasion={(id) => {
                sound.playClick();
                onUpdateEvent(applyOccasion(event, id));
              }}
              onPatch={patch}
            />
          )}

          {step === 3 && (
            <DrawStep
              event={event}
              drawError={drawError}
              onDraw={handleDraw}
            />
          )}

          {step === 4 && (
            <div className="space-y-4">
              {event.matches ? (
                <ShareLinksPanel
                  event={event}
                  onPreviewReveal={onPreviewReveal}
                  showIntro={false}
                />
              ) : (
                <p className="text-sm text-slate-300">Draw names before sharing links.</p>
              )}
              <p className="text-xs text-slate-400">
                Re-draw if the group changes. Copy, WhatsApp, text, QR, and print stay available in the studio.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          {step === 0 ? (
            <button type="button" onClick={onUseStudio} className="btn btn-secondary px-3 py-2 text-xs">
              Full studio
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goToStep(step - 1)}
              className="btn btn-secondary px-3 py-2 text-xs"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          )}

          {step === 0 && (
            <button
              type="button"
              onClick={continueNames}
              disabled={peopleCount < 2}
              className="btn btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
              <ChevronRight size={16} />
            </button>
          )}
          {step === 1 && (
            <button type="button" onClick={() => { sound.playClick(); patch({ wizardStep: 2 }); }} className="btn btn-primary px-4 py-2 text-sm">
              Continue
              <ChevronRight size={16} />
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              onClick={() => {
                if (!event.occasion) return;
                sound.playClick();
                const title = (event.title || '').trim() || occasionTitle(event.occasion) || 'Secret Santa';
                patch({ title, wizardStep: 3 });
              }}
              disabled={!event.occasion}
              className="btn btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
              <ChevronRight size={16} />
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={() => { sound.playClick(); patch({ wizardStep: 4 }); }}
              disabled={!event.matches}
              className="btn btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Share links
              <ChevronRight size={16} />
            </button>
          )}
          {step === 4 && (
            <button
              type="button"
              onClick={() => {
                sound.playChime();
                patch({ setupComplete: true });
              }}
              className="btn btn-primary px-4 py-2 text-sm"
            >
              <Check size={16} />
              Open studio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ExclusionsStep({ event, openId, setOpenId, onToggle, onMutual }) {
  const participants = event.participants || [];
  const mutual = event.mutualExclusions !== false;
  const count = (event.exclusions || []).length;

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
        <input
          type="checkbox"
          checked={mutual}
          onChange={(e) => onMutual(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-rose-400"
        />
        <span>
          <span className="font-semibold text-white">Block both directions</span>
          <span className="mt-0.5 block text-xs text-slate-400">
            Usual for couples and roommates. New rules apply both ways; unchecking a name removes both.
          </span>
        </span>
      </label>

      <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
        {participants.map((person) => {
          const others = participants.filter((candidate) => candidate.id !== person.id);
          const blocked = others.filter((candidate) => isExcluded(event.exclusions, person.id, candidate.id));
          const open = openId === person.id;
          return (
            <div key={person.id} className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-semibold text-white">{person.name}</span>
                {person.role === 'organizer' && <span className="badge badge-emerald py-0.5 text-[10px]">You</span>}
              </div>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : person.id)}
                className="glass-input flex w-full items-center justify-between gap-2 py-2 text-left text-sm"
                aria-expanded={open}
              >
                <span className={blocked.length ? 'text-rose-200' : 'text-slate-400'}>
                  {blocked.length ? `Won't draw ${blocked.map((b) => b.name).join(', ')}` : 'Select names to exclude'}
                </span>
                <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {others.map((candidate) => (
                    <ChoiceChip
                      key={candidate.id}
                      tone="rose"
                      selected={isExcluded(event.exclusions, person.id, candidate.id)}
                      onClick={() => onToggle(person.id, candidate.id)}
                    >
                      {candidate.name}
                    </ChoiceChip>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-slate-400">
        <ShieldAlert size={13} className="text-rose-400" />
        {count === 0 ? 'Anyone can draw anyone.' : `${count} blocked draw${count === 1 ? '' : 's'}.`}
      </p>
    </div>
  );
}

function DetailsStep({ event, dates, onOccasion, onPatch }) {
  const selectedOccasion = occasionById(event.occasion);
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Occasion</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {OCCASIONS.map((occasion) => {
            const selected = event.occasion === occasion.id;
            return (
              <button
                key={occasion.id}
                type="button"
                onClick={() => onOccasion(occasion.id)}
                aria-pressed={selected}
                className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                  selected
                    ? 'border-emerald-400/60 bg-emerald-500/15'
                    : 'border-white/10 bg-white/5 hover:border-white/25'
                }`}
              >
                <span className="block text-xl" aria-hidden="true">{occasion.emoji}</span>
                <span className={`mt-1 block text-sm font-semibold ${selected ? 'text-emerald-100' : 'text-white'}`}>
                  {occasion.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="exchange-title" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Exchange name
        </label>
        <input
          id="exchange-title"
          type="text"
          value={event.title || ''}
          placeholder={selectedOccasion ? `${selectedOccasion.label} exchange` : 'Family gift exchange'}
          onChange={(e) => onPatch({ title: e.target.value, autoTitle: event.autoTitle })}
          className="glass-input w-full font-semibold"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Calendar size={13} className="text-rose-400" />
          Exchange date
        </div>
        <div className="flex flex-wrap gap-2">
          {dates.map((preset) => (
            <ChoiceChip
              key={preset.id}
              selected={event.exchangeDate === preset.value}
              onClick={() => onPatch({ exchangeDate: preset.value })}
            >
              {preset.label}
            </ChoiceChip>
          ))}
        </div>
        <input
          type="date"
          value={event.exchangeDate || ''}
          aria-label="Custom exchange date"
          onChange={(e) => onPatch({ exchangeDate: e.target.value })}
          className="glass-input mt-2 w-full text-slate-200"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <DollarSign size={13} className="text-amber-400" />
          Budget
        </div>
        <div className="flex flex-wrap gap-2">
          {BUDGET_PRESETS.map((preset) => (
            <ChoiceChip
              key={preset}
              selected={event.budget === preset}
              onClick={() => onPatch({ budget: preset })}
            >
              {preset}
            </ChoiceChip>
          ))}
        </div>
        <input
          type="text"
          value={event.budget || ''}
          aria-label="Custom budget"
          placeholder="Or type a budget, like $20 – $30"
          onChange={(e) => onPatch({ budget: e.target.value })}
          className="glass-input mt-2 w-full"
        />
      </div>

      <div>
        <label htmlFor="exchange-note" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Note for the group
        </label>
        <textarea
          id="exchange-note"
          rows={3}
          value={event.rules || ''}
          placeholder="Optional. Handmade gifts welcome, or keep it a surprise until the party."
          onChange={(e) => onPatch({ rules: e.target.value })}
          className="glass-input w-full text-sm"
        />
      </div>

      {!event.occasion && (
        <p className="text-xs text-amber-200/90">Pick an occasion to continue. “Other” works for office parties and everything else.</p>
      )}
    </div>
  );
}

function DrawStep({ event, drawError, onDraw }) {
  const participants = event.participants || [];
  const occasion = occasionById(event.occasion);
  const dateLabel = formatExchangeDate(event.exchangeDate);
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <dt className="text-[11px] uppercase tracking-wider text-slate-400">People</dt>
          <dd className="font-semibold text-white">{participants.length}</dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <dt className="text-[11px] uppercase tracking-wider text-slate-400">Exclusions</dt>
          <dd className="font-semibold text-white">{(event.exclusions || []).length}</dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <dt className="text-[11px] uppercase tracking-wider text-slate-400">Occasion</dt>
          <dd className="font-semibold text-white">{occasion ? `${occasion.emoji} ${occasion.label}` : '—'}</dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <dt className="text-[11px] uppercase tracking-wider text-slate-400">When / budget</dt>
          <dd className="font-semibold text-white">{[dateLabel, event.budget].filter(Boolean).join(' · ') || '—'}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        {participants.map((person) => (
          <span key={person.id} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/50 px-3 py-1 text-sm text-slate-100">
            <Users size={12} className="text-emerald-400" />
            {person.name}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={onDraw}
        disabled={participants.length < 2}
        className="btn btn-primary w-full py-3 text-base shadow-lg shadow-emerald-500/20 disabled:opacity-40"
      >
        <Sparkles size={18} />
        {event.matches ? 'Re-draw names' : 'Shuffle & draw names'}
      </button>

      {drawError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-sm text-rose-100">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-400" />
          <div>
            <strong>Pairing impossible.</strong> {drawError}
          </div>
        </div>
      )}

      {event.matches && !drawError && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-50">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <Check size={16} />
            Draw locked for {event.matches.length} people
          </div>
          <p className="text-emerald-100/80">
            Assignments stay on this device. Continue to share a separate link with each person.
          </p>
        </div>
      )}
    </div>
  );
}
