# Personal Ledger and Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend 账期 with editable personal profile, private income/expense recording, daily ledger, calendar, and monthly statistics while preserving fixed bills, reminders, PWA installation, and friend-shared bills.

**Architecture:** Keep the app as a client-only Vite PWA. Move calculations and persistence into small domain modules, place application state in one hook, and split the current monolithic page into focused pages and modal components. All new data remains on the current device; transactions never enter the friend-sharing data path.

**Tech Stack:** React 19, Vite 8, Lucide React, browser localStorage, Canvas image compression, Vitest.

## Global Constraints

- Daily transactions are private and local to the current device.
- No account, server database, cloud sync, bank import, budget management, export/import, or multi-currency support.
- Transaction fields are `id`, `type`, `amount`, `description`, `category`, `date`, `createdAt`, and `updatedAt`.
- Transaction `type` is exactly `income` or `expense`.
- Amount must be a finite number greater than `0`.
- Dates use local `YYYY-MM-DD` strings; do not derive them with `toISOString()`.
- Empty descriptions are saved as the selected category name.
- Fixed bills must not be automatically duplicated into daily transaction statistics.
- Profile fields are `name`, `avatarData`, and `updatedAt`.
- Avatar selection is from the phone photo library, cropped to a square, compressed, and stored locally.
- Existing fixed bill, reminder, shared bill, notification, manifest, service worker, and hosting behavior must remain functional.

---

## File Structure

- `src/App.jsx`: application shell, active tab, modal routing, toast routing.
- `src/domain/ledger.js`: transaction constants, validation, grouping, and monthly calculations.
- `src/domain/ledger.test.js`: unit tests for ledger calculations and validation.
- `src/domain/storage.js`: versioned local persistence for profile, transactions, and bills.
- `src/domain/storage.test.js`: persistence and malformed-data tests with an in-memory storage double.
- `src/hooks/useFinanceData.js`: React state and CRUD operations for profile, transactions, and bills.
- `src/components/BottomNav.jsx`: five-item navigation with center quick-add button.
- `src/components/QuickActionSheet.jsx`: action chooser for expense, income, and fixed bill.
- `src/components/TransactionModal.jsx`: create/edit transaction form.
- `src/components/BillModal.jsx`: existing fixed bill form extracted from the monolithic page.
- `src/components/BillLogo.jsx`: existing bill logo presentation.
- `src/pages/HomePage.jsx`: monthly summary, recent transactions, and upcoming bills.
- `src/pages/BillsPage.jsx`: fixed, subscription, and shared bill management.
- `src/pages/LedgerPage.jsx`: ledger, calendar, and statistics views.
- `src/pages/ProfilePage.jsx`: editable name, avatar picker, reminders, and storage notice.
- `src/lib/avatar.js`: browser image decode, square crop, and compression.
- `src/lib/avatar.test.js`: crop dimension and failure-path tests with canvas adapters.
- `src/main.jsx`: render `src/App.jsx`.
- `app/globals.css`: existing design tokens plus navigation, ledger, calendar, profile editor, and modal styles.
- `app/page.jsx`: delete after all behavior has moved to `src/App.jsx` and focused components.
- `package.json`: add test script and Vitest development dependency.

---

### Task 1: Ledger Domain and Test Harness

**Files:**
- Modify: `package.json`
- Create: `src/domain/ledger.js`
- Create: `src/domain/ledger.test.js`

**Interfaces:**
- Produces: `INCOME_CATEGORIES`, `EXPENSE_CATEGORIES`
- Produces: `localDateString(date?: Date): string`
- Produces: `normalizeTransaction(input, now?: Date): Transaction`
- Produces: `groupTransactionsByDate(transactions): Array<{date, income, expense, net, items}>`
- Produces: `summarizeMonth(transactions, month): {income, expense, balance, incomeByCategory, expenseByCategory}`

- [ ] **Step 1: Add the test command and Vitest**

Update `package.json` scripts and dev dependencies:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^3.2.4"
  }
}
```

Run:

```powershell
$node='C:\Users\MR\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$pnpm='C:\Users\MR\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.mjs'
& $node $pnpm install
```

Expected: exit code `0`, lockfile updated, and `vitest` listed in dev dependencies.

- [ ] **Step 2: Write failing ledger tests**

Create `src/domain/ledger.test.js`:

```js
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
      { type: "expense", amount: "28", description: " ", category: "餐饮", date: "2026-07-24" },
      new Date("2026-07-24T12:00:00"),
    );
    expect(result.description).toBe("餐饮");
    expect(result.amount).toBe(28);
  });

  it("rejects non-positive amounts", () => {
    expect(() => normalizeTransaction({
      type: "expense", amount: 0, category: "餐饮", date: "2026-07-24",
    })).toThrow("金额必须大于 0");
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
```

- [ ] **Step 3: Run tests and confirm the expected failure**

Run:

```powershell
& $node $pnpm test -- src/domain/ledger.test.js
```

Expected: FAIL because `src/domain/ledger.js` does not exist.

- [ ] **Step 4: Implement the ledger domain**

Create `src/domain/ledger.js`:

```js
export const EXPENSE_CATEGORIES = ["餐饮", "交通", "购物", "娱乐", "住房", "医疗", "学习", "其他"];
export const INCOME_CATEGORIES = ["工资", "奖金", "兼职", "报销", "朋友还款", "其他"];

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeTransaction(input, now = new Date()) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("金额必须大于 0");
  if (!["income", "expense"].includes(input.type)) throw new Error("请选择收支类型");
  if (!input.category) throw new Error("请选择分类");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("请选择有效日期");
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
    if (!groups.has(item.date)) groups.set(item.date, []);
    groups.get(item.date).push(item);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([date, items]) => {
      const income = items.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
      const expense = items.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
      return { date, income, expense, net: income - expense, items };
    });
}

export function summarizeMonth(transactions, month) {
  const current = transactions.filter((item) => item.date.startsWith(`${month}-`));
  const accumulate = (type) => current
    .filter((item) => item.type === type)
    .reduce((result, item) => {
      result[item.category] = (result[item.category] || 0) + Number(item.amount);
      return result;
    }, {});
  const income = current.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
  const expense = current.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
  return {
    income,
    expense,
    balance: income - expense,
    incomeByCategory: accumulate("income"),
    expenseByCategory: accumulate("expense"),
  };
}
```

- [ ] **Step 5: Run the ledger tests**

Run:

```powershell
& $node $pnpm test -- src/domain/ledger.test.js
```

Expected: `5 passed`.

- [ ] **Step 6: Commit**

```powershell
& $git add package.json pnpm-lock.yaml src/domain/ledger.js src/domain/ledger.test.js
& $git commit -m "Add tested ledger domain calculations"
```

---

### Task 2: Versioned Local Persistence and Finance State

**Files:**
- Create: `src/domain/storage.js`
- Create: `src/domain/storage.test.js`
- Create: `src/hooks/useFinanceData.js`

**Interfaces:**
- Consumes: `normalizeTransaction(input)`
- Produces: `loadFinanceData(storage): {profile, transactions, bills}`
- Produces: `saveFinanceData(storage, data): void`
- Produces: `useFinanceData(): {profile, transactions, bills, updateProfile, addTransaction, updateTransaction, deleteTransaction, saveBill, deleteBill, storageError}` where each mutation returns `true` after a persisted write or `false` after a rejected write.

- [ ] **Step 1: Write failing persistence tests**

Create `src/domain/storage.test.js`:

```js
import { describe, expect, it } from "vitest";
import { loadFinanceData, saveFinanceData, STORAGE_KEY } from "./storage.js";

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
      profile: { name: "漾", avatarData: "", updatedAt: "" },
      transactions: [],
      bills: null,
    });
  });

  it("round-trips profile, transactions, and bills", () => {
    const storage = memoryStorage();
    const data = {
      profile: { name: "小雨", avatarData: "data:image/webp;base64,abc", updatedAt: "now" },
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
});
```

- [ ] **Step 2: Run persistence tests and confirm failure**

Run:

```powershell
& $node $pnpm test -- src/domain/storage.test.js
```

Expected: FAIL because `src/domain/storage.js` does not exist.

- [ ] **Step 3: Implement versioned persistence**

Create `src/domain/storage.js`:

```js
export const STORAGE_KEY = "zhangqi-finance-v2";
export const DEFAULT_PROFILE = { name: "漾", avatarData: "", updatedAt: "" };

export function loadFinanceData(storage = localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
    if (!parsed || parsed.version !== 2) {
      return { profile: DEFAULT_PROFILE, transactions: [], bills: null };
    }
    return {
      profile: { ...DEFAULT_PROFILE, ...parsed.profile },
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      bills: Array.isArray(parsed.bills) ? parsed.bills : null,
    };
  } catch {
    return { profile: DEFAULT_PROFILE, transactions: [], bills: null };
  }
}

export function saveFinanceData(storage = localStorage, data) {
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, ...data }));
}
```

- [ ] **Step 4: Run persistence tests**

Run:

```powershell
& $node $pnpm test -- src/domain/storage.test.js
```

Expected: `3 passed`.

- [ ] **Step 5: Implement the finance state hook**

Create `src/hooks/useFinanceData.js` with one initialization path, immutable CRUD, legacy bill migration, and persistence error reporting:

```js
import { useState } from "react";
import { normalizeTransaction } from "../domain/ledger.js";
import { loadFinanceData, saveFinanceData } from "../domain/storage.js";

export function useFinanceData(seedBills) {
  const [data, setData] = useState(() => {
    const loaded = loadFinanceData();
    let legacyBills = null;
    try {
      legacyBills = JSON.parse(localStorage.getItem("zhangqi-bills") || "null");
    } catch {
      legacyBills = null;
    }
    return {
      profile: loaded.profile,
      transactions: loaded.transactions,
      bills: loaded.bills || legacyBills || seedBills,
    };
  });
  const [storageError, setStorageError] = useState("");

  const commit = (createNext) => {
    const next = createNext(data);
    try {
      saveFinanceData(localStorage, next);
      setData(next);
      setStorageError("");
      return true;
    } catch {
      setStorageError("手机存储空间不足，刚才的修改尚未保存");
      return false;
    }
  };

  return {
    ...data,
    storageError,
    updateProfile: (patch) => commit((current) => ({
      ...current,
      profile: { ...current.profile, ...patch, updatedAt: new Date().toISOString() },
    })),
    addTransaction: (input) => commit((current) => ({
      ...current,
      transactions: [normalizeTransaction(input), ...current.transactions],
    })),
    updateTransaction: (input) => commit((current) => ({
      ...current,
      transactions: current.transactions.map((item) => item.id === input.id ? normalizeTransaction(input) : item),
    })),
    deleteTransaction: (id) => commit((current) => ({
      ...current,
      transactions: current.transactions.filter((item) => item.id !== id),
    })),
    saveBill: (bill) => commit((current) => ({
      ...current,
      bills: bill.id
        ? current.bills.map((item) => item.id === bill.id ? bill : item)
        : [...current.bills, bill],
    })),
    deleteBill: (id) => commit((current) => ({
      ...current,
      bills: current.bills.filter((item) => item.id !== id),
    })),
  };
}
```

- [ ] **Step 6: Run all tests and build**

Run:

```powershell
& $node $pnpm test
& $node $pnpm run build
```

Expected: all tests pass; Vite build exits `0`.

- [ ] **Step 7: Commit**

```powershell
& $git add src/domain/storage.js src/domain/storage.test.js src/hooks/useFinanceData.js
& $git commit -m "Add versioned local finance persistence"
```

---

### Task 3: Application Shell, Navigation, and Existing Bill Extraction

**Files:**
- Create: `src/App.jsx`
- Create: `src/components/BottomNav.jsx`
- Create: `src/components/QuickActionSheet.jsx`
- Create: `src/components/BillLogo.jsx`
- Create: `src/components/BillModal.jsx`
- Create: `src/pages/BillsPage.jsx`
- Modify: `src/main.jsx`
- Modify: `app/globals.css`
- Delete: `app/page.jsx`

**Interfaces:**
- Consumes: `useFinanceData(seedBills)`
- Produces: app modes `home | bills | ledger | profile`
- Produces: modal modes `{kind: "transaction", type}`, `{kind: "bill", bill}`, or `null`

- [ ] **Step 1: Create a shell-level smoke test checklist**

Before refactoring, record the current browser assertions:

```text
title = 账期｜订阅与固定账单提醒
fixed bill cards = 5
shared summary appears after opening the shared area
bill modal appears after choosing add fixed bill
```

Run the existing production build once:

```powershell
& $node $pnpm run build
```

Expected: exit code `0`.

- [ ] **Step 2: Extract bill presentation and bill modal**

Move `BillLogo` and `BillModal` from `app/page.jsx` into their named component files. Preserve their props exactly:

```js
BillLogo({ bill, small = false })
BillModal({ bill, onClose, onSave, onDelete })
```

The bill modal must continue to validate name, amount, next date, category, and shared friend name using native form validation.

- [ ] **Step 3: Create the five-item bottom navigation**

Implement `BottomNav` with:

```jsx
export function BottomNav({ active, onNavigate, onQuickAdd }) {
  return (
    <nav className="bottom-nav">
      <button className={active === "home" ? "active" : ""} onClick={() => onNavigate("home")}>首页</button>
      <button className={active === "bills" ? "active" : ""} onClick={() => onNavigate("bills")}>账单</button>
      <button className="nav-quick-add" onClick={onQuickAdd} aria-label="快速记一笔">＋</button>
      <button className={active === "ledger" ? "active" : ""} onClick={() => onNavigate("ledger")}>明细</button>
      <button className={active === "profile" ? "active" : ""} onClick={() => onNavigate("profile")}>我的</button>
    </nav>
  );
}
```

Use Lucide icons in the final implementation while retaining visible Chinese labels.

- [ ] **Step 4: Create the quick action sheet**

Implement buttons with exact emitted actions:

```js
onSelect("expense")
onSelect("income")
onSelect("bill")
```

The sheet closes when the backdrop is clicked or an action is selected.

- [ ] **Step 5: Create `BillsPage`**

Move fixed bill filtering, search, bill cards, shared-circle summary, and upcoming bill rows into `src/pages/BillsPage.jsx`. It consumes:

```js
BillsPage({ bills, onOpenBill, onAddBill })
```

The page keeps the existing category filters and clearly separates “个人账单” from “共享账单”.

- [ ] **Step 6: Assemble `src/App.jsx` and update the entry**

`src/App.jsx` owns active page, modal state, notification permission, and toasts. Update `src/main.jsx`:

```jsx
import App from "./App.jsx";
import "../app/globals.css";
```

Delete the import of `../app/page.jsx`, then delete `app/page.jsx` only after all referenced constants and helpers have moved.

- [ ] **Step 7: Update navigation styles and build**

Update `.bottom-nav` to five equal conceptual slots with the center action visually elevated. Remove the old `.nav-gap` and fixed `.fab` styles.

Run:

```powershell
& $node $pnpm test
& $node $pnpm run build
```

Expected: all tests pass and Vite build exits `0`.

- [ ] **Step 8: Commit**

```powershell
& $git add src app/page.jsx app/globals.css
& $git commit -m "Refactor app shell and finance navigation"
```

---

### Task 4: Transaction Create, Edit, and Delete

**Files:**
- Create: `src/components/TransactionModal.jsx`
- Modify: `src/App.jsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `EXPENSE_CATEGORIES`, `INCOME_CATEGORIES`, `localDateString`
- Produces: `TransactionModal({ transaction, initialType, onSave, onDelete, onClose })`

- [ ] **Step 1: Implement a controlled transaction form**

Initialize new form state exactly as:

```js
{
  type: initialType,
  amount: "",
  description: "",
  category: initialType === "income" ? "工资" : "餐饮",
  date: localDateString(),
}
```

When editing, initialize from `transaction`. Switching type resets category to the first valid category for the new type.

- [ ] **Step 2: Add visible validation**

On submit:

```js
try {
  onSave(form);
} catch (error) {
  setError(error.message);
}
```

Keep the form open after errors. Place the error next to the actions with `role="alert"`.

- [ ] **Step 3: Add deletion confirmation**

For existing transactions, the delete button first changes the footer into:

```text
确定删除这笔记录吗？
[取消] [确认删除]
```

Only the second action calls `onDelete(transaction.id)`.

- [ ] **Step 4: Wire modal actions into the app**

- Quick action `expense` opens a new expense modal.
- Quick action `income` opens a new income modal.
- Selecting an existing ledger row opens the edit modal.
- Successful save/delete closes the modal and shows a toast.
- Persistence failure keeps the modal data available and displays `storageError`.

- [ ] **Step 5: Add mobile modal styles**

Use a bottom sheet on widths below `700px`. The amount input is the first focus target, uses `inputMode="decimal"`, and has a minimum touch height of `44px`.

- [ ] **Step 6: Verify transaction CRUD**

Run the app and verify:

```text
expense: 餐饮 / 28 / today
income: 工资 / 5000 / today
edit expense to 30
delete income after confirmation
refresh and confirm remaining expense persists
```

Then run:

```powershell
& $node $pnpm test
& $node $pnpm run build
```

Expected: all tests pass and build exits `0`.

- [ ] **Step 7: Commit**

```powershell
& $git add src/components/TransactionModal.jsx src/App.jsx app/globals.css
& $git commit -m "Add private income and expense recording"
```

---

### Task 5: Home Summary and Ledger Views

**Files:**
- Create: `src/pages/HomePage.jsx`
- Create: `src/pages/LedgerPage.jsx`
- Modify: `src/App.jsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `summarizeMonth`, `groupTransactionsByDate`
- Produces: `HomePage({ profile, transactions, bills, onOpenTransaction, onOpenBill })`
- Produces: `LedgerPage({ transactions, onOpenTransaction })`

- [ ] **Step 1: Implement monthly home summary**

Calculate current month with local fields:

```js
const now = new Date();
const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const summary = summarizeMonth(transactions, month);
```

Show income, expense, balance, future-seven-day bill count, five recent transactions, and three upcoming bills. Empty recent transactions show “还没有日常账目，点＋记下第一笔”.

- [ ] **Step 2: Implement the ledger tab state**

`LedgerPage` owns:

```js
const [view, setView] = useState("list");
const [month, setMonth] = useState(currentLocalMonth());
const [selectedDate, setSelectedDate] = useState(localDateString());
```

The three view values are exactly `list`, `calendar`, and `stats`.

- [ ] **Step 3: Implement list view**

Use `groupTransactionsByDate`. Each group displays:

```text
7月24日 周五
收入 ¥5,000  支出 ¥28  净额 ¥4,972
```

Income amounts use the positive color token; expense amounts use the primary text color with a minus sign.

- [ ] **Step 4: Implement calendar view**

Generate a Monday-first six-week grid for the selected local month. Each day cell includes:

```js
{
  date: "YYYY-MM-DD",
  day: 24,
  inMonth: true,
  income: 5000,
  expense: 28,
}
```

Previous/next controls adjust the month without UTC conversion. Clicking a day selects it and renders that day’s transaction rows below the grid.

- [ ] **Step 5: Implement statistics view**

Show income, expense, balance, and category bars. Calculate bar width as:

```js
const percent = total === 0 ? 0 : Math.round((amount / total) * 100);
```

Sort categories by amount descending. Provide “本月暂无收入记录” and “本月暂无支出记录” empty states independently.

- [ ] **Step 6: Add responsive styles**

Ensure the calendar remains within `390px` viewport width, tab buttons remain visible without horizontal scrolling, and long descriptions truncate rather than changing row width.

- [ ] **Step 7: Verify calculations and build**

Run:

```powershell
& $node $pnpm test
& $node $pnpm run build
```

Manual expected results for income `5000`, food `28`, transport `35`:

```text
income = 5000
expense = 63
balance = 4937
food share = 44%
transport share = 56%
```

- [ ] **Step 8: Commit**

```powershell
& $git add src/pages/HomePage.jsx src/pages/LedgerPage.jsx src/App.jsx app/globals.css
& $git commit -m "Add ledger calendar and monthly statistics"
```

---

### Task 6: Editable Profile and Compressed Avatar

**Files:**
- Create: `src/lib/avatar.js`
- Create: `src/lib/avatar.test.js`
- Create: `src/pages/ProfilePage.jsx`
- Modify: `src/App.jsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `compressAvatar(file, adapters?): Promise<string>`
- Produces: `ProfilePage({ profile, onUpdateProfile, notificationState, onAskNotification, storageError })`

- [ ] **Step 1: Write failing avatar tests**

Create tests around injected adapters so Node does not require a real canvas:

```js
import { describe, expect, it, vi } from "vitest";
import { compressAvatar } from "./avatar.js";

describe("compressAvatar", () => {
  it("rejects non-image files", async () => {
    await expect(compressAvatar({ type: "text/plain" })).rejects.toThrow("请选择图片文件");
  });

  it("uses a centered square crop", async () => {
    const drawImage = vi.fn();
    const result = await compressAvatar(
      { type: "image/jpeg" },
      {
        decode: async () => ({ width: 1200, height: 800 }),
        createCanvas: () => ({
          getContext: () => ({ drawImage }),
          toDataURL: () => "data:image/webp;base64,test",
        }),
      },
    );
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(), 200, 0, 800, 800, 0, 0, 384, 384,
    );
    expect(result).toBe("data:image/webp;base64,test");
  });
});
```

- [ ] **Step 2: Run avatar tests and confirm failure**

Run:

```powershell
& $node $pnpm test -- src/lib/avatar.test.js
```

Expected: FAIL because `src/lib/avatar.js` does not exist.

- [ ] **Step 3: Implement avatar compression**

Create `src/lib/avatar.js` with a browser default adapter and a test adapter:

```js
const browserAdapters = {
  decode: async (file) => createImageBitmap(file),
  createCanvas: () => document.createElement("canvas"),
};

export async function compressAvatar(file, adapters = browserAdapters) {
  if (!file?.type?.startsWith("image/")) throw new Error("请选择图片文件");
  const image = await adapters.decode(file);
  const size = Math.min(image.width, image.height);
  const sx = (image.width - size) / 2;
  const sy = (image.height - size) / 2;
  const canvas = adapters.createCanvas();
  canvas.width = 384;
  canvas.height = 384;
  const context = canvas.getContext("2d");
  context.drawImage(image, sx, sy, size, size, 0, 0, 384, 384);
  const result = canvas.toDataURL("image/webp", 0.82);
  if (result.length > 700_000) throw new Error("图片过大，请选择另一张照片");
  return result;
}
```

- [ ] **Step 4: Run avatar tests**

Run:

```powershell
& $node $pnpm test -- src/lib/avatar.test.js
```

Expected: `2 passed`.

- [ ] **Step 5: Implement profile editing**

`ProfilePage` includes:

```jsx
<input
  type="file"
  accept="image/*"
  onChange={handleAvatarChange}
/>
```

The visible avatar button opens the hidden file input. The name editor trims whitespace, rejects an empty name with “请输入名字”, limits the value to 20 characters, and calls:

```js
onUpdateProfile({ name });
onUpdateProfile({ avatarData });
```

Display `profile.avatarData` as an image when present; otherwise show the first character of `profile.name`.

- [ ] **Step 6: Preserve reminder and storage information**

Move the existing system notification control into `ProfilePage`. Show:

```text
数据保存在当前手机
卸载应用或清除浏览器数据可能删除账目
```

Render `storageError` with `role="alert"` when present.

- [ ] **Step 7: Verify profile persistence**

Manual flow:

```text
rename 漾 to 小雨
choose a landscape photo
verify centered square avatar
reload page
verify name and avatar remain
verify header and profile page match
```

Run:

```powershell
& $node $pnpm test
& $node $pnpm run build
```

Expected: all tests pass and build exits `0`.

- [ ] **Step 8: Commit**

```powershell
& $git add src/lib/avatar.js src/lib/avatar.test.js src/pages/ProfilePage.jsx src/App.jsx app/globals.css
& $git commit -m "Add editable local profile and avatar"
```

---

### Task 7: Regression, Mobile QA, and Production Release

**Files:**
- Potential verification fixes: `src/App.jsx`
- Potential verification fixes: `src/components/BottomNav.jsx`
- Potential verification fixes: `src/components/TransactionModal.jsx`
- Potential verification fixes: `src/pages/HomePage.jsx`
- Potential verification fixes: `src/pages/BillsPage.jsx`
- Potential verification fixes: `src/pages/LedgerPage.jsx`
- Potential verification fixes: `src/pages/ProfilePage.jsx`
- Potential verification fixes: `app/globals.css`
- Verify: `public/manifest.webmanifest`
- Verify: `public/sw.js`
- Verify: `scripts/copy-hosting.mjs`
- Verify: `.openai/hosting.json`

**Interfaces:**
- Consumes: completed app.
- Produces: tested production build and saved deployment version.

- [ ] **Step 1: Run the complete automated suite**

Run:

```powershell
& $node $pnpm test
& $node $pnpm run build
```

Expected: all tests pass; build exits `0`; these files exist:

```text
dist/client/index.html
dist/server/index.js
dist/.openai/hosting.json
```

- [ ] **Step 2: Start the production preview**

Run:

```powershell
& $node $pnpm start --port 3005
```

Expected: Vite preview listens on `http://localhost:3005`.

- [ ] **Step 3: Execute the Android-size browser flow**

At viewport `390 × 844`:

```text
open home
record expense ¥28 餐饮
record income ¥5000 工资
verify home totals
open 明细 → 流水
open 明细 → 日历 and select today
open 明细 → 统计 and verify category totals
edit expense to ¥30
delete income with confirmation
change name
upload avatar
reload and verify persistence
open 账单 and edit one existing bill
open notification setting
```

Expected: no console errors, no horizontal overflow, all touch targets respond.

- [ ] **Step 4: Check PWA resources**

Verify HTTP `200` for:

```text
/
/manifest.webmanifest
/sw.js
/icon.svg
```

Confirm service worker registration succeeds and Chrome installability reports no errors outside incognito mode.

- [ ] **Step 5: Inspect the final diff**

Run:

```powershell
& $git diff --check
& $git status --short
```

Expected: no whitespace errors and only intentional files modified.

- [ ] **Step 6: Commit verification-only fixes if any**

If fresh QA found an issue, fix only that issue, rerun Steps 1–5, and commit:

```powershell
& $git add src/App.jsx src/components/BottomNav.jsx src/components/TransactionModal.jsx src/pages/HomePage.jsx src/pages/BillsPage.jsx src/pages/LedgerPage.jsx src/pages/ProfilePage.jsx app/globals.css
& $git commit -m "Finish mobile ledger regression fixes"
```

If no fix was needed, do not create an empty commit.

- [ ] **Step 7: Push, save, and deploy**

Use a fresh Sites source credential for the existing project ID in `.openai/hosting.json`. Push the exact current `HEAD`, save a new site version using that commit SHA, and deploy the saved version to the already-public production site.

- [ ] **Step 8: Verify production**

Poll deployment status until `succeeded`. Then verify from the public URL:

```text
HTTP status = 200
title = 账期｜订阅与固定账单提醒
five-tab navigation visible
new transaction modal opens
ledger page opens
profile name editor opens
```

Only after these checks pass, report the production URL and version number.
