/** fetch JSON helper for the UI: resolves { ok, data } and never throws on HTTP errors. */
export async function api(path, options = {}) {
  try {
    const response = await fetch(path, {
      ...options,
      headers: options.body ? { "content-type": "application/json" } : undefined,
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  } catch {
    return { ok: false, data: { error: "network", message: "Could not reach the server. Check your connection." } };
  }
}
