import React, { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { api } from "../account/api";
import ParticipantProfileForm from "./ParticipantProfileForm";

export default function InviteScreen({ code, user, onNeedAccount, onDone, openJoin = false }) {
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancel = false;
    api(openJoin ? `/api/join/${encodeURIComponent(code)}` : `/api/invites/${encodeURIComponent(code)}`)
      .then((data) => {
        if (!cancel) setInvite(data);
      })
      .catch((err) => {
        if (!cancel) setError(err.message);
      });
    return () => {
      cancel = true;
    };
  }, [code, openJoin]);

  const respond = (action, fields = {}) => {
    setError("");
    if (openJoin) {
      api(`/api/join/${encodeURIComponent(code)}/request`, { method: "POST", json: { name: user?.name || "" } })
        .then((data) => setStatus(data.status))
        .catch((err) => setError(err.message));
      return;
    }
    const path = action === "accept" ? "accept" : "decline";
    const json = action === "accept"
      ? { wishes: fields.wishes || "", likes: fields.likes || "", dislikes: fields.dislikes || "" }
      : {};
    api(`/api/invites/${encodeURIComponent(code)}/${path}`, { method: "POST", json })
      .then((data) => {
        setStatus(data.status);
        if (data.status === "accepted" && onDone) onDone();
      })
      .catch((err) => setError(err.message));
  };

  const currentStatus = status || invite?.status || "";
  const canFillProfile = Boolean(user) && !openJoin && invite && currentStatus !== "accepted" && currentStatus !== "declined";

  return (
    <section className="glass-panel p-6 max-w-lg mx-auto space-y-3">
      <div className="flex items-center gap-3">
        <Mail className="text-sky-300" />
        <h2 className="text-xl font-bold font-heading text-white">Invitation</h2>
      </div>
      <p className="text-sm text-slate-300">
        {invite?.warning || (openJoin
          ? "Anyone with this link can ask to join. The organizer chooses who is drawn. This link does not show assignments."
          : "This is a private invitation. It does not show anyone’s assignment.")}
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
      {canFillProfile && (
        <ParticipantProfileForm
          name={invite.name}
          submitLabel="Accept and save my list"
          onSubmit={(fields) => respond("accept", fields)}
        />
      )}
      {user && !openJoin && currentStatus === "accepted" && (
        <button type="button" className="btn btn-primary text-sm" onClick={() => onDone && onDone()}>
          Edit my wish list
        </button>
      )}
      <div className="flex flex-wrap gap-2">
        {(!user || openJoin) && (
          <button type="button" className="btn btn-gold text-sm" onClick={() => (user ? respond("accept") : onNeedAccount())}>
            {user ? "Ask to join" : "Sign in to continue"}
          </button>
        )}
        {!openJoin && currentStatus !== "declined" && currentStatus !== "accepted" && (
          <button type="button" className="btn btn-secondary text-sm" onClick={() => respond("decline")}>Decline</button>
        )}
      </div>
    </section>
  );
}
