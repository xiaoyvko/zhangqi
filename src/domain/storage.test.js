import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROFILE,
  loadFinanceData,
  saveFinanceData,
  STORAGE_KEY,
  upsertBill,
} from "./storage.js";

function memoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed));

  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
}

describe("finance storage", () => {
  it("returns safe defaults when empty", () => {
    expect(loadFinanceData(memoryStorage())).toEqual({
      profile: DEFAULT_PROFILE,
      transactions: [],
      bills: null,
    });
  });

  it("round-trips profile, transactions, and bills", () => {
    const storage = memoryStorage();
    const data = {
      profile: {
        name: "小雨",
        avatarData: "data:image/webp;base64,abc",
        updatedAt: "now",
      },
      transactions: [{ id: "t1", type: "expense", amount: 28 }],
      bills: [{ id: "b1", name: "房租" }],
    };

    saveFinanceData(storage, data);

    expect(loadFinanceData(storage)).toEqual(data);
  });

  it("falls back safely for malformed JSON", () => {
    const storage = memoryStorage({ [STORAGE_KEY]: "not-json" });

    expect(loadFinanceData(storage).transactions).toEqual([]);
  });

  it("keeps readable fields when individual collections are malformed", () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({
        version: 2,
        profile: { name: "小雨" },
        transactions: {},
        bills: "invalid",
      }),
    });

    expect(loadFinanceData(storage)).toEqual({
      profile: { ...DEFAULT_PROFILE, name: "小雨" },
      transactions: [],
      bills: null,
    });
  });

  it("adds a new fixed bill and updates an existing one by id", () => {
    const original = [{ id: "b1", name: "房租" }];
    const added = upsertBill(original, { id: "b2", name: "宽带" });
    const updated = upsertBill(added, { id: "b1", name: "新房租" });

    expect(added).toHaveLength(2);
    expect(updated).toEqual([
      { id: "b1", name: "新房租" },
      { id: "b2", name: "宽带" },
    ]);
  });
});
