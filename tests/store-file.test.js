import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fileStore } from "@/lib/store/file";
import { memoryStore } from "@/lib/store/memory";
import { add, load, remove, resetStore, RECORD_LIMIT } from "@/lib/store";

const WS_A = "a".repeat(32);
const WS_B = "b".repeat(32);
const record = (i = 1) => ({ date: "2026-01-01", platform: "Uber", amountMinor: i });

let dir;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "gwc-"));
  process.env.GWC_DATA_DIR = dir;
});
afterEach(async () => {
  delete process.env.GWC_DATA_DIR;
  resetStore();
  await fs.rm(dir, { recursive: true, force: true });
});

// The same contract must hold for every backend.
describe.each([
  ["file", fileStore],
  ["memory", memoryStore],
])("%s store", (_name, make) => {
  beforeEach(() => resetStore(make()));

  it("starts empty", async () => {
    expect(await load(WS_A)).toEqual({ entries: [], payouts: [] });
  });

  it("assigns ids and keeps workspaces separate", async () => {
    const saved = await add(WS_A, "entry", record());
    expect(saved.id).toBeTruthy();
    expect((await load(WS_A)).entries).toHaveLength(1);
    expect(await load(WS_B)).toEqual({ entries: [], payouts: [] });
  });

  it("does not lose writes under concurrency", async () => {
    await Promise.all(Array.from({ length: 25 }, (_, i) => add(WS_A, "payout", record(i + 1))));
    expect((await load(WS_A)).payouts).toHaveLength(25);
  });

  it("removes by id only inside the owning workspace", async () => {
    const { id } = await add(WS_A, "entry", record());
    expect(await remove(WS_B, "entry", id)).toBe(false);
    expect(await remove(WS_A, "entry", "missing")).toBe(false);
    expect(await remove(WS_A, "entry", id)).toBe(true);
    expect((await load(WS_A)).entries).toEqual([]);
  });

  it("caps records per workspace", async () => {
    const backend = make();
    const full = { ...backend, count: async () => RECORD_LIMIT };
    resetStore(full);
    await expect(add(WS_A, "entry", record())).rejects.toMatchObject({ status: 409 });
  });
});

describe("file store on disk", () => {
  beforeEach(() => resetStore(fileStore()));

  it("writes one file per workspace", async () => {
    await add(WS_A, "entry", record());
    const onDisk = JSON.parse(await fs.readFile(path.join(dir, `ws-${WS_A}.json`), "utf8"));
    expect(onDisk.entries).toHaveLength(1);
  });

  it("surfaces corrupt data instead of silently overwriting it", async () => {
    await fs.writeFile(path.join(dir, `ws-${WS_A}.json`), "{not json");
    await expect(load(WS_A)).rejects.toThrow();
  });

  it("refuses workspace ids that are not server-derived hex", async () => {
    await expect(load("../../etc/passwd")).rejects.toThrow("invalid workspace id");
  });
});

describe("backend selection", () => {
  afterEach(() => {
    delete process.env.VERCEL;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("never uses a shared file on Vercel without a database", async () => {
    delete process.env.GWC_DATA_DIR;
    process.env.VERCEL = "1";
    resetStore();
    const { storageMode } = await import("@/lib/store");
    expect(storageMode()).toBe("temporary");
  });

  it("uses Redis when Upstash credentials are present", async () => {
    process.env.VERCEL = "1";
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    resetStore();
    const { storageMode } = await import("@/lib/store");
    expect(storageMode()).toBe("persistent");
  });

  it("uses local files outside Vercel", async () => {
    resetStore();
    const { storageMode } = await import("@/lib/store");
    expect(storageMode()).toBe("local");
  });
});
