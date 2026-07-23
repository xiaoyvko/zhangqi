import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Trash2, X } from "lucide-react";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, localDateString } from "../domain/ledger.js";

export function TransactionModal({ transaction, initialType = "expense", onSave, onDelete, onClose }) {
  const [form, setForm] = useState(transaction || {
    type: initialType,
    amount: "",
    description: "",
    category: initialType === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
    date: localDateString(),
  });
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const categories = useMemo(
    () => form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES,
    [form.type],
  );

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const changeType = (type) => {
    setForm((current) => ({
      ...current,
      type,
      category: type === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
    }));
    setError("");
  };

  const submit = (event) => {
    event.preventDefault();
    try {
      const saved = onSave(form);
      if (saved === false) setError("保存失败，请检查手机存储空间后重试");
    } catch (caught) {
      setError(caught.message || "无法保存这笔记录");
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal-sheet transaction-sheet" onSubmit={submit}>
        <div className="sheet-handle" />
        <div className="modal-head">
          <div>
            <span className="kicker">{transaction ? "EDIT RECORD" : "NEW RECORD"}</span>
            <h2>{transaction ? "编辑记录" : form.type === "income" ? "记一笔收入" : "记一笔支出"}</h2>
          </div>
          <button type="button" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="transaction-type-switch">
          <button type="button" className={form.type === "expense" ? "active expense" : ""} onClick={() => changeType("expense")}><ArrowUpRight size={17} />支出</button>
          <button type="button" className={form.type === "income" ? "active income" : ""} onClick={() => changeType("income")}><ArrowDownLeft size={17} />收入</button>
        </div>
        <label className="amount-field">
          <span>金额（元）</span>
          <div><em>¥</em><input autoFocus required inputMode="decimal" min="0.01" step="0.01" type="number" value={form.amount} onChange={(event) => update("amount", event.target.value)} placeholder="0.00" /></div>
        </label>
        <label><span>说明</span><input value={form.description} maxLength={40} onChange={(event) => update("description", event.target.value)} placeholder={form.type === "income" ? "例如：本月工资" : "例如：和朋友吃午饭"} /></label>
        <div className="form-pair">
          <label><span>分类</span><select value={form.category} onChange={(event) => update("category", event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label><span>日期</span><input required type="date" value={form.date} onChange={(event) => update("date", event.target.value)} /></label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          {transaction && !confirmDelete && <button type="button" className="delete" onClick={() => setConfirmDelete(true)}><Trash2 size={18} /></button>}
          {confirmDelete ? (
            <div className="delete-confirm">
              <span>确定删除这笔记录吗？</span>
              <button type="button" onClick={() => setConfirmDelete(false)}>取消</button>
              <button type="button" className="danger" onClick={() => onDelete(transaction.id)}>确认删除</button>
            </div>
          ) : (
            <>
              <button type="button" className="cancel" onClick={onClose}>取消</button>
              <button className="save" type="submit">{transaction ? "保存修改" : "保存记录"}</button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
