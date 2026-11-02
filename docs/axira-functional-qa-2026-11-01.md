# Axira: recuperación y QA funcional aislado

## Verificación posterior del canal activo

El usuario envió desde su teléfono un mensaje de prueba al WhatsApp corporativo
el 1 de noviembre a las 23:51 (Puerto Rico) y confirmó haber recibido la respuesta.
Los registros del despliegue de producción existente mostraron recepción del
webhook, guardado CRM, respuesta de Brain y aceptación de Dualhook HTTP 200.
Una lectura acotada posterior confirmó el mensaje, su respuesta persistida y
la existencia del prospecto. No se modificó el despliegue activo para esta prueba.

Esta comprobación valida el transporte del canal actual, no la entrega del menú
experimental a través del proveedor: el PR sigue sin fusionar y sin activar.

En la misma solicitud aparecieron `WHATSAPP_CONTACT_EMAIL_FAILED` y
`WHATSAPP_CONTACT_SMS_FAILED_OR_UNKNOWN`. No hay constancia de aceptación de
esos avisos en las notas del prospecto de prueba. No puede afirmarse su entrega
ni su causa únicamente con esos datos. Los avisos internos requieren diagnóstico
separado; la respuesta WhatsApp sí llegó según la confirmación del usuario.
No se reintentaron avisos para evitar duplicados y no se cambiaron credenciales.

## Diagnóstico posterior de avisos y reglas comerciales

El 2 de noviembre se reprodujo en Neon QA el defecto de los avisos internos:
los parámetros usados para añadir los marcadores de correo y SMS dentro de
`CONCAT_WS` no tenían tipo inferible. PostgreSQL devolvió `could not determine
data type of parameter $1`; las mismas consultas con `::text` se prepararon
correctamente. Se corrigieron los tres puntos: recibo de correo, reserva de
intento SMS y recibo de SMS. La aceptación del proveedor y el fallo al guardar
su recibo ahora tienen eventos distintos, para no volver a reportar como fallo
del proveedor un error posterior de persistencia.

No se reintentó el correo de la prueba real porque el proveedor pudo haberlo
aceptado antes del error del marcador. El SMS sí se detenía antes de llamar a
Telnyx, al fallar la reserva previa. Las pruebas nuevas usan proveedores
simulados; Preview mantiene correo y SMS apagados.

La revisión comercial confirmó además que el prompt autorizaba ofrecer un
“demo gratuito” sin una política validada y que describía de forma contradictoria
la relación con CRM. Se retiró esa oferta, se aclaró que el canal puede registrar
mensajes fuera de la respuesta de Brain pero que Brain no recibe confirmación
verificable de alertas o transferencias, y se añadió una regla de recuperación:
reconocer la preocupación, identificar el obstáculo y proponer un próximo paso
sin improvisar descuentos, garantías ni disponibilidad.

También se retiraron las tarifas promocionales de octubre, vencidas el 31 de
octubre de 2026. Axira debe pedir confirmación del alcance y de la propuesta
comercial vigente en vez de cotizar una promoción caducada.

El webhook real registra el mensaje en CRM antes de consultar Brain. Las
solicitudes explícitas de evaluación o asesor usan una respuesta determinista
del módulo CRM; esto es registro y aviso, no una transferencia humana en vivo.
La comprobación del texto comercial fue estructural y de integración; no se
reprodujeron las nueve conversaciones originales porque sus transcripciones no
formaban parte del material disponible.

## Resultado verificado

**17 casos funcionales aprobados con persistencia real en Neon QA** y **45
pruebas locales/CI aprobadas**, sin TODO. GitHub Actions #20 terminó con éxito.

- Commit probado: `458ab125ec871f21f34ce534f20e355178bda4be`.
- Preview READY: `dpl_4EL6TGgXRnJU7QEGiiM3akuWTpvh`.
- Run ID: `qa:axira:458ab125ec:90535394-9e2a-44af-907e-d7d6a496fd65`.
- Una llamada real al proveedor de Brain, con contexto e identidad ficticios.
- Cero llamadas reales a proveedores de WhatsApp, SMS o correo.
- Lectura independiente posterior: 13 respuestas simuladas completadas, un
  archivo sin respuesta y un envío simulado incierto bloqueado para revisión.
- Verificador del runtime HTTP 200: hostname QA y SELECT 1 correctos; menú,
  SMS y correos apagados y credencial de salida Dualhook ausente.

Se confirmó que los seis intereses se anotan una sola vez y que el nombre y la
empresa ficticios previamente confirmados permanecen intactos. El duplicado
concurrente real generó una sola respuesta simulada. Un fallo de Brain devolvió
503; su reentrega completó una sola respuesta y no duplicó el mensaje entrante.

La prueba real detectó y corrigió un defecto que el SQL simulado no podía
revelar: `CONCAT_WS` rechazaba el parámetro del interés con “could not determine
data type of parameter $1”. Se añadió `::text` al parámetro. La consulta
preparada se validó en PostgreSQL y la ejecución funcional completa aprobó.

Brain respondió en la conversación ficticia: “Podemos ayudar a Empresa Ficticia
QA Axira a organizar el inventario…” y preguntó por la cantidad de productos y
el control de entradas/salidas. Se verificó el historial enviado y la respuesta
persistida. En esa ejecución inicial no se modificó `app/api/brain/route.ts`;
la revisión comercial posterior sí ajustó sus reglas, todavía solo en el PR.

El detalle legible por máquinas se conserva en `axira-functional-qa-result.json`.
El código queda listo para revisión y eventual prueba controlada del transporte.
**No se probó entrega del menú experimental por el proveedor de WhatsApp ni se activó producción.**
La tabla nueva existe solo en QA: su aplicación en producción y las banderas de
recuperación/menú requieren una liberación posterior autorizada.

## Alcance de esta revisión

Solo PR #55 / `feature/axira-whatsapp-service-menu`. No fusionar ni activar
con clientes como consecuencia de un resultado de QA.

La tabla `axira_whatsapp_delivery` se crea mediante
`db/migrations/20261101_axira_delivery.sql`, aplicada inicialmente solo a
Neon QA `br-long-glitter-avo0yybm`. No se aplica durante un build ni en producción.

## Recuperación

`AXIRA_WHATSAPP_RECOVERY_ENABLED=true` requiere también un teléfono de
`AXIRA_WHATSAPP_TEST_PHONES`. Por defecto está desactivado, independientemente
del menú. No cambia el código o el prompt de Brain.

| Estado | Comportamiento |
| --- | --- |
| processing | Un propietario atómico prepara la respuesta; trabajo abandonado recuperable tras cinco minutos |
| retryable | Falló antes del envío; la reentrega puede recuperar el trabajo |
| sending | El envío comenzó; nunca se reclama automáticamente |
| sent | No se reenvía; se puede reparar el historial persistido |
| uncertain | Resultado externo incierto: requiere revisión, sin reenvío automático |
| ignored | Archivo registrado sin respuesta inventada |

Los fallos previos al envío en el flujo experimental devuelven HTTP 503 para
señalar el reintento al emisor del webhook. Los mensajes sin ID se rechazan en
el flujo experimental sin respuesta ni escrituras. La identidad y el texto se
comparan mediante hash para impedir reutilizar un ID con contenido distinto.
Los mensajes previos a la tabla de control no se reproducen automáticamente.

No se garantiza entrega exactamente una vez ante resultados externos inciertos:
un timeout puede ocurrir después de que un proveedor haya aceptado un envío.
El estado incierto impide duplicarlo; resolverlo exige revisar al proveedor.

## Pruebas locales

50 aprobadas en la revisión posterior: 3 del clasificador, 27 del webhook con
proveedores/SQL simulados, 10 del verificador de conexión, 5 de las barreras del
ejecutor QA, 4 de reglas comerciales y 1 suite de avisos con múltiples escenarios.
No queda el TODO de recuperación de Brain. TypeScript y generación de tipos
de Next.js aprobaron antes del commit de código.

## Ejecución con persistencia real

`scripts/axira-qa-run.cjs` se ejecuta después de `next build` únicamente cuando
`AXIRA_QA_RUN_COMMIT` coincide exactamente con el SHA de la rama experimental
en Preview. Comprueba el hostname QA, menú/correos/SMS apagados y ausencia de
credencial Dualhook antes de crear la conexión. Sin esa selección, no conecta.

Ejecuta el handler, el módulo CRM, el clasificador y la recuperación originales
en contextos VM separados. Usa SQL real de Neon QA. Todas las salidas WhatsApp,
SMS y correo están sustituidas o bloqueadas. Una conversación ficticia llama
a Brain y a su proveedor de IA reales; no se modifica Brain ni se mutan las
variables globales del proceso que sirve tráfico.

Los teléfonos pertenecen al rango ficticio reservado 202-555-01xx. Antes de
sembrar datos comprueba que ninguna identidad coincida con una empresa ajena
a sus fixtures. Conserva nombre y empresa confirmados. No borra filas, no
lee conversaciones ajenas y no envía comunicaciones a teléfonos reales.

Casos: seis servicios con CRM/historial y reentrega; continuidad con Brain real;
fallo de Brain y recuperación; duplicado concurrente; envío incierto sin repetir;
reparación de interés; teléfono no autorizado; caída de base de datos; ausencia
de ID o identidad; imagen sin texto; reset. El resultado compacto se imprime
como `AXIRA_QA_RESULT`, con runId, SHA, casos y número de llamadas reales a IA.

Si falla una aserción, el build falla. Los errores de drivers y los secretos
no se imprimen. La activación del menú y la recuperación del runtime del
Preview permanecen apagadas; solo el contexto aislado del ejecutor las activa.
