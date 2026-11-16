import { describe, expect, it } from "vitest";
import { HOURS, SERVICES, SERVICE_GROUPS, describeService, groupForService } from "@/lib/shop";
import { safeNext } from "@/lib/auth";

describe("shop facts", () => {
  it("has a row for every weekday, indexed like Date#getDay", () => {
    expect(HOURS).toHaveLength(7);
    HOURS.forEach((h, i) => expect(h.day).toBe(i));
    HOURS.filter((h) => h.open).forEach((h) => expect(h.open < h.close).toBe(true));
  });

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

describe("tool icons", () => {
  it("gives every service one or two tools that exist, and crosses the shaves with a razor", async () => {
    const { toolsForService } = await import("@/components/art/ToolIcons");
    const known = new Set(["clippers", "razor", "shears", "trimmer", "comb", "brush"]);
    for (const s of SERVICES) {
      const tools = toolsForService(s.name);
      expect(tools.length).toBeGreaterThanOrEqual(1);
      expect(tools.length).toBeLessThanOrEqual(2);
      tools.forEach((t) => expect(known.has(t)).toBe(true));
      if (/shave/i.test(s.name)) expect(tools).toContain("razor");
    }
  });
});
