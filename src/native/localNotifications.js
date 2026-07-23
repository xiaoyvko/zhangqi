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

  await plugin.createChannel(CHANNEL);

  const permission = await checkReminderPermission(plugin, isNativePlatform);
  if (permission !== "granted") return permission;

  const notifications = buildReminderNotifications(bills, settings, now);
  if (notifications.length > 0) {
    await plugin.schedule({ notifications });
  }
  storage.setItem(MANAGED_IDS_KEY, JSON.stringify(notifications.map(({ id }) => id)));

  return permission;
}
