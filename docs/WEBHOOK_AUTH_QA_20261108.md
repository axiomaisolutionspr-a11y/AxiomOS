# Validación de webhooks — preparación QA

La ruta `/api/telnyx` de producción sigue su comportamiento anterior. Este cambio permite validar firmas Ed25519 **solo** cuando `VERCEL_ENV=preview` y `AXIOMOS_TELNYX_VERIFY_QA=true`. Si falta `TELNYX_WEBHOOK_PUBLIC_KEY_QA`, responde 503; si la firma es incorrecta o el timestamp supera cinco minutos, responde 401 antes de procesar el evento. La clave pública se obtiene de Telnyx Mission Control y nunca se almacena en GitHub. Desactivar la bandera revierte inmediatamente el rechazo.

Para confirmar en Preview: configurar la clave pública en el proyecto aislado, enviar un evento firmado de prueba desde Telnyx al endpoint QA, verificar su registro e idempotencia; después comprobar evento alterado, firma ausente y timestamp vencido. **No** redirigir llamadas de clientes al Preview ni habilitar el rechazo en producción antes de observar una entrega real válida y un plan de reversión.

Dualhook Embedded Signup usa la aplicación Meta de Dualhook: la firma `X-Hub-Signature-256` del mensaje directo no se verifica con nuestro `META_APP_SECRET`. No utilizar el token del GET como secreto POST. Quedan pendientes un identificador WABA y `phone_number_id` permitidos por empresa, una ruta HTTPS privada de alta entropía por empresa, límites de tráfico y prueba de mensajes reales autorizados. Los campos de gestión sin `phone_number_id` requieren clasificación separada. No se cambió `/api/whatsapp` en este PR.

Fuentes: documentación de Telnyx sobre firma Ed25519 y cuerpo crudo, y documentación de Dualhook Messaging Webhook sobre Webhook Override. El guard de Telnyx aquí es una prueba local y de compilación, todavía no una prueba de entrega externa firmada.
