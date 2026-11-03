# QA POS — Órdenes e inventario (3 nov 2026)

**Implementación aislada en Neon QA**, no en producción. Base de pruebas: rama `pos-location-integrity-qa-20261103`. La rama GitHub `fix/pos-station-location-qa-20261103` tiene el esquema y migración en `database/migrations/20261103_pos_inventory_draft_qa_only.sql`.

## Realizado
- Tablas `pos_inventory_balances` y `pos_inventory_movements` por comercio, sucursal y artículo con restricciones de claves foráneas, índices, límites y eventos.
- Función `pos_qa_create_draft_order`: sólo operadores activos autorizados; verifica la estación y su local; consulta SKU/precio/IVU al catálogo propio del comercio; guarda líneas, snapshots y totales calculados en servidor; devuelve el mismo ID si se repite exactamente la solicitud con la misma clave; rechaza reutilizar la clave con datos distintos.
- Función `pos_qa_adjust_stock`: sólo propietarios y administradores; movimientos de inventario atómicos, auditados e idempotentes, con bloqueo por clave y protección de saldos no negativos.
- Las funciones son **SECURITY INVOKER** y revocan EXECUTE a PUBLIC. En la fase siguiente hace falta una estrategia rigurosa de roles con privilegios mínimos y RLS real vinculada a la identidad, antes de conectarlas a endpoints HTTP.
- Ninguna de estas funciones procesa tarjetas, emite factura fiscal, marca ventas como pagadas o descuenta stock automáticamente con una venta.

## Verificación en Neon QA
- Migración adicional aplicada: **10 instrucciones SQL aprobadas**.
- Prueba integral SQL ejecutada con éxito: orden de 2 unidades de $10 y 11.5% de IVU → subtotal 2000¢, IVU 230¢, total 2230¢, estado draft.
- Repetición idéntica devuelve el mismo ID.
- Reintento con payload diferente y la misma clave se rechaza.
- Ajuste +10 de inventario, reintento idempotente sin movimiento duplicado.
- Ajuste -11 con saldo 10 se rechaza.
- Empleado cashier no puede ajustar inventario.
- Comercio ajeno no puede crear pedido usando estación y operador del primero.
- El historial contabiliza solo un movimiento tras reintentos.
- Prueba anterior: la FK compuesta impide usar una estación de otra sucursal.

**Limitaciones**: las pruebas corrieron conectadas como propietario de la base de QA, que puede omitir RLS. No sustituye probar con roles restrictivos. Tampoco se ha validado carga concurrente con procesos paralelos, un navegador de cajero, conciliación ni cumplimiento fiscal. No desplegar hasta autorización y pruebas adicionales.

## Próximos trabajos técnicos
1. Configurar roles por comercio y políticas RLS validadas con un usuario NO propietario.
2. Crear autenticación multiempresa y endpoints autorizados para el POS, sin compartir el PIN global del CRM como identidad de cajero.
3. Ensayar transacciones en competencia, borradores versus pagos autorizados y políticas de inventario reservado.
4. Diseñar devoluciones/reembolsos, impuestos por clasificación y controles de comprobantes conforme a Hacienda.
5. Integrar sandbox de ATH Business/Evertec cuando haya acuerdo y credenciales, sin PAN/CVV en AxiomOS.

## Referencias
- PostgreSQL seguridad por filas: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- PostgreSQL concurrencia: https://www.postgresql.org/docs/current/transaction-iso.html
- Neon serverless: https://neon.com/docs/serverless/serverless-driver
- Hacienda comerciantes: https://hacienda.pr.gov/comerciantes/procesos-y-requisitos-que-debe-cumplir-en-el-departamento-hacienda-al-establecer-un-negocio-en-puerto-rico
