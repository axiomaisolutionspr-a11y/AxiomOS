# Estrategia AxiomAI POS: producto de entrada y ventas complementarias

**Fecha:** 2026-11-02, Puerto Rico. **Estado:** estrategia interna en evaluación, NO publicar ni activar tarifas.  
**Principio:** el POS de entrada puede generar muy poco margen si contribuye a captar comercios que compran inventario, CRM, Axira y automatizaciones. No financiar descuentos indefinidamente sin medir rentabilidad de la cartera.

## Arquitectura comercial y precios de referencia para probar

| Producto | Precio software propuesto / comercio / mes | Valor principal | Alcance por validar |
|---|---:|---|---|
| AxiomOS POS Entrada | **$9.95** | Captación; punto de venta sencillo con un operador y una estación | Requiere finalizar backend, inventario, fiscalidad y pagos antes de venta |
| POS + Inventario | **$19.95** | Catálogo y existencias | Límites por productos/movimientos y sincronización |
| POS + CRM | **$29.95** | Identificación de clientes y seguimiento de ventas | Usuarios, prospectos y permisos separados por comercio |
| POS + CRM + Axira | **$59.95** | Atención y recordatorios automatizados, con consumo incluido limitado | Límites de mensajes/voz y costo marginal de IA |
| AxiomOS Empresarial | **Desde $99.95** | Varias cajas y sucursales, integraciones y SLA | Alcance sujeto a cotización |

**Todos son borradores:** las capacidades no están hoy productivas; el PR #56 es solo demo. El contrato del procesador, la terminal física, procesamiento por transacción, soporte extendido, instalacion, IVA/IVU aplicable y costos de integración se cotizan por separado, de forma visible y por escrito.

## Política de proveedor — menor costo compatible primero

1. **ATH Business**: para cliente que puede cobrar con su celular/QR y no necesita tarjetas físicas. App pública sin mensualidad y comisión 2.25% (mínimo $0.06). La integración API con AxiomOS requiere afiliación y QA.
2. **Terminal físico**: no afirmar que TrackNova es necesariamente el más económico para AxiomOS. TrackNova publica M2 $99, software desde $9.99/mes, S710 $20/mes o $449; *aún no se ha confirmado compatibilidad SDK ni alquiler sin software*. Evertec Link y Dynamics requieren cotización.
3. **Elección del cliente**: si necesita otro procesador, el total debe ser: tarifa software AxiomAI + tarifa mensual proveedor/terminal + comisión de transacciones + extras de implantación. El cliente paga los importes correspondientes a cada parte, sin presentar como garantizado un coste que no ha sido cotizado.
4. Evitar subir la misma tarifa de software simplemente porque un cliente elige otro banco; cobrar una **integración adicional demostrable** si hay trabajo/costos nuevos, previamente aprobado.

## Supuestos de margen a probar (NO datos contables)

| Costo operativo directo mensual imputable a AxiomAI por comercio | Precio Entrada $9.95 | Contribución / mes |
|---:|---:|---:|
| $3 | $9.95 | $6.95 |
| $5 | $9.95 | $4.95 |
| $8 | $9.95 | $1.95 |
| $10 | $9.95 | -$0.05 |
| $12 | $9.95 | -$2.05 |

Incluye en coste directo variable: Neon/Vercel incremental, pasarela/registro, soporte, mensajes, correos, copias/retención, cobro de la propia suscripción y atención al usuario. No confundir los costos globales de infraestructura con costo incremental por cliente; medir ambos. No hay información suficiente para fijar actualmente el piso real.

### Rentabilidad por cliente en 12 meses

- Ingreso básico $9.95 × 12 = **$119.40** al año; con costo directo estimado $5/mes, contribución anual **$59.40** antes de instalación, adquisición, pérdidas, soporte extraordinario e impuestos.
- Si el 20% de 100 clientes de Entrada contratan POS + CRM + Axira ($59.95) y el 80% permanece en Entrada ($9.95), el ingreso total sería **$2,195 mensuales** (20×59.95 + 80×9.95), **sin** descontar costo de IA ni soporte adicional.
- La captación debe justificarse con contribución de cada plan y tasas de conversión observadas, no asumidas.

## Paquete Entrada: límites importantes

- Una sola estación / ubicación, una caja, un usuario incluido; segunda estación como add-on.
- Solo funciones comprobadas en producción; no vender como fiscalmente certificado antes de validar.
- Soporte por formulario y base de conocimiento, sin asistencia ilimitada.
- Límites explícitos de productos, tickets, volumen y almacenamiento sin bloquear operaciones ya pagadas.
- Copias de seguridad, privacidad y seguridad obligatorias aunque el precio sea bajo.
- Cobro del comercio realizado directamente por el procesador; nunca almacenar números de tarjeta en AxiomOS.
- Precios por comercio/sucursal y responsabilidad de comisiones transparentes.

## Condición comercial para activar la oferta de $9.95

1. Cotizaciones de Evertec/TrackNova/Dynamics para terminal homologado y política de integración; ATH Business para digital.
2. Medir costo de hosting, BD, notificaciones, soporte y pago recurrente de la suscripción; calcular máximo clientes a los que puede atender cada nivel sin degradar el servicio.
3. Implementación multi-tenant y segregación de datos, auditoría, acceso por roles, impuestos aplicables, reembolsos, cierre de caja y conciliación.
4. Prueba piloto sin procesar pagos en vivo hasta contar con aprobación/compliance.
5. Ajustar la tarifa si el costo marginal supera margen objetivo, en vez de usar la promesa comercial como excusa para pérdida indefinida.

**Conclusión:** POS Entrada $9.95 puede ser un excelente gancho, pero el costo mínimo real no está establecido. El coste del proveedor de terminales y transacciones se cotiza y se muestra por separado; un producto de entrada nunca debe presentarse como una solución de cobro certificada mientras siga siendo demo.
