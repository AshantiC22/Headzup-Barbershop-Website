import { describe, expect, it } from "vitest";
import { composeFog, composeSky, composeStreet, lampGeometry, seeded, streetLayout } from "@/lib/painter";

const strokesOf = (c) => JSON.stringify(c.strokes ?? c);

// Composing a full-screen painting is real work (tens of thousands of strokes);
// CI machines can be several times slower than a laptop.
describe("painter", { timeout: 30_000 }, () => {
  it("seeded() repeats its sequence and stays in [0, 1)", () => {
    const a = seeded(42),
      b = seeded(42);
    for (let i = 0; i < 1000; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("paints the same street for the same size, seed and light", () => {
    const opts = { w: 1280, h: 800, mode: "night", seed: 7 };
    expect(strokesOf(composeStreet(opts))).toBe(strokesOf(composeStreet(opts)));
    expect(strokesOf(composeSky({ ...opts, mode: "day" }))).toBe(strokesOf(composeSky({ ...opts, mode: "day" })));
    expect(strokesOf(composeFog(opts))).toBe(strokesOf(composeFog(opts)));
  });

  it("changes with the seed and with the theme", () => {
    const base = { w: 800, h: 600, seed: 7 };
    const day = strokesOf(composeStreet({ ...base, mode: "day" }));
    expect(strokesOf(composeStreet({ ...base, mode: "day", seed: 8 }))).not.toBe(day);
    expect(strokesOf(composeStreet({ ...base, mode: "night" }))).not.toBe(day);
  });

  it.each([
    [390, 844],
    [1440, 900],
    [2560, 1200],
  ])("keeps every stroke drawable at %ix%i", (w, h) => {
    const { strokes } = composeStreet({ w, h, mode: "night", seed: 7 });
    expect(strokes.length).toBeGreaterThan(1000);
    for (const s of strokes) {
      for (const k of ["x", "y", "angle", "len", "width", "alpha"]) expect(Number.isFinite(s[k])).toBe(true);
      expect(s.alpha).toBeGreaterThan(0);
      expect(s.alpha).toBeLessThanOrEqual(1);
    }
  });

  it("keeps the pole and moon clear of the headline", () => {
    for (const [w, h] of [
      [390, 844],
      [1440, 900],
    ]) {
      const L = streetLayout(w, h);
      expect(L.pole.x - lampGeometry(L).width / 2).toBeGreaterThan(L.calm.x1 - (L.narrow ? 70 : 0));
      expect(L.moon.x - L.moon.r).toBeGreaterThan(L.narrow ? w * 0.6 : L.calm.x1);
    }
  });

  it("stands the lamp on the street with its globe above the body", () => {
    const L = streetLayout(1440, 900);
    const G = lampGeometry(L);
    expect(G.top).toBeLessThan(L.pole.globeY);
    expect(G.bodyTop).toBeLessThan(G.bodyBottom);
    expect(G.bodyBottom).toBeLessThan(L.pole.base);
  });
});
