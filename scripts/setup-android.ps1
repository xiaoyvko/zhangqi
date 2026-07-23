[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$toolchainRoot = Join-Path $repoRoot ".android-toolchain"
$downloadsRoot = Join-Path $toolchainRoot "downloads"
$jdkRoot = Join-Path $toolchainRoot "jdk"
$androidHome = Join-Path $toolchainRoot "sdk"
$cmdlineToolsRoot = Join-Path $androidHome "cmdline-tools"
$cmdlineToolsLatest = Join-Path $cmdlineToolsRoot "latest"
$jdkArchive = Join-Path $downloadsRoot "microsoft-jdk-21-windows-x64.zip"
$androidToolsArchive = Join-Path $downloadsRoot "commandlinetools-win-15859902_latest.zip"
$jdkUrl = "https://aka.ms/download-jdk/microsoft-jdk-21-windows-x64.zip"
$androidToolsUrl = "https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip"
$androidToolsSha256 = "90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a"

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

function Get-ValidatedChildPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$Parent
    )

    $fullPath = [System.IO.Path]::GetFullPath($Path)
    $fullParent = [System.IO.Path]::GetFullPath($Parent).TrimEnd(
        [System.IO.Path]::DirectorySeparatorChar,
        [System.IO.Path]::AltDirectorySeparatorChar
    )
    $requiredPrefix = $fullParent + [System.IO.Path]::DirectorySeparatorChar

    if (-not $fullPath.StartsWith($requiredPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to operate outside the project toolchain directory: $fullPath"
    }

    return $fullPath
}

function Remove-ToolchainItem {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $validatedPath = Get-ValidatedChildPath -Path $Path -Parent $toolchainRoot
    if (Test-Path -LiteralPath $validatedPath) {
        Remove-Item -LiteralPath $validatedPath -Recurse -Force
    }
}

function Get-OfficialArchive {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Uri,

        [Parameter(Mandatory = $true)]
        [string]$Destination,

        [Parameter()]
        [string]$ExpectedSha256
    )

    if (Test-Path -LiteralPath $Destination) {
        if ([string]::IsNullOrWhiteSpace($ExpectedSha256)) {
            return
        }

        $existingSha256 = (Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash
        if ($existingSha256.Equals($ExpectedSha256, [System.StringComparison]::OrdinalIgnoreCase)) {
            return
        }

        Remove-ToolchainItem -Path $Destination
    }

    $partialDestination = "$Destination.partial"
    if ((Test-Path -LiteralPath $partialDestination) -and
        (-not [string]::IsNullOrWhiteSpace($ExpectedSha256))) {
        $partialSha256 = (Get-FileHash -LiteralPath $partialDestination -Algorithm SHA256).Hash
        if ($partialSha256.Equals($ExpectedSha256, [System.StringComparison]::OrdinalIgnoreCase)) {
            Move-Item -LiteralPath $partialDestination -Destination $Destination
            return
        }
    }

    Remove-ToolchainItem -Path $partialDestination
    $curlExecutable = (Get-Command "curl.exe" -ErrorAction Stop).Source
    try {
        Write-Host "Downloading $Uri"
        Invoke-CheckedNative -Executable $curlExecutable -Arguments @(
            "--fail",
            "--location",
            "--retry", "5",
            "--retry-delay", "2",
            "--retry-all-errors",
            "--silent",
            "--show-error",
            "--output", $partialDestination,
            $Uri
        )

        if (-not [string]::IsNullOrWhiteSpace($ExpectedSha256)) {
            $downloadedSha256 = (Get-FileHash -LiteralPath $partialDestination -Algorithm SHA256).Hash
            if (-not $downloadedSha256.Equals($ExpectedSha256, [System.StringComparison]::OrdinalIgnoreCase)) {
                throw "Downloaded archive SHA-256 verification failed."
            }
        }

        Move-Item -LiteralPath $partialDestination -Destination $Destination
    }
    finally {
        Remove-ToolchainItem -Path $partialDestination
    }
}

New-Item -ItemType Directory -Path $downloadsRoot -Force | Out-Null
New-Item -ItemType Directory -Path $androidHome -Force | Out-Null

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Get-OfficialArchive -Uri $jdkUrl -Destination $jdkArchive
Get-OfficialArchive -Uri $androidToolsUrl -Destination $androidToolsArchive -ExpectedSha256 $androidToolsSha256

$actualAndroidToolsSha256 = (Get-FileHash -LiteralPath $androidToolsArchive -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualAndroidToolsSha256 -ne $androidToolsSha256) {
    Remove-ToolchainItem -Path $androidToolsArchive
    throw "Android command-line tools SHA-256 verification failed."
}
Write-Host "Android command-line tools SHA-256 verified."

$javaExecutable = Join-Path $jdkRoot "bin\java.exe"
$jdkReleaseFile = Join-Path $jdkRoot "release"
$hasMicrosoftJdk21 = (Test-Path -LiteralPath $javaExecutable -PathType Leaf) -and
    (Test-Path -LiteralPath $jdkReleaseFile -PathType Leaf) -and
    (Select-String -LiteralPath $jdkReleaseFile -Pattern '^JAVA_VERSION="21\.' -Quiet)
if (-not $hasMicrosoftJdk21) {
    $jdkStaging = Join-Path $toolchainRoot "jdk-extract"
    Remove-ToolchainItem -Path $jdkStaging
    Remove-ToolchainItem -Path $jdkRoot
    Expand-Archive -LiteralPath $jdkArchive -DestinationPath $jdkStaging -Force

    $jdkSource = Get-ChildItem -LiteralPath $jdkStaging -Directory |
        Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "bin\java.exe") } |
        Select-Object -First 1
    if ($null -eq $jdkSource) {
        throw "The Microsoft OpenJDK archive did not contain the expected JDK directory."
    }

    Move-Item -LiteralPath $jdkSource.FullName -Destination $jdkRoot
    Remove-ToolchainItem -Path $jdkStaging
}
if (-not (Select-String -LiteralPath (Join-Path $jdkRoot "release") -Pattern '^JAVA_VERSION="21\.' -Quiet)) {
    throw "The portable Microsoft OpenJDK is not version 21."
}

$sdkManager = Join-Path $cmdlineToolsLatest "bin\sdkmanager.bat"
if (-not (Test-Path -LiteralPath $sdkManager)) {
    $androidToolsStaging = Join-Path $toolchainRoot "android-tools-extract"
    Remove-ToolchainItem -Path $androidToolsStaging
    Remove-ToolchainItem -Path $cmdlineToolsLatest
    Expand-Archive -LiteralPath $androidToolsArchive -DestinationPath $androidToolsStaging -Force

    $androidToolsSource = Join-Path $androidToolsStaging "cmdline-tools"
    if (-not (Test-Path -LiteralPath (Join-Path $androidToolsSource "bin\sdkmanager.bat"))) {
        throw "The Android command-line tools archive did not contain sdkmanager.bat."
    }

    New-Item -ItemType Directory -Path $cmdlineToolsRoot -Force | Out-Null
    Move-Item -LiteralPath $androidToolsSource -Destination $cmdlineToolsLatest
    Remove-ToolchainItem -Path $androidToolsStaging
}

$env:JAVA_HOME = $jdkRoot
$env:ANDROID_HOME = $androidHome
$env:ANDROID_SDK_ROOT = $androidHome
$toolPaths = @(
    (Join-Path $jdkRoot "bin"),
    (Join-Path $cmdlineToolsLatest "bin"),
    (Join-Path $androidHome "platform-tools"),
    (Join-Path $androidHome "build-tools\36.0.0")
)
$env:PATH = ($toolPaths + @($env:PATH)) -join [System.IO.Path]::PathSeparator

1..100 | ForEach-Object { "y" } | & $sdkManager "--sdk_root=$androidHome" --licenses
if ($LASTEXITCODE -ne 0) {
    throw "Android SDK license acceptance failed with exit code $LASTEXITCODE."
}

$sdkPackages = @(
    "--sdk_root=$androidHome",
    "platform-tools",
    "platforms;android-36",
    "build-tools;36.0.0"
)
$requiredSdkFiles = @(
    (Join-Path $androidHome "platform-tools\adb.exe"),
    (Join-Path $androidHome "platforms\android-36\android.jar"),
    (Join-Path $androidHome "build-tools\36.0.0\apksigner.bat")
)
$missingSdkFiles = @($requiredSdkFiles | Where-Object { -not (Test-Path -LiteralPath $_ -PathType Leaf) })
if ($missingSdkFiles.Count -gt 0) {
    $sdkInstallSucceeded = $false
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        & $sdkManager @sdkPackages
        if ($LASTEXITCODE -eq 0) {
            $sdkInstallSucceeded = $true
            break
        }

        if ($attempt -lt 5) {
            Write-Warning "Android SDK package installation attempt $attempt failed; retrying."
            Start-Sleep -Seconds 2
        }
    }
    if (-not $sdkInstallSucceeded) {
        throw "Android SDK package installation failed after 5 attempts."
    }
}
else {
    Write-Host "Required Android SDK packages are already installed."
}

$escapedSdkPath = $androidHome.Replace("\", "\\").Replace(":", "\:")
$localProperties = Join-Path $repoRoot "android\local.properties"
"sdk.dir=$escapedSdkPath" | Set-Content -LiteralPath $localProperties -Encoding ASCII

Write-Host "Portable Android toolchain is ready."
Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "ANDROID_HOME=$env:ANDROID_HOME"
