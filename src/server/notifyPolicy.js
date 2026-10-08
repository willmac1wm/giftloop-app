import { timingPreferences, inQuietHours } from "../retention/notificationTiming.js";
export const MAX_SENDS = 3;

export function deliveryDecision({ channel, kind, prefs, sentCount = 0, resend = false, memberStatus = "accepted", now = new Date(), timeZone = "America/Los_Angeles" }) {
  if (memberStatus === "declined") return { send: false, reason: "This person declined the exchange." };
  if (channel === "sms") {
    if (!prefs?.smsOptIn || prefs?.smsStoppedAt) {
      return { send: false, reason: "This person has not opted in to texts." };
    }
    if (!prefs?.phone) return { send: false, reason: "No address on file." };
  }
  if (channel === "email" && prefs && kind === "assignment" && prefs.emailAssignments === false) {
    return { send: false, reason: "Assignment email is turned off." };
  }
  if (channel === "email" && prefs && kind === "invite" && prefs.emailInvites === false) {
    return { send: false, reason: "Invitation email is turned off." };
  }
  if (channel === "email" && prefs && (kind === "reminder" || kind === "reunion") && prefs.emailReminders === false) {
    return { send: false, reason: "Reminder email is turned off." };
  }
  if (sentCount >= MAX_SENDS) return { send: false, reason: "Send limit reached." };
  if (sentCount > 0 && resend !== true && kind !== "reminder") return { send: false, reason: "Already sent." };
  const timing = timingPreferences({}, prefs || {});
  const hours = quietHours(now, timing.timezone || timeZone, timing.quietStart, timing.quietEnd);
  if (hours.quiet) {
    return { send: false, defer: true, reason: "Quiet hours. This notice waits until morning.", runAt: hours.runAt };
  }
  return { send: true, reason: "" };
}

export function localHour(now, timeZone) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(now));
}

export function quietHours(now = new Date(), timeZone = "America/Los_Angeles", start = 21, end = 8) {
  if (!inQuietHours(localHour(now, timeZone), start, end)) return { quiet: false, runAt: now };
  // Quarter-hour boundaries match the scheduler and fractional time zones.
  let candidate = new Date(Math.ceil((now.getTime() + 1) / 900000) * 900000);
  for (let step = 0; step < 104; step += 1) {
    if (!inQuietHours(localHour(candidate, timeZone), start, end)) return { quiet: true, runAt: candidate };
    candidate = new Date(candidate.getTime() + 900000);
  }
  return { quiet: true, runAt: candidate };
}

export function reminderRunAt(eventDate) {
  const text = String(eventDate || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const when = new Date(`${text}T15:00:00.000Z`);
  when.setUTCDate(when.getUTCDate() - 1);
  if (Number.isNaN(when.getTime())) return null;
  return when;
}
