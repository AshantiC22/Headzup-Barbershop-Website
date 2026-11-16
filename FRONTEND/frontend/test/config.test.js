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
