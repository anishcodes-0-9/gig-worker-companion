import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors.js";
import { fieldErrors } from "./validation.js";

// Every legitimate body is a small form; this bounds memory use per request.
const MAX_BODY_BYTES = 16 * 1024;

/** Parse a JSON request body; throws a 4xx AppError when it is unacceptable. */
export async function readJson(request) {
  // A cross-site page can send text/plain without a CORS preflight; requiring
  // application/json forces a preflight, which this app never approves.
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new AppError(415, "unsupported_media_type", "Content-Type must be application/json");
  }
  const tooLarge = () => new AppError(413, "too_large", "Request body is too large");
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) throw tooLarge();
  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) throw tooLarge();
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError(400, "bad_json", "Request body must be valid JSON");
  }
}

/** Wrap a route handler so validation and app errors become consistent JSON. */
export function handle(fn) {
  return async (request) => {
    try {
      return await fn(request);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json({ error: "validation", fields: fieldErrors(error) }, { status: 400 });
      }
      if (error instanceof AppError) {
        return NextResponse.json(
          { error: error.code, message: error.message, fields: error.fields },
          { status: error.status },
        );
      }
      console.error("[api] unexpected error:", error);
      return NextResponse.json({ error: "server", message: "Something went wrong" }, { status: 500 });
    }
  };
}
