# AxiomOS Brain en Messenger e Instagram

La ruta única de Meta es:

```text
https://axiomaisolutions.org/api/meta
```

Esta ruta recibe mensajes de Facebook Messenger e Instagram, valida la firma de Meta, pide una respuesta corta a AxiomOS Brain y registra el intercambio en `/prospectos`.

WhatsApp y Dualhook no usan esta ruta y no se modifican.

## Variables de entorno en Vercel

Configura estas variables solamente en el servidor. Nunca uses el prefijo `NEXT_PUBLIC_` para tokens o secretos.

| Variable | Uso |
| --- | --- |
| `META_WEBHOOK_VERIFY_TOKEN` | Texto secreto nuevo para verificar el webhook en Meta. |
| `META_APP_SECRET` | App Secret de la aplicación de Meta. |
| `META_PAGE_ID` | ID de la página de Facebook AxiomAI Solutions. |
| `META_PAGE_ACCESS_TOKEN` | Token de acceso de la página para Messenger. También puede servir como respaldo para Instagram conectado a la página. |
| `META_INSTAGRAM_ACCOUNT_ID` | ID de la cuenta profesional de Instagram `axiomaisolutions`. |
| `META_INSTAGRAM_ACCESS_TOKEN` | Token de Instagram si Meta emite uno separado. Si falta, AxiomOS usa `META_PAGE_ACCESS_TOKEN`. |
| `AXIOMOS_APP_URL` | Recomendado: `https://axiomaisolutions.org`. Permite que el webhook llame a Brain desde el dominio canónico. |

Variables opcionales para una configuración avanzada:

| Variable | Valor predeterminado |
| --- | --- |
| `META_GRAPH_API_VERSION` | `v25.0` |
| `META_GRAPH_API_BASE_URL` | `https://graph.facebook.com` |
| `META_INSTAGRAM_GRAPH_API_BASE_URL` | Usa `META_GRAPH_API_BASE_URL` |
| `META_MESSENGER_SEND_URL` | Se construye con Page ID y Graph API. |
| `META_INSTAGRAM_SEND_URL` | Se construye con Instagram Account ID y Graph API. |

## Configuración en Meta

1. Confirma que la página AxiomAI Solutions y la cuenta profesional `axiomaisolutions` estén vinculadas en el mismo negocio de Meta.
2. En la aplicación de Meta que se usará para Messenger e Instagram, agrega el callback `https://axiomaisolutions.org/api/meta`.
3. Usa exactamente el mismo valor de `META_WEBHOOK_VERIFY_TOKEN` como Verify Token.
4. Suscribe los eventos de mensajes para Page y para Instagram.
5. Genera o renueva los tokens con los permisos que Meta requiera para mensajería de la página y de Instagram. Los requisitos de permisos y revisión dependen de la configuración de la aplicación y de Meta.
6. Añade todas las variables en Vercel Production y vuelve a desplegar la versión que incluye esta ruta.

## Prueba de aceptación

1. Envía un mensaje de texto desde una cuenta de prueba a Messenger de la página AxiomAI Solutions.
2. Confirma que AxiomOS responde una vez y que aparece un prospecto de Facebook Messenger en `/prospectos`.
3. Repite la prueba desde un DM de Instagram hacia `axiomaisolutions`.
4. Confirma que AxiomOS responde una vez y que aparece un prospecto de Instagram en `/prospectos`.

La ruta ignora ecos de la página, mensajes que no son texto y eventos duplicados recientes. Brain responde breve por mensajes directos para que la conversación se sienta natural.
