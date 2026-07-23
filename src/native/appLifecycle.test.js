import { describe, expect, it, vi } from "vitest";
import { registerNativeAppStateListener } from "./appLifecycle.js";

describe("native app lifecycle", () => {
  it("runs foreground reconciliation only when the app becomes active", async () => {
    let appStateListener;
    const remove = vi.fn();
    const onForeground = vi.fn();
    const appPlugin = {
      async addListener(eventName, listener) {
        expect(eventName).toBe("appStateChange");
        appStateListener = listener;
        return { remove };
      },
    };

    const unregister = registerNativeAppStateListener(appPlugin, onForeground);
    await Promise.resolve();
    await appStateListener({ isActive: false });
    await appStateListener({ isActive: true });

    expect(onForeground).toHaveBeenCalledTimes(1);
    unregister();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("removes a listener that resolves after React cleanup", async () => {
    let resolveHandle;
    const remove = vi.fn();
    const appPlugin = {
      addListener() {
        return new Promise((resolve) => { resolveHandle = resolve; });
      },
    };

    const unregister = registerNativeAppStateListener(appPlugin, vi.fn());
    unregister();
    resolveHandle({ remove });
    await Promise.resolve();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
