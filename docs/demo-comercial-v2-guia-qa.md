# DEMO comercial AxiomAI Solutions — guía de presentación y QA

**Entorno:** exclusivamente Preview de Vercel de la rama `feature/demo-comercial-v2-20261117`. **Nunca** probar con prospectos reales ni publicar credenciales.

## URL de trabajo
https://axiomai-solutions-git-feature-demo-com-b3374b-axiomai-solutions.vercel.app/demo-comercial

La autenticación es privada y está separada del PIN productivo. La credencial temporal configurada en Vercel Preview caduca automáticamente; su valor no se almacena en este repositorio.

## Recorrido comercial (aproximadamente 3–5 minutos)

1. **El problema (30 segundos):** mostrar cómo una consulta puede quedarse sin seguimiento si se maneja manualmente.
2. **Elegir industria (20 segundos):** seleccionar dealer, restaurante u óptica. La infraestructura es una sola; solo cambia el caso de negocio.
3. **Axira atiende (1 minuto):** pulsar las preguntas preparadas o el botón «Ejecutar recorrido guiado completo». Aclarar que son respuestas **simuladas** y no la integración productiva de WhatsApp, Instagram ni Messenger.
4. **CRM (1 minuto):** observar que el prospecto **ficticio** aparece en AxiomOS CRM con canal, historial, prioridad, estado y próxima acción.
5. **Seguimiento y oportunidad (1 minuto):** cambiar el estado de la ficha; refrescar para comprobar si persiste en Neon QA. No declarar aprobadas integraciones externas ni citas confirmadas.
6. **Cierre (30 segundos):** explicar qué componentes se adaptarían al negocio del prospecto y mostrar «Solicitar implementación».

## Casos de prueba manual pendientes de aceptación

- [ ] Iniciar sesión utilizando la credencial propia del Preview, nunca el PIN del CRM.
- [ ] Confirmar que aparecen dealer, restaurante y óptica.
- [ ] Cambiar de sector y observar que cambia el diálogo.
- [ ] Pulsar una pregunta y comprobar que se añaden los dos turnos (cliente + Axira).
- [ ] Ejecutar el recorrido guiado y observar mensaje de confirmación de Neon QA.
- [ ] Verificar que el contador del CRM aumentó en una unidad y que se puede seleccionar el nuevo prospecto.
- [ ] Revisar nombre ficticio, canal, prioridad, historial y próxima acción.
- [ ] Cambiar estado en el CRM, recargar y comprobar persistencia.
- [ ] Probar nombre no ficticio y número fuera del rango 787-555-0100 a 787-555-0199; el frontend debe impedir su registro.
- [ ] Abrir el mismo Preview en pantalla de teléfono, revisar desplazamiento, botones y accesibilidad.
- [ ] Cerrar sesión y comprobar que la API queda protegida sin la cookie.

## Evidencia técnica previa

- Compilación del Preview y comprobación de TypeScript aprobadas (último estado: Vercel READY).
- GET `/demo-comercial`: HTTP 200.
- Sin sesión: GET `/api/demo-comercial/session` indica `authenticated:false`; GET protegido no expone prospectos.
- Neon QA: registros de prueba para dealer, restaurante y óptica, en base de datos separada `axiomai_demo_comercial_qa`.
- Acciones POST/PATCH desde el navegador y pruebas visuales de móvil: **pendientes**, no calificarlas de PASS.
- Sin comunicaciones externas, cambios productivos, migraciones de datos de clientes ni merge a main.

## Limitaciones transparentes

La conversación es guiada con respuestas predefinidas; esta versión todavía no genera respuestas con un LLM en tiempo real. La clasificación y recomendaciones son de reglas de demostración y no representan una decisión comercial automática real. No hay reservas confirmadas, llamadas, SMS ni mensajes de WhatsApp reales.
