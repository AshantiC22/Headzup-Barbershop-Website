import { describe, expect, it } from "vitest";
import { fadeAxes } from "@/components/site/Wordmark";

describe("fadeAxes", () => {
  it("runs from heaviest and narrowest to lightest and widest", () => {
    const first = fadeAxes(0, 7);
    const last = fadeAxes(6, 7);
    expect(first).toEqual({ wght: 900, wdth: 56 });
    expect(last).toEqual({ wght: 220, wdth: 124 });
  });

  it("steps evenly, with no jump bigger than the rest", () => {
    const steps = [0, 1, 2, 3, 4, 5, 6].map((i) => fadeAxes(i, 7).wght);
    const gaps = steps.slice(1).map((w, i) => steps[i] - w);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1);
  });

  it("stays inside the font's axes for any length, including one letter", () => {
    for (const n of [1, 3, 7, 12]) {
      for (let i = 0; i < n; i++) {
        const { wght, wdth } = fadeAxes(i, n);
        expect(wght).toBeGreaterThanOrEqual(100);
        expect(wght).toBeLessThanOrEqual(900);
        expect(wdth).toBeGreaterThanOrEqual(50);
        expect(wdth).toBeLessThanOrEqual(150);
      }
    }
  });
});
