# QA POS — simulador seguro de caja, inventario y preparación bancaria

Fecha: 3 de noviembre de 2026. Entorno: Neon QA `pos-location-integrity-qa-20261103` (no producción). Autorización recibida para pruebas QA/Preview, no para cambios a producción.

## Respaldo previo a cualquier cambio

- Snapshot Neon de **producción**, confirmado antes del trabajo: `CRM-PROD-PRE-POS-2026-11-03` (ID `snap-restless-leaf-av4bp0og`).
- Rama de respaldo de código: `backup/crm-main-before-pos-20261103` (commit `b13b776a7e1b97bfc1fa499352210c118fe6bd95`).
- Ninguna migración de este experimento se aplicó al branch Neon main ni se fusionó con GitHub main.

## Aplicado en QA

Archivo: `database/migrations/20261103_pos_simulated_checkout_qa_only.sql`.

Se ejecutaron 11 instrucciones en una transacción QA:
- Recibos etiquetados explícitamente **SIMULACIÓN — NO ES PAGO NI RECIBO FISCAL** y líneas congeladas.
- Bandeja futura de eventos bancarios con índice para eventos no verificados, claves únicas por comercio/proveedor/evento y sin almacenar credenciales o números de tarjeta.
- Movimientos de inventario con motivo `sale_simulated`.
- Función `pos_qa_simulate_checkout`: bloquea fila de orden, comprueba operador, descuento condicional de existencias, genera recibo de prueba y registra auditoría. Reintentos devuelven la misma referencia; todo se ejecuta en una transacción o revierte.
- No realiza llamadas a banco, no modifica `status='paid'`, no produce factura fiscal.

## Pruebas SQL contra Neon QA — resultado

- Orden QA existente: subtotal $20.00, IVU ilustrativo $2.30, total $22.30, estado **draft**.
- Primera simulación: generó recibo `8aada5aa-d6f2-47d1-a40b-2c285bf93b6a`.
- Reintento idéntico: devolvió la misma referencia sin operación nueva.
- Stock de ejemplo: 10 → 8. Se confirmó **1 recibo**, **1 movimiento de descuento**, estado sigue **draft**.
- Orden de 9 unidades cuando existían 8: función rechazó `QA checkout: insufficient inventory`; rollback confirmado, stock conservó 8 y se crearon **0 recibos** para esa orden.

## Limitaciones, no confundir con producto terminado

1. La conexión navegador→Vercel Preview→Neon sigue **desactivada**. El rol creado por Neon tiene `BYPASSRLS=true`, por lo que la API rechaza acceso por diseño. Requiere rol sin BYPASSRLS, permisos mínimos y políticas por comercio, probadas con dos comercios.
2. Falta rate limiting y protección de login y renovación de sesión.
3. El módulo de pago sigue sin conexión externa hasta credenciales y acuerdo con proveedor: ATH Business no debe marcar `CONFIRM` como pago final; sólo una verificación con proveedor y conciliación permiten transición a `paid`.
4. No se probaron dos terminales haciendo cobros simultáneos, cancelaciones/devoluciones, SKU repetidos o caídas de conexión; el simulador tampoco equivale a certificación fiscal.
5. Las tablas QA actuales siguen operadas por propietario elevado; pruebas de aislamiento no equivalen a una prueba real de RLS con rol limitado.
6. La bandeja de eventos solo preserva identificadores y estado, no tiene todavía endpoint de recepción ni firma/verificación. **Nunca activar una transición a pagado desde una notificación aislada.**

## Recursos técnicos

- ATH Business Payment Button API: https://github.com/evertec/ATHM-Payment-Button-API
- ATH Business: https://ath.business/preguntas
- Evertec aliados: https://evertecinc.com/aliados/
- PostgreSQL RLS: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- PCI Security Standards: https://www.pcisecuritystandards.org/

## Próxima fase

- Habilitar un rol QA restringido y revisar RLS real, con protección de accesos.
- Conectar pantalla QA con pruebas de aislamiento y concurrencia.
- Exponer simulador solo a operadores QA permitidos, tras rate limiting y autorización.
- Completar estados de transacción, conciliación y reglas fiscales con proveedor homologado en sandbox o terminal de prueba autorizada.

**No desplegar en producción ni emitir recibos para clientes.**
