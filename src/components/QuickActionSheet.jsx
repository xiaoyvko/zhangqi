import { ArrowDownLeft, ArrowUpRight, CalendarPlus, X } from "lucide-react";

const actions = [
  { id: "expense", label: "记支出", detail: "记录今天花了多少", Icon: ArrowUpRight, tone: "expense" },
  { id: "income", label: "记收入", detail: "工资、还款或其他收入", Icon: ArrowDownLeft, tone: "income" },
  { id: "bill", label: "固定账单", detail: "订阅、房租和周期账单", Icon: CalendarPlus, tone: "bill" },
];

export function QuickActionSheet({ onSelect, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="quick-sheet" aria-label="选择记录类型">
        <div className="sheet-handle" />
        <div className="modal-head">
          <div><span className="kicker">QUICK ADD</span><h2>记一笔</h2></div>
          <button type="button" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="quick-action-list">
          {actions.map(({ id, label, detail, Icon, tone }) => (
            <button key={id} onClick={() => onSelect(id)}>
              <span className={`quick-action-icon ${tone}`}><Icon size={21} /></span>
              <div><strong>{label}</strong><small>{detail}</small></div>
              <span className="quick-action-arrow">›</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
