import React, { useEffect, useState } from "react";
import { planningReminderPresets, dateTimeInput } from "../retention/notificationTiming";
import { api } from "../account/api";

const emptyTradition = { theme: "", rules: "", memory: "", photo: "", photoApproved: false };
export default function GroupContinuity({ user, onCreated, onOpenWishlist }) {
  const [history, setHistory] = useState([]);
  const [lists, setLists] = useState([]);
  const [source, setSource] = useState(null);
  const [create, setCreate] = useState(false);
  const [tradition, setTradition] = useState(null);
  const [reminder, setReminder] = useState(null);
  const [when, setWhen] = useState("");
  const [draft, setDraft] = useState({ title: "", occasion: "Gift exchange", budget: "$25", eventDate: "", wishListId: "", wishesReviewed: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([api("/api/retention/history"), api("/api/wish-lists")]).then(([data, owned]) => {
      if (active) { setHistory(data.exchanges); setLists(owned.lists || []); }
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [user.id]);
  async function run(work) {
    setBusy(true); setError(""); setNotice("");
    try { await work(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  function start(previous = null) {
    if (busy) return;
    setSource(previous); setTradition(null); setCreate(true); setError(""); setNotice("");
    setDraft({ title: previous?.title || "", occasion: previous?.occasion || "Gift exchange", budget: previous?.budget || "$25", eventDate: "", wishListId: "", wishesReviewed: false });
  }
  async function openMemory(row) {
    await run(async () => {
      const data = await api(`/api/retention/traditions/${row.id}`);
      setSource(row); setCreate(false); setTradition(data.tradition); setReminder(data.reminder); setWhen("");
    });
  }
  async function photoChange(file) {
    if (!file) return;
    await run(async () => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10000000) throw new Error("Choose a JPEG, PNG, or WebP photo under 10 MB.");
      const url = URL.createObjectURL(file);
      try {
        const img = new Image(); img.src = url; await img.decode();
        const scale = Math.min(1, 800 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas'); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
        const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(img, 0, 0, canvas.width, canvas.height);
        const photo = canvas.toDataURL('image/jpeg', 0.65);
        if (photo.length > 450000) throw new Error("Choose a smaller photo.");
        setTradition(current => ({ ...current, photo, photoApproved: false }));
      } finally { URL.revokeObjectURL(url); }
    });
  }
  return <div className="space-y-3 mt-5">
    {history.length > 0 && !create && !tradition && <p className="text-sm text-slate-300">Doing this with family too? <button type="button" className="underline text-sky-300" onClick={() => start()}>Start another group</button></p>}
    {history.length === 0 && !create && <button type="button" className="btn btn-secondary text-sm" onClick={() => start()}>Create a saved exchange</button>}
    {history.length > 0 && <details className="rounded-xl border border-white/10 p-3"><summary className="cursor-pointer text-sm">Your groups & traditions</summary>
      <p className="text-xs text-slate-400 my-2">Keep your memories here. Planning another exchange sends no invitations until you choose to send them.</p>
      <ul className="space-y-3">{history.map(row => <li key={row.id} className="space-y-1"><p className="text-sm text-white">{row.title}{row.eventDate ? ` · ${row.eventDate}` : ''}</p><div className="flex flex-wrap gap-3"><button type="button" className="text-sm underline" disabled={busy} onClick={() => openMemory(row)}>Traditions & memories</button>{row.organizer && <button type="button" className="text-sm underline" onClick={() => start(row)}>Plan our next exchange</button>}</div></li>)}</ul>
    </details>}
    {create && <form className="rounded-xl border border-white/10 p-4 space-y-3" onSubmit={event => { event.preventDefault(); run(async () => {
      const data = await api('/api/retention/create', { method: 'POST', json: { ...draft, sourceExchangeId: source?.id || '', timezone: source?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone } });
      onCreated(data.exchangeId);
    }); }}>
      <h2 className="font-semibold text-white">{source ? 'Plan our next exchange' : 'Start another group'}</h2>
      <p className="text-xs text-slate-400">{source ? 'Reuse the theme and written rules. Review the budget and choose a new date.' : 'Keep your account and gift vibe. Choose whether to share one of your own wish lists.'} Start with only yourself; invite everyone afresh. Previous exclusions and assignments do not carry over.</p>
      <label className="block text-sm">Exchange name<input className="glass-input w-full" required maxLength={120} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
      <label className="block text-sm">Occasion<select className="glass-input w-full" value={draft.occasion} onChange={e => setDraft({ ...draft, occasion: e.target.value })}>{[...new Set([draft.occasion, 'Gift exchange', 'Christmas', 'Birthday', 'Book swap', 'Favorite things'])].map(value => <option key={value}>{value}</option>)}</select></label>
      <div className="grid sm:grid-cols-2 gap-2"><label className="text-sm">Budget<input className="glass-input w-full" maxLength={40} value={draft.budget} onChange={e => setDraft({ ...draft, budget: e.target.value })} /></label><label className="text-sm">New gift date<input className="glass-input w-full" type="date" required value={draft.eventDate} onChange={e => setDraft({ ...draft, eventDate: e.target.value })} /></label></div>
      <label className="block text-sm">My wish list<select className="glass-input w-full" value={draft.wishListId} onChange={e => setDraft({ ...draft, wishListId: e.target.value, wishesReviewed: false })}><option value="">Choose later</option>{lists.map(list => <option value={list.id} key={list.id}>{list.title}</option>)}</select></label>
      {draft.wishListId && <div className="space-y-2 text-sm"><p>Still want these? Review before sharing.</p><ul className="list-disc pl-5">{(lists.find(list => list.id === draft.wishListId)?.items || []).map(item => <li key={item.id}>{item.title}</li>)}</ul><button type="button" className="underline" onClick={onOpenWishlist}>Edit my wishes and gift vibe</button><label className="flex gap-2"><input type="checkbox" required checked={draft.wishesReviewed} onChange={e => setDraft({ ...draft, wishesReviewed: e.target.checked })} />I reviewed this list and want to share it with my new assigned giver.</label></div>}
      <div className="flex gap-3"><button className="btn btn-primary text-sm" disabled={busy}>Create exchange</button><button type="button" className="text-sm underline" disabled={busy} onClick={() => setCreate(false)}>Cancel</button></div>
    </form>}
    {tradition && source && <div className="rounded-xl border border-white/10 p-4 space-y-3">
      <h2 className="font-semibold text-white">{source.title}: traditions & memories</h2>
      <p className="text-xs text-slate-400">Visible only to accepted members of this exchange. The organizer can edit or remove these memories. Do not include secret assignments.</p>
      {source.organizer ? <form className="space-y-3" onSubmit={e => { e.preventDefault(); run(async () => { await api(`/api/retention/traditions/${source.id}`, { method: 'POST', json: tradition }); setNotice('Traditions saved.'); }); }}>
        {[['theme', 'Theme', 120], ['rules', 'Rules and traditions', 1500], ['memory', 'Memorable gifts or a favorite moment', 1500]].map(([key, label, max]) => <label className="block text-sm" key={key}>{label}<textarea className="glass-input w-full" maxLength={max} value={tradition[key]} onChange={e => setTradition({ ...tradition, [key]: e.target.value })} /></label>)}
        <label className="block text-sm">Optional approved photo<input type="file" className="block w-full text-xs mt-2" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => photoChange(e.target.files[0])} /></label>
        {tradition.photo && <><img src={tradition.photo} alt="Exchange memory preview" className="max-w-full max-h-64 rounded-lg" /><label className="flex gap-2 text-sm"><input type="checkbox" required checked={tradition.photoApproved} onChange={e => setTradition({ ...tradition, photoApproved: e.target.checked })} />Everyone pictured has approved sharing this photo with the group.</label><button type="button" className="underline text-sm" onClick={() => setTradition({ ...tradition, photo: '', photoApproved: false })}>Remove photo</button></>}
        <div className="flex flex-wrap gap-3"><button className="btn btn-secondary text-sm" disabled={busy}>Save traditions</button><button type="button" className="underline text-sm" disabled={busy} onClick={() => run(async () => { await api(`/api/retention/traditions/${source.id}`, { method: 'POST', json: emptyTradition }); setTradition(emptyTradition); setNotice('Memories cleared.'); })}>Clear saved memories</button></div>
      </form> : <div className="text-sm space-y-2"><p>{tradition.theme}</p><p className="whitespace-pre-wrap">{tradition.rules}</p><p className="whitespace-pre-wrap">{tradition.memory}</p>{tradition.photo && <img src={tradition.photo} alt="Approved group memory" className="max-w-full max-h-64 rounded-lg" />}{!tradition.theme && !tradition.rules && !tradition.memory && !tradition.photo && <p>No memories added yet.</p>}</div>}
      {source.organizer && <details><summary className="cursor-pointer text-sm">Remind me to plan another exchange</summary><p className="text-xs text-slate-400 my-2">One email to you, never to the whole group. Uses your account’s email-reminder preference and your notification quiet hours. Delivery requires email to be configured.</p>
        <div className="flex flex-wrap gap-2 my-2">{planningReminderPresets(source.eventDate).map(preset => <button type="button" key={preset.label} className="btn btn-secondary text-xs" disabled={busy} onClick={() => setWhen(dateTimeInput(preset.date))}>{preset.label}</button>)}</div>
        {reminder && <p className="text-sm">{reminder.status}: {new Date(reminder.runAt).toLocaleString()}{reminder.detail ? ` — ${reminder.detail}` : ''}</p>}
        <form className="space-y-2" onSubmit={e => { e.preventDefault(); run(async () => { await api(`/api/retention/reminder/${source.id}`, { method: 'POST', json: { runAt: new Date(when).toISOString() } }); await openMemory(source); setNotice('Your planning reminder is saved.'); }); }}><label className="block text-sm">Time in {Intl.DateTimeFormat().resolvedOptions().timeZone}<input className="glass-input w-full" type="datetime-local" required value={when} onChange={e => setWhen(e.target.value)} /></label><button className="btn btn-secondary text-sm" disabled={busy}>Save my reminder</button></form>
        {reminder && <button type="button" className="underline text-sm mt-2" disabled={busy} onClick={() => run(async () => { await api(`/api/retention/reminder/${source.id}`, { method: 'POST', json: { cancel: true } }); setReminder(null); setNotice('Planning reminder cancelled.'); })}>Cancel reminder</button>}
      </details>}
      <button type="button" className="underline text-sm" disabled={busy} onClick={() => setTradition(null)}>Close</button>
    </div>}
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}{notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
  </div>;
}
