import { describe, expect, it, vi } from "vitest";
import { guardReminderSync } from "./reminderSyncGuard.js";

describe("reminder sync mounted guard", () => {
  it("does not publish a pending success after the component unmounts", async () => {
    let resolveSync;
    let mounted = true;
    const onSuccess = vi.fn();
    const onFailure = vi.fn();
    const pending = new Promise((resolve) => { resolveSync = resolve; });
    const guarded = guardReminderSync(pending, {
      isMounted: () => mounted,
      onSuccess,
      onFailure,
    });

    mounted = false;
    resolveSync({ permission: "granted", exactAlarm: "granted" });

    await expect(guarded).resolves.toEqual({
      permission: "granted",
      exactAlarm: "granted",
    });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("does not publish a pending failure after the component unmounts", async () => {
    let rejectSync;
    let mounted = true;
    const onSuccess = vi.fn();
    const onFailure = vi.fn();
    const pending = new Promise((resolve, reject) => { rejectSync = reject; });
    const guarded = guardReminderSync(pending, {
      isMounted: () => mounted,
      onSuccess,
      onFailure,
    });

    mounted = false;
    rejectSync(new Error("sync failed"));

    await expect(guarded).rejects.toThrow("sync failed");
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onFailure).not.toHaveBeenCalled();
  });
});
