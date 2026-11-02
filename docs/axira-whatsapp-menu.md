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
