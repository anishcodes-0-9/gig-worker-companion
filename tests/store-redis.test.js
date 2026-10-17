import { describe, expect, it, vi } from "vitest";
import { redisStore } from "@/lib/store/redis";

const WS = "c".repeat(32);
const TOKEN = "redis-test-secret-token";

// Minimal fake of the Upstash REST /pipeline endpoint backed by a Map of hashes.
function fakeUpstash({ status = 200 } = {}) {
  const hashes = new Map();
  const calls = [];
  const run = ([cmd, key, ...args]) => {
    const h = hashes.get(key) ?? new Map();
    hashes.set(key, h);
    switch (cmd) {
      case "HGETALL": return [...h].flat();
      case "HLEN": return h.size;
      case "HSET": h.set(args[0], args[1]); return 1;
      case "HDEL": return h.delete(args[0]) ? 1 : 0;
      case "EXPIRE": return 1;
      default: throw new Error(cmd);
    }
  };
  const fetchImpl = vi.fn(async (url, init) => {
    const commands = JSON.parse(init.body);
    calls.push({ url, init, commands });
    if (status !== 200) return new Response(`error mentioning ${TOKEN}`, { status });
    return Response.json(commands.map((c) => ({ result: run(c) })));
  });
  return { fetchImpl, calls };
}

describe("redis store", () => {
  it("stores records under workspace-scoped keys with a TTL", async () => {
    const { fetchImpl, calls } = fakeUpstash();
    const store = redisStore({ url: "https://db.upstash.io/", token: TOKEN, fetchImpl });
    await store.insert(WS, "entries", { id: "r1", amountMinor: 100 });

    const { url, init, commands } = calls[0];
    expect(url).toBe("https://db.upstash.io/pipeline");
    expect(init.headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(commands[0].slice(0, 3)).toEqual(["HSET", `gwc:ws:${WS}:entries`, "r1"]);
    expect(commands[1][0]).toBe("EXPIRE");

    expect(await store.load(WS)).toEqual({ entries: [{ id: "r1", amountMinor: 100 }], payouts: [] });
    expect(await store.load("d".repeat(32))).toEqual({ entries: [], payouts: [] });
    expect(await store.count(WS, "entries")).toBe(1);
  });

  it("reports whether a delete removed anything", async () => {
    const { fetchImpl } = fakeUpstash();
    const store = redisStore({ url: "https://db.upstash.io", token: TOKEN, fetchImpl });
    await store.insert(WS, "payouts", { id: "p1" });
    expect(await store.remove(WS, "payouts", "nope")).toBe(false);
    expect(await store.remove(WS, "payouts", "p1")).toBe(true);
  });

  it("fails without echoing the token or response body", async () => {
    const { fetchImpl } = fakeUpstash({ status: 401 });
    const store = redisStore({ url: "https://db.upstash.io", token: TOKEN, fetchImpl });
    const error = await store.load(WS).catch((e) => e);
    expect(error.message).toBe("storage request failed: HTTP 401");
    expect(error.message).not.toContain(TOKEN);
  });
});
