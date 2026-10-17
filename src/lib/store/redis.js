// Upstash Redis backend over its REST API (plain fetch, no client library).
// Each workspace has one hash per record list: field = record id, value = JSON.
// HSET/HDEL are atomic per record, so concurrent serverless instances cannot
// overwrite each other's changes. Keys expire 90 days after the last write.

const TTL_SECONDS = 90 * 24 * 60 * 60;
const TIMEOUT_MS = 5_000;

const key = (workspaceId, list) => `gwc:ws:${workspaceId}:${list}`;

export function redisStore({ url, token, fetchImpl = fetch }) {
  async function pipeline(commands) {
    const response = await fetchImpl(`${url.replace(/\/+$/, "")}/pipeline`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    // Never include the response body or token in errors; they may be logged.
    if (!response.ok) throw new Error(`storage request failed: HTTP ${response.status}`);
    const results = await response.json();
    if (!Array.isArray(results) || results.length !== commands.length) throw new Error("storage response malformed");
    const failed = results.find((r) => r?.error);
    if (failed) throw new Error("storage command failed");
    return results.map((r) => r.result);
  }

  const parseHash = (flat) => {
    const records = [];
    for (let i = 1; i < (flat?.length ?? 0); i += 2) {
      try {
        records.push(JSON.parse(flat[i]));
      } catch {
        // skip a corrupt record rather than failing the whole workspace
      }
    }
    return records;
  };

  return {
    mode: "persistent",
    load: async (workspaceId) => {
      const [entries, payouts] = await pipeline([
        ["HGETALL", key(workspaceId, "entries")],
        ["HGETALL", key(workspaceId, "payouts")],
      ]);
      return { entries: parseHash(entries), payouts: parseHash(payouts) };
    },
    count: async (workspaceId, list) => Number((await pipeline([["HLEN", key(workspaceId, list)]]))[0]) || 0,
    insert: async (workspaceId, list, record) => {
      const k = key(workspaceId, list);
      await pipeline([
        ["HSET", k, record.id, JSON.stringify(record)],
        ["EXPIRE", k, String(TTL_SECONDS)],
      ]);
    },
    remove: async (workspaceId, list, id) => {
      const [removed] = await pipeline([["HDEL", key(workspaceId, list), id]]);
      return Number(removed) > 0;
    },
  };
}
