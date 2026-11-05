# AxiomOS — Estaciones de cobro / POS / CRM (fase 0, 2026-11-02)

## Estado confirmado

- Ruta nueva protegida por el proxy privado existente: /prospectos/cobros
- Prototipo en memoria de tres estaciones: Caja 01, Caja 02, Tableta 01.
- Catálogo de artículos ficticios, carritos independientes por estación, totales en USD en centavos, tasas configuradas por línea, operaciones y comprobantes **simulados**.
- No procesa ni captura pagos. No crea clientes, ventas, facturas, cambios de inventario o registros en Neon. No integra dispositivos físicos.
- La lista temporal de ventas desaparece al recargar la página. No son recibos fiscales.
- Se integra en una **rama aparte**; no debe desplegarse en producción ni anunciarse como POS operativo.

## Propósito comercial

AxiomAI ofrece una plataforma de CRM y automatización compatible con POS de terceros, no se presenta como banco ni procesador. El flujo objetivo es:

1. Identificación de estación, comercio, local, cajero y permisos.
2. Creación de orden con artículo, precio vigente, descuento autorizado, clasificación fiscal y disponibilidad.
3. Cálculo de desglose contributivo configurable por producto/localidad y reglas del comercio.
4. Creación de solicitud de pago al procesador certificado, con clave de idempotencia por intento.
5. Confirmación **servidor a servidor** desde proveedor (firma validada, verificación del estado final y conciliación).
6. Solamente después de confirmación, registrar operación, actualizar inventario de forma transaccional y emitir comprobante fiscal conforme al negocio.
7. Vincular la venta con un cliente CRM si hay autorización y coincidencia verificada; nunca confundir prospectos con pagos.
8. Reportar ventas, devoluciones, caja abierta/cerrada, anomalías e historial de auditoría.

## Equipos contemplados

- Computadora o tableta con interfaz de cajero.
- Lector USB/Bluetooth de código de barras (según el dispositivo y navegador).
- Impresora térmica o recibo digital autorizado por el comercio y normativa.
- Gaveta de efectivo, opcional.
- Terminal certificado del adquirente/procesador; **separado de la aplicación CRM**.
- Kiosco de autoservicio como extensión futura, con accesibilidad y controles de abandono.

## Integraciones candidatas a evaluar con contrato y documentación técnica

- Evertec: terminales POS, Smart Terminals, integración Link, Placetopay y ATH Móvil en POS. Confirmar disponibilidad de API/SDK, programa de socios, costos, certificados y soporte para Puerto Rico.
- Sistemas de caja existentes de clientes: exportación/lector de eventos, API o webhooks documentados; preferir integración sobre reemplazo.
- Otros adquirentes solo después de verificar alta para comerciantes de Puerto Rico; **no asumir** que Square o Stripe Terminal están habilitados para cobro presencial en PR.
- Para cada proveedor confirmar: costos iniciales, renta o compra, MDR/comisiones, devoluciones, liquidación, soporte, certificaciones, fiscalidad y acceso sandbox.

## Diseño de base de datos propuesto (NO aplicado)

Separar explícitamente por comercio (tenant_id), local (location_id), estación (station_id) y operador (actor_id). Los nombres son propuestos, no tablas existentes:

- pos_merchants: datos internos de comercio e identificadores de procesador, sin secretos ni datos de tarjeta.
- pos_locations: sucursal y configuración fiscal versionada.
- pos_stations: estación, tipo, estado, proveedor y referencia de terminal (no PAN).
- pos_products: catálogo, SKU, inventario, tasas y fechas de vigencia.
- pos_orders y pos_order_lines: orden, renglones con precio/tasa congelados, estados explícitos.
- pos_payment_attempts: proveedor, referencia opaca, idempotency_key, estado y marca de verificación.
- pos_inventory_movements: movimientos inmutables por ventas, ajustes y devolución.
- pos_cash_sessions: apertura/cierre por caja, declaraciones de efectivo, diferencias autorizadas.
- pos_refunds: devoluciones enlazadas al cobro original, con autorización del proveedor.
- pos_audit_log: quién, qué, cuándo, estación, motivo, correlación y resultado; sin datos de tarjeta.

El modelo requiere llaves foráneas, restricciones únicas por tenant, RLS o separación robusta,
control de concurrencia e índices, y políticas de retención. El CRM actual de prospectos no es
una fuente confiable para los registros fiscales de ventas.

## Reglas obligatorias antes de implementar transacciones reales

1. **PCI DSS**: jamás capturar ni almacenar PAN/CVV/PIN o datos sensibles de autenticación en AxiomOS, Neon, logs, analíticas o WhatsApp; utilizar terminal/checkout del proveedor con controles validados. Confirmar alcance PCI con adquirente y assessor.
2. **IVU de Puerto Rico**: tasas y exenciones se configuran por artículo/transacción, no se presuponen. Validar inscripción SURI, obligación de terminal fiscal, requisito de recibo, locales e informes por cliente con asesor contributivo y Hacienda. El 11.5% del demo no es universal.
3. **Pago confirmado**: nunca marcar como “pagado” basándose en que el navegador recibió un OK. Solo evidencia validada de proveedor con reconciliación.
4. **Concurrencia**: pagos, inventario y cierre requieren transacciones, idempotencia, reintentos seguros y auditoría. No duplicar cobros por doble clic o timeouts.
5. **Identidad y roles**: PIN del CRM no equivale por sí solo a permisos de cajero, supervisor, devolución o auditoría. Desarrollar usuarios, MFA/segundo factor para acciones sensibles, autorizaciones por comercio/sucursal y sesiones.
6. **Privacidad**: cliente CRM vinculado solo con propósito justificado y autorizaciones. No exponer pagos de un comercio a otro.
7. **Hardware/operación**: homologación por modelo, manejo de conexión caída, impresoras, accesibilidad, seguridad física y soporte.
8. **Liberación**: aislado en QA; revisión de seguridad, E2E con sandbox, pruebas de devolución y errores, validación fiscal y aceptación del comercio antes de producción.

## Revisión del prototipo

- Ir a /prospectos/cobros en despliegue Preview autorizado (no producción).
- Entrar con control de acceso habitual de CRM.
- Seleccionar Caja 01, añadir artículos y revisar subtotal/IVU/total.
- Cambiar a Caja 02, verificar carrito independiente.
- Simular una venta; aparece en historial de esta sesión y comprobante claramente marcado NO FISCAL.
- Recargar: no debe persistir nada, ni enviar mensajes o modificar Neon.
- Ejecutar prueba de cálculos: node --experimental-strip-types --test tests/pos-calculations.test.mjs
- Ejecutar lint/build en CI antes de considerar demo listo.

## Pendientes para fase 1

- Confirmar con el usuario si la prioridad son **terminales físicos**, **módulo de caja para comercios clientes** o **cobro de servicios propios de AxiomAI**. Esta fase 0 cubre solo experiencia de caja para comercios.
- Obtener especificación de primer cliente piloto y POS actual; inventario, SKU, devoluciones, usuarios, locales, impuestos y volúmenes.
- Documentar ofertas y cotizaciones de proveedores con contratos verificables, sin asumir precios.
- Elaborar migraciones de Neon QA después de acordar tenancy, fiscalidad, permisos y proveedor.
- Preparar integración de un único proveedor en sandbox, no producción.

## Fuentes oficiales consultadas

- Hacienda Puerto Rico — requisitos de comerciante y terminales fiscales:
  https://hacienda.pr.gov/comerciantes/procesos-y-requisitos-que-debe-cumplir-en-el-departamento-hacienda-al-establecer-un-negocio-en-puerto-rico
- Hacienda — Planilla mensual de IVU:
  https://hacienda.pr.gov/node/1820
- PCI SSC — tratamiento de terminales de pago:
  https://www.pcisecuritystandards.org/faqs/1300/
- Evertec — POS:
  https://evertecinc.com/solucion/pos/
- Evertec — aceptación de pagos e integraciones:
  https://evertecinc.com/solucion/aceptacion-de-pagos/
