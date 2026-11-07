import { neon } from "@neondatabase/serverless";
import { puertoRicoDateISO } from "./axira-offers-policy.js";

/** Consulta sin caché para que una oferta pausada deje de mostrarse de inmediato. */
export async function loadCurrentOffers(now = new Date()) {
  if (!process.env.DATABASE_URL) return [];
  try {
    const sql = neon(process.env.DATABASE_URL);
    const today = puertoRicoDateISO(now);
    return await sql`
      SELECT id::text AS id, name, description, terms,
        monthly_usd::text AS monthly_usd,
        activation_usd::text AS activation_usd,
        TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date,
        max_clients, status
      FROM axiomai_offers
      WHERE status = 'approved'
        AND start_date <= ${today}::date AND end_date >= ${today}::date
      ORDER BY end_date ASC, id ASC
      LIMIT 20
    `;
  } catch (error) {
    // Se falla de forma cerrada si todavía no se ha aplicado la migración.
    console.error("AXIRA_OFFERS_READ_FAILED", error instanceof Error ? error.message : "error");
    return [];
  }
}
