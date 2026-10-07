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
  if (channel === "email" && prefs && kind === "reminder" && prefs.emailReminders === false) {
    return { send: false, reason: "Reminder email is turned off." };
  }
  if (sentCount >= MAX_SENDS) return { send: false, reason: "Send limit reached." };
  if (sentCount > 0 && resend !== true && kind !== "reminder") return { send: false, reason: "Already sent." };
  const hours = quietHours(now, timeZone);
  if (hours.quiet) {
    return { send: false, defer: true, reason: "Quiet hours. This notice waits until morning.", runAt: hours.runAt };
  }
  return { send: true, reason: "" };
}

export function localHour(now, timeZone) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(now));
}

export function quietHours(now = new Date(), timeZone = "America/Los_Angeles") {
  const hour = localHour(now, timeZone);
  if (hour >= 8 && hour < 21) return { quiet: false, runAt: now };
  for (let add = 1; add <= 18; add += 1) {
    const candidate = new Date(now.getTime() + add * 60 * 60 * 1000);
    if (localHour(candidate, timeZone) === 8) return { quiet: true, runAt: candidate };
  }
  return { quiet: true, runAt: new Date(now.getTime() + 8 * 60 * 60 * 1000) };
}

export function reminderRunAt(eventDate) {
  const text = String(eventDate || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const when = new Date(`${text}T15:00:00.000Z`);
  when.setUTCDate(when.getUTCDate() - 1);
  if (Number.isNaN(when.getTime())) return null;
  return when;
}
