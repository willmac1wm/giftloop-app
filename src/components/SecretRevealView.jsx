import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Gift, Sparkles, CheckCircle2, Lock, Calendar, DollarSign, Heart, Ban, ArrowLeft, BookmarkCheck, ExternalLink, ShoppingBag } from 'lucide-react';
import { sound } from '../utils/audio';
import { applyAffiliateTag, generateStoreSearchUrl, detectStore } from '../utils/affiliate';

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

  const noteKey = useMemo(
    () => `giftloop_note_${encodeURIComponent(giverName)}_${encodeURIComponent(receiverName)}`,
    [giverName, receiverName],
  );
  const purchasedKey = useMemo(
    () => `giftloop_purchased_${encodeURIComponent(giverName)}_${encodeURIComponent(receiverName)}`,
    [giverName, receiverName],
  );
  const wishlistItems = useMemo(() => (Array.isArray(wishlist) ? wishlist : []), [wishlist]);

  useEffect(() => {
    if (giverName && receiverName) {
      const savedNote = localStorage.getItem(noteKey);
      if (savedNote) setPersonalNotes(savedNote);
      const savedPurchased = localStorage.getItem(purchasedKey);
      if (savedPurchased === 'true') setPurchased(true);
    }
  }, [giverName, receiverName, noteKey, purchasedKey]);

  const handleNoteChange = (e) => {
    const nextNote = e.target.value;
    setPersonalNotes(nextNote);
    localStorage.setItem(noteKey, nextNote);
  };

  const handleTogglePurchased = () => {
    sound.playClick();
    const nextVal = !purchased;
    setPurchased(nextVal);
    localStorage.setItem(purchasedKey, String(nextVal));
  };

  const handleUnwrap = () => {
    if (unwrapped) return;
    sound.playUnwrap();
    setUnwrapped(true);

    confetti({
      particleCount: 80,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#10b981', '#f43f5e', '#fbbf24', '#ffffff', '#38bdf8'],
    });

    setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: 60,
        spread: 60,
        origin: { x: 0 },
        colors: ['#10b981', '#fbbf24'],
      });
      confetti({
        particleCount: 40,
        angle: 120,
        spread: 60,
        origin: { x: 1 },
        colors: ['#f43f5e', '#ffffff'],
      });
    }, 350);
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
        <div
          onClick={handleUnwrap}
          className="cursor-pointer group glass-panel-elevated p-8 sm:p-12 w-full max-w-md flex flex-col items-center text-center relative overflow-hidden transition-all duration-300 hover:scale-[1.01]"
          style={{
            background: 'linear-gradient(180deg, rgba(16, 26, 45, 0.95) 0%, rgba(10, 18, 32, 0.98) 100%)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(16, 185, 129, 0.25)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-rose-500/10 to-amber-500/10 pointer-events-none" />

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
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Gift size={14} /> Wishlist Ideas & Store Links
                </h3>
                <span className="text-[10px] text-slate-400">1-Click Affiliate Matching</span>
              </div>

              {wishlistItems.length > 0 ? (
                <ul className="space-y-2.5">
                  {wishlistItems.map((item, idx) => {
                    const isObj = typeof item === 'object' && item !== null;
                    const title = isObj ? item.title : item;
                    const directUrl = isObj ? item.url : (typeof item === 'string' && item.startsWith('http') ? item : null);
                    const taggedDirectUrl = directUrl ? applyAffiliateTag(directUrl) : null;
                    const storeId = directUrl ? detectStore(directUrl) : null;

                    return (
                      <li
                        key={`${title}-${idx}`}
                        className="text-sm text-slate-200 bg-slate-800/60 p-3 rounded-xl border border-white/5 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <span className="font-semibold text-white">{title}</span>
                          </div>

                          {taggedDirectUrl && (
                            <a
                              href={taggedDirectUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-gold text-[11px] py-1 px-2.5 shrink-0"
                            >
                              <span>Buy on {storeId === 'basspro' ? 'Bass Pro' : (storeId ? storeId.toUpperCase() : 'Store')}</span>
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5 text-[11px]">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mr-1">
                            <ShoppingBag size={11} /> Find & Buy:
                          </span>

                          <a
                            href={generateStoreSearchUrl(title, 'amazon')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ff9900]/15 text-[#fbbf24] hover:bg-[#ff9900]/25 border border-[#ff9900]/30 transition-colors"
                          >
                            <span>📦 Amazon</span>
                            <ExternalLink size={10} />
                          </a>

                          <a
                            href={generateStoreSearchUrl(title, 'walmart')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0071dc]/15 text-[#60a5fa] hover:bg-[#0071dc]/25 border border-[#0071dc]/30 transition-colors"
                          >
                            <span>🛒 Walmart</span>
                            <ExternalLink size={10} />
                          </a>

                          <a
                            href={generateStoreSearchUrl(title, 'basspro')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#b91c1c]/15 text-[#f87171] hover:bg-[#b91c1c]/25 border border-[#b91c1c]/30 transition-colors"
                          >
                            <span>🎣 Bass Pro</span>
                            <ExternalLink size={10} />
                          </a>

                          <a
                            href={generateStoreSearchUrl(title, 'target')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#cc0000]/15 text-[#fca5a5] hover:bg-[#cc0000]/25 border border-[#cc0000]/30 transition-colors"
                          >
                            <span>🎯 Target</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-xs text-slate-400 italic bg-white/5 p-3 rounded-lg">
                  No specific wishlist items added yet. Check likes and hobbies below!
                </div>
              )}
            </div>

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
