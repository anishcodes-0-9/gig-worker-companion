import { GoogleGenAI } from "@google/genai";

// The only place the Gemini key is read. It is never returned in responses or logged.

// Fast, low-cost stable Gemini model per Google's model list (checked Oct 2026).
// Override with GEMINI_MODEL if it is retired or you want a different tier.
export const DEFAULT_MODEL = "gemini-3.5-flash-lite";
// Below the routes' maxDuration (30 s) so a slow model never outlives the function.
const TIMEOUT_MS = 12_000;
// Caps spend if the server is reachable by others; shared by every AI feature.
const MAX_MODEL_CALLS_PER_MINUTE = 30;

const apiKey = () => process.env.GEMINI_API_KEY?.trim() ?? "";
export const llmConfigured = () => apiKey() !== "";
export const modelName = () => process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

let recentCalls = [];
function allowModelCall(now = Date.now()) {
  recentCalls = recentCalls.filter((t) => now - t < 60_000);
  if (recentCalls.length >= MAX_MODEL_CALLS_PER_MINUTE) return false;
  recentCalls.push(now);
  return true;
}
export function resetModelRateLimit() {
  recentCalls = [];
}

/** Remove the key from text that may be logged. */
export function redact(message) {
  const key = apiKey();
  return String(message).split(key || "\u0000").join("[redacted]");
}

/**
 * One plain-text Gemini call. Throws on anything other than a clean, complete,
 * non-empty answer within `maxChars`, and when the per-minute cap is reached.
 */
export async function generateText({ system, prompt, maxChars }) {
  if (!llmConfigured()) throw new Error("no API key configured");
  if (!allowModelCall()) throw new Error("model call limit reached");
  const ai = new GoogleGenAI({ apiKey: apiKey() });
  const response = await ai.models.generateContent({
    model: modelName(),
    contents: prompt,
    config: {
      systemInstruction: system,
      temperature: 0.2,
      // Generous because thinking models count reasoning tokens against this limit.
      maxOutputTokens: 2048,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    },
  });

  if (!response || typeof response !== "object") throw new Error("malformed response");
  if (response.promptFeedback?.blockReason) throw new Error(`prompt blocked: ${response.promptFeedback.blockReason}`);
  const finish = response.candidates?.[0]?.finishReason;
  if (finish && finish !== "STOP") throw new Error(`incomplete answer: finishReason=${finish}`);
  const text = typeof response.text === "string" ? response.text.trim() : "";
  if (!text) throw new Error("empty response");
  if (text.length > maxChars) throw new Error("answer too long");
  return text;
}
