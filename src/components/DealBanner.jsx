import React from 'react';
import { ExternalLink, Tag } from 'lucide-react';
import { getStoredAffiliateConfig, usesSampleAffiliateCodes } from '../utils/affiliate';
import { dealLinks } from '../utils/deals';
import StoreConcourse from './StoreConcourse';

export default function DealBanner({ affiliate }) {
  const fromThisDevice = !affiliate;
  const config = affiliate || (typeof localStorage === 'undefined' ? undefined : getStoredAffiliateConfig());
  const deals = dealLinks(config);
  const amazon = deals.stores[0];
  const sampleCodes = fromThisDevice && usesSampleAffiliateCodes(config);

  return (
    <aside className="deal-banner" aria-label="Store deals">
      <div className="deal-banner-copy">
        <div className="deal-banner-title">
          <Tag size={16} />
          {deals.title}
        </div>
        <p>{deals.lede}</p>
        {sampleCodes && (
          <p className="deal-banner-note">
            Sample Gift Loop codes are in these links. Open Affiliate Tags and paste your own.
          </p>
        )}
      </div>
      <a className="btn btn-gold text-sm shrink-0" href={amazon.href} target="_blank" rel="noopener noreferrer">
        Explore the deals
        <ExternalLink size={14} />
      </a>
      <StoreConcourse
        hrefFor={(storeId) => deals.stores.find((store) => store.id === storeId)?.href}
        label="Affiliate stores"
      />
    </aside>
  );
}
