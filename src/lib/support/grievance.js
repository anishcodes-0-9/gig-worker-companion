import { formatDate } from "../dates.js";
import { formatMinor, parseMoneyToMinor } from "../money.js";
import { ISSUES_PA, FRAME_PA } from "./grievance.pa.js";
import { ISSUES_TA, FRAME_TA } from "./grievance.ta.js";
import { ISSUES_MR, FRAME_MR } from "./grievance.mr.js";
import { ISSUE_KEYS } from "./issues.js";

// Letter templates in simple language. Each issue supplies the opening line,
// the request and the suggested enclosures; the frame is shared per language.
// English and Hindi are below; Punjabi, Tamil and Marathi are machine
// translations in grievance.<lang>.js.

const ISSUES = {
  en: {
    unpaid: {
      label: "Unpaid earnings",
      body: (c) =>
        `I am writing to complain that my earnings${c.amount ? ` of ${c.amount}` : ""}${c.since ? ` since ${c.since}` : ""} have not been paid to me.`,
      ask: "Please pay the full outstanding amount to my registered bank account and send me a statement showing how it was calculated.",
      enclosures: ["Earnings/trip records for the period", "Payout statements", "Screenshots of support tickets"],
    },
    deactivation: {
      label: "Account deactivation",
      body: () => "My partner account has been blocked or deactivated, and I have not been given a clear reason.",
      ask: "Please give me the reason in writing, review the decision, and restore my account. Please also release any earnings due to me.",
      enclosures: ["Screenshot of the deactivation notice", "Recent ratings and completion history", "Identity and licence copies"],
    },
    deduction: {
      label: "Unexplained deductions",
      body: (c) =>
        `Deductions${c.amount ? ` totalling ${c.amount}` : ""}${c.since ? ` since ${c.since}` : ""} have been made from my earnings without an adequate explanation.`,
      ask: "Please provide an itemised explanation of each deduction and refund any amount that was deducted in error.",
      enclosures: ["Payout statements showing the deductions", "Screenshots of support tickets"],
    },
    safety: {
      label: "Safety incident",
      body: () => "I experienced a safety incident while working on your platform.",
      ask: "Please investigate, take appropriate action, confirm what support or insurance cover is available to me, and tell me the outcome in writing.",
      enclosures: ["Photos/screenshots of the incident", "Medical records, if any", "Police report copy, if filed"],
    },
    other: {
      label: "Other issue",
      body: () => "I would like to raise a complaint about the following matter.",
      ask: "Please look into this and respond to me in writing with the action you will take.",
      enclosures: ["Any supporting screenshots or documents"],
    },
  },
  hi: {
    unpaid: {
      label: "बकाया कमाई",
      body: (c) =>
        `${c.since ? `${c.since} से ` : ""}मेरी${c.amount ? ` ${c.amount} की` : ""} कमाई का भुगतान अब तक नहीं हुआ है।`,
      ask: "कृपया पूरी बकाया रकम मेरे रजिस्टर्ड बैंक खाते में भेजें और हिसाब का स्टेटमेंट दें।",
      enclosures: ["उस अवधि की कमाई/ट्रिप का रिकॉर्ड", "भुगतान स्टेटमेंट", "सपोर्ट टिकट के स्क्रीनशॉट"],
    },
    deactivation: {
      label: "अकाउंट बंद होना",
      body: () => "मेरा पार्टनर अकाउंट ब्लॉक या बंद कर दिया गया है, और मुझे इसका साफ़ कारण नहीं बताया गया।",
      ask: "कृपया मुझे लिखित में कारण बताएँ, फ़ैसले की समीक्षा करें और मेरा अकाउंट फिर से चालू करें। मेरी बकाया कमाई भी जारी करें।",
      enclosures: ["अकाउंट बंद होने के नोटिस का स्क्रीनशॉट", "हाल की रेटिंग और काम पूरा करने का रिकॉर्ड", "पहचान पत्र और लाइसेंस की कॉपी"],
    },
    deduction: {
      label: "बिना कारण कटौती",
      body: (c) =>
        `${c.since ? `${c.since} से ` : ""}मेरी कमाई से${c.amount ? ` कुल ${c.amount} की` : ""} कटौती की गई है, जिसका ठीक कारण नहीं बताया गया।`,
      ask: "कृपया हर कटौती का कारण अलग-अलग बताएँ और ग़लती से काटी गई रकम वापस करें।",
      enclosures: ["कटौती दिखाने वाले भुगतान स्टेटमेंट", "सपोर्ट टिकट के स्क्रीनशॉट"],
    },
    safety: {
      label: "सुरक्षा घटना",
      body: () => "आपके प्लेटफ़ॉर्म पर काम करते समय मेरे साथ एक सुरक्षा से जुड़ी घटना हुई।",
      ask: "कृपया जाँच करें, उचित कार्रवाई करें, बताएँ कि मुझे कौन-सी सहायता या बीमा कवर मिल सकता है, और नतीजा लिखित में बताएँ।",
      enclosures: ["घटना की फ़ोटो/स्क्रीनशॉट", "मेडिकल रिकॉर्ड, अगर हों", "पुलिस रिपोर्ट की कॉपी, अगर दर्ज की हो"],
    },
    other: {
      label: "अन्य समस्या",
      body: () => "मैं नीचे लिखे मामले में शिकायत दर्ज करना चाहता/चाहती हूँ।",
      ask: "कृपया इसकी जाँच करें और लिखित में बताएँ कि आप क्या कार्रवाई करेंगे।",
      enclosures: ["कोई भी सहायक स्क्रीनशॉट या दस्तावेज़"],
    },
  },
  pa: ISSUES_PA,
  ta: ISSUES_TA,
  mr: ISSUES_MR,
};

const FRAME = {
  en: {
    date: "Date",
    to: (platform) => ["To,", `The Grievance Officer, ${platform}`],
    subject: (label, id) => `Subject: Complaint – ${label}${id ? ` (Partner ID: ${id})` : ""}`,
    salutation: "Respected Sir/Madam,",
    details: "Details:",
    request: "Request:",
    closing:
      "Please acknowledge this complaint, share a reference number, and respond within 15 days. If it is not resolved, I will escalate to the State Labour Department.",
    enclosures: "Enclosures:",
    signoff: "Yours sincerely,",
  },
  hi: {
    date: "तारीख़",
    to: (platform) => ["सेवा में,", `शिकायत अधिकारी, ${platform}`],
    subject: (label, id) => `विषय: शिकायत – ${label}${id ? ` (पार्टनर ID: ${id})` : ""}`,
    salutation: "महोदय/महोदया,",
    details: "विवरण:",
    request: "अनुरोध:",
    closing:
      "कृपया इस शिकायत की पावती और संदर्भ नंबर दें, और 15 दिनों के भीतर जवाब दें। हल न होने पर मैं राज्य के श्रम विभाग में शिकायत करूँगा/करूँगी।",
    enclosures: "संलग्न:",
    signoff: "भवदीय,",
  },
  pa: FRAME_PA,
  ta: FRAME_TA,
  mr: FRAME_MR,
};

export { ISSUE_KEYS };

/** The issue's label in the letter language, e.g. for the AI wording prompt. */
export const issueLabel = (issue, lang) => (ISSUES[lang] ?? ISSUES.en)[issue].label;

/**
 * Build a ready-to-send complaint letter from validated form data, in
 * `input.lang` (default English). Deterministic and offline; not legal advice.
 */
export function draftGrievance(input, today) {
  const lang = FRAME[input.lang] ? input.lang : "en";
  const frame = FRAME[lang];
  const issue = ISSUES[lang][input.issue];
  const minor = input.amount === "" ? null : parseMoneyToMinor(input.amount);
  const context = {
    amount: minor ? formatMinor(minor) : "",
    since: input.fromDate ? formatDate(input.fromDate) : "",
  };
  return [
    `${frame.date}: ${formatDate(today)}`,
    "",
    ...frame.to(input.platform),
    "",
    frame.subject(issue.label, input.workerId),
    "",
    frame.salutation,
    "",
    issue.body(context),
    "",
    frame.details,
    input.details.trim(),
    "",
    `${frame.request} ${issue.ask}`,
    "",
    frame.closing,
    "",
    frame.enclosures,
    ...issue.enclosures.map((e, i) => `${i + 1}. ${e}`),
    "",
    frame.signoff,
    input.name,
  ].join("\n");
}
