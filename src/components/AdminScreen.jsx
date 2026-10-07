import React, { useEffect, useState } from "react";
import { Mail, MessageSquare, Shield, Shuffle, UserPlus } from "lucide-react";
import { api } from "../account/api";
import { getStoredAffiliateConfig } from "../utils/affiliate";
import { sound } from "../utils/audio";

function Gate({ onNeedAccount }) {
  return (
    <section className="glass-panel p-6 max-w-xl mx-auto text-center">
      <Shield className="mx-auto text-amber-300 mb-3" />
      <h2 className="text-xl font-bold font-heading text-white">Admin</h2>
      <p className="text-sm text-slate-300 mt-2">
        Sign in to create an exchange, add the guest list, draw names, and send each private link by email or text.
      </p>
      <button type="button" className="btn btn-gold text-sm mt-4" onClick={onNeedAccount}>
        Sign in
      </button>
    </section>
  );
}

export default function AdminScreen({ user, onNeedAccount }) {
  const [exchanges, setExchanges] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [title, setTitle] = useState("Family Secret Santa");
  const [budget, setBudget] = useState("$25");
  const [eventDate, setEventDate] = useState("");
  const [signupDeadline, setSignupDeadline] = useState("");
  const [exclusion, setExclusion] = useState({ giverMemberId: "", receiverMemberId: "" });
  const [person, setPerson] = useState({ name: "", email: "", phone: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const loadList = async () => {
    const data = await api("/api/exchanges");
    setExchanges(data.exchanges || []);
    return data.exchanges || [];
  };

  const openExchange = async (id) => {
    const data = await api(`/api/exchanges/${id}`);
    setSelectedId(id);
    setDetail(data);
  };

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    setBusy(true);
    loadList()
      .then((rows) => {
        if (cancel) return;
        if (rows[0]) return openExchange(rows[0].id);
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

  const run = async (work) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const createExchange = (event) => {
    event.preventDefault();
    sound.playClick();
    run(async () => {
      const data = await api("/api/exchanges", {
        method: "POST",
        json: { title, budget, eventDate, signupDeadline, occasion: "Christmas" },
      });
      await loadList();
      setSelectedId(data.exchange.id);
      setDetail(data);
      setNotice("Exchange created. You are on the guest list too.");
    });
  };

  const addPerson = (event) => {
    event.preventDefault();
    sound.playClick();
    run(async () => {
      const data = await api(`/api/exchanges/${selectedId}/members`, {
        method: "POST",
        json: person,
      });
      setDetail(data);
      setPerson({ name: "", email: "", phone: "" });
    });
  };

  const removePerson = (memberId) => {
    sound.playClick();
    run(async () => {
      const data = await api(`/api/exchanges/${selectedId}/members/${memberId}`, { method: "DELETE" });
      setDetail(data);
    });
  };

  const draw = () => {
    sound.playClick();
    run(async () => {
      const data = await api(`/api/exchanges/${selectedId}/draw`, { method: "POST", json: {} });
      setDetail(data);
      setNotice("Names are drawn. Assignments stay hidden here. Each person only sees their own match.");
    });
  };

  const notify = (channel, kind) => {
    sound.playClick();
    run(async () => {
      const data = await api(`/api/exchanges/${selectedId}/notify`, {
        method: "POST",
        json: { channel, kind, affiliate: getStoredAffiliateConfig() },
      });
      setDetail(data);
      const accepted = (data.results || []).filter((row) => row.status === "accepted" || row.status === "sent" || row.status === "delivered").length;
      const failed = (data.results || []).filter((row) => row.status === "failed").length;
      const deferred = (data.results || []).filter((row) => row.status === "deferred").length;
      setNotice(`${channel === "email" ? "Email" : "Text"} finished. ${accepted} accepted by the provider, ${failed} failed, ${deferred} waiting until morning. Accepted is not the same as delivered.`);
    });
  };

  const providers = detail?.providers;
  const exchange = detail?.exchange;

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <aside className="glass-panel p-4">
        <h2 className="font-heading font-bold text-white flex items-center gap-2">
          <Shield size={16} /> Admin
        </h2>
        <p className="text-[11px] text-slate-400 mt-1">Exchanges you organize.</p>
        <ul className="mt-3 space-y-2">
          {exchanges.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`w-full text-left text-sm rounded-lg px-2 py-1.5 ${item.id === selectedId ? "bg-white/10 text-white" : "text-slate-300"}`}
                onClick={() => run(() => openExchange(item.id))}
              >
                {item.title}
                {item.drawn ? " · drawn" : ""}
              </button>
            </li>
          ))}
          {exchanges.length === 0 && !busy && <li className="text-xs text-slate-400">No exchanges yet.</li>}
        </ul>
      </aside>

      <section className="space-y-4">
        <form onSubmit={createExchange} className="glass-panel p-4 space-y-3">
          <h3 className="font-semibold text-white">New exchange</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            <input className="glass-input" aria-label="Exchange title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <input className="glass-input" aria-label="Budget" value={budget} onChange={(e) => setBudget(e.target.value)} />
            <input className="glass-input" aria-label="Exchange date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            <input className="glass-input" aria-label="Signup deadline" type="date" value={signupDeadline} onChange={(e) => setSignupDeadline(e.target.value)} />
          </div>
          <button className="btn btn-gold text-xs" type="submit" disabled={busy}>Create exchange</button>
        </form>

        {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
        {notice && <p className="text-sm text-emerald-300">{notice}</p>}

        {exchange && (
          <div className="glass-panel p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-white">{exchange.title}</h3>
                <p className="text-xs text-slate-400">
                  {exchange.drawn ? "Drawn. Recipients stay hidden here." : exchange.drawReady ? "Ready to draw the accepted guests." : "Waiting for at least two accepted guests."}
                  {exchange.signupDeadline ? ` Signup deadline ${exchange.signupDeadline}.` : ""}
                  {exchange.budget ? ` Budget ${exchange.budget}.` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-primary text-xs" onClick={draw} disabled={busy || exchange.drawn || !exchange.drawReady}>
                  <Shuffle size={14} /> Draw names
                </button>
                {exchange.drawn && (
                  <button
                    type="button"
                    className="btn btn-secondary text-xs"
                    onClick={() => run(() => api(`/api/exchanges/${selectedId}/redraw`, { method: "POST", json: { confirm: "redraw" } }).then((data) => {
                      setDetail(data);
                      setNotice("The previous draw was cancelled and names were drawn again.");
                    }))}
                  >
                    Cancel and redraw
                  </button>
                )}
              </div>
            </div>

            <ul className="space-y-2">
              {(detail.members || []).map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-2 text-sm border border-white/10 rounded-lg px-3 py-2">
                  <span>
                    <strong className="text-white">{member.name}</strong>
                    <span className="text-slate-400"> · {member.status} · {member.email || "no email"} · {member.phone || "no phone"}</span>
                    {member.hasWishes ? <span className="text-emerald-300"> · wishes</span> : <span> · no wishes yet</span>}
                    {member.inviteToken ? <span className="block text-xs text-slate-500 break-all">Invite code {member.inviteToken}</span> : null}
                  </span>
                  <span className="flex gap-2">
                    {member.status === "requested" && !exchange.drawn && (
                      <button type="button" className="text-xs text-emerald-300" onClick={() => run(() => api(`/api/exchanges/${selectedId}/members/${member.id}/accept`, { method: "POST", json: {} }).then(setDetail))}>Accept</button>
                    )}
                    {!exchange.drawn && (
                      <button type="button" className="text-xs text-rose-300" onClick={() => removePerson(member.id)}>Remove</button>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            {!exchange.drawn && (
              <form onSubmit={addPerson} className="grid sm:grid-cols-4 gap-2">
                <input className="glass-input" aria-label="Person name" placeholder="Name" value={person.name} onChange={(e) => setPerson({ ...person, name: e.target.value })} required />
                <input className="glass-input" aria-label="Person email" placeholder="Email" value={person.email} onChange={(e) => setPerson({ ...person, email: e.target.value })} />
                <input className="glass-input" aria-label="Person phone" placeholder="Phone" value={person.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} />
                <button className="btn btn-secondary text-xs" type="submit" disabled={busy}>
                  <UserPlus size={14} /> Add person
                </button>
              </form>
            )}

            {!exchange.drawn && (
              <form
                className="grid sm:grid-cols-3 gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  run(async () => {
                    const data = await api(`/api/exchanges/${selectedId}/exclusions`, { method: "POST", json: exclusion });
                    setDetail(data);
                    setExclusion({ giverMemberId: "", receiverMemberId: "" });
                  });
                }}
              >
                <select className="glass-input" aria-label="Person who cannot give" value={exclusion.giverMemberId} onChange={(e) => setExclusion({ ...exclusion, giverMemberId: e.target.value })}>
                  <option value="">Cannot give</option>
                  {(detail.members || []).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
                <select className="glass-input" aria-label="Person they cannot draw" value={exclusion.receiverMemberId} onChange={(e) => setExclusion({ ...exclusion, receiverMemberId: e.target.value })}>
                  <option value="">Cannot draw</option>
                  {(detail.members || []).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
                <button className="btn btn-secondary text-xs" type="submit">Add exclusion</button>
              </form>
            )}
            {exchange.joinOpen && exchange.joinToken && (
              <p className="text-xs text-slate-300 break-all">
                Open join link: {`${window.location.origin}/?view=join&code=${exchange.joinToken}`}. Anyone with this link can ask to join. It does not show assignments.
              </p>
            )}
            {(detail.exclusions || []).length > 0 && (
              <ul className="text-xs text-slate-300">
                {detail.exclusions.map((rule) => (
                  <li key={rule.id}>{rule.giverName} cannot draw {rule.receiverName}</li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-secondary text-xs" onClick={() => notify("email", "invite")} disabled={busy || !providers?.emailReady}>
                <Mail size={14} /> Email invitations
              </button>
              <button type="button" className="btn btn-secondary text-xs" onClick={() => notify("email", "assignment")} disabled={busy || !exchange.drawn || !providers?.emailReady}>
                <Mail size={14} /> Email that recipients are ready
              </button>
              <button type="button" className="btn btn-secondary text-xs" onClick={() => notify("sms", "assignment")} disabled={busy || !exchange.drawn || !providers?.smsReady}>
                <MessageSquare size={14} /> Text people who opted in
              </button>
              <button type="button" className="btn btn-secondary text-xs" onClick={() => notify("email", "wishlist")} disabled={busy || !exchange.drawn || !providers?.emailReady}>
                <Mail size={14} /> Email the wish-list link
              </button>
              <button type="button" className="btn btn-secondary text-xs" onClick={() => notify("sms", "wishlist")} disabled={busy || !exchange.drawn || !providers?.smsReady}>
                <MessageSquare size={14} /> Text the wish-list link
              </button>
              <button
                type="button"
                className="btn btn-secondary text-xs"
                disabled={busy}
                onClick={() => run(() => api(`/api/exchanges/${selectedId}/join`, { method: "POST", json: { open: !exchange.joinOpen } }).then((data) => {
                  setDetail(data);
                  setNotice(data.exchange?.joinOpen
                    ? "Open join is on. Anyone with that link can ask to join. You still choose who is drawn."
                    : "Open join is off.");
                }))}
              >
                {exchange.joinOpen ? "Close open join" : "Open join link"}
              </button>
              <button
                type="button"
                className="btn btn-secondary text-xs"
                disabled={busy || !exchange.eventDate}
                onClick={() => run(() => api(`/api/exchanges/${selectedId}/reminders`, { method: "POST", json: {} }).then((data) => {
                  setDetail(data);
                  setNotice(`${data.queued || 0} reminders queued. They send only if the person is still eligible.`);
                }))}
              >
                Queue deadline reminders
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Email goes out through Resend. Texts go out through Twilio.
              {providers && !providers.emailReady ? " Add RESEND_API_KEY and EMAIL_FROM to turn email on." : ""}
              {providers && !providers.smsReady ? " Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER to turn texting on." : ""}
            </p>

            {(detail.deliveries || []).length > 0 && (
              <ul className="text-xs text-slate-300 space-y-1">
                {detail.deliveries.map((row) => (
                  <li key={row.id}>{row.channel} to {row.memberName}: {row.status}{row.detail ? ` — ${row.detail}` : ""}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
