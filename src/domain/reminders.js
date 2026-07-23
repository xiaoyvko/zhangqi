export const REMINDER_DAY_OPTIONS = [0, 1, 3, 7];
export const DEFAULT_REMINDER_SETTINGS = {
  enabled: true,
  daysBefore: 3,
  time: "09:00",
};

export function normalizeReminderSettings(value = {}) {
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : true,
    daysBefore: REMINDER_DAY_OPTIONS.includes(Number(value.daysBefore))
      ? Number(value.daysBefore)
      : 3,
    time: /^\d{2}:\d{2}$/.test(value.time || "") &&
      Number(value.time.slice(0, 2)) < 24 &&
      Number(value.time.slice(3, 5)) < 60
      ? value.time
      : "09:00",
  };
}

export function reminderNotificationId(billId) {
  let hash = 2166136261;
  for (const character of String(billId)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return 100000 + ((hash >>> 0) % 2000000000);
}

export function reminderDate(bill, settings) {
  const [year, month, day] = bill.nextDate.split("-").map(Number);
  const [hour, minute] = settings.time.split(":").map(Number);
  return new Date(year, month - 1, day - settings.daysBefore, hour, minute, 0, 0);
}

export function buildReminderNotifications(bills, settingsInput, now = new Date()) {
  const settings = normalizeReminderSettings(settingsInput);
  if (!settings.enabled) return [];
  return bills
    .filter((bill) => bill.reminderEnabled !== false)
    .map((bill) => ({ bill, at: reminderDate(bill, settings) }))
    .filter(({ at }) => at.getTime() > now.getTime())
    .map(({ bill, at }) => ({
      id: reminderNotificationId(bill.id),
      title: `${bill.name}即将扣款`,
      body: `¥${Number(bill.amount).toFixed(2)}，到期日 ${bill.nextDate}`,
      schedule: { at },
      channelId: "bill-reminders",
      extra: { billId: bill.id },
    }));
}
