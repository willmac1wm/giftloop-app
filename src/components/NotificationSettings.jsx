import React, { useEffect, useState } from "react";
import { api } from "../account/api";

export default function NotificationSettings() {
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [smsPhone, setSmsPhone] = useState("");
  const [emailInvites, setEmailInvites] = useState(true);
  const [emailAssignments, setEmailAssignments] = useState(true);
  const [emailReminders, setEmailReminders] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    api("/api/settings")
      .then((settings) => {
        if (cancel) return;
        setSmsOptIn(Boolean(settings.smsOptIn));
        setSmsPhone(settings.phone || "");
        setEmailInvites(settings.emailInvites !== false);
        setEmailAssignments(settings.emailAssignments !== false);
        setEmailReminders(settings.emailReminders !== false);
      })
      .catch((err) => {
        if (!cancel) setError(err.message);
      });
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        api("/api/settings", {
          method: "POST",
          json: { smsOptIn, phone: smsPhone, emailInvites, emailAssignments, emailReminders },
        })
          .then(() => setNotice(smsOptIn ? "Text updates are on for this number." : "Text updates are off."))
          .catch((err) => setError(err.message));
      }}
    >
      <h3 className="text-sm font-semibold text-white">Notifications</h3>
      <p className="text-xs text-slate-400">An organizer typing your number is not consent. You choose texts here.</p>
      <label className="flex items-center gap-2 text-sm text-slate-200">
        <input type="checkbox" checked={emailInvites} onChange={(e) => setEmailInvites(e.target.checked)} />
        Email invitations
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-200">
        <input type="checkbox" checked={emailAssignments} onChange={(e) => setEmailAssignments(e.target.checked)} />
        Email when my recipient is ready
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-200">
        <input type="checkbox" checked={emailReminders} onChange={(e) => setEmailReminders(e.target.checked)} />
        Email reminders
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-200">
        <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} />
        Text me. I agree to receive these messages.
      </label>
      <input className="glass-input w-full" aria-label="Phone for texts" placeholder="Phone for texts" value={smsPhone} onChange={(e) => setSmsPhone(e.target.value)} />
      <button className="btn btn-secondary text-xs" type="submit">Save notifications</button>
      {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
      {notice && <p className="text-sm text-emerald-300">{notice}</p>}
    </form>
  );
}
