export const EXPENSE_CATEGORIES = [
  "餐饮",
  "交通",
  "购物",
  "娱乐",
  "住房",
  "医疗",
  "学习",
  "其他",
];

export const INCOME_CATEGORIES = [
  "工资",
  "奖金",
  "兼职",
  "报销",
  "朋友还款",
  "其他",
];

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeTransaction(input, now = new Date()) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("金额必须大于 0");
  }
  if (!["income", "expense"].includes(input.type)) {
    throw new Error("请选择收支类型");
  }
  if (!input.category) {
    throw new Error("请选择分类");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error("请选择有效日期");
  }

  const timestamp = now.toISOString();
  return {
    id: input.id || crypto.randomUUID(),
    type: input.type,
    amount,
    description: input.description?.trim() || input.category,
    category: input.category,
    date: input.date,
    createdAt: input.createdAt || timestamp,
    updatedAt: timestamp,
  };
}

export function groupTransactionsByDate(transactions) {
  const groups = new Map();

  for (const item of transactions) {
    if (!groups.has(item.date)) {
      groups.set(item.date, []);
    }
    groups.get(item.date).push(item);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([date, items]) => {
      const income = items
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + Number(item.amount), 0);
      const expense = items
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + Number(item.amount), 0);

      return {
        date,
        income,
        expense,
        net: income - expense,
        items,
      };
    });
}

export function summarizeMonth(transactions, month) {
  const current = transactions.filter((item) => item.date.startsWith(`${month}-`));
  const accumulate = (type) =>
    current
      .filter((item) => item.type === type)
      .reduce((result, item) => {
        result[item.category] = (result[item.category] || 0) + Number(item.amount);
        return result;
      }, {});
  const income = current
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const expense = current
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  return {
    income,
    expense,
    balance: income - expense,
    incomeByCategory: accumulate("income"),
    expenseByCategory: accumulate("expense"),
  };
}
