import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("reproducible Android build configuration", () => {
  it("keeps every Capacitor runtime dependency on major version 8", () => {
    const runtimeDependencies = JSON.parse(read("package.json")).dependencies;

    for (const packageName of [
      "@capacitor/android",
      "@capacitor/app",
      "@capacitor/core",
      "@capacitor/local-notifications",
    ]) {
      expect(runtimeDependencies[packageName], packageName).toMatch(/^(?:\^|~)?8\./);
    }
  });

  it("declares exact alarm access for minute-accurate reminders", () => {
    expect(read("android/app/src/main/AndroidManifest.xml"))
      .toContain('<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />');
  });

  it("pins the current Microsoft JDK and Android SDK package revisions", () => {
    const setup = read("scripts/setup-android.ps1");

    expect(setup).toContain('$jdkVersion = "21.0.12"');
    expect(setup).toContain("https://download.visualstudio.microsoft.com/download/pr/c7d3e465-726d-4ec3-9e1f-718ae2804011/fdc5aa7c002a1217f76b45cb50b6bc1c/microsoft-jdk-21.0.12-windows-x64.zip");
    expect(setup).toContain('$jdkSha256 = "bf27a5d6298c736af8daf5b8c883098e83291446e5766118d8a5ea6a2617195d"');
    expect(setup).toContain('"platform-tools" = "37.0.0"');
    expect(setup).toContain('"platforms;android-36" = "2"');
    expect(setup).toContain('"build-tools;36.0.0" = "36.0.0"');
  });

  it("pins the official Gradle 8.14.3 all-distribution checksum", () => {
    expect(read("android/gradle/wrapper/gradle-wrapper.properties"))
      .toContain("distributionSha256Sum=ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c");
  });

  it("documents both Native reminder permissions and the no-schedule fallback", () => {
    const readme = read("README.md");

    expect(readme).toContain("通知权限");
    expect(readme).toContain("“闹钟和提醒”权限");
    expect(readme).toContain("账目仍会保存");
    expect(readme).toContain("不会安排提醒");
  });
});
