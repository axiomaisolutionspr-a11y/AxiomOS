# Axira — Menú WhatsApp de servicios (propuesta aislada)

Este cambio **no modifica producción**. Añade un clasificador puro para respuestas 1–6, de manera que pueda probarse antes de integrarlo al webhook existente.

## Alcance

- 1: WhatsApp / atención al cliente.
- 2: llamadas / recepcionista.
- 3: CRM / seguimiento.
- 4: administración / inventario / facturación.
- 5: robótica / automatización.
- 6: información general.

## Pasos pendientes antes del despliegue

1. Probar el clasificador con `1` a `6`, emojis numéricos, textos normales y comandos `#reset`.
2. Inspeccionar el flujo de `app/api/whatsapp/route.ts` para seleccionar el punto correcto de integración; preservar validación de webhook, deduplicación, persistencia y envío con Dualhook.
3. Confirmar mapeo de campos existente del CRM; registrar interés/servicio sin sobrescribir nombre del cliente o de la empresa.
4. Añadir manejo de menú sin romper el historial enviado a Brain. Para frases libres, continuar con Brain.
5. Probar con conversación de QA aislada y números autorizados antes de habilitar para clientes.
6. Documentar condiciones y límites del servicio promocional ($17.95 después de tres meses) antes de automatizar ofertas.

## Seguridad

No incluir credenciales en repositorio ni logs. No enviar mensajes promocionales no solicitados. No cambiar integraciones de WhatsApp Business App Coexistence.


## QA aislado realizado (2026-11-01 PR)

- Neon project: `axiomai-leads`. Rama de prueba: `axira-menu-qa-20261101` (`br-long-glitter-avo0yybm`).
- Se verificaron 14 columnas en `prospects` y 7 en `whatsapp_messages`.
- Se insertó solo el prospecto ficticio `qa:axira-menu-20261101` en la rama de prueba; la consulta devolvió nombre y empresa de prueba sin alteraciones y nota de interés presente.
- Se repitió el intento de añadir el mismo marcador y no se actualizó ningún registro: verificación parcial de idempotencia.
- Importante: la rama es una COPIA DE DATOS y sigue conteniendo datos confidenciales heredados del origen. No compartir su conexión ni usarla como demo pública. Eliminar datos reales de manera planificada y autorizada o utilizar un proyecto vacío antes de pruebas externas.
- No se modificó la rama `main` de Neon. No se configuraron secretos de producción en Preview. No se alteró el webhook de Meta.
- El Preview de Vercel actualmente hereda `DATABASE_URL` compartida entre production/preview. NO habilitar pruebas de escritura vía URL hasta aislarla.
- Para una prueba futura, aislar `DATABASE_URL` en un despliegue dedicado, bloquear envíos reales (Dualhook/Telnyx/Resend) y verificar el comportamiento completo desde un entorno instrumentado.
- `AXIRA_WHATSAPP_MENU_ENABLED` desactivado por defecto y `AXIRA_WHATSAPP_TEST_PHONES` obligatorio para activar el menú en un teléfono autorizado.
