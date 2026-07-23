# 账期安卓离线 APK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有“账期”React 应用制作成可离线安装、可覆盖升级并支持安卓本地账单提醒的签名 release APK。

**Architecture:** 保留现有 Vite/React 界面与本地数据模型，使用 Capacitor 8 把 `dist/client` 嵌入安卓原生容器。提醒计算保持为可单元测试的纯函数，原生通知调用集中在独立适配器中；网页环境保持无副作用，安卓环境通过 Local Notifications 插件调度。

**Tech Stack:** React 19、Vite 8、Vitest 3、Capacitor 8、Capacitor Local Notifications、Android Gradle、JDK 17、Android SDK command-line tools。

## Global Constraints

- 应用显示名称必须为 `账期`，Android 包名必须为 `com.zhangqi.billreminder`。
- 第一版版本名为 `1.0.0`，versionCode 为 `1`，最低 Android API 为 `26`。
- APK 必须离线启动，不把线上网址作为运行入口。
- 默认提醒为开启、提前 3 天、上午 `09:00`。
- 可选提前天数只能是 `0`、`1`、`3`、`7` 天。
- 账号登录、云同步、好友流水共享、应用商店发布、自动更新和网页版数据迁移不在本计划范围内。
- 发布密钥、密码、签名配置和 APK 二进制不得提交到 Git 或上传至公开 Sites 仓库。
- 所有现有 Web 测试必须继续通过，现有网页版构建和访问不得被破坏。

---

## File Structure

- `src/domain/reminders.js`：提醒默认值、设置规范化、通知时间和通知 ID 计算。
- `src/domain/reminders.test.js`：提醒纯函数测试。
- `src/native/localNotifications.js`：Capacitor 平台检测、权限、通知频道、取消与重新调度。
- `src/native/localNotifications.test.js`：使用注入式插件替身测试原生调度编排。
- `src/components/ReminderSettingsModal.jsx`：全局提醒开关、提前天数、时间和权限状态界面。
- `src/components/BillModal.jsx`：增加单账单提醒开关。
- `src/pages/ProfilePage.jsx`：把“提醒偏好”入口连接到提醒设置。
- `src/hooks/useFinanceData.js`：持久化提醒设置，并使旧账单默认启用提醒。
- `src/domain/storage.js`：默认提醒设置和旧数据兼容。
- `src/App.jsx`：原生通知状态、提醒设置弹层和账单变化后的通知同步。
- `capacitor.config.json`：Capacitor 应用身份和 `webDir`。
- `android/`：由 Capacitor 生成的安卓工程，提交可复现的工程文件。
- `assets/icon-only.svg`：安卓应用图标源文件。
- `scripts/setup-android.ps1`：下载并配置最小化 JDK/Android SDK 工具链。
- `scripts/build-android.ps1`：构建 Web、同步 Capacitor、读取本地签名配置并生成 APK。
- `.gitignore`：排除工具链、签名文件、签名密码和 APK 输出。
- `.signing/`：本地发布密钥与保管说明，不提交。
- `release/账期-1.0.0.apk`：最终交付文件，不提交。

---

### Task 1: 提醒领域模型与数据兼容

**Files:**
- Create: `src/domain/reminders.js`
- Create: `src/domain/reminders.test.js`
- Modify: `src/domain/storage.js`
- Modify: `src/domain/storage.test.js`
- Modify: `src/hooks/useFinanceData.js`

**Interfaces:**
- Produces: `DEFAULT_REMINDER_SETTINGS`
- Produces: `normalizeReminderSettings(value)`
- Produces: `reminderNotificationId(billId)`
- Produces: `reminderDate(bill, settings)`
- Produces: `buildReminderNotifications(bills, settings, now)`
- Produces: `updateReminderSettings(patch): boolean` on `useFinanceData`

- [ ] **Step 1: Write failing reminder tests**

```js
import { describe, expect, it } from "vitest";
import {
  DEFAULT_REMINDER_SETTINGS,
  buildReminderNotifications,
  normalizeReminderSettings,
  reminderDate,
  reminderNotificationId,
} from "./reminders.js";

describe("bill reminders", () => {
  it("normalizes missing and invalid settings", () => {
    expect(normalizeReminderSettings()).toEqual(DEFAULT_REMINDER_SETTINGS);
    expect(normalizeReminderSettings({ enabled: false, daysBefore: 9, time: "26:00" }))
      .toEqual({ enabled: false, daysBefore: 3, time: "09:00" });
  });

  it.each([0, 1, 3, 7])("calculates %s days before the due date", (daysBefore) => {
    expect(reminderDate(
      { id: "rent", nextDate: "2026-08-10" },
      { enabled: true, daysBefore, time: "09:30" },
    ).toISOString()).toBe(
      new Date(2026, 7, 10 - daysBefore, 9, 30, 0, 0).toISOString(),
    );
  });

  it("skips disabled and elapsed reminders", () => {
    const now = new Date(2026, 7, 8, 12);
    const bills = [
      { id: "past", name: "过去", amount: 1, nextDate: "2026-08-08", reminderEnabled: true },
      { id: "off", name: "关闭", amount: 2, nextDate: "2026-08-20", reminderEnabled: false },
    ];
    expect(buildReminderNotifications(
      bills,
      { enabled: true, daysBefore: 0, time: "09:00" },
      now,
    )).toEqual([]);
  });

  it("creates stable distinct integer notification ids", () => {
    const first = reminderNotificationId("bill-a");
    expect(first).toBe(reminderNotificationId("bill-a"));
    expect(first).not.toBe(reminderNotificationId("bill-b"));
    expect(Number.isInteger(first)).toBe(true);
    expect(first).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```powershell
pnpm vitest run src/domain/reminders.test.js
```

Expected: FAIL because `src/domain/reminders.js` does not exist.

- [ ] **Step 3: Implement the reminder pure functions**

```js
export const REMINDER_DAY_OPTIONS = [0, 1, 3, 7];
export const DEFAULT_REMINDER_SETTINGS = {
  enabled: true,
  daysBefore: 3,
  time: "09:00",
};

export function normalizeReminderSettings(value = {}) {
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : true,
    daysBefore: REMINDER_DAY_OPTIONS.includes(Number(value.daysBefore))
      ? Number(value.daysBefore)
      : 3,
    time: /^\d{2}:\d{2}$/.test(value.time || "") &&
      Number(value.time.slice(0, 2)) < 24 &&
      Number(value.time.slice(3, 5)) < 60
      ? value.time
      : "09:00",
  };
}

export function reminderNotificationId(billId) {
  let hash = 2166136261;
  for (const character of String(billId)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return 100000 + ((hash >>> 0) % 2000000000);
}

export function reminderDate(bill, settings) {
  const [year, month, day] = bill.nextDate.split("-").map(Number);
  const [hour, minute] = settings.time.split(":").map(Number);
  return new Date(year, month - 1, day - settings.daysBefore, hour, minute, 0, 0);
}

export function buildReminderNotifications(bills, settingsInput, now = new Date()) {
  const settings = normalizeReminderSettings(settingsInput);
  if (!settings.enabled) return [];
  return bills
    .filter((bill) => bill.reminderEnabled !== false)
    .map((bill) => ({ bill, at: reminderDate(bill, settings) }))
    .filter(({ at }) => at.getTime() > now.getTime())
    .map(({ bill, at }) => ({
      id: reminderNotificationId(bill.id),
      title: `${bill.name}即将扣款`,
      body: `¥${Number(bill.amount).toFixed(2)}，到期日 ${bill.nextDate}`,
      schedule: { at },
      channelId: "bill-reminders",
      extra: { billId: bill.id },
    }));
}
```

- [ ] **Step 4: Add reminder defaults to persisted finance data**

Update `loadFinanceData()` so it returns:

```js
{
  profile: { ...DEFAULT_PROFILE, ...profile },
  transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
  bills: Array.isArray(parsed.bills)
    ? parsed.bills.map((bill) => ({
        ...bill,
        reminderEnabled: bill.reminderEnabled !== false,
      }))
    : null,
  reminderSettings: normalizeReminderSettings(parsed.reminderSettings),
}
```

Update `defaultFinanceData()` to include:

```js
reminderSettings: { ...DEFAULT_REMINDER_SETTINGS },
```

Expose from `useFinanceData()`:

```js
updateReminderSettings: (patch) => commit((current) => ({
  ...current,
  reminderSettings: normalizeReminderSettings({
    ...current.reminderSettings,
    ...patch,
  }),
})),
```

- [ ] **Step 5: Extend storage tests and run all unit tests**

Add assertions that an old version-2 payload without reminder fields loads defaults and sets `reminderEnabled: true` on each legacy bill.

Run:

```powershell
pnpm test
```

Expected: all existing tests plus reminder tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/domain/reminders.js src/domain/reminders.test.js src/domain/storage.js src/domain/storage.test.js src/hooks/useFinanceData.js
git commit -m "feat: add bill reminder domain model"
```

---

### Task 2: 原生本地通知适配器

**Files:**
- Create: `src/native/localNotifications.js`
- Create: `src/native/localNotifications.test.js`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `buildReminderNotifications(bills, settings, now)`
- Produces: `checkReminderPermission(plugin)`
- Produces: `requestReminderPermission(plugin)`
- Produces: `syncBillReminders({ bills, settings, plugin, storage, now })`

- [ ] **Step 1: Install matching Capacitor dependencies**

Run:

```powershell
pnpm add @capacitor/core@^8 @capacitor/android@^8 @capacitor/local-notifications@^8
pnpm add -D @capacitor/cli@^8 @capacitor/assets@^3
```

Expected: package manifest and lockfile contain matching major version 8 packages.

- [ ] **Step 2: Write failing adapter tests**

Use a fake plugin that records `createChannel`, `cancel`, `schedule`, `checkPermissions`, and `requestPermissions`. Cover:

```js
it("cancels previously managed ids before scheduling future reminders", async () => {
  const calls = [];
  const plugin = fakeNotifications(calls, "granted");
  const storage = memoryStorage({
    "zhangqi-native-reminder-ids": JSON.stringify([101, 102]),
  });
  await syncBillReminders({
    bills: [{ id: "rent", name: "房租", amount: 4800, nextDate: "2026-08-10" }],
    settings: { enabled: true, daysBefore: 3, time: "09:00" },
    plugin,
    storage,
    now: new Date(2026, 7, 1),
  });
  expect(calls[0]).toEqual(["cancel", [101, 102]]);
  expect(calls.some(([name]) => name === "schedule")).toBe(true);
});

it("does not request permission during background synchronization", async () => {
  const calls = [];
  await syncBillReminders({
    bills: [],
    settings: DEFAULT_REMINDER_SETTINGS,
    plugin: fakeNotifications(calls, "prompt"),
    storage: memoryStorage(),
  });
  expect(calls.some(([name]) => name === "requestPermissions")).toBe(false);
});
```

- [ ] **Step 3: Run the adapter test and verify it fails**

Run:

```powershell
pnpm vitest run src/native/localNotifications.test.js
```

Expected: FAIL because the adapter does not exist.

- [ ] **Step 4: Implement the adapter with dependency injection**

The adapter must:

1. Return `"web"` without plugin calls when `Capacitor.isNativePlatform()` is false.
2. Create Android channel `bill-reminders` with importance `4`.
3. Read managed IDs from `zhangqi-native-reminder-ids`.
4. Cancel those IDs before rescheduling.
5. Check permission but never request it during automatic sync.
6. Schedule only when permission is `granted`.
7. Store the newly scheduled IDs after success.
8. Let UI-triggered `requestReminderPermission()` call `requestPermissions()`.

Core call shape:

```js
await plugin.createChannel({
  id: "bill-reminders",
  name: "账单提醒",
  description: "固定账单到期提醒",
  importance: 4,
});
await plugin.cancel({ notifications: oldIds.map((id) => ({ id })) });
await plugin.schedule({ notifications });
```

- [ ] **Step 5: Run adapter and full tests**

Run:

```powershell
pnpm vitest run src/native/localNotifications.test.js
pnpm test
```

Expected: PASS with zero failed tests.

- [ ] **Step 6: Commit**

```powershell
git add package.json pnpm-lock.yaml src/native
git commit -m "feat: add native reminder scheduling"
```

---

### Task 3: 提醒设置与单账单开关界面

**Files:**
- Create: `src/components/ReminderSettingsModal.jsx`
- Modify: `src/components/BillModal.jsx`
- Modify: `src/pages/ProfilePage.jsx`
- Modify: `src/App.jsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `finance.reminderSettings`, `updateReminderSettings(patch)`
- Consumes: `checkReminderPermission()`, `requestReminderPermission()`
- Produces: bill form field `reminderEnabled: boolean`

- [ ] **Step 1: Add the bill-level reminder switch**

Initialize new bills with:

```js
reminderEnabled: true,
```

Add to `BillModal`:

```jsx
<label className="share-toggle">
  <div>
    <strong>到期提醒</strong>
    <span>按照“我的”页面中的提醒偏好通知</span>
  </div>
  <input
    type="checkbox"
    checked={form.reminderEnabled !== false}
    onChange={(event) => update("reminderEnabled", event.target.checked)}
  />
</label>
```

- [ ] **Step 2: Build `ReminderSettingsModal`**

The modal props are:

```js
{
  settings,
  permission,
  onSave,
  onRequestPermission,
  onClose,
}
```

The form includes:

- global enabled checkbox;
- four buttons for `0`, `1`, `3`, `7` days;
- `<input type="time">`;
- permission status text;
- save and cancel buttons.

When enabling reminders, call `onRequestPermission()` from the user click before saving. If permission is denied, preserve the chosen preferences but show “系统通知未开启，账目仍会正常保存”。

- [ ] **Step 3: Connect the profile entry**

Change “提醒偏好” from a decorative button to:

```jsx
<button onClick={onOpenReminderSettings}>
  <span className="setting-icon"><Bell size={18} /></span>
  <div>
    <strong>提醒偏好</strong>
    <p>
      {reminderSettings.enabled
        ? `提前 ${reminderSettings.daysBefore} 天 · ${reminderSettings.time}`
        : "已关闭"}
    </p>
  </div>
  <span>›</span>
</button>
```

- [ ] **Step 4: Connect App-level state and synchronization**

In `App.jsx`:

- keep modal kind `reminders`;
- check native permission on startup;
- invoke `syncBillReminders` when bills or reminder settings change;
- request permission only from the settings modal;
- display a toast after preferences save;
- preserve the existing browser notification behavior for the deployed PWA.

Use a cancellation flag in the effect so resolved promises do not update unmounted state.

- [ ] **Step 5: Add mobile styles**

Add styles for:

- `.reminder-settings-sheet`
- `.reminder-day-options`
- `.permission-status`
- disabled controls when the global switch is off

At `390px` width the modal must not overflow horizontally and the save button must remain above the safe-area inset.

- [ ] **Step 6: Run Web regression checks**

Run:

```powershell
pnpm test
pnpm run build
```

Expected: tests PASS and Vite build exits `0`.

- [ ] **Step 7: Commit**

```powershell
git add src/components/ReminderSettingsModal.jsx src/components/BillModal.jsx src/pages/ProfilePage.jsx src/App.jsx app/globals.css
git commit -m "feat: add customizable reminder settings"
```

---

### Task 4: Capacitor 安卓工程与离线资源

**Files:**
- Create: `capacitor.config.json`
- Create: `assets/icon-only.svg`
- Create: `android/` using Capacitor
- Modify: `src/App.jsx`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: Vite output directory `dist/client`
- Produces: Android Gradle project with package `com.zhangqi.billreminder`

- [ ] **Step 1: Add Capacitor configuration**

Create:

```json
{
  "appId": "com.zhangqi.billreminder",
  "appName": "账期",
  "webDir": "dist/client",
  "bundledWebRuntime": false,
  "android": {
    "allowMixedContent": false
  }
}
```

- [ ] **Step 2: Add Android scripts**

Add:

```json
{
  "android:add": "cap add android",
  "android:sync": "pnpm run build && cap sync android",
  "android:assets": "capacitor-assets generate --android"
}
```

- [ ] **Step 3: Generate the Android project**

Run:

```powershell
pnpm exec cap add android
pnpm run android:sync
```

Expected: `android/app/src/main/assets/public/index.html` exists and contains no remote application URL.

- [ ] **Step 4: Configure Android identity and compatibility**

Verify or set:

```gradle
defaultConfig {
    applicationId "com.zhangqi.billreminder"
    minSdkVersion 26
    versionCode 1
    versionName "1.0.0"
}
```

Set `android/app/src/main/res/values/strings.xml` app name to `账期`.

- [ ] **Step 5: Generate app icons**

Copy the existing logo geometry into `assets/icon-only.svg`, then run:

```powershell
pnpm run android:assets
```

Expected: launcher icons exist under `android/app/src/main/res/mipmap-*`.

- [ ] **Step 6: Guard browser-only APIs**

Use `Capacitor.isNativePlatform()` so the APK does not register the PWA service worker or call the browser `Notification` constructor. Browser deployment must keep its current service worker and notification path.

- [ ] **Step 7: Add private paths to `.gitignore`**

Append:

```gitignore
.android-toolchain/
.gradle-home/
.signing/
release/*.apk
android/local.properties
android/keystore.properties
```

- [ ] **Step 8: Build and commit the reproducible Android project**

Run:

```powershell
pnpm run android:sync
git add capacitor.config.json assets android package.json pnpm-lock.yaml src/App.jsx .gitignore
git commit -m "feat: add offline Android application shell"
```

Do not add ignored signing, SDK or APK files.

---

### Task 5: 最小安卓工具链与发布签名

**Files:**
- Create: `scripts/setup-android.ps1`
- Create: `scripts/build-android.ps1`
- Create locally and ignore: `.signing/zhangqi-release.jks`
- Create locally and ignore: `.signing/credentials.txt`
- Create locally and ignore: `android/keystore.properties`

**Interfaces:**
- Produces: `$env:JAVA_HOME` pointing to portable Microsoft OpenJDK 17
- Produces: `$env:ANDROID_HOME` pointing to `.android-toolchain/sdk`
- Produces: signed `android/app/build/outputs/apk/release/app-release.apk`

- [ ] **Step 1: Implement the portable toolchain setup script**

The script must:

1. Download `https://aka.ms/download-jdk/microsoft-jdk-17-windows-x64.zip`.
2. Download `https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip`.
3. Verify the Android tools SHA-256 equals `90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a`.
4. Extract JDK under `.android-toolchain/jdk`.
5. Extract command-line tools under `.android-toolchain/sdk/cmdline-tools/latest`.
6. Set task-local `JAVA_HOME`, `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and prepend tool paths.
7. Pipe `y` responses into `sdkmanager.bat --licenses`.
8. Install `platform-tools`, `platforms;android-36`, and `build-tools;36.0.0`.
9. Write `android/local.properties` with an escaped SDK path.

The script must use explicit paths rooted at `$PSScriptRoot\..` and must not modify global system environment variables.

- [ ] **Step 2: Generate the release signing key once**

Create the directory, generate a cryptographically random password locally, create the key, and write a local recovery note:

```powershell
$repoRoot = (Resolve-Path ".").Path
$signingDir = Join-Path $repoRoot ".signing"
New-Item -ItemType Directory -Path $signingDir -Force | Out-Null
$passwordBytes = [byte[]]::new(24)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($passwordBytes)
$signingPassword = [Convert]::ToBase64String($passwordBytes).Replace("+","A").Replace("/","B").TrimEnd("=")

& (Join-Path $env:JAVA_HOME "bin\keytool.exe") -genkeypair `
  -keystore .signing/zhangqi-release.jks `
  -alias zhangqi `
  -keyalg RSA `
  -keysize 4096 `
  -validity 10000 `
  -storepass $signingPassword `
  -keypass $signingPassword `
  -dname "CN=Zhangqi, OU=Personal, O=Zhangqi, L=Shanghai, ST=Shanghai, C=CN"

@"
账期 Android 发布签名
别名: zhangqi
密码: $signingPassword
密钥文件: zhangqi-release.jks
重要: 后续覆盖更新必须使用这份密钥和密码。
"@ | Set-Content -LiteralPath ".signing/credentials.txt" -Encoding UTF8
```

Verify `.signing/` is ignored before continuing.

- [ ] **Step 3: Configure Gradle signing without committing secrets**

In the same PowerShell session, create `android/keystore.properties` with the generated password:

```powershell
@"
storeFile=../../.signing/zhangqi-release.jks
storePassword=$signingPassword
keyAlias=zhangqi
keyPassword=$signingPassword
"@ | Set-Content -LiteralPath "android/keystore.properties" -Encoding ASCII
```

Modify `android/app/build.gradle` to load `keystore.properties` only when it exists and apply it to the `release` signing configuration. The literal password must never appear in `build.gradle`.

- [ ] **Step 4: Implement the release build script**

`scripts/build-android.ps1` must:

1. invoke `scripts/setup-android.ps1`;
2. run `pnpm test`;
3. run `pnpm run android:sync`;
4. run `android\gradlew.bat clean assembleRelease` with `GRADLE_USER_HOME=.gradle-home`;
5. verify the APK using `apksigner.bat verify --verbose --print-certs`;
6. copy the verified APK to `release/账期-1.0.0.apk`;
7. print the APK path, byte size and SHA-256.

- [ ] **Step 5: Run the signed build**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1
```

Expected:

- Gradle exits `0`;
- `release/账期-1.0.0.apk` exists;
- `apksigner` reports verification success;
- the APK SHA-256 is printed.

- [ ] **Step 6: Commit scripts and non-secret Gradle configuration**

Before commit, run:

```powershell
git check-ignore .signing/zhangqi-release.jks android/keystore.properties release/账期-1.0.0.apk
git status --short
```

Expected: all three private artifacts are ignored and absent from staged files.

Then:

```powershell
git add scripts/setup-android.ps1 scripts/build-android.ps1 android/app/build.gradle .gitignore
git commit -m "build: add signed Android release pipeline"
```

---

### Task 6: 最终验收与交付

**Files:**
- Verify: `release/账期-1.0.0.apk`
- Modify: `README.md`

**Interfaces:**
- Produces: installable, signed, offline APK and its SHA-256

- [ ] **Step 1: Run fresh unit and Web build verification**

Run:

```powershell
pnpm test
pnpm run build
git diff --check
```

Expected: zero failed tests, Vite build exit `0`, and no whitespace errors.

- [ ] **Step 2: Inspect APK identity**

Run:

```powershell
aapt2.exe dump badging "release/账期-1.0.0.apk"
apksigner.bat verify --verbose --print-certs "release/账期-1.0.0.apk"
```

Expected:

- package is `com.zhangqi.billreminder`;
- versionCode is `1`;
- versionName is `1.0.0`;
- minimum SDK is `26`;
- APK signature verifies.

- [ ] **Step 3: Install to an available device or emulator when present**

Run:

```powershell
adb devices
adb install -r "release/账期-1.0.0.apk"
```

If no device is connected, report that physical installation and notification delivery require the user’s Android phone; APK structural, signature and Web behavior verification still continue.

- [ ] **Step 4: Perform the Android acceptance checklist**

On a connected phone:

1. enable airplane mode and launch `账期`;
2. add one ¥28 expense and one ¥5000 income;
3. add a fixed bill with reminders enabled;
4. close and reopen the app and confirm all three records remain;
5. choose a photo from the gallery and confirm the avatar remains after restart;
6. change reminder lead time and notification time;
7. grant notification permission;
8. create a near-term test reminder and confirm Android displays it;
9. install the same signed build using `adb install -r` and confirm data remains.

- [ ] **Step 5: Add concise installation and update instructions**

Document:

- send `账期-1.0.0.apk` to the phone;
- allow installation from the chosen file manager or browser;
- tap the APK and install;
- grant notification permission when enabling reminders;
- future versions must be installed directly over the old version;
- never uninstall before updating if local data must be preserved.

- [ ] **Step 6: Final repository and secret audit**

Run:

```powershell
git status --short
git ls-files .signing android/keystore.properties release
git grep -n "storePassword\|keyPassword"
```

Expected:

- no signing key, password or APK is tracked;
- repository is clean except intentionally ignored local deliverables;
- no literal signing password appears in tracked files.
