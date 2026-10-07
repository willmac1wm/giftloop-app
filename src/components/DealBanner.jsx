import React from 'react';
import { ExternalLink, Tag } from 'lucide-react';
import { getStoredAffiliateConfig } from '../utils/affiliate';
import { dealLinks } from '../utils/deals';
import StoreConcourse from './StoreConcourse';
import ShopDisclosure from './ShopDisclosure';

export default function DealBanner({ affiliate }) {
  const config = affiliate || (typeof localStorage === 'undefined' ? undefined : getStoredAffiliateConfig());
  const deals = dealLinks(config);
  const amazon = deals.stores[0];

  return (
    <aside className="deal-banner" aria-label="Store deals">
      <div className="deal-banner-copy">
        <div className="deal-banner-title">
          <Tag size={16} />
          {deals.title}
        </div>
        <p>{deals.lede}</p>
      </div>
      <ShopDisclosure />
      <a className="btn btn-gold text-sm shrink-0" href={amazon.href} target="_blank" rel="noopener noreferrer">
        Explore the deals
        <ExternalLink size={14} />
      </a>
      <StoreConcourse
        hrefFor={(storeId) => deals.stores.find((store) => store.id === storeId)?.href}
        label="Stores"
      />
    </aside>
  );
}
