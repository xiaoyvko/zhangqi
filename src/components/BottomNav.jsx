import { BookOpenText, Home, Plus, ReceiptText, UserRound } from "lucide-react";

const items = [
  { id: "home", label: "首页", Icon: Home },
  { id: "bills", label: "账单", Icon: ReceiptText },
  { id: "ledger", label: "明细", Icon: BookOpenText },
  { id: "profile", label: "我的", Icon: UserRound },
];

export function BottomNav({ active, onNavigate, onQuickAdd }) {
  return (
    <nav className="bottom-nav">
      {items.slice(0, 2).map(({ id, label, Icon }) => (
        <button
          key={id}
          className={active === id ? "active" : ""}
          onClick={() => onNavigate(id)}
        >
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
      <button className="nav-quick-add" onClick={onQuickAdd} aria-label="快速记一笔">
        <span><Plus size={23} /></span>
        <em>记一笔</em>
      </button>
      {items.slice(2).map(({ id, label, Icon }) => (
        <button
          key={id}
          className={active === id ? "active" : ""}
          onClick={() => onNavigate(id)}
        >
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
