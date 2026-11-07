# Catálogo de ofertas para Axira (QA primero)

## Objetivo
Evitar anuncios automáticos de tarifas vencidas. Las ofertas ahora se guardan separadas de los prompts del asistente. **No hay ofertas cargadas ni activadas automáticamente.** Los precios de octubre de 2026 caducaron el 31/10/2026.

## Flujo de administración
1. Crear un respaldo de la base de datos antes de cualquier migración. Confirmar primero que se usa la base **QA**, no la de producción.
2. Ejecutar solo en la base QA la migración `database/migrations/20261106_axira_offers.sql`. Es aditiva.
3. Configurar en el ambiente QA la variable secreta `AXIOMOS_OFFERS_APPROVAL_KEY` con un valor aleatorio de 16 caracteres o más, generado por el administrador. Nunca usar el PIN del CRM como clave de aprobación. No publicarla en GitHub, capturas ni mensajes.
4. Entrar al CRM en QA y abrir `/prospectos/ofertas`.
5. Crear un borrador con nombre, precios mensuales y activación, fecha de inicio, fecha de vencimiento y condiciones. El borrador **no llega a clientes**.
6. Revisar el borrador. Publicarlo con `APROBAR` y la clave de aprobación. Las ofertas aprobadas se muestran SOLO entre las fechas indicadas según `America/Puerto_Rico`, incluyendo el día final.
7. Si hay un error o cambian las condiciones: `PAUSAR` inmediatamente, registrar una oferta nueva corregida y aprobarla. No editar historiales de ventas. El estado se consulta en cada solicitud; no hay caché de ofertas.
8. Probar en un entorno QA: “¿Qué ofertas tienen?”, “¿Tienen promociones?”, consulta al día posterior a vencer, contacto por WhatsApp y por Messenger/Instagram. No enviar mensajes reales en QA.
9. Tras pasar las pruebas, crear un respaldo de producción y solicitar autorización antes de aplicar migración/configuración y desplegar cambios.

## Seguridad / límites
- La interfaz está bajo el acceso privado CRM existente, pero el CRM todavía usa un PIN compartido. Publicar requiere una segunda clave fuerte; **no equivale a sesiones individuales**.
- No publicar ofertas sin haber verificado los importes y términos contractuales.
- Los cupos máximos son informativos; no se calculan ventas agotadas de manera automática. Axira debe indicar que la disponibilidad está sujeta a confirmación.
- No se generan campañas ni mensajes salientes al publicar. Solo aplica a respuestas ante consultas.
- Si falta la tabla o la base no está disponible, el asistente **no** anuncia promociones.
- El sistema no verifica precios estándar cuando no hay oferta vigente. Axira pide cotización, sin inventar precios.
