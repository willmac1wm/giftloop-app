export const MAX_SENDS = 3;

export function deliveryDecision({ channel, kind, prefs, sentCount = 0, resend = false, memberStatus = "accepted" }) {
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
  return { send: true, reason: "" };
}

export function reminderRunAt(eventDate) {
  const text = String(eventDate || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const when = new Date(`${text}T15:00:00.000Z`);
  when.setUTCDate(when.getUTCDate() - 1);
  if (Number.isNaN(when.getTime())) return null;
  return when;
}
