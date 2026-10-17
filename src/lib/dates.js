// Dates are plain ISO strings (YYYY-MM-DD). All arithmetic is done in UTC so it
// is unaffected by the server's time zone or daylight saving.

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

const parse = (iso) => Date.parse(`${iso}T00:00:00Z`);

/** @param {unknown} value */
export function isIsoDate(value) {
  if (typeof value !== "string" || !ISO_RE.test(value)) return false;
  const time = parse(value);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
}

/** @param {string} iso @param {number} days */
export function addDays(iso, days) {
  return new Date(parse(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffDays(from, to) {
  return Math.round((parse(to) - parse(from)) / DAY_MS);
}

/** Monday of the week containing `iso`. */
export function weekStart(iso) {
  const dayOfWeek = (new Date(parse(iso)).getUTCDay() + 6) % 7; // Monday = 0
  return addDays(iso, -dayOfWeek);
}

// The app serves workers in India; hosts such as Vercel run in UTC, which would
// make "today" lag by up to 5.5 hours. Override with APP_TIME_ZONE if needed.
const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Kolkata";

/** The calendar date in the app's time zone, as ISO (en-CA formats as YYYY-MM-DD). */
export function toIsoDate(date = new Date(), timeZone = APP_TIME_ZONE) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Locale-aware display of an ISO date, e.g. "3 Mar 2026". */
export function formatDate(iso, locale = "en-IN") {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(parse(iso)));
}
