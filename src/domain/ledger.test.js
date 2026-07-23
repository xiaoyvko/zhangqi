import { describe, expect, it } from "vitest";
import {
  groupTransactionsByDate,
  localDateString,
  normalizeTransaction,
  summarizeMonth,
} from "./ledger.js";

describe("ledger domain", () => {
  it("formats dates using local calendar fields", () => {
    expect(localDateString(new Date(2026, 6, 4, 23, 30))).toBe("2026-07-04");
  });

  it("uses category when description is blank", () => {
    const result = normalizeTransaction(
      {
        type: "expense",
        amount: "28",
        description: " ",
        category: "餐饮",
        date: "2026-07-24",
      },
      new Date("2026-07-24T12:00:00"),
    );
    expect(result.description).toBe("餐饮");
    expect(result.amount).toBe(28);
  });

  it("rejects non-positive amounts", () => {
    expect(() =>
      normalizeTransaction({
        type: "expense",
        amount: 0,
        category: "餐饮",
        date: "2026-07-24",
      }),
    ).toThrow("金额必须大于 0");
  });

  it("summarizes only the selected month", () => {
    const transactions = [
      { id: "1", type: "income", amount: 5000, category: "工资", date: "2026-07-01" },
      { id: "2", type: "expense", amount: 28, category: "餐饮", date: "2026-07-02" },
      { id: "3", type: "expense", amount: 35, category: "交通", date: "2026-07-02" },
      { id: "4", type: "expense", amount: 99, category: "购物", date: "2026-06-30" },
    ];
    expect(summarizeMonth(transactions, "2026-07")).toEqual({
      income: 5000,
      expense: 63,
      balance: 4937,
      incomeByCategory: { 工资: 5000 },
      expenseByCategory: { 餐饮: 28, 交通: 35 },
    });
  });

  it("groups transactions by descending day", () => {
    const groups = groupTransactionsByDate([
      { id: "1", type: "expense", amount: 20, date: "2026-07-23" },
      { id: "2", type: "income", amount: 100, date: "2026-07-24" },
      { id: "3", type: "expense", amount: 30, date: "2026-07-24" },
    ]);
    expect(groups.map((group) => group.date)).toEqual(["2026-07-24", "2026-07-23"]);
    expect(groups[0]).toMatchObject({ income: 100, expense: 30, net: 70 });
  });
});
