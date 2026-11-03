# Lanzamiento controlado POS Entrada $9.95 — AxiomAI

**Estado 2026-11-02:** preparado como hipótesis financiera y prototipo de cálculo, **no comercializado, no integrado con procesador**, no activar cobros ni factura fiscal. Relacionado con PR #56.

## Decisión de producto

Proponer una suscripción **AxiomOS POS Entrada $9.95 por comercio/mes**, una estación, un usuario, funciones básicas solamente cuando pasen QA fiscal, funcional y de pagos. ATH Business sería la opción de costo fijo bajo si el cliente usa su app y su cuenta; **no significa que AxiomAI pueda ya operar su API**. La comisión del comercio 2.25 % no está incluida ni la paga AxiomAI por defecto. La misma tarifa AxiomAI aplica si el cliente elige otro adquirente: se cotiza aparte hardware, procesamiento e integración que genere costo adicional.

El POS es producto de adquisición: evaluar ventas posteriores de $19.95 inventario, $29.95 CRM, $59.95 CRM+Axira y desde $99.95 Empresarial. Estos planes **no implican que las funciones estén listas**.

## Costo de operar: información contrastada con las cuentas conectadas

- Vercel: proyecto y equipo fueron confirmados; `list_billing_charges` respondió 404 `costs_not_found` tanto por slug como por teamId. Por lo tanto, **no existe un costo real de infraestructura verificado desde esta interfaz**.
- Neon: se identificó proyecto `axiomai-leads`, pero el detalle de consumo fue bloqueado por una comprobación de seguridad de la herramienta. **No usar 0 como supuesto de gasto**.
- Gmail: hay avisos de pagos de Telnyx, pero el texto de los recibos no trae los importes. Telnyx está asociado a voz y no debe cargarse íntegramente a un plan POS sin llamadas.
- Cualquier costo a continuación es **escenario hipotético por cliente, no factura revisada**. Se requiere un piloto real para asignar infraestructura/soporte.

## Precio Entrada: ingresos para distintos tamaños de cartera

| Comercios | Ingresos brutos a $9.95 | Con costo integral supuesto de $3/cliente | Con $5/cliente | Con $8/cliente | Con $10/cliente |
|---:|---:|---:|---:|---:|---:|
| 1 | $9.95 | $6.95 | $4.95 | $1.95 | **-$0.05** |
| 10 | $99.50 | $69.50 | $49.50 | $19.50 | **-$0.50** |
| 50 | $497.50 | $347.50 | $247.50 | $97.50 | **-$2.50** |
| 100 | $995.00 | $695.00 | $495.00 | $195.00 | **-$5.00** |

Las columnas posteriores son **contribución antes de costos fijos no imputados y adquisición**, no ganancias netas. El costo integral usado debe agregar infraestructura incremental, almacenamiento, atención técnica, emails, backups, cobro de la **suscripción AxiomAI**, fallas y asignación prudente de costos comunes.

**Umbral de equilibrio:** con precio $9.95, el costo integral máximo es $9.95. **Umbral recomendado para piloto:** límite operativo provisional de $7.00 por comercio al mes (margen >= $2.95), sujeto a datos reales y a que el servicio no requiera compromisos bancarios/hardware de AxiomAI. Este límite es una regla gerencial propuesta, no un valor de costo medido.

### Proyección de ventas adicionales

100 comercios: 80 Entrada a $9.95 + 20 CRM+Axira a $59.95 = **$1,995/mes ingresos brutos**. La contribución dependerá de costos del plan con IA y no debe calcularse como si fuera el costo del plan básico.

## Piloto y medidas de seguridad

- **Fase 0:** demo sin operaciones reales, probar tests unitarios, build, protección de la ruta y QA de UX.
- **Fase 1:** sistema multiempresa aislado, roles, operaciones transaccionales, cierre de caja, facturación y controles fiscales por comercio. Sin tarjeta en AxiomOS.
- **Fase 2:** proveedor seleccionado con sandbox, credenciales y aceptación formal; webhooks seguros, conciliación, reversos, auditoría y pruebas de fallas/reintentos.
- **Fase 3:** iniciar piloto con comercios que acepten expresamente las limitaciones, medir soporte, costes y tiempo por operación. Usar cifras observadas antes de fijar tarifa de lanzamiento.
- **Fase 4:** definir escalamiento comercial y complementos sin subir el precio anunciado a los pilotos durante el plazo acordado.

**Controles go/no-go del lanzamiento $9.95:**
1. Costo real integral medido por cliente **<= $7/mes** para sostener margen mínimo previsto; si no, reducir alcance o ajustar precio antes de venta.
2. Sin errores críticos de seguridad, fiscalidad, conciliación o permisos; no hay promoción sin producto funcional.
3. Proveedor de pagos contratado por comercio, con costos visibles y facturación separada; AxiomAI no es adquirente.
4. Política de reembolsos y servicio, precio final e impuestos aplicables expresos.
5. Servicios con IA como add-on con límites de uso documentados; no ofrecer ilimitados en $9.95.

## Archivo de cálculo y prueba

Motor: `app/lib/pos/unit-economics.ts`  
Pruebas: `tests/pos-unit-economics.test.mjs`  
Comando: `node --experimental-strip-types --test tests/pos-unit-economics.test.mjs`  

## Estado de trabajo

Documento interno para decisión. No fusionado en `main`. No se enviaron propuestas a Evertec, Dynamics, TrackNova ni ATH Business y no se activó facturación real.
