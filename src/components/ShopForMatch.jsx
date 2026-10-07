import React, { useState } from 'react';
import { ExternalLink, ShoppingBag } from 'lucide-react';
import { SUPPORTED_STORES, applyAffiliateTag, detectStore, generateStoreSearchUrl } from '../utils/affiliate';
import { ideasWithinBudget, shopQuery } from '../utils/shop';
import ShopDisclosure from './ShopDisclosure';

const STORE_CLASS = {
  amazon: 'bg-[#ff9900]/15 text-[#fbbf24] border-[#ff9900]/30',
  walmart: 'bg-[#0071dc]/15 text-[#60a5fa] border-[#0071dc]/30',
  basspro: 'bg-[#b91c1c]/15 text-[#f87171] border-[#b91c1c]/30',
  target: 'bg-[#cc0000]/15 text-[#fca5a5] border-[#cc0000]/30',
  bestbuy: 'bg-[#ffe000]/15 text-[#fde68a] border-[#ffe000]/30',
};

function storeLinks(query, config) {
  return SUPPORTED_STORES.map((store) => ({
    ...store,
    href: generateStoreSearchUrl(query, store.id, config),
  }));
}

function StoreButtons({ query, config }) {
  if (!query) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {storeLinks(query, config).map((store) => (
        <a
          key={store.id}
          href={store.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-semibold ${STORE_CLASS[store.id] || ''}`}
        >
          <span>{store.icon} {store.name}</span>
          <ExternalLink size={10} />
        </a>
      ))}
    </div>
  );
}

export default function ShopForMatch({
  receiverName,
  budget,
  likes,
  wishlist = [],
  ageBand,
  shopFor,
  listTitle,
  affiliate,
}) {
  const config = affiliate;
  const [query, setQuery] = useState(() => shopQuery({
    receiverName, likes, wishlist, budget, ageBand, shopFor,
  }));
  const ideas = ideasWithinBudget(budget);

  return (
    <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-bold font-heading text-white flex items-center gap-1.5">
          <ShoppingBag size={16} className="text-amber-400" />
          Shop for {receiverName}
        </h3>
        <p className="text-xs text-slate-300 mt-1">
          {listTitle ? `${listTitle}. ` : ''}
          {budget ? `Stay near the ${budget} budget.` : 'Search a store, or open a wish.'}
        </p>
        <ShopDisclosure />
      </div>

      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block" htmlFor="shop-query">
        Search gifts
      </label>
      <input
        id="shop-query"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="glass-input w-full text-sm"
        placeholder="Candles, wool socks, board game..."
      />
      <StoreButtons query={query.trim()} config={config} />

      {wishlist.length > 0 && (
        <ul className="space-y-2">
          {wishlist.map((item, index) => {
            const isObj = typeof item === 'object' && item !== null;
            const title = isObj ? item.title : item;
            const directUrl = isObj ? item.url : (typeof item === 'string' && item.startsWith('http') ? item : null);
            const taggedDirectUrl = directUrl ? applyAffiliateTag(directUrl, config) : null;
            const storeId = directUrl ? detectStore(directUrl) : null;
            const storeName = SUPPORTED_STORES.find((store) => store.id === storeId)?.name;
            return (
              <li key={`${title}-${index}`} className="bg-slate-900/50 border border-white/10 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-white">{title}</span>
                  {taggedDirectUrl && (
                    <a href={taggedDirectUrl} target="_blank" rel="noopener noreferrer" className="btn btn-gold text-[11px] py-1 px-2 shrink-0">
                      Buy{storeName ? ` on ${storeName}` : ''}
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                {!String(title).startsWith('http') && <StoreButtons query={String(title)} config={config} />}
              </li>
            );
          })}
        </ul>
      )}

      {ideas.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Ideas in budget
          </div>
          <ul className="space-y-2">
            {ideas.map((idea) => (
              <li key={idea.name} className="bg-slate-900/40 border border-white/5 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-white">{idea.name}</div>
                    <div className="text-xs text-slate-400">{idea.desc}</div>
                  </div>
                  <span className="badge badge-gold shrink-0">{idea.price}</span>
                </div>
                <StoreButtons query={idea.name} config={config} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
