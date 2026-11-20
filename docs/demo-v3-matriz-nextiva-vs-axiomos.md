# AxiomOS Autopilot vs. Nextiva (y CRM líderes) — matriz y mejoras del DEMO v3

**Fecha:** 19 nov 2026 · **Rama:** `feature/demo-comercial-v3-nextiva-20261119` (sale de `feature/demo-comercial-v2-20261117` @ `a3ee049`, PR #115)
**Respaldo verificable:** la rama v2 queda intacta en GitHub, y `backup/demo-comercial-v2-antes-v3-20261119` apunta a `a3ee049`.

## 1. Qué se auditó (Fase A)

| Elemento | Estado real comprobado |
|---|---|
| DEMO terminado | PR #115, rama `feature/demo-comercial-v2-20261117`, último commit `a3ee049` (17 nov). `main` (`cc7c306`) no contiene el DEMO. |
| Pantalla `/demo-comercial` | Acceso privado con código, 3 industrias, chat guiado con respuestas preparadas, captura de prospecto ficticio, CRM con ficha, estado editable, historial, gráficos de pulso. |
| API `/api/demo-comercial` | GET/POST/PATCH con sesión firmada, mismo origen, validación de datos ficticios (787-555-01XX, nombre «ficticio/a», canal «simulado»). Falla cerrado si la conexión no es la base QA. |
| Base | Neon proyecto `icy-field-92690259`, rama `qa-whatsapp-delivery-cert-20261116`, base `axiomai_demo_comercial_qa`, tabla `demo_leads` (11 columnas, CHECK de industria/estado/prioridad/teléfono). 5 registros ficticios. |
| Evidencia previa | Hay 2 registros «QA Auto…» del 19 nov 04:54 con historial completo y uno en «Ganado»: el POST y el PATCH ya funcionaron de punta a punta. No se repitió esa prueba contra Neon. |
| Plataforma principal (fuera del DEMO) | Axira por OpenAI en `/api/brain`, WhatsApp/Messenger/Instagram por Meta y Dualhook, llamadas y SMS por Telnyx, campañas con bajas, catálogo de ofertas con política, cola de seguimientos con compuertas, identidad por empresa con roles propietario/operador/consulta. **No se tocó.** |

## 2. Fuentes de Nextiva y CRM líderes (Fase B)

Las URLs del encargo no se pudieron abrir directamente desde esta sesión; se consultaron por búsqueda y en las páginas equivalentes: nextiva.com/products/platform, help.nextiva.com (NEXT Studio y Workflows), nextiva.com/products/business-intelligence y reputation-management. Para precios y XBert también se usaron análisis independientes (getvoip.com, cloudtalk.io; este último es un competidor). Como «mejor CRM» se tomaron HubSpot (primer puesto en la mayoría de los rankings 2026), Salesforce Agentforce y GoHighLevel (líder en negocios locales).

**Precios de Nextiva (no confundir planes con complementos):** NEXT Core $15, Engage $25 y Scale $75 por usuario al mes (anual). XBert se cobra aparte: $99/mes con 100 sesiones y $0.99 por sesión adicional en el plan publicado. Chat en vivo y chatbot no están en Core. La supervisión de agentes solo está en Scale. Contact Center es otra línea, desde $75 por agente.

## 3. Matriz comparativa (Fase C)

Leyenda: **SUP** superior · **EQ** equivalente · **MEJ** mejorable · **FALT** faltante · **NC** no conveniente · **NV** no verificado.
«Antes» = DEMO v2. «v3» = esta rama.

| Funcionalidad | Nextiva (cómo funciona) | AxiomOS antes → v3 | Clasif. | Prioridad | Costo / dependencia | Verificación |
|---|---|---|---|---|---|---|
| Ficha única del cliente | Registro con todas las interacciones; panel con valor de vida, sentimiento y actividad | Ficha con historial → **+ resumen, intención, tono, SLA, responsable, seguimiento y bitácora** | MEJ→EQ | P0 | Ninguno | E2E «Ficha muestra inteligencia» |
| Puntuación de prospectos | XBert califica; HubSpot y Salesforce puntúan con IA de caja negra | Prioridad Alta/Media → **puntuación 0–100 con la razón de cada punto** | FALT→**SUP** (explicable) | P0 | Ninguno | 15 pruebas unitarias |
| Detectar prospectos olvidados | Seguimientos automáticos; «reactivation» de GoHighLevel | No existía → **SLA por etapa (1 h / 24 h / 48 h), filtro «Olvidados» y tarea de rescate** | FALT→EQ | P0 | Ninguno | E2E: 3 olvidados detectados |
| Próxima mejor acción | Agent Assist sugiere pasos; HubSpot Deal Progression | Texto fijo → **plan por prospecto según el flujo y la política** | MEJ→EQ | P0 | Ninguno | E2E plan + aprobación |
| Niveles de autonomía | Tres modos: agente IA completo, supervisado y asistente | No existía → **Asistir / Supervisado / Autonomía controlada** | FALT→EQ | P0 | Ninguno | E2E: Asistir = 0 ejecutadas |
| Barreras de seguridad | Temas prohibidos, reglas de verificación, escalación | Validación de datos ficticios → **política por tipo de acción: cobro prohibido, envío externo bloqueado sin canal y consentimiento, texto al cliente siempre con aprobación** | MEJ→**SUP** (bloqueo duro y probado) | P0 | Ninguno | 3 pruebas unitarias + 2 E2E |
| Transferencia IA → humano | Con transcripción, resumen, historial y siguiente paso | No existía → **transferencia con resumen al vendedor asignado** (riesgo, pide llamada o puntuación ≥70) | FALT→EQ | P1 | Ninguno | Prueba unitaria «en riesgo» |
| Respuestas sugeridas | Borradores que el empleado aprueba | No existía → **borrador editable; aprobar no lo envía** | FALT→EQ | P1 | Ninguno | E2E: 0 llamadas al aprobar |
| Evitar respuestas duplicadas | No documentado | **Se bloquea un texto igual a uno ya escrito o aprobado** | FALT→**SUP** | P1 | Ninguno | Prueba unitaria + E2E |
| Asignación inteligente | Enrutamiento por prioridad, habilidad y ubicación | No existía → **por especialidad y menor carga** (equipo ficticio) | FALT→EQ | P1 | En producción: tabla de usuarios | Prueba unitaria |
| Constructor visual de flujos | NEXT Studio: lienzo de nodos, plantillas por canal, condiciones y scripts | No existía → **flujo de 8 pasos con activar/desactivar y aprobación por paso** | FALT→MEJ (más simple que Studio, sin condiciones ramificadas) | P1 | Ninguno | E2E pasos |
| Bitácora de auditoría | Visibilidad de interacciones de IA; HubSpot «Audit Cards» | No existía → **cada acción con fecha, resultado, quién y dónde quedó guardada** | FALT→EQ | P0 | Ninguno | E2E: sobrevive a recarga |
| Búsqueda de conversaciones | Inbox con filtros | No existía → **búsqueda sin acentos en nombre, canal e historial, más filtros** | FALT→EQ | P1 | Ninguno | E2E |
| Panel comercial | 250+ plantillas de informe, sentimiento, tablero en vivo | 3 gráficos → **embudo, conversión por canal, carga por vendedor, alertas y productividad de Axira** | MEJ | P1 | Ninguno | Prueba unitaria de métricas |
| Valor de oportunidades, tiempo de respuesta, costos | Sí, con datos reales | **No medido: se dice en pantalla en lugar de inventarlo** | NV | P2 | Montos del catálogo y registros de entrega | — |
| Bandeja omnicanal real | Voz, SMS, correo, social y reseñas en un inbox | En la plataforma real: WhatsApp, Messenger, IG, SMS, llamadas (por separado). En el DEMO: simulado | MEJ | P2 | Unificar vistas; sin costo de proveedor nuevo | — |
| Recepcionista de voz IA | XBert contesta llamadas 24/7 ($99/mes + sesiones) | Telnyx tiene llamadas del asistente en el CRM real; no en el DEMO | MEJ | P2 | Minutos Telnyx + modelo de voz: **requiere tu autorización** | — |
| Agenda / citas | Reserva en Google y Outlook | Solo «cita solicitada», sin confirmar | FALT | P2 | OAuth de calendario: **requiere autorización** | — |
| Reseñas y reputación | Inbox de reseñas, respuestas con IA | No existe | FALT | P3 | API de Google Business | — |
| Supervisión de agentes en vivo | Solo en plan Scale | No aplica al tamaño actual | NC | P3 | — | — |
| Cotizaciones | No es su fuerte | No implementado: sin precios verificados no se generan cotizaciones (regla de Axira) | NV | P2 | Catálogo de ofertas aprobado | — |
| Industrias | Plantillas genéricas | 3 sectores; la base QA solo acepta esos 3 | MEJ | P2 | Migración QA para hoteles, veterinarias y oficinas | — |
| Español / inglés | 23+ idiomas en XBert | Brain y la app ya son bilingües; el DEMO v3 está en español | MEJ | P2 | Ninguno | — |

## 4. Dónde AxiomOS ya es superior, con pruebas

1. **Seguridad demostrable:** el bloqueo de cobros y envíos no depende de configuración; lo fija el código y lo verifican pruebas. Nextiva remite a reglas que configura el administrador, y según la reseña de GetVoIP, la guía de XBert como producto independiente da permisos de administrador a todos los usuarios añadidos.
2. **Explicabilidad:** cada punto de la puntuación tiene su razón visible. Las puntuaciones de HubSpot y Nextiva no muestran ese desglose.
3. **Persistencia honesta:** si la base no confirma, se registra «error» y la etapa no cambia (prueba E2E con fallo forzado).
4. **Sin datos inventados:** lo que no se puede medir aparece como «no medido».
5. **Costo:** v3 no añade ningún proveedor, modelo de IA ni cargo por sesión. XBert empieza en $99/mes más $0.99 por sesión extra.

## 5. Persistencia en Neon QA (hecho el 19 nov, tarde)

- Migración `database/migrations/20261119_demo_autopilot_v3_qa.sql`, aplicada **solo** en `axiomai_demo_comercial_qa`:
  - `demo_lead_ops`: responsable, seguimiento y transferencia.
  - `demo_autopilot_events`: la bitácora.
- **Bitácora de solo agregar:** el rol de la app puede insertar y leer, pero no editar ni borrar. Se comprobó con `has_table_privilege` como `axiomai_demo_qa_writer`.
- **Una sola resolución por acción:** un índice único parcial en `action_key`. Los errores sí se pueden reintentar. Si otra sesión ya resolvió la acción, el endpoint responde 409 y la vista se resincroniza.
- **Atomicidad:** evento y operación se guardan en una sola sentencia. Se probó como el rol de la app y se deshizo: evento nuevo, duplicado y reintento tras error.
- Endpoint `/api/demo-comercial/autopilot` con la misma sesión firmada, comprobación de origen y fallo cerrado que el endpoint actual.
- Si Neon QA no responde, la anotación queda en el navegador y la pantalla lo dice.
- Banco E2E: **37/37 PASS**.

### IA real en la conversación (autorizada el 19 nov)

- Ruta `/api/demo-comercial/axira`, con instrucciones propias de cada sector ficticio.
- Usa una clave exclusiva del DEMO, **`AXIOMAI_DEMO_OPENAI_API_KEY`**. No reutiliza la clave de producción.
- Tope diario atómico en `demo_ai_usage` (`AXIOMAI_DEMO_AI_DAILY_CAP`, 200 por defecto); se probó con tope 2.
- Las preguntas de precio no llegan al modelo, y si una respuesta trae montos se reemplaza.
- Se rechazan teléfonos fuera de 787-555-0100 a 0199 y cualquier correo.
- `store:false`, sin acciones externas.
- Sin la clave, el campo aparece deshabilitado con un aviso.
- Pruebas: E2E **41/41**, filtro de datos 3/3, motor 15/15.

## 6. Pendiente (decisiones y trabajo)

- **Ver v3 en Vercel:** las variables Preview del DEMO están limitadas a la rama v2. Para probar v3 con Neon QA en Preview hay que copiar esas 4 variables a la rama v3 (sin cambiar valores ni producción) **o** fusionar v3 dentro de la rama v2. Decisión tuya.
- Condiciones ramificadas en el flujo (horario, canal, palabra clave), al estilo de NEXT Studio.
- Calendario real, reseñas, voz, cotizaciones con el catálogo verificado, más industrias y versión en inglés del DEMO.
