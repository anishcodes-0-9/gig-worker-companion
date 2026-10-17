import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(function () {
    this.models = { generateContent };
  }),
}));

import { GET, POST } from "@/app/api/support/route";

const KEY = "route-test-secret-key";
const post = (question) =>
  POST(new Request("http://localhost/api/support", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question }),
  }));

beforeEach(() => {
  generateContent.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv("GEMINI_API_KEY", KEY);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("/api/support", () => {
  it("reports mode without leaking the key", async () => {
    const body = await (await GET()).text();
    expect(JSON.parse(body)).toEqual({ mode: "ai" });
    expect(body).not.toContain(KEY);
  });

  it("reports demo mode when no key is set", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(await (await GET()).json()).toEqual({ mode: "demo" });
  });

  it("never includes the key in success or failure responses", async () => {
    generateContent.mockResolvedValueOnce({ text: "Register at eshram.gov.in.", candidates: [{ finishReason: "STOP" }] });
    const success = await post("How do I register on e-Shram?");
    expect(success.status).toBe(200);
    expect(await success.text()).not.toContain(KEY);

    generateContent.mockRejectedValueOnce(new Error(`bad key ${KEY}`));
    const failure = await post("How do I register on e-Shram?");
    const text = await failure.text();
    expect(failure.status).toBe(200);
    expect(JSON.parse(text).mode).toBe("demo");
    expect(text).not.toContain(KEY);
  });

  it("validates the question before reaching the model", async () => {
    const res = await post("x");
    expect(res.status).toBe(400);
    expect(generateContent).not.toHaveBeenCalled();
  });
});
