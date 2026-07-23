function ConvertTo-JavaPropertiesEscapedValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    $builder = New-Object System.Text.StringBuilder
    foreach ($character in $Value.ToCharArray()) {
        $codePoint = [int][char]$character
        if ($character -eq '\') {
            [void]$builder.Append('\\')
        }
        elseif ($character -eq ':') {
            [void]$builder.Append('\:')
        }
        elseif ($character -eq '=') {
            [void]$builder.Append('\=')
        }
        elseif ($character -eq '#') {
            [void]$builder.Append('\#')
        }
        elseif ($character -eq '!') {
            [void]$builder.Append('\!')
        }
        elseif (($codePoint -lt 0x20) -or ($codePoint -gt 0x7E)) {
            [void]$builder.Append(('\u{0:X4}' -f $codePoint))
        }
        else {
            [void]$builder.Append($character)
        }
    }

    return $builder.ToString()
}

function Assert-GitPathIgnoredAndUntracked {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot,

        [Parameter(Mandatory = $true)]
        [string]$RelativePath
    )

    Push-Location $RepoRoot
    try {
        $savedErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "SilentlyContinue"
            & git check-ignore --quiet -- $RelativePath *> $null
            $ignoredExitCode = $LASTEXITCODE
            & git ls-files --error-unmatch -- $RelativePath *> $null
            $trackedExitCode = $LASTEXITCODE
        }
        finally {
            $ErrorActionPreference = $savedErrorActionPreference
        }

        if ($ignoredExitCode -ne 0) {
            throw "Required local path is not ignored: $RelativePath"
        }

        if ($trackedExitCode -eq 0) {
            throw "Required local path is tracked: $RelativePath"
        }
        if ($trackedExitCode -ne 1) {
            throw "Unable to prove that the local path is untracked: $RelativePath"
        }
    }
    finally {
        Pop-Location
    }
}

function Assert-ApkSignerCertificate {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ApkSigner,

        [Parameter(Mandatory = $true)]
        [string]$ApkPath,

        [Parameter(Mandatory = $true)]
        [string]$ExpectedDigestFile
    )

    if (-not (Test-Path -LiteralPath $ExpectedDigestFile -PathType Leaf)) {
        throw "Pinned release certificate digest file is missing."
    }

    $expectedDigest = (Get-Content -LiteralPath $ExpectedDigestFile -Raw).Trim()
    if ($expectedDigest -notmatch '^[0-9a-fA-F]{64}$') {
        throw "Pinned release certificate digest is invalid."
    }

    $savedErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "SilentlyContinue"
        $verificationOutput = @(& $ApkSigner verify --verbose --print-certs $ApkPath 2>&1)
        $verificationExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $savedErrorActionPreference
    }

    $verificationOutput | ForEach-Object { Write-Host $_ }
    if ($verificationExitCode -ne 0) {
        throw "APK signature verification failed with exit code $verificationExitCode."
    }

    $verificationText = $verificationOutput | Out-String
    $signerCountMatch = [regex]::Match(
        $verificationText,
        '(?m)^Number of signers:\s*(\d+)\s*$'
    )
    if ((-not $signerCountMatch.Success) -or ($signerCountMatch.Groups[1].Value -ne '1')) {
        throw "APK must have exactly one signer."
    }

    $certificateMatches = [regex]::Matches(
        $verificationText,
        '(?m)^Signer #\d+ certificate SHA-256 digest:\s*([0-9a-fA-F]{64})\s*$'
    )
    if ($certificateMatches.Count -ne 1) {
        throw "Unable to identify exactly one APK signer certificate digest."
    }

    $actualDigest = $certificateMatches[0].Groups[1].Value
    if (-not $actualDigest.Equals($expectedDigest, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "APK signer certificate does not match the pinned release identity."
    }

    Write-Host "Pinned release certificate SHA-256 matched."
}
