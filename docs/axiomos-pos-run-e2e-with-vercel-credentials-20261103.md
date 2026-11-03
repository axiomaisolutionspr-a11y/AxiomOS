# Ejecución autorizada de certificación E2E — AxiomOS POS QA

**Estado:** procedimiento de ejecución; NO certificado hasta que la suite emita POS_QA_E2E_SUCCESS. Solo Neon QA, no producción.

## Preparación y ejecución

Desde un entorno autenticado como miembro autorizado del proyecto Vercel `axiomai-solutions`, use la rama `feature/pos-qa-session-revocation-20261103`. No copie URI ni contraseñas al chat, código o logs.

La manera preferente es usar el CLI oficial con el alcance, proyecto y rama correctos, dentro de la carpeta de trabajo *vinculada al proyecto*:

```bash
git switch feature/pos-qa-session-revocation-20261103
npm ci
vercel pull --yes --environment=preview --git-branch=feature/pos-qa-session-revocation-20261103 --scope axiomai-solutions
vercel env run -- node tests/pos-http-e2e.mjs
```

**Importante:** confirmar en las instrucciones actuales del CLI si `vercel env run` permite seleccionar la rama Preview; si no, usar `vercel env pull` con `--environment=preview --git-branch=...` para cargar el entorno en un proceso local autorizado, con archivo .env.local ignorado por Git. No ejecutar el CLI contra Production. No ejecutar si el rol no es `pos_qa_app_login`.

El test requiere un build local disponible. Ejecutar `npm run build` antes del test si todavía no existe `.next`. El script utiliza credenciales efímeras generadas en memoria y el role no privilegiado. Usa la rama QA autorizada y nunca marca pagos reales.

## Salidas exigidas para certificado interno

1. Resultado `POS_QA_E2E_SUCCESS` con exit code 0.
2. Login inválido=401, CSRF=403, login válido=200, cookie HttpOnly/Secure/SameSite, catálogo=200.
3. Borrador=201, reintento=misma orden, lista=200.
4. Logout=200; cookie vieja: sesión/catalog/órdenes/POST=401, incluso tras segundo login.
5. Bloqueo: 401,401,401,401,401,429,429.
6. Revisar logs de ejecución sin secretos; guardar fecha, commit SHA y rama QA.
7. Solo entonces pasar PR de borrador a revisión de seguridad interna. No despliegue producción, no certificación bancaria.

## Investigación y hallazgo

- Variables POS_QA_DATABASE_URL, POS_QA_DATABASE_HOST, POS_QA_SESSION_SECRET, POS_QA_USERS_JSON y POS_QA_ENABLED están asociadas a la rama Preview.
- El sandbox genérico no las hereda automáticamente; un `buildCommand` temporal en Vercel tampoco recibió POS_QA_DATABASE_URL y se revirtió.
- La transferencia directa de la URI entre conectores fue bloqueada por las herramientas. El procedimiento evita esa transferencia y emplea el acceso del operador autenticado al proyecto.
- Vercel Sandbox permite variables propias al crear un sandbox. En este entorno, la plataforma detuvo el traspaso entre Neon y Sandbox; no se debe eludir.
- OWASP exige invalidación del lado servidor; ya existe tabla pos_qa_sessions con hash de token y revocación.

## Referencias

- https://vercel.com/docs/cli/env
- https://vercel.com/docs/cli/pull
- https://vercel.com/docs/environment-variables
- https://neon.com/docs/serverless/serverless-driver
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

No insertar secretos en `vercel.json`, parámetros HTTP, logs ni archivos versionados. El CRM de producción y el backup `snap-restless-leaf-av4bp0og` no se han modificado.
