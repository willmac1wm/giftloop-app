import React, { useState } from "react";
import { LifeBuoy } from "lucide-react";
import { api } from "../account/api";

function Gate({ onNeedAccount }) {
  return (
    <section className="glass-panel p-6 max-w-xl mx-auto text-center">
      <LifeBuoy className="mx-auto text-sky-300 mb-3" />
      <h2 className="text-xl font-bold text-white">Support</h2>
      <p className="text-sm text-slate-300 mt-2">Sign in to open a ticket. Support staff can look up an account without seeing assignments.</p>
      <button type="button" className="btn btn-gold text-sm mt-4" onClick={onNeedAccount}>Sign in</button>
    </section>
  );
}

export default function SupportScreen({ user, onNeedAccount, staff = "" }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [lookup, setLookup] = useState(null);
  const [tickets, setTickets] = useState([]);

  if (!user) return <Gate onNeedAccount={onNeedAccount} />;

  return (
    <section className="glass-panel p-5 max-w-2xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-white">{staff ? "Support tools" : "Support"}</h2>
      <p className="text-xs text-slate-400">This is separate from Manage exchange. It does not show who anyone is giving to.</p>
      {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
      {notice && <p className="text-sm text-emerald-300">{notice}</p>}
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          api("/api/tickets", { method: "POST", json: { subject, body: message } })
            .then(() => {
              setSubject("");
              setMessage("");
              setNotice("Ticket saved.");
            })
            .catch((err) => setError(err.message));
        }}
      >
        <input className="glass-input w-full" aria-label="Ticket subject" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
        <textarea className="glass-input w-full min-h-24" aria-label="Ticket message" placeholder="What happened?" value={message} onChange={(e) => setMessage(e.target.value)} required />
        <button className="btn btn-gold text-xs" type="submit">Open ticket</button>
      </form>
      {staff && (
      <>
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          setLookup(null);
          api(`/api/support/lookup?email=${encodeURIComponent(email)}`)
            .then((data) => setLookup(data))
            .catch((err) => setError(err.message));
        }}
      >
        <p className="text-sm text-white">Staff lookup</p>
        <input className="glass-input w-full" aria-label="Account email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn btn-secondary text-xs" type="submit">Look up account</button>
      </form>
      {lookup && (
        <ul className="text-sm text-slate-200 space-y-2">
          {(lookup.exchanges || []).map((row) => (
            <li key={`${row.exchangeTitle}-${row.status}`}>{row.exchangeTitle}: {row.status}{row.hasWishes ? " · wishes" : ""}</li>
          ))}
          {(lookup.failures || []).map((row, index) => (
            <li key={`${row.channel}-${index}`} className="text-rose-300">{row.channel} {row.kind}: {row.detail}</li>
          ))}
          {(lookup.exchanges || []).length === 0 && <li>No exchange was found for that email.</li>}
        </ul>
      )}
      <button
        type="button"
        className="btn btn-secondary text-xs"
        onClick={() => api("/api/support/tickets").then((data) => setTickets(data.tickets || [])).catch((err) => setError(err.message))}
      >
        Load open tickets
      </button>
      <ul className="text-sm text-slate-300 space-y-1">
        {tickets.map((ticket) => (
          <li key={ticket.id}>{ticket.status}: {ticket.subject} · {ticket.requesterEmail}</li>
        ))}
      </ul>
      </>
      )}
    </section>
  );
}
