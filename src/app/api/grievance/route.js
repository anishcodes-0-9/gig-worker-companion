import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { toIsoDate, isIsoDate } from "@/lib/dates";
import { parseMoneyToMinor } from "@/lib/money";
import { AppError } from "@/lib/errors";
import { draftGrievance } from "@/lib/support/grievance";
import { grievanceSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const POST = handle(async (request) => {
  const input = grievanceSchema.parse(await readJson(request));
  const fields = {};
  if (input.fromDate !== "" && !isIsoDate(input.fromDate)) fields.fromDate = "Enter a valid date";
  if (input.amount !== "" && parseMoneyToMinor(input.amount) === null) {
    fields.amount = "Amount must be a number like 1250 or 1250.50";
  }
  if (Object.keys(fields).length) throw new AppError(400, "validation", "Invalid input", fields);
  return NextResponse.json({ letter: draftGrievance(input, toIsoDate()) });
});
