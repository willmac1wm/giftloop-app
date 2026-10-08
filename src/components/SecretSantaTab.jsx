import React, { useState } from 'react';
import { celebrateDraw } from '../utils/christmasConfetti';
import {
  Users, Plus, Trash2, ShieldAlert, Sparkles, DollarSign, Calendar, AlertCircle,
} from 'lucide-react';
import { sound } from '../utils/audio';
import { generateSecretSantaDraw } from '../utils/shuffle';
import ExclusionModal from './ExclusionModal';
import CreateExchangeWizard from './CreateExchangeWizard';
import RevealLinksPanel from './RevealLinksPanel';
import ExchangeWishLinks from './ExchangeWishLinks';
import { organizerMatch, organizerPerson } from '../exchange/progress';
import { profileStatus } from '../exchange/profileStatus';
import { buildRevealPayload } from '../utils/revealLink';
import ExchangeDateActions from './ExchangeDateActions';

export default function SecretSantaTab({
  event,
  onUpdateEvent,
  onPreviewReveal,
  onStartNewExchange,
  onLoadSample,
}) {
  const [showExclusions, setShowExclusions] = useState(false);
  const [drawError, setDrawError] = useState(null);
  const [editingWishes, setEditingWishes] = useState(false);
  const [wishDraft, setWishDraft] = useState('');

  // Form states for adding participant
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [behalfWishlist, setBehalfWishlist] = useState('');
  const [behalfLikes, setBehalfLikes] = useState('');
  const [behalfDislikes, setBehalfDislikes] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const canReach = Boolean(newEmail.trim() || newPhone.trim());

  const handleAddParticipant = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    sound.playClick();
    const onBehalf = !canReach;
    const wishlist = onBehalf
      ? behalfWishlist.split('\n').map((w) => w.trim()).filter(Boolean)
      : [];
    const newParticipant = {
      id: 'p_' + Date.now(),
      name: newName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim(),
      wishlist,
      likes: onBehalf ? behalfLikes.trim() : '',
      dislikes: onBehalf ? behalfDislikes.trim() : '',
      joined: false,
    };

    onUpdateEvent({
      ...event,
      participants: [...event.participants, newParticipant],
      matches: null,
    });

    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setBehalfWishlist('');
    setBehalfLikes('');
    setBehalfDislikes('');
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

    const result = generateSecretSantaDraw(event.participants, event.exclusions, true);
    if (!result.success) {
      setDrawError(result.error);
      return;
    }

    onUpdateEvent({
      ...event,
      matches: result.matches,
    });

    celebrateDraw();
  };

  if (!event.setupComplete) {
    return (
      <CreateExchangeWizard
        event={event}
        onUpdateEvent={onUpdateEvent}
        onPreviewReveal={onPreviewReveal}
        onLoadSample={onLoadSample}
        onFinish={(next) => onUpdateEvent({ ...next, setupComplete: true })}
      />
    );
  }

  const me = organizerPerson(event);
  const saveMyWishes = (submitEvent) => {
    submitEvent.preventDefault();
    const lines = wishDraft.split('\n').map((line) => line.trim()).filter(Boolean);
    onUpdateEvent({
      ...event,
      organizerWishes: wishDraft,
      participants: (event.participants || []).map((person) => (
        person.id === me?.id ? { ...person, wishlist: lines } : person
      )),
    });
    setEditingWishes(false);
  };

  return (
    <div className="space-y-6">
      <header className="exchange-lead">
        <p className="home-kicker">This exchange</p>
        <h1>{event.title || 'Secret Santa'}</h1>
        <p>
          {[event.exchangeDate && `Gift date ${event.exchangeDate}`, event.budget && `Budget ${event.budget}`]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <p className="home-next">
          Next: {event.matches ? 'Share each link, or read your recipient’s wishes.' : 'Set exclusions, then draw names.'}
        </p>
        <ExchangeWishLinks
          event={event}
          onOpenMine={() => {
            setWishDraft((me?.wishlist || []).join('\n'));
            setEditingWishes(true);
          }}
          onPreview={event.matches ? () => {
            const match = organizerMatch(event);
            if (match) onPreviewReveal(buildRevealPayload(event, match));
          } : null}
        />
        {editingWishes && (
          <form className="exchange-wish-panel" onSubmit={saveMyWishes}>
            <label htmlFor="my-wish-list">Edit my wish list. One gift per line.</label>
            <textarea
              id="my-wish-list"
              className="glass-input w-full"
              rows={4}
              value={wishDraft}
              onChange={(e) => setWishDraft(e.target.value)}
            />
            <button type="submit" className="btn btn-primary text-sm">Save wish list</button>
          </form>
        )}
      </header>
      {/* Event Overview & Settings Card */}
      <div className="glass-panel p-5 sm:p-6 border border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Event Title
            </label>
            <input
              type="text"
              value={event.title}
              onChange={(e) => onUpdateEvent({ ...event, title: e.target.value, titleEdited: true })}
              className="glass-input w-full text-base font-semibold"
              placeholder="e.g. Family Holiday Exchange 2026"
            />
            {event.occasionLabel && (
              <span className="badge badge-gold mt-2">{event.occasionLabel}</span>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
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
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
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
        <div className="mt-3">
          <ExchangeDateActions id={event.title} title={event.title} date={event.exchangeDate} />
        </div>

        <div className="mt-4 pt-3 border-t border-white/5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
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

        <div className="mt-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Invite / share message
          </label>
          <textarea
            value={event.inviteMessage || ''}
            onChange={(e) => onUpdateEvent({
              ...event,
              inviteMessage: e.target.value,
              inviteMessageEdited: true,
            })}
            rows={3}
            className="glass-input w-full text-xs"
            placeholder="Included when you text or copy a reveal link. Leave blank to use the short default."
          />
        </div>
      </div>

      {/* Roster & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-heading text-white flex items-center gap-2">
            <Users size={22} className="text-emerald-400" />
            Participants ({event.participants.length})
          </h2>
          <p className="text-xs text-slate-400">
            Add a name and an email or mobile. They fill in their own wishlist when they accept.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowExclusions(true)}
            className="btn btn-secondary text-xs py-2 px-3 relative"
          >
            <ShieldAlert size={15} className="text-rose-400" />
            Exclusions ({event.exclusions.length})
            {event.exclusions.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute -top-1 -right-1" />
            )}
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-secondary text-xs py-2 px-3"
          >
            <Plus size={15} className="text-emerald-400" />
            {showAddForm ? 'Cancel' : 'Add Person'}
          </button>

          <button
            onClick={handleDrawNames}
            disabled={event.participants.length < 2}
            className="btn btn-primary text-xs py-2 px-4 shadow-lg shadow-emerald-500/20 disabled:opacity-40"
          >
            <Sparkles size={15} />
            {event.matches ? 'Re-Draw Names' : 'Shuffle & Draw Names'}
          </button>

          {onStartNewExchange && (
            <button
              type="button"
              onClick={onStartNewExchange}
              className="btn btn-secondary text-xs py-2 px-3"
            >
              New exchange
            </button>
          )}
        </div>
      </div>

      {drawError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-sm flex items-start gap-2.5">
          <AlertCircle size={18} className="text-rose-400 mt-0.5 shrink-0" />
          <div>
            <strong>Pairing Impossible:</strong> {drawError}
          </div>
        </div>
      )}

      {/* Add Participant Expandable Form */}
      {showAddForm && (
        <form onSubmit={handleAddParticipant} className="glass-panel p-5 border border-emerald-500/30 animate-fade-in">
          <h3 className="text-sm font-bold font-heading text-emerald-400 mb-1 uppercase tracking-wider">
            Add New Participant
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Enter a name plus an email or mobile number. The invite asks them for wishlist ideas, likes, and dislikes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Full Name *</label>
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
              <label className="text-xs text-slate-400 block mb-1">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="jordan@example.com"
                className="glass-input w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Mobile</label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="555-0100"
                className="glass-input w-full text-sm"
              />
            </div>
          </div>

          {!canReach && (
            <details className="mb-4">
              <summary className="text-xs text-slate-400 cursor-pointer">Add on their behalf</summary>
              <p className="text-xs text-slate-500 mt-2 mb-2">
                Only for someone with no email and no phone, who cannot fill this in themselves.
              </p>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Wishlist ideas, one per line</label>
                  <textarea
                    value={behalfWishlist}
                    onChange={(e) => setBehalfWishlist(e.target.value)}
                    placeholder={"Coffee beans\nWool socks\nSci-fi book"}
                    rows={3}
                    className="glass-input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Likes and hobbies</label>
                  <textarea
                    value={behalfLikes}
                    onChange={(e) => setBehalfLikes(e.target.value)}
                    placeholder="Baking, hiking, jazz music, board games"
                    rows={2}
                    className="glass-input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Dislikes and allergies</label>
                  <textarea
                    value={behalfDislikes}
                    onChange={(e) => setBehalfDislikes(e.target.value)}
                    placeholder="Nut allergy, no scented candles"
                    rows={2}
                    className="glass-input w-full text-xs"
                  />
                </div>
              </div>
            </details>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="btn btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary text-xs">
              Save Participant
            </button>
          </div>
        </form>
      )}

      {/* Participants Grid / List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {event.participants.map((p) => {
          const exclusionsForP = event.exclusions.filter((ex) => ex.giverId === p.id);
          return (
            <div
              key={p.id}
              className="glass-panel p-4 border border-white/5 hover:border-white/20 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-white text-base font-heading">
                      {p.name}
                    </h3>
                    {p.email && <p className="text-xs text-slate-400">{p.email}</p>}
                    {p.phone && <p className="text-xs text-slate-400">{p.phone}</p>}
                    <span className={`badge ${statusTone(profileStatus(p))} mt-2`}>{profileStatus(p)}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveParticipant(p.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                    title="Remove participant"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

              </div>

              {exclusionsForP.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-slate-400 flex items-center gap-1">
                  <ShieldAlert size={12} className="text-rose-400" />
                  <span>Cannot draw {exclusionsForP.length} person(s)</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Matches & Secret Sharing Hub */}
      {event.matches && (
        <div className="glass-panel-elevated p-6 border border-emerald-500/30 animate-fade-in space-y-4">
          <div className="pb-4 border-b border-white/10">
            <h2 className="text-2xl font-bold font-heading text-white">
              Share each link
            </h2>
          </div>
          <RevealLinksPanel event={event} onPreviewReveal={onPreviewReveal} onUpdateEvent={onUpdateEvent} />
        </div>
      )}

      {/* Exclusion Rules Modal */}
      <ExclusionModal
        isOpen={showExclusions}
        onClose={() => setShowExclusions(false)}
        participants={event.participants}
        exclusions={event.exclusions}
        onUpdateExclusions={(newExclusions) => {
          onUpdateEvent({
            ...event,
            exclusions: newExclusions,
            matches: null, // Invalidate old draw when rules change
          });
        }}
      />

    </div>
  );
}

function statusTone(label) {
  if (label === 'Wishlist added') return 'badge-gold';
  if (label === 'Joined') return 'badge-emerald';
  if (label === 'Declined') return 'badge-ruby';
  return 'badge-frozen';
}
