# AxiomAI POS QA E2E. PowerShell 7; solo rama aislada.
$ErrorActionPreference = 'Stop'
$repo = Join-Path $HOME 'AxiomOS-POS-QA'
if (-not (Test-Path $repo)) { throw "No existe la carpeta $repo" }
Set-Location $repo
if ((git branch --show-current).Trim() -ne 'feature/pos-qa-session-revocation-20261103') { throw 'Rama de Git incorrecta.' }
if (-not (Test-Path '.vercel/project.json')) { throw 'Proyecto Vercel no vinculado.' }
$p = Get-Content '.vercel/project.json' -Raw | ConvertFrom-Json
if ($p.projectId -ne 'prj_VoGvqGCy3mgTDBC5fAaADxdXuaXX') { throw 'Proyecto Vercel incorrecto.' }
if (-not (Test-Path '.next/BUILD_ID')) {
 npm ci --ignore-scripts --no-audit --no-fund
 if ($LASTEXITCODE -ne 0) { throw 'Fallo npm ci' }
 npm run build
 if ($LASTEXITCODE -ne 0) { throw 'Fallo npm run build' }
}
Write-Host 'Neon: seleccionar EXCLUSIVAMENTE la rama pos-http-e2e-qa-20261103 (br-aged-rice-avymo2s8), con rol pos_qa_app_login.'
Write-Host 'No pegues el secreto en el chat. Se recibe oculto y solo permanece en este proceso.'
$secure = Read-Host 'Pega la connection string SOLO de Neon QA' -AsSecureString
$ptr = [IntPtr]::Zero
try {
 $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
 $uriText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
 $url = [uri]$uriText
 $role = $url.UserInfo.Split(':')[0]
 if ($url.Scheme -notin @('postgres','postgresql') -or -not $url.Host.EndsWith('.neon.tech') -or $role -ne 'pos_qa_app_login') {
  throw 'Conexión rechazada: host o rol incorrectos.'
 }
 $env:POS_QA_DATABASE_URL = $uriText
 $uriText = $null
 node .\tests\pos-http-e2e.mjs
 if ($LASTEXITCODE -ne 0) { throw "E2E FALLIDO ($LASTEXITCODE). No certificar." }
 Write-Host 'Suite terminó con código 0. Confirma que aparece POS_QA_E2E_SUCCESS.'
} finally {
 Remove-Item Env:POS_QA_DATABASE_URL -ErrorAction SilentlyContinue
 if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
 $secure = $null
 $uriText = $null
}
