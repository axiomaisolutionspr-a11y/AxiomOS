# AxiomOS Autopilot — lectura segura del CRM anterior (2026-11-08)

## Seguridad y alcance
- El CRM antiguo permanece operativo y no cambia sus tablas, filas, notas, ni estados.
- Respaldo Neon: `snap-mute-grass-avupmkvw`; rama de copia: `br-wandering-bonus-avoc9qe3`; rama de restauración de prueba: `br-proud-frog-avxt19iu`.
- La rama original de producción `br-square-field-avmxjhvf` volvió a ser `main` y rama por defecto.
- El código de este PR muestra únicamente un **conteo de prospectos** después de autenticar a un miembro activo del tenant axiomai. No presenta datos identificables ni escribe en el CRM anterior.
- Solo en producción y si `AXIOMOS_AUTOPILOT_PROSPECTS_READ_ENABLED=true`. Por defecto permanece desactivado.
- El rol actual `axiomos_commercial_reader` no tiene acceso a `public.prospects`. Antes de activar, evaluar y probar una política de privilegios que autorice solo SELECT en la tabla estrictamente necesaria. No otorgar acceso a INSERT, UPDATE ni DELETE.
- Ante falta de permisos, error o respuesta inesperada: mantiene «Sin conexión» y registra un código genérico sin divulgar datos ni secretos.

## Verificaciones obligatorias antes de desplegar
1. QA de compilación y ruta autenticada.
2. Confirmar que el operador puede ver únicamente el total autorizado y no ejecutar mutaciones.
3. Comprobar la revocación de sesiones y el rechazo de acciones de escritura no autorizadas.
4. Verificar privilegios SELECT restringidos y comparar conteos con los 33 originales.
5. Validar integración de consulta y ausencia de regresión en /prospectos/simple, WhatsApp y Telnyx.
6. Preparar despliegue de producción solo después de aprobar los controles.
