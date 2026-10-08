import React from 'react';
import { getStoredAffiliateConfig } from '../utils/affiliate';
import { dealLinks } from '../utils/deals';
import StoreConcourse from './StoreConcourse';

export default function DealBanner({ affiliate }) {
  const config = affiliate || (typeof localStorage === 'undefined' ? undefined : getStoredAffiliateConfig());
  const deals = dealLinks(config);
  const amazon = deals.stores[0];

  return (
    <aside className="deal-banner" aria-label="Store deals">
      <p className="deal-disclosure">
        Store links can include a referral code. Sample codes are not an approved affiliate account.
      </p>
      {deals.live && (
        <p className="deal-sale-line">
          Prime Big Deal Days through October 7.{' '}
          <a href={amazon.href} target="_blank" rel="noopener noreferrer">Amazon sale</a>
        </p>
      )}
      <StoreConcourse
        hrefFor={(storeId) => deals.stores.find((store) => store.id === storeId)?.href}
        label="Stores"
      />
    </aside>
  );
}
