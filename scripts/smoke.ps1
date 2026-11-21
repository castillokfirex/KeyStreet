# Verificacion end-to-end Backend <-> RAG (requiere stack en ejecucion).
# Uso: .\scripts\smoke.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$fixtures = Join-Path $root 'rag-service\tests\fixtures'
$base = 'http://localhost:8080/api/v1'
$h = @{ 'X-Tenant-Slug' = 'key-street' }

Write-Host "==> 1. Login admin"
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -Headers $h -ContentType 'application/json' `
  -Body '{"email":"admin@keystreet.co","password":"KeyStreet2026!"}'
$auth = @{ Authorization = "Bearer $($login.accessToken)"; 'X-Tenant-Slug' = 'key-street' }

function Upload-And-Wait([string]$pdfPath, [string]$title) {
  Write-Host "==> Subiendo $title ($pdfPath)"
  $raw = curl.exe -sS -w "`n%{http_code}" -X POST "$base/admin/documents?title=$([uri]::EscapeDataString($title))" `
    -H "Authorization: Bearer $($login.accessToken)" -H "X-Tenant-Slug: key-street" `
    -F "file=@$pdfPath;type=application/pdf"
  $lines = $raw -split "`n"
  $code = $lines[-1].Trim()
  $body = ($lines[0..($lines.Count - 2)] -join "`n") | ConvertFrom-Json
  if ($code -eq '409' -and $body.existingDocumentId) {
    Write-Host "    Ya existia ($($body.existingDocumentId)); eliminando y re-subiendo para probar ciclo completo"
    Invoke-RestMethod -Method Delete -Uri "$base/admin/documents/$($body.existingDocumentId)" -Headers $auth | Out-Null
    $raw = curl.exe -sS -w "`n%{http_code}" -X POST "$base/admin/documents?title=$([uri]::EscapeDataString($title))" `
      -H "Authorization: Bearer $($login.accessToken)" -H "X-Tenant-Slug: key-street" `
      -F "file=@$pdfPath;type=application/pdf"
    $lines = $raw -split "`n"
    $code = $lines[-1].Trim()
    $body = ($lines[0..($lines.Count - 2)] -join "`n") | ConvertFrom-Json
    if ($code -ne '202') { throw "Re-upload fallo HTTP ${code}: $($lines -join ' ')" }
    $docId = $body.id
  } elseif ($code -eq '202') {
    $docId = $body.id
  } else {
    throw "Upload fallo HTTP ${code}: $($lines -join ' ')"
  }

  for ($i = 0; $i -lt 30; $i++) {
    $doc = Invoke-RestMethod -Uri "$base/admin/documents/$docId" -Headers $auth
    if ($doc.status -eq 'INDEXED') {
      Write-Host "    INDEXED: chunks=$($doc.chunkCount) ocrPages=$($doc.ocrPageCount) tempFile.verified=$($doc.tempFile.verified)"
      if (-not $doc.tempFile.verified) { throw "tempFile.verified es false!" }
      return $doc
    }
    if ($doc.status -eq 'FAILED') {
      throw "Documento $docId fallo: $($doc.error.code) - $($doc.error.message)"
    }
    Start-Sleep 2
  }
  throw "Timeout esperando indexacion de $docId"
}

$d1 = Upload-And-Wait (Join-Path $fixtures 'guia_tallas.pdf') 'Guía de tallas 2026'
$d2 = Upload-And-Wait (Join-Path $fixtures 'ficha_escaneada.pdf') 'Ficha escaneada garantías'

Write-Host "==> 2. Consulta asistente RAG (texto normal)"
$b1 = [Text.Encoding]::UTF8.GetBytes('{"question":"¿El Adidas Samba OG tiene horma estrecha o normal?","productSlug":"adidas-samba-og-blanco-negro"}')
$q1 = Invoke-RestMethod -Method Post -Uri "$base/assistant/query" -Headers $h -ContentType 'application/json; charset=utf-8' -Body $b1
Write-Host "    status=$($q1.status) citas=$($q1.citations.Count) answer=$($q1.answer)"
if ($q1.status -ne 'ANSWERED' -or $q1.citations.Count -lt 1) { throw "Consulta 1 sin citas!" }

Write-Host "==> 3. Consulta sobre documento escaneado OCR"
$b2 = [Text.Encoding]::UTF8.GetBytes('{"question":"¿Cuantos dias hay para cambios por talla o despachos en Bogota?"}')
$q2 = Invoke-RestMethod -Method Post -Uri "$base/assistant/query" -Headers $h -ContentType 'application/json; charset=utf-8' -Body $b2
Write-Host "    status=$($q2.status) citas=$($q2.citations.Count) answer=$($q2.answer)"
if ($q2.status -ne 'ANSWERED' -or $q2.citations.Count -lt 1) { throw "Consulta OCR sin citas!" }

Write-Host "SMOKE OK"
