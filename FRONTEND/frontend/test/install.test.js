import { afterEach, describe, expect, it, vi } from "vitest";

// A bare-bones browser: just enough window/navigator for lib/install.js
function browser({ ua = "Mozilla/5.0 (Linux; Android 14) Chrome/130", standalone = false } = {}) {
  const handlers = {};
  vi.stubGlobal("window", {
    addEventListener: (type, fn) => (handlers[type] = fn),
    matchMedia: () => ({ matches: standalone }),
  });
  vi.stubGlobal("navigator", { userAgent: ua, platform: "Linux", maxTouchPoints: 5 });
  return handlers;
}

async function fresh() {
  vi.resetModules();
  return import("@/lib/install");
}

describe("install the app", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("says nothing on a browser that can't install", async () => {
    browser({ ua: "Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Firefox/132.0" });
    const { installState } = await fresh();
    expect(installState()).toBe("none");
  });

  it("knows when it's already on the home screen", async () => {
    browser({ standalone: true });
    const { installState } = await fresh();
    expect(installState()).toBe("installed");
  });

  it("explains the Share menu on an iPhone", async () => {
    browser({ ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1" });
    const { installState } = await fresh();
    expect(installState()).toBe("ios");
  });

  it("keeps Chrome's prompt for the button, and uses it once", async () => {
    const handlers = browser();
    const { catchInstallPrompt, installState, promptInstall } = await fresh();
    catchInstallPrompt();
    const event = {
      preventDefault: vi.fn(),
      prompt: vi.fn(async () => {}),
      userChoice: Promise.resolve({ outcome: "accepted" }),
    };
    handlers.beforeinstallprompt(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(installState()).toBe("prompt");
    expect(await promptInstall()).toBe(true);
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(installState()).toBe("none");
    handlers.appinstalled();
    expect(installState()).toBe("installed");
  });
});
