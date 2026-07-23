import { describe, expect, it } from "vitest";
import { profilePlatformContent } from "./profilePlatform.js";

describe("profile platform copy", () => {
  it("uses APK-specific status and data-loss copy on native Android", () => {
    expect(profilePlatformContent({
      isNative: true,
      notificationState: "default",
      reminderPermission: "granted",
    })).toEqual({
      notificationPermission: "granted",
      deviceLabel: "本机 APK",
      dataLossWarning: "卸载应用或清除应用数据可能删除账目。日常流水不会共享给朋友。",
    });
  });

  it("preserves existing browser/PWA copy on web", () => {
    expect(profilePlatformContent({
      isNative: false,
      notificationState: "denied",
      reminderPermission: "granted",
    })).toEqual({
      notificationPermission: "denied",
      deviceLabel: "本机 PWA",
      dataLossWarning: "卸载应用或清除浏览器数据可能删除账目。日常流水不会共享给朋友。",
    });
  });
});
