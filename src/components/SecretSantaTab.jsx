import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Users, Gift, Plus, Trash2, ShieldAlert, Sparkles, Copy, Check, 
  Share2, QrCode, Eye, Printer, RefreshCw, DollarSign, Calendar, AlertCircle, MessageCircle, Send
} from 'lucide-react';
import { sound } from '../utils/audio';
import { generateSecretSantaDraw } from '../utils/shuffle';
import { encodeSecretPayload } from '../utils/crypto';
import ExclusionModal from './ExclusionModal';
import QRCodeModal from './QRCodeModal';
import PrintCardsModal from './PrintCardsModal';

export default function SecretSantaTab({ event, onUpdateEvent, onPreviewReveal }) {
  const [showExclusions, setShowExclusions] = useState(false);
  const [activeQR, setActiveQR] = useState(null); // { participantName, url }
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [drawError, setDrawError] = useState(null);

  // Form states for adding participant
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newWishlist, setNewWishlist] = useState('');
  const [newLikes, setNewLikes] = useState('');
  const [newDislikes, setNewDislikes] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const getRevealUrlForMatch = (match) => {
    const payload = {
      giverName: match.giver.name,
      receiverName: match.receiver.name,
      wishlist: match.receiver.wishlist || [],
      likes: match.receiver.likes || '',
      dislikes: match.receiver.dislikes || '',
      budget: event.budget,
      exchangeDate: event.exchangeDate,
      eventTitle: event.title,
      rules: event.rules,
    };
    const token = encodeSecretPayload(payload);
    // Base URL preserving current host & protocol
    const origin = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
    return `${origin}?view=reveal&t=${token}`;
  };

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
      // If matches were already drawn, keep them or mark need redraw
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

    const result = generateSecretSantaDraw(event.participants, event.exclusions, true);
    if (!result.success) {
      setDrawError(result.error);
      return;
    }

    onUpdateEvent({
      ...event,
      matches: result.matches,
    });

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#f43f5e', '#fbbf24', '#ffffff'],
    });
  };

  const handleCopyLink = (match) => {
    const url = getRevealUrlForMatch(match);
    navigator.clipboard.writeText(url);
    sound.playClick();
    setCopiedId(match.giver.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllLinks = () => {
    if (!event.matches) return;
    sound.playClick();
    const text = event.matches.map((m) => {
      const url = getRevealUrlForMatch(m);
      return `🎁 ${m.giver.name}: ${url}`;
    }).join('\n\n');

    navigator.clipboard.writeText(`🎄 Secret Santa Links - ${event.title}\n\n` + text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleWhatsApp = (match) => {
    const url = getRevealUrlForMatch(match);
    const text = encodeURIComponent(
      `🎄 Hi ${match.giver.name}! Here is your secret Secret Santa draw link for "${event.title}":\n\n${url}\n\nTap to unwrap your match! 🤫`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleSMS = (match) => {
    const url = getRevealUrlForMatch(match);
    const body = encodeURIComponent(
      `Hi ${match.giver.name}! Here is your Secret Santa draw link: ${url}`
    );
    window.open(`sms:?body=${body}`, '_blank');
  };

  const handleNativeShare = async (match) => {
    const url = getRevealUrlForMatch(match);
    sound.playClick();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Secret Santa - ${event.title}`,
          text: `🎄 Hi ${match.giver.name}! Here is your secret Secret Santa draw link. Tap to unwrap:`,
          url: url,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      }
    } else {
      handleCopyLink(match);
    }
  };

  return (
    <div className="space-y-6">
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
              onChange={(e) => onUpdateEvent({ ...event, title: e.target.value })}
              className="glass-input w-full text-base font-semibold"
              placeholder="e.g. Family Holiday Exchange 2026"
            />
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
      </div>

      {/* Roster & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-heading text-white flex items-center gap-2">
            <Users size={22} className="text-emerald-400" />
            Participants ({event.participants.length})
          </h2>
          <p className="text-xs text-slate-400">
            Add friends, configure spouse/exclusion rules, then draw!
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
          <h3 className="text-sm font-bold font-heading text-emerald-400 mb-3 uppercase tracking-wider">
            Add New Participant
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
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
              <label className="text-xs text-slate-400 block mb-1">Email or Phone (Optional)</label>
              <input
                type="text"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="jordan@example.com"
                className="glass-input w-full text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Wishlist Ideas (One per line)</label>
              <textarea
                value={newWishlist}
                onChange={(e) => setNewWishlist(e.target.value)}
                placeholder="Coffee beans&#10;Wool socks&#10;Sci-fi book"
                rows={3}
                className="glass-input w-full text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Likes & Hobbies</label>
              <textarea
                value={newLikes}
                onChange={(e) => setNewLikes(e.target.value)}
                placeholder="Baking, hiking, jazz music, board games"
                rows={3}
                className="glass-input w-full text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Dislikes & Allergies</label>
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
                  </div>
                  <button
                    onClick={() => handleRemoveParticipant(p.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                    title="Remove participant"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {p.wishlist && p.wishlist.length > 0 && (
                  <div className="mb-2">
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                      Wishlist ({p.wishlist.length})
                    </span>
                    <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">
                      {p.wishlist.join(', ')}
                    </p>
                  </div>
                )}

                {p.likes && (
                  <p className="text-[11px] text-slate-400 line-clamp-1 mb-1">
                    ❤️ {p.likes}
                  </p>
                )}
                {p.dislikes && (
                  <p className="text-[11px] text-rose-300 line-clamp-1 mb-1">
                    🚫 {p.dislikes}
                  </p>
                )}
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
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <span className="badge badge-emerald mb-1">
                <Check size={12} /> Draw Completed & Locked
              </span>
              <h2 className="text-2xl font-bold font-heading text-white">
                Shareable Secret Reveal Links
              </h2>
              <p className="text-xs text-slate-300 max-w-xl">
                Each participant gets their own private link. When they open it, only they can unwrap and see who they got!
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyAllLinks}
                className="btn btn-secondary text-xs py-2 px-3"
              >
                {copiedAll ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copiedAll ? 'All Copied!' : 'Copy All Links'}
              </button>

              <button
                onClick={() => setShowPrintModal(true)}
                className="btn btn-gold text-xs py-2 px-3"
              >
                <Printer size={14} />
                Print Slips
              </button>
            </div>
          </div>

          {/* Links Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-400 border-b border-white/10">
                  <th className="py-2.5 px-3">Participant</th>
                  <th className="py-2.5 px-3">Secret Link & Sharing</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {event.matches.map((match) => {
                  const url = getRevealUrlForMatch(match);
                  const isCopied = copiedId === match.giver.id;

                  return (
                    <tr key={match.giver.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">{match.giver.name}</div>
                        <div className="text-xs text-slate-400">
                          {match.giver.email || 'No email registered'}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 max-w-md">
                          <input
                            type="text"
                            readOnly
                            value={url}
                            className="glass-input text-xs py-1.5 px-2.5 font-mono text-slate-300 w-full truncate"
                          />
                          <button
                            onClick={() => handleCopyLink(match)}
                            className="btn btn-secondary text-xs py-1.5 px-2.5 shrink-0"
                            title="Copy link to clipboard"
                          >
                            {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            {isCopied ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleNativeShare(match)}
                            className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Open iPhone / System Share Sheet"
                          >
                            <Share2 size={16} />
                          </button>

                          <button
                            onClick={() => handleWhatsApp(match)}
                            className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                            title="Share via WhatsApp"
                          >
                            <MessageCircle size={16} />
                          </button>

                          <button
                            onClick={() => handleSMS(match)}
                            className="p-2 text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                            title="Share via SMS"
                          >
                            <Send size={16} />
                          </button>

                          <button
                            onClick={() => {
                              sound.playClick();
                              setActiveQR({
                                participantName: match.giver.name,
                                url,
                              });
                            }}
                            className="p-2 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                            title="Show Scannable QR Code"
                          >
                            <QrCode size={16} />
                          </button>

                          <button
                            onClick={() => {
                              sound.playClick();
                              onPreviewReveal({
                                giverName: match.giver.name,
                                receiverName: match.receiver.name,
                                wishlist: match.receiver.wishlist || [],
                                likes: match.receiver.likes || '',
                                dislikes: match.receiver.dislikes || '',
                                budget: event.budget,
                                exchangeDate: event.exchangeDate,
                                eventTitle: event.title,
                                rules: event.rules,
                              });
                            }}
                            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Preview Reveal View"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

      {/* QR Code Scan Modal */}
      {activeQR && (
        <QRCodeModal
          isOpen={true}
          onClose={() => setActiveQR(null)}
          participantName={activeQR.participantName}
          url={activeQR.url}
          eventTitle={event.title}
        />
      )}

      {/* Print Slips Modal */}
      {showPrintModal && (
        <PrintCardsModal
          isOpen={true}
          onClose={() => setShowPrintModal(false)}
          event={event}
          matches={event.matches}
          getRevealUrl={getRevealUrlForMatch}
        />
      )}
    </div>
  );
}
