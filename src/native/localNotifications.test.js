import { describe, expect, it } from "vitest";
import { DEFAULT_REMINDER_SETTINGS } from "../domain/reminders.js";
import {
  checkReminderPermission,
  requestReminderPermission,
  syncBillReminders,
} from "./localNotifications.js";

const MANAGED_IDS_KEY = "zhangqi-native-reminder-ids";

function fakeNotifications(calls, permission) {
  return {
    async createChannel(channel) {
      calls.push(["createChannel", channel]);
    },
    async cancel({ notifications }) {
      calls.push(["cancel", notifications.map(({ id }) => id)]);
    },
    async schedule({ notifications }) {
      calls.push(["schedule", notifications]);
    },
    async checkPermissions() {
      calls.push(["checkPermissions"]);
      return { display: permission };
    },
    async requestPermissions() {
      calls.push(["requestPermissions"]);
      return { display: permission };
    },
  };
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

const nativePlatform = () => true;

describe("native local notifications", () => {
  it("returns web without plugin calls outside a native platform", async () => {
    const calls = [];
    const plugin = fakeNotifications(calls, "granted");

    await expect(checkReminderPermission(plugin)).resolves.toBe("web");
    await expect(requestReminderPermission(plugin)).resolves.toBe("web");
    await expect(syncBillReminders({
      bills: [],
      settings: DEFAULT_REMINDER_SETTINGS,
      plugin,
      storage: memoryStorage(),
    })).resolves.toBe("web");

    expect(calls).toEqual([]);
  });

  it("checks and requests notification permission through the injected plugin", async () => {
    const calls = [];
    const plugin = fakeNotifications(calls, "granted");

    await expect(checkReminderPermission(plugin, nativePlatform)).resolves.toBe("granted");
    await expect(requestReminderPermission(plugin, nativePlatform)).resolves.toBe("granted");

    expect(calls).toEqual([["checkPermissions"], ["requestPermissions"]]);
  });

  it("cancels previously managed ids before scheduling future reminders", async () => {
    const calls = [];
    const plugin = fakeNotifications(calls, "granted");
    const storage = memoryStorage({
      [MANAGED_IDS_KEY]: JSON.stringify([101, 102]),
    });

    await syncBillReminders({
      bills: [{ id: "rent", name: "房租", amount: 4800, nextDate: "2026-08-10" }],
      settings: { enabled: true, daysBefore: 3, time: "09:00" },
      plugin,
      storage,
      now: new Date(2026, 7, 1),
      isNativePlatform: nativePlatform,
    });

    expect(calls[0]).toEqual(["cancel", [101, 102]]);
    expect(calls).toContainEqual(["createChannel", {
      id: "bill-reminders",
      name: "账单提醒",
      description: "固定账单到期提醒",
      importance: 4,
    }]);
    expect(calls.some(([name]) => name === "schedule")).toBe(true);
    const scheduled = calls.find(([name]) => name === "schedule")[1];
    expect(JSON.parse(storage.getItem(MANAGED_IDS_KEY))).toEqual(scheduled.map(({ id }) => id));
  });

  it("does not request permission during background synchronization", async () => {
    const calls = [];
    await syncBillReminders({
      bills: [],
      settings: DEFAULT_REMINDER_SETTINGS,
      plugin: fakeNotifications(calls, "prompt"),
      storage: memoryStorage(),
      isNativePlatform: nativePlatform,
    });

    expect(calls).toContainEqual(["checkPermissions"]);
    expect(calls.some(([name]) => name === "requestPermissions")).toBe(false);
    expect(calls.some(([name]) => name === "schedule")).toBe(false);
  });
});
