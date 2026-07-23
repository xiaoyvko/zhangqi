import { useState } from "react";
import { REMINDER_DAY_OPTIONS, normalizeReminderSettings } from "../domain/reminders.js";

function permissionText(permission) {
  if (permission === "granted") return "系统通知已开启";
  if (permission === "web") return "浏览器通知由当前浏览器控制";
  if (permission === "prompt") return "保存时将请求系统通知权限";
  return "系统通知未开启";
}

export function ReminderSettingsModal({
  settings,
  permission,
  onSave,
  onRequestPermission,
  onClose,
}) {
  const [form, setForm] = useState(() => normalizeReminderSettings(settings));
  const [permissionWarning, setPermissionWarning] = useState("");
  const update = (patch) => setForm((current) => ({ ...current, ...patch }));

  const save = async (event) => {
    event.preventDefault();
    setPermissionWarning("");

    let nextPermission = permission;
    if (form.enabled && permission !== "granted" && permission !== "web") {
      nextPermission = await onRequestPermission();
    }

    const saved = onSave(form);
    if (saved === false) return;

    if (form.enabled && nextPermission !== "granted" && nextPermission !== "web") {
      setPermissionWarning("系统通知未开启，账目仍会正常保存");
      return;
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal-sheet reminder-settings-sheet" onSubmit={save}>
        <div className="sheet-handle" />
        <div className="modal-head">
          <div>
            <span className="kicker">REMINDER SETTINGS</span>
            <h2>提醒偏好</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭提醒偏好">×</button>
        </div>

        <label className="share-toggle">
          <div><strong>开启到期提醒</strong><span>按所选时间为已启用的账单发送通知</span></div>
          <input type="checkbox" checked={form.enabled} onChange={(event) => update({ enabled: event.target.checked })} /><i />
        </label>

        <fieldset disabled={!form.enabled}>
          <legend>提前几天</legend>
          <div className="reminder-day-options">
            {REMINDER_DAY_OPTIONS.map((days) => (
              <button
                type="button"
                className={form.daysBefore === days ? "active" : ""}
                key={days}
                onClick={() => update({ daysBefore: days })}
              >
                {days === 0 ? "当天" : `提前 ${days} 天`}
              </button>
            ))}
          </div>
          <label className="reminder-time-field">
            <span>提醒时间</span>
            <input type="time" value={form.time} onChange={(event) => update({ time: event.target.value })} />
          </label>
        </fieldset>

        <p className={`permission-status ${permission === "granted" ? "granted" : ""}`} role="status">
          {permissionText(permission)}
        </p>
        {permissionWarning && <p className="profile-error" role="alert">{permissionWarning}</p>}

        <div className="modal-actions">
          <button type="button" className="cancel" onClick={onClose}>取消</button>
          <button className="save" type="submit">保存偏好</button>
        </div>
      </form>
    </div>
  );
}
