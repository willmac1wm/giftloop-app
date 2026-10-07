import React, { useEffect, useState } from "react";
import { Gift, Save } from "lucide-react";
import { api } from "../account/api";
import { AGE_BANDS, SHOP_FOR } from "../data/giftProfile";
import { sound } from "../utils/audio";

function Gate({ onNeedAccount }) {
  return (
    <section className="glass-panel p-6 max-w-xl mx-auto text-center">
      <Gift className="mx-auto text-rose-300 mb-3" />
      <h2 className="text-xl font-bold font-heading text-white">My wish list</h2>
      <p className="text-sm text-slate-300 mt-2">
        Sign in with the email on your Secret Santa invite. Your list is the one your giver shops from.
      </p>
      <button type="button" className="btn btn-gold text-sm mt-4" onClick={onNeedAccount}>
        Sign in
      </button>
    </section>
  );
}

export default function WishListScreen({ user, onNeedAccount }) {
  const [lists, setLists] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    setBusy(true);
    api("/api/wishlist")
      .then((data) => {
        if (cancel) return;
        const rows = data.lists || [];
        setLists(rows);
        const first = rows[0];
        setActiveId(first?.memberId || "");
        setDraft(first || null);
      })
      .catch((err) => {
        if (!cancel) setError(err.message);
      })
      .finally(() => {
        if (!cancel) setBusy(false);
      });
    return () => {
      cancel = true;
    };
  }, [user]);

  if (!user) return <Gate onNeedAccount={onNeedAccount} />;

  const choose = (memberId) => {
    const next = lists.find((item) => item.memberId === memberId);
    setActiveId(memberId);
    setDraft(next || null);
    setNotice("");
  };

  const save = (event) => {
    event.preventDefault();
    sound.playClick();
    setBusy(true);
    setError("");
    api("/api/wishlist", { method: "POST", json: { ...draft, memberId: activeId } })
      .then((data) => {
        const rows = data.lists || [];
        setLists(rows);
        const next = rows.find((item) => item.memberId === activeId) || rows[0];
        setDraft(next || null);
        setNotice("Wish list saved.");
      })
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false));
  };

  return (
    <section className="glass-panel p-5 max-w-2xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold font-heading text-white">My wish list</h2>
        <p className="text-xs text-slate-400">Signed in as {user.email}. After the draw, your match shows up here too.</p>
      </div>
      {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
      {notice && <p className="text-sm text-emerald-300">{notice}</p>}
      {!busy && lists.length === 0 && !error && (
        <p className="text-sm text-slate-300">
          No list is tied to this email yet. When an organizer adds you, sign in with that same address.
        </p>
      )}
      {lists.length > 1 && (
        <label className="block text-xs text-slate-300">
          Exchange
          <select className="glass-input w-full mt-1" value={activeId} onChange={(e) => choose(e.target.value)}>
            {lists.map((item) => (
              <option key={item.memberId} value={item.memberId}>{item.exchangeTitle}</option>
            ))}
          </select>
        </label>
      )}
      {draft && (
        <form onSubmit={save} className="space-y-3">
          <p className="text-sm text-white">{draft.exchangeTitle}</p>
          <label className="block text-xs text-slate-300">
            List name
            <input className="glass-input w-full mt-1" value={draft.listTitle || ""} onChange={(e) => setDraft({ ...draft, listTitle: e.target.value })} />
          </label>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="block text-xs text-slate-300">
              Age
              <select className="glass-input w-full mt-1" value={draft.ageBand || ""} onChange={(e) => setDraft({ ...draft, ageBand: e.target.value })}>
                <option value="">Skip</option>
                {AGE_BANDS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="block text-xs text-slate-300">
              Who the gifts are for
              <select className="glass-input w-full mt-1" value={draft.shopFor || ""} onChange={(e) => setDraft({ ...draft, shopFor: e.target.value })}>
                <option value="">Skip</option>
                {SHOP_FOR.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-xs text-slate-300">
            Wishes, one per line
            <textarea className="glass-input w-full mt-1 min-h-28" value={draft.wishes || ""} onChange={(e) => setDraft({ ...draft, wishes: e.target.value })} />
          </label>
          <label className="block text-xs text-slate-300">
            Hobbies
            <input className="glass-input w-full mt-1" value={draft.hobbies || ""} onChange={(e) => setDraft({ ...draft, hobbies: e.target.value })} />
          </label>
          <button className="btn btn-gold text-sm" type="submit" disabled={busy}>
            <Save size={14} /> Save wish list
          </button>
          {draft.givingTo && (
            <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
              <p className="text-sm text-white">You are giving to {draft.givingTo.name}</p>
              {draft.givingTo.listTitle && <p className="text-xs text-slate-400 mt-1">{draft.givingTo.listTitle}</p>}
              <p className="text-sm text-slate-200 mt-2 whitespace-pre-line">{draft.givingTo.wishes || "No wishes yet."}</p>
              {draft.givingTo.hobbies && <p className="text-xs text-slate-400 mt-2">Hobbies: {draft.givingTo.hobbies}</p>}
            </div>
          )}
        </form>
      )}
    </section>
  );
}
