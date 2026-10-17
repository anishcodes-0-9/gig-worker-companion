import { KB, EMERGENCY_NUMBERS } from "./kb.js";
import { KB_TRANSLATIONS, EXTRA_EMERGENCY_TERMS, EXTRA_STOP_WORDS } from "./kb.i18n.js";

// Devanagari (ज़/ज) and Gurmukhi (ਜ਼/ਜ) nukta letters are often typed either way;
// drop the nukta so both spellings match. NFD also splits precomposed nukta letters.
const normalize = (text) => text.normalize("NFD").replace(/[\u093C\u0A3C]/g, "").toLowerCase();

const STOP = new Set([
  "the", "a", "an", "is", "are", "was", "to", "of", "and", "or", "in", "on", "for", "my", "me", "i", "it",
  "do", "does", "can", "how", "what", "when", "where", "why", "with", "about", "be", "am", "have", "has",
  "get", "got", "if", "at", "by", "from", "this", "that", "you", "your", "we", "they", "them", "not",
  // Hindi (after nukta removal, see normalize)
  "है", "हैं", "था", "थी", "थे", "मेरा", "मेरी", "मेरे", "मुझे", "मैं", "मैंने", "क्या", "कैसे", "कब", "कहाँ",
  "क्यों", "के", "की", "का", "में", "से", "को", "और", "या", "हो", "पर", "नहीं", "यह", "वह", "ये", "वो", "गया",
  "गई", "गए", "कर", "करें", "करूँ", "करना", "लिए", "साथ", "तो", "भी", "अपना", "अपनी", "आप", "तक", "एक",
  ...EXTRA_STOP_WORDS.map(normalize),
]);

// Keyword-based and deliberately conservative. It cannot catch every emergency,
// which is why the UI always shows "call 112" regardless of this check.
const EMERGENCY_RE =
  /\b(accident|unconscious|emergency|attack(ed)?|assault(ed)?|molest\w*|stalk\w*|following me|threat\w*|kidnap\w*|in danger|help me|not safe|unsafe|injured|robbed|beaten|crash\w*|hurt|hit me|harass\w*|fainted|chest pain|bleed\w*|bachao|madad)\b/i;
// \b does not work for Indic scripts, so these terms are matched as substrings.
const EMERGENCY_TERMS = [
  "दुर्घटना", "एक्सीडेंट", "हमला", "मारपीट", "घायल", "चोट", "खून", "बचाओ", "मदद करो", "खतरे", "खतरा", "धमकी",
  "छेड़छाड़", "पीछा कर", "बेहोश", "उत्पीड़न", "असुरक्षित",
  ...EXTRA_EMERGENCY_TERMS,
]
  .map(normalize)
  .filter((term) => term.length >= 3); // a blank or tiny term would flag everything

const tokenize = (text) =>
  normalize(text)
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.replace(/-/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t));

const stem = (t) => t.replace(/(ing|ed|es|s)$/, "");
const terms = (text) => tokenize(text).map(stem);

const translations = Object.values(KB_TRANSLATIONS);
const index = KB.map((entry) => {
  const local = translations.map((t) => t.entries[entry.id]).filter(Boolean);
  return {
    entry,
    keywords: [...new Set(terms([entry.keywords, ...local.map((l) => l.keywords)].join(" ")))],
    title: [...new Set(terms([entry.title, ...local.map((l) => l.title)].join(" ")))],
  };
});

// Tamil and Marathi (and to a lesser degree Hindi and Punjabi) attach endings
// to words, so Indic-script terms also match when they share a long prefix
// (e.g. விபத்து / விபத்தில்). Latin-script terms must match exactly after stemming.
const isLatin = (t) => /^[a-z0-9]+$/.test(t);
function commonPrefix(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}
const sameWord = (q, k) =>
  q === k ||
  (!isLatin(q) && !isLatin(k) && commonPrefix(q, k) >= Math.max(4, Math.ceil(0.6 * Math.min(q.length, k.length))));
const hits = (list, q) => list.some((k) => sameWord(q, k));

export function isEmergency(question) {
  const text = normalize(question);
  return EMERGENCY_RE.test(question) || EMERGENCY_TERMS.some((term) => text.includes(term));
}

/** Rank KB entries by keyword overlap (title matches count double), in any supported language. */
export function retrieve(question, limit = 2) {
  const query = [...new Set(terms(question))];
  return index
    .map(({ entry, keywords, title }) => ({
      entry,
      score: query.reduce((s, t) => s + (hits(keywords, t) ? 1 : 0) + (hits(title, t) ? 2 : 0), 0),
    }))
    .filter((r) => r.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.entry);
}

export { EMERGENCY_NUMBERS };
