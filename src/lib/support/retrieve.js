import { KB, EMERGENCY_NUMBERS } from "./kb.js";
import { KB_HI } from "./kb.hi.js";

const STOP = new Set([
  "the", "a", "an", "is", "are", "was", "to", "of", "and", "or", "in", "on", "for", "my", "me", "i", "it",
  "do", "does", "can", "how", "what", "when", "where", "why", "with", "about", "be", "am", "have", "has",
  "get", "got", "if", "at", "by", "from", "this", "that", "you", "your", "we", "they", "them", "not",
  // Hindi (after nukta removal, see normalize)
  "है", "हैं", "था", "थी", "थे", "मेरा", "मेरी", "मेरे", "मुझे", "मैं", "मैंने", "क्या", "कैसे", "कब", "कहाँ",
  "क्यों", "के", "की", "का", "में", "से", "को", "और", "या", "हो", "पर", "नहीं", "यह", "वह", "ये", "वो", "गया",
  "गई", "गए", "कर", "करें", "करूँ", "करना", "लिए", "साथ", "तो", "भी", "अपना", "अपनी", "आप", "तक", "एक",
]);

// Devanagari nukta letters (ज़/ज, फ़/फ) are often typed either way; drop the nukta
// so both spellings match. NFD also splits precomposed nukta letters.
const normalize = (text) => text.normalize("NFD").replace(/़/g, "").toLowerCase();

// Keyword-based and deliberately conservative. It cannot catch every emergency,
// which is why the UI always shows "call 112" regardless of this check.
const EMERGENCY_RE =
  /\b(accident|unconscious|emergency|attack(ed)?|assault(ed)?|molest\w*|stalk\w*|following me|threat\w*|kidnap\w*|in danger|help me|not safe|unsafe|injured|robbed|beaten|crash\w*|hurt|hit me|harass\w*|fainted|chest pain|bleed\w*|bachao|madad)\b/i;
// \b does not work for Devanagari, so Hindi terms are matched as substrings.
const EMERGENCY_HI_RE = new RegExp(
  ["दुर्घटना", "एक्सीडेंट", "हमला", "मारपीट", "घायल", "चोट", "खून", "बचाओ", "मदद करो", "खतरे", "खतरा", "धमकी",
    "छेड़छाड़", "पीछा कर", "बेहोश", "उत्पीड़न", "असुरक्षित"].map(normalize).join("|"),
);

const tokenize = (text) =>
  normalize(text)
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.replace(/-/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t));

const stem = (t) => t.replace(/(ing|ed|es|s)$/, "");
const terms = (text) => tokenize(text).map(stem);

const index = KB.map((entry) => {
  const hi = KB_HI[entry.id];
  return {
    entry,
    keywords: new Set(terms(`${entry.keywords} ${hi?.keywords ?? ""}`)),
    title: new Set(terms(`${entry.title} ${hi?.title ?? ""}`)),
  };
});

export function isEmergency(question) {
  return EMERGENCY_RE.test(question) || EMERGENCY_HI_RE.test(normalize(question));
}

/** Rank KB entries by keyword overlap (title matches count double), English or Hindi. */
export function retrieve(question, limit = 2) {
  const query = [...new Set(terms(question))];
  return index
    .map(({ entry, keywords, title }) => ({
      entry,
      score: query.reduce((s, t) => s + (keywords.has(t) ? 1 : 0) + (title.has(t) ? 2 : 0), 0),
    }))
    .filter((r) => r.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.entry);
}

export { EMERGENCY_NUMBERS };
