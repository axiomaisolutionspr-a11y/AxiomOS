# POS fase 1 — seguridad multiempresa, aislamiento y criterios de aceptación

**Estado:** schema en GitHub, **NO aplicado a Neon**, sin API pública ni cobros reales. Fecha 2026-11-03.

## Entregado

- Esquema SQL QA-only: `database/migrations/20261103_pos_multitenant_qa_only.sql`.
- Entidades: comercio, operadores, sucursales, estaciones, catálogo, órdenes, líneas, intentos de pago y auditoría.
- Claves foráneas compuestas (merchant_id, id) para reducir asociación accidental entre comercios.
- Estado de órdenes y de pago explícito. `idempotency_key` única por comercio y procesador.
- RLS activado sin políticas para negar acceso a roles ordinarios por defecto.
- Importes guardados como enteros en centavos y tasas individuales por artículo.

## Límites importantes

- Usuarios con BYPASSRLS o propietarios de tablas pueden eludir las políticas: la implementación debe usar rol de aplicación sin esos privilegios y comprobarlo mediante QA.
- Aún NO hay API autenticada para cajeros ni políticas RLS que concedan acceso seguro; por eso no es operativo.
- Falta transacción de confirmación de pago, movimiento de inventario, conciliación, contabilidad, reembolso, fiscalidad y protección ante replay de webhook.
- El identificador de sesión PIN existente del CRM no identifica usuarios ni comercios; no debe utilizarse por sí solo como autentificación del POS multiempresa.
- `CREATE TABLE IF NOT EXISTS` no sustituye a un gestor de migraciones con control de versión y verificación de deriva de esquema.
- El diseño debe revisarse para controles sobre modificaciones de pedidos pagados y auditoría append-only antes de aplicar.
- No existen tarjetas reales ni se almacenan PAN/CVV/PIN; cualquier integración debe usar terminal o checkout certificado.

## QA requerido antes de instalarlo en Neon QA

1. Migración transaccional en rama QA dedicada y revisión de privilegios.
2. Dos comercios ficticios A y B, dos operadores independientes; intento de ver datos de B desde A => DENEGADO.
3. Intentar orden con estación o operador de otro comercio => DENEGADO por FK.
4. Repetir `idempotency_key` en un mismo comercio => CONFLICTO; entre comercios => permitido.
5. Reintentos de proveedor con misma clave => jamás cobro/venta duplicados.
6. Concurrencia, cierres de caja, desconexión, devoluciones y confirmación externa real en sandbox.
7. Comprobación de requerimientos fiscales de Hacienda para el tipo de comercio piloto.
8. Auditoría de accesos y acciones sin secretos o datos de tarjeta.
9. Tests automáticos, lint, compilación, restauración desde backup y aprobación del comercio piloto.

## Foco financiero

Plan de captación POS Entrada **$9.95/mes** (propuesto): una sucursal, un operador/estación y funciones acotadas. Precio del hardware/comisiones del proveedor aparte. Meta inicial de coste integral <= **$7/mes por comercio**; NO es coste medido. No afirmar que un terminal TrackNova puede usarse con AxiomOS hasta aprobar la compatibilidad o una alianza.

No comercializar antes de implantar facturación y cobros seguros y tener un costo real auditado.
