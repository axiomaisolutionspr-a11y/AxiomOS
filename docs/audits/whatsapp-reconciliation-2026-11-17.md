# Reconciliación WhatsApp — 17 noviembre 2026

Fuente: Neon project icy-field-92690259, branch br-proud-frog-avxt19iu (lectura únicamente). **No asumir que esta rama es la conexión productiva sin confirmar DATABASE_URL host/branch.**

## Evidencia
- 29 mensajes de usuario entre 7–16 noviembre, todos con whatsapp_message_id.
- 27 tienen una fila de assistant en la misma conversación después del mensaje y antes del siguiente mensaje de usuario.
- 2 carecen de fila assistant en esa ventana: id 238 (2026-11-12 19:39:31.686 UTC) e id 239 (2026-11-12 19:44:39.919 UTC). Ambos pertenecen a la misma conversación y tienen whatsapp_message_id. Se registró una respuesta al mensaje 236 en esa conversación antes de estos dos.
- id 240 (2026-11-16 23:55:08 UTC) tiene respuesta id 241 (2026-11-16 23:55:13 UTC) en otra conversación.
- Una fila assistant NO prueba entrega al destinatario; ausencia de fila assistant NO prueba ausencia de envío externo.

## Causa potencial identificada en main
En app/api/whatsapp/route.ts el inbound se inserta antes del send; si ocurre una excepción posterior, la redelivery con el mismo whatsapp_message_id entra en WHATSAPP_DUPLICATE_SKIPPED y hace continue sin verificar entrega. Puede producir respuestas perdidas permanentemente. No afirmar que ocurrió en 238/239 sin logs del request.

## Consulta de reconciliación de solo lectura
```sql
WITH inbound AS (
  SELECT id, conversation_key, created_at, whatsapp_message_id,
         lead(created_at) OVER (PARTITION BY conversation_key ORDER BY created_at,id) AS next_event
  FROM public.whatsapp_messages WHERE role='user'
)
SELECT i.id, i.created_at, (i.whatsapp_message_id IS NOT NULL) AS has_meta_id,
       (a.created_at IS NOT NULL) AS has_reply,
       round(extract(epoch from (a.created_at-i.created_at))::numeric,1) AS reply_seconds
FROM inbound i
LEFT JOIN LATERAL (
  SELECT created_at FROM public.whatsapp_messages a
  WHERE a.role='assistant' AND a.conversation_key=i.conversation_key
    AND a.created_at>=i.created_at AND (i.next_event IS NULL OR a.created_at<i.next_event)
  ORDER BY a.created_at LIMIT 1
) a ON true
WHERE i.created_at >= '2026-11-07'
ORDER BY i.created_at DESC;
```

## No hacer sin evidencia
- No re-enviar mensajes de noviembre a clientes ni reiniciar procesamiento de IDs históricos.
- No alterar callback, API keys, Meta subscriptions o tablas productivas.
- No declarar entrega real sin Meta status webhook/outbound message ID.

## Criterios de cierre
1. Confirmar branch de Neon que usa el deployment del dominio www.axiomaisolutions.org.
2. Reconciliar proveedor Meta/Dualhook request IDs y estados para los dos mensajes pendientes, sin mostrar datos personales.
3. Implementar intake idempotente con estado de entrega y reconciliación de respuestas; testear en QA aislado.
4. Build/test automatizado de la rama, evidencia webhook firmado y respuesta QA con acuse del proveedor; rollback documentado.
