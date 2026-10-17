import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Static regression check for the header focus indicator (verified visually in Chrome).
const css = fs.readFileSync(path.resolve(import.meta.dirname, "../src/app/globals.css"), "utf8");

const vars = (block) => Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
const light = vars(css.slice(0, css.indexOf("@media (prefers-color-scheme: dark)")));
const dark = vars(css.slice(css.indexOf("@media (prefers-color-scheme: dark)")));

const luminance = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("keyboard focus indicator", () => {
  it("uses the header's text colour inside the header, whose background is the default focus colour", () => {
    expect(css).toMatch(/\.app-header\s*\{[^}]*background:\s*var\(--primary\)/);
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--primary\)/);
    expect(css).toMatch(/\.app-header :focus-visible\s*\{\s*outline-color:\s*var\(--primary-text\)/);
  });

  it.each([["light", light], ["dark", dark]])("is at least 3:1 against the header in the %s theme (WCAG 1.4.11)", (_name, theme) => {
    expect(contrast(theme["primary-text"], theme.primary)).toBeGreaterThanOrEqual(3);
  });
});
