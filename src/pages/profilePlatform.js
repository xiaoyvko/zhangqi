export function profilePlatformContent({
  isNative,
  notificationState,
  reminderPermission,
}) {
  return {
    notificationPermission: isNative ? reminderPermission : notificationState,
    deviceLabel: isNative ? "本机 APK" : "本机 PWA",
    dataLossWarning: isNative
      ? "卸载应用或清除应用数据可能删除账目。日常流水不会共享给朋友。"
      : "卸载应用或清除浏览器数据可能删除账目。日常流水不会共享给朋友。",
  };
}
