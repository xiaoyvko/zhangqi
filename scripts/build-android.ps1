[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$commonScript = Join-Path $PSScriptRoot "android-build-common.ps1"
. $commonScript

$setupScript = Join-Path $PSScriptRoot "setup-android.ps1"
$androidRoot = Join-Path $repoRoot "android"
$gradleWrapper = Join-Path $androidRoot "gradlew.bat"
$keystoreProperties = Join-Path $androidRoot "keystore.properties"
$releaseKeystore = Join-Path $repoRoot ".signing\zhangqi-release.jks"
$expectedCertificate = Join-Path $androidRoot "release-certificate.sha256"
$gradleUserHome = Join-Path $repoRoot ".gradle-home"
$builtApk = Join-Path $androidRoot "app\build\outputs\apk\release\app-release.apk"
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

$localSigningPaths = @(
    @{
        Relative = "android/keystore.properties"
        Absolute = $keystoreProperties
    },
    @{
        Relative = ".signing/zhangqi-release.jks"
        Absolute = $releaseKeystore
    }
)
foreach ($localSigningPath in $localSigningPaths) {
    if (-not (Test-Path -LiteralPath $localSigningPath.Absolute -PathType Leaf)) {
        throw "Required local signing file is missing: $($localSigningPath.Relative)"
    }
    Assert-GitPathIgnoredAndUntracked `
        -RepoRoot $repoRoot `
        -RelativePath $localSigningPath.Relative
}
Write-Host "Signing files are present, ignored, and untracked."

& $setupScript

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

$gradleExitCode = 1
Push-Location $androidRoot
try {
    & $gradleWrapper clean assembleRelease
    $gradleExitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}
if ($gradleExitCode -ne 0) {
    Write-Error "Gradle release build failed with exit code $gradleExitCode." -ErrorAction Continue
    exit $gradleExitCode
}

if (-not (Test-Path -LiteralPath $builtApk -PathType Leaf)) {
    throw "Gradle completed without producing the expected release APK."
}
if (-not (Test-Path -LiteralPath $apksigner -PathType Leaf)) {
    throw "apksigner.bat was not found in Android build-tools 36.0.0."
}

Assert-ApkSignerCertificate `
    -ApkSigner $apksigner `
    -ApkPath $builtApk `
    -ExpectedDigestFile $expectedCertificate

New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
Copy-Item -LiteralPath $builtApk -Destination $releaseApk -Force

$releaseApkInfo = Get-Item -LiteralPath $releaseApk
$releaseApkSha256 = (Get-FileHash -LiteralPath $releaseApk -Algorithm SHA256).Hash
Write-Host "APK path: $($releaseApkInfo.FullName)"
Write-Host "APK size: $($releaseApkInfo.Length) bytes"
Write-Host "APK SHA-256: $releaseApkSha256"
