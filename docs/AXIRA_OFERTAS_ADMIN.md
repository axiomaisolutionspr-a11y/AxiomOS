# Catálogo comercial de Axira en QA

## Alcance

Piloto de AxiomAI con USD y mensualidad. La rama parte del PR #69, commit `3babd179ffbf598d3b016672699dd921977a3120`. La publicación comercial necesita una revisión adicional del acceso individual y de los adaptadores de salida.

El Preview aislado utiliza un usuario PostgreSQL de lectura y protección de acceso de Vercel. La edición y aprobación se verifican mediante pruebas HTTP con datos sintéticos. La identidad QA compartida es transitoria. El diseño SaaS requiere sesiones individuales revocables y aprobación vinculada al usuario.

## Comportamiento

- Los importes se almacenan en centavos. Se registran precio regular, promocional, activación, impuestos, gastos externos y condiciones.
- Los horarios se introducen en hora de Puerto Rico y se guardan como `timestamptz`. El intervalo incluye el inicio y excluye el vencimiento. Una oferta que vence a las 17 horas deja de poder cotizarse a esa hora.
- La consulta verifica aprobación, horario y canal con el reloj de PostgreSQL. La pantalla deriva sus estados del mismo reloj.
- Una restricción de exclusión de PostgreSQL impide aprobar intervalos superpuestos para un mismo servicio. Este piloto también rechaza el solapamiento entre canales distintos del mismo servicio.
- Las aprobaciones y pausas comprueban la revisión esperada. La auditoría se escribe en la misma sentencia SQL que el cambio.
- El identificador de solicitud evita duplicar un borrador al reintentar el envío del formulario.
- Los cupos máximos son una condición comercial. La disponibilidad se comunica como pendiente de confirmación hasta conectar un registro fiable de reservas o contrataciones.
- Los precios salen de plantillas deterministas. La respuesta incluye vencimiento y condiciones. Si todas las condiciones no caben en el límite del canal, se pide confirmar con el equipo sin cortar el texto aprobado.
- La falta de datos en inglés impide cotizar condiciones incompletas en ese idioma.
- Las consultas ambiguas piden seleccionar el servicio. Una caída de la base se comunica como imposibilidad de verificar.
- Las alertas a 72 horas y las recomendaciones de revisión se muestran en el panel. La notificación proactiva programada queda pendiente.

## Configuración aislada

| Variable | Uso |
| --- | --- |
| `AXIRA_OFFERS_QA_ENABLED` | Habilita el piloto con valor `true` |
| `AXIRA_OFFERS_QA_DATABASE_URL` | Credencial dedicada a `axiomos_offers_qa` |
| `AXIRA_OFFERS_QA_DATABASE_HOST` | Host QA exacto autorizado |
| `AXIRA_OFFERS_QA_REVIEW_ONLY` | Activa la vista de consulta y bloquea acciones |
| `AXIOMOS_CRM_ACCESS_PIN` | Acceso de la prueba de edición en entorno aislado |
| `AXIOMOS_OFFERS_APPROVAL_KEY` | Segunda clave QA de al menos 24 caracteres |

La configuración funciona en Preview o en desarrollo local. El entorno de producción bloquea el piloto. Se rechaza una conexión al mismo host normalizado que `DATABASE_URL`. El usuario de lectura del Preview carece de permisos para insertar, actualizar o borrar y carece de acceso de lectura a las tablas CRM de `neondb`.

El proyecto `axiomos-autopilot-qa` tiene sus propias variables Preview. El despliegue automático de esta rama se deshabilita mediante una entrada exacta de `git.deploymentEnabled`, para aislar la revisión del proyecto que sirve el negocio.

## Migración

La migración `database/migrations/20261106_axira_offers.sql` comprueba el nombre de la base y crea el esquema `axiomos_commercial`. Se aplicó únicamente a la base vacía `axiomos_offers_qa` de la rama Neon QA de Axira. Es transaccional e idempotente en su esquema actual. Cambios futuros de estructura necesitan otra migración versionada.

La tabla `public.axiomai_offers` del borrador inicial del PR #69 se sustituye por el esquema del piloto. Los catálogos anteriores requieren una importación revisada que preserve su fuente y vigencia. La lectura utiliza exclusivamente la conexión dedicada.

## Pruebas reproducibles

```bash
npm ci
node --test tests/axira-offers-policy.test.mjs tests/axira-offers-database.test.mjs tests/axira-reply-policy.test.mjs
npx next typegen
npx tsc --noEmit
npm run build
node --test tests/axira-offers-http.test.mjs
```

Las pruebas PostgreSQL locales utilizan PGlite y la migración exacta. La prueba HTTP inicia Next.js compilado, envía los formularios reales y llama a `/api/brain`. Su transporte SQL utiliza PostgreSQL local. OpenAI está sustituido por una respuesta deliberadamente incorrecta para comprobar el bloqueo. Toda salida de red de ese proceso de prueba se rechaza salvo esos transportes controlados.

`tests/axira-offers-neon-qa.sql` contiene las comprobaciones ejecutadas también sobre PostgreSQL 18.6 de Neon QA. Su subtransacción revierte los datos sintéticos. La prueba de concurrencia se ejecutó mediante dos transacciones simultáneas y comprobó una sola oferta aprobada. El cierre dejó cero ofertas aprobadas y cuatro eventos de auditoría de las dos muestras sintéticas.

## Recuperación

1. Desactivar `AXIRA_OFFERS_QA_ENABLED` en el proyecto aislado y generar otro Preview.
2. Conservar la base QA y su auditoría para revisión.
3. Restaurar el código desde el commit base del PR #69 o desde el respaldo verificado. El archivo completo se dividió en partes y su flujo comprimido se verificó íntegramente. SHA-256 del flujo `3eddccb02cad8802b79450e272160aca164182425621c246f6c3323bdabfd9e5`.
4. Revisar las sesiones y privilegios antes de volver a habilitar la edición.

## Siguiente puerta de publicación

Se requiere autorización expresa para producción y evidencia adicional de identidad individual, aprobación vinculada a esa identidad, límites de intentos, aislamiento multiempresa, pruebas de adaptadores reales, verificación al enviar y conciliación de mensajes en tránsito. La protección por reglas del texto del modelo es complementaria y necesita evaluación adversarial continua. Telnyx utiliza además un asistente externo que requiere integrar el mismo catálogo antes de afirmar consistencia de precios por voz.
