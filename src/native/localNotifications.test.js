import { describe, expect, it } from "vitest";
import { DEFAULT_REMINDER_SETTINGS } from "../domain/reminders.js";
import {
  checkExactReminderSetting,
  checkReminderPermission,
  createBillReminderSyncQueue,
  openExactReminderSettings,
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
    async checkExactNotificationSetting() {
      calls.push(["checkExactNotificationSetting"]);
      return { exact_alarm: "granted" };
    },
    async changeExactNotificationSetting() {
      calls.push(["changeExactNotificationSetting"]);
      return { exact_alarm: "granted" };
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

  it("checks and opens the Android exact-alarm setting through the v8 API", async () => {
    const calls = [];
    const plugin = fakeNotifications(calls, "granted");

    await expect(checkExactReminderSetting(plugin, nativePlatform)).resolves.toBe("granted");
    await expect(openExactReminderSettings(plugin, nativePlatform)).resolves.toBe("granted");

    expect(calls).toEqual([
      ["checkExactNotificationSetting"],
      ["changeExactNotificationSetting"],
    ]);
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

  it("clears cancelled ids even when display permission is not granted", async () => {
    const calls = [];
    const storage = memoryStorage({
      [MANAGED_IDS_KEY]: JSON.stringify([101, 102]),
    });

    await syncBillReminders({
      bills: [],
      settings: DEFAULT_REMINDER_SETTINGS,
      plugin: fakeNotifications(calls, "prompt"),
      storage,
      isNativePlatform: nativePlatform,
    });

    expect(calls).toContainEqual(["checkPermissions"]);
    expect(calls.some(([name]) => name === "requestPermissions")).toBe(false);
    expect(calls.some(([name]) => name === "schedule")).toBe(false);
    expect(JSON.parse(storage.getItem(MANAGED_IDS_KEY))).toEqual([]);
  });

  it("does not schedule an inexact fallback when exact alarms are unavailable", async () => {
    const calls = [];
    const plugin = {
      ...fakeNotifications(calls, "granted"),
      async checkExactNotificationSetting() {
        calls.push(["checkExactNotificationSetting"]);
        return { exact_alarm: "denied" };
      },
    };

    await expect(syncBillReminders({
      bills: [{ id: "rent", name: "房租", amount: 4800, nextDate: "2026-08-10" }],
      settings: { enabled: true, daysBefore: 3, time: "09:00" },
      plugin,
      storage: memoryStorage(),
      now: new Date(2026, 7, 1),
      isNativePlatform: nativePlatform,
    })).resolves.toEqual({ permission: "granted", exactAlarm: "denied" });

    expect(calls.some(([name]) => name === "schedule")).toBe(false);
  });

  it("serializes overlapping syncs so the later state wins without orphan notifications", async () => {
    const calls = [];
    const pending = new Set([999]);
    let scheduleCount = 0;
    let releaseFirst;
    let firstStarted;
    const firstGate = new Promise((resolve) => { releaseFirst = resolve; });
    const firstStartedPromise = new Promise((resolve) => { firstStarted = resolve; });
    const plugin = {
      ...fakeNotifications(calls, "granted"),
      async cancel({ notifications }) {
        const ids = notifications.map(({ id }) => id);
        calls.push(["cancel", ids]);
        ids.forEach((id) => pending.delete(id));
      },
      async schedule({ notifications }) {
        calls.push(["schedule", notifications]);
        notifications.forEach(({ id }) => pending.add(id));
        scheduleCount += 1;
        if (scheduleCount === 1) {
          firstStarted();
          await firstGate;
        }
      },
    };
    const storage = memoryStorage({
      [MANAGED_IDS_KEY]: JSON.stringify([999]),
    });
    const queue = createBillReminderSyncQueue();
    const first = queue({
      bills: [{ id: "first", name: "第一笔", amount: 1, nextDate: "2026-08-10" }],
      settings: { enabled: true, daysBefore: 3, time: "09:00" },
      plugin,
      storage,
      now: new Date(2026, 7, 1),
      isNativePlatform: nativePlatform,
    });

    await firstStartedPromise;
    const second = queue({
      bills: [{ id: "second", name: "第二笔", amount: 2, nextDate: "2026-08-11" }],
      settings: { enabled: true, daysBefore: 3, time: "09:00" },
      plugin,
      storage,
      now: new Date(2026, 7, 1),
      isNativePlatform: nativePlatform,
    });

    expect(calls.filter(([name]) => name === "schedule")).toHaveLength(1);
    releaseFirst();
    await Promise.all([first, second]);

    const scheduledBatches = calls
      .filter(([name]) => name === "schedule")
      .map(([, notifications]) => notifications.map(({ id }) => id));
    expect(scheduledBatches).toHaveLength(2);
    expect([...pending]).toEqual(scheduledBatches[1]);
    expect(JSON.parse(storage.getItem(MANAGED_IDS_KEY))).toEqual(scheduledBatches[1]);
  });

  it("continues the queue after a rejected sync and compensates partial scheduling", async () => {
    const calls = [];
    const pending = new Set();
    let scheduleCount = 0;
    const plugin = {
      ...fakeNotifications(calls, "granted"),
      async cancel({ notifications }) {
        const ids = notifications.map(({ id }) => id);
        calls.push(["cancel", ids]);
        ids.forEach((id) => pending.delete(id));
      },
      async schedule({ notifications }) {
        calls.push(["schedule", notifications]);
        notifications.forEach(({ id }) => pending.add(id));
        scheduleCount += 1;
        if (scheduleCount === 1) throw new Error("schedule failed");
      },
    };
    const storage = memoryStorage();
    const queue = createBillReminderSyncQueue();
    const first = queue({
      bills: [{ id: "first", name: "第一笔", amount: 1, nextDate: "2026-08-10" }],
      settings: { enabled: true, daysBefore: 3, time: "09:00" },
      plugin,
      storage,
      now: new Date(2026, 7, 1),
      isNativePlatform: nativePlatform,
    });
    const second = queue({
      bills: [{ id: "second", name: "第二笔", amount: 2, nextDate: "2026-08-11" }],
      settings: { enabled: true, daysBefore: 3, time: "09:00" },
      plugin,
      storage,
      now: new Date(2026, 7, 1),
      isNativePlatform: nativePlatform,
    });

    await expect(first).rejects.toThrow("schedule failed");
    await expect(second).resolves.toEqual({ permission: "granted", exactAlarm: "granted" });
    const latestIds = JSON.parse(storage.getItem(MANAGED_IDS_KEY));
    expect([...pending]).toEqual(latestIds);
    expect(calls.filter(([name]) => name === "schedule")).toHaveLength(2);
  });
});
