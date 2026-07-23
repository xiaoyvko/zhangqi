import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, ChartNoAxesColumnIncreasing, List } from "lucide-react";
import { useMemo, useState } from "react";
import { groupTransactionsByDate, localDateString, summarizeMonth } from "../domain/ledger.js";
import { money } from "../domain/bills.js";

function monthString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(value, amount) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return monthString(date);
}

function monthLabel(value) {
  const [year, month] = value.split("-").map(Number);
  return `${year}年${month}月`;
}

function makeCalendarDays(month, transactions) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(year, monthNumber - 1, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, monthNumber - 1, 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const value = localDateString(date);
    const items = transactions.filter((item) => item.date === value);
    return {
      date: value,
      day: date.getDate(),
      inMonth: date.getMonth() === monthNumber - 1,
      income: items.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0),
      expense: items.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0),
    };
  });
}

function TransactionRow({ item, onOpen }) {
  return (
    <button className="transaction-row" onClick={() => onOpen(item)}>
      <span className={`transaction-icon ${item.type}`}>{item.type === "income" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</span>
      <div><strong>{item.description}</strong><small>{item.category}</small></div>
      <b className={item.type}>{item.type === "income" ? "+" : "−"}¥{money(item.amount)}</b>
    </button>
  );
}

function Breakdown({ title, values, total, tone }) {
  const entries = Object.entries(values).sort(([, left], [, right]) => right - left);
  return (
    <div className="breakdown-card">
      <h3>{title}</h3>
      {entries.length === 0 ? <p className="mini-empty">本月暂无{tone === "income" ? "收入" : "支出"}记录</p> : entries.map(([category, amount]) => {
        const percent = total === 0 ? 0 : Math.round((amount / total) * 100);
        return (
          <div className="breakdown-row" key={category}>
            <div><strong>{category}</strong><span>¥{money(amount)} · {percent}%</span></div>
            <i><b className={tone} style={{ width: `${percent}%` }} /></i>
          </div>
        );
      })}
    </div>
  );
}

export function LedgerPage({ transactions, onOpenTransaction }) {
  const [view, setView] = useState("list");
  const [month, setMonth] = useState(monthString());
  const [selectedDate, setSelectedDate] = useState(localDateString());
  const groups = useMemo(() => groupTransactionsByDate(transactions), [transactions]);
  const monthGroups = groups.filter((group) => group.date.startsWith(`${month}-`));
  const summary = useMemo(() => summarizeMonth(transactions, month), [transactions, month]);
  const calendarDays = useMemo(() => makeCalendarDays(month, transactions), [month, transactions]);
  const selectedItems = transactions.filter((item) => item.date === selectedDate);

  return (
    <section className="subpage ledger-page">
      <div className="page-intro"><span className="kicker">MY LEDGER</span><h1>收支明细</h1><p>看看钱从哪里来，又花去了哪里。</p></div>
      <div className="ledger-view-tabs">
        <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><List size={16} />流水</button>
        <button className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}><CalendarDays size={16} />日历</button>
        <button className={view === "stats" ? "active" : ""} onClick={() => setView("stats")}><ChartNoAxesColumnIncreasing size={16} />统计</button>
      </div>
      <div className="month-switcher">
        <button onClick={() => setMonth(shiftMonth(month, -1))}><ArrowLeft size={17} /></button>
        <strong>{monthLabel(month)}</strong>
        <button onClick={() => setMonth(shiftMonth(month, 1))}><ArrowRight size={17} /></button>
      </div>
      {view === "list" && (
        <div className="ledger-list">
          {monthGroups.length === 0 ? <div className="ledger-empty"><span>记</span><strong>这个月还没有账目</strong><p>点击下方＋，记录第一笔收入或支出</p></div> : monthGroups.map((group) => (
            <section className="day-group" key={group.date}>
              <header><div><strong>{new Date(`${group.date}T00:00:00`).toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}</strong><span>{new Date(`${group.date}T00:00:00`).toLocaleDateString("zh-CN", { weekday: "short" })}</span></div><p>收 ¥{money(group.income)} · 支 ¥{money(group.expense)} · 净额 <b className={group.net >= 0 ? "income" : "expense"}>{group.net >= 0 ? "+" : "−"}¥{money(Math.abs(group.net))}</b></p></header>
              {group.items.map((item) => <TransactionRow key={item.id} item={item} onOpen={onOpenTransaction} />)}
            </section>
          ))}
        </div>
      )}
      {view === "calendar" && (
        <>
          <div className="calendar-card">
            <div className="calendar-weekdays">{["一", "二", "三", "四", "五", "六", "日"].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="calendar-grid">{calendarDays.map((day) => (
              <button key={day.date} className={`${day.inMonth ? "" : "muted"} ${selectedDate === day.date ? "selected" : ""}`} onClick={() => setSelectedDate(day.date)}>
                <span>{day.day}</span>
                <i>{day.income > 0 && <b className="income" />}{day.expense > 0 && <b className="expense" />}</i>
              </button>
            ))}</div>
          </div>
          <div className="selected-day">
            <h3>{new Date(`${selectedDate}T00:00:00`).toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })}</h3>
            {selectedItems.length === 0 ? <p className="mini-empty">这一天没有记录</p> : selectedItems.map((item) => <TransactionRow key={item.id} item={item} onOpen={onOpenTransaction} />)}
          </div>
        </>
      )}
      {view === "stats" && (
        <div className="stats-view">
          <div className="stats-summary">
            <div><span>收入</span><strong className="income">+¥{money(summary.income)}</strong></div>
            <div><span>支出</span><strong className="expense">−¥{money(summary.expense)}</strong></div>
            <div><span>结余</span><strong>¥{money(summary.balance)}</strong></div>
          </div>
          <Breakdown title="支出去向" values={summary.expenseByCategory} total={summary.expense} tone="expense" />
          <Breakdown title="收入来源" values={summary.incomeByCategory} total={summary.income} tone="income" />
        </div>
      )}
    </section>
  );
}
