/**
 * The reminder worker should not wake Netlify Database when nothing is due.
 * A Blobs marker stores the next pending run. The scheduled function reads
 * that marker first and opens the database only when a job is due.
 * If Blobs is unavailable, the worker checks the database, which is what
 * local tests do.
 */

export function shouldOpenDatabase(marker, now = new Date()) {
  if (!marker || typeof marker !== "object" || !("nextAt" in marker)) return true;
  if (!marker.nextAt) return false;
  const time = new Date(marker.nextAt).getTime();
  if (!Number.isFinite(time)) return true;
  return time <= now.getTime();
}

async function markerStore() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "reminder-schedule", consistency: "strong" });
}

export async function reminderDue(now = new Date()) {
  try {
    const saved = await (await markerStore()).get("next-run", { type: "json" });
    return shouldOpenDatabase(saved, now);
  } catch {
    return true;
  }
}

export async function rememberReminder(runAt) {
  if (!runAt) return;
  const incoming = new Date(runAt).getTime();
  if (!Number.isFinite(incoming)) return;
  try {
    const store = await markerStore();
    const saved = await store.get("next-run", { type: "json" });
    const current = saved?.nextAt ? new Date(saved.nextAt).getTime() : null;
    if (current != null && Number.isFinite(current) && current <= incoming) return;
    await store.setJSON("next-run", { nextAt: new Date(incoming).toISOString() });
  } catch {
    // Tests and a machine without Blobs keep the database path.
  }
}

export async function refreshReminderMarker(runAt) {
  try {
    const nextAt = runAt ? new Date(runAt).toISOString() : null;
    await (await markerStore()).setJSON("next-run", { nextAt });
  } catch {
    // Same fallback as rememberReminder.
  }
}
