import { describe, expect, it } from "vitest";
import {
  DEFAULT_REMINDER_SETTINGS,
  buildReminderNotifications,
  normalizeReminderSettings,
  reminderDate,
  reminderNotificationId,
} from "./reminders.js";

describe("bill reminders", () => {
  it("normalizes missing and invalid settings", () => {
    expect(normalizeReminderSettings()).toEqual(DEFAULT_REMINDER_SETTINGS);
    expect(normalizeReminderSettings({ enabled: false, daysBefore: 9, time: "26:00" }))
      .toEqual({ enabled: false, daysBefore: 3, time: "09:00" });
  });

  it.each([0, 1, 3, 7])("calculates %s days before the due date", (daysBefore) => {
    expect(reminderDate(
      { id: "rent", nextDate: "2026-08-10" },
      { enabled: true, daysBefore, time: "09:30" },
    ).toISOString()).toBe(
      new Date(2026, 7, 10 - daysBefore, 9, 30, 0, 0).toISOString(),
    );
  });

  it("skips disabled and elapsed reminders", () => {
    const now = new Date(2026, 7, 8, 12);
    const bills = [
      { id: "past", name: "过去", amount: 1, nextDate: "2026-08-08", reminderEnabled: true },
      { id: "off", name: "关闭", amount: 2, nextDate: "2026-08-20", reminderEnabled: false },
    ];
    expect(buildReminderNotifications(
      bills,
      { enabled: true, daysBefore: 0, time: "09:00" },
      now,
    )).toEqual([]);
  });

  it("creates stable distinct integer notification ids", () => {
    const first = reminderNotificationId("bill-a");
    expect(first).toBe(reminderNotificationId("bill-a"));
    expect(first).not.toBe(reminderNotificationId("bill-b"));
    expect(Number.isInteger(first)).toBe(true);
    expect(first).toBeGreaterThan(0);
  });
});
