import React from 'react';
import { X, Printer, ShieldCheck } from 'lucide-react';
import { sound } from '../utils/audio';

export default function PrintCardsModal({ isOpen, onClose, event, matches, getRevealUrl }) {
  if (!isOpen || !matches) return null;

  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm no-print animate-fade-in">
      <div 
        className="glass-panel-elevated w-full max-w-4xl p-6 relative border border-white/20 flex flex-col max-h-[90vh]"
        style={{ background: 'rgba(15, 23, 42, 0.95)' }}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Printer size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-white">
                Printable Secret Envelopes / Folded Slips
              </h3>
              <p className="text-xs text-slate-400">
                Fold along dashed lines so only the participant unfolds their own slip!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="btn btn-gold text-xs py-2 px-3.5">
              <Printer size={15} /> Print Slips Now
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable preview of cards */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map((match, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border-2 border-dashed border-slate-600 bg-slate-900/80 text-left relative"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                    🎁 Secret Santa Card #{idx + 1}
                  </span>
                  <span className="text-[10px] text-slate-400">{event.title}</span>
                </div>

                <div className="mb-2">
                  <span className="text-xs text-slate-400 block">Deliver to:</span>
                  <span className="text-lg font-bold font-heading text-white">
                    {match.giver.name}
                  </span>
                </div>

                <div className="p-3 bg-black/40 rounded-lg border border-white/10 my-2">
                  <div className="text-[11px] text-emerald-400 font-semibold mb-1">
                    [ FOLD HERE TO CONCEAL ]
                  </div>
                  <div className="text-xs text-slate-400">Your recipient is:</div>
                  <div className="text-base font-extrabold text-white mt-0.5">
                    {match.receiver.name}
                  </div>
                  {match.receiver.wishlist && match.receiver.wishlist.length > 0 && (
                    <div className="text-[11px] text-slate-300 mt-1">
                      <strong>Wishes:</strong> {match.receiver.wishlist.join(', ')}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 mt-1">
                    Budget: {event.budget} • Date: {event.exchangeDate || 'TBD'}
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 italic text-center">
                  Fold slip in half and seal with tape or sticker.
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
