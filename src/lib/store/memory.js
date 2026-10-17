// In-memory backend for serverless hosting without a database. Records are
// separated per workspace but live only as long as the server instance, and
// different instances do not share them. The UI says so ("temporary").

const MAX_WORKSPACES = 500; // bounds memory use on a public demo

export function memoryStore() {
  const workspaces = new Map();

  function get(workspaceId) {
    let data = workspaces.get(workspaceId);
    if (data) {
      workspaces.delete(workspaceId); // re-insert to keep most recently used last
    } else {
      data = { entries: [], payouts: [] };
      if (workspaces.size >= MAX_WORKSPACES) workspaces.delete(workspaces.keys().next().value);
    }
    workspaces.set(workspaceId, data);
    return data;
  }

  return {
    mode: "temporary",
    load: async (workspaceId) => {
      const data = workspaces.get(workspaceId);
      return { entries: [...(data?.entries ?? [])], payouts: [...(data?.payouts ?? [])] };
    },
    count: async (workspaceId, list) => workspaces.get(workspaceId)?.[list].length ?? 0,
    insert: async (workspaceId, list, record) => {
      get(workspaceId)[list].push(record);
    },
    remove: async (workspaceId, list, id) => {
      const records = workspaces.get(workspaceId)?.[list] ?? [];
      const index = records.findIndex((r) => r.id === id);
      if (index === -1) return false;
      records.splice(index, 1);
      return true;
    },
  };
}
