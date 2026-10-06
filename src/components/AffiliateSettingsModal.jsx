import React, { useState } from 'react';
import { X, Tag, DollarSign, Check, ExternalLink, Sparkles, ShoppingBag, ShieldCheck } from 'lucide-react';
import { SUPPORTED_STORES, getStoredAffiliateConfig, saveStoredAffiliateConfig, applyAffiliateTag, detectStore } from '../utils/affiliate';
import { sound } from '../utils/audio';

export default function AffiliateSettingsModal({ isOpen, onClose, onConfigSaved }) {
  const [config, setConfig] = useState(() => getStoredAffiliateConfig());
  const [testUrl, setTestUrl] = useState('https://www.amazon.com/dp/B08N5WRWNW');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    sound.playClick();
    saveStoredAffiliateConfig(config);
    if (onConfigSaved) onConfigSaved(config);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 900);
  };

  const detectedStoreId = detectStore(testUrl);
  const testTaggedUrl = applyAffiliateTag(testUrl, config);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="glass-panel-elevated w-full max-w-xl p-6 relative border border-white/20 flex flex-col max-h-[92vh] overflow-y-auto"
        style={{ background: 'rgba(15, 23, 42, 0.96)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-md">
            <Tag size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold font-heading text-white">
                Store Links & Affiliate Monetization
              </h3>
              <span className="badge badge-gold text-[10px]">Earn Revenue</span>
            </div>
            <p className="text-xs text-slate-400">
              Auto-append your affiliate partner tags to Amazon, Walmart, Bass Pro Shops, and Target links.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Global Toggle */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <DollarSign size={18} className="text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-white">Enable Affiliate Auto-Tagging</p>
                <p className="text-[11px] text-slate-400">
                  Automatically attaches your tags when guests click wishlist items or curated gift ideas.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>

          {/* Store IDs Configuration */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShoppingBag size={14} /> Partner Affiliate IDs
            </div>

            {/* Amazon Associates */}
            <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <span>📦 Amazon Associate Tag</span>
                  <span className="text-[10px] text-amber-400 font-mono">(tag=...)</span>
                </label>
                <a
                  href="https://affiliate-program.amazon.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-0.5"
                >
                  Amazon Portal <ExternalLink size={11} />
                </a>
              </div>
              <input
                type="text"
                value={config.amazonTag}
                onChange={(e) => setConfig({ ...config, amazonTag: e.target.value.trim() })}
                placeholder="e.g. giftloop-20"
                className="glass-input w-full text-xs font-mono"
              />
            </div>

            {/* Walmart */}
            <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <span>🛒 Walmart Impact / Publisher ID</span>
                  <span className="text-[10px] text-sky-400 font-mono">(wmlspartner=...)</span>
                </label>
                <a
                  href="https://affiliates.walmart.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-0.5"
                >
                  Walmart Portal <ExternalLink size={11} />
                </a>
              </div>
              <input
                type="text"
                value={config.walmartPublisherId}
                onChange={(e) => setConfig({ ...config, walmartPublisherId: e.target.value.trim() })}
                placeholder="e.g. your_impact_partner_id"
                className="glass-input w-full text-xs font-mono"
              />
            </div>

            {/* Bass Pro Shops & Cabela's */}
            <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <span>🎣 Bass Pro Shops & Cabela's Partner ID</span>
                  <span className="text-[10px] text-rose-400 font-mono">(affCode=...)</span>
                </label>
                <a
                  href="https://www.basspro.com/shop/en/affiliate-program"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-0.5"
                >
                  Bass Pro Portal <ExternalLink size={11} />
                </a>
              </div>
              <input
                type="text"
                value={config.bassProPartnerId}
                onChange={(e) => setConfig({ ...config, bassProPartnerId: e.target.value.trim() })}
                placeholder="e.g. your_basspro_partner_code"
                className="glass-input w-full text-xs font-mono"
              />
            </div>

            {/* Target */}
            <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <span>🎯 Target Affiliate ID</span>
                  <span className="text-[10px] text-red-400 font-mono">(afid=...)</span>
                </label>
                <a
                  href="https://partners.target.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-0.5"
                >
                  Target Portal <ExternalLink size={11} />
                </a>
              </div>
              <input
                type="text"
                value={config.targetPartnerId}
                onChange={(e) => setConfig({ ...config, targetPartnerId: e.target.value.trim() })}
                placeholder="e.g. target_impact_id"
                className="glass-input w-full text-xs font-mono"
              />
            </div>
          </div>

          {/* Interactive Live URL Test Tool */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Live URL Tagging Previewer
              </span>
              {detectedStoreId && detectedStoreId !== 'other' && (
                <span className="badge badge-emerald text-[10px]">
                  Detected: {detectedStoreId.toUpperCase()}
                </span>
              )}
            </div>

            <input
              type="url"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="Paste any Amazon, Walmart, or Bass Pro URL to test..."
              className="glass-input w-full text-xs"
            />

            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
              <span className="text-[10px] text-slate-400 block mb-0.5">Final Affiliate URL:</span>
              <p className="text-xs font-mono text-emerald-300 break-all">
                {testTaggedUrl}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary text-xs py-2 px-3.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-gold text-xs py-2 px-4 shadow-lg shadow-amber-500/20"
            >
              {saveSuccess ? <Check size={14} /> : <Tag size={14} />}
              {saveSuccess ? 'Saved & Applied!' : 'Save Affiliate Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
