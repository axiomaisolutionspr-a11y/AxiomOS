// Contador mensual de preguntas a Brain por negocio. Reserva antes de llamar a la IA
// (para no pasarse del límite aunque lleguen preguntas a la vez) y devuelve la reserva si la IA falla.
import { inTenant } from "./axira-catalog-store.js";

/** Mes actual en hora de Puerto Rico (UTC−4 todo el año), formato YYYY-MM. */
export function brainPeriod(now = Date.now()) {
  return new Date(now - 4 * 60 * 60 * 1000).toISOString().slice(0, 7);
}

/** Límite mensual del negocio. Mientras no existan suscripciones, viene de la configuración (por defecto, el del plan Básico). */
export function brainMonthlyLimit(env = process.env) {
  const value = Number(env.BRAIN_OWNER_MONTHLY_LIMIT ?? 100);
  return Number.isSafeInteger(value) && value >= 0 && value <= 1000000 ? value : 100;
}

export async function brainUsage(db, tenant, period = brainPeriod()) {
  const [rows] = await inTenant(db, tenant, [{
    text: "SELECT questions FROM axiomos_commercial.brain_usage WHERE tenant_id = $1 AND period = $2",
    params: [tenant, period],
  }]);
  return Number(rows[0]?.questions ?? 0);
}

/** Reserva una pregunta. Devuelve { ok: true, used } o { ok: false, used } si ya se llegó al límite. */
export async function reserveBrainQuestion(db, tenant, limit, period = brainPeriod()) {
  if (limit <= 0) return { ok: false, used: 0 };
  const [rows] = await inTenant(db, tenant, [{
    text: `INSERT INTO axiomos_commercial.brain_usage AS u (tenant_id, period, questions) VALUES ($1, $2, 1)
      ON CONFLICT (tenant_id, period) DO UPDATE SET questions = u.questions + 1, updated_at = statement_timestamp()
      WHERE u.questions < $3
      RETURNING questions`,
    params: [tenant, period, limit],
  }]);
  if (rows.length) return { ok: true, used: Number(rows[0].questions) };
  return { ok: false, used: await brainUsage(db, tenant, period) };
}

/** Devuelve una pregunta reservada cuando la IA no pudo contestar (no se cobra un fallo). */
export async function releaseBrainQuestion(db, tenant, period) {
  await inTenant(db, tenant, [{
    text: `UPDATE axiomos_commercial.brain_usage SET questions = questions - 1, updated_at = statement_timestamp()
      WHERE tenant_id = $1 AND period = $2 AND questions > 0`,
    params: [tenant, period],
  }]);
}
