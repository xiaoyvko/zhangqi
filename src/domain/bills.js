const DAY = 86400000;

export const BILL_COLORS = ["#e9ff57", "#c9b9ff", "#ffb98c", "#91dbc5", "#ffd869", "#b8d4ff"];

function localDateAfter(days) {
  const date = new Date(Date.now() + days * DAY);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const seedBills = [
  { id: "b1", name: "Netflix", amount: 68, cycle: "月付", nextDate: localDateAfter(2), category: "影音娱乐", color: "#e45b4f", symbol: "N", shared: true, payer: "我", friend: "小林", note: "高级套餐" },
  { id: "b2", name: "iCloud+", amount: 21, cycle: "月付", nextDate: localDateAfter(5), category: "工作学习", color: "#5797e5", symbol: "☁", shared: false, payer: "我", note: "200 GB" },
  { id: "b3", name: "房租", amount: 4800, cycle: "月付", nextDate: localDateAfter(8), category: "住房账单", color: "#22241e", symbol: "屋", shared: true, payer: "小林", friend: "小林", note: "每月 1 日" },
  { id: "b4", name: "Spotify", amount: 45, cycle: "月付", nextDate: localDateAfter(13), category: "影音娱乐", color: "#41a668", symbol: "S", shared: true, payer: "我", friend: "阿澈", note: "双人套餐" },
  { id: "b5", name: "健身房", amount: 1280, cycle: "年付", nextDate: localDateAfter(26), category: "生活服务", color: "#f08b47", symbol: "动", shared: false, payer: "我", note: "年度会员" },
];

export function money(value) {
  return Number(value || 0).toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function daysUntil(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(`${date}T00:00:00`) - today) / DAY);
}

export function dateText(date) {
  const days = daysUntil(date);
  if (days === 0) return "今天";
  if (days === 1) return "明天";
  if (days > 1 && days < 30) return `${days} 天后`;
  return new Date(`${date}T00:00:00`).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export function monthlyBillAmount(bill) {
  if (bill.cycle === "年付") return Number(bill.amount) / 12;
  if (bill.cycle === "季付") return Number(bill.amount) / 3;
  return Number(bill.amount);
}
