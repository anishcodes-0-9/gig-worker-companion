import { describe, expect, it } from "vitest";
import { readJson } from "@/lib/api";

const req = (body, type) =>
  new Request("http://localhost/api/x", { method: "POST", body, headers: type ? { "content-type": type } : {} });

describe("readJson", () => {
  it("accepts application/json", async () => {
    expect(await readJson(req('{"a":1}', "application/json; charset=utf-8"))).toEqual({ a: 1 });
  });
  it("rejects text/plain (cross-site simple request) with 415", async () => {
    await expect(readJson(req('{"a":1}', "text/plain"))).rejects.toMatchObject({ status: 415 });
  });
  it("rejects a missing content type", async () => {
    await expect(readJson(req('{"a":1}'))).rejects.toMatchObject({ status: 415 });
  });
  it("rejects an oversized body with 413, by header or by actual size", async () => {
    const big = JSON.stringify({ text: "x".repeat(20_000) });
    await expect(readJson(req(big, "application/json"))).rejects.toMatchObject({ status: 413 });
    const lying = new Request("http://localhost/api/x", {
      method: "POST", body: "{}", headers: { "content-type": "application/json", "content-length": "999999" },
    });
    await expect(readJson(lying)).rejects.toMatchObject({ status: 413 });
  });
  it("rejects malformed JSON with 400", async () => {
    await expect(readJson(req("{oops", "application/json"))).rejects.toMatchObject({ status: 400 });
  });
});
