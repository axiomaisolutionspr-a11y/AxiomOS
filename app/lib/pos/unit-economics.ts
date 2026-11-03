/** Modelo interno AxiomAI POS. USD en centavos. Escenarios, no datos contables. */
export type PosPlan = "entrada" | "inventario" | "crm" | "axira" | "empresarial";
export const PLAN_PRICES_CENTS: Record<PosPlan, number> = {
  entrada: 995, inventario: 1995, crm: 2995, axira: 5995, empresarial: 9995,
};
export type PosUnitCosts = {
  infraCents: number;
  supportCents: number;
  noticesCents: number;
  subscriptionFeeBasisPoints: number;
  subscriptionFixedFeeCents: number;
  otherCents: number;
};
export function unitEconomics(priceCents: number, costs: PosUnitCosts) {
  if (!Number.isSafeInteger(priceCents) || priceCents < 0) throw Error("Precio inválido");
  for (const [key, value] of Object.entries(costs)) {
    if (!Number.isSafeInteger(value) || value < 0) throw Error("Costo inválido: " + key);
  }
  if (costs.subscriptionFeeBasisPoints > 10000) throw Error("Comisión inválida");
  const fee = Math.round(priceCents * costs.subscriptionFeeBasisPoints / 10000) + costs.subscriptionFixedFeeCents;
  const costCents = costs.infraCents + costs.supportCents + costs.noticesCents + costs.otherCents + fee;
  if (!Number.isSafeInteger(costCents)) throw Error("Costo fuera de rango");
  const contributionCents = priceCents - costCents;
  return {priceCents, costCents, contributionCents, marginPct: priceCents ? Math.round(contributionCents * 10000 / priceCents) / 100 : null};
}
export function fleetScenario(plans: Record<PosPlan, number>, costs: Record<PosPlan, PosUnitCosts>) {
  let subscribers = 0, revenueCents = 0, costCents = 0;
  for (const plan of Object.keys(PLAN_PRICES_CENTS) as PosPlan[]) {
    const count = plans[plan];
    if (!Number.isSafeInteger(count) || count < 0) throw Error("Cantidad de comercios inválida");
    const unit = unitEconomics(PLAN_PRICES_CENTS[plan], costs[plan]);
    subscribers += count;
    revenueCents += count * unit.priceCents;
    costCents += count * unit.costCents;
  }
  if (![subscribers, revenueCents, costCents].every(Number.isSafeInteger)) throw Error("Total fuera de rango");
  return {subscribers, revenueCents, costCents, contributionCents: revenueCents-costCents};
}
