import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { add, load, remove } from "@/lib/store";

let dir;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "gwc-"));
  process.env.GWC_DATA_DIR = dir;
});
afterEach(async () => {
  delete process.env.GWC_DATA_DIR;
  await fs.rm(dir, { recursive: true, force: true });
});

describe("store", () => {
  it("starts empty when no file exists", async () => {
    expect(await load()).toEqual({ entries: [], payouts: [] });
  });

  it("persists records to disk and assigns ids", async () => {
    const saved = await add("entry", { date: "2026-01-01", platform: "Uber", amountMinor: 100 });
    expect(saved.id).toBeTruthy();
    const onDisk = JSON.parse(await fs.readFile(path.join(dir, "db.json"), "utf8"));
    expect(onDisk.entries).toHaveLength(1);
  });

  it("does not lose writes under concurrency", async () => {
    await Promise.all(
      Array.from({ length: 25 }, (_, i) => add("payout", { date: "2026-01-01", platform: "Ola", amountMinor: i + 1 })),
    );
    expect((await load()).payouts).toHaveLength(25);
  });

  it("removes by id and reports misses", async () => {
    const { id } = await add("entry", { date: "2026-01-01", platform: "Uber", amountMinor: 100 });
    expect(await remove("entry", "missing")).toBe(false);
    expect(await remove("entry", id)).toBe(true);
    expect((await load()).entries).toEqual([]);
  });

  it("surfaces corrupt data instead of silently overwriting it", async () => {
    await fs.writeFile(path.join(dir, "db.json"), "{not json");
    await expect(load()).rejects.toThrow();
  });
});
