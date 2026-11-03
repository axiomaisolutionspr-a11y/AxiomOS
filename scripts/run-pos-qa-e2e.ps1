# AxiomAI POS - E2E autenticacion QA. PowerShell 7 en Windows.
# No imprime credenciales ni cambia entorno de produccion.
$ErrorActionPreference = "Stop"
$branch = "feature/pos-qa-session-revocation-20261103"
$expectedProject = "prj_VoGvqGCy3mgTDBC5fAaADxdXuaXX"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Git no instalado." }
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) { throw "Vercel CLI no instalado." }
if ((git branch --show-current).Trim() -ne $branch) {
  throw "Rama incorrecta. Usa: git switch $branch"
}
if (-not (Test-Path ".vercel/project.json")) {
  throw "Vincula el proyecto con: vercel link --yes --scope axiomai-solutions --project axiomai-solutions"
}
$linked = Get-Content ".vercel/project.json" -Raw | ConvertFrom-Json
if ($linked.projectId -ne $expectedProject -or $linked.orgId -ne "team_iwBjJw8IETihUFIw3Y2cuqj7") {
  throw "El proyecto Vercel vinculado no es AxiomAI. Abortando."
}
Write-Host "Proyecto AxiomAI y rama QA confirmados."
vercel whoami --scope axiomai-solutions
if ($LASTEXITCODE -ne 0) { throw "Inicia sesion con: vercel login" }

# Reutilizar la compilacion local existente cuando es la misma rama.
if (-not (Test-Path ".next/BUILD_ID")) {
  npm ci --ignore-scripts --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "Fallo npm ci" }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Fallo la compilacion" }
} else {
  Write-Host "Compilacion local ya disponible; no se recompilara."
}

# Usar cmd.exe para entregar literalmente '--' a Vercel CLI en Windows.
# PowerShell puede consumir el separador cuando invoca un ejecutable externo.
$preflight = "vercel env run -e preview --git-branch $branch -- node scripts/pos-qa-env-preflight.mjs"
cmd.exe /d /c $preflight
if ($LASTEXITCODE -ne 0) {
  throw "No fue posible cargar las credenciales QA por Vercel CLI. No se ejecutaron pruebas autenticadas. Consulta las instrucciones de variables Secret."
}

$e2e = "vercel env run -e preview --git-branch $branch -- node tests/pos-http-e2e.mjs"
cmd.exe /d /c $e2e
if ($LASTEXITCODE -ne 0) { throw "E2E fallo. No se puede certificar el inicio de sesion." }
Write-Host "E2E terminado con salida 0; confirma POS_QA_E2E_SUCCESS antes de certificar."
