import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { toIsoDate, isIsoDate } from "@/lib/dates";
import { parseMoneyToMinor } from "@/lib/money";
import { AppError } from "@/lib/errors";
import { llmConfigured } from "@/lib/ai/gemini";
import { draftGrievance, issueLabel } from "@/lib/support/grievance";
import { rewriteDetails } from "@/lib/support/grievance-ai";
import { grievanceSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // above the 12 s model timeout

// Body: grievance form fields, plus `polish: true` to let Gemini reword the details paragraph.
// Response: { letter, wording: "ai" | "template", fallback? }. Nothing is stored or sent.
export const POST = handle(async (request) => {
  const { polish, ...input } = grievanceSchema.parse(await readJson(request));
  const fields = {};
  if (input.fromDate !== "" && !isIsoDate(input.fromDate)) fields.fromDate = "Enter a valid date";
  if (input.amount !== "" && parseMoneyToMinor(input.amount) === null) {
    fields.amount = "Amount must be a number like 1250 or 1250.50";
  }
  if (Object.keys(fields).length) throw new AppError(400, "validation", "Invalid input", fields);

  let details = input.details;
  let wording = "template";
  let fallback;
  if (polish && llmConfigured()) {
    const rewritten = await rewriteDetails({
      details: input.details,
      issueLabel: issueLabel(input.issue, input.lang),
      platform: input.platform,
      lang: input.lang,
    });
    if (rewritten) [details, wording] = [rewritten, "ai"];
    else fallback = true;
  }
  const letter = draftGrievance({ ...input, details }, toIsoDate());
  return NextResponse.json({ letter, wording, ...(fallback && { fallback }) });
});
