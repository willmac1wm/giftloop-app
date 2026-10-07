import React, { useState } from "react";
import { Store } from "lucide-react";
import { api } from "../account/api";

function Gate({ onNeedAccount }) {
  return (
    <section className="glass-panel p-6 max-w-xl mx-auto text-center">
      <Store className="mx-auto text-amber-300 mb-3" />
      <h2 className="text-xl font-bold text-white">Merchants</h2>
      <p className="text-sm text-slate-300 mt-2">Administrators manage which stores can receive an affiliate parameter. Partner codes stay out of this form.</p>
      <button type="button" className="btn btn-gold text-sm mt-4" onClick={onNeedAccount}>Sign in</button>
    </section>
  );
}

export default function MerchantScreen({ user, onNeedAccount, onOpenAffiliate }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({ id: "", name: "", domains: "", affiliateParam: "", configKey: "", countries: "", enabled: true });

  if (!user) return <Gate onNeedAccount={onNeedAccount} />;

  const load = () => {
    api("/api/admin/merchants")
      .then((data) => setRows(data.merchants || []))
      .catch((err) => setError(err.message));
  };

  return (
    <section className="glass-panel p-5 max-w-2xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-white">Platform merchants</h2>
      <p className="text-xs text-slate-400">Domains decide which links can be tagged. The affiliate value itself is not stored here. This is separate from Manage exchange. Affiliate tags are an administrator control.</p>
      {onOpenAffiliate && (
        <button type="button" className="btn btn-secondary text-xs" onClick={onOpenAffiliate}>Affiliate tags</button>
      )}
      {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
      <button type="button" className="btn btn-secondary text-xs" onClick={load}>Load merchant rules</button>
      <ul className="text-sm text-slate-200 space-y-2">
        {rows.map((row) => (
          <li key={row.id}>
            <strong>{row.name}</strong> · {row.enabled ? "tagging on" : "ordinary links"} · {Array.isArray(row.domains) ? row.domains.join(", ") : row.domains}
            {row.countries ? ` · ${row.countries}` : ""}
          </li>
        ))}
      </ul>
      <form
        className="grid sm:grid-cols-2 gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          api("/api/admin/merchants", { method: "POST", json: draft })
            .then((data) => setRows(data.merchants || []))
            .catch((err) => setError(err.message));
        }}
      >
        <input className="glass-input" aria-label="Merchant id" placeholder="id" value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} required />
        <input className="glass-input" aria-label="Merchant name" placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
        <input className="glass-input sm:col-span-2" aria-label="Domains" placeholder="example.com, example.co.uk" value={draft.domains} onChange={(e) => setDraft({ ...draft, domains: e.target.value })} required />
        <input className="glass-input" aria-label="Affiliate parameter" placeholder="tag" value={draft.affiliateParam} onChange={(e) => setDraft({ ...draft, affiliateParam: e.target.value })} />
        <input className="glass-input" aria-label="Config key" placeholder="amazonTag" value={draft.configKey} onChange={(e) => setDraft({ ...draft, configKey: e.target.value })} />
        <input className="glass-input" aria-label="Countries" placeholder="US,UK" value={draft.countries} onChange={(e) => setDraft({ ...draft, countries: e.target.value })} />
        <label className="text-sm text-slate-200 flex items-center gap-2">
          <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
          Apply affiliate parameter
        </label>
        <button className="btn btn-gold text-xs" type="submit">Save merchant</button>
      </form>
    </section>
  );
}
