import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { BillModal } from "./components/BillModal.jsx";
import { BottomNav } from "./components/BottomNav.jsx";
import { QuickActionSheet } from "./components/QuickActionSheet.jsx";
import { ReminderSettingsModal } from "./components/ReminderSettingsModal.jsx";
import { TransactionModal } from "./components/TransactionModal.jsx";
import { BILL_COLORS, daysUntil, seedBills } from "./domain/bills.js";
import { useFinanceData } from "./hooks/useFinanceData.js";
import { checkReminderPermission, requestReminderPermission, syncBillReminders } from "./native/localNotifications.js";
import { BillsPage } from "./pages/BillsPage.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { LedgerPage } from "./pages/LedgerPage.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";

export default function App() {
  const finance = useFinanceData(seedBills);
  const [active, setActive] = useState("home");
  const [quickOpen, setQuickOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [notificationState, setNotificationState] = useState("default");
  const [reminderPermission, setReminderPermission] = useState("prompt");

  useEffect(() => {
    let cancelled = false;
    if (!Capacitor.isNativePlatform()) {
      if ("Notification" in window) setNotificationState(Notification.permission);
      if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
    }

    checkReminderPermission(LocalNotifications)
      .then((permission) => {
        if (!cancelled) setReminderPermission(permission);
      })
      .catch(() => {
        if (!cancelled) setReminderPermission("denied");
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    syncBillReminders({
      bills: finance.bills,
      settings: finance.reminderSettings,
      plugin: LocalNotifications,
      storage: localStorage,
    }).catch(() => {});
  }, [finance.bills, finance.reminderSettings]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const openQuickAction = (action) => {
    setQuickOpen(false);
    if (action === "bill") setModal({ kind: "bill", bill: null });
    else setModal({ kind: "transaction", type: action, transaction: null });
  };

  const saveTransaction = (form) => {
    const saved = form.id ? finance.updateTransaction(form) : finance.addTransaction(form);
    if (saved) {
      setModal(null);
      setToast(form.id ? "记录已更新" : form.type === "income" ? "收入已记录" : "支出已记录");
    }
    return saved;
  };

  const deleteTransaction = (id) => {
    const saved = finance.deleteTransaction(id);
    if (saved) {
      setModal(null);
      setToast("记录已删除");
    }
    return saved;
  };

  const saveBill = (input) => {
    const isExisting = Boolean(input.id);
    const bill = isExisting ? input : {
      ...input,
      id: crypto.randomUUID(),
      amount: Number(input.amount),
      symbol: input.name.slice(0, 1),
      color: BILL_COLORS[finance.bills.length % BILL_COLORS.length],
    };
    const saved = finance.saveBill(bill);
    if (saved) {
      setModal(null);
      setToast(isExisting ? "账单已更新" : "固定账单已添加");
    }
    return saved;
  };

  const deleteBill = (id) => {
    const saved = finance.deleteBill(id);
    if (saved) {
      setModal(null);
      setToast("账单已删除");
    }
  };

  const requestNativeReminderPermission = async () => {
    try {
      const permission = await requestReminderPermission(LocalNotifications);
      setReminderPermission(permission);
      return permission;
    } catch {
      setReminderPermission("denied");
      return "denied";
    }
  };

  const saveReminderSettings = (settings) => {
    const saved = finance.updateReminderSettings(settings);
    if (saved) setToast("提醒偏好已保存");
    return saved;
  };

  const askNotification = async () => {
    if (Capacitor.isNativePlatform()) {
      setToast("\u8bf7\u5728\u63d0\u9192\u504f\u597d\u4e2d\u5f00\u542f\u672c\u5730\u63d0\u9192");
      return;
    }
    if (!("Notification" in window)) {
      setToast("当前浏览器不支持系统通知");
      return;
    }
    const result = await Notification.requestPermission();
    setNotificationState(result);
    if (result === "granted") {
      const dueSoon = finance.bills.filter((bill) => daysUntil(bill.nextDate) >= 0 && daysUntil(bill.nextDate) <= 7).length;
      new Notification("账期提醒已开启", { body: `目前有 ${dueSoon} 笔账单将在 7 天内到期。`, icon: "/icon.svg" });
      setToast("系统通知已开启");
    }
  };

  return (
    <main className="app-shell">
      {active === "home" && (
        <HomePage
          profile={finance.profile}
          transactions={finance.transactions}
          bills={finance.bills}
          onOpenTransaction={(transaction) => setModal({ kind: "transaction", transaction, type: transaction.type })}
          onOpenBill={(bill) => setModal({ kind: "bill", bill })}
          onNavigate={setActive}
        />
      )}
      {active === "bills" && (
        <BillsPage
          bills={finance.bills}
          onOpenBill={(bill) => setModal({ kind: "bill", bill })}
          onAddBill={() => setModal({ kind: "bill", bill: null })}
        />
      )}
      {active === "ledger" && (
        <LedgerPage
          transactions={finance.transactions}
          onOpenTransaction={(transaction) => setModal({ kind: "transaction", transaction, type: transaction.type })}
        />
      )}
      {active === "profile" && (
        <ProfilePage
          profile={finance.profile}
          onUpdateProfile={finance.updateProfile}
          notificationState={notificationState}
          onAskNotification={askNotification}
          reminderSettings={finance.reminderSettings}
          onOpenReminderSettings={() => setModal({ kind: "reminders" })}
          bills={finance.bills}
          transactions={finance.transactions}
          storageError={finance.storageError}
        />
      )}

      <BottomNav active={active} onNavigate={setActive} onQuickAdd={() => setQuickOpen(true)} />

      {quickOpen && <QuickActionSheet onSelect={openQuickAction} onClose={() => setQuickOpen(false)} />}
      {modal?.kind === "transaction" && (
        <TransactionModal
          transaction={modal.transaction}
          initialType={modal.type}
          onSave={saveTransaction}
          onDelete={deleteTransaction}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === "bill" && (
        <BillModal
          bill={modal.bill}
          onSave={saveBill}
          onDelete={deleteBill}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === "reminders" && (
        <ReminderSettingsModal
          settings={finance.reminderSettings}
          permission={reminderPermission}
          onSave={saveReminderSettings}
          onRequestPermission={requestNativeReminderPermission}
          onClose={() => setModal(null)}
        />
      )}
      {toast && <div className="toast"><Check size={17} />{toast}</div>}
      {finance.storageError && active !== "profile" && <div className="storage-alert">{finance.storageError}</div>}
    </main>
  );
}
