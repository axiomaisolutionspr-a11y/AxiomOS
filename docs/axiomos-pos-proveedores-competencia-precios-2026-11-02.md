# AxiomOS POS + CRM — Estudio de precios y requisitos de proveedores en Puerto Rico

**Investigación:** 2 de noviembre de 2026 (Puerto Rico) · **Actualización:** contraste reforzado de páginas públicas de proveedores.  
**Estado:** investigación y propuesta interna, **NO oferta vigente de AxiomAI**.  
**Rama:** `feature/pos-estaciones-cobro-qa` (PR #56, borrador). No fusionar a `main`.

## Resumen ejecutivo

- **Evertec / Link** es el candidato de integración semiintegrada más interesante para el POS físico propio de AxiomAI. Su web no publicó una tarifa general comprobable de terminal, alquiler, comisiones, cuota de integración, certificación o programa de socios: todas requieren **cotización formal**.
- **ATH Business** es la ruta digital con precio de procesamiento publicado: $0 de cuota mensual de la app, **2.25% por pago**, mínimo **$0.06**. Cuenta con documentación técnica de API y webhooks, pero ello **no garantiza afiliación de AxiomAI como integrador autorizado** ni la disponibilidad de un hardware específico.
- **TrackNova** anuncia precios concretos para su propio POS y sus equipos: M2 $99; S710 $449 o $20/mes; V660p $649 o $30/mes; mostrador $1,649 o $65/mes; software desde $9.99/mes y avanzados desde $19.99/mes. **No está confirmado** que pueda emplearse hardware de TrackNova sin su contrato de procesamiento o su software.
- **Dynamics Payments** integra POS existentes, ofrece Clover y tiene programa de referidos; las tasas/equipos requieren propuesta escrita.
- **Retail Manager PR** publica precio único de licencia POS $350, adicional $200 e instalación desde $285 (también anuncia instalación/configuración/entrenamiento $250; **aclarar posible solapamiento**). Buen comparador local de costo de implementación y funcionalidad.
- **Oriental/Clover, FirstBank/Evertec y Popular Merchant/Evertec** publican disponibilidad de terminales, pero no una lista general de tarifas. No inventar cargos.
- **SOFIS/GlobalSuite PR/FacturaSimple/BelloPOS** constituyen el grupo de competencia de software, con diferencias grandes en usuarios, límites, canales de IA, soporte y cumplimiento fiscal.

## 1 — Proveedores de cobros: precios que sí se pueden verificar

| Proveedor y canal | Compra de terminal | Alquiler mensual | Licencia software | Comisión cobro | AxiomOS: estado integración |
|---|---|---|---|---|---|
| Evertec POS/Link (PR) | Cotización | Cotización | Cotización | Cotización individual | Semi-integrado **ofrecido**, falta acceso técnico / contrato |
| TrackNova M2 (PR) | **$99** | No publicada | POS desde **$9.99/mes**; avanzados desde **$19.99/mes** | No publicada | Compatibilidad con tercero sin confirmar |
| TrackNova S710 (PR) | **$449** | **$20/mes** | Ídem | No publicada | Ídem |
| TrackNova Verifone V660p (PR) | **$649** | **$30/mes** | Ídem | No publicada | Ídem |
| TrackNova paquete mostrador (PR) | **$1,649** | **$65/mes** | Ídem | No publicada | Configuración exacta del paquete variable |
| ATH Business (app, QR, botón) | No exige equipo de tarjeta físico para app | **$0 mensual de app** | Gratis descargar | **2.25%**, mínimo **$0.06** | API y webhooks públicos; credenciales por comercio |
| ATH Business Instant Invoice | No aplica | Sin cuota adicional publicada para funcionalidad | En app ATH Business | **2.25% + $0.25** por pago completado | Facturas ATH; no asumir que es la API de facturas de AxiomOS |
| Oriental / Clover (PR) | Cotización | Cotización | Según plan Clover | Cotización | Contrato y API/SDK por validar |
| Dynamics Payments (PR) | Cotización | Cotización | Según plan | Cotización | Ofrece integración POS y programa de referidos |
| FirstBank / Evertec (PR) | Cotización | Renta por equipo, cifra no publicada | Según contrato | Cargo por servicio + tasas | Canal de Evertec |
| Popular Merchant / Evertec (PR) | Cotización | Cotización | Según contrato | Según venta promedio, sin tasa estándar | Canal de Evertec |
| Brava POS / Clover (PR) | Cotización | Cotización | Según contrato | Cotización | Posible distribuidor; su catálogo con `$0.00` **NO prueba gratuidad** |

**Lectura comercial:** Los importes TrackNova reflejan precios al público anunciados, no precios de distribuidor. Falta confirmar impuesto, envío a Puerto Rico, depósito, mensualidades mínimas, duración de alquiler, titularidad al término, garantía, devoluciones, accesorio y planes de software por caja o negocio.

Fuentes:
- https://www.tracknovapos.com/
- https://evertecinc.com/solucion/pos/
- https://evertecinc.com/aliados/integraciones/
- https://ath.business/
- https://ath.business/preguntas
- https://ath.business/en/instant-invoice
- https://orientalbank.com/comercial/puntos-de-venta/clover
- https://dynamicspayments.com/ventas-al-detal/
- https://1firstbank.com/content/firstbankpuertoricoprogram/pr/es/negocios/business-digital-banking/soluciones-de-pago.html
- https://resourcecenter.popular.com/ayuda/negocios/servicios-de-cobro/pos/
- https://posbrava.com/productos/

### Ejemplos de presupuesto público de hardware (NO cotizaciones)

| Configuración | Compra (solo terminal) | Renta anunciada (12 meses) | Punto de indiferencia aritmético |
|---|---:|---:|---:|
| 1 S710 | $449 | $240 | 22.45 meses ($449/$20) |
| 3 S710 | $1,347 | $720 | 22.45 meses |
| 1 V660p | $649 | $360 | 21.63 meses |
| 1 mostrador | $1,649 | $780 | 25.37 meses |

*Este punto de indiferencia compara dólares pagados; no supone mismas obligaciones de soporte o propiedad ni que el alquiler genere propiedad. No incluye licencia TrackNova, procesamiento, consumibles ni fiscalidad.*

## 2 — Evertec: requisitos y preguntas de precio

**Confirmado públicamente:**
- Evertec Partner Program admite solicitudes de integradores y presenta **Link** como solución semiintegrada entre sistemas de captura y procesamiento.
- Formulario de interés: país, nombre y apellido, empresa, **correo corporativo (no correo personal)** y teléfono; solicita contexto adicional.
- Evertec POS anuncia ATH Móvil por QR, EMV/NFC, conectividad, reportes y funcionalidades de control fiscal en determinados terminales.
- Contacto Link y semintegrados: **787-281-4102**; operaciones: **787-773-5150**.

**Requisitos no publicados: no afirmarlos como obligatorios. Pedir por escrito:**
1. ¿Costo de incorporación al Partner Program / integrador (upfront, recurrente, volumen mínimo)?
2. ¿Acceso a SDK, documentación, sandbox, terminal de pruebas y credenciales? ¿Precio?
3. ¿Modelos certificados para Puerto Rico compatibles con Link? ¿Compra y renta individual?
4. ¿Costo de integración o certificación de AxiomOS; duración y pruebas obligatorias?
5. ¿Tarifas de procesamiento por tarjeta nacional/internacional, PIN, ATH Móvil QR, débito, crédito, sin tarjeta, devolución y contracargo?
6. ¿Cargos de activación, PCI, gateway, statement, mantenimiento, comunicaciones, despliegue, soporte y reemplazo?
7. ¿Contrato de permanencia, penalidades y transferencia de clientes?
8. ¿AxiomAI puede conservar su marca, no asumir exclusividad y facturar por separado el software?
9. ¿Son compatibles recibos con control fiscal de Hacienda? ¿Qué modelos y qué validación requiere el cliente?
10. ¿Permite conciliación por API, webhooks firmados, idempotencia y autorización para integradores multi-comercio?

Enlaces oficiales: https://evertecinc.com/aliados/ · https://evertecinc.com/contacto/ · https://evertecinc.com/solucion/link/ · https://evertecinc.com/soporte/

## 3 — ATH Business: requisitos confirmados

**Afiliación de comercio:**
- Aplicación móvil, email verificado, nombre/tipo/estructura del negocio, información fiscal (registro de comerciante o identificación según flujo), dirección, pATH, tarjeta ATH activa de institución participante; verificar cuenta.
- Formulario de negocios pide detalles de propietarios con al menos 25% y adjuntar Registro de Comerciante.
- Para botón de pago y webhooks: cuenta ATH Business activa, tarjeta asociada y claves públicas y privadas propias del comercio.
- Límites generales FAQ: comercio hasta $10,000/día; pagador hasta $1,500/día (verificar excepciones).
- Integración documentada para botón de pago, páginas web, API y webhooks. Un botón de pago web no sustituye terminal físico EMV.

**Tarifas verificadas:**
- App $0 mensual, **2.25% por pago recibido** y **mínimo $0.06**.
- Instant Invoice: **2.25% + $0.25** por pago completado, máximo anunciado **$1,500 por factura**; esta modalidad no es idéntica al botón/API.

Ejemplo: ventas por $5,000 mediante cobros sujetos a 2.25% => **$112.50**, antes de mínimos u otras condiciones. En Instant Invoice con **50 pagos de $100**, total adicional fijo $12.50, para **$125.00** en total.

Fuentes: https://ath.business/preguntas · https://ath.business/botondepago · https://ath.business/nuevo-registro · https://ath.business/en/instant-invoice

## 4 — Otros proveedores: condiciones verificadas y propuestas pendientes

### Dynamics Payments (Puerto Rico)

- Dispone de equipos Clover y servicio de integración de pagos con POS existente.
- Tiene programa de **referidos** con compensación por cliente convertido y participación relacionada con referidos; no se publica una tarifa exacta ni un reparto contractual uniforme.
- Su formulario Merchant pide EIN o SSN, nombre legal y DBA, dirección, tipo de entidad, ventas mensuales y anualizadas, importe por transacción, cuenta bancaria, Registro de Comerciante, carta EIN, ID y otros documentos según caso. **Estos son requisitos del formulario de Dynamics, NO de Evertec.**
- Sus páginas comerciales publicitan no penalidad por cancelación e instalación/entrenamiento gratis; exigir confirmación en contrato y alcance.
- Contacto: **787-783-8689**; https://dynamicspayments.com/contacto/ ; https://dynamicspayments.com/programa-de-referidos/

### Oriental / Clover

- Oriental comercializa Clover. Indica explícitamente **contactar para conocer precios** de servicio.
- Las aplicaciones de terceros de Clover pueden llevar tarifas adicionales; no asumir licencias incluidas ni derecho a instalar AxiomOS en su terminal.
- https://orientalbank.com/comercial/puntos-de-venta/clover ; **787-620-7963**.

### FirstBank / Popular Merchant

- FirstBank: renta de POS según modelo más cargos de servicio y de procesamiento, sin cantidades publicadas; proveedor de POS identificado como Evertec.
- Popular Merchant: la comisión transaccional depende de venta promedio, sin tasa única; dispone de consultas en **787-773-5150**.
- https://1firstbank.com/content/firstbankpuertoricoprogram/pr/es/negocios/business-digital-banking/soluciones-de-pago.html
- https://resourcecenter.popular.com/ayuda/negocios/servicios-de-cobro/pos/

## 5 — Competencia directa: software, CRM, facturación y POS

| Empresa | Mercado | Precio público por nivel | Clasificación y condición |
|---|---|---|---|
| **SOFIS by Spiral** | Puerto Rico | $39/$79/$129 mes; 1/3/5 usuarios | CRM con presupuestos, leads y facturación; alcance varía por nivel |
| **GlobalSuite PR** | Puerto Rico | $19/$39/$69 mes; 3/10/25 usuarios | CRM, facturación e integración ATH Móvil anunciada; no terminal físico incluido |
| **FacturaSimple PR** | Puerto Rico | $9.99; $19.99; $39.99; $69.99; $169.99; $334.99; $699.99 mes | Facturación con módulos variables; límites mensuales de documentos |
| **TrackNova POS** | Puerto Rico | Desde $9.99/mes; avanzados desde $19.99/mes | Caja y procesamiento; integración CRM externo sin confirmar |
| **Retail Manager PR** | Puerto Rico | **Licencia POS $350** única; adicional $200; instalación desde $285 | POS semiintegrado, inventario, ventas, clientes. También publica capacitación/configuración $250; confirmar qué se solapa |
| **BelloPOS** | Versión anunciada PR | Lite $0; **Go $16**, **Pro $27**, **Pro+ $35** mensuales **mostrados con oferta antigua** | La misma página indica descuento con límite **16-oct-2026**, vencido. Precios tachados $22/$39/$50. No considerar $16/$27/$35 como válidos sin confirmación |
| **Dynamics / Clover** | Puerto Rico | Sin tarifa uniforme; cotización | Terminal/servicios de procesamiento y aplicaciones; no equivale a licencia CRM autónoma |

**Fuentes**: 
- https://spiralcompanypr.com/sofis-crm
- https://globalsuitepr.com/
- https://facturasimple.com/pr/membresia
- https://www.tracknovapos.com/
- https://retailmanagerpr.com/software-retail-manager/
- https://bellopos.app/es-pr/pricing/

*No usar planes extranjeros como equivalentes fiscales en Puerto Rico. Por ejemplo VentaCore POS publica $500/$1,000/$2,500 mensuales pero se presenta como producto desarrollado en México y usa terminal Mercado Pago; no hay validación fiscal/operativa para PR.*

## 6 — Precio AxiomAI (propuestas internas; no autorizadas para venta)

### Rebaja de $10 respecto al borrador previo de AxiomAI

| Servicio propuesto | Setup previo → nuevo | Mensualidad previa → nueva | Equipo y procesador |
|---|---:|---:|---|
| POS Básico (una estación) | $199 → **$189** | $39 → **$29** | No incluido |
| POS Empresarial (tres estaciones) | $399 → **$389** | $79 → **$69** | No incluido |
| POS Inteligente (CRM + Axira) | $699 → **$689** | $149 → **$139** | No incluido |
| POS Multisucursal | Cotización | Desde $249 → **$239** | No incluido |

**Diferencia competitiva frente a SOFIS**: restar exactamente $10 de $39/$79/$129 da $29/$69/$119 para software CRM/facturación **cuando sea funcionalmente comparable**. No confundir esta matriz con POS Inteligente $139, que incluye otro alcance propuesto y costes IA.

No aplicar descuento `competidor - $10` a ofertas gratuitas ni $9.99: sería precio negativo. La mera rebaja no sustituye rentabilidad ni funcionalidad. La licencia única de Retail Manager no se compara directamente con software mensual.

### Ejemplo de costo total para comprador, no para AxiomAI como revendedor

- Cliente compra AxiomAI POS Básico **a futuro**, licencia AxiomAI propuesta $29/mes, y alquila una S710 ($20/mes): **$49/mes + procesamiento, instalación, licencia externa si aplica, impuestos, mantenimiento y soporte no incluido**. Esto **NO es paquete confirmado**: no se ha demostrado que la terminal TrackNova funcione con AxiomOS ni que se alquile sin su software.
- 3 estaciones S710 anunciadas a $20 cada una, más propuesta AxiomAI Empresarial $69: **$129/mes antes de cargos adicionales**, igualmente hipotético.
- Un equipo TrackNova comprado a precio público no se debe presupuestar como costo mayorista de AxiomAI sin autorización de revendedor.
- Un producto AxiomAI $29/mes **no es más barato que TrackNova $9.99/mes** en software puro. La diferenciación debe depender de CRM y automatizaciones reales, no de una afirmación de precio mínimo universal.

## 7 — Requisitos fiscales, contractuales y técnicos

1. Hacienda requiere Registro de Comerciante/SURI y un cuestionario para evaluar si aplica terminal fiscal. **No asumir que todos los negocios tienen el mismo requisito.** La DA 15-20 de 2015 menciona umbral general de ventas $125,000 con excepciones, pero determinaciones posteriores establecen requisitos específicos, por ejemplo para restaurantes que buscan la tasa reducida. Antes de prometer cumplimiento 2026, validar escenario con Hacienda/asesor contributivo.
2. Un software de caja o recibo digital **no sustituye** la terminal fiscal cuando ésta sea exigible.
3. No recopilar ni guardar PAN, CVV o PIN en AxiomOS/Neon. Implementar pago alojado o terminal certificado, webhooks verificados, idempotencia, conciliación, reversos, rechazo y reembolsos seguros.
4. Roles de cajero/supervisor/administrador, auditoría inmutable, control por sucursal y negocio, inventario transaccional y respaldo.
5. En las cotizaciones exigir **total a 12/24/36 meses**: setup, equipo, software por estación, renta, terminal fiscal, tarifa por transacción, tasa por tarjeta, mínimos, chargebacks, PCI, reporte, depósito, impuestos, instalación, entrenamiento, soporte, garantía, reemplazo, penalidades, plazo y propiedad del equipo.
6. Considerar en AxiomOS plan separado de integración; no transferir a AxiomAI la exposición de ser adquirente sin licencia/contrato.

Fuentes:
- https://hacienda.pr.gov/comerciantes/procesos-y-requisitos-que-debe-cumplir-en-el-departamento-hacienda-al-establecer-un-negocio-en-puerto-rico
- https://hacienda.pr.gov/publicaciones/determinacion-administrativa-num-15-20
- https://hacienda.pr.gov/publicaciones/determinacion-administrativa-num-19-03
- https://hacienda.pr.gov/node/1820

## 8 — Prioridad y seguimiento de solicitudes de precio

| Prioridad | Proveedor | Solicitud para enviar | Contacto público | Estado |
|---|---|---|---|---|
| **P0** | Evertec / Link | Partner, SDK/sandbox, certificación, tarifas POS, merchant rate y condiciones sin exclusividad | https://evertecinc.com/aliados/ · 787-281-4102 | **No enviada** |
| **P0** | ATH Business | Alta de integrador, API multi-comercio, webhooks y condiciones comerciales | https://ath.business/botondepago · 787-773-5466 | No enviada |
| **P1** | Dynamics Payments | Condiciones ISO/partner o referidos, comisiones, equipos semiintegrados y contratos | https://dynamicspayments.com/contacto/ · 787-783-8689 | No enviada |
| **P1** | TrackNova | Compra/renta detallada, licencias por estación, contrato, procesador y compatibilidad SDK | https://www.tracknovapos.com/ · 939-317-9382 | No enviada |
| **P2** | Oriental / Clover | Modelos, contratos, SDK/Clover App Market, tasas y documentos de alta | https://orientalbank.com/comercial/puntos-de-venta/clover · 787-620-7963 | No enviada |
| **P2** | Retail Manager PR | Precio total llave en mano, fiscalidad, API semiintegrada y condiciones de licencia | https://retailmanagerpr.com/software-retail-manager/ · 787-466-2091 | No enviada |

**No se compró equipo, no se creó cuenta merchant ni se integraron fondos.** AxiomOS POS en PR #56 sigue siendo demo, sin base de datos operativa ni cobros reales.
