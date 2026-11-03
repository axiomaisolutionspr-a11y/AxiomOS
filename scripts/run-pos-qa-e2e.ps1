# Certificacion interna AxiomOS POS QA. Windows PowerShell 7+
# Ejecute con Vercel CLI autenticado en el proyecto; nunca imprimir secretos.
$ErrorActionPreference = "Stop"
$branch = "feature/pos-qa-session-revocation-20261103"
$expectedProject = "prj_VoGvqGCy3mgTDBC5fAaADxdXuaXX"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Instala Git" }
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) { throw "Instala Vercel CLI: npm install -g vercel" }
if ((git branch --show-current).Trim() -ne $branch) { throw "Debes cambiar a la rama QA: git switch $branch" }
if (-not (Test-Path ".vercel/project.json")) { throw "Debes vincular el proyecto: vercel link --scope axiomai-solutions" }
$linked = Get-Content ".vercel/project.json" -Raw | ConvertFrom-Json
if ($linked.projectId -ne $expectedProject) { throw "Proyecto Vercel incorrecto; abortando." }
Write-Host "Proyecto vinculado y rama QA verificados."
vercel whoami --scope axiomai-solutions
if ($LASTEXITCODE -ne 0) { throw "Autenticacion Vercel no disponible." }
npm ci --ignore-scripts --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw "Fallo npm ci." }
npm run build
if ($LASTEXITCODE -ne 0) { throw "Fallo compilacion." }
# Vercel CLI inyecta las variables de la rama al proceso, no las escribe en codigo.
vercel env run -e preview --git-branch $branch -- node tests/pos-http-e2e.mjs
if ($LASTEXITCODE -ne 0) { throw "E2E FALLIDO: revisar el resultado sin imprimir credenciales." }
Write-Host "POS_QA_E2E_EXIT_0 - revisar la salida POS_QA_E2E_SUCCESS antes de certificar."
