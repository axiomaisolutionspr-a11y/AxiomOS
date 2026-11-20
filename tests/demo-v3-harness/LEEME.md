# Banco de pruebas local del DEMO v3

Empaqueta la página real `/demo-comercial` con esbuild y sustituye la API por una simulada en memoria con las mismas validaciones de `app/api/demo-comercial/route.ts`. `seed.json` copia los 5 prospectos ficticios de Neon QA (19 nov 2026). No usa red, Neon ni proveedores.

```
npx esbuild tests/demo-v3-harness/harness.tsx --bundle --outdir=tests/demo-v3-harness/out --jsx=automatic --alias:next/image=./tests/demo-v3-harness/stub-image.tsx
cp public/axiomai-logo-transparent.webp tests/demo-v3-harness/
cd tests/demo-v3-harness && python3 -m http.server 8765 --bind 127.0.0.1 &
node tests/demo-v3-harness/e2e.mjs   # requiere playwright
```
Resultado del 19 nov 2026: 41/41 PASS (escritorio 1360 px y móvil 390 px).
