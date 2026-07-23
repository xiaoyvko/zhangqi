export function profilePlatformContent({
  isNative,
  notificationState,
  reminderPermission,
  exactAlarmPermission,
  reminderEnabled,
}) {
  let reminderCard;
  if (!isNative) {
    const isReady = notificationState === "granted";
    reminderCard = {
      isReady,
      title: isReady ? "系统通知已开启" : "开启账单提醒",
      description: isReady ? "账单到期前提醒你" : "不再错过续费和固定扣款",
      actionLabel: "开启",
    };
  } else if (!reminderEnabled) {
    reminderCard = {
      isReady: false,
      title: "账单提醒已关闭",
      description: "前往提醒偏好重新开启",
      actionLabel: "设置",
    };
  } else if (reminderPermission !== "granted") {
    reminderCard = {
      isReady: false,
      title: "系统通知未开启",
      description: "前往提醒偏好开启通知权限",
      actionLabel: "设置",
    };
  } else if (exactAlarmPermission !== "granted") {
    reminderCard = {
      isReady: false,
      title: "精确提醒未开启",
      description: "前往提醒偏好允许“闹钟和提醒”权限",
      actionLabel: "设置",
    };
  } else {
    reminderCard = {
      isReady: true,
      title: "账单提醒已就绪",
      description: "将按所选时间提醒你",
      actionLabel: "设置",
    };
  }

  return {
    reminderCard,
    deviceLabel: isNative ? "本机 APK" : "本机 PWA",
    dataLossWarning: isNative
      ? "卸载应用或清除应用数据可能删除账目。日常流水不会共享给朋友。"
      : "卸载应用或清除浏览器数据可能删除账目。日常流水不会共享给朋友。",
  };
}
