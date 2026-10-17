import { describe, expect, it } from "vitest";
import { MESSAGES, STRINGS, translate, translateMessage } from "@/lib/i18n";
import { KB_TRANSLATIONS } from "@/lib/support/kb.i18n";
import { KB } from "@/lib/support/kb";
import { KB_HI, CATEGORIES_HI, EMERGENCY_LABELS_HI } from "@/lib/support/kb.hi";
import { CATEGORIES, EMERGENCY_NUMBERS } from "@/lib/support/kb";
import { isEmergency, retrieve } from "@/lib/support/retrieve";
import { draftGrievance, ISSUE_KEYS } from "@/lib/support/grievance";
import { toIsoDate } from "@/lib/dates";
import { grievanceSchema, questionSchema } from "@/lib/validation";

const placeholders = (s) => (typeof s === "string" ? [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort() : []);
const numbers = (s) => [...new Set(s.match(/\b\d{3,5}\b/g) ?? [])].sort();
const hosts = (s) => [...new Set(s.match(/\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/gi) ?? [])].map((h) => h.toLowerCase()).sort();
const entryText = (e) => [e.title, e.summary, ...e.steps].join("\n");

describe("UI strings", () => {
  it("Hindi has exactly the English keys", () => {
    expect(Object.keys(STRINGS.hi).sort()).toEqual(Object.keys(STRINGS.en).sort());
  });
  it("placeholders match between languages for every string", () => {
    for (const key of Object.keys(STRINGS.en)) {
      expect(placeholders(STRINGS.hi[key]), key).toEqual(placeholders(STRINGS.en[key]));
    }
  });
  it("example question lists line up", () => {
    expect(STRINGS.hi.examples).toHaveLength(STRINGS.en.examples.length);
  });
  it("every issue has a label in both languages", () => {
    for (const k of ISSUE_KEYS) {
      expect(STRINGS.en[`issue_${k}`]).toBeTruthy();
      expect(STRINGS.hi[`issue_${k}`]).toBeTruthy();
    }
  });
  it("fills placeholders and falls back to English or the key", () => {
    expect(translate("hi", "hoursLogged", { hours: 6 })).toBe("6 घंटे दर्ज");
    expect(translate("fr", "retry")).toBe("Retry");
    expect(translate("en", "no-such-key")).toBe("no-such-key");
  });
  it("translates known server messages and leaves unknown ones alone", () => {
    expect(translateMessage("hi", "Enter your name")).toBe("अपना नाम डालें");
    expect(translateMessage("hi", "Totally new message")).toBe("Totally new message");
    expect(translateMessage("en", "Enter your name")).toBe("Enter your name");
  });
});

describe("Hindi curated entries", () => {
  it("cover every English entry with the same number of steps", () => {
    for (const e of KB) {
      expect(KB_HI[e.id], e.id).toBeDefined();
      expect(KB_HI[e.id].steps, e.id).toHaveLength(e.steps.length);
    }
    expect(Object.keys(KB_HI).sort()).toEqual(KB.map((e) => e.id).sort());
  });
  it("keep helpline numbers, years and websites identical to the English entry", () => {
    for (const e of KB) {
      expect(numbers(entryText(KB_HI[e.id])), `${e.id} numbers`).toEqual(numbers(entryText(e)));
      expect(hosts(entryText(KB_HI[e.id])), `${e.id} websites`).toEqual(hosts(entryText(e)));
    }
  });
  it("translate every category and emergency number label", () => {
    expect(Object.keys(CATEGORIES_HI).sort()).toEqual(Object.keys(CATEGORIES).sort());
    for (const n of EMERGENCY_NUMBERS) expect(EMERGENCY_LABELS_HI[n.number], n.number).toBeTruthy();
  });
});

describe("Hindi retrieval and emergency detection", () => {
  it.each([
    ["ई-श्रम में पंजीकरण कैसे करूँ?", "schemes-eshram"],
    ["मेरा अकाउंट ब्लॉक हो गया", "rights-deactivation"],
    ["दो हफ़्ते से मेरा पेमेंट बकाया है", "rights-pay-deductions"],
    ["डिलीवरी करते समय मेरा एक्सीडेंट हो गया", "safety-accident"],
    ["मेरा पेमेंट बकाया है", "rights-pay-deductions"], // same word with/without nukta (हफ़्ते vs हफ्ते)
  ])("%s -> %s", (question, id) => {
    expect(retrieve(question, 3).map((e) => e.id)).toContain(id);
  });
  it("matches nukta and non-nukta spellings alike", () => {
    expect(retrieve("दो हफ्ते से पेमेंट बकाया", 3).map((e) => e.id)).toContain("rights-pay-deductions");
  });
  it("flags Hindi emergencies but not ordinary questions", () => {
    for (const q of ["मेरा एक्सीडेंट हो गया", "ग्राहक ने हमला किया", "मुझे बचाओ", "वह मुझे धमकी दे रहा है"]) {
      expect(isEmergency(q), q).toBe(true);
    }
    expect(isEmergency("ई-श्रम में पंजीकरण कैसे करूँ?")).toBe(false);
  });
});

describe("Hindi complaint letter", () => {
  const input = {
    name: "आशा राव", platform: "Swiggy", issue: "unpaid", lang: "hi",
    details: "तीन हफ़्ते का भुगतान बाक़ी है।", amount: "4500", fromDate: "2026-09-20", workerId: "SW123",
  };
  it("is written in Hindi with the user's details intact", () => {
    const letter = draftGrievance(input, "2026-10-17");
    expect(letter).toContain("शिकायत अधिकारी, Swiggy");
    expect(letter).toContain("₹4,500");
    expect(letter).toContain("पार्टनर ID: SW123");
    expect(letter).toContain("आशा राव");
    expect(letter).toContain("संलग्न:");
    expect(letter).not.toContain("Respected Sir/Madam");
  });
  it("has a Hindi template for every issue", () => {
    for (const issue of ISSUE_KEYS) {
      expect(draftGrievance({ ...input, issue, amount: "", fromDate: "" }, "2026-10-17")).toMatch(/[ऀ-ॿ]/);
    }
  });
  it("falls back to English for an unknown language", () => {
    expect(draftGrievance({ ...input, lang: "fr" }, "2026-10-17")).toContain("The Grievance Officer");
  });
});

describe("lang validation", () => {
  it("defaults to English and rejects unsupported languages", () => {
    expect(questionSchema.parse({ question: "hello there" }).lang).toBe("en");
    expect(questionSchema.safeParse({ question: "hello there", lang: "fr" }).success).toBe(false);
    expect(grievanceSchema.safeParse({ name: "A", platform: "Uber", issue: "unpaid", details: "long enough text", lang: "xx" }).success).toBe(false);
  });
});

describe("toIsoDate time zone", () => {
  it("uses India time by default so late-evening UTC is already the next day", () => {
    expect(toIsoDate(new Date("2026-10-17T20:00:00Z"))).toBe("2026-10-18");
    expect(toIsoDate(new Date("2026-10-17T20:00:00Z"), "UTC")).toBe("2026-10-17");
  });
});

describe.each(["hi", "pa", "ta", "mr"])("%s translation completeness", (lang) => {
  const t = KB_TRANSLATIONS[lang];
  const script = { hi: /[ऀ-ॿ]/, pa: /[਀-੿]/, ta: /[஀-௿]/, mr: /[ऀ-ॿ]/ }[lang];

  it("has every UI string, with matching placeholders, in its own script", () => {
    expect(Object.keys(STRINGS[lang]).sort()).toEqual(Object.keys(STRINGS.en).sort());
    for (const key of Object.keys(STRINGS.en)) {
      expect(placeholders(STRINGS[lang][key]), key).toEqual(placeholders(STRINGS.en[key]));
    }
    expect(STRINGS[lang].examples).toHaveLength(STRINGS.en.examples.length);
    expect(STRINGS[lang].tabSupport).toMatch(script);
    expect(STRINGS[lang].translationNotice).toBeTruthy(); // the UI must say it is unreviewed
  });

  it("translates every known server message", () => {
    expect(Object.keys(MESSAGES[lang]).sort()).toEqual(Object.keys(MESSAGES.hi).sort());
  });

  it("covers every guide entry with the same steps, helplines and websites", () => {
    expect(Object.keys(t.entries).sort()).toEqual(KB.map((e) => e.id).sort());
    for (const e of KB) {
      const local = t.entries[e.id];
      expect(local.steps, e.id).toHaveLength(e.steps.length);
      expect(numbers(entryText(local)), `${e.id} numbers`).toEqual(numbers(entryText(e)));
      expect(hosts(entryText(local)), `${e.id} websites`).toEqual(hosts(entryText(e)));
      expect(local.title, e.id).toMatch(script);
    }
    expect(Object.keys(t.categories).sort()).toEqual(Object.keys(CATEGORIES).sort());
    for (const n of EMERGENCY_NUMBERS) expect(t.emergencyLabels[n.number], n.number).toBeTruthy();
  });

  it("matches its own example questions to the right entries", () => {
    const [accident, eshram, , blocked] = STRINGS[lang].examples;
    expect(retrieve(accident, 3).map((e) => e.id)).toContain("safety-accident");
    expect(retrieve(eshram, 3).map((e) => e.id)).toContain("schemes-eshram");
    expect(retrieve(blocked, 3).map((e) => e.id)).toContain("rights-deactivation");
  });

  it("flags the accident example as an emergency but not the e-Shram one", () => {
    const [accident, eshram] = STRINGS[lang].examples;
    expect(isEmergency(accident), accident).toBe(true);
    expect(isEmergency(eshram), eshram).toBe(false);
  });

  it("writes every complaint letter in its own script with the facts intact", () => {
    const input = { name: "Asha", platform: "Swiggy", lang, details: "4500 unpaid", amount: "4500", fromDate: "2026-09-20", workerId: "SW123" };
    for (const issue of ISSUE_KEYS) {
      const letter = draftGrievance({ ...input, issue }, "2026-10-17");
      expect(letter, issue).toMatch(script);
      expect(letter).toContain("Swiggy");
      expect(letter).toContain("SW123");
      expect(letter).toMatch(/Asha$/);
    }
    expect(draftGrievance({ ...input, issue: "unpaid" }, "2026-10-17")).toContain("₹4,500");
  });
});

describe("pre-filled complaint details", () => {
  // The "Draft complaint" prefill goes into a formal letter, so it must state only
  // what the records show (unpaid earnings), never actions the worker may not have taken.
  it.each(["en", "hi", "pa", "ta", "mr"])("%s states a single fact and no prior complaint", (lang) => {
    const text = STRINGS[lang].prefillDetails;
    expect(text.match(/[.।]/g), text).toHaveLength(1);
    expect(text).not.toMatch(/raised|ticket|complain|शिकायत|ਸ਼ਿਕਾਇਤ|தெரிவித்தேன்|तक्रार/i);
  });
});
