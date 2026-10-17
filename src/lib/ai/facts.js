// Fact extraction used to check model output against trusted text. These checks
// catch invented numbers and websites; they cannot prove prose is accurate, so
// the trusted text is always shown (or kept) alongside AI wording.

// Zero code points of the Indic digit blocks used by the app's languages.
const DIGIT_ZEROS = [0x0966 /* Devanagari */, 0x0a66 /* Gurmukhi */, 0x0be6 /* Tamil */];

/** Convert Devanagari, Gurmukhi and Tamil digits to ASCII 0-9. */
export function normalizeDigits(text) {
  return String(text).replace(/[०-९੦-੯௦-௯]/g, (d) => {
    const code = d.charCodeAt(0);
    const zero = DIGIT_ZEROS.find((z) => code >= z && code <= z + 9);
    return String(code - zero);
  });
}

// A digit run, allowing grouping commas (1,00,000) and single spaces or hyphens
// between groups (98765 43210, 1800-11-0001), so a long phone number or amount
// cannot hide as several short-looking pieces.
const NUMBER_RE = /\d(?:\d|,(?=\d)|[ -](?=\d))*/g;

/** Every number in the text as a digit string, e.g. "₹1,00,000 or 98765 43210" -> ["100000", "9876543210"]. */
export function numbersIn(text) {
  return (normalizeDigits(text).match(NUMBER_RE) ?? []).map((n) => n.replace(/[^\d]/g, ""));
}

const HOST_RE = /\b(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})\b/gi;

/** Website hosts and email domains mentioned in the text, lower-cased. */
export function hostsIn(text) {
  return [...String(text).matchAll(HOST_RE)].map((m) => m[1].toLowerCase());
}

const isYear = (n) => /^(19|20)\d\d$/.test(n);

/**
 * Reject an answer that mentions a website, or a number of 3+ digits (helpline,
 * phone, amount), that does not appear in the trusted text. Years are allowed.
 * @returns {string | null} the problem, or null if none was found
 */
export function unsupportedFacts(answer, trustedText) {
  const allowedHosts = new Set(hostsIn(trustedText));
  for (const host of hostsIn(answer)) {
    if (!allowedHosts.has(host)) return `unlisted website: ${host}`;
  }
  const allowedNumbers = new Set(numbersIn(trustedText));
  for (const n of numbersIn(answer)) {
    if (n.length >= 3 && !isYear(n) && !allowedNumbers.has(n)) return `unlisted number: ${n}`;
  }
  return null;
}
