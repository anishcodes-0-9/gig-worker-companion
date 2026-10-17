import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { toIsoDate } from "@/lib/dates";
import { RECENT_RECORDS, summarize } from "@/lib/earnings";
import { add, load, remove, storageMode, KINDS } from "@/lib/store";
import { entrySchema, payoutSchema } from "@/lib/validation";
import { withWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

// Every read, write and delete is scoped to the caller's cookie-derived workspace.
// The summary (totals, balances, overdue amounts) is computed from all records;
// only the most recent ones are listed, which is all the UI shows, so the
// response size does not grow with the workspace's history.

async function snapshot(workspaceId) {
  const data = await load(workspaceId);
  const today = toIsoDate();
  const byDateDesc = (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
  return {
    today,
    entries: [...data.entries].sort(byDateDesc).slice(0, RECENT_RECORDS),
    payouts: [...data.payouts].sort(byDateDesc).slice(0, RECENT_RECORDS),
    summary: summarize(data, today),
    storage: storageMode(),
  };
}

const isKind = (kind) => typeof kind === "string" && Object.hasOwn(KINDS, kind);

export const GET = handle(withWorkspace(async (request, ws) => NextResponse.json(await snapshot(ws.id))));

// Body: { kind: "entry" | "payout", ...fields }
export const POST = handle(withWorkspace(async (request, ws) => {
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
  await add(ws.id, kind, record);
  return NextResponse.json(await snapshot(ws.id), { status: 201 });
}));

// /api/earnings?kind=entry&id=...
export const DELETE = handle(withWorkspace(async (request, ws) => {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const id = params.get("id");
  if (!isKind(kind) || !id) throw new AppError(400, "bad_request", "kind and id are required");
  if (!(await remove(ws.id, kind, id))) throw new AppError(404, "not_found", "Record not found");
  return NextResponse.json(await snapshot(ws.id));
}));
