import { describe, expect, it } from "vitest";
import { reduceReminderSyncError } from "./reminderSyncState.js";

describe("reminder sync UI state", () => {
  it("keeps scheduling errors independent and clears them after a successful retry", () => {
    const failed = reduceReminderSyncError("", { type: "failure" });
    expect(failed).toBe("提醒同步失败，请检查系统设置后重试");
    expect(reduceReminderSyncError(failed, { type: "success" })).toBe("");
  });
});
