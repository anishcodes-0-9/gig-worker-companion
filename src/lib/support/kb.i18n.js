// Translated guide content per language, in one shape. English lives in kb.js.
// Hindi was written for this app; Punjabi, Tamil and Marathi are machine
// translations. None has been reviewed by a professional translator.

import { KB_HI, CATEGORIES_HI, EMERGENCY_LABELS_HI } from "./kb.hi.js";
import { KB_PA, CATEGORIES_PA, EMERGENCY_LABELS_PA, EMERGENCY_TERMS_PA, STOP_WORDS_PA } from "./kb.pa.js";
import { KB_TA, CATEGORIES_TA, EMERGENCY_LABELS_TA, EMERGENCY_TERMS_TA, STOP_WORDS_TA } from "./kb.ta.js";
import { KB_MR, CATEGORIES_MR, EMERGENCY_LABELS_MR, EMERGENCY_TERMS_MR, STOP_WORDS_MR } from "./kb.mr.js";

export const KB_TRANSLATIONS = {
  hi: { entries: KB_HI, categories: CATEGORIES_HI, emergencyLabels: EMERGENCY_LABELS_HI },
  pa: { entries: KB_PA, categories: CATEGORIES_PA, emergencyLabels: EMERGENCY_LABELS_PA },
  ta: { entries: KB_TA, categories: CATEGORIES_TA, emergencyLabels: EMERGENCY_LABELS_TA },
  mr: { entries: KB_MR, categories: CATEGORIES_MR, emergencyLabels: EMERGENCY_LABELS_MR },
};

/** Emergency substrings and stop words for the machine-translated languages (Hindi's are in retrieve.js). */
export const EXTRA_EMERGENCY_TERMS = [...EMERGENCY_TERMS_PA, ...EMERGENCY_TERMS_TA, ...EMERGENCY_TERMS_MR];
export const EXTRA_STOP_WORDS = [...STOP_WORDS_PA, ...STOP_WORDS_TA, ...STOP_WORDS_MR];
