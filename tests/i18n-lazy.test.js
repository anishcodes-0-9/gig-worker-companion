import { beforeEach, describe, expect, it, vi } from "vitest";

// Fresh module per test so the on-demand registry starts empty.
let i18n;
beforeEach(async () => {
  vi.resetModules();
  i18n = await import("@/lib/i18n");
});

describe("on-demand locales", () => {
  it("bundles only English up front and falls back to it before a language loads", () => {
    expect(Object.keys(i18n.STRINGS)).toEqual(["en"]);
    expect(i18n.translate("ta", "retry")).toBe("Retry");
    expect(i18n.translateMessage("ta", "Enter your name")).toBe("Enter your name");
  });

  it("registers a language's strings and messages once loaded", async () => {
    await i18n.loadLocale("ta");
    expect(i18n.translate("ta", "retry")).not.toBe("Retry");
    expect(i18n.translate("ta", "retry")).toMatch(/[஀-௿]/);
    expect(i18n.translateMessage("ta", "Enter your name")).toMatch(/[஀-௿]/);
    expect(Object.keys(i18n.STRINGS).sort()).toEqual(["en", "ta"]);
  });

  it("loads every supported language and ignores unknown or inherited names", async () => {
    await Promise.all(i18n.LANG_CODES.map(i18n.loadLocale));
    expect(Object.keys(i18n.STRINGS).sort()).toEqual([...i18n.LANG_CODES].sort());
    await i18n.loadLocale("fr");
    await i18n.loadLocale("constructor");
    expect(Object.keys(i18n.STRINGS).sort()).toEqual([...i18n.LANG_CODES].sort());
  });
});
