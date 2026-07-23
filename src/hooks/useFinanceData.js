import { useRef, useState } from "react";
import { normalizeTransaction } from "../domain/ledger.js";
import { loadFinanceData, saveFinanceData, upsertBill } from "../domain/storage.js";

const LEGACY_BILLS_KEY = "zhangqi-bills";
const STORAGE_ERROR_MESSAGE = "手机存储空间不足，刚才的修改尚未保存";

function loadLegacyBills() {
  try {
    const legacyBills = JSON.parse(
      localStorage.getItem(LEGACY_BILLS_KEY) || "null",
    );
    return Array.isArray(legacyBills) ? legacyBills : null;
  } catch {
    return null;
  }
}

export function useFinanceData(seedBills = []) {
  const [data, setData] = useState(() => {
    const loaded = loadFinanceData();

    return {
      profile: loaded.profile,
      transactions: loaded.transactions,
      bills: loaded.bills ?? loadLegacyBills() ?? seedBills,
    };
  });
  const dataRef = useRef(data);
  const [storageError, setStorageError] = useState("");

  const commit = (createNext) => {
    const next = createNext(dataRef.current);

    try {
      saveFinanceData(localStorage, next);
      dataRef.current = next;
      setData(next);
      setStorageError("");
      return true;
    } catch {
      setStorageError(STORAGE_ERROR_MESSAGE);
      return false;
    }
  };

  return {
    ...data,
    storageError,
    updateProfile: (patch) => commit((current) => ({
      ...current,
      profile: {
        ...current.profile,
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    })),
    addTransaction: (input) => commit((current) => ({
      ...current,
      transactions: [
        normalizeTransaction(input),
        ...current.transactions,
      ],
    })),
    updateTransaction: (input) => commit((current) => ({
      ...current,
      transactions: current.transactions.map((item) => (
        item.id === input.id
          ? normalizeTransaction({ ...item, ...input })
          : item
      )),
    })),
    deleteTransaction: (id) => commit((current) => ({
      ...current,
      transactions: current.transactions.filter((item) => item.id !== id),
    })),
    saveBill: (bill) => commit((current) => ({
      ...current,
      bills: upsertBill(current.bills, bill),
    })),
    deleteBill: (id) => commit((current) => ({
      ...current,
      bills: current.bills.filter((item) => item.id !== id),
    })),
  };
}
