import { Capacitor } from "@capacitor/core";
import { buildReminderNotifications } from "../domain/reminders.js";

const CHANNEL = {
  id: "bill-reminders",
  name: "账单提醒",
  description: "固定账单到期提醒",
  importance: 4,
};
const MANAGED_IDS_KEY = "zhangqi-native-reminder-ids";

function defaultIsNativePlatform() {
  return Capacitor.isNativePlatform();
}

function permissionStatus(result) {
  return result?.display ?? "denied";
}

function exactAlarmStatus(result) {
  return result?.exact_alarm ?? "denied";
}

function readManagedIds(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(MANAGED_IDS_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((id) => Number.isInteger(id) && id > 0)
      : [];
  } catch {
    return [];
  }
}

export async function checkReminderPermission(
  plugin,
  isNativePlatform = defaultIsNativePlatform,
) {
  if (!isNativePlatform()) return "web";
  return permissionStatus(await plugin.checkPermissions());
}

export async function requestReminderPermission(
  plugin,
  isNativePlatform = defaultIsNativePlatform,
) {
  if (!isNativePlatform()) return "web";
  return permissionStatus(await plugin.requestPermissions());
}

export async function checkExactReminderSetting(
  plugin,
  isNativePlatform = defaultIsNativePlatform,
) {
  if (!isNativePlatform()) return "web";
  return exactAlarmStatus(await plugin.checkExactNotificationSetting());
}

export async function openExactReminderSettings(
  plugin,
  isNativePlatform = defaultIsNativePlatform,
) {
  if (!isNativePlatform()) return "web";
  return exactAlarmStatus(await plugin.changeExactNotificationSetting());
}

export async function syncBillReminders({
  bills,
  settings,
  plugin,
  storage,
  now,
  isNativePlatform = defaultIsNativePlatform,
}) {
  if (!isNativePlatform()) return "web";

  const managedIds = readManagedIds(storage);
  if (managedIds.length > 0) {
    await plugin.cancel({
      notifications: managedIds.map((id) => ({ id })),
    });
  }
  storage.setItem(MANAGED_IDS_KEY, "[]");

  await plugin.createChannel(CHANNEL);

  const permission = await checkReminderPermission(plugin, isNativePlatform);
  const exactAlarm = await checkExactReminderSetting(plugin, isNativePlatform);
  const status = { permission, exactAlarm };
  if (permission !== "granted" || exactAlarm !== "granted") return status;

  const notifications = buildReminderNotifications(bills, settings, now);
  if (notifications.length > 0) {
    try {
      await plugin.schedule({ notifications });
      storage.setItem(
        MANAGED_IDS_KEY,
        JSON.stringify(notifications.map(({ id }) => id)),
      );
    } catch (error) {
      await plugin.cancel({
        notifications: notifications.map(({ id }) => ({ id })),
      });
      throw error;
    }
  }

  return status;
}

export function createBillReminderSyncQueue(sync = syncBillReminders) {
  let tail = Promise.resolve();

  return function queueReminderSync(options) {
    const next = tail
      .catch(() => undefined)
      .then(() => sync(options));
    tail = next;
    return next;
  };
}

export const queueBillReminderSync = createBillReminderSyncQueue();
