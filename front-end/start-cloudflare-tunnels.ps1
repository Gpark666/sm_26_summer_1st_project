param(
    [ValidateSet(5500, 8000)]
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if ($cloudflared) {
    $cloudflaredCommand = $cloudflared.Source
} else {
    $installedPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
    if (-not (Test-Path -LiteralPath $installedPath)) {
        throw "cloudflared를 찾을 수 없습니다. 'winget install --id Cloudflare.cloudflared'로 설치하세요."
    }
    $cloudflaredCommand = $installedPath
}

Write-Host "HTTP 서버가 먼저 $Port 포트에서 실행 중이어야 합니다."
Write-Host "표시된 https 주소를 복사해 휴대폰 또는 테스트 페이지에 사용하세요."
& $cloudflaredCommand tunnel --url "http://127.0.0.1:$Port"
