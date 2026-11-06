import { describe, expect, it } from "vitest";
import { composeForegroundClouds, composeHarbor, composeSky, harborLayout, seeded } from "@/lib/painter";

const strokesOf = (c) => JSON.stringify(c.strokes ?? c);

describe("painter", () => {
  it("seeded() repeats its sequence and stays in [0, 1)", () => {
    const a = seeded(42), b = seeded(42);
    for (let i = 0; i < 1000; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("paints the same harbor for the same size, seed and light", () => {
    const opts = { w: 1280, h: 800, mode: "day", seed: 7 };
    expect(strokesOf(composeHarbor(opts))).toBe(strokesOf(composeHarbor(opts)));
    expect(strokesOf(composeSky({ ...opts, mode: "night" }))).toBe(strokesOf(composeSky({ ...opts, mode: "night" })));
    expect(strokesOf(composeForegroundClouds(opts))).toBe(strokesOf(composeForegroundClouds(opts)));
  });

  it("changes with the seed and with the theme", () => {
    const base = { w: 800, h: 600, seed: 7 };
    const day = strokesOf(composeHarbor({ ...base, mode: "day" }));
    expect(strokesOf(composeHarbor({ ...base, mode: "day", seed: 8 }))).not.toBe(day);
    expect(strokesOf(composeHarbor({ ...base, mode: "night" }))).not.toBe(day);
  });

  it.each([[390, 844], [1440, 900], [2560, 1200]])("keeps every stroke drawable at %ix%i", (w, h) => {
    const { strokes } = composeHarbor({ w, h, mode: "night", seed: 7 });
    expect(strokes.length).toBeGreaterThan(1000);
    for (const s of strokes) {
      for (const k of ["x", "y", "angle", "len", "width", "alpha"]) expect(Number.isFinite(s[k])).toBe(true);
      expect(s.alpha).toBeGreaterThan(0);
      expect(s.alpha).toBeLessThanOrEqual(1);
    }
  });

  it("keeps the pole clear of the headline on phones", () => {
    const L = harborLayout(390, 844);
    expect(L.pole.x - L.pole.w / 2).toBeGreaterThan(390 * 0.8);
  });
});
