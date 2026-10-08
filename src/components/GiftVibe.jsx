import React, { useEffect, useState } from "react";
import { api } from "../account/api";
import { EMPTY_VIBE, GIFT_APPROACHES } from "../retention/model";

export function GiftVibeCard({ vibe }) {
  if (!vibe) return null;
  return <div className="rounded-xl border border-white/10 p-3 space-y-1">
    <h3 className="font-semibold text-white">Gift vibe</h3>
    <p>{GIFT_APPROACHES[vibe.approach]}</p>
    {vibe.interests && <p>{vibe.interests}</p>}
    {vibe.avoid && <p>Please avoid: {vibe.avoid}</p>}
    <p className="text-sm text-slate-300">{[vibe.secondhand && "Secondhand welcome", vibe.handmade && "Homemade welcome", vibe.experiences && "Experiences welcome"].filter(Boolean).join(" · ")}</p>
  </div>;
}

export default function GiftVibe() {
  const [vibe, setVibe] = useState(EMPTY_VIBE);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    api("/api/retention/vibe").then(data => { if (active) { setVibe(data.vibe); setLoaded(true); } }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);
  async function save(clear = false) {
    setBusy(true); setError(""); setNotice("");
    try {
      const data = await api("/api/retention/vibe", { method: clear ? "DELETE" : "POST", ...(clear ? {} : { json: vibe }) });
      setVibe(data.vibe); setNotice(clear ? "Gift preferences cleared." : "Gift vibe saved for your exchanges.");
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <details className="rounded-xl border border-white/10 p-3">
    <summary className="cursor-pointer font-semibold text-white">My gift vibe</summary>
    <p className="text-xs text-slate-400 my-2">Saved on your account and shared only with your assigned givers. Review it each season. You can edit or clear it anytime.</p>
    <form className="space-y-3" onSubmit={event => { event.preventDefault(); save(); }}>
      <label className="block text-sm">How should someone use your list?
        <select className="glass-input w-full mt-1" value={vibe.approach} onChange={event => setVibe({ ...vibe, approach: event.target.value })}>
          {Object.entries(GIFT_APPROACHES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="block text-sm">Things I like
        <textarea className="glass-input w-full mt-1" maxLength={500} placeholder="Coffee, gardening, practical gifts…" value={vibe.interests} onChange={event => setVibe({ ...vibe, interests: event.target.value })} />
      </label>
      <label className="block text-sm">Please avoid
        <textarea className="glass-input w-full mt-1" maxLength={500} placeholder="No scented products…" value={vibe.avoid} onChange={event => setVibe({ ...vibe, avoid: event.target.value })} />
      </label>
      {[['secondhand', 'Secondhand gifts welcome'], ['handmade', 'Homemade gifts welcome'], ['experiences', 'Experiences welcome']].map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={vibe[key]} onChange={event => setVibe({ ...vibe, [key]: event.target.checked })} />{label}</label>)}
      <div className="flex flex-wrap gap-3"><button className="btn btn-secondary text-sm" disabled={!loaded || busy}>Save gift vibe</button><button type="button" className="text-sm underline" disabled={!loaded || busy} onClick={() => save(true)}>Clear preferences</button></div>
    </form>
    {error && <p role="alert" className="text-rose-300 mt-2">{error}</p>}
    {notice && <p role="status" className="text-emerald-300 mt-2">{notice}</p>}
  </details>;
}
