import {
  DEFAULT_REMINDER_SETTINGS,
  normalizeReminderSettings,
} from "./reminders.js";

export const STORAGE_KEY = "zhangqi-finance-v2";
export const DEFAULT_PROFILE = {
  name: "漫",
  avatarData: "",
  updatedAt: "",
};

function defaultFinanceData() {
  return {
    profile: { ...DEFAULT_PROFILE },
    transactions: [],
    bills: null,
    reminderSettings: { ...DEFAULT_REMINDER_SETTINGS },
  };
}

export function loadFinanceData(storage = localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "null");

    if (!parsed || parsed.version !== 2) {
      return defaultFinanceData();
    }

    const profile = parsed.profile && typeof parsed.profile === "object"
      ? parsed.profile
      : {};

    return {
      profile: { ...DEFAULT_PROFILE, ...profile },
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      bills: Array.isArray(parsed.bills)
        ? parsed.bills.map((bill) => ({
          ...bill,
          reminderEnabled: bill.reminderEnabled !== false,
        }))
        : null,
      reminderSettings: normalizeReminderSettings(parsed.reminderSettings),
    };
  } catch {
    return defaultFinanceData();
  }
}

export function saveFinanceData(storage = localStorage, data) {
  storage.setItem(STORAGE_KEY, JSON.stringify({
    version: 2,
    ...data,
  }));
}

export function upsertBill(bills, bill) {
  const exists = bills.some((item) => item.id === bill.id);
  return exists
    ? bills.map((item) => (item.id === bill.id ? bill : item))
    : [...bills, bill];
}
