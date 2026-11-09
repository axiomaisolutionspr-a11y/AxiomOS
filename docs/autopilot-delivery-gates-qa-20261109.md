# AxiomOS Autopilot · Política de despacho (QA aislado)

## Resultado (2026-11-09)
- Se agregó `app/lib/autopilot-delivery-gates.mjs`: evaluación determinista de una candidatura de envío que **no contacta proveedores**.
- `tests/autopilot-delivery-gates.test.mjs`: 28 pruebas de autorización, sesión vigente, tenant, consentimiento, bajas, límites, horario PR, regla WhatsApp 24h y clave idempotente.
- `.github/workflows/autopilot-delivery-gates-qa.yml`: ejecución de pruebas en PR sin secretos ni credenciales.
- La política exige `environment === "qa"`, `enabled === true`, propietario autenticado, destinatario de pruebas sintético y allowlist explícita. Bloquea **siempre** producción.
- No hay endpoint, cron, proveedor de SMS/WhatsApp, lectura de números reales ni acceso a credenciales.

## Límites que NO permiten declarar GO comercial
1. El módulo recibe un objeto de evidencia y **no debe aceptar datos de cliente**. Un adaptador futuro tiene que obtener autorización owner y sesión vigentes, consentimiento más reciente, supresiones y frecuencia directamente en DB en la misma operación autorizada.
2. Idempotencia actual es una validación de clave, **NO una reserva transaccional**. Antes de un solo envío real, implementar una outbox de PostgreSQL con claim atómico (`FOR UPDATE SKIP LOCKED` o equivalente), expiración de leasing, intentos y estados. Reintentos tras timeout incierto deben quedar en estado para conciliación, nunca re-enviar a ciegas.
3. La cola `axiomos_commercial.followup_queue` tiene el control `followup_queue_no_live_dispatch`; **no retirarlo** hasta que nuevo sistema sea probado E2E y aprobado.
4. WhatsApp: usar plantillas reales verificadas por Meta fuera de 24h; opt-in contextual por canal/propósito, procesamiento de STOP y webhooks firmados.
5. Telnyx: entrega observada por webhook validado y matching del ID de mensaje, nunca equiparar respuesta HTTP 200 con entrega final.
6. Restricción de frecuencia y reglas en proceso del momento de despacho, no únicamente al crear el borrador.
7. Ejecutar HTTP E2E QA únicamente contra destinatario interno autorizado. Verificar falla de roles no-owner, reintentos, reconexión, límites, revalidación después de revocar sesión y no duplicación.
8. Respaldo/plan de reversión y revisión manual antes de tocar base de producción.

## Comando local
```bash
node --test tests/autopilot-delivery-gates.test.mjs
```

## Decisión
**PASS**: política aislada y pruebas locales unitarias. **NO-GO**: envío real autónomo a prospectos. Este PR no debe considerarse autorización para activar campañas ni realizar migración de datos.
