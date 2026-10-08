import React from 'react';
import { CENTER_STORES } from '../utils/affiliate';
import { openExternal } from '../native/shell';

export default function StoreConcourse({ activeId, onSelect, hrefFor, label = 'Shopping center' }) {
  return (
    <div className="store-concourse" role="list" aria-label={label}>
      {CENTER_STORES.map((store) => {
        const className = `store-door${activeId === store.id ? ' is-active' : ''}`;
        const inner = (
          <>
            <img src={store.photo} alt="" style={{ objectPosition: store.position || 'center' }} />
            <span>
              <strong>{store.name}</strong>
              <em>Affiliate</em>
            </span>
          </>
        );
        if (onSelect) {
          return (
            <button
              key={store.id}
              type="button"
              role="listitem"
              className={className}
              aria-pressed={activeId === store.id}
              onClick={() => onSelect(store.id)}
            >
              {inner}
            </button>
          );
        }
        return (
          <a
            key={store.id}
            role="listitem"
            className={className}
            href={hrefFor ? hrefFor(store.id) : undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              const href = hrefFor ? hrefFor(store.id) : "";
              if (!href) return;
              event.preventDefault();
              openExternal(href);
            }}
          >
            {inner}
          </a>
        );
      })}
    </div>
  );
}
