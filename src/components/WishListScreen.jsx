import React, { useEffect, useState } from "react";
import GiftVibe from "./GiftVibe";
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

export default function WishListScreen({ user, onNeedAccount, exchangeId = "" }) {
  const [lists, setLists] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [ownedLists, setOwnedLists] = useState([]);
  const [shareListId, setShareListId] = useState("");
  const [listTitle, setListTitle] = useState("My list");
  const [giftTitle, setGiftTitle] = useState("");
  const [giftUrl, setGiftUrl] = useState("");
  const [giftNotes, setGiftNotes] = useState("");
  const [giftSize, setGiftSize] = useState("");
  const [giftColor, setGiftColor] = useState("");
  const [giftPriority, setGiftPriority] = useState("");
  const [editingId, setEditingId] = useState("");

  useEffect(() => {
    if (!user) return undefined;
    let cancel = false;
    setBusy(true);
    Promise.all([api("/api/wishlist"), api("/api/wish-lists")])
      .then(([memberships, saved]) => {
        if (cancel) return;
        const rows = memberships.lists || [];
        setLists(rows);
        const first = rows.find((item) => item.exchangeId === exchangeId) || rows[0];
        setActiveId(first?.memberId || "");
        setDraft(first || null);
        const owned = saved.lists || [];
        setOwnedLists(owned);
        setShareListId(owned[0]?.id || "");
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
  }, [user, exchangeId]);

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
        <p className="text-xs text-slate-400">Signed in as {user.email}. Add a gift, then share the list with an exchange. Notification preferences are in Account.</p>
      </div>
      <GiftVibe />
      <div className="grid sm:grid-cols-2 gap-3">
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            api("/api/wish-lists", { method: "POST", json: { title: listTitle } })
              .then((data) => {
                const owned = data.lists || [];
                setOwnedLists(owned);
                setShareListId((current) => current || owned[0]?.id || "");
              })
              .catch((err) => setError(err.message));
          }}
        >
          <p className="text-sm text-white">Lists you keep</p>
          <input className="glass-input w-full" aria-label="Wish list name" value={listTitle} onChange={(e) => setListTitle(e.target.value)} />
          <button className="btn btn-secondary text-xs" type="submit">Save list on my account</button>
          <p className="text-[11px] text-slate-400">{ownedLists.length ? `${ownedLists.length} saved` : "A saved list can be shared with more than one exchange."}</p>
        </form>
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            const listId = shareListId || ownedLists[0]?.id;
            if (!listId) {
              setError("Save a list first.");
              return;
            }
            const payload = {
              title: giftTitle,
              originalUrl: giftUrl,
              notes: giftNotes,
              size: giftSize,
              color: giftColor,
              priority: giftPriority,
            };
            const path = editingId ? `/api/wish-items/${editingId}` : `/api/wish-lists/${listId}/items`;
            api(path, { method: "POST", json: payload })
              .then((data) => {
                setOwnedLists(data.lists || []);
                setGiftTitle("");
                setGiftUrl("");
                setGiftNotes("");
                setGiftSize("");
                setGiftColor("");
                setGiftPriority("");
                setEditingId("");
                setNotice("Gift saved. A shop link does not mark it purchased.");
              })
              .catch((err) => setError(err.message));
          }}
        >
          <p className="text-sm text-white">{editingId ? "Edit this wish" : "Add a wish"}</p>
          <input className="glass-input w-full" aria-label="Gift name" placeholder="Wool socks or a homemade pie" value={giftTitle} onChange={(e) => setGiftTitle(e.target.value)} required />
          <input className="glass-input w-full" aria-label="Product link" placeholder="Product link, or leave blank for an idea" value={giftUrl} onChange={(e) => setGiftUrl(e.target.value)} />
          <details>
            <summary className="text-xs text-slate-300 cursor-pointer">Size, color, notes</summary>
            <div className="space-y-2 mt-2">
              <input className="glass-input w-full" aria-label="Gift notes" placeholder="Notes" value={giftNotes} onChange={(e) => setGiftNotes(e.target.value)} />
              <div className="grid grid-cols-3 gap-2">
                <input className="glass-input" aria-label="Size" placeholder="Size" value={giftSize} onChange={(e) => setGiftSize(e.target.value)} />
                <input className="glass-input" aria-label="Color" placeholder="Color" value={giftColor} onChange={(e) => setGiftColor(e.target.value)} />
                <input className="glass-input" aria-label="Priority" placeholder="Priority" value={giftPriority} onChange={(e) => setGiftPriority(e.target.value)} />
              </div>
            </div>
          </details>
          <button className="btn btn-primary text-sm" type="submit">{editingId ? "Save wish" : "Add a wish"}</button>
        </form>
      </div>
      {ownedLists.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-white">Saved gifts</p>
          <ul className="space-y-2">
            {ownedLists.flatMap((list) => (list.items || []).map((item) => (
              <li key={item.id} className="border border-white/10 rounded-lg p-3 text-sm">
                <p className="text-white">{item.title}</p>
                {item.size || item.color || item.priority ? (
                  <p className="text-xs text-slate-400">{[item.size, item.color, item.priority].filter(Boolean).join(" · ")}</p>
                ) : null}
                {item.notes && <p className="text-slate-300">{item.notes}</p>}
                {item.shoppingUrl && <p className="text-xs text-sky-300 break-all">{item.shoppingUrl}</p>}
                {item.originalUrl && item.originalUrl !== item.shoppingUrl && (
                  <p className="text-[11px] text-slate-500 break-all">Original {item.originalUrl}</p>
                )}
                <button
                  type="button"
                  className="text-xs text-sky-300 mt-1"
                  onClick={() => {
                    setShareListId(list.id);
                    setEditingId(item.id);
                    setGiftTitle(item.title || "");
                    setGiftUrl(item.originalUrl || "");
                    setGiftNotes(item.notes || "");
                    setGiftSize(item.size || "");
                    setGiftColor(item.color || "");
                    setGiftPriority(item.priority || "");
                  }}
                >
                  Edit preview
                </button>
              </li>
            )))}
          </ul>
          {draft?.exchangeId && (
            <div className="flex flex-wrap gap-2 items-center">
              <select className="glass-input text-sm" aria-label="List to share" value={shareListId} onChange={(e) => setShareListId(e.target.value)}>
                {ownedLists.map((list) => <option key={list.id} value={list.id}>{list.title}</option>)}
              </select>
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={() => {
                  api("/api/wish-lists/share", { method: "POST", json: { wishListId: shareListId, exchangeId: draft.exchangeId } })
                    .then(() => setNotice(`Shared with ${draft.exchangeTitle}.`))
                    .catch((err) => setError(err.message));
                }}
              >
                Share with {draft.exchangeTitle}
              </button>
            </div>
          )}
        </div>
      )}
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
          <label className="block text-xs text-slate-300">
            Wishes, one per line
            <textarea className="glass-input w-full mt-1 min-h-28" value={draft.wishes || ""} onChange={(e) => setDraft({ ...draft, wishes: e.target.value })} />
          </label>
          <details>
            <summary className="text-xs text-slate-300 cursor-pointer">Age, who the gifts are for, and hobbies</summary>
          <div className="grid sm:grid-cols-2 gap-2 mt-2">
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
          <label className="block text-xs text-slate-300 mt-2">
            Hobbies
            <input className="glass-input w-full mt-1" value={draft.hobbies || ""} onChange={(e) => setDraft({ ...draft, hobbies: e.target.value })} />
          </label>
          </details>
          <button className="btn btn-gold text-sm" type="submit" disabled={busy}>
            <Save size={14} /> Save wish list
          </button>
          <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">My recipient&apos;s wishes</p>
            {draft.givingTo ? (
              <>
                <p className="text-sm text-white mt-1">You are giving to {draft.givingTo.name}</p>
                {draft.givingTo.listTitle && <p className="text-xs text-slate-400 mt-1">{draft.givingTo.listTitle}</p>}
                <p className="text-sm text-slate-200 mt-2 whitespace-pre-line">{draft.givingTo.wishes || "No wishes yet."}</p>
                {draft.givingTo.hobbies && <p className="text-xs text-slate-400 mt-2">Hobbies: {draft.givingTo.hobbies}</p>}
              </>
            ) : (
              <p className="text-sm text-slate-300 mt-1">{draft.drawn ? "Your match is not ready yet." : "Names have not been drawn yet."}</p>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
