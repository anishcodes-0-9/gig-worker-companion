import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

// Tiny JSON-file store. Writes are serialised through a promise chain and made
// atomic with write-to-temp + rename, so a crash cannot leave a half-written file.
// Single-user, single-process by design (see README for limits).

/** On Vercel only /tmp is writable, and it is wiped when an instance is recycled. */
export const temporaryStorage = () => !process.env.GWC_DATA_DIR && Boolean(process.env.VERCEL);

const dir = () => path.resolve(process.env.GWC_DATA_DIR || (temporaryStorage() ? "/tmp/gwc-data" : ".data"));
const file = () => path.join(dir(), "db.json");
const empty = () => ({ entries: [], payouts: [] });

let queue = Promise.resolve();

async function read() {
  try {
    const parsed = JSON.parse(await fs.readFile(file(), "utf8"));
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      payouts: Array.isArray(parsed.payouts) ? parsed.payouts : [],
    };
  } catch (error) {
    if (error.code === "ENOENT") return empty();
    throw error;
  }
}

async function write(data) {
  await fs.mkdir(dir(), { recursive: true });
  const tmp = `${file()}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, file());
}

/** Run `fn(data)` exclusively; persist the (mutated) data and return fn's result. */
function transaction(fn) {
  const run = queue.then(async () => {
    const data = await read();
    const result = await fn(data);
    await write(data);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

export const KINDS = { entry: "entries", payout: "payouts" };

export function load() {
  const run = queue.then(read);
  queue = run.catch(() => {});
  return run;
}

export function add(kind, record) {
  return transaction((data) => {
    const saved = { id: randomUUID(), createdAt: new Date().toISOString(), ...record };
    data[KINDS[kind]].push(saved);
    return saved;
  });
}

/** @returns {Promise<boolean>} whether a record was removed */
export function remove(kind, id) {
  return transaction((data) => {
    const list = data[KINDS[kind]];
    const index = list.findIndex((r) => r.id === id);
    if (index === -1) return false;
    list.splice(index, 1);
    return true;
  });
}
