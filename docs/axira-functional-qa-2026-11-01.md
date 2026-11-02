# Axira: recuperación y QA funcional aislado

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

45 aprobadas: 3 del clasificador, 27 del webhook con proveedores/SQL simulados,
10 del verificador de conexión y 5 de las barreras del ejecutor QA.
No queda el TODO de recuperación de Brain. TypeScript y generación de tipos
de Next.js deben pasar antes del commit de código.

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
