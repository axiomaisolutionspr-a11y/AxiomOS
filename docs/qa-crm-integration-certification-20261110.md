# AxiomOS — Integración CRM/autorizaciones, certificación QA (2026-11-10)

## Alcance aprobado
Pruebas exclusivamente sintéticas y consultas `SELECT` sobre Neon QA aislada, **sin SMS, WhatsApp ni llamadas reales**. Ningún token, webhook, perfil, dato o servicio de producción fue modificado. No se publicó un worker autónomo ni se hizo merge.

## Entrega
- Política `app/lib/autopilot-delivery-gates.mjs` (bloqueo por datos desconocidos, bajas, frecuencia, consentimiento y reglas WhatsApp).
- Lector `app/lib/qa-followup-readonly.mjs`, que combina `axiomos_commercial.followup_queue`, el último registro `followup_contact_permissions` por canal/propósito y `followup_review_decisions`. Verifica identificador y entorno QA, devuelve diagnóstico sin PII; nunca devuelve permiso de envío ni invoca proveedores.
- `tests/qa-followup-readonly.test.mjs`: entradas sintéticas que prueban estado ausente, opt-out, consentimiento viejo, origen de datos, aislamiento tenant, inyección por ID y falta de permisos.
- CI `.github/workflows/axiomos-qa-no-send-policy.yml` sin secretos ni proveedores.
- GitHub Actions run **42889425792**, commit `5b759b4b839dbcf3697df970f8ab255709bb7d25`: **68 tests, 68 pass, 0 fail** (registro del job `130086283012`).

## Evidencia de Neon (solo lectura)
Proyecto `icy-field-92690259`, rama hija no productiva `br-lively-band-avj6yz8x`.
Una consulta agregada, sin nombres ni teléfonos, con la misma unión por tenant/prospecto/canal/propósito devolvió:
- WhatsApp `needs_review`, última autorización `opt_out`: **2**.
- WhatsApp `needs_review`, autorización `unknown`: **6**.
- **0** elementos con `opt_in` verificable, **0** elementos `approved`.
- La restricción original `followup_queue_no_live_dispatch` sigue siendo el control que impide el status `approved` en este diseño.

## No certifica aún
- No hay automatización comercial end-to-end: el lector no se conecta a un worker de despacho y no debe hacerlo por ahora.
- No puede reconstruir con garantías la frecuencia de contactos por prospecto y canal solo con el esquema actual; ante falta de datos la política bloquea.
- No hay prueba real de webhook firmado de Telnyx/Meta o mensaje real WhatsApp dentro de esta autorización; no se permite reemplazarla por una simulación.
- La PR #101 original tiene conflictos; esta PR #103 es independiente, limpia y sigue **draft**.

## Decisión
`QA_CRM_READONLY_INTEGRATION_PASS`, `QA_CI_68_OF_68_PASS`, `COMMERCIAL_AUTONOMY_NO_GO`.
Mantener el modo `NO SEND` hasta completar almacenamiento/consulta autoritativa de contacto, control de sesiones, webhooks firmados y revisión de lanzamiento.
