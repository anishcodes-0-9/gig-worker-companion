// UI strings. English is bundled because it is the default and the fallback for
// any missing key. The other languages (locales/*.js) are loaded on demand, so
// each visitor downloads only the language they use. Hindi was written for this
// app; Punjabi, Tamil and Marathi are machine translations. None has been
// reviewed by a professional translator, and the UI says so.

export const LANGS = { en: "English", hi: "हिन्दी", pa: "ਪੰਜਾਬੀ", ta: "தமிழ்", mr: "मराठी" };
export const LANG_CODES = Object.keys(LANGS);

const STRINGS = {
  en: {
    appTitle: "Gig Worker Companion",
    tagline: "Know what you earned, what you are owed, and where to get help.",
    skip: "Skip to content",
    language: "Language",
    sections: "Sections",
    tabEarnings: "Earnings",
    tabSupport: "Support Desk",
    loadError: "Could not load your records.",
    retry: "Retry",
    footer: "General information only, not legal advice.",
    translationNotice: "",
    storageTemporary:
      "Demo storage: your records are kept separately for this browser, but only in temporary server memory, so they can disappear at any time. Do not enter personal details.",
    storagePersistent:
      "Your records are saved on the server for up to 90 days and linked to this browser by a private cookie. There is no login: clearing cookies or switching browsers means you lose access.",
    storageLocal: "Records are stored in a file on the computer running this app, separately for each browser.",

    loading: "Loading your records…",
    summary: "Summary",
    netWeek: "Net this week",
    netWeekNote: "{gross} earned − {expenses} expenses",
    perHour: "Net per hour (this week)",
    hoursLogged: "{hours} hours logged",
    logHours: "Log hours to see this",
    owed: "Still owed to you",
    unpaid7: "{amount} unpaid for 7+ days",
    nothingUnpaid: "Nothing unpaid for 7+ days",
    paidOut: "Paid out so far",
    netAllTime: "Net earnings all time: {amount}",
    byPlatform: "Payouts by platform",
    earnedPaid: "Earned {earned} · Paid {paid}",
    surplus: "Payouts exceed logged earnings by {amount}. You may be missing an earnings entry.",
    owedAmount: "{amount} owed",
    oldestUnpaid: "oldest unpaid: {days} days",
    draftComplaint: "Draft complaint",
    fifoHint:
      "Payouts are matched to your oldest earnings first. Platforms often pay on a weekly or longer cycle, so check your platform's payout terms before treating an amount as late.",
    logEarnings: "Log earnings",
    recordPayout: "Record a payout received",
    date: "Date",
    platform: "Platform",
    platformOther: "Other",
    choose: "Choose…",
    earned: "Earned (₹)",
    received: "Amount received (₹)",
    expenses: "Fuel & expenses (₹)",
    hours: "Hours worked",
    hoursHint: "Optional, used for ₹/hour",
    note: "Note",
    optional: "Optional",
    saving: "Saving…",
    saveEarnings: "Save earnings",
    savePayout: "Save payout",
    earningsSaved: "Earnings saved.",
    payoutSaved: "Payout saved.",
    saveFailed: "Could not save. Please try again.",
    recentEarnings: "Recent earnings",
    recentPayouts: "Recent payouts",
    hoursShort: "{hours}h",
    expensesShort: "expenses {amount}",
    delete: "Delete",
    deleteLabel: "Delete {amount} {platform} {date}",
    confirmDelete: "Delete this record? This cannot be undone.",
    deleted: "Record deleted.",
    deleteFailed: "Could not delete.",
    empty: "No records yet. Log your first day's earnings above to get started.",

    askTitle: "Ask the Support Desk",
    askIntro: "Safety, worker rights, welfare schemes and documents.",
    emergencyNow: "In an emergency, call 112 now.",
    emergencyLimit: "This tool matches keywords and cannot detect every emergency.",
    aiMode: "AI mode (Google Gemini).",
    aiModeText:
      "The AI summary is generated from the guide entries shown with it, and can still be wrong. The entries are the reference; check official sources before acting.",
    demoMode: "Demo mode — no AI.",
    demoFallback: "The AI answer was unavailable or did not pass our checks, so these are guide entries only.",
    demoNoKey: "No API key is configured, so you get guide entries instead of AI-written answers.",
    demoEnable: "AI answers are not switched on for this server.",
    emergencyCall: "If you are in danger or someone is hurt, call now:",
    aiSummary: "AI answer, based only on the guide entries below",
    noAnswer: "I don't have a verified answer for that. Try rephrasing, or pick one of the topics I cover:",
    question: "Your question",
    questionHint: "You can ask in any of the app's languages.",
    searching: "Searching…",
    ask: "Ask",
    askFailed: "Could not get an answer. Please try again.",
    exampleQuestions: "Example questions",
    examples: [
      "I had an accident while delivering",
      "How do I register on e-Shram?",
      "My payout has been pending for two weeks",
      "My account was blocked",
    ],
    disclaimer:
      "Guide entries are plain-language summaries written for this app. They have not been reviewed or endorsed by any government body, and schemes and rules change. Confirm details on the official site before acting.",

    grievanceTitle: "Draft a complaint letter",
    grievanceIntro:
      "A simple-language letter built from a template. Review it and send it to the platform's grievance officer yourself; this app does not send anything.",
    name: "Your name",
    issue: "Issue",
    issue_unpaid: "Unpaid earnings",
    issue_deactivation: "Account deactivation",
    issue_deduction: "Unexplained deductions",
    issue_safety: "Safety incident",
    issue_other: "Other issue",
    workerId: "Partner / worker ID",
    amountInvolved: "Amount involved (₹)",
    since: "Since (date)",
    details: "What happened?",
    prefillDetails: "My earnings from these dates have not been paid.",
    creating: "Creating…",
    createLetter: "Create letter",
    letterFailed: "Could not create the letter.",
    yourLetter: "Your letter",
    letterLabel: "Generated complaint letter (editable)",
    copy: "Copy letter",
    copied: "Copied to clipboard.",
    copyFailed: "Copy failed. Select the text and copy it manually.",
    polishLabel: "Let AI tidy the wording of “What happened?” (facts are checked against what you typed)",
    letterAi:
      "Gemini reworded only the details paragraph. Names, dates, amounts and IDs come from your form, and the new wording was checked to keep the same numbers. Read every line before sending.",
    letterFallback: "AI wording was unavailable or did not pass our fact check, so your own words are used.",
    letterLanguage: "Letter language",
  },
};

// Server messages are English; the UI translates the ones it knows.
const MESSAGES = {};

// One static import() per language, so the bundler emits a separate chunk for each.
const LOADERS = {
  hi: () => import("./locales/hi.js").then((m) => [m.STRINGS_HI, m.MESSAGES_HI]),
  pa: () => import("./locales/pa.js").then((m) => [m.STRINGS_PA, m.MESSAGES_PA]),
  ta: () => import("./locales/ta.js").then((m) => [m.STRINGS_TA, m.MESSAGES_TA]),
  mr: () => import("./locales/mr.js").then((m) => [m.STRINGS_MR, m.MESSAGES_MR]),
};

/** Fetch and register a language's strings. No-op for English or a loaded language. */
export async function loadLocale(lang) {
  if (!Object.hasOwn(LOADERS, lang) || Object.hasOwn(STRINGS, lang)) return;
  const [strings, messages] = await LOADERS[lang]();
  STRINGS[lang] = strings;
  MESSAGES[lang] = messages;
}

/** Look up a UI string, falling back to English, and fill {placeholders}. */
export function translate(lang, key, vars = {}) {
  const value = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  if (typeof value !== "string") return value;
  return value.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

/** Translate a known English server message; unknown messages are shown as-is. */
export function translateMessage(lang, message) {
  return MESSAGES[lang]?.[message] ?? message;
}

export { STRINGS, MESSAGES };
