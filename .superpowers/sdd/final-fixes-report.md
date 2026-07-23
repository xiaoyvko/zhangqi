# 账期安卓 APK 最终修复报告

日期：2026-07-24

起始提交：`2b2b845b8b14d6502f6f6a7e2282561c785b8552`

实现提交：`da7fa3237a5a5a4fa4363266fe18e1284c6368d0`

## 结论

最终审查中的 4 项 Important 和 3 项 Minor 均已修复并提交。Web 通知路径保持平台隔离；提醒默认值仍为提前 3 天 09:00，可选提前天数仍为 0、1、3、7；全部 Capacitor 运行时依赖保持主版本 8。

自动测试、Web 构建、Capacitor Android 同步、固定工具链校验、签名 release 构建、APK 权限检查、固定证书验签、秘密隔离审计和 `git diff --check` 均通过。真机安装、离线持久化、实际通知投递和覆盖安装仍是明确的待验收项，未表述为已通过。

## 修复映射

### I-1：前台恢复校准与权限刷新

- 安装并同步 `@capacitor/app@8.0.0`。
- 使用 Capacitor v8 `App.addListener("appStateChange", ...)` 监听 Native 前台恢复。
- 前台恢复时通过同一串行队列重新检查通知展示权限、精确闹钟设置并重排未来通知。
- 监听器清理同时覆盖正常卸载与“注册 Promise 尚未完成就卸载”的竞态，迟到的 handle 会立即 `remove()`。
- `src/native/appLifecycle.test.js` 覆盖 active/inactive 分支及两种清理时序。

### I-2：同步串行化与无孤儿事务

- `queueBillReminderSync` 使用 Promise tail 串行化全部 Native 同步；前次 reject 会被 tail 吸收，仅向本次调用者保留 reject，后续同步继续执行。
- 每轮严格执行“取消已托管 ID → 立即持久化空集合 → 检查能力 → 调度 → 调度成功后写入新 ID”。
- 若 `schedule()` 或新 ID 持久化失败，立即以本轮确定性 ID 做补偿取消并继续上抛错误。
- 确定性并发测试用门闩控制首轮 `schedule()`，证明第二轮在首轮完成前不会开始，最终 pending 集合和托管 ID 只包含后发状态。
- 拒绝恢复测试模拟首轮已部分加入 pending 后抛错，证明补偿取消完成且第二轮仍可执行。

### I-3：独立失败状态、明确提示与重试

- `reminderSyncError` 与账单/存储状态独立；账单保存结果不受提醒失败影响。
- 同步失败时显示可点击的全局提示，提醒设置面板内显示错误与“重试同步”按钮。
- 后续任一成功同步会清除错误。
- `reminderSyncState.test.js` 覆盖失败保留与成功清错；`ReminderSettingsModal.test.jsx` 覆盖错误文案和重试入口。

### I-4：按用户所选分钟精确执行

- 按已安装 `@capacitor/local-notifications@8.2.1` 的实际 v8 类型使用：
  - `checkExactNotificationSetting()`，读取 `exact_alarm`
  - `changeExactNotificationSetting()`，前往系统设置
- `AndroidManifest.xml` 声明 `android.permission.SCHEDULE_EXACT_ALARM`。
- 未取得精确闹钟能力时不降级安排近似 alarm，避免界面承诺与实际行为不符；账目仍正常保存。
- 提醒设置页明确显示精确提醒状态、原因及“前往系统设置”入口。
- 从设置返回前台后由 I-1 流程重检并重排。
- `aapt2 dump permissions` 已确认最终 APK 合并权限含 `SCHEDULE_EXACT_ALARM`。
- 实际 Android 12+ / Android 14 设备上的系统页跳转、授权变化、重启/恢复和分钟级投递仍列为真机待验收。

### M-1：取消后立即清托管 ID

- 旧通知取消成功后立即把 `zhangqi-native-reminder-ids` 写为 `[]`。
- 即使展示权限未授权或精确闹钟设置未授权，也不会保留已取消的陈旧 ID。
- 适配器测试覆盖 permission 为 `prompt` 时取消成功并清空存储。

### M-2：Native 状态与 APK/PWA 文案

- Profile 的 Native 通知卡使用 `reminderPermission`，Web 继续使用浏览器 `notificationState`。
- Native 显示“本机 APK”，Web 保留“本机 PWA”。
- Native 数据警告为“卸载应用或清除应用数据可能删除账目”；Web 保留浏览器数据文案。
- `profilePlatform.test.js` 覆盖 Native 与 Web 两套决策。

### M-3：固定工具链来源、版本与摘要

- Microsoft JDK 固定为当前实际使用的 `21.0.12`：
  - 官方版本化下载最终地址：`https://download.visualstudio.microsoft.com/download/pr/c7d3e465-726d-4ec3-9e1f-718ae2804011/fdc5aa7c002a1217f76b45cb50b6bc1c/microsoft-jdk-21.0.12-windows-x64.zip`
  - 提交内 SHA-256：`bf27a5d6298c736af8daf5b8c883098e83291446e5766118d8a5ea6a2617195d`
  - 同时验证归档摘要、`release` 元数据中的 Microsoft implementor/精确版本，以及 Java runtime vendor/精确版本。
- Android 官方 `sdkmanager --list_installed` 元数据固定并验证：
  - `platform-tools`：`37.0.0`
  - `platforms;android-36`：revision `2`
  - `build-tools;36.0.0`：`36.0.0`
- Gradle Wrapper `8.14.3-all` 增加官方 `distributionSha256Sum`：
  - `ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c`
- 来源核对：
  - Microsoft Build of OpenJDK 官方下载说明：`https://learn.microsoft.com/java/openjdk/download`
  - Microsoft 官方版本 URL 规则：`https://learn.microsoft.com/java/openjdk/download-major-urls`
  - Android 官方命令行工具与 `sdkmanager` 元数据：`https://developer.android.com/tools`
  - Gradle 官方摘要表：`https://gradle.org/release-checksums/`
- `scripts/androidBuildConfig.test.js` 静态锁定 Capacitor 主版本、exact alarm Manifest、JDK/SDK revisions 与 Gradle 摘要。

## TDD 与验证记录

| 命令/阶段 | 结果 |
| --- | --- |
| 新增测试后的首次 `pnpm test -- ...` | 按预期失败：缺少 exact API wrapper、队列、生命周期模块、错误 reducer、平台文案模块，且 permission 拒绝时旧 ID 未清；证明测试先于修复。 |
| 定向 Native/UI 测试 | 通过；适配器、生命周期、错误状态、Modal 和平台文案均转绿。 |
| `pnpm test` | 通过：10 个测试文件、41 项测试。 |
| `pnpm run build` | 通过：Vite 8.1.5，1594 个模块，生成 `dist/client`。 |
| `pnpm run android:sync` | 通过；识别 `@capacitor/app@8.0.0` 与 `@capacitor/local-notifications@8.2.1` 两个 Android 插件。 |
| `scripts/build-android.ps1` | 通过；固定 JDK/SDK 校验、当时的 40 项测试、Android 同步、Gradle clean assembleRelease、固定证书验签和 release 复制全部成功。Gradle：210 个 actionable tasks，193 executed、17 up-to-date。随后增加的 Capacitor 主版本静态契约测试已由最终 `pnpm test` 覆盖，总数为 41。 |
| `aapt2 dump permissions release/账期-1.0.0.apk` | 通过；包名正确且包含 `android.permission.SCHEDULE_EXACT_ALARM`、`POST_NOTIFICATIONS`、`RECEIVE_BOOT_COMPLETED`、`WAKE_LOCK`。 |
| `aapt2 dump badging` 与 APK entry 检查 | 通过；`com.zhangqi.billreminder`、versionCode `1`、versionName `1.0.0`、compile/target SDK `36`、应用名“账期”，且 `assets/public/index.html` 存在。 |
| `apksigner verify --verbose --print-certs` | 通过；1 个 signer，v2 有效，固定证书 SHA-256 匹配 `android/release-certificate.sha256`。 |
| 秘密审计 | 通过；签名密钥、`keystore.properties` 和 release APK 均未跟踪且被忽略；已跟踪文件未发现 private-key 或字面量签名密码模式。没有读取或输出签名密码。 |
| `git diff --check` | 通过；仅有 Windows 行尾提示，无 whitespace error。 |

## 新 APK

- 路径：`D:\AIxiangmu\1\release\账期-1.0.0.apk`
- 大小：`3,230,060` 字节
- SHA-256：`29D79E34DA213B2C15DF08D97BA4EDB09E8A9503A5CA570FF32B86CC376865F4`
- 签名：一个 signer，APK Signature Scheme v2 验证通过
- 固定证书 SHA-256：`387ec2aeeb5bbb3d86aed9d1dbe8443498d3d2753bb27ae2f6e12da1fe1165af`
- Git 状态：APK 位于已忽略的 `release/*.apk`，未提交

## 真机待验收

以下项目仍未验证，不得声称通过：

1. 从聊天工具或文件管理器安装 APK，并从桌面图标启动。
2. 飞行模式下新增收入、支出、固定账单和头像，关闭并重开后确认数据持久化。
3. 覆盖 Android 通知展示权限允许/拒绝、精确闹钟系统设置、选定分钟及实际通知到达；重点验证 Android 12+ 与 Android 14。
4. 使用同一固定签名覆盖安装，确认账目、头像和提醒设置保留。

## 顾虑与后续注意

- 为坚持“按所选分钟准确执行”，精确闹钟能力未授权时会明确暂停 Native 调度，而不是悄悄退化为近似时间；用户必须通过面板进入系统设置授权。
- 完整构建期间 Android 官方 SDK 工具出现远程 manifest 获取警告，但本机已安装包的官方 metadata revision 和内容检查通过，随后 release 构建成功。当前脚本对 revisions 采取 fail-closed：未来官方仓库只提供不同 revision 时会拒绝继续，需要在审计新版本后更新固定值。
- Gradle/Capacitor 构建有既存的 deprecated/flatDir 警告，不影响本次 Gradle 8.14.3 release 成功；升级到 Gradle 9 前需另行处理。
- APK 的结构、身份、签名、权限和内嵌资源已静态验证；真实安装、离线数据、实际通知投递和覆盖升级只能由上述真机验收确认。
