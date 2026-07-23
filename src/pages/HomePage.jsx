import { ArrowDownLeft, ArrowUpRight, CalendarDays, ChevronRight, Clock3, CreditCard, Sparkles, UsersRound } from "lucide-react";
import { dateText, daysUntil, money, monthlyBillAmount } from "../domain/bills.js";
import { summarizeMonth } from "../domain/ledger.js";
import { BillLogo } from "../components/BillLogo.jsx";

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function ProfileAvatar({ profile }) {
  if (profile.avatarData) return <img className="avatar-image" src={profile.avatarData} alt={profile.name} />;
  return <span>{profile.name?.slice(0, 1) || "我"}</span>;
}

export function HomePage({ profile, transactions, bills, onOpenTransaction, onOpenBill, onNavigate }) {
  const summary = summarizeMonth(transactions, currentMonth());
  const monthlyBills = bills.reduce((sum, bill) => sum + monthlyBillAmount(bill), 0);
  const dueSoon = bills.filter((bill) => daysUntil(bill.nextDate) >= 0 && daysUntil(bill.nextDate) <= 7).length;
  const recent = [...transactions]
    .sort((left, right) => `${right.date}${right.createdAt || ""}`.localeCompare(`${left.date}${left.createdAt || ""}`))
    .slice(0, 5);
  const upcoming = [...bills].sort((left, right) => left.nextDate.localeCompare(right.nextDate)).slice(0, 3);

  return (
    <>
      <header className="topbar">
        <button className="brand" onClick={() => onNavigate("home")} aria-label="账期首页">
          <span className="brand-mark"><CreditCard size={20} strokeWidth={2.2} /></span>
          <span>账期</span>
        </button>
        <button className="avatar" onClick={() => onNavigate("profile")} aria-label="个人资料">
          <ProfileAvatar profile={profile} />
        </button>
      </header>
      <section className="hero">
        <div className="eyebrow"><Sparkles size={14} /> 今天也把生活记清楚</div>
        <h1>早上好，{profile.name}</h1>
        <p>每一笔，都让你更了解自己的生活。</p>
        <div className="balance-card">
          <span className="card-label">本月结余</span>
          <strong className={summary.balance < 0 ? "negative" : ""}><small>¥</small>{money(summary.balance)}</strong>
          <div className="balance-split">
            <span><i className="income"><ArrowDownLeft size={14} /></i><em>收入</em><b>¥{money(summary.income)}</b></span>
            <span><i className="expense"><ArrowUpRight size={14} /></i><em>支出</em><b>¥{money(summary.expense)}</b></span>
          </div>
        </div>
        <div className="quick-stats">
          <div><span className="stat-icon lime"><CalendarDays size={18} /></span><p>未来 7 天</p><strong>{dueSoon} 笔待付</strong></div>
          <div><span className="stat-icon violet"><CreditCard size={18} /></span><p>每月固定</p><strong>¥{money(monthlyBills)}</strong></div>
          <div><span className="stat-icon peach"><UsersRound size={18} /></span><p>共享账单</p><strong>{bills.filter((bill) => bill.shared).length} 笔</strong></div>
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div><span className="kicker">RECENT</span><h2>最近流水</h2></div>
          <button className="text-button" onClick={() => onNavigate("ledger")}>查看明细 <ChevronRight size={16} /></button>
        </div>
        {recent.length === 0 ? (
          <button className="ledger-empty-card" onClick={() => onNavigate("ledger")}>
            <span>＋</span><strong>还没有日常账目</strong><small>点下方＋记下第一笔</small>
          </button>
        ) : recent.map((item) => (
          <button className="transaction-row" key={item.id} onClick={() => onOpenTransaction(item)}>
            <span className={`transaction-icon ${item.type}`}>{item.type === "income" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</span>
            <div><strong>{item.description}</strong><small>{item.category} · {item.date.slice(5).replace("-", "月")}日</small></div>
            <b className={item.type}>{item.type === "income" ? "+" : "−"}¥{money(item.amount)}</b>
          </button>
        ))}
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div><span className="kicker">UP NEXT</span><h2>即将扣款</h2></div>
          <button className="text-button" onClick={() => onNavigate("bills")}>所有账单 <ChevronRight size={16} /></button>
        </div>
        {upcoming.map((bill) => (
          <button className="bill-row" key={bill.id} onClick={() => onOpenBill(bill)}>
            <BillLogo bill={bill} />
            <div className="bill-main"><strong>{bill.name}</strong><span>{bill.category} · {bill.cycle}{bill.shared && <em><UsersRound size={12} /> 与{bill.friend}共享</em>}</span></div>
            <div className="bill-amount"><strong>¥{money(bill.amount)}</strong><span className={daysUntil(bill.nextDate) <= 3 ? "urgent" : ""}><Clock3 size={11} /> {dateText(bill.nextDate)}</span></div>
          </button>
        ))}
      </section>
    </>
  );
}
