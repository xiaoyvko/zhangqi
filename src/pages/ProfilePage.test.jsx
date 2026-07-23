import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProfilePage } from "./ProfilePage.jsx";

describe("ProfilePage Native reminder card", () => {
  it("shows an exact-alarm settings action instead of claiming reminders are enabled", () => {
    const markup = renderToStaticMarkup(
      <ProfilePage
        profile={{ name: "测试用户", avatarData: "" }}
        onUpdateProfile={vi.fn()}
        notificationState="default"
        reminderPermission="granted"
        exactAlarmPermission="denied"
        isNative
        onAskNotification={vi.fn()}
        reminderSettings={{ enabled: true, daysBefore: 3, time: "09:00" }}
        onOpenReminderSettings={vi.fn()}
        bills={[]}
        transactions={[]}
        storageError=""
      />,
    );

    expect(markup).toContain("精确提醒未开启");
    expect(markup).toContain("前往提醒偏好允许“闹钟和提醒”权限");
    expect(markup).toContain(">设置</button>");
    expect(markup).not.toContain("已开启</span>");
  });
});
