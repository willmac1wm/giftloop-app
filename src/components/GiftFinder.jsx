import React, { useMemo, useState } from 'react';
import { Check, ExternalLink, Plus, Search, X } from 'lucide-react';
import { AGE_BANDS, SHOP_FOR } from '../data/giftProfile';
import { budgetCeiling } from '../utils/shop';
import { generateStoreSearchUrl } from '../utils/affiliate';
import { FINDER_CATEGORIES, filterGifts } from '../utils/giftFinder';
import { sound } from '../utils/audio';

const PRICE_CAPS = [
  { id: '15', label: 'Under $15', max: 15 },
  { id: '25', label: 'Under $25', max: 25 },
  { id: '50', label: 'Under $50', max: 50 },
  { id: 'any', label: 'Any price', max: null },
];

function wishLines(wishes) {
  if (Array.isArray(wishes)) {
    return wishes.map((item) => (typeof item === 'object' && item ? (item.title || item.url || '') : String(item))).map((line) => line.trim()).filter(Boolean);
  }
  return String(wishes || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function defaultPriceId(budget) {
  const ceiling = budgetCeiling(budget);
  if (ceiling == null) return 'any';
  if (ceiling <= 15) return '15';
  if (ceiling <= 25) return '25';
  if (ceiling <= 50) return '50';
  return 'any';
}

export default function GiftFinder({
  people = [],
  activePersonId,
  onSelectPerson,
  personName,
  listTitle = '',
  ageBand = '',
  shopFor = '',
  wishes = '',
  hobbies = '',
  budget,
  affiliate,
  readOnly = false,
  onChange,
}) {
  const [query, setQuery] = useState('');
  const [priceId, setPriceId] = useState(() => defaultPriceId(budget));
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('featured');
  const [giftUrl, setGiftUrl] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const lines = wishLines(wishes);
  const price = PRICE_CAPS.find((item) => item.id === priceId) || PRICE_CAPS[3];
  const gifts = useMemo(
    () => filterGifts({ query, maxPrice: price.max, shopFor, ageBand, category, sort }),
    [query, price.max, shopFor, ageBand, category, sort],
  );

  const update = (fields) => {
    if (readOnly || !onChange) return;
    onChange(fields);
  };

  const addLine = (line) => {
    const next = line.trim();
    if (!next || lines.some((item) => item.toLowerCase() === next.toLowerCase())) return;
    sound.playClick();
    update({ wishes: [...lines, next].join('\n') });
  };

  const removeLine = (line) => {
    sound.playClick();
    update({ wishes: lines.filter((item) => item !== line).join('\n') });
  };

  const saveList = () => {
    sound.playClick();
    setSavedNote('Saved on this device. No account needed.');
    window.setTimeout(() => setSavedNote(''), 2200);
  };

  const copyList = async () => {
    const title = listTitle.trim() || `${personName}'s list`;
    const text = [title, ...lines, hobbies.trim() ? `Hobbies: ${hobbies.trim()}` : ''].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setSavedNote('List copied. Send it with their email or text.');
    } catch {
      setSavedNote(text);
    }
    window.setTimeout(() => setSavedNote(''), 2500);
  };

  return (
    <div className="gift-finder">
      <section className="gift-finder-results">
        <div className="gift-finder-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a gift"
            aria-label="Search for a gift"
            className="glass-input"
          />
        </div>
        <div className="gift-finder-filters">
          <label>
            Price
            <select value={priceId} onChange={(e) => setPriceId(e.target.value)} aria-label="Price">
              {PRICE_CAPS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label>
            Who
            <select
              value={shopFor}
              onChange={(e) => update({ shopFor: e.target.value })}
              aria-label="Who the gifts are for"
              disabled={readOnly}
            >
              <option value="">Anyone</option>
              {SHOP_FOR.filter((item) => item.id !== 'anyone').map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <label>
            Age
            <select
              value={ageBand}
              onChange={(e) => update({ ageBand: e.target.value })}
              aria-label="Age"
              disabled={readOnly}
            >
              <option value="">Any age</option>
              {AGE_BANDS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
              {FINDER_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
              <option value="featured">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </label>
        </div>
        {gifts.length === 0 ? (
          <p className="text-sm text-slate-400">No gifts match those filters. Clear a filter or search the stores below.</p>
        ) : (
          <ul className="gift-grid">
            {gifts.map((gift) => {
              const added = lines.some((line) => line.toLowerCase() === gift.name.toLowerCase());
              const href = generateStoreSearchUrl(gift.name, 'amazon', affiliate);
              return (
                <li key={gift.name} className="gift-card">
                  <div className="gift-card-price">{gift.price}</div>
                  <h3>{gift.name}</h3>
                  <p>{gift.desc}</p>
                  <div className="gift-card-actions">
                    {!readOnly && (
                      <button type="button" className="btn btn-primary text-xs" onClick={() => addLine(gift.name)} disabled={added}>
                        {added ? <Check size={14} /> : <Plus size={14} />}
                        {added ? 'On the list' : 'Add'}
                      </button>
                    )}
                    <a className="btn btn-secondary text-xs" href={href} target="_blank" rel="noopener noreferrer">
                      Amazon
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {query.trim() && (
          <div className="gift-finder-store-row">
            <span>Search stores for “{query.trim()}”</span>
            {['amazon', 'walmart', 'target', 'bestbuy', 'basspro'].map((store) => (
              <a key={store} href={generateStoreSearchUrl(query.trim(), store, affiliate)} target="_blank" rel="noopener noreferrer">
                {store}
              </a>
            ))}
          </div>
        )}
      </section>

      <aside className="wish-panel">
        {people.length > 1 && (
          <div className="wish-panel-people">
            {people.map((person) => (
              <button
                key={person.id}
                type="button"
                className={person.id === activePersonId ? 'is-active' : ''}
                onClick={() => onSelectPerson && onSelectPerson(person.id)}
              >
                {person.name}
              </button>
            ))}
          </div>
        )}
        <h2>{listTitle.trim() || `${personName}'s list`}</h2>
        {!readOnly && (
          <input
            value={listTitle}
            onChange={(e) => update({ listTitle: e.target.value })}
            placeholder="Name this list"
            aria-label="Wish list name"
            className="glass-input w-full text-sm"
          />
        )}
        <p className="text-xs text-slate-400">
          {readOnly
            ? 'Their wishes. Store links use Gift Loop referral tags.'
            : 'Add gifts from the finder, or paste a product link. This stays on this device.'}
        </p>
        {!readOnly && (
          <form
            className="wish-track"
            onSubmit={(e) => {
              e.preventDefault();
              addLine(giftUrl);
              setGiftUrl('');
            }}
          >
            <input
              value={giftUrl}
              onChange={(e) => setGiftUrl(e.target.value)}
              placeholder="Paste a product link"
              aria-label="Product link"
              className="glass-input w-full text-sm"
            />
            <button type="submit" className="btn btn-secondary text-xs">Add</button>
          </form>
        )}
        {lines.length === 0 ? (
          <p className="wish-empty">No gifts on this list yet.</p>
        ) : (
          <ul className="wish-lines">
            {lines.map((line) => (
              <li key={line}>
                <span>{line}</span>
                {!readOnly && (
                  <button type="button" onClick={() => removeLine(line)} aria-label={`Remove ${line}`}>
                    <X size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <label className="wish-hobbies">
          Hobbies and interests
          <textarea
            value={hobbies}
            onChange={(e) => update({ hobbies: e.target.value })}
            rows={3}
            disabled={readOnly}
            placeholder="Hiking, coffee, board games"
            aria-label="Hobbies and interests"
            className="glass-input w-full text-sm"
          />
        </label>
        {!readOnly && (
          <div className="wish-panel-actions">
            <button type="button" className="btn btn-primary text-sm" onClick={saveList}>Save</button>
            <button type="button" className="btn btn-secondary text-sm" onClick={copyList}>Copy list</button>
          </div>
        )}
        {savedNote && <p className="text-xs text-emerald-300">{savedNote}</p>}
      </aside>
    </div>
  );
}
