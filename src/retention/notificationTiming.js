export const DEFAULT_TIMING = { timezone: '', reminderDays: 7, reminderTime: '09:00', quietStart: 21, quietEnd: 8 };
export function timingPreferences(body, existing = {}) {
  const values = Object.fromEntries(Object.entries(DEFAULT_TIMING).map(([key, fallback]) => [key, body[key] ?? existing[key] ?? fallback]));
  if (typeof values.timezone !== 'string' || values.timezone.length > 80) throw new Error('Choose a valid time zone.');
  if (values.timezone) {
    try { new Intl.DateTimeFormat('en', { timeZone: values.timezone }).format(); } catch { throw new Error('Choose a valid time zone.'); }
  }
  if (![1, 3, 7, 14].includes(values.reminderDays)) throw new Error('Choose 1, 3, 7, or 14 days before the gift date.');
  if (!/^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/.test(values.reminderTime)) throw new Error('Choose a reminder time in 15-minute increments.');
  for (const key of ['quietStart', 'quietEnd']) if (!Number.isInteger(values[key]) || values[key] < 0 || values[key] > 23) throw new Error('Choose valid quiet hours.');
  if (values.quietStart === values.quietEnd) throw new Error('Quiet hours must have different start and end times.');
  return values;
}
export function zonedParts(date, timezone) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(part => [part.type, part.value]));
}
export function localDay(date, timezone) {
  const p = zonedParts(date, timezone); return `${p.year}-${p.month}-${p.day}`;
}
export function inQuietHours(hour, start, end) {
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;
}
export function atLocalTime(day, time, timezone) {
  const target = `${day}T${time}`;
  const center = Date.parse(`${target}:00Z`);
  if (!Number.isFinite(center)) return null;
  // Scan quarter hours to handle fractional offsets, DST gaps and repeated hours.
  // Earliest occurrence wins on a fall-back; a missing time moves forward.
  const format = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  let next = null;
  for (let minutes = -18 * 60; minutes <= 18 * 60; minutes += 15) {
    const date = new Date(center + minutes * 60000);
    const p = Object.fromEntries(format.formatToParts(date).map(part => [part.type, part.value]));
    const label = `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
    if (label === target) return date;
    if (label > target && label.slice(0, 10) === day && (!next || label < next.label)) next = { date, label };
  }
  return next?.date || null;
}
export function scheduledGiftReminder(eventDate, prefs, fallbackZone = 'UTC') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate || '')) return null;
  const day = new Date(`${eventDate}T12:00:00Z`);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== eventDate) return null;
  const timing = timingPreferences({}, prefs || {});
  day.setUTCDate(day.getUTCDate() - timing.reminderDays);
  return atLocalTime(day.toISOString().slice(0,10), timing.reminderTime, timing.timezone || fallbackZone);
}

export function planningReminderPresets(eventDate, now = new Date()) {
  const inMonths = (months) => { const date = new Date(now); date.setMonth(date.getMonth() + months); date.setHours(9, 0, 0, 0); return date; };
  const presets = [{ label: 'In 1 month', date: inMonths(1) }, { label: 'In 6 months', date: inMonths(6) }];
  if (/^\d{4}-\d{2}-\d{2}$/.test(eventDate || '')) {
    const date = new Date(`${eventDate}T09:00:00`);
    if (Number.isFinite(date.getTime())) {
      date.setFullYear(date.getFullYear() + 1); date.setDate(date.getDate() - 42);
      if (date > now) presets.push({ label: "6 weeks before next year's gift date", date });
    }
  }
  return presets;
}
export function dateTimeInput(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
