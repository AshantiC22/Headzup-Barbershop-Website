import { describe, expect, it, vi } from "vitest";
import { arrowSelect, rovingIndex } from "@/components/ui/roving";

function keydown(key, count = 3) {
  const items = Array.from({ length: count }, () => ({ focus: vi.fn() }));
  return { key, preventDefault: vi.fn(), currentTarget: { querySelectorAll: () => items }, items };
}

describe("arrowSelect", () => {
  const options = ["a", "b", "c"];

  it("moves selection and focus together, wrapping at the ends", () => {
    const select = vi.fn();
    const e = keydown("ArrowRight");
    arrowSelect(e, options, "c", select);
    expect(select).toHaveBeenCalledWith("a");
    expect(e.items[0].focus).toHaveBeenCalled();
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it("handles Home and End", () => {
    const select = vi.fn();
    arrowSelect(keydown("End"), options, "a", select);
    arrowSelect(keydown("Home"), options, "c", select);
    expect(select.mock.calls).toEqual([["c"], ["a"]]);
  });

  it("ignores other keys", () => {
    const select = vi.fn();
    const e = keydown("Tab");
    arrowSelect(e, options, "a", select);
    expect(select).not.toHaveBeenCalled();
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it("gives the Tab stop to the selected item, or the first when none is", () => {
    expect(options.map((o) => rovingIndex(o, "b", options))).toEqual([-1, 0, -1]);
    expect(options.map((o) => rovingIndex(o, 0, options))).toEqual([0, -1, -1]);
  });
});
