import React, { useState } from 'react';
import { X, Tag, DollarSign, Check, ExternalLink, ShoppingBag } from 'lucide-react';
import {
  getStoredAffiliateConfig,
  saveStoredAffiliateConfig,
  applyAffiliateTag,
  detectStore,
  generateStoreSearchUrl,
  readAffiliateValue,
} from '../utils/affiliate';
import { sound } from '../utils/audio';

const PARTNER_FIELDS = [
  {
    key: 'amazonTag',
    storeId: 'amazon',
    label: 'Amazon Associate tag',
    param: 'tag',
    portal: 'https://affiliate-program.amazon.com/',
    portalLabel: 'Amazon Portal',
    placeholder: 'mytag-20 or a full Amazon link',
  },
  {
    key: 'walmartPublisherId',
    storeId: 'walmart',
    label: 'Walmart publisher id',
    param: 'wmlspartner',
    portal: 'https://affiliates.walmart.com/',
    portalLabel: 'Walmart Portal',
    placeholder: 'publisher id or a full Walmart link',
  },
  {
    key: 'bassProPartnerId',
    storeId: 'basspro',
    also: 'cabelas',
    label: "Bass Pro Shops & Cabela's partner id",
    param: 'affCode',
    portal: 'https://www.basspro.com/shop/en/affiliate-program',
    portalLabel: 'Bass Pro Portal',
    placeholder: "partner id or a Bass Pro / Cabela's link",
    hint: "One code opens both Bass Pro Shops and Cabela's.",
  },
  {
    key: 'targetPartnerId',
    storeId: 'target',
    label: 'Target affiliate id',
    param: 'afid',
    portal: 'https://partners.target.com/',
    portalLabel: 'Target Portal',
    placeholder: 'affiliate id or a full Target link',
  },
  {
    key: 'bestBuyPartnerId',
    storeId: 'bestbuy',
    label: 'Best Buy partner id',
    param: 'irclickid',
    portal: 'https://app.impact.com/',
    portalLabel: 'Impact Portal',
    placeholder: 'partner id or a full Best Buy link',
  },
];

function missingNote(field) {
  return `That link has no ${field.param} code. Paste the code itself, or a link that includes ${field.param}=.`;
}

export default function AffiliateSettingsModal({ isOpen, onClose, onConfigSaved }) {
  const [config, setConfig] = useState(() => getStoredAffiliateConfig());
  const [notes, setNotes] = useState({});
  const [testUrl, setTestUrl] = useState('https://www.amazon.com/dp/B08N5WRWNW');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const writeField = (field, raw, { blur = false } = {}) => {
    const result = readAffiliateValue(field.storeId, raw);
    if (result.status === 'missing' && !blur) {
      setConfig((current) => ({ ...current, [field.key]: raw }));
      return;
    }
    setConfig((current) => ({ ...current, [field.key]: result.value }));
    setNotes((current) => ({
      ...current,
      [field.key]: result.status === 'missing' ? missingNote(field) : '',
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    const next = { ...config };
    const nextNotes = {};
    let blocked = false;
    for (const field of PARTNER_FIELDS) {
      const result = readAffiliateValue(field.storeId, config[field.key]);
      if (result.status === 'missing') {
        blocked = true;
        nextNotes[field.key] = missingNote(field);
      } else {
        next[field.key] = result.value;
        nextNotes[field.key] = '';
      }
    }
    setNotes(nextNotes);
    if (blocked) return;

    sound.playClick();
    setConfig(next);
    saveStoredAffiliateConfig(next);
    if (onConfigSaved) onConfigSaved(next);
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
        role="dialog"
        aria-labelledby="affiliate-settings-title"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
          aria-label="Close affiliate tags"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-4 pr-8">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-md">
            <Tag size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 id="affiliate-settings-title" className="text-xl font-bold font-heading text-white">
                Affiliate Tags
              </h3>
              <span className="badge badge-gold text-[10px]">Your codes</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Paste a partner code, or a full affiliate link, for Amazon, Walmart, Target, Bass Pro Shops, Cabela's, and Best Buy. Secret Gifter pulls the code out of the link. Codes stay on this device and are copied into reveal links the next time you share them.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <DollarSign size={18} className="text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-white">Use these codes on store links</p>
                <p className="text-[11px] text-slate-400">
                  Store doors, deal links, and Shop at this store all carry the code saved here.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
                aria-label="Use affiliate codes on store links"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShoppingBag size={14} /> Partner codes
            </div>

            {PARTNER_FIELDS.map((field) => (
              <div key={field.key} className="p-3 rounded-xl bg-slate-800/40 border border-white/5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-white" htmlFor={`affiliate-${field.key}`}>
                    {field.label}{' '}
                    <span className="text-[10px] text-amber-400 font-mono">({field.param}=…)</span>
                  </label>
                  <a
                    href={field.portal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-0.5 shrink-0"
                  >
                    {field.portalLabel} <ExternalLink size={11} />
                  </a>
                </div>
                {field.hint && <p className="text-[11px] text-slate-400">{field.hint}</p>}
                <input
                  id={`affiliate-${field.key}`}
                  type="text"
                  value={config[field.key] || ''}
                  onChange={(e) => writeField(field, e.target.value)}
                  onBlur={(e) => writeField(field, e.target.value, { blur: true })}
                  placeholder={field.placeholder}
                  aria-label={field.label}
                  className="glass-input w-full text-xs font-mono"
                />
                {notes[field.key] && (
                  <p className="text-[11px] text-rose-300" role="alert">{notes[field.key]}</p>
                )}
                <p className="text-[10px] font-mono text-emerald-300/90 break-all">
                  {generateStoreSearchUrl('gift', field.storeId, config)}
                </p>
                {field.also && (
                  <p className="text-[10px] font-mono text-emerald-300/90 break-all">
                    {generateStoreSearchUrl('gift', field.also, config)}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Try a product link
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
              placeholder="Paste a product link to see it tagged"
              aria-label="Product link to tag"
              className="glass-input w-full text-xs"
            />

            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
              <span className="text-[10px] text-slate-400 block mb-0.5">Tagged link</span>
              <p className="text-xs font-mono text-emerald-300 break-all">
                {testTaggedUrl}
              </p>
            </div>
          </div>

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
              {saveSuccess ? 'Saved' : 'Save codes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
