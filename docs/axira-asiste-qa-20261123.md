# Axira Asiste — fase inicial de copiloto QA (2026-11-23)

## Estado

Implementación propuesta solo en la rama feature/axira-asiste-copilot-qa-20261123.
Sin cambios en producción, CRM actual, envíos, credenciales, webhooks, Dualhook, Telnyx o Meta.
No declarar certificación ni funcionamiento productivo hasta completar pruebas independientes.

## Alcance actual (MVP QA)

- /prospectos/autopilot/axira-asiste: formulario de conocimiento del negocio y conversación introducidos manualmente, análisis, tres borradores editables, consejo comercial y siguiente paso.
- /api/autopilot/axira-asiste: la ruta exige Preview + autenticación comercial QA; las llamadas al proveedor quedan bloqueadas salvo que exista una clave/modelo QA dedicados y la variable AXIRA_ASISTE_QA_PROVIDER_ISOLATED=true.
- app/lib/axira-asiste.mjs: validación estricta de entrada, contexto y salida de modelo.
- No se consulta la tabla productiva prospects, no se toca DATABASE_URL, no se sincroniza Meta/WhatsApp/Telnyx.
- No hay envíos, aprobaciones persistidas, tareas ni escritura de base de datos. Copiar solo utiliza el portapapeles local.
- El conocimiento de cada negocio es temporal para la consulta. Aún no es multi-tenant SaaS.

## Activación (solo después de revisar el aislamiento)

La ruta y la pantalla permanecen inaccesibles salvo que se cumplan todas estas condiciones:

1. VERCEL_ENV=preview (excluye producción incluso si hubiera una bandera mal puesta).
2. AXIRA_ASISTE_QA_ENABLED=true en un Preview QA autorizado, nunca en producción.
3. Identidad individual Neon QA correctamente configurada (AXIOMOS_INDIVIDUAL_AUTH_QA_ENABLED=true y credenciales QA ya aisladas).
4. El usuario tiene membresía activa owner u operator; viewer no puede usar el servicio.
5. AXIRA_ASISTE_OPENAI_API_KEY_QA, AXIRA_ASISTE_MODEL_QA y AXIRA_ASISTE_QA_PROVIDER_ISOLATED=true están establecidos únicamente después de confirmar que la credencial y el proveedor son exclusivos de QA. No se usan OPENAI_API_KEY ni OPENAI_MODEL como respaldo.

No cambiar llaves, tokens, URLs de bases de datos, permisos o variables existentes sin autorización separada. Si la configuración de QA no está completa, el módulo falla cerrado.

La API llama únicamente al proveedor de IA para generar sugerencias; la comunicación externa genera costo y solo ocurre después de habilitar esta función en Preview y de la acción del usuario. No almacenar solicitudes ni respuestas en el CRM. El proveedor puede procesar el texto enviado; usar solamente datos ficticios en pruebas iniciales. La petición a Responses API establece store:false, lo que no sustituye una revisión de tratamiento de datos.

## Pruebas propuestas

Comando local de pruebas unitarias sin servicios externos:

    node --test tests/axira-asiste.test.mjs

Verificar en QA:

- Sin bandera o fuera de Preview: 404.
- Sin sesión: 401 / redirección a acceso.
- Sin membresía o rol viewer: 403 / acceso denegado.
- Origen ajeno: 403.
- Entrada incorrecta: 400/413.
- Proveedor sin configurar: 503.
- Proveedor rechazado o respuesta no válida: 502 sin envíos.
- Solicitudes sintéticas con respuestas rápidas, empáticas y comerciales; verificar coherencia con conocimiento empresarial.
- Comprobar que el modelo no invente precios, descuentos ni citas.
- Probar inyección de prompts dentro de mensajes y contexto del negocio.
- Revisar costos y límites de uso antes de permitir pruebas concurrentes.

## Riesgos / fases pendientes

1. Sin conexión a chats reales: integrar por APIs de lectura autorizadas y aislamiento por empresa antes de pasar contactos reales.
2. Sin almacén de conocimiento por negocio: diseñar tabla/almacenamiento QA, permisos por tenant, versionado, caducidad de ofertas y recuperación de fuentes.
3. Sin control de cuota distribuido: limitar llamadas y gastos de forma robusta antes de comercializar.
4. Sin aprobación registrada ni envío: construir flujos de revisión, consentimiento, plantillas autorizadas y ventanas de servicio por canal.
5. Sin métricas de producción: evaluar precisión, utilidad, privacidad, latencia y rendimiento con escenarios simulados.
6. Sin verificación E2E ni build validado en el momento de crear estos cambios: ejecutar CI y pruebas QA antes de fusionar o desplegar.
7. Revisar previews automáticos de Vercel; ningún merge a main está autorizado por este documento.

## Decisión arquitectónica

Axira Asiste es el nombre del copiloto integrado y Axira Agente sigue siendo la asistente que interactúa directamente con clientes. Sus permisos y rutas deben permanecer separados. El MVP comienza sin acciones externas para demostrar utilidad antes de permitir automatización.


## Integración visual con el CRM (QA, 2026-11-23)

Se añadió Axira Asiste como panel dentro de la ficha del prospecto en el CRM compartido con el demo:

- El componente está montado en la misma interfaz CRM, debajo de Ver la conversación.
- El servidor solo lo habilita para /prospectos/demo cuando VERCEL_ENV=preview y AXIRA_ASISTE_QA_ENABLED=true.
- La vista de contactos reales /prospectos/simple no pasa el permiso y sigue sin mostrar el panel ni enviar información a la IA.
- El panel reutiliza la API QA existente y exige su sesión individual Neon QA; el CRM demo por sí mismo no da permiso para llamadas al modelo.
- El adaptador acepta exclusivamente datos ficticios de demostración, excluye teléfono y notas y rechaza historiales cuyo último mensaje es del negocio.
- El cliente controla la consulta manualmente y puede revisar, editar y copiar sugerencias sin enviar mensajes.
- No se cambió ninguna variable de entorno, llave, base, webhook, integración, DNS, token o número telefónico.
- El diseño y las pruebas se mantienen en la rama de QA y el PR #123 continúa en borrador.

Antes de llevarlo al CRM de prospectos reales se necesita una revisión separada de autorización, aislamiento de tenant, lectura de conversaciones y protección de datos personales. La integración real no está activada ni certificada.
