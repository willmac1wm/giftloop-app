import React from 'react';
import { X, Smartphone, Share, PlusSquare, Sparkles } from 'lucide-react';
import { sound } from '../utils/audio';

export default function IosInstallModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="glass-panel-elevated w-full max-w-sm p-6 relative border border-white/20 text-center flex flex-col items-center"
        style={{ background: 'rgba(15, 23, 42, 0.96)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
        >
          <X size={20} />
        </button>

        {/* App Icon preview */}
        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-2xl mb-4 border-2 border-white/20">
          <img src="/apple-touch-icon.png" alt="GiftLoop iOS Icon" className="w-full h-full object-cover" />
        </div>

        <h3 className="text-xl font-bold font-heading text-white mb-1">
          Install on Your iPhone
        </h3>
        <p className="text-xs text-slate-300 mb-5">
          Run GiftLoop as a standalone iOS app without Safari toolbars.
        </p>

        {/* 3 Step Guide */}
        <div className="w-full text-left space-y-3.5 mb-6 bg-slate-900/60 p-4 rounded-xl border border-white/10 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
              1
            </div>
            <div>
              <p className="text-white font-semibold">Open in Safari & Tap Share</p>
              <p className="text-slate-400 mt-0.5">
                Tap the <Share size={12} className="inline text-sky-400 mx-0.5" /> <strong>Share</strong> button at the bottom of Safari.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
              2
            </div>
            <div>
              <p className="text-white font-semibold">Select "Add to Home Screen"</p>
              <p className="text-slate-400 mt-0.5">
                Scroll down the action sheet and tap <PlusSquare size={12} className="inline text-amber-400 mx-0.5" /> <strong>Add to Home Screen</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
              3
            </div>
            <div>
              <p className="text-white font-semibold">Tap "Add"</p>
              <p className="text-slate-400 mt-0.5">
                Confirm by tapping <strong>Add</strong> in the top right. GiftLoop will appear right on your iPhone home screen!
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="btn btn-primary w-full text-xs py-2.5"
        >
          Got It!
        </button>
      </div>
    </div>
  );
}
