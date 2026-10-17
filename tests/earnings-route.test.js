import { beforeEach, describe, expect, it } from "vitest";
import { DELETE, GET, POST } from "@/app/api/earnings/route";
import { memoryStore } from "@/lib/store/memory";
import { resetStore } from "@/lib/store";
import { resolveWorkspace, WORKSPACE_COOKIE } from "@/lib/workspace";
import { toIsoDate } from "@/lib/dates";

const URL_BASE = "https://gwc.example/api/earnings";
const cookieOf = (res) => res.headers.get("set-cookie")?.split(";")[0];

const get = (cookie) => GET(new Request(URL_BASE, { headers: cookie ? { cookie } : {} }));
const post = (cookie, body, type = "application/json") =>
  POST(new Request(URL_BASE, {
    method: "POST",
    headers: { "content-type": type, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  }));
const del = (cookie, kind, id) =>
  DELETE(new Request(`${URL_BASE}?kind=${kind}&id=${id}`, { method: "DELETE", headers: { cookie } }));

const entry = { kind: "entry", date: toIsoDate(), platform: "Swiggy", amount: "900", expenses: "100", hours: 5 };

beforeEach(() => resetStore(memoryStore()));

describe("workspace cookie", () => {
  it("issues an HttpOnly, SameSite=Lax, Secure cookie on first visit only", async () => {
    const first = await get();
    const header = first.headers.get("set-cookie");
    expect(header).toMatch(new RegExp(`^${WORKSPACE_COOKIE}=[A-Za-z0-9_-]{43};`));
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Secure");
    expect((await get(cookieOf(first))).headers.get("set-cookie")).toBeNull();
  });

  it("replaces a malformed or forged cookie with a fresh workspace", () => {
    const request = new Request(URL_BASE, { headers: { cookie: `${WORKSPACE_COOKIE}=../../admin` } });
    expect(resolveWorkspace(request).isNew).toBe(true);
  });

  it("derives the workspace id from the token instead of trusting the client", () => {
    const token = "A".repeat(43);
    const ws = resolveWorkspace(new Request(URL_BASE, { headers: { cookie: `x=1; ${WORKSPACE_COOKIE}=${token}` } }));
    expect(ws.isNew).toBe(false);
    expect(ws.id).toMatch(/^[0-9a-f]{32}$/);
    expect(ws.id).not.toContain(token);
  });
});

describe("/api/earnings isolation", () => {
  it("keeps two browsers' records apart and blocks cross-workspace deletes", async () => {
    const alice = cookieOf(await get());
    const bob = cookieOf(await get());
    expect(alice).not.toBe(bob);

    const created = await post(alice, entry);
    expect(created.status).toBe(201);
    const aliceData = await created.json();
    expect(aliceData.entries).toHaveLength(1);
    expect(aliceData.storage).toBe("temporary");

    expect((await (await get(bob)).json()).entries).toEqual([]);

    const id = aliceData.entries[0].id;
    expect((await del(bob, "entry", id)).status).toBe(404);
    expect((await (await get(alice)).json()).entries).toHaveLength(1);
    expect((await del(alice, "entry", id)).status).toBe(200);
    expect((await (await get(alice)).json()).entries).toEqual([]);
  });

  it("ignores a workspace id supplied in the body", async () => {
    const alice = cookieOf(await get());
    const bob = cookieOf(await get());
    await post(alice, { ...entry, workspaceId: "b".repeat(32), workspace: "bob" });
    expect((await (await get(bob)).json()).entries).toEqual([]);
  });

  it("rejects non-JSON bodies and bad kinds", async () => {
    const alice = cookieOf(await get());
    expect((await post(alice, entry, "text/plain")).status).toBe(415);
    expect((await post(alice, { ...entry, kind: "__proto__" })).status).toBe(400);
  });

  it("returns 409 when the workspace record limit is reached", async () => {
    const store = memoryStore();
    resetStore({ ...store, count: async () => 1000 });
    const alice = cookieOf(await get());
    const res = await post(alice, entry);
    expect(res.status).toBe(409);
  });
});

describe("/api/earnings response size", () => {
  const daysAgo = (n) => {
    const d = new Date(`${toIsoDate()}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - n);
    return d.toISOString().slice(0, 10);
  };

  it("lists only the most recent records but computes totals and overdue amounts from all of them", async () => {
    const alice = cookieOf(await get());
    // 40 entries over 40 days on one platform; the oldest are outside the listed 15.
    for (let i = 0; i < 40; i++) {
      await post(alice, { kind: "entry", date: daysAgo(i), platform: "Uber", amount: "100", expenses: "10", hours: 1 });
    }
    for (let i = 0; i < 20; i++) {
      await post(alice, { kind: "payout", date: daysAgo(i), platform: "Uber", amount: "50" });
    }
    const data = await (await get(alice)).json();

    expect(data.entries).toHaveLength(15);
    expect(data.payouts).toHaveLength(15);
    expect(data.entries[0].date).toBe(daysAgo(0)); // newest first
    expect(data.entries[14].date).toBe(daysAgo(14));

    // Totals cover all 40 entries and 20 payouts, not just the listed ones.
    expect(data.summary.allTime.gross).toBe(40 * 10000);
    expect(data.summary.allTime.net).toBe(40 * 9000);
    expect(data.summary.paidOut).toBe(20 * 5000);
    // FIFO: ₹1,000 of payouts covers the 10 oldest days; the 30 newest (₹3,000) are pending,
    // of which days 7–29 (23 days, ₹2,300) are overdue. Those records are mostly not listed.
    const uber = data.summary.byPlatform.find((b) => b.platform === "Uber");
    expect(uber.pending).toBe(30 * 10000);
    expect(uber.overdue).toBe(23 * 10000);
    expect(uber.oldestUnpaidDays).toBe(29);
  });

  it("deletes a listed record and keeps totals consistent", async () => {
    const alice = cookieOf(await get());
    for (let i = 0; i < 20; i++) await post(alice, { kind: "entry", date: daysAgo(i), platform: "Ola", amount: "100" });
    const before = await (await get(alice)).json();
    const res = await del(alice, "entry", before.entries[0].id);
    const after = await res.json();
    expect(res.status).toBe(200);
    expect(after.summary.allTime.gross).toBe(before.summary.allTime.gross - 10000);
    expect(after.entries).toHaveLength(15); // the next most recent record moves into the list
  });
});
