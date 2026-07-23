import { useState } from "react";
import { Trash2, X } from "lucide-react";

const categories = ["影音娱乐", "工作学习", "生活服务", "住房账单", "保险保障", "其他"];

function localDateAfter(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function BillModal({ bill, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(bill || {
    name: "",
    amount: "",
    cycle: "月付",
    nextDate: localDateAfter(7),
    category: "影音娱乐",
    shared: false,
    reminderEnabled: true,
    payer: "我",
    friend: "",
    note: "",
  });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal-sheet" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
        <div className="sheet-handle" />
        <div className="modal-head">
          <div>
            <span className="kicker">{bill ? "EDIT BILL" : "NEW BILL"}</span>
            <h2>{bill ? "编辑账单" : "添加固定账单"}</h2>
          </div>
          <button type="button" onClick={onClose}><X size={20} /></button>
        </div>
        <label><span>账单名称</span><input required autoFocus value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="例如：视频会员" /></label>
        <div className="form-pair">
          <label><span>金额（元）</span><input required min="0" step="0.01" type="number" value={form.amount} onChange={(event) => update("amount", event.target.value)} placeholder="0.00" /></label>
          <label><span>付款周期</span><select value={form.cycle} onChange={(event) => update("cycle", event.target.value)}><option>月付</option><option>季付</option><option>年付</option></select></label>
        </div>
        <div className="form-pair">
          <label><span>下次扣款</span><input required type="date" value={form.nextDate} onChange={(event) => update("nextDate", event.target.value)} /></label>
          <label><span>分类</span><select value={form.category} onChange={(event) => update("category", event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        </div>
        <label><span>备注</span><input value={form.note} onChange={(event) => update("note", event.target.value)} placeholder="套餐、账号或其他说明" /></label>
        <label className="share-toggle">
          <div><strong>与朋友共享</strong><span>共同查看账单与付款状态</span></div>
          <input type="checkbox" checked={form.shared} onChange={(event) => update("shared", event.target.checked)} /><i />
        </label>
        <label className="share-toggle">
          <div><strong>到期提醒</strong><span>按照“我的”页面中的提醒偏好通知</span></div>
          <input type="checkbox" checked={form.reminderEnabled !== false} onChange={(event) => update("reminderEnabled", event.target.checked)} /><i />
        </label>
        {form.shared && (
          <div className="form-pair">
            <label><span>付款人</span><select value={form.payer} onChange={(event) => update("payer", event.target.value)}><option>我</option><option>朋友</option></select></label>
            <label><span>共享给</span><input required value={form.friend} onChange={(event) => update("friend", event.target.value)} placeholder="朋友昵称" /></label>
          </div>
        )}
        <div className="modal-actions">
          {bill && <button type="button" className="delete" onClick={() => onDelete(bill.id)}><Trash2 size={18} /></button>}
          <button type="button" className="cancel" onClick={onClose}>取消</button>
          <button className="save" type="submit">{bill ? "保存修改" : "添加账单"}</button>
        </div>
      </form>
    </div>
  );
}
