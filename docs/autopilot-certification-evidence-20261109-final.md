# AxiomOS Autopilot — Certificación basada en evidencias (09-nov-2026)

## Alcance y decisión
**GO limitado**: CRM actual, catálogo, generación manual de borradores, revisión sin envío, y SMS único de certificación a teléfono autorizado.
**NO-GO**: envío autónomo de seguimiento a prospectos; revocación E2E en navegador no comprobada; WhatsApp end-to-end del nuevo proceso no probado.

## Evidencia concreta
1. Respaldo previo a pruebas: Neon snapshot `snap-wispy-tree-av9qisa3` de rama principal `br-square-field-avmxjhvf`. Producción: 33 prospectos, 20 llamadas, 162 mensajes WhatsApp, 0 propuestas, 0 aprobados.
2. SMS autorizado 2026-11-09 14:44 UTC: 1 registro en `sms_certification_attempt`. Vercel runtime `SMS_CERT_TELNYX_RESULT {status:200,id:'4031a1c0-c487-4db3-8b87-7ec1d04f7d9e'}`. Usuario adjuntó captura del SMS recibido en dispositivo autorizado. Esto certifica solicitud aceptada + recepción humana. No tenemos evento de entrega firmado de Telnyx por webhook ni estado final consultado en API.
3. Privilegios producción: lector sin SELECT en followup_queue ni followup_contact_permissions, ni EXECUTE para generate_followup_drafts_dryrun(). Roles owner y operator activos en axiomos_identity.memberships.
4. Revocación de sesión *nivel SQL de QA*: en `br-raspy-boat-aveu0gky` se insertó sesión sintética válida, se verificó existencia, se borró y se verificó ausencia, en un único bloque; consulta posterior reveló 0 tokens sintéticos remanentes. No se tocaron sesiones reales.
5. **Revocación E2E HTTP**: pendiente. La prueba SQL demuestra que el registro puede invalidarse, pero no que el middleware/Neon Auth rechace la cookie/token tras revocación. Se necesitan dos solicitudes autenticadas con sesión de prueba y revocación intermedia.
6. Generador de propuestas: probado en QA anteriormente, primera ejecución 8, segunda 0, con opt-out sintético primera ejecución 7/segunda 0; sin envíos. La tabla followup_queue mantiene constraint de no aprobación.
7. La función de SMS de un solo intento quedó consumida y Vercel variable `AXIOMOS_SMS_CERT_TEST_ENABLED` se cambió a false. Se requiere despliegue nuevo para que el flag sea efectivo. No reutilizar la prueba.

## Para certificar autonomía de envíos
- QA HTTP de owner/operator: operator 403, owner OK; revocación autenticada y rechazo después de invalidar sesión, más auditoría.
- Implementar un worker real aislado: consentimiento por canal y propósito, opt-out/STOP en el momento del envío, horario y rate-limit, plantillas aprobadas de WhatsApp fuera ventana de 24h, claim atómico y dedupe persistente, confirmaciones y reintentos seguros.
- Ensayos E2E con destinatario interno autorizado y proveedor (SMS por nueva ruta *de QA*, WhatsApp por test business number), y monitorización de webhooks autenticados.
- Nunca habilitar campañas/prospectos reales por asumir equivalencia entre SMS manual de prueba y envío autónomo.

**Conclusión:** el SMS de certificación manual pasó; revocación HTTP y entrega autónoma aún no. No se alteraron registros de prospectos durante estas pruebas.


## Ejecución complementaria de QA — 2026-11-09, post-SMS
Rama aislada: `br-raspy-boat-aveu0gky`, clonada de main; producción intacta.
- 8 seguimientos vencidos; ejecutando `generate_followup_drafts_dryrun()` como rol escritor insertó 8 propuestas en QA.
- La vista de elegibilidad para una propuesta devolvió inicialmente `blocked_no_consent`; al registrar consentimiento sintético en QA cambió a `consent_recorded_requires_review`, y al registrar baja posterior cambió a `blocked_opt_out`.
- Reejecución del generador: 0 propuestas nuevas (idempotencia).
- QA final: 8 propuestas, 0 approved. La base prohíbe transicionar a approved.
- Rol lector: no puede ejecutar generador ni leer tabla privada de consentimientos. Rol escritor: no tiene UPDATE de cola.
- Sesión QA sintética insertada y revocada en base de datos; 0 tokens sintéticos remanentes. **No hubo replay HTTP de cookie después de invalidación.**
- La prueba SMS manual realizada a número autorizado sí pasó y quedó cerrada; **no** hubo envío automático de propuestas de la cola.
- **Certificación actual**: GO para generación/revisión sin enviar, PASS en reglas DB; NO-GO en revocación autenticada HTTP y dispatch autónomo. No afirmar E2E de esas dos funciones.
