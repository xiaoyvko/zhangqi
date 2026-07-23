const REMINDER_SYNC_ERROR = "提醒同步失败，请检查系统设置后重试";

export function reduceReminderSyncError(current, action) {
  if (action.type === "success") return "";
  if (action.type === "failure") return REMINDER_SYNC_ERROR;
  return current;
}
