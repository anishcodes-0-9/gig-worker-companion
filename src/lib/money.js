// All money is stored as integer minor units (paise). No floating point is used
// for arithmetic; Number is only used for exact integer operations.

const MONEY_RE = /^\d{1,9}(\.\d{1,2})?$/;

/**
 * Parse a user-entered amount like "1,250.50" into integer paise.
 * @param {unknown} input
 * @returns {number | null} null when the input is not a valid non-negative amount
 */
export function parseMoneyToMinor(input) {
  const text = String(input ?? "").trim().replace(/,/g, "");
  if (!MONEY_RE.test(text)) return null;
  const [major, fraction = ""] = text.split(".");
  return Number(major) * 100 + Number(fraction.padEnd(2, "0"));
}

/**
 * Format integer paise for display, e.g. 125050 -> "₹1,250.50".
 * @param {number} minor
 * @param {string} [locale]
 */
export function formatMinor(minor, locale = "en-IN") {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const major = Math.trunc(abs / 100);
  const cents = abs % 100;
  const grouped = new Intl.NumberFormat(locale).format(major);
  return `${sign}₹${grouped}${cents ? `.${String(cents).padStart(2, "0")}` : ""}`;
}
