import React, { useState, useEffect } from 'react';
import { celebrateUnwrap } from '../utils/christmasConfetti';
import { Gift, Sparkles, CheckCircle2, Lock, Calendar, DollarSign, Heart, Ban, ArrowLeft, BookmarkCheck } from 'lucide-react';
import { sound } from '../utils/audio';
import ShopForMatch from './ShopForMatch';

export default function SecretRevealView({ payload, onBackToOrganizer }) {
  const [unwrapped, setUnwrapped] = useState(false);
  const [personalNotes, setPersonalNotes] = useState('');
  const [purchased, setPurchased] = useState(false);

  const {
    giverName = 'Guest',
    receiverName = 'Special Someone',
    wishlist = [],
    likes = '',
    dislikes = '',
    budget = '$30 - $40',
    exchangeDate = '',
    eventTitle = 'Secret Santa 2026',
    rules = '',
  } = payload || {};

  // Load private note from localStorage for this specific recipient
  useEffect(() => {
    if (giverName && receiverName) {
      const savedNote = localStorage.getItem(`giftloop_note_${giverName}_${receiverName}`);
      if (savedNote) setPersonalNotes(savedNote);
      const savedPurchased = localStorage.getItem(`giftloop_purchased_${giverName}_${receiverName}`);
      if (savedPurchased === 'true') setPurchased(true);
    }
  }, [giverName, receiverName]);

  const handleNoteChange = (e) => {
    setPersonalNotes(e.target.value);
    localStorage.setItem(`giftloop_note_${giverName}_${receiverName}`, e.target.value);
  };

  const handleTogglePurchased = () => {
    sound.playClick();
    const nextVal = !purchased;
    setPurchased(nextVal);
    localStorage.setItem(`giftloop_purchased_${giverName}_${receiverName}`, String(nextVal));
  };

  const handleUnwrap = () => {
    if (unwrapped) return;
    sound.playUnwrap();
    setUnwrapped(true);

    celebrateUnwrap();
  };

  return (
    <div className="min-h-screen py-10 px-4 flex flex-col items-center justify-center relative">
      {onBackToOrganizer && (
        <button
          onClick={onBackToOrganizer}
          className="fixed top-5 left-5 z-20 btn btn-secondary text-xs py-2 px-3.5 backdrop-blur-md"
        >
          <ArrowLeft size={16} />
          Back to Organizer Hub
        </button>
      )}

      <div className="w-full max-w-xl text-center mb-6">
        <span className="badge badge-ruby mb-2">
          <Sparkles size={13} /> {eventTitle}
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-white tracking-tight">
          Hello, {giverName}! 🎄
        </h1>
        <p className="text-sm text-slate-300 mt-1">
          Your private Secret Santa assignment has arrived.
        </p>
      </div>

      {!unwrapped ? (
        /* The Unwrapped Gift Box interactive stage */
        <div 
          onClick={handleUnwrap}
          className="cursor-pointer group glass-panel-elevated p-8 sm:p-12 w-full max-w-md flex flex-col items-center text-center relative overflow-hidden transition-all duration-300 hover:scale-[1.02] border-2 border-emerald-500/40 hover:border-emerald-400"
          style={{
            background: 'linear-gradient(180deg, rgba(16, 26, 45, 0.95) 0%, rgba(10, 18, 32, 0.98) 100%)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(16, 185, 129, 0.25)',
          }}
        >
          {/* Subtle background glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-rose-500/10 to-amber-500/10 pointer-events-none" />

          {/* Ribbon effect */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-rose-600 to-rose-500 text-white flex items-center justify-center shadow-2xl relative mb-6 animate-gift-float">
            <Gift size={54} className="animate-pulse" />
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center font-bold text-xs shadow-md">
              🎀
            </div>
          </div>

          <h2 className="text-2xl font-bold font-heading text-white mb-2 group-hover:text-emerald-400 transition-colors">
            Tap to Open Your Secret Gift
          </h2>
          <p className="text-sm text-slate-300 mb-6 max-w-xs">
            Only you can see who you drew. Click to untie the ribbon and reveal your recipient!
          </p>

          <button 
            type="button"
            className="btn btn-primary text-base py-3 px-8 shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50"
          >
            <Sparkles size={18} />
            Unwrap My Match!
          </button>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-6">
            <Lock size={13} /> Encrypted client-side secret
          </div>
        </div>
      ) : (
        /* The Revealed Recipient Details Card */
        <div 
          className="glass-panel-elevated p-6 sm:p-8 w-full max-w-lg border border-white/20 animate-fade-in relative"
          style={{ background: 'rgba(15, 23, 42, 0.95)' }}
        >
          <div className="text-center pb-6 border-b border-white/10">
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">
              You are the Secret Santa for:
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-white mt-1 mb-2">
              {receiverName}
            </h2>

            <div className="flex items-center justify-center gap-3 text-xs text-slate-300 mt-2">
              <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                <DollarSign size={13} className="text-amber-400" /> Budget: {budget}
              </span>
              {exchangeDate && (
                <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                  <Calendar size={13} className="text-rose-400" /> {exchangeDate}
                </span>
              )}
            </div>
          </div>

          <div className="py-5 space-y-4">
            <ShopForMatch
              receiverName={receiverName}
              budget={budget}
              likes={likes}
              wishlist={wishlist}
              affiliate={payload?.affiliate}
            />

            {likes && (
              <div>
                <h3 className="text-xs uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1.5">
                  <Heart size={14} /> Likes & Hobbies
                </h3>
                <p className="text-sm text-slate-200 bg-slate-800/40 p-2.5 rounded-lg border border-white/5">
                  {likes}
                </p>
              </div>
            )}

            {dislikes && (
              <div>
                <h3 className="text-xs uppercase font-bold tracking-wider text-rose-400 flex items-center gap-1.5 mb-1.5">
                  <Ban size={14} /> Dislikes & Allergies
                </h3>
                <p className="text-sm text-slate-200 bg-rose-950/20 p-2.5 rounded-lg border border-rose-500/20 text-rose-200">
                  {dislikes}
                </p>
              </div>
            )}

            {rules && (
              <div className="text-xs text-slate-300 bg-white/5 p-3 rounded-lg border border-white/10">
                <strong className="text-white block mb-0.5">Event Guidelines:</strong>
                {rules}
              </div>
            )}

            {/* Private Notes & Checklist for Giver */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs uppercase font-bold tracking-wider text-slate-300 flex items-center gap-1.5">
                  <BookmarkCheck size={14} className="text-emerald-400" />
                  Your Private Gift Notes (Saved on your device)
                </label>
              </div>
              <textarea
                value={personalNotes}
                onChange={handleNoteChange}
                placeholder="e.g. Ordered candle from Etsy on Dec 12; wrap in festive green paper..."
                rows={2}
                className="glass-input w-full text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleTogglePurchased}
                className={`btn text-xs py-2 px-3.5 transition-colors ${
                  purchased ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                <CheckCircle2 size={15} />
                {purchased ? 'Gift Secured & Ready! ✓' : 'Mark as Purchased'}
              </button>

              <span className="text-xs text-slate-400">
                🤫 Keep it a secret!
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
