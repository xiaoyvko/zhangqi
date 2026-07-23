"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell, CalendarDays, ChevronDown, ChevronRight, CircleUserRound, Clock3,
  CreditCard, Home, Plus, Search, Settings, Sparkles, UsersRound, WalletCards,
  X, Check, Trash2, Pencil, Share2, Smartphone, Cloud, MoreHorizontal
} from "lucide-react";

const DAY = 86400000;
const categories = ["影音娱乐", "工作学习", "生活服务", "住房账单", "保险保障", "其他"];
const colors = ["#e9ff57", "#c9b9ff", "#ffb98c", "#91dbc5", "#ffd869", "#b8d4ff"];

function isoAfter(days) {
  const d = new Date(Date.now() + days * DAY);
  return d.toISOString().slice(0, 10);
}

const seedBills = [
  { id: "b1", name: "Netflix", amount: 68, cycle: "月付", nextDate: isoAfter(2), category: "影音娱乐", color: "#e45b4f", symbol: "N", shared: true, payer: "我", friend: "小林", note: "高级套餐" },
  { id: "b2", name: "iCloud+", amount: 21, cycle: "月付", nextDate: isoAfter(5), category: "工作学习", color: "#5797e5", symbol: "☁", shared: false, payer: "我", note: "200 GB" },
  { id: "b3", name: "房租", amount: 4800, cycle: "月付", nextDate: isoAfter(8), category: "住房账单", color: "#22241e", symbol: "屋", shared: true, payer: "小林", friend: "小林", note: "每月 1 日" },
  { id: "b4", name: "Spotify", amount: 45, cycle: "月付", nextDate: isoAfter(13), category: "影音娱乐", color: "#41a668", symbol: "S", shared: true, payer: "我", friend: "阿澈", note: "双人套餐" },
  { id: "b5", name: "健身房", amount: 1280, cycle: "年付", nextDate: isoAfter(26), category: "生活服务", color: "#f08b47", symbol: "动", shared: false, payer: "我", note: "年度会员" },
];

function money(n) {
  return Number(n).toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function daysUntil(date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(`${date}T00:00:00`) - today) / DAY);
}

function dateText(date) {
  const days = daysUntil(date);
  if (days === 0) return "今天";
  if (days === 1) return "明天";
  if (days > 1 && days < 30) return `${days} 天后`;
  return new Date(`${date}T00:00:00`).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function BillLogo({ bill, small = false }) {
  return <div className={`bill-logo ${small ? "small" : ""}`} style={{ background: bill.color }}>{bill.symbol || bill.name.slice(0, 1)}</div>;
}

export default function App() {
  const [bills, setBills] = useState(seedBills);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState("home");
  const [filter, setFilter] = useState("全部");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [notificationState, setNotificationState] = useState("default");

  useEffect(() => {
    const saved = localStorage.getItem("zhangqi-bills");
    if (saved) {
      try { setBills(JSON.parse(saved)); } catch {}
    }
    if ("Notification" in window) setNotificationState(Notification.permission);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem("zhangqi-bills", JSON.stringify(bills));
  }, [bills, ready]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const monthly = useMemo(() => bills.reduce((sum, bill) => sum + Number(bill.amount) / (bill.cycle === "年付" ? 12 : bill.cycle === "季付" ? 3 : 1), 0), [bills]);
  const yearly = monthly * 12;
  const dueSoon = bills.filter((b) => daysUntil(b.nextDate) >= 0 && daysUntil(b.nextDate) <= 7).length;
  const filteredBills = bills
    .filter((b) => filter === "全部" || (filter === "共享" ? b.shared : b.category === filter))
    .filter((b) => b.name.toLowerCase().includes(query.toLowerCase()) || b.category.includes(query))
    .sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate));

  const saveBill = (data) => {
    if (data.id) setBills((all) => all.map((b) => b.id === data.id ? data : b));
    else setBills((all) => [...all, { ...data, id: crypto.randomUUID(), symbol: data.name.slice(0, 1), color: colors[all.length % colors.length] }]);
    setModal(null);
    setToast(data.id ? "账单已更新" : "账单已添加");
  };

  const askNotification = async () => {
    if (!("Notification" in window)) return setToast("当前浏览器不支持系统通知");
    const result = await Notification.requestPermission();
    setNotificationState(result);
    if (result === "granted") {
      new Notification("账期提醒已开启", { body: `目前有 ${dueSoon} 笔账单将在 7 天内到期。`, icon: "/icon.svg" });
      setToast("系统通知已开启");
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setActive("home")} aria-label="账期首页">
          <span className="brand-mark"><WalletCards size={20} strokeWidth={2.2}/></span>
          <span>账期</span>
        </button>
        <div className="top-actions">
          <button className="icon-button" onClick={() => setActive("reminders")} aria-label="提醒">
            <Bell size={20}/>{dueSoon > 0 && <i>{dueSoon}</i>}
          </button>
          <button className="avatar" onClick={() => setActive("settings")}>漾</button>
        </div>
      </header>

      {active === "home" && (
        <>
          <section className="hero">
            <div className="eyebrow"><Sparkles size={14}/> 你的固定支出，一目了然</div>
            <h1>早上好，漾</h1>
            <p>把钱花在哪里，心里有数。</p>
            <div className="month-card">
              <div>
                <span className="card-label">每月固定支出</span>
                <strong><small>¥</small>{money(monthly)}</strong>
                <span className="trend"><span>↓ 6.8%</span> 较上月节省 ¥108</span>
              </div>
              <div className="mini-chart" aria-label="近六个月支出趋势">
                {[42, 64, 54, 78, 68, 58].map((h, i) => <i key={i} style={{height: `${h}%`}} className={i === 5 ? "current" : ""}/>)}
              </div>
            </div>
            <div className="quick-stats">
              <div><span className="stat-icon lime"><CalendarDays size={18}/></span><p>未来 7 天</p><strong>{dueSoon} 笔待付</strong></div>
              <div><span className="stat-icon violet"><CreditCard size={18}/></span><p>年度预计</p><strong>¥{money(yearly)}</strong></div>
              <div><span className="stat-icon peach"><UsersRound size={18}/></span><p>共享账单</p><strong>{bills.filter(b => b.shared).length} 笔</strong></div>
            </div>
          </section>

          <section className="content-section">
            <div className="section-heading">
              <div><span className="kicker">UP NEXT</span><h2>即将扣款</h2></div>
              <button className="text-button" onClick={() => setFilter("全部")}>查看全部 <ChevronRight size={16}/></button>
            </div>
            {filteredBills.slice(0, 3).map((bill) => (
              <button className="bill-row" key={bill.id} onClick={() => setModal(bill)}>
                <BillLogo bill={bill}/>
                <div className="bill-main"><strong>{bill.name}</strong><span>{bill.category} · {bill.cycle}{bill.shared && <em><UsersRound size={12}/> 与{bill.friend}共享</em>}</span></div>
                <div className="bill-amount"><strong>¥{money(bill.amount)}</strong><span className={daysUntil(bill.nextDate) <= 3 ? "urgent" : ""}>{dateText(bill.nextDate)}</span></div>
              </button>
            ))}
          </section>

          <section className="content-section all-bills">
            <div className="section-heading">
              <div><span className="kicker">ALL BILLS</span><h2>所有账单</h2></div>
              <button className="round-add" onClick={() => setModal("new")}><Plus size={19}/></button>
            </div>
            <div className="search"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索账单或分类"/>{query && <button onClick={() => setQuery("")}><X size={16}/></button>}</div>
            <div className="chips">
              {["全部", "共享", "影音娱乐", "生活服务", "住房账单"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}
            </div>
            <div className="bill-grid">
              {filteredBills.map((bill) => (
                <article className="bill-card" key={bill.id}>
                  <button className="card-menu" onClick={() => setModal(bill)}><MoreHorizontal size={18}/></button>
                  <BillLogo bill={bill} small/>
                  <div className="bill-card-title"><strong>{bill.name}</strong>{bill.shared && <span><UsersRound size={12}/>共享</span>}</div>
                  <p>{bill.category} · {bill.note || bill.cycle}</p>
                  <div className="card-price"><strong>¥{money(bill.amount)}</strong><span>/ {bill.cycle.replace("付", "")}</span></div>
                  <div className="card-due"><Clock3 size={14}/>{dateText(bill.nextDate)}扣款</div>
                </article>
              ))}
            </div>
            {filteredBills.length === 0 && <div className="empty"><Search size={28}/><strong>没有找到相关账单</strong><span>换个关键词试试</span></div>}
          </section>
        </>
      )}

      {active === "shared" && <SharedPage bills={bills} onOpen={setModal}/>}
      {active === "reminders" && <ReminderPage bills={bills} state={notificationState} onAsk={askNotification}/>}
      {active === "settings" && <SettingsPage bills={bills}/>}

      <button className="fab" onClick={() => setModal("new")}><Plus size={22}/><span>添加账单</span></button>

      <nav className="bottom-nav">
        <button className={active === "home" ? "active" : ""} onClick={() => setActive("home")}><Home size={20}/><span>首页</span></button>
        <button className={active === "shared" ? "active" : ""} onClick={() => setActive("shared")}><UsersRound size={20}/><span>共享</span></button>
        <span className="nav-gap"/>
        <button className={active === "reminders" ? "active" : ""} onClick={() => setActive("reminders")}><Bell size={20}/><span>提醒</span></button>
        <button className={active === "settings" ? "active" : ""} onClick={() => setActive("settings")}><Settings size={20}/><span>设置</span></button>
      </nav>

      {modal && <BillModal bill={modal === "new" ? null : modal} onClose={() => setModal(null)} onSave={saveBill} onDelete={(id) => { setBills(bills.filter(b => b.id !== id)); setModal(null); setToast("账单已删除"); }}/>}
      {toast && <div className="toast"><Check size={17}/>{toast}</div>}
    </main>
  );
}

function SharedPage({ bills, onOpen }) {
  const shared = bills.filter((b) => b.shared);
  return <section className="subpage">
    <div className="page-intro"><span className="kicker">TOGETHER</span><h1>和朋友一起分担</h1><p>共享账单、明确付款人，不再反复算账。</p></div>
    <div className="friend-card">
      <div className="friend-avatars"><i>漾</i><i>林</i><i>澈</i><button><Plus size={18}/></button></div>
      <div><strong>我的共享圈</strong><span>3 位成员 · {shared.length} 笔账单</span></div>
      <button className="invite"><Share2 size={16}/>邀请</button>
    </div>
    <div className="shared-summary"><span>本月共同支出</span><strong>¥{money(shared.reduce((s,b) => s + Number(b.amount)/(b.cycle === "年付" ? 12 : 1),0))}</strong><p>你的预计份额 ¥{money(shared.reduce((s,b) => s + Number(b.amount)/(b.cycle === "年付" ? 24 : 2),0))}</p></div>
    <div className="section-heading"><div><span className="kicker">SHARED BILLS</span><h2>共享账单</h2></div></div>
    {shared.map(bill => <button className="bill-row" key={bill.id} onClick={() => onOpen(bill)}><BillLogo bill={bill}/><div className="bill-main"><strong>{bill.name}</strong><span>{bill.payer}付款 · 与{bill.friend}共享</span></div><div className="bill-amount"><strong>¥{money(bill.amount)}</strong><span>{dateText(bill.nextDate)}</span></div></button>)}
  </section>
}

function ReminderPage({ bills, state, onAsk }) {
  const sorted = [...bills].sort((a,b) => new Date(a.nextDate)-new Date(b.nextDate));
  return <section className="subpage">
    <div className="page-intro"><span className="kicker">REMINDERS</span><h1>不再错过扣款</h1><p>提前知道，决定续费还是取消。</p></div>
    <div className={`notification-card ${state === "granted" ? "enabled" : ""}`}>
      <span className="notification-icon"><Bell size={24}/></span>
      <div><strong>{state === "granted" ? "系统通知已开启" : "开启系统通知"}</strong><p>{state === "granted" ? "账单到期前 3 天提醒你" : "到期前收到提醒，不再意外扣款"}</p></div>
      {state === "granted" ? <span className="on-badge"><Check size={14}/>已开启</span> : <button onClick={onAsk}>开启</button>}
    </div>
    <div className="timeline">
      {sorted.map((bill, i) => <div className="timeline-item" key={bill.id}><div className="timeline-date"><strong>{dateText(bill.nextDate)}</strong><span>{new Date(bill.nextDate).toLocaleDateString("zh-CN",{month:"2-digit",day:"2-digit"})}</span></div><span className="timeline-dot"/><BillLogo bill={bill} small/><div className="timeline-main"><strong>{bill.name}</strong><span>将扣款 ¥{money(bill.amount)}</span></div></div>)}
    </div>
  </section>
}

function SettingsPage({ bills }) {
  return <section className="subpage">
    <div className="profile-head"><div className="profile-avatar">漾</div><div><h1>漾</h1><p>和朋友把账算清楚，也把生活过轻松。</p></div></div>
    <div className="sync-card"><span><Cloud size={22}/></span><div><strong>云端同步</strong><p>本机数据已保存 · 后端接入后可跨设备</p></div><i>准备就绪</i></div>
    <div className="setting-group"><h2>账期设置</h2>
      <button><span className="setting-icon"><Bell size={18}/></span><div><strong>提醒偏好</strong><p>提前 3 天提醒</p></div><ChevronRight size={18}/></button>
      <button><span className="setting-icon"><UsersRound size={18}/></span><div><strong>共享成员</strong><p>3 位成员</p></div><ChevronRight size={18}/></button>
      <button><span className="setting-icon"><Smartphone size={18}/></span><div><strong>设备管理</strong><p>当前设备</p></div><ChevronRight size={18}/></button>
    </div>
    <div className="data-note"><strong>{bills.length} 笔账单已保存在当前设备</strong><p>正式上线时接入账号与云数据库，即可实现手机、平板之间实时同步。</p></div>
  </section>
}

function BillModal({ bill, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(bill || { name: "", amount: "", cycle: "月付", nextDate: isoAfter(7), category: "影音娱乐", shared: false, payer: "我", friend: "", note: "" });
  const update = (key, value) => setForm({ ...form, [key]: value });
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <form className="modal-sheet" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
      <div className="sheet-handle"/>
      <div className="modal-head"><div><span className="kicker">{bill ? "EDIT BILL" : "NEW BILL"}</span><h2>{bill ? "编辑账单" : "添加新账单"}</h2></div><button type="button" onClick={onClose}><X size={20}/></button></div>
      <label><span>账单名称</span><input required autoFocus value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="例如：视频会员"/></label>
      <div className="form-pair"><label><span>金额（元）</span><input required min="0" step="0.01" type="number" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0.00"/></label><label><span>付款周期</span><select value={form.cycle} onChange={(e) => update("cycle", e.target.value)}><option>月付</option><option>季付</option><option>年付</option></select></label></div>
      <div className="form-pair"><label><span>下次扣款</span><input required type="date" value={form.nextDate} onChange={(e) => update("nextDate", e.target.value)}/></label><label><span>分类</span><select value={form.category} onChange={(e) => update("category", e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label></div>
      <label><span>备注</span><input value={form.note} onChange={(e) => update("note", e.target.value)} placeholder="套餐、账号或其他说明"/></label>
      <label className="share-toggle"><div><strong>与朋友共享</strong><span>共同查看账单与付款状态</span></div><input type="checkbox" checked={form.shared} onChange={(e) => update("shared", e.target.checked)}/><i/></label>
      {form.shared && <div className="form-pair"><label><span>付款人</span><select value={form.payer} onChange={(e) => update("payer", e.target.value)}><option>我</option><option>朋友</option></select></label><label><span>共享给</span><input required value={form.friend} onChange={(e) => update("friend", e.target.value)} placeholder="朋友昵称"/></label></div>}
      <div className="modal-actions">{bill && <button type="button" className="delete" onClick={() => onDelete(bill.id)}><Trash2 size={18}/></button>}<button type="button" className="cancel" onClick={onClose}>取消</button><button className="save" type="submit">{bill ? "保存修改" : "添加账单"}</button></div>
    </form>
  </div>
}
