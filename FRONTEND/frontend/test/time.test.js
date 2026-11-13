import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, fmtTime, localDateStr, partOfDay, shopStatus, to24Hour, toMinutes } from "@/lib/time";

describe("time formats from the API", () => {
  it.each([
    ["14:30", 870],
    ["14:30:00", 870],
    ["2:30 PM", 870],
    ["2:30 pm", 870],
    ["12:05 AM", 5],
    ["12:00 PM", 720],
    ["09:00:00", 540],
    ["", 0],
  ])("toMinutes(%j) is %i", (input, minutes) => {
    expect(toMinutes(input)).toBe(minutes);
  });

  it("formats 12-hour time exactly once", () => {
    expect(fmtTime("09:00")).toBe("9:00 AM");
    expect(fmtTime("12:00:00")).toBe("12:00 PM");
    expect(fmtTime("00:15")).toBe("12:15 AM");
    // The confirmation page used to receive "10:00 AM" and print "10:00 AM AM".
    expect(fmtTime("10:00 AM")).toBe("10:00 AM");
  });

  it("converts any format to the API's HH:MM:SS", () => {
    expect(to24Hour("2:30 pm")).toBe("14:30:00");
    expect(to24Hour("9:05")).toBe("09:05:00");
  });

  it("buckets slots by part of day", () => {
    expect(partOfDay("11:59")).toBe("Morning");
    expect(partOfDay("12:00")).toBe("Afternoon");
    expect(partOfDay("5:00 PM")).toBe("Evening");
  });
});

describe("calendar dates stay local", () => {
  it("uses the local calendar day, late in the evening too", () => {
    expect(localDateStr(new Date(2026, 10, 6, 23, 30))).toBe("2026-11-06");
  });

  it("adds days across months and the DST change", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("shopStatus is computed in Hattiesburg time", () => {
  afterEach(() => vi.useRealTimers());
  const at = (iso) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
    return shopStatus();
  };

  it("is open on a weekday morning (CST)", () => {
    expect(at("2026-11-06T15:00:00Z")).toMatchObject({
      open: true,
      label: "Open now",
      detail: "until 6:00 PM",
      today: 5,
    });
  });

  it("warns when closing is near", () => {
    expect(at("2026-11-06T23:30:00Z")).toMatchObject({ open: true, label: "Closing soon" });
  });

  it("before opening, points to today", () => {
    expect(at("2026-11-06T13:00:00Z")).toMatchObject({ open: false, detail: "opens today at 9:00 AM" });
  });

  it("after Saturday close, skips Sunday", () => {
    expect(at("2026-11-07T22:30:00Z")).toMatchObject({ open: false, detail: "opens Monday at 9:00 AM" });
  });

  it("on Sunday, opens tomorrow", () => {
    expect(at("2026-11-08T18:00:00Z")).toMatchObject({ open: false, detail: "opens tomorrow at 9:00 AM", today: 0 });
  });

  it("follows daylight saving time (CDT)", () => {
    expect(at("2026-07-10T13:30:00Z").open).toBe(false);
    expect(at("2026-07-10T14:00:00Z").open).toBe(true);
  });
});
