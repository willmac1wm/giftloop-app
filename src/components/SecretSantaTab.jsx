import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Users, Plus, Trash2, ShieldAlert, Sparkles, DollarSign, Calendar, AlertCircle,
} from 'lucide-react';
import { sound } from '../utils/audio';
import { drawEvent, freshSecretSantaEvent, occasionById, shouldShowWizard, syncDraftsFromParticipants, commitNames } from '../utils/wizard';
import ExclusionModal from './ExclusionModal';
import ShareLinksPanel from './ShareLinksPanel';
import CreateWizard from './CreateWizard';

export default function SecretSantaTab({ event, onUpdateEvent, onPreviewReveal, onLoadDemo }) {
  const [showExclusions, setShowExclusions] = useState(false);
  const [drawError, setDrawError] = useState(null);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newWishlist, setNewWishlist] = useState('');
  const [newLikes, setNewLikes] = useState('');
  const [newDislikes, setNewDislikes] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  if (shouldShowWizard(event)) {
    return (
      <CreateWizard
        event={event}
        onUpdateEvent={onUpdateEvent}
        onPreviewReveal={onPreviewReveal}
        onLoadDemo={onLoadDemo}
        onUseStudio={() => {
          sound.playClick();
          onUpdateEvent({ ...commitNames(event), setupComplete: true });
        }}
      />
    );
  }

  const handleAddParticipant = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    sound.playClick();
    const newParticipant = {
      id: 'p_' + Date.now(),
      name: newName.trim(),
      email: newEmail.trim(),
      wishlist: newWishlist.split('\n').map((w) => w.trim()).filter(Boolean),
      likes: newLikes.trim(),
      dislikes: newDislikes.trim(),
    };

    onUpdateEvent({
      ...event,
      participants: [...event.participants, newParticipant],
      matches: null,
    });

    setNewName('');
    setNewEmail('');
    setNewWishlist('');
    setNewLikes('');
    setNewDislikes('');
    setShowAddForm(false);
  };

  const handleRemoveParticipant = (id) => {
    sound.playClick();
    const updatedParticipants = event.participants.filter((p) => p.id !== id);
    const updatedExclusions = event.exclusions.filter(
      (ex) => ex.giverId !== id && ex.receiverId !== id
    );
    onUpdateEvent({
      ...event,
      participants: updatedParticipants,
      exclusions: updatedExclusions,
      matches: null,
    });
  };

  const handleDrawNames = () => {
    setDrawError(null);
    sound.playChime();
    const result = drawEvent(event);
    if (!result.ok) {
      setDrawError(result.error);
      return;
    }
    onUpdateEvent(result.event);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#f43f5e', '#fbbf24', '#ffffff'],
    });
  };

  const handleNewExchange = () => {
    if (!window.confirm('Start a new Secret Santa on this device? The current names and draw will be cleared.')) return;
    sound.playClick();
    onUpdateEvent(freshSecretSantaEvent());
  };

  const handleReopenWizard = () => {
    sound.playClick();
    let wizardStep = 0;
    if (event.matches) wizardStep = 4;
    else if ((event.participants || []).length >= 2) wizardStep = 3;
    onUpdateEvent({
      ...syncDraftsFromParticipants(event),
      setupComplete: false,
      wizardStep,
    });
  };

  const occasion = occasionById(event.occasion);

  if ((event.participants || []).length === 0) {
    return (
      <div className="mx-auto max-w-lg animate-fade-in">
        <div className="glass-panel-elevated border border-white/15 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
            <Users size={22} />
          </div>
          <h2 className="font-heading text-2xl font-bold text-white">Start a Secret Santa</h2>
          <p className="mt-2 text-sm text-slate-300">
            A fresh draw begins with names, not a sample party. No account and no email — matching stays in this browser.
          </p>
          <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <button type="button" onClick={handleReopenWizard} className="btn btn-primary px-4 py-2 text-sm">
              <Sparkles size={16} />
              Start guided setup
            </button>
            {onLoadDemo && (
              <button type="button" onClick={onLoadDemo} className="btn btn-secondary px-4 py-2 text-sm">
                Load sample party
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-white/10 p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Event Title
            </label>
            <input
              type="text"
              value={event.title}
              onChange={(e) => onUpdateEvent({ ...event, title: e.target.value })}
              className="glass-input w-full text-base font-semibold"
              placeholder="e.g. Family Holiday Exchange 2026"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <DollarSign size={13} className="text-amber-400" /> Spending Budget
            </label>
            <input
              type="text"
              value={event.budget}
              onChange={(e) => onUpdateEvent({ ...event, budget: e.target.value })}
              className="glass-input w-full"
              placeholder="e.g. $25 - $35"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Calendar size={13} className="text-rose-400" /> Exchange Date
            </label>
            <input
              type="date"
              value={event.exchangeDate}
              onChange={(e) => onUpdateEvent({ ...event, exchangeDate: e.target.value })}
              className="glass-input w-full text-slate-200"
            />
          </div>
        </div>

        <div className="mt-4 border-t border-white/5 pt-3">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Guidelines / Note to Guests
          </label>
          <input
            type="text"
            value={event.rules}
            onChange={(e) => onUpdateEvent({ ...event, rules: e.target.value })}
            className="glass-input w-full text-xs"
            placeholder="e.g. Bring wrapped gifts on Christmas Eve; handmade or funny gifts encouraged!"
          />
        </div>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold text-white">
            <Users size={22} className="text-emerald-400" />
            Participants ({event.participants.length})
          </h2>
          <p className="text-xs text-slate-400">
            Wishlists and likes live here. Exclusions and the draw are in the guided setup too.
          </p>
          {occasion && (
            <span className="badge badge-gold mt-2">
              {occasion.emoji} {occasion.label}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleReopenWizard} className="btn btn-secondary px-3 py-2 text-xs">
            <Sparkles size={15} className="text-emerald-400" />
            Guided setup
          </button>

          <button
            type="button"
            onClick={() => setShowExclusions(true)}
            className="btn btn-secondary relative px-3 py-2 text-xs"
          >
            <ShieldAlert size={15} className="text-rose-400" />
            Exclusions ({event.exclusions.length})
            {event.exclusions.length > 0 && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-secondary px-3 py-2 text-xs"
          >
            <Plus size={15} className="text-emerald-400" />
            {showAddForm ? 'Cancel' : 'Add Person'}
          </button>

          <button
            type="button"
            onClick={handleDrawNames}
            disabled={event.participants.length < 2}
            className="btn btn-primary px-4 py-2 text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-40"
          >
            <Sparkles size={15} />
            {event.matches ? 'Re-Draw Names' : 'Shuffle & Draw Names'}
          </button>

          <button type="button" onClick={handleNewExchange} className="btn btn-secondary px-3 py-2 text-xs">
            New exchange
          </button>
        </div>
      </div>

      {drawError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-sm text-rose-200">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-400" />
          <div>
            <strong>Pairing Impossible:</strong> {drawError}
          </div>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddParticipant} className="glass-panel animate-fade-in border border-emerald-500/30 p-5">
          <h3 className="mb-3 font-heading text-sm font-bold uppercase tracking-wider text-emerald-400">
            Add New Participant
          </h3>
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Full Name *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Jordan Smith"
                required
                className="glass-input w-full text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Email or Phone (Optional)</label>
              <input
                type="text"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Optional — links work without it"
                className="glass-input w-full text-sm"
              />
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Wishlist Ideas (One per line)</label>
              <textarea
                value={newWishlist}
                onChange={(e) => setNewWishlist(e.target.value)}
                placeholder="Coffee beans&#10;Wool socks&#10;Sci-fi book"
                rows={3}
                className="glass-input w-full text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Likes & Hobbies</label>
              <textarea
                value={newLikes}
                onChange={(e) => setNewLikes(e.target.value)}
                placeholder="Baking, hiking, jazz music, board games"
                rows={3}
                className="glass-input w-full text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Dislikes & Allergies</label>
              <textarea
                value={newDislikes}
                onChange={(e) => setNewDislikes(e.target.value)}
                placeholder="Nut allergy, no scented candles"
                rows={3}
                className="glass-input w-full text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary text-xs">
              Save Participant
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {event.participants.map((p) => {
          const exclusionsForP = event.exclusions.filter((ex) => ex.giverId === p.id);
          return (
            <div
              key={p.id}
              className="glass-panel flex flex-col justify-between border border-white/5 p-4 transition-all hover:border-white/20"
            >
              <div>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-heading text-base font-bold text-white">
                      {p.name}
                      {p.role === 'organizer' && (
                        <span className="badge badge-emerald ml-2 py-0.5 text-[10px]">You</span>
                      )}
                    </h3>
                    {p.email && <p className="text-xs text-slate-400">{p.email}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(p.id)}
                    className="rounded p-1 text-slate-500 transition-colors hover:text-rose-400"
                    title="Remove participant"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {p.wishlist && p.wishlist.length > 0 && (
                  <div className="mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      Wishlist ({p.wishlist.length})
                    </span>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-300">
                      {p.wishlist.join(', ')}
                    </p>
                  </div>
                )}

                {p.likes && (
                  <p className="mb-1 line-clamp-1 text-[11px] text-slate-400">
                    ❤️ {p.likes}
                  </p>
                )}
                {p.dislikes && (
                  <p className="mb-1 line-clamp-1 text-[11px] text-rose-300">
                    🚫 {p.dislikes}
                  </p>
                )}
              </div>

              {exclusionsForP.length > 0 && (
                <div className="mt-2 flex items-center gap-1 border-t border-white/5 pt-2 text-[10px] text-slate-400">
                  <ShieldAlert size={12} className="text-rose-400" />
                  <span>Cannot draw {exclusionsForP.length} person(s)</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ShareLinksPanel event={event} onPreviewReveal={onPreviewReveal} />

      <ExclusionModal
        isOpen={showExclusions}
        onClose={() => setShowExclusions(false)}
        participants={event.participants}
        exclusions={event.exclusions}
        onUpdateExclusions={(newExclusions) => {
          onUpdateEvent({
            ...event,
            exclusions: newExclusions,
            matches: null,
          });
        }}
      />
    </div>
  );
}
