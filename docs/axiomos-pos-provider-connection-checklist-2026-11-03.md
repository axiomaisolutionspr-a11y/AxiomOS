# AxiomOS POS — Lista de conexión QA (2026-11-03)

Estado: preparación de software completada; NO conectado a banco ni producción. PR experimental.

## Componentes implementados
- Ruta privada de prueba /prospectos/cobros/qa.
- API /api/pos/qa/session: acceso individual QA con contraseñas scrypt y cookie firmada; requiere variables de Preview.
- API /api/pos/qa/catalog: solo sucursales, estaciones y catálogo del comercio QA autenticado.
- API /api/pos/qa/orders: orden en borrador y montos calculados por servidor con idempotencia.
- app/lib/pos/provider-handoff.ts: contratos ATH Business y Evertec Link con rechazo por defecto; **nunca procesa pagos reales**.
- 6/6 pruebas del adaptador, compilación Next.js y TypeScript aprobadas. ESLint de cambios: cero errores, dos advertencias.

## Configuración segura pendiente, exclusivamente Vercel Preview
- POS_QA_ENABLED=true.
- POS_QA_DATABASE_URL=conexión a una rama QA de Neon, NUNCA producción.
- POS_QA_DATABASE_HOST=host exacto de esa conexión QA.
- POS_QA_SESSION_SECRET=secreto aleatorio de al menos 32 caracteres.
- POS_QA_USERS_JSON=lista privada con username, passwordHash (scrypt$salt_hex$hash_hex), merchantId y actorId.
- Configurar secretos directamente en Vercel, no compartirlos por chat ni subirlos a GitHub.
- Se necesita un usuario de BD de privilegio mínimo con aislamiento de comercios probado mediante RLS. Los tests iniciales de Neon corrieron como propietario; el propietario puede omitir RLS.
- Implementar rate limiting, protección anti-fuerza-bruta y controles de acceso empresarial antes de exponer login a internet, incluso Preview.

## Pruebas funcionales pendientes
1. Crear usuarios, comercio y catálogo ficticio en rama QA y configurar variables de Preview.
2. Probar la sesión firmada: acceso válido, inválido, expirado y operador deshabilitado.
3. Verificar aislamiento real con dos comerciantes y rol de BD no propietario.
4. Probar guardar borrador, doble clic, retry tras timeout, inventario y auditoría.
5. Validar CSRF, rate limiting, concurrencia, recuperación y manejo seguro de errores.

## Requisitos de pago pendientes
ATH Business: cuenta mercantil activa, aprobación de integración, claves por comerciante y documentación vigente de callbacks. No hay entorno público de pruebas independiente confirmado; no realizar transacciones reales como ensayo.
Evertec Link: afiliación como integrador, contrato, SDK/documentación, modelo de terminal autorizado y certificación.
Ambos: eventos firmados, idempotencia por intento, conciliación independiente, confirmación de monto y comercio y reversos/reembolsos antes de activar el estado paid.

Fuentes oficiales:
- https://ath.business/preguntas
- https://github.com/evertec/ATHM-Payment-Button-API
- https://evertecinc.com/aliados/
- https://evertecinc.com/solucion/link/

NO se ha configurado ninguna credencial de proveedor. NO fusionar en producción.