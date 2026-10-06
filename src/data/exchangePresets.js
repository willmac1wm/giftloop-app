/**
 * Occasion, date, and budget presets for the Secret Santa create wizard.
 * Dates are computed (or, for Hanukkah, taken from a short civil-date table)
 * so chips stay accurate past the year the wizard was written.
 */

export const PRIMARY_OCCASIONS = [
  { id: 'secret-santa', label: 'Secret Santa' },
  { id: 'christmas', label: 'Christmas' },
  { id: 'halloween', label: 'Halloween' },
  { id: 'thanksgiving', label: 'Thanksgiving' },
  { id: 'valentines', label: "Valentine's Day" },
  { id: 'other', label: 'Other' },
];

export const MORE_OCCASIONS = [
  { id: 'hanukkah', label: 'Hanukkah' },
  { id: 'new-years', label: "New Year's Eve" },
  { id: 'kwanzaa', label: 'Kwanzaa' },
  { id: 'mothers-day', label: "Mother's Day" },
  { id: 'fathers-day', label: "Father's Day" },
  { id: 'easter', label: 'Easter' },
];

export const OCCASIONS = [...PRIMARY_OCCASIONS, ...MORE_OCCASIONS];

export const BUDGET_PRESETS = ['$20', '$25', '$30', '$50', '$100'];

/** First night of Hanukkah (civil date, local). Years outside the table have no preset. */
const HANUKKAH_START = {
  2025: [11, 14],
  2026: [11, 4],
  2027: [11, 24],
  2028: [11, 12],
  2029: [11, 1],
  2030: [11, 20],
  2031: [11, 9],
  2032: [10, 27],
};

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatLongDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function occasionById(id) {
  return OCCASIONS.find((item) => item.id === id) || null;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

/** Year in which month/day (0-indexed month) is still upcoming, else next year. */
function yearForMonthDay(today, month, day) {
  const thisYear = new Date(today.getFullYear(), month, day);
  if (thisYear < startOfDay(today)) return today.getFullYear() + 1;
  return today.getFullYear();
}

function nthWeekdayOfMonth(year, month, weekday, n) {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

/** Anonymous Gregorian computus. Month is 0-indexed in the returned Date. */
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function saturdayOnOrBefore(date) {
  const delta = (date.getDay() + 1) % 7;
  return addDays(date, -delta);
}

function previousSaturday(date) {
  const delta = (date.getDay() + 1) % 7 || 7;
  return addDays(date, -delta);
}

function uniqueSorted(dates) {
  const seen = new Set();
  return dates
    .filter((date) => {
      const iso = toISODate(date);
      if (seen.has(iso)) return false;
      seen.add(iso);
      return true;
    })
    .sort((a, b) => a - b);
}

function anchorDates(occasionId, today) {
  const y = today.getFullYear();

  if (occasionId === 'secret-santa' || occasionId === 'christmas') {
    const year = yearForMonthDay(today, 11, 25);
    const eve = new Date(year, 11, 24);
    const day = new Date(year, 11, 25);
    return [previousSaturday(eve), eve, day];
  }

  if (occasionId === 'halloween') {
    const year = yearForMonthDay(today, 9, 31);
    const day = new Date(year, 9, 31);
    return [previousSaturday(day), addDays(day, -1), day].filter(
      (d) => d.getMonth() === 9,
    );
  }

  if (occasionId === 'thanksgiving') {
    let year = y;
    let day = nthWeekdayOfMonth(year, 10, 4, 4);
    if (day < startOfDay(today)) {
      year += 1;
      day = nthWeekdayOfMonth(year, 10, 4, 4);
    }
    return [addDays(day, -1), day, addDays(day, 1)];
  }

  if (occasionId === 'valentines') {
    const year = yearForMonthDay(today, 1, 14);
    const day = new Date(year, 1, 14);
    return [saturdayOnOrBefore(addDays(day, day.getDay() === 6 ? 0 : -1)), addDays(day, -1), day].filter(
      (d) => d.getMonth() === 1,
    );
  }

  if (occasionId === 'hanukkah') {
    let year = y;
    let start = HANUKKAH_START[year];
    if (!start || new Date(year, start[0], start[1]) < startOfDay(today)) {
      year += 1;
      start = HANUKKAH_START[year];
    }
    if (!start) return [];
    const day = new Date(year, start[0], start[1]);
    return [day, addDays(day, 1), previousSaturday(day)].filter((d) => d >= startOfDay(today) || toISODate(d) === toISODate(day));
  }

  if (occasionId === 'new-years') {
    const year = yearForMonthDay(today, 11, 31);
    const day = new Date(year, 11, 31);
    return [previousSaturday(day), addDays(day, -1), day];
  }

  if (occasionId === 'kwanzaa') {
    const year = yearForMonthDay(today, 11, 26);
    const day = new Date(year, 11, 26);
    return [day, addDays(day, 1), new Date(year, 11, 31)];
  }

  if (occasionId === 'mothers-day') {
    let year = y;
    let day = nthWeekdayOfMonth(year, 4, 0, 2);
    if (day < startOfDay(today)) {
      year += 1;
      day = nthWeekdayOfMonth(year, 4, 0, 2);
    }
    return [previousSaturday(day), day];
  }

  if (occasionId === 'fathers-day') {
    let year = y;
    let day = nthWeekdayOfMonth(year, 5, 0, 3);
    if (day < startOfDay(today)) {
      year += 1;
      day = nthWeekdayOfMonth(year, 5, 0, 3);
    }
    return [previousSaturday(day), day];
  }

  if (occasionId === 'easter') {
    let year = y;
    let day = easterSunday(year);
    if (day < startOfDay(today)) {
      year += 1;
      day = easterSunday(year);
    }
    return [previousSaturday(day), day];
  }

  return [];
}

export function datePresetsFor(occasionId, today = new Date()) {
  return uniqueSorted(anchorDates(occasionId, today)).slice(0, 3).map((date) => {
    const iso = toISODate(date);
    return { id: iso, iso, label: formatLongDate(iso) };
  });
}

export function defaultTitle(occasionLabel, exchangeDate) {
  const label = (occasionLabel || '').trim();
  if (!label) return '';
  const year = exchangeDate ? exchangeDate.slice(0, 4) : String(new Date().getFullYear());
  return `${label} ${year}`;
}

export function defaultInviteMessage(event) {
  const title = (event.title || '').trim() || defaultTitle(event.occasionLabel, event.exchangeDate) || 'this Secret Santa';
  const when = formatLongDate(event.exchangeDate);
  const budget = (event.budget || '').trim();
  let message = `You're invited to ${title}.`;
  if (when) message += ` We'll celebrate on ${when}.`;
  if (budget) message += ` The gift budget is ${budget}.`;
  message += ' Open your private link to see who you drew. No account needed.';
  return message;
}

export function isDetailsComplete(event) {
  if (!event.occasion) return false;
  if (event.occasion === 'other' && !(event.occasionLabel || '').trim()) return false;
  if (!event.exchangeDate) return false;
  if (!(event.budget || '').trim()) return false;
  return true;
}
