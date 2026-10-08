import { Capacitor } from "@capacitor/core";

export function onDevice() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function shareLink({ title, text, url }) {
  if (onDevice()) {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title, text, url, dialogTitle: title || "Share" });
    return "shared";
  }
  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({ title, text, url });
    return "shared";
  }
  return "unavailable";
}

/** Store links leave the app. iOS uses the in-app Safari sheet, not a purchase view. */
export async function openExternal(url) {
  const href = String(url || "");
  if (!/^https?:\/\//i.test(href)) return;
  if (onDevice()) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: href });
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer");
}

export function calendarFile({ title, date, details }) {
  const day = String(date || "").replace(/-/g, "");
  const safeTitle = String(title || "Secret Gifter exchange").replace(/[\r\n,;]/g, " ");
  const safeDetails = String(details || "Gift exchange").replace(/[\r\n]/g, " ");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Secret Gifter//Exchange//EN",
    "BEGIN:VEVENT",
    `UID:${day}-${safeTitle.slice(0, 24).replace(/\W/g, "")}@thesecretgifter.com`,
    `DTSTAMP:${day}T150000Z`,
    `DTSTART;VALUE=DATE:${day}`,
    `SUMMARY:${safeTitle}`,
    `DESCRIPTION:${safeDetails}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export async function addExchangeToCalendar({ title, date, details }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) {
    return { added: false, reason: "Add a gift date first." };
  }
  const ics = calendarFile({ title, date, details });
  if (onDevice()) {
    const { Directory, Encoding, Filesystem } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    await Filesystem.writeFile({
      path: "secret-gifter-exchange.ics",
      data: ics,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    const file = await Filesystem.getUri({ path: "secret-gifter-exchange.ics", directory: Directory.Cache });
    await Share.share({
      title: title || "Gift exchange",
      text: details || "Gift exchange date",
      url: file.uri,
      dialogTitle: "Add to Calendar",
    });
    return { added: true };
  }
  const blob = new Blob([ics], { type: "text/calendar" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = "secret-gifter-exchange.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
  return { added: true };
}

function notificationId(key) {
  let hash = 0;
  for (const char of String(key)) hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
  return hash || 1;
}

/** Local notification the day before the gift date. It never names a recipient. */
export async function scheduleLocalReminder({ id, title, date }) {
  if (!onDevice()) return { scheduled: false, reason: "Local reminders are on the iPhone app." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) {
    return { scheduled: false, reason: "Add a gift date first." };
  }
  const when = new Date(`${date}T09:00:00`);
  when.setDate(when.getDate() - 1);
  if (when.getTime() <= Date.now()) return { scheduled: false, reason: "That reminder time has already passed." };
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== "granted") return { scheduled: false, reason: "Notifications are off for Secret Gifter." };
  await LocalNotifications.schedule({
    notifications: [{
      id: notificationId(id || title),
      title: "Secret Gifter reminder",
      body: `${title || "Your exchange"} is coming up. Open Secret Gifter. This notice does not name a recipient.`,
      schedule: { at: when },
    }],
  });
  return { scheduled: true };
}
