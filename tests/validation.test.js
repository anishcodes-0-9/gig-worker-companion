import { describe, expect, it } from "vitest";
import { entrySchema, payoutSchema, grievanceSchema, fieldErrors } from "@/lib/validation";

const valid = { date: "2026-01-05", platform: "Uber", amount: "1,250.50" };

describe("entrySchema", () => {
  it("converts money to paise and applies defaults", () => {
    const e = entrySchema.parse(valid);
    expect(e).toMatchObject({ amount: 125050, expenses: 0, hours: 0, note: "" });
  });
  it("accepts expenses and hours", () => {
    const e = entrySchema.parse({ ...valid, expenses: "200", hours: "6.5" });
    expect(e.expenses).toBe(20000);
    expect(e.hours).toBe(6.5);
  });
  it("reports field-level errors", () => {
    const r = entrySchema.safeParse({ date: "2999-01-01", platform: "Nope", amount: "abc", hours: 30 });
    expect(r.success).toBe(false);
    const errors = fieldErrors(r.error);
    expect(Object.keys(errors).sort()).toEqual(["amount", "date", "hours", "platform"]);
  });
  it("rejects zero earnings and invalid dates", () => {
    expect(entrySchema.safeParse({ ...valid, amount: "0" }).success).toBe(false);
    expect(entrySchema.safeParse({ ...valid, date: "2026-02-30" }).success).toBe(false);
  });
});

describe("payoutSchema", () => {
  it("requires a positive amount", () => {
    expect(payoutSchema.safeParse({ ...valid, amount: "0" }).success).toBe(false);
    expect(payoutSchema.parse(valid).amount).toBe(125050);
  });
});

describe("grievanceSchema", () => {
  it("requires a name and meaningful details", () => {
    const r = grievanceSchema.safeParse({ name: "", platform: "Uber", issue: "unpaid", details: "short" });
    expect(Object.keys(fieldErrors(r.error)).sort()).toEqual(["details", "name"]);
  });
});
