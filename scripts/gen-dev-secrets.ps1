# Genera .env desde .env.example con secretos aleatorios (compatible con PowerShell 5.1 y 7).
# Uso: .\scripts\gen-dev-secrets.ps1 [-Force]
param([switch]$Force)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$example = Join-Path $root '.env.example'
$envFile = Join-Path $root '.env'

function New-Secret([int]$bytes) {
  $buf = New-Object byte[] $bytes
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($buf); $rng.Dispose()
  # base64url sin '=' para que sea seguro en .env, URLs y JDBC
  return ([Convert]::ToBase64String($buf)).TrimEnd('=').Replace('+', 'A').Replace('/', 'B')
}

$utf8NoBom = New-Object Text.UTF8Encoding $false
if ((Test-Path $envFile) -and -not $Force) {
  Write-Host ".env ya existe (usa -Force para regenerar). Solo se rellenan variables vacias."
} else {
  Copy-Item $example $envFile -Force
}

$generated = @{
  JWT_SECRET         = { New-Secret 64 }
  INTERNAL_API_TOKEN = { New-Secret 32 }
  POSTGRES_PASSWORD  = { New-Secret 24 }
  APP_DB_PASSWORD    = { New-Secret 24 }
  RAG_DB_PASSWORD    = { New-Secret 24 }
}
$lines = [IO.File]::ReadAllLines($envFile, $utf8NoBom)
$out = foreach ($l in $lines) {
  $m = [regex]::Match($l, '^([A-Z_]+)=$')
  if ($m.Success -and $generated.ContainsKey($m.Groups[1].Value)) {
    $m.Groups[1].Value + '=' + (& $generated[$m.Groups[1].Value])
  } else { $l }
}
[IO.File]::WriteAllText($envFile, (($out -join "`n") + "`n"), $utf8NoBom)
Write-Host ".env listo. Recuerda completar GEMINI_API_KEY (o usar AI_PROVIDER=fake)."
