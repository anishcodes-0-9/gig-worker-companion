import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { toIsoDate } from "@/lib/dates";
import { summarize } from "@/lib/earnings";
import { add, load, remove, temporaryStorage, KINDS } from "@/lib/store";
import { entrySchema, payoutSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

async function snapshot() {
  const data = await load();
  const today = toIsoDate();
  const byDateDesc = (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
  return {
    today,
    entries: [...data.entries].sort(byDateDesc),
    payouts: [...data.payouts].sort(byDateDesc),
    summary: summarize(data, today),
    temporaryStorage: temporaryStorage(),
  };
}

const isKind = (kind) => typeof kind === "string" && Object.hasOwn(KINDS, kind);

export const GET = handle(async () => NextResponse.json(await snapshot()));

// Body: { kind: "entry" | "payout", ...fields }
export const POST = handle(async (request) => {
  const { kind, ...fields } = await readJson(request);
  if (!isKind(kind)) throw new AppError(400, "bad_kind", "kind must be 'entry' or 'payout'");
  const parsed = (kind === "entry" ? entrySchema : payoutSchema).parse(fields);
  const { amount, expenses, ...rest } = parsed;
  const record = { ...rest, amountMinor: amount };
  if (kind === "entry") {
    record.expensesMinor = expenses;
    if (record.expensesMinor > record.amountMinor) {
      throw new AppError(400, "validation", "Expenses exceed earnings", {
        expenses: "Expenses cannot be more than earnings",
      });
    }
  }
  await add(kind, record);
  return NextResponse.json(await snapshot(), { status: 201 });
});

// /api/earnings?kind=entry&id=...
export const DELETE = handle(async (request) => {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const id = params.get("id");
  if (!isKind(kind) || !id) throw new AppError(400, "bad_request", "kind and id are required");
  if (!(await remove(kind, id))) throw new AppError(404, "not_found", "Record not found");
  return NextResponse.json(await snapshot());
});
