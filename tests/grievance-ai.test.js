import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(function () {
    this.models = { generateContent };
  }),
}));

import { POST } from "@/app/api/grievance/route";
import { wordingProblem } from "@/lib/support/grievance-ai";
import { resetModelRateLimit } from "@/lib/ai/gemini";

const KEY = "grievance-test-secret-key";
const ok = (text) => ({ text, candidates: [{ finishReason: "STOP" }] });
const form = {
  name: "Asha Rao", platform: "Swiggy", issue: "unpaid", workerId: "SW123",
  amount: "4500", fromDate: "2026-09-20", lang: "en",
  details: "they didnt pay me 4500 for 3 weeks, ticket 88123 still open",
};
const post = (body) =>
  POST(new Request("http://localhost/api/grievance", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }));

beforeEach(() => {
  generateContent.mockReset();
  resetModelRateLimit();
  vi.unstubAllEnvs();
  vi.stubEnv("GEMINI_API_KEY", KEY);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("wordingProblem", () => {
  const original = form.details;
  it("accepts a rewording that keeps every number", () => {
    expect(wordingProblem(original, "I have not been paid ₹4500 for 3 weeks. Ticket 88123 is still open.")).toBeNull();
  });
  it.each([
    ["dropped number", "I have not been paid for 3 weeks. Ticket 88123 is still open."],
    ["changed amount", "I have not been paid ₹45000 for 3 weeks. Ticket 88123 is still open."],
    ["added number", "I have not been paid 4500 for 3 weeks since 12 September. Ticket 88123 is open."],
    ["number turned into words", "I have not been paid 4500 for three weeks. Ticket 88123 is open."],
    ["new phone number", "Unpaid 4500 for 3 weeks, ticket 88123. Call me on 9876543210."],
    ["new website", "Unpaid 4500 for 3 weeks, ticket 88123. See swiggy-help.com."],
    ["claim of filing", "Unpaid 4500 for 3 weeks, ticket 88123. I have filed a police complaint."],
    ["far too long", `Unpaid 4500 for 3 weeks, ticket 88123. ${"Very upset. ".repeat(80)}`],
  ])("rejects a %s", (_name, rewritten) => {
    expect(wordingProblem(original, rewritten)).not.toBeNull();
  });
});

describe("/api/grievance AI wording", () => {
  it("uses the reworded details when they pass the fact check, and keeps the frame deterministic", async () => {
    generateContent.mockResolvedValue(ok("I have not been paid ₹4500 for 3 weeks. Support ticket 88123 is still open."));
    const res = await post({ ...form, polish: true });
    const data = await res.json();
    expect(data.wording).toBe("ai");
    expect(data.letter).toContain("Support ticket 88123 is still open.");
    expect(data.letter).toContain("The Grievance Officer, Swiggy");
    expect(data.letter).toContain("(Partner ID: SW123)");
    expect(data.letter).toContain("₹4,500");
    expect(data.letter).toMatch(/Asha Rao$/);
  });

  it("never sends the worker's name or id to the model", async () => {
    generateContent.mockResolvedValue(ok("Unpaid 4500 for 3 weeks; ticket 88123 open."));
    await post({ ...form, polish: true });
    const sent = JSON.stringify(generateContent.mock.calls[0][0]);
    expect(sent).not.toContain("Asha Rao");
    expect(sent).not.toContain("SW123");
    expect(sent).not.toContain(KEY);
  });

  it("falls back to the worker's own words when the rewrite changes a fact", async () => {
    generateContent.mockResolvedValue(ok("I have not been paid ₹5400 for 3 weeks. Ticket 88123 is open."));
    const data = await (await post({ ...form, polish: true })).json();
    expect(data).toMatchObject({ wording: "template", fallback: true });
    expect(data.letter).toContain(form.details);
    expect(data.letter).not.toContain("5400");
  });

  it("falls back when the model call fails, without logging the key or the details", async () => {
    generateContent.mockRejectedValue(new Error(`quota exceeded for ${KEY}`));
    const data = await (await post({ ...form, polish: true })).json();
    expect(data).toMatchObject({ wording: "template", fallback: true });
    const logs = JSON.stringify(console.error.mock.calls);
    expect(logs).not.toContain(KEY);
    expect(logs).not.toContain("88123");
  });

  it("does not call the model unless asked, or without a key", async () => {
    expect((await (await post(form)).json()).wording).toBe("template");
    vi.stubEnv("GEMINI_API_KEY", "");
    const data = await (await post({ ...form, polish: true })).json();
    expect(data.wording).toBe("template");
    expect(data.fallback).toBeUndefined();
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("asks for the chosen letter language", async () => {
    generateContent.mockResolvedValue(ok("மூன்று வாரங்களாக 4500 ரூபாய் கிடைக்கவில்லை. 3 வாரம். டிக்கெட் 88123."));
    const data = await (await post({ ...form, lang: "ta", polish: true })).json();
    expect(generateContent.mock.calls[0][0].contents).toContain("Tamil");
    expect(data.wording).toBe("ai");
    expect(data.letter).toMatch(/[஀-௿]/);
  });
});
