import React, { useState } from 'react';
import { X, ShieldAlert, Plus, Trash2, ArrowRight, RefreshCw } from 'lucide-react';
import { sound } from '../utils/audio';

export default function ExclusionModal({ isOpen, onClose, participants, exclusions, onUpdateExclusions }) {
  const [giverId, setGiverId] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [isMutual, setIsMutual] = useState(true);

  if (!isOpen) return null;

  const handleAddExclusion = (e) => {
    e.preventDefault();
    if (!giverId || !receiverId || giverId === receiverId) return;

    sound.playClick();
    const newExclusions = [...exclusions];

    // Check if already exists
    const exists = newExclusions.some(
      (ex) => ex.giverId === giverId && ex.receiverId === receiverId
    );

    if (!exists) {
      newExclusions.push({ giverId, receiverId });
    }

    if (isMutual) {
      const reverseExists = newExclusions.some(
        (ex) => ex.giverId === receiverId && ex.receiverId === giverId
      );
      if (!reverseExists) {
        newExclusions.push({ giverId: receiverId, receiverId: giverId });
      }
    }

    onUpdateExclusions(newExclusions);
    setReceiverId('');
  };

  const handleRemoveExclusion = (index) => {
    sound.playClick();
    const updated = exclusions.filter((_, i) => i !== index);
    onUpdateExclusions(updated);
  };

  const getParticipantName = (id) => {
    const p = participants.find((item) => item.id === id);
    return p ? p.name : 'Unknown';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="glass-panel-elevated w-full max-w-lg p-6 relative border border-white/20 flex flex-col max-h-[90vh]"
        style={{ background: 'rgba(15, 23, 42, 0.95)' }}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-white">
                Exclusion Rules (Couples & Restrictions)
              </h3>
              <p className="text-xs text-slate-400">
                Prevent spouses, roommates, or past pairs from drawing each other.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Add Rule Form */}
        <form onSubmit={handleAddExclusion} className="p-4 bg-slate-900/60 rounded-xl border border-white/10 mb-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Add New Restriction
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Person</label>
              <select
                value={giverId}
                onChange={(e) => setGiverId(e.target.value)}
                className="glass-input w-full text-sm"
                required
              >
                <option value="">Select participant...</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Cannot Draw</label>
              <select
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                className="glass-input w-full text-sm"
                required
              >
                <option value="">Select target...</option>
                {participants
                  .filter((p) => p.id !== giverId)
                  .map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={isMutual}
                onChange={(e) => setIsMutual(e.target.checked)}
                className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
              />
              <span>Mutual rule (Neither can draw the other)</span>
            </label>

            <button
              type="submit"
              disabled={!giverId || !receiverId || giverId === receiverId}
              className="btn btn-primary text-xs py-2 px-3.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={15} />
              Add Rule
            </button>
          </div>
        </form>

        {/* List of active exclusions */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 mb-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
            <span>Active Restrictions ({exclusions.length})</span>
            {exclusions.length > 0 && (
              <button
                onClick={() => {
                  sound.playClick();
                  onUpdateExclusions([]);
                }}
                className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          {exclusions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-white/10 rounded-xl">
              No exclusions configured yet. Anyone can draw anyone!
            </div>
          ) : (
            exclusions.map((ex, idx) => (
              <div
                key={`${ex.giverId}-${ex.receiverId}-${idx}`}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-white/5 text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-white">{getParticipantName(ex.giverId)}</span>
                  <span className="text-rose-400 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                    <ArrowRight size={12} /> cannot draw
                  </span>
                  <span className="font-semibold text-white">{getParticipantName(ex.receiverId)}</span>
                </div>
                <button
                  onClick={() => handleRemoveExclusion(idx)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                  title="Remove restriction"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-white/10 flex justify-end">
          <button onClick={onClose} className="btn btn-secondary text-sm">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
