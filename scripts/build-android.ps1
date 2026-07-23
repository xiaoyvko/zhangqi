[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$setupScript = Join-Path $PSScriptRoot "setup-android.ps1"
$androidRoot = Join-Path $repoRoot "android"
$gradleWrapper = Join-Path $androidRoot "gradlew.bat"
$keystoreProperties = Join-Path $androidRoot "keystore.properties"
$gradleUserHome = Join-Path $repoRoot ".gradle-home"
$unsignedApk = Join-Path $androidRoot "app\build\outputs\apk\release\app-release.apk"
$apksigner = Join-Path $repoRoot ".android-toolchain\sdk\build-tools\36.0.0\apksigner.bat"
$releaseRoot = Join-Path $repoRoot "release"
$releaseFileName = ([char]0x8D26).ToString() + [char]0x671F + "-1.0.0.apk"
$releaseApk = Join-Path $releaseRoot $releaseFileName

function Invoke-CheckedNative {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Executable,

        [Parameter()]
        [string[]]$Arguments = @()
    )

    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $Executable"
    }
}

& $setupScript

if (-not (Test-Path -LiteralPath $keystoreProperties)) {
    throw "Missing ignored Android signing configuration: android/keystore.properties"
}

Push-Location $repoRoot
try {
    Invoke-CheckedNative -Executable "pnpm" -Arguments @("test")
    Invoke-CheckedNative -Executable "pnpm" -Arguments @("run", "android:sync")
}
finally {
    Pop-Location
}

$env:GRADLE_USER_HOME = $gradleUserHome
New-Item -ItemType Directory -Path $gradleUserHome -Force | Out-Null

Push-Location $androidRoot
try {
    $gradleBuildSucceeded = $false
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        & $gradleWrapper clean assembleRelease
        if ($LASTEXITCODE -eq 0) {
            $gradleBuildSucceeded = $true
            break
        }

        if ($attempt -lt 5) {
            Write-Warning "Gradle release build attempt $attempt failed; retrying."
            Start-Sleep -Seconds 2
        }
    }
    if (-not $gradleBuildSucceeded) {
        throw "Gradle release build failed after 5 attempts."
    }
}
finally {
    Pop-Location
}

if (-not (Test-Path -LiteralPath $unsignedApk)) {
    throw "Gradle completed without producing the expected release APK."
}
if (-not (Test-Path -LiteralPath $apksigner)) {
    throw "apksigner.bat was not found in Android build-tools 36.0.0."
}

Invoke-CheckedNative -Executable $apksigner -Arguments @(
    "verify",
    "--verbose",
    "--print-certs",
    $unsignedApk
)

New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
Copy-Item -LiteralPath $unsignedApk -Destination $releaseApk -Force

$releaseApkInfo = Get-Item -LiteralPath $releaseApk
$releaseApkSha256 = (Get-FileHash -LiteralPath $releaseApk -Algorithm SHA256).Hash
Write-Host "APK path: $($releaseApkInfo.FullName)"
Write-Host "APK size: $($releaseApkInfo.Length) bytes"
Write-Host "APK SHA-256: $releaseApkSha256"
