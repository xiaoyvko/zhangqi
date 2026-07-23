import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_REMINDER_SETTINGS } from "../domain/reminders.js";
import { ReminderSettingsModal } from "./ReminderSettingsModal.jsx";

describe("ReminderSettingsModal status feedback", () => {
  it("shows exact-alarm guidance and a reminder-sync retry action", () => {
    const markup = renderToStaticMarkup(
      <ReminderSettingsModal
        settings={DEFAULT_REMINDER_SETTINGS}
        permission="granted"
        exactAlarmPermission="denied"
        reminderSyncError="提醒同步失败，请检查系统设置后重试"
        isNative
        onSave={vi.fn()}
        onRequestPermission={vi.fn()}
        onOpenExactAlarmSettings={vi.fn()}
        onRetrySync={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(markup).toContain("需要开启“闹钟和提醒”权限");
    expect(markup).toContain("前往系统设置");
    expect(markup).toContain("提醒同步失败，请检查系统设置后重试");
    expect(markup).toContain("重试同步");
  });
});
