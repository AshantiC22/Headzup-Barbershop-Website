import { afterEach, describe, expect, it, vi } from "vitest";

async function rootFor(value) {
  vi.resetModules();
  if (value === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = value;
  return (await import("../lib/config.js")).API_ROOT;
}

describe("API_ROOT", () => {
  const saved = process.env.NEXT_PUBLIC_API_URL;
  afterEach(() => {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = saved;
  });

  it("defaults to the production API", async () => {
    expect(await rootFor(undefined)).toBe("https://api.headzupp.com");
  });

  it("takes the origin as given", async () => {
    expect(await rootFor("https://api.example.com")).toBe("https://api.example.com");
  });

  it("drops a trailing /api, slashes and whitespace so paths don't double up", async () => {
    expect(await rootFor("https://api.example.com/api")).toBe("https://api.example.com");
    expect(await rootFor("https://api.example.com/api/ ")).toBe("https://api.example.com");
    expect(await rootFor(" https://api.example.com// ")).toBe("https://api.example.com");
  });
});

describe("Cash App helpers", () => {
  it("normalizes cashtags", async () => {
    const { cashtag } = await import("../lib/config.js");
    expect(cashtag("MarcusCuts")).toBe("$MarcusCuts");
    expect(cashtag(" $MarcusCuts ")).toBe("$MarcusCuts");
    expect(cashtag("")).toBe("");
    expect(cashtag(null)).toBe("");
  });

  it("builds a pay link with the amount when there is one", async () => {
    const { cashAppLink } = await import("../lib/config.js");
    expect(cashAppLink("$MarcusCuts", "30.00")).toBe("https://cash.app/$MarcusCuts/30");
    expect(cashAppLink("MarcusCuts", "22.5")).toBe("https://cash.app/$MarcusCuts/22.50");
    expect(cashAppLink("MarcusCuts")).toBe("https://cash.app/$MarcusCuts");
    expect(cashAppLink("", "30")).toBe("");
  });
});

describe("ONLINE_PAYMENTS", () => {
  it("is off unless the build says on", async () => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_ONLINE_PAYMENTS;
    expect((await import("../lib/config.js")).ONLINE_PAYMENTS).toBe(false);
    vi.resetModules();
    process.env.NEXT_PUBLIC_ONLINE_PAYMENTS = "on";
    expect((await import("../lib/config.js")).ONLINE_PAYMENTS).toBe(true);
    delete process.env.NEXT_PUBLIC_ONLINE_PAYMENTS;
  });
});
