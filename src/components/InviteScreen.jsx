import React, { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { api } from "../account/api";

export default function InviteScreen({ code, user, onNeedAccount, onDone }) {
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancel = false;
    api(`/api/invites/${encodeURIComponent(code)}`)
      .then((data) => {
        if (!cancel) setInvite(data);
      })
      .catch((err) => {
        if (!cancel) setError(err.message);
      });
    return () => {
      cancel = true;
    };
  }, [code]);

  const respond = (action) => {
    setError("");
    const path = action === "accept" ? "accept" : "decline";
    api(`/api/invites/${encodeURIComponent(code)}/${path}`, { method: "POST", json: {} })
      .then((data) => {
        setStatus(data.status);
        if (data.status === "accepted" && onDone) onDone();
      })
      .catch((err) => setError(err.message));
  };

  return (
    <section className="glass-panel p-6 max-w-lg mx-auto space-y-3">
      <div className="flex items-center gap-3">
        <Mail className="text-sky-300" />
        <h2 className="text-xl font-bold font-heading text-white">Invitation</h2>
      </div>
      <p className="text-sm text-slate-300">
        This link asks you to join an exchange. It does not show anyone’s assignment.
      </p>
      {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
      {invite && (
        <>
          <p className="text-white">{invite.name}, you are invited to {invite.exchangeTitle}.</p>
          <p className="text-xs text-slate-400">
            {invite.eventDate ? `Exchange date ${invite.eventDate}. ` : ""}
            {invite.budget ? `Budget ${invite.budget}. ` : ""}
            Status: {status || invite.status}.
          </p>
        </>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-gold text-sm" onClick={() => (user ? respond("accept") : onNeedAccount())}>
          {user ? "Accept" : "Sign in to accept"}
        </button>
        <button type="button" className="btn btn-secondary text-sm" onClick={() => respond("decline")}>Decline</button>
      </div>
    </section>
  );
}
