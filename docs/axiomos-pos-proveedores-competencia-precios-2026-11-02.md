# Estudio de proveedores y competencia: AxiomOS POS + CRM + Facturación

**Fecha de investigación:** 2 de noviembre de 2026, hora de Puerto Rico.  
**Estado:** inteligencia comercial, precios **propuestos**, NO ofertas publicadas ni funcionalidades habilitadas.  
**Rama:** `feature/pos-estaciones-cobro-qa` / PR #56.  
**Precaución:** AxiomOS POS es hoy un prototipo de prueba sin facturación fiscal ni procesamiento real; estos precios NO deben ofrecerse como producto terminado.

## Proveedores prioritarios para Puerto Rico

| Proveedor | Alcance documentado | Precio publicado relevante | Pendiente antes de alianza |
|---|---|---|---|
| Evertec / Link | POS, pagos con ATH Móvil y modalidad semiintegrada para conectar terminal y sistema de venta; Evertec Partner Program | No se publicó una tarifa general verificable de equipo, APIs ni procesamiento | Cotizar programa integrador, SDK, sandbox, certificación, alquiler/compra, tasas, liquidación, soporte, retorno y penalidades |
| ATH Business | Cobros mediante ATH Móvil, QR/API; tarifa habitual publicada | $0 cuota mensual, 2.25% por transacción (verificar mínimo por operación en condiciones); Instant Invoice publicita 2.25% + $0.25 | Confirmar API para integradores / terceros, credenciales por comercio, conciliación, reembolsos y permisos |
| TrackNova POS (PR) | Sistema POS y hardware publicitado | Software desde $9.99/mes; avanzados desde $19.99/mes. M2 $99 único, S710 $20/mes o $449, V660p $30/mes o $649, mostrador $65/mes o $1,649 | Confirmar si son precios finales, financiamiento/renta, comisiones, acceso de API, proveedor de adquirencia, compatibilidad fiscal y disponibilidad al por mayor |
| Oriental Bank / procesadores asociados | Sistemas de pago Clover, Valor, Verifone, SwipeSimple y adquirencia Evertec/Dynamics | Tarifas no publicadas; Oriental solicita contactar para precios | Cotizar equipos, servicios, tasas, permanencia, APIs e integraciones |
| FirstBank / Evertec | POS y ATH Business QR | Alquiler mensual según equipo + cargos por servicio y procesamiento, sin importes específicos | Cotizar y comprobar elegibilidad y homologación |
| Brava POS Puerto Rico (distribuidor) | Clover, Aldelo y servicios profesionales locales | Catálogo con $0.00 de referencia: **NO significa que el terminal sea gratuito** | Cotización formal, opción de distribución y soporte |
| Clover (marca) | Hardware POS, software, procesamiento con adquirentes autorizados | Tarifas internacionales/EE. UU. no representan necesariamente precios de Puerto Rico | No fijar precios locales de Clover con cifras de otra jurisdicción |
| Square | Herramientas POS en mercados admitidos | No es candidato principal; el procesamiento de tarjetas para comerciantes domiciliados en PR no figura disponible en los materiales revisados | Reconfirmar con la empresa si cambia elegibilidad |

**Contacto Evertec semiintegrado:** +1 (787) 281-4102 (página oficial de soporte). 
**Contacto Brava POS PR:** 787-488-4212 / 787-488-4242 (sitio de distribuidor).

## Competidores de software — precios mostrados al investigar

**Comparar prestaciones reales, número de usuarios, facturas, locales, integraciones y obligaciones fiscales antes de afirmar equivalencia.** Todos los precios mensuales en USD salvo nota.

| Empresa / mercado | Planes publicados | Funciones relevantes / límites | $10 debajo: REFERENCIA MATEMÁTICA, no compromiso |
|---|---|---|---|
| SOFIS by Spiral / Puerto Rico | SOLO $39, BUSINESS $79, PRO $129 | CRM, oportunidades, facturación; 1, 3 y 5 usuarios, funciones más amplias por plan | $29 / $69 / $119 |
| GlobalSuite PR / Puerto Rico | Starter $19, Professional $39, Business $69 | CRM/facturación; según sus materiales, 3/10/25 usuarios y límites de documentos/clientes; declara integración ATH Móvil | $9 / $29 / $59 |
| FacturaSimple / versión Puerto Rico | Inicia $9.99; Básico $19.99; Plus $39.99; PYME $69.99; Empresa $169.99; Empresa Pro $334.99; Enterprise $699.99 | Volumen de facturas, usuarios y módulos aumentan por plan | *Inicia no admite descuento $10*; restantes $9.99/$29.99/$59.99/$159.99/$324.99/$689.99 |
| TrackNova POS / Puerto Rico | Software desde $9.99; avanzados desde $19.99 | POS y hardware; no necesariamente CRM de prospectos y automatizaciones de Axira | No comparación funcional directa; precio de entrada $9.99 no permite $10 menos |
| BelloPOS / ofertas de PR | Lite $0; Go $16/mes o $267 pago único; Pro $27/mes o $502; Pro+ $35/mes o $737 | POS mayormente local y offline; no procesa tarjetas ni reemplaza terminal fiscal | No comparador de SaaS/CRM equivalente. El sitio todavía mostraba una promoción fechada al 16/oct/2026, por lo que precios promocionales **no confirmados vigentes** |
| NousCRM / Panamá | Esencial $20, Negocios $59, Grupo $119 | Cotización/facturación comercial y cobros; NO emite factura electrónica de DGI según sus condiciones | $10 / $49 / $109 solo referencia internacional, no equivalencia fiscal PR |
| NexusCommerce / mercados LATAM | Básico $30; Completo $40 | ERP/POS/CRM; se menciona facturación fiscal para otras jurisdicciones; no se verificó adecuación a PR | $20 / $30, solo referencia no local |

## Revisión de las ofertas originales de AxiomAI — opción A: reducir exactamente $10

| Oferta anterior (borrador) | Instalación antes | Instalación -$10 | Mensual antes | Mensual -$10 |
|---|---:|---:|---:|---:|
| POS Básico, 1 estación | $199 | **$189** | $39 | **$29** |
| POS Empresarial, hasta 3 estaciones | $399 | **$389** | $79 | **$69** |
| POS Inteligente, con CRM y Axira | $699 | **$689** | $149 | **$139** |
| POS Avanzado, multisucursal | Cotización | Cotización (descuento $10 sobre precio aprobado) | Desde $249 | **Desde $239** |

Los precios originales eran sugerencias, no tarifas ya aprobadas. Las cifras no incluyen hardware, procesamiento de tarjetas, IVU que aplique, conectividad ni ampliaciones.

## Opción B — descuento $10 bajo un competidor local concreto, SOFIS

Si la prioridad es **$10 por debajo de cada nivel SOFIS**, utilizar objetivos de $29/$69/$119. El nivel avanzado $119 queda **$30 por debajo** de nuestra propuesta antigua de $149, NO solo $10; requiere análisis de margen antes de ofrecerlo. SOFIS no es una suite POS certificada equivalente; esto solo compara el componente CRM y facturación.

GlobalSuite PR obliga a un escenario distinto: sus niveles $19/$39/$69 dan $9/$29/$59 después de restar $10. El $9 de entrada necesitaría límites estrictos, autoservicio y soporte acotado; no es prudente prometer Axira, soporte humano y terminal por $9.

**Recomendación preliminar**:
- Mantener **borrador operativo** opción A (29/69/139/239 y 189/389/689 por activación).
- Para campaña de CRM + facturación **una vez funcional**, preparar opción competitiva específica 29/69/119 frente a SOFIS y valorar el coste incremental de Axira por consumo.
- NO aplicar la regla indiscriminadamente a planes de $0 y $9.99 ni a hardware de terceros. NO vender más funciones de las que actualmente existen.

## Cálculo de margen simplificado (NO verificado como coste real)

Si el coste por comercio para AxiomAI, incluyendo hosting/API/soporte básico, fuese por ejemplo **$20/mes** (hipótesis únicamente), las contribuciones antes de impuestos y gastos comerciales serían:
- $29 - $20 = **$9/mes**; insuficiente para alto soporte.
- $69 - $20 = **$49/mes**.
- $119 - $20 = **$99/mes**.
- $139 - $20 = **$119/mes**.
- $239 - $20 = **$219/mes**.

La tarifa de ATH Business 2.25% por transacción no es un coste mensual fijo de AxiomAI: recae según contrato en el comercio y debe informarse por separado. Por ejemplo, $5,000 cobrados en el mes × 2.25% = **$112.50** de procesamiento, antes de otros posibles costes o mínimos.

## Condiciones para una propuesta comercial real

1. Facturación y comprobantes funcionales: identidad fiscal, líneas, descuentos, IVA/IVU variable por operación, anulaciones, reportes y registros.
2. Terminal de pago validado con proveedor, sin introducir datos PAN/CVV en AxiomOS; webhooks firmados y reconciliación.
3. Modelo multiempresa, operadores, roles, historial, respaldos, aislamiento de clientes y auditoría.
4. Procedimientos para Hacienda PR: registro y terminal fiscal cuando aplique, evidencia de venta, IVU por artículo/local y retención legal.
5. Fijar claramente límites por plan: usuarios, estaciones, facturas, mensajes IA, minutos de voz, almacenamiento, soporte y cargo adicional.
6. Cotización escrita de proveedores antes de ofrecer hardware/precios garantizados.
7. Verificación de márgenes: costo real por 1/10/50/100 clientes y casos de mucho tráfico.
8. Los términos mínimos de contrato y cancelación deben ser reales y explícitos; no importar automáticamente políticas de otros servicios.

## Fuentes de consulta (sitios de la propia empresa; fecha arriba)

- SOFIS: https://spiralcompanypr.com/sofis-crm
- GlobalSuite PR: https://globalsuitepr.com/
- FacturaSimple PR: https://facturasimple.com/pr/membresia
- TrackNova POS: https://www.tracknovapos.com/
- BelloPOS PR: https://bellopos.app/es-pr/pricing/
- NousCRM (Panamá): https://nouscrm.app/precios
- NexusCommerce: https://www.nexuscommercelatam.com/
- Evertec POS: https://evertecinc.com/solucion/pos/
- Evertec Link: https://evertecinc.com/solucion/link/
- Evertec Partner Program: https://evertecinc.com/aliados/
- Evertec soporte: https://evertecinc.com/soporte/
- ATH Business: https://ath.business/
- ATH Instant Invoice: https://ath.business/en/instant-invoice
- Oriental POS: https://orientalbank.com/comercial/puntos-de-venta/para-tu-negocio
- FirstBank: https://1firstbank.com/content/firstbankpuertoricoprogram/pr/es/negocios/business-digital-banking/soluciones-de-pago.html
- Brava POS PR distribuidor: https://posbrava.com/
- Hacienda PR: https://hacienda.pr.gov/comerciantes/procesos-y-requisitos-que-debe-cumplir-en-el-departamento-hacienda-al-establecer-un-negocio-en-puerto-rico
- Square foro y elegibilidad: https://community.squareup.com/t5/Foro-de-la-Comunidad-Square/Puerto-Rico-ya-esta-incluido/m-p/744031

**No se enviaron solicitudes de proveedor, no se contrató procesamiento, no se modificó producción ni se activó facturación.**
