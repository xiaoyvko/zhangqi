import { describe, expect, it } from "vitest";
import { profilePlatformContent } from "./profilePlatform.js";

describe("profile platform copy", () => {
  it("uses APK-specific status and data-loss copy on native Android", () => {
    expect(profilePlatformContent({
      isNative: true,
      notificationState: "default",
      reminderPermission: "granted",
      exactAlarmPermission: "granted",
      reminderEnabled: true,
    })).toEqual({
      reminderCard: {
        isReady: true,
        title: "账单提醒已就绪",
        description: "将按所选时间提醒你",
        actionLabel: "设置",
      },
      deviceLabel: "本机 APK",
      dataLossWarning: "卸载应用或清除应用数据可能删除账目。日常流水不会共享给朋友。",
    });
  });

  it("does not report Native reminders ready without exact-alarm access", () => {
    expect(profilePlatformContent({
      isNative: true,
      notificationState: "default",
      reminderPermission: "granted",
      exactAlarmPermission: "denied",
      reminderEnabled: true,
    }).reminderCard).toEqual({
      isReady: false,
      title: "精确提醒未开启",
      description: "前往提醒偏好允许“闹钟和提醒”权限",
      actionLabel: "设置",
    });
  });

  it("does not report Native reminders ready without notification access", () => {
    expect(profilePlatformContent({
      isNative: true,
      notificationState: "default",
      reminderPermission: "denied",
      exactAlarmPermission: "granted",
      reminderEnabled: true,
    }).reminderCard).toEqual({
      isReady: false,
      title: "系统通知未开启",
      description: "前往提醒偏好开启通知权限",
      actionLabel: "设置",
    });
  });

  it("does not report Native reminders ready while the global switch is off", () => {
    expect(profilePlatformContent({
      isNative: true,
      notificationState: "default",
      reminderPermission: "granted",
      exactAlarmPermission: "granted",
      reminderEnabled: false,
    }).reminderCard).toEqual({
      isReady: false,
      title: "账单提醒已关闭",
      description: "前往提醒偏好重新开启",
      actionLabel: "设置",
    });
  });

  it("preserves existing browser/PWA copy on web", () => {
    expect(profilePlatformContent({
      isNative: false,
      notificationState: "denied",
      reminderPermission: "granted",
      exactAlarmPermission: "granted",
      reminderEnabled: true,
    })).toEqual({
      reminderCard: {
        isReady: false,
        title: "开启账单提醒",
        description: "不再错过续费和固定扣款",
        actionLabel: "开启",
      },
      deviceLabel: "本机 PWA",
      dataLossWarning: "卸载应用或清除浏览器数据可能删除账目。日常流水不会共享给朋友。",
    });
  });
});
