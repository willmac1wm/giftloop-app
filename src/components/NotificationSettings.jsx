import React, { useEffect, useState } from "react";
import { DEFAULT_TIMING } from "../retention/notificationTiming";
import { api } from "../account/api";

export default function NotificationSettings() {
  const [timing, setTiming] = useState({ ...DEFAULT_TIMING, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
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
        setTiming({ ...DEFAULT_TIMING, ...Object.fromEntries(Object.keys(DEFAULT_TIMING).map(key => [key, settings[key] ?? DEFAULT_TIMING[key]])), timezone: settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone });
        setLoaded(true);
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
        setNotice("");
        setBusy(true);
        api("/api/settings", {
          method: "POST",
          json: { ...timing, smsOptIn, phone: smsPhone, emailInvites, emailAssignments, emailReminders },
        })
          .then(() => setNotice("Notification preferences and reminder timing saved."))
          .catch((err) => setError(err.message))
          .finally(() => setBusy(false));
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
      <details className="rounded-lg border border-white/10 p-3">
        <summary className="cursor-pointer text-sm">Reminder timing & quiet hours</summary>
        <div className="space-y-3 mt-3">
          <p className="text-xs text-slate-400">One gift-date reminder when your organizer queues reminders. Seven days gives you time to shop; choose fourteen if you need shipping time. This does not estimate retailer delivery dates.</p>
          <label className="block text-sm">Remind me before the gift date
            <select className="glass-input w-full mt-1" value={timing.reminderDays} onChange={e => setTiming({ ...timing, reminderDays: Number(e.target.value) })}>
              {[1, 3, 7, 14].map(days => <option key={days} value={days}>{days === 1 ? '1 day before' : `${days} days before`}</option>)}
            </select>
          </label>
          <label className="block text-sm">Preferred reminder time<input className="glass-input w-full mt-1" type="time" step="900" required value={timing.reminderTime} onChange={e => setTiming({ ...timing, reminderTime: e.target.value })} /></label>
          <label className="block text-sm">My time zone<input className="glass-input w-full mt-1" list="notification-timezones" required value={timing.timezone} onChange={e => setTiming({ ...timing, timezone: e.target.value })} /></label>
          <datalist id="notification-timezones">{['UTC', ...(Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : ['America/New_York', 'America/Los_Angeles', 'Europe/London'])].map(zone => <option key={zone} value={zone} />)}</datalist>
          <div className="grid grid-cols-2 gap-2">{[['quietStart', 'Quiet hours start'], ['quietEnd', 'Messages resume']].map(([key, label]) => <label key={key} className="text-sm">{label}<select className="glass-input w-full mt-1" value={timing[key]} onChange={e => setTiming({ ...timing, [key]: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}</select></label>)}</div>
          <p className="text-xs text-slate-400">Quiet hours apply to Secret Gifter exchange emails and texts, including planning reminders. Sign-in emails are separate. Messages are checked about every 15 minutes, so delivery is not exact. If your chosen reminder time has already passed, an eligible reminder is sent at the next allowed time before the gift date ends.</p>
        </div>
      </details>
      <button className="btn btn-secondary text-xs" type="submit" disabled={busy || !loaded}>Save notifications</button>
      {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
      {notice && <p className="text-sm text-emerald-300">{notice}</p>}
    </form>
  );
}
