import { randomUUID } from "node:crypto";
import { AppError } from "../errors.js";
import { fileStore } from "./file.js";
import { memoryStore } from "./memory.js";
import { redisStore } from "./redis.js";

// Record storage, always scoped to a server-derived workspace id (see workspace.js).
// Backend choice:
//   Upstash/Vercel KV REST credentials -> Redis    ("persistent")
//   local / GWC_DATA_DIR               -> JSON file ("local")
//   Vercel without a database          -> memory    ("temporary": never a shared /tmp file)

export const KINDS = { entry: "entries", payout: "payouts" };
export const RECORD_LIMIT = 1000; // per kind, per workspace

let cached = null;

function selectBackend(env) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (url && token) return redisStore({ url, token });
  if (env.GWC_DATA_DIR || !env.VERCEL) return fileStore();
  return memoryStore();
}

/** The configured backend (memoised so the memory backend keeps its data). */
export function backend() {
  cached ??= selectBackend(process.env);
  return cached;
}

/** For tests: forget the memoised backend, or install a specific one. */
export function resetStore(next = null) {
  cached = next;
}

export const storageMode = () => backend().mode;

export const load = (workspaceId) => backend().load(workspaceId);

export async function add(workspaceId, kind, record) {
  const list = KINDS[kind];
  if ((await backend().count(workspaceId, list)) >= RECORD_LIMIT) {
    throw new AppError(409, "record_limit", "Record limit reached. Delete old records first.");
  }
  const saved = { id: randomUUID(), createdAt: new Date().toISOString(), ...record };
  await backend().insert(workspaceId, list, saved);
  return saved;
}

/** @returns {Promise<boolean>} whether a record was removed from this workspace */
export const remove = (workspaceId, kind, id) => backend().remove(workspaceId, KINDS[kind], id);
