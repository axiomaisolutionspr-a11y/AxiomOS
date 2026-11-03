import test from "node:test";
import assert from "node:assert/strict";
import { unitEconomics, fleetScenario, PLAN_PRICES_CENTS } from "../app/lib/pos/unit-economics.ts";
const low = {infraCents: 100, supportCents: 100, noticesCents: 0, subscriptionFeeBasisPoints: 300, subscriptionFixedFeeCents: 30, otherCents: 0};
const high = {...low, supportCents: 950};
test("plan entrada tiene precio 9.95", ()=>assert.equal(PLAN_PRICES_CENTS.entrada,995));
test("cálculo de costos incluye comisión de suscripción y costo fijo",()=>{
 const result=unitEconomics(995,low);
 assert.deepEqual(result,{priceCents:995,costCents:260,contributionCents:735,marginPct:73.87});
});
test("pérdida se presenta como valor negativo, no se oculta",()=>assert.ok(unitEconomics(995,high).contributionCents<0));
test("100 suscripciones de entrada generan $995 brutos",()=>{
 const clients={entrada:100,inventario:0,crm:0,axira:0,empresarial:0};
 const costs={entrada:low,inventario:low,crm:low,axira:low,empresarial:low};
 const r=fleetScenario(clients,costs);
 assert.equal(r.revenueCents,99500);
 assert.equal(r.contributionCents,73500);
});
test("escenario ventas adicionales no confunde facturación con contribución",()=>{
 const clients={entrada:80,inventario:0,crm:0,axira:20,empresarial:0};
 const costs={entrada:low,inventario:low,crm:low,axira:low,empresarial:low};
 const r=fleetScenario(clients,costs);
 assert.equal(r.revenueCents,199500);
 assert.equal(r.contributionCents, r.revenueCents-r.costCents);
});
test("rechaza conteo negativo y costos inválidos",()=>{
 assert.throws(()=>unitEconomics(995,{...low,infraCents:-5}),/Costo inválido/);
 assert.throws(()=>unitEconomics(995,{...low,subscriptionFeeBasisPoints:10001}),/Comisión inválida/);
 const c={entrada:low,inventario:low,crm:low,axira:low,empresarial:low};
 assert.throws(()=>fleetScenario({entrada:-1,inventario:0,crm:0,axira:0,empresarial:0},c),/Cantidad/);
});