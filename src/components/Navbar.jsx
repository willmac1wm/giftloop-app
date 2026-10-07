import React from 'react';
import { Gift, Volume2, VolumeX, Snowflake, RotateCcw, Smartphone, Tag, KeyRound, Shield, List } from 'lucide-react';
import { sound } from '../utils/audio';

export default function Navbar({
  soundEnabled,
  setSoundEnabled,
  snowEnabled,
  setSnowEnabled,
  onResetDemoData,
  onOpenInstallModal,
  onOpenAffiliateModal,
  user,
  area,
  onOpenAccount,
  onOpenAdmin,
  onOpenWishlist,
  onOpenExchange,
}) {
  const toggleSound = () => {
    const next = !soundEnabled;
    sound.enabled = next;
    setSoundEnabled(next);
    if (next) sound.playClick();
  };

  return (
    <header className="glass-panel border-x-0 border-t-0 rounded-none sticky top-0 z-40 px-4 sm:px-8 py-3.5 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/25">
            <Gift size={22} className="animate-gift-float" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl font-heading tracking-tight text-white">
                GiftLoop
              </span>
              <span className="badge badge-emerald text-[9px] py-0.5 px-1.5">Secret Santa</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Draw names, then email or text the links
            </p>
          </div>
        </div>

        {/* Utility Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className={`p-2 rounded-lg border transition-colors ${
              soundEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-white/5 text-slate-500 border-white/5'
            }`}
            title={soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <button
            onClick={() => setSnowEnabled(!snowEnabled)}
            className={`p-2 rounded-lg border transition-colors ${
              snowEnabled
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                : 'bg-white/5 text-slate-500 border-white/5'
            }`}
            title={snowEnabled ? 'Disable Snowfall' : 'Enable Snowfall'}
          >
            <Snowflake size={16} />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onOpenExchange();
            }}
            className={`btn btn-secondary text-xs py-2 px-2.5 ${area === 'exchange' ? 'text-white' : ''}`}
            title="Quick draw on this device. A reveal link from this draw can be opened by anyone who receives it."
          >
            <Gift size={13} />
            <span className="hidden md:inline">Quick draw</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onOpenAdmin();
            }}
            className={`btn btn-secondary text-xs py-2 px-2.5 ${area === 'admin' ? 'text-amber-300' : ''}`}
            title="Organizer admin"
          >
            <Shield size={13} />
            <span className="hidden md:inline">Admin</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onOpenWishlist();
            }}
            className={`btn btn-secondary text-xs py-2 px-2.5 ${area === 'wishlist' ? 'text-rose-300' : ''}`}
            title="Your wish list"
          >
            <List size={13} />
            <span className="hidden md:inline">My list</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onOpenAccount();
            }}
            className={`btn btn-secondary text-xs py-2 px-2.5 ${area === 'account' ? 'text-sky-300' : ''}`}
            title={user?.email || 'Sign in'}
          >
            <KeyRound size={13} />
            <span className="hidden lg:inline">{user?.email ? 'Account' : 'Sign in'}</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onOpenAffiliateModal && onOpenAffiliateModal();
            }}
            className="btn btn-secondary text-xs py-2 px-2.5 text-amber-400 hover:text-white"
            title="Paste Amazon, Walmart, Target, Bass Pro, Cabela's, and Best Buy affiliate codes"
          >
            <Tag size={13} />
            <span className="hidden md:inline">Affiliate Tags</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onOpenInstallModal && onOpenInstallModal();
            }}
            className="btn btn-secondary text-xs py-2 px-2.5 text-sky-400 hover:text-white"
            title="Install on iPhone / iOS"
          >
            <Smartphone size={13} />
            <span className="hidden md:inline">iPhone App</span>
          </button>

          <button
            onClick={onResetDemoData}
            className="btn btn-secondary text-xs py-2 px-2.5"
            title="Reset to sample party data"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>
        </div>
      </div>
    </header>
  );
}
