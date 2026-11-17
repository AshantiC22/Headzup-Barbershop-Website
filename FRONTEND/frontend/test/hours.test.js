import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_HOURS, fromApi, metaFromApi, toApi, weekProblem, WEEK_ORDER } from "@/lib/hours";
import { shopStatus } from "@/lib/time";

// What the API sends: Monday is 0
const apiWeek = (changes = {}) => ({
  days: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    day_of_week: d,
    day_name: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][d],
    is_open: d !== 6,
    open_time: "09:00",
    close_time: d === 5 ? "16:00" : "18:00",
    ...changes[d],
  })),
  updated_by: "Mr. Jay",
  updated_at: "2026-11-17T19:30:00Z",
});

describe("fallback week", () => {
  it("has a row for every weekday, indexed like Date#getDay", () => {
    expect(DEFAULT_HOURS).toHaveLength(7);
    DEFAULT_HOURS.forEach((h, i) => expect(h.day).toBe(i));
    DEFAULT_HOURS.filter((h) => h.open).forEach((h) => expect(h.open < h.close).toBe(true));
    expect(DEFAULT_HOURS[0].open).toBeNull(); // Sunday
  });
});

describe("fromApi", () => {
  it("turns the API's Monday-first week into getDay order", () => {
    const week = fromApi(apiWeek({ 0: { is_open: false }, 5: { open_time: "10:00", close_time: "14:00" } }));
    expect(week[1]).toMatchObject({ day: 1, label: "Monday", open: null, close: null });
    expect(week[6]).toMatchObject({ day: 6, label: "Saturday", open: "10:00", close: "14:00" });
    expect(week[0]).toMatchObject({ label: "Sunday", open: null });
    expect(week[2]).toMatchObject({ label: "Tuesday", open: "09:00", close: "18:00" });
  });

  it("refuses anything that isn't a full, sane week", () => {
    expect(fromApi(null)).toBeNull();
    expect(fromApi({ days: apiWeek().days.slice(0, 6) })).toBeNull();
    expect(fromApi({ days: [...apiWeek().days.slice(0, 6), apiWeek().days[0]] })).toBeNull();
    expect(fromApi({ days: apiWeek().days.map((d) => ({ ...d, day_of_week: 9 })) })).toBeNull();
  });

  it("treats an open day with broken times as closed rather than showing nonsense", () => {
    const week = fromApi(
      apiWeek({ 2: { open_time: "late", close_time: "18:00" }, 3: { open_time: "18:00", close_time: "09:00" } }),
    );
    expect(week[3].open).toBeNull();
    expect(week[4].open).toBeNull();
  });

  it("knows who changed it", () => {
    expect(metaFromApi(apiWeek())).toEqual({ by: "Mr. Jay", at: "2026-11-17T19:30:00Z" });
    expect(metaFromApi({ ...apiWeek(), updated_by: null })).toBeNull();
  });
});

describe("toApi and weekProblem", () => {
  const rows = () =>
    WEEK_ORDER.map((d) => ({
      day: d,
      label: DEFAULT_HOURS[d].label,
      isOpen: !!DEFAULT_HOURS[d].open,
      open: DEFAULT_HOURS[d].open || "09:00",
      close: DEFAULT_HOURS[d].close || "18:00",
    }));

  it("sends Monday as 0 and Sunday as 6", () => {
    const body = toApi(rows());
    expect(body.days[0]).toMatchObject({ day_of_week: 0, is_open: true, open_time: "09:00" });
    expect(body.days[6]).toMatchObject({ day_of_week: 6, is_open: false });
  });

  it("round-trips through the API shape", () => {
    const back = fromApi(toApi(rows()));
    expect(back).toEqual(DEFAULT_HOURS);
  });

  it("names the day that's wrong", () => {
    const r = rows();
    expect(weekProblem(r)).toBe("");
    r[2] = { ...r[2], open: "18:00", close: "09:00" };
    expect(weekProblem(r)).toBe("Wednesday closes before it opens.");
    expect(weekProblem(rows().map((x) => ({ ...x, isOpen: false })))).toMatch(/at least one day/);
    const blank = rows();
    blank[0] = { ...blank[0], open: "" };
    expect(weekProblem(blank)).toBe("Monday needs an opening and a closing time.");
  });
});

describe("shopStatus follows the saved week", () => {
  afterEach(() => vi.useRealTimers());

  it("is closed on a Monday the owner closed, and points to Tuesday", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-16T16:00:00Z")); // Monday 10 AM in Hattiesburg
    const week = fromApi(apiWeek({ 0: { is_open: false } }));
    expect(shopStatus(week)).toMatchObject({ open: false, detail: "opens tomorrow at 9:00 AM" });
    expect(shopStatus()).toMatchObject({ open: true }); // the fallback week is open Mondays
  });

  it("uses late hours when they're set", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-18T01:30:00Z")); // Tuesday 7:30 PM
    const week = fromApi(apiWeek({ 1: { close_time: "21:00" } }));
    expect(shopStatus(week)).toMatchObject({ open: true, detail: "until 9:00 PM" });
  });
});
