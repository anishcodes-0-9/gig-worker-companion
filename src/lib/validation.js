import { z } from "zod";
import { PLATFORMS } from "./platforms.js";
import { isIsoDate, toIsoDate } from "./dates.js";
import { parseMoneyToMinor } from "./money.js";
import { LANG_CODES } from "./i18n.js";
import { ISSUE_KEYS } from "./support/grievance.js";

// Field messages are plain English; the UI translates known ones (see i18n.js).

const lang = z.enum(LANG_CODES).optional().default("en");

const date = z
  .string()
  .refine(isIsoDate, "Enter a valid date")
  .refine((d) => d <= toIsoDate(), "Date cannot be in the future");

const platform = z.enum(PLATFORMS, { errorMap: () => ({ message: "Choose a platform" }) });

const money = (label, { allowZero }) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => parseMoneyToMinor(v))
    .refine((v) => v !== null, `${label} must be a number like 1250 or 1250.50`)
    .refine((v) => v === null || allowZero || v > 0, `${label} must be more than 0`);

const note = z.string().trim().max(200, "Keep notes under 200 characters").optional().default("");

export const entrySchema = z.object({
  date,
  platform,
  amount: money("Earnings", { allowZero: false }),
  expenses: money("Expenses", { allowZero: true }).optional().default("0"),
  hours: z.coerce
    .number({ invalid_type_error: "Hours must be a number" })
    .min(0, "Hours cannot be negative")
    .max(24, "A day has at most 24 hours")
    .optional()
    .default(0),
  note,
});

export const payoutSchema = z.object({
  date,
  platform,
  amount: money("Payout", { allowZero: false }),
  note,
});

export const grievanceSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  platform,
  issue: z.enum(ISSUE_KEYS, { errorMap: () => ({ message: "Choose an issue" }) }),
  details: z.string().trim().min(10, "Describe what happened (at least 10 characters)").max(1500),
  amount: z.union([z.string(), z.number()]).optional().default(""),
  fromDate: z.string().optional().default(""),
  workerId: z.string().trim().max(40).optional().default(""),
  lang,
});

export const questionSchema = z.object({
  question: z.string().trim().min(3, "Ask a question (at least 3 characters)").max(500),
  lang,
});

/** Convert a ZodError to { field: message } (first message per field). */
export function fieldErrors(error) {
  const out = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
