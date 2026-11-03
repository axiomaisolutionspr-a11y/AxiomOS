# AxiomOS POS — pruebas HTTP QA (2026-11-03)

Entorno: sandbox Next.js aislado. No se modificó producción ni se activaron pagos.

| Petición sin sesión | Respuesta obtenida |
|---|---|
| GET /api/pos/qa/session | 401 |
| GET /api/pos/qa/catalog | 401 |
| GET /api/pos/qa/orders | 401 |
| POST /api/pos/qa/session sin cabecera Origin | 403 |
| POST /api/pos/qa/orders sin cabecera Origin | 403 |
| DELETE /api/pos/qa/session sin cabecera Origin | 403 |
| GET /prospectos/cobros/qa sin PIN de CRM en sandbox | 503 |

Las pruebas HTTP autenticadas no se completaron: el entorno bloqueó el intento de obtener secretos internos del proceso para un runner temporal. No se eludió la restricción. No afirmar que login correcto, cookie, catálogo, borrador y logout fueron validados de extremo a extremo.

Pruebas SQL anteriores: conexión con usuario Neon restringido sin BYPASSRLS, aislamiento de lecturas 0/A=1/B=0, creación de borrador y reintento, rechazo sin contexto. Contador SQL 1...6 funcionó, pero no se verificó el HTTP 429 de forma end-to-end.

Riesgo pendiente: logout borra cookie del navegador pero no revoca en servidor una cookie firmada que se haya copiado antes de expirar. Debe añadirse revocación de sesiones y límites por origen confiable antes de producción.

Conclusión: mantener la rama de POS QA fuera de producción y no habilitar pagos bancarios hasta E2E autenticado con credenciales gestionadas por mecanismos aprobados.