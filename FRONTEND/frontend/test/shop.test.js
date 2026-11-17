import { describe, expect, it } from "vitest";
import { BOOKSY, REVIEWS, SERVICES, SERVICE_GROUPS, describeService, groupForService } from "@/lib/shop";
import { safeNext } from "@/lib/auth";

describe("shop facts", () => {
  it("puts every service in a group that exists", () => {
    const groups = new Set(SERVICE_GROUPS.map((g) => g.id));
    SERVICES.forEach((s) => expect(groups.has(s.group)).toBe(true));
  });

  it.each([
    ["Haircut & Shave", "cuts"],
    ["Kids Cutz (1–12)", "cuts"],
    ["Line", "lines"],
    ["Senior Line", "lines"],
    ["Beard Trim", "beard"],
    ["Shave", "beard"],
  ])("files %s under %s", (name, group) => {
    expect(groupForService(name)).toBe(group);
  });

  it("describes services the API names differently", () => {
    expect(describeService("Haircut and Shave")).toMatch(/full sitting/);
    expect(describeService("Kids Cut")).toMatch(/Ages 1 to 12/);
    expect(describeService("Something new")).toBe("");
  });
});

describe("safeNext", () => {
  it("only follows paths on this site", () => {
    expect(safeNext("/book?service=Haircut")).toBe("/book?service=Haircut");
    expect(safeNext("//evil.example")).toBe("/dashboard");
    expect(safeNext("https://evil.example")).toBe("/dashboard");
    expect(safeNext(null, "/")).toBe("/");
  });
});

describe("reviews", () => {
  it("are attributed to a client, a service and a barber, and link back to the source", () => {
    expect(BOOKSY.url).toMatch(/^https:\/\/booksy\.com\//);
    expect(REVIEWS.length).toBeGreaterThan(0);
    for (const r of REVIEWS) {
      expect(r.quote.trim()).not.toBe("");
      expect(r.name.trim()).not.toBe("");
      expect(r.service.trim()).not.toBe("");
      expect(r.barber.trim()).not.toBe("");
    }
  });
});
