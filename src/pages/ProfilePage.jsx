import { Bell, Check, Cloud, ImagePlus, Pencil, Save, Smartphone, UsersRound, X } from "lucide-react";
import { useRef, useState } from "react";
import { compressAvatar } from "../lib/avatar.js";

export function ProfilePage({ profile, onUpdateProfile, notificationState, onAskNotification, bills, transactions, storageError }) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(profile.name);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const saveName = () => {
    const value = name.trim();
    if (!value) return setError("请输入名字");
    const saved = onUpdateProfile({ name: value });
    if (saved === false) return setError("名字保存失败，请检查手机存储空间");
    setEditingName(false);
    setError("");
  };

  const chooseAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const avatarData = await compressAvatar(file);
      const saved = onUpdateProfile({ avatarData });
      if (saved === false) setError("头像保存失败，请选择较小的照片");
    } catch (caught) {
      setError(caught.message || "无法读取这张照片");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <section className="subpage profile-page">
      <div className="profile-editor">
        <button className="profile-avatar large" onClick={() => fileRef.current?.click()} aria-label="从相册更换头像">
          {profile.avatarData ? <img src={profile.avatarData} alt={profile.name} /> : <span>{profile.name?.slice(0, 1) || "我"}</span>}
          <i><ImagePlus size={15} /></i>
        </button>
        <input ref={fileRef} className="hidden-file" type="file" accept="image/*" onChange={chooseAvatar} />
        <div className="profile-name-area">
          <span className="kicker">MY PROFILE</span>
          {editingName ? (
            <div className="name-editor">
              <input value={name} maxLength={20} autoFocus onChange={(event) => setName(event.target.value)} />
              <button onClick={saveName}><Save size={16} /></button>
              <button onClick={() => { setEditingName(false); setName(profile.name); setError(""); }}><X size={16} /></button>
            </div>
          ) : (
            <button className="profile-name" onClick={() => setEditingName(true)}><h1>{profile.name}</h1><Pencil size={15} /></button>
          )}
          <p>认真记下每一笔，也是在认真生活。</p>
        </div>
      </div>
      {error && <p className="profile-error" role="alert">{error}</p>}

      <div className={`notification-card ${notificationState === "granted" ? "enabled" : ""}`}>
        <span className="notification-icon"><Bell size={23} /></span>
        <div><strong>{notificationState === "granted" ? "系统通知已开启" : "开启账单提醒"}</strong><p>{notificationState === "granted" ? "账单到期前提醒你" : "不再错过续费和固定扣款"}</p></div>
        {notificationState === "granted" ? <span className="on-badge"><Check size={14} />已开启</span> : <button onClick={onAskNotification}>开启</button>}
      </div>

      <div className="sync-card local">
        <span><Cloud size={22} /></span>
        <div><strong>数据保存在当前手机</strong><p>{transactions.length} 笔流水 · {bills.length} 笔固定账单</p></div>
        <i>仅自己可见</i>
      </div>

      <div className="setting-group">
        <h2>账期设置</h2>
        <button><span className="setting-icon"><Bell size={18} /></span><div><strong>提醒偏好</strong><p>提前 3 天提醒</p></div><span>›</span></button>
        <button><span className="setting-icon"><UsersRound size={18} /></span><div><strong>共享成员</strong><p>固定账单可选择共享</p></div><span>›</span></button>
        <button><span className="setting-icon"><Smartphone size={18} /></span><div><strong>当前设备</strong><p>本机 PWA</p></div><span>›</span></button>
      </div>
      <div className="data-note">
        <strong>请注意本地数据</strong>
        <p>卸载应用或清除浏览器数据可能删除账目。日常流水不会共享给朋友。</p>
      </div>
      {storageError && <p className="profile-error" role="alert">{storageError}</p>}
    </section>
  );
}
