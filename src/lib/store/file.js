import fs from "node:fs/promises";
import path from "node:path";
import { WORKSPACE_ID_RE } from "../workspace.js";

// JSON-file backend for local use: one file per workspace. Writes are
// serialised through a promise chain and made atomic with write-to-temp +
// rename, so a crash cannot leave a half-written file. Single process only.

const dir = () => path.resolve(process.env.GWC_DATA_DIR || ".data");

function file(workspaceId) {
  // Ids are server-derived hex, but check anyway so no value can escape the data dir.
  if (!WORKSPACE_ID_RE.test(workspaceId)) throw new Error("invalid workspace id");
  return path.join(dir(), `ws-${workspaceId}.json`);
}

async function read(workspaceId) {
  try {
    const parsed = JSON.parse(await fs.readFile(file(workspaceId), "utf8"));
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      payouts: Array.isArray(parsed.payouts) ? parsed.payouts : [],
    };
  } catch (error) {
    if (error.code === "ENOENT") return { entries: [], payouts: [] };
    throw error;
  }
}

async function write(workspaceId, data) {
  await fs.mkdir(dir(), { recursive: true });
  const target = file(workspaceId);
  const tmp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, target);
}

let queue = Promise.resolve();
function serialised(fn) {
  const run = queue.then(fn);
  queue = run.catch(() => {});
  return run;
}

export function fileStore() {
  return {
    mode: "local",
    load: (workspaceId) => serialised(() => read(workspaceId)),
    count: (workspaceId, list) => serialised(async () => (await read(workspaceId))[list].length),
    insert: (workspaceId, list, record) =>
      serialised(async () => {
        const data = await read(workspaceId);
        data[list].push(record);
        await write(workspaceId, data);
      }),
    remove: (workspaceId, list, id) =>
      serialised(async () => {
        const data = await read(workspaceId);
        const index = data[list].findIndex((r) => r.id === id);
        if (index === -1) return false;
        data[list].splice(index, 1);
        await write(workspaceId, data);
        return true;
      }),
  };
}
