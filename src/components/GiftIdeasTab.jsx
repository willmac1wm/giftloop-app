import React, { useState } from 'react';
import { Search, Lightbulb, Copy, Check, ExternalLink, Sparkles } from 'lucide-react';
import { curatedGiftIdeas } from '../data/mockData';
import { sound } from '../utils/audio';
import { generateStoreSearchUrl } from '../utils/affiliate';

export default function GiftIdeasTab({ onAddIdeaToWishlist }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedName, setCopiedName] = useState(null);

  const handleCopyIdea = (name) => {
    sound.playClick();
    navigator.clipboard.writeText(name);
    setCopiedName(name);
    setTimeout(() => setCopiedName(null), 2000);
  };

  const filteredCategories = curatedGiftIdeas.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.desc.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="badge badge-emerald mb-1">
            <Lightbulb size={12} /> Gift Inspiration Engine
          </span>
          <h2 className="text-2xl font-bold font-heading text-white">
            Curated Gift Ideas & White Elephant Hits
          </h2>
          <p className="text-xs text-slate-300">
            Hand-picked crowd-pleasers under $50 for Secret Santa wishlists and Yankee Swaps.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ideas, gadgets..."
            className="glass-input pl-9 w-full text-xs"
          />
        </div>
      </div>

      <div className="space-y-6">
        {filteredCategories.map((cat, idx) => (
          <div key={idx} className="space-y-3">
            <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              {cat.category}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cat.items.map((item, i) => {
                const isCopied = copiedName === item.name;
                return (
                  <div
                    key={i}
                    className="glass-panel p-4 border border-white/5 hover:border-white/20 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="font-semibold text-white text-sm">
                          {item.name}
                        </h4>
                        <span className="badge badge-gold font-mono shrink-0">
                          {item.price}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">
                        {item.desc}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => handleCopyIdea(item.name)}
                          className="btn btn-secondary text-xs py-1 px-2.5"
                        >
                          {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          {isCopied ? 'Copied' : 'Copy Name'}
                        </button>

                        <span className="text-[10px] text-slate-400 font-mono">Affiliate Tagged</span>
                      </div>

                      {/* Store Affiliate Links */}
                      <div className="grid grid-cols-3 gap-1 pt-1 text-[11px]">
                        <a
                          href={generateStoreSearchUrl(item.name, 'amazon')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1 px-1.5 rounded bg-[#ff9900]/15 text-[#fbbf24] hover:bg-[#ff9900]/25 border border-[#ff9900]/30 transition-colors text-center font-medium truncate flex items-center justify-center gap-1"
                          title="Buy on Amazon"
                        >
                          <span>📦 Amazon</span>
                          <ExternalLink size={9} />
                        </a>

                        <a
                          href={generateStoreSearchUrl(item.name, 'walmart')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1 px-1.5 rounded bg-[#0071dc]/15 text-[#60a5fa] hover:bg-[#0071dc]/25 border border-[#0071dc]/30 transition-colors text-center font-medium truncate flex items-center justify-center gap-1"
                          title="Buy on Walmart"
                        >
                          <span>🛒 Walmart</span>
                          <ExternalLink size={9} />
                        </a>

                        <a
                          href={generateStoreSearchUrl(item.name, 'basspro')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1 px-1.5 rounded bg-[#b91c1c]/15 text-[#f87171] hover:bg-[#b91c1c]/25 border border-[#b91c1c]/30 transition-colors text-center font-medium truncate flex items-center justify-center gap-1"
                          title="Buy on Bass Pro Shops"
                        >
                          <span>🎣 Bass Pro</span>
                          <ExternalLink size={9} />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="glass-panel p-8 text-center text-slate-400 text-sm">
            No matching gift ideas found for "{searchTerm}".
          </div>
        )}
      </div>
    </div>
  );
}
