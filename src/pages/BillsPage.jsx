import { ChevronRight, MoreHorizontal, Plus, Search, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { BillLogo } from "../components/BillLogo.jsx";
import { dateText, money, monthlyBillAmount } from "../domain/bills.js";

const filters = ["全部", "共享", "影音娱乐", "生活服务", "住房账单"];

export function BillsPage({ bills, onOpenBill, onAddBill }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("全部");
  const shared = bills.filter((bill) => bill.shared);
  const filtered = useMemo(() => bills
    .filter((bill) => filter === "全部" || (filter === "共享" ? bill.shared : bill.category === filter))
    .filter((bill) => bill.name.toLowerCase().includes(query.toLowerCase()) || bill.category.includes(query))
    .sort((left, right) => left.nextDate.localeCompare(right.nextDate)), [bills, filter, query]);
  const sharedMonthly = shared.reduce((sum, bill) => sum + monthlyBillAmount(bill), 0);

  return (
    <section className="subpage bills-page">
      <div className="page-intro">
        <span className="kicker">FIXED BILLS</span>
        <h1>固定账单</h1>
        <p>订阅、房租和共同支出，按时提醒。</p>
      </div>
      <div className="bill-overview-card">
        <div><span>每月固定支出</span><strong>¥{money(bills.reduce((sum, bill) => sum + monthlyBillAmount(bill), 0))}</strong></div>
        <button onClick={onAddBill}><Plus size={18} />添加</button>
      </div>
      <div className="search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索账单或分类" />{query && <button onClick={() => setQuery("")}><X size={16} /></button>}</div>
      <div className="chips">{filters.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <div className="bill-grid">
        {filtered.map((bill) => (
          <article className="bill-card" key={bill.id}>
            <button className="card-menu" onClick={() => onOpenBill(bill)}><MoreHorizontal size={18} /></button>
            <BillLogo bill={bill} small />
            <div className="bill-card-title"><strong>{bill.name}</strong>{bill.shared && <span><UsersRound size={12} />共享</span>}</div>
            <p>{bill.category} · {bill.note || bill.cycle}</p>
            <div className="card-price"><strong>¥{money(bill.amount)}</strong><span>/ {bill.cycle.replace("付", "")}</span></div>
            <div className="card-due">下次 {dateText(bill.nextDate)}</div>
          </article>
        ))}
      </div>
      {filtered.length === 0 && <div className="empty"><Search size={28} /><strong>没有找到相关账单</strong><span>换个关键词试试</span></div>}

      <div className="section-heading shared-heading"><div><span className="kicker">TOGETHER</span><h2>朋友共享</h2></div></div>
      <div className="shared-summary">
        <span>本月共同支出</span><strong>¥{money(sharedMonthly)}</strong><p>你的预计份额 ¥{money(sharedMonthly / 2)}</p>
      </div>
      {shared.map((bill) => (
        <button className="bill-row" key={bill.id} onClick={() => onOpenBill(bill)}>
          <BillLogo bill={bill} />
          <div className="bill-main"><strong>{bill.name}</strong><span>{bill.payer}付款 · 与{bill.friend}共享</span></div>
          <div className="bill-amount"><strong>¥{money(bill.amount)}</strong><span>{dateText(bill.nextDate)} <ChevronRight size={12} /></span></div>
        </button>
      ))}
    </section>
  );
}
