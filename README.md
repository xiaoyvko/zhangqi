# 🧾 账期

> 极简个人记账 & 账单提醒 Android 应用

**账期** 是一款完全离线、无需注册登录的个人财务管理工具。帮助你在手机上轻松记录每一笔收入和支出，管理固定账单，并在账单到期前准时推送提醒。

所有数据仅存储在你自己的手机上，不上传任何服务器，不收集任何隐私。

---

## ✨ 功能

### 📊 记账 & 账单管理

- **收支记录** — 记录日常收入与支出，支持多种分类（工资、餐饮、交通、购物、医疗等）
- **固定账单** — 管理月付 / 季付 / 年付的周期账单（如房租、订阅服务）
- **合租分摊** — 标记合租房租等分摊账单，好友名称 + 对半估算
- **搜索筛选** — 账单搜索 + 分类筛选（全部 / 分摊 / 影音娱乐 / 生活服务 / 住房账单）

### 🔔 智能提醒

- **定时推送** — 可配置提前天数（0 / 1 / 3 / 7 天）和时间
- **精准闹钟** — Android 系统级 `exact_alarm` 权限，保证准时提醒
- **每笔可控** — 每笔账单可单独开启/关闭提醒
- **应用恢复同步** — 回到前台自动重新调度提醒

### 📈 数据看板

- **月收支概览** — 当月结余、收入、支出总额
- **日历热力图** — 日历视图，绿色/红色圆点标记每日收支情况
- **分类统计** — 收入和支出分类饼图，含百分比进度条
- **近期记录** — 首页展示最近 5 笔交易和即将到期的 3 笔账单

### 👤 个人中心

- **头像 & 昵称** — 从手机相册选取头像，客户端压缩
- **权限管理** — 通知权限和闹钟权限状态一目了然
- **数据概览** — 显示本地交易数、账单数
- **离线提示** — 明确告知卸载会清除数据

### 🔒 隐私优先

- 零网络请求，完全离线可用
- 数据仅存于手机 `localStorage`
- 无需账号、无需注册、无需登录

---

## 📱 截图

> 待补充：首页、账单页、日历视图、统计图、提醒设置

---

## 🛠️ 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | React 19 |
| 构建工具 | Vite 8 |
| 跨平台桥接 | Capacitor 8 |
| 原生通知 | `@capacitor/local-notifications` |
| 图标 | Lucide React |
| 测试 | Vitest 3 |
| 输出 | Android APK |

---

## 🚀 开发

### 环境要求

- Node.js ≥ 18
- pnpm
- Android Studio（仅打 APK 时需要）

### 启动开发服务器

```bash
pnpm install
pnpm dev
```

浏览器访问 `http://localhost:5173`，即可在浏览器中预览（提醒功能使用 Web Notifications）。

### 构建 Android APK

```bash
pnpm build              # 构建前端
pnpm android:sync       # 同步到 Android 项目
cd android && ./gradlew assembleDebug    # 编译 APK
```

### 运行测试

```bash
pnpm test
```

---

## 📦 安装

前往 [Releases 页面](https://github.com/xiaoyvko/zhangqi/releases) 下载最新 APK，然后在手机上打开安装即可。

> ⚠️ 更新时不要卸载旧版，直接安装新版覆盖即可保留数据。

---

## 📂 项目结构

```
├── android/            # Capacitor Android 项目
├── app/                # Next.js 页面（globals.css、layout）
├── assets/             # 图标资源
├── public/             # 静态资源、manifest、Service Worker
├── scripts/            # 构建 & Android 打包脚本
├── src/
│   ├── components/     # UI 组件
│   ├── domain/         # 核心业务逻辑（账单、收支、提醒、存储）
│   ├── hooks/          # React Hook
│   ├── lib/            # 工具函数（头像压缩等）
│   ├── native/         # Capacitor 原生接口封装
│   └── pages/          # 页面（首页、账单、账本、我的）
└── release/            # 打包好的 APK
```

---

## 📄 许可

MIT License
