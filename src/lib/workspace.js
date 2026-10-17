import { createHash, randomBytes } from "node:crypto";

// Anonymous per-browser workspaces. The server issues a random 256-bit token in
// an HttpOnly cookie and derives the workspace id from its hash, so the id is
// never taken from the client and the raw token is never stored. This separates
// visitors' records; it is not authentication (anyone holding the cookie, e.g.
// on a shared phone, sees the same records).

export const WORKSPACE_COOKIE = "gwc_ws";
const MAX_AGE_SECONDS = 90 * 24 * 60 * 60;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/; // base64url of 32 bytes
export const WORKSPACE_ID_RE = /^[0-9a-f]{32}$/;

const workspaceId = (token) => createHash("sha256").update(token).digest("hex").slice(0, 32);

function readCookie(header, name) {
  for (const part of (header ?? "").split(";")) {
    const eq = part.indexOf("=");
    if (eq !== -1 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

/**
 * The caller's workspace. A missing or malformed cookie starts a new, empty
 * workspace (isNew), whose cookie the response must set.
 * @returns {{ id: string, token: string, isNew: boolean }}
 */
export function resolveWorkspace(request) {
  const token = readCookie(request.headers.get("cookie"), WORKSPACE_COOKIE);
  if (token && TOKEN_RE.test(token)) return { id: workspaceId(token), token, isNew: false };
  const fresh = randomBytes(32).toString("base64url");
  return { id: workspaceId(fresh), token: fresh, isNew: true };
}

export function workspaceCookie(token, request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${WORKSPACE_COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${secure}`;
}

/** Wrap a route handler as handler(request, workspace), setting the cookie for new workspaces. */
export function withWorkspace(handler) {
  return async (request) => {
    const workspace = resolveWorkspace(request);
    const response = await handler(request, workspace);
    if (workspace.isNew) response.headers.append("set-cookie", workspaceCookie(workspace.token, request));
    return response;
  };
}
