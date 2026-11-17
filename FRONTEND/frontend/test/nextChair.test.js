import { describe, expect, it } from "vitest";
import { alternatives, bookingHref, fetchSlots, findNextChair, hhmm, pickOpenings, shopToday } from "@/lib/nextChair";

const jay = { id: 1, name: "Mr. Jay" };
const jarvis = { id: 2, name: "Jarvis" };

describe("pickOpenings", () => {
  it("sorts every barber's times together, earliest first", () => {
    const got = pickOpenings([
      { barber: jay, slots: ["15:00:00", "09:30:00"] },
      { barber: jarvis, slots: ["10:00:00"] },
    ]);
    expect(got.map((o) => `${o.barber.name} ${o.time}`)).toEqual(["Mr. Jay 09:30", "Jarvis 10:00", "Mr. Jay 15:00"]);
  });

  it("breaks a tie by the order barbers are listed", () => {
    const got = pickOpenings([
      { barber: jarvis, slots: ["11:00:00"] },
      { barber: jay, slots: ["11:00:00"] },
    ]);
    expect(got[0].barber).toBe(jarvis);
  });

  it("ignores junk and duplicates instead of breaking", () => {
    const got = pickOpenings([
      { barber: jay, slots: ["", null, "noon", "9:00", "09:00:00", 42] },
      { barber: jarvis, slots: undefined },
    ]);
    expect(got).toEqual([{ barber: jay, time: "09:00" }]);
  });
});

describe("alternatives", () => {
  it("offers the other barber before more of the same one", () => {
    const openings = pickOpenings([
      { barber: jay, slots: ["09:00", "09:30", "10:00", "10:30"] },
      { barber: jarvis, slots: ["13:00"] },
    ]);
    const alts = alternatives(openings, 2);
    expect(alts.map((o) => `${o.barber.name} ${o.time}`)).toEqual(["Mr. Jay 09:30", "Jarvis 13:00"]);
  });

  it("is empty with nothing to offer", () => {
    expect(alternatives([])).toEqual([]);
    expect(alternatives([{ barber: jay, time: "09:00" }])).toEqual([]);
  });
});

describe("findNextChair", () => {
  // 2026-11-16 is a Monday
  const MONDAY = "2026-11-16";

  it("stops at the first day anyone has an opening", async () => {
    const asked = [];
    const getSlots = async (id, date) => {
      asked.push(date);
      return date === "2026-11-17" && id === 2 ? ["14:30:00"] : [];
    };
    const got = await findNextChair({ barbers: [jay, jarvis], today: MONDAY, getSlots });
    expect(got.date).toBe("2026-11-17");
    expect(got.openings[0]).toEqual({ barber: jarvis, time: "14:30" });
    expect(new Set(asked)).toEqual(new Set([MONDAY, "2026-11-17"]));
  });

  it("skips Sunday without asking", async () => {
    const asked = [];
    const getSlots = async (id, date) => {
      asked.push(date);
      return date === "2026-11-23" ? ["09:00"] : [];
    };
    // Saturday the 21st: next is Monday the 23rd, never Sunday the 22nd
    const got = await findNextChair({ barbers: [jay], today: "2026-11-21", getSlots });
    expect(got.date).toBe("2026-11-23");
    expect(asked).not.toContain("2026-11-22");
  });

  it("says so when the whole week is booked", async () => {
    const got = await findNextChair({ barbers: [jay], today: MONDAY, getSlots: async () => [] });
    expect(got).toEqual({ date: null, openings: [], partial: false });
  });

  it("still answers when one barber's book fails, and flags it", async () => {
    const getSlots = async (id) => {
      if (id === 1) throw new Error("500");
      return ["10:00"];
    };
    const got = await findNextChair({ barbers: [jay, jarvis], today: MONDAY, getSlots });
    expect(got.openings[0].barber).toBe(jarvis);
    expect(got.partial).toBe(true);
  });

  it("throws when no book can be read, so the page can offer the phone instead", async () => {
    const getSlots = async () => {
      throw new Error("offline");
    };
    await expect(findNextChair({ barbers: [jay, jarvis], today: MONDAY, getSlots })).rejects.toThrow();
  });

  it("has nothing to find with no barbers", async () => {
    const got = await findNextChair({ barbers: [], today: MONDAY, getSlots: async () => ["09:00"] });
    expect(got.openings).toEqual([]);
  });
});

describe("fetchSlots", () => {
  const respond = (status, body) => async () => ({ status, ok: status < 300, json: async () => body });

  it("reads available_slots", async () => {
    const got = await fetchSlots(1, "2026-11-16", { fetchImpl: respond(200, { available_slots: ["09:00:00"] }) });
    expect(got).toEqual(["09:00:00"]);
  });

  it("treats an inactive barber as fully booked rather than an error", async () => {
    expect(await fetchSlots(1, "2026-11-16", { fetchImpl: respond(404, {}) })).toEqual([]);
  });

  it("throws on a server error", async () => {
    await expect(fetchSlots(1, "2026-11-16", { fetchImpl: respond(502, null) })).rejects.toThrow();
  });

  it("gives up on a request that hangs", async () => {
    const hang = (url, { signal }) =>
      new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))));
    const { REQUEST_TIMEOUT_MS } = await import("@/lib/nextChair");
    expect(REQUEST_TIMEOUT_MS).toBeLessThanOrEqual(8000);
    // can't wait out the real timeout here; an outside abort uses the same path
    const ctrl = new AbortController();
    const p = fetchSlots(1, "2026-11-16", { fetchImpl: hang, signal: ctrl.signal });
    ctrl.abort();
    await expect(p).rejects.toThrow();
  });
});

describe("helpers", () => {
  it("formats times and links", () => {
    expect(hhmm("9:05:00")).toBe("09:05");
    expect(bookingHref({ barber: jarvis, time: "14:30" }, "2026-11-17")).toBe(
      "/book?barber=2&date=2026-11-17&time=14%3A30",
    );
  });

  it("dates today in Central time, not the visitor's zone", () => {
    // 03:30 UTC on the 17th is still the evening of the 16th in Hattiesburg
    expect(shopToday(new Date("2026-11-17T03:30:00Z"))).toBe("2026-11-16");
  });
});
