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
