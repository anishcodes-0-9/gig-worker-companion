import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { generateContent, GoogleGenAI } = vi.hoisted(() => {
  const generateContent = vi.fn();
  const GoogleGenAI = vi.fn(function () {
    this.models = { generateContent };
  });
  return { generateContent, GoogleGenAI };
});
vi.mock("@google/genai", () => ({ GoogleGenAI }));
import { isEmergency, retrieve } from "@/lib/support/retrieve";
import { answerQuestion, groundingProblem, resetModelRateLimit } from "@/lib/support/assistant";
import { draftGrievance } from "@/lib/support/grievance";
import { KB } from "@/lib/support/kb";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("retrieval", () => {
  it.each([
    ["How do I register on e-Shram?", "schemes-eshram"],
    ["I had an accident while delivering", "safety-accident"],
    ["my payout is pending and delayed", "rights-pay-deductions"],
    ["my account was blocked", "rights-deactivation"],
    ["someone called asking for my OTP, is it a scam", "safety-payment-fraud"],
  ])("%s -> %s", (question, id) => {
    expect(retrieve(question, 3).map((e) => e.id)).toContain(id);
  });

  it("returns nothing for unrelated questions", () => {
    expect(retrieve("what is the best pizza topping", 3)).toEqual([]);
  });

  it("detects emergencies", () => {
    expect(isEmergency("a customer attacked me")).toBe(true);
    expect(isEmergency("how do I register for e-Shram")).toBe(false);
  });

  it("has unique ids and non-empty steps", () => {
    expect(new Set(KB.map((e) => e.id)).size).toBe(KB.length);
    for (const e of KB) expect(e.steps.length).toBeGreaterThan(0);
  });
});

describe("answerQuestion", () => {
  const KEY = "test-gemini-key-123";
  const ok = (text, extra = {}) => ({ text, candidates: [{ finishReason: "STOP" }], ...extra });
  const eshram = "How do I register on e-Shram?";

  beforeEach(() => {
    resetModelRateLimit();
    generateContent.mockReset();
    GoogleGenAI.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("runs in demo mode without a key and never touches the SDK", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const r = await answerQuestion("I had an accident, I am injured");
    expect(r.mode).toBe("demo");
    expect(r.answer).toBeNull();
    expect(r.emergency).toBe(true);
    expect(r.emergencyNumbers[0].number).toBe("112");
    expect(r.matches.length).toBeGreaterThan(0);
    expect(GoogleGenAI).not.toHaveBeenCalled();
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("treats a whitespace-only key as missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "   ");
    expect((await answerQuestion(eshram)).mode).toBe("demo");
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("ignores the old Anthropic variable", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-old");
    expect((await answerQuestion(eshram)).mode).toBe("demo");
  });

  it("lists topics when nothing matches", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const r = await answerQuestion("best pizza topping");
    expect(r.matches).toEqual([]);
    expect(r.topics.length).toBe(KB.length);
  });

  it("does not call the model when no entry matches, even with a key", async () => {
    vi.stubEnv("GEMINI_API_KEY", KEY);
    const r = await answerQuestion("best pizza topping");
    expect(r).toMatchObject({ mode: "ai", answer: null, matches: [] });
    expect(generateContent).not.toHaveBeenCalled();
  });

  describe("with a key", () => {
    beforeEach(() => vi.stubEnv("GEMINI_API_KEY", KEY));

    it("returns the model's summary alongside the curated entries", async () => {
      generateContent.mockResolvedValue(ok("Register for free at eshram.gov.in or a Common Service Centre."));
      const r = await answerQuestion(eshram);
      expect(r.mode).toBe("ai");
      expect(r.answer).toBe("Register for free at eshram.gov.in or a Common Service Centre.");
      expect(r.matches.map((m) => m.id)).toContain("schemes-eshram");
      expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: KEY });
    });

    it("sends the context, question and rules to the default model", async () => {
      generateContent.mockResolvedValue(ok("Register at eshram.gov.in."));
      await answerQuestion(eshram);
      const req = generateContent.mock.calls[0][0];
      expect(req.model).toBe("gemini-3.5-flash-lite");
      expect(req.contents).toContain("[schemes-eshram]");
      expect(req.contents).toContain(eshram);
      expect(req.config.systemInstruction).toMatch(/ONLY facts stated in CONTEXT/);
      expect(req.config.abortSignal).toBeInstanceOf(AbortSignal);
    });

    it("honours GEMINI_MODEL", async () => {
      vi.stubEnv("GEMINI_MODEL", "gemini-custom");
      generateContent.mockResolvedValue(ok("Register at eshram.gov.in."));
      await answerQuestion(eshram);
      expect(generateContent.mock.calls[0][0].model).toBe("gemini-custom");
    });

    it("never puts the key in the response", async () => {
      generateContent.mockResolvedValue(ok("Register at eshram.gov.in."));
      expect(JSON.stringify(await answerQuestion(eshram))).not.toContain(KEY);
    });

    it("falls back to demo mode when the API call fails, and redacts the key from logs", async () => {
      generateContent.mockRejectedValue(new Error(`403 PERMISSION_DENIED for key ${KEY}`));
      const r = await answerQuestion(eshram);
      expect(r).toMatchObject({ mode: "demo", fallback: true, answer: null });
      expect(r.matches.length).toBeGreaterThan(0);
      expect(JSON.stringify(console.error.mock.calls)).not.toContain(KEY);
      expect(JSON.stringify(console.error.mock.calls)).toContain("[redacted]");
    });

    it("falls back when the request times out or is aborted", async () => {
      generateContent.mockRejectedValue(Object.assign(new Error("The operation was aborted"), { name: "AbortError" }));
      expect(await answerQuestion(eshram)).toMatchObject({ mode: "demo", fallback: true });
    });

    it.each([
      ["null response", null],
      ["non-object response", "oops"],
      ["no text", { candidates: [{ finishReason: "STOP" }] }],
      ["empty text", ok("")],
      ["whitespace text", ok("   \n ")],
      ["non-string text", { text: { nested: true }, candidates: [{ finishReason: "STOP" }] }],
      ["truncated (MAX_TOKENS)", { text: "Register at", candidates: [{ finishReason: "MAX_TOKENS" }] }],
      ["safety stop", { text: "partial", candidates: [{ finishReason: "SAFETY" }] }],
      ["prompt blocked", { promptFeedback: { blockReason: "SAFETY" } }],
      ["overlong answer", ok("a ".repeat(1000))],
    ])("falls back on a malformed or unusable response: %s", async (_name, response) => {
      generateContent.mockResolvedValue(response);
      const r = await answerQuestion(eshram);
      expect(r).toMatchObject({ mode: "demo", fallback: true, answer: null });
      expect(r.matches.length).toBeGreaterThan(0);
    });

    it("rejects an answer that cites a website not in the curated entries", async () => {
      generateContent.mockResolvedValue(ok("Register at eshram-official-portal.com today."));
      expect(await answerQuestion(eshram)).toMatchObject({ mode: "demo", fallback: true, answer: null });
    });

    it("rejects an answer with a helpline number that is not in the curated entries", async () => {
      generateContent.mockResolvedValue(ok("Call 1800-555 or 98765 for help registering."));
      expect(await answerQuestion(eshram)).toMatchObject({ mode: "demo", fallback: true, answer: null });
    });

    it("keeps the deterministic emergency banner when the model fails or downplays it", async () => {
      generateContent.mockRejectedValue(new Error("boom"));
      const failed = await answerQuestion("I had an accident and I am injured");
      expect(failed.emergency).toBe(true);
      expect(failed.emergencyNumbers[0].number).toBe("112");

      generateContent.mockResolvedValue(ok("This is not an emergency, no need to call anyone."));
      const downplayed = await answerQuestion("I had an accident and I am injured");
      expect(downplayed.emergency).toBe(true);
      expect(downplayed.emergencyNumbers.map((n) => n.number)).toContain("112");
    });
  });
});

describe("answerQuestion in Hindi", () => {
  beforeEach(() => {
    resetModelRateLimit();
    generateContent.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("returns Hindi entries, categories and emergency labels in demo mode", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const r = await answerQuestion("मेरा एक्सीडेंट हो गया", "hi");
    expect(r.mode).toBe("demo");
    expect(r.emergency).toBe(true);
    expect(r.emergencyNumbers[0]).toMatchObject({ number: "112", label: expect.stringMatching(/[\u0900-\u097F]/) });
    expect(r.matches[0].title).toMatch(/[\u0900-\u097F]/);
    expect(r.matches[0].category).toMatch(/[\u0900-\u097F]/);
  });

  it("keeps English entries when the language is English", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const r = await answerQuestion("I had an accident", "en");
    expect(r.matches[0].title).toBe("After a road accident");
  });

  it("asks the model for Hindi and passes Hindi context", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    generateContent.mockResolvedValue({ text: "ई-श्रम पर eshram.gov.in या 14434 पर संपर्क करें।", candidates: [{ finishReason: "STOP" }] });
    const r = await answerQuestion("ई-श्रम में पंजीकरण कैसे करूँ?", "hi");
    expect(r.answer).toContain("eshram.gov.in");
    const req = generateContent.mock.calls[0][0];
    expect(req.config.systemInstruction).toMatch(/Hindi/);
    expect(req.contents).toMatch(/ई-श्रम/);
  });

  it("rejects a Hindi answer whose Devanagari digits hide an unlisted helpline number", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    generateContent.mockResolvedValue({ text: "हेल्पलाइन ९९९९९ पर कॉल करें।", candidates: [{ finishReason: "STOP" }] });
    expect(await answerQuestion("ई-श्रम में पंजीकरण कैसे करूँ?", "hi")).toMatchObject({ mode: "demo", fallback: true, answer: null });
    expect(groundingProblem("हेल्पलाइन ९९९९९", KB.slice(0, 2))).toMatch(/unlisted number/);
  });

  it("stops calling the model past the per-minute cap and falls back to demo mode", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    generateContent.mockResolvedValue({ text: "Register at eshram.gov.in.", candidates: [{ finishReason: "STOP" }] });
    const results = [];
    for (let i = 0; i < 31; i++) results.push(await answerQuestion("How do I register on e-Shram?"));
    expect(results.slice(0, 30).every((r) => r.mode === "ai" && r.answer)).toBe(true);
    expect(results[30]).toMatchObject({ mode: "demo", fallback: true, answer: null });
    expect(generateContent).toHaveBeenCalledTimes(30);
    expect(results[30].matches.length).toBeGreaterThan(0);
  });
});

describe("groundingProblem", () => {
  const entries = KB.filter((e) => e.id === "schemes-eshram" || e.id === "schemes-health");
  it("accepts text using only websites and numbers from the entries", () => {
    expect(groundingProblem("Register on eshram.gov.in or call 14434. Cover is up to ₹5 lakh.", entries)).toBeNull();
    expect(groundingProblem("Check mera.pmjay.gov.in or call 14555, and 112 in an emergency.", entries)).toBeNull();
  });
  it("accepts rupee amounts with digit grouping and years", () => {
    expect(groundingProblem("It was announced in 2025 and costs ₹1,00,000.", entries)).toBeNull();
  });
  it("flags unknown websites and numbers", () => {
    expect(groundingProblem("See example.com", entries)).toMatch(/unlisted website/);
    expect(groundingProblem("Call 9999", entries)).toMatch(/unlisted number/);
  });
});

describe("draftGrievance", () => {
  const input = {
    name: "Asha Rao", platform: "Swiggy", issue: "unpaid",
    details: "Payouts for 3 weeks are missing.", amount: "4500", fromDate: "2026-09-20", workerId: "SW123",
  };
  it("fills in the letter from the form", () => {
    const letter = draftGrievance(input, "2026-10-17");
    expect(letter).toContain("The Grievance Officer, Swiggy");
    expect(letter).toContain("₹4,500");
    expect(letter).toMatch(/since 20 Sep(t)? 2026/); // ICU month abbreviation varies by version
    expect(letter).toContain("Partner ID: SW123");
    expect(letter).toContain("Asha Rao");
    expect(letter).toContain("Enclosures:");
  });
  it("omits optional parts when absent", () => {
    const letter = draftGrievance({ ...input, amount: "", fromDate: "", workerId: "", issue: "deactivation" }, "2026-10-17");
    expect(letter).not.toContain("Partner ID");
    expect(letter).toContain("deactivated");
  });
});

describe("emergency detection (keyword based, not exhaustive)", () => {
  it.each(["my bike crashed", "he hit me", "I am being harassed", "I fainted on the road", "bleeding badly"])(
    "flags %s",
    (text) => expect(isEmergency(text)).toBe(true),
  );
  it("is deterministic across calls (no regex state leakage)", () => {
    for (let i = 0; i < 5; i++) expect(isEmergency("accident")).toBe(true);
  });
  it("does not flag ordinary questions", () => {
    expect(isEmergency("how do I download my payout statement")).toBe(false);
  });
});
