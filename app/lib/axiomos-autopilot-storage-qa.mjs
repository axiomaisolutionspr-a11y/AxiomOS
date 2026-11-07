/** Neon SQL adapter: inject a pre-authorized QA sql tag, never credentials.
 * This file cannot access production or run without the dedicated QA connection.
 * The SQL function's schema is installed ONLY on the isolated child branch.
 */
export function createQaStorageAdapter(sql) {
  if (typeof sql !== "function") throw Error("QA_SQL_REQUIRED");
  return {
    async processOnce(key, decision) {
      if (typeof key!=="string"||key!==`${decision.tenantId}:${decision.channel}:${decision.eventId}` ||
          decision.tenantId!=="axiomai-qa"||decision.outboundPermitted!==false||
          decision.needsApproval!==true) throw Error("INVALID_QA_DECISION");
      const rows=await sql`SELECT inserted,receipt
        FROM axiomos_autopilot_qa.ingest_synthetic(
          ${decision.tenantId},${decision.channel},${decision.eventId},
          ${decision.contactKey},${true},${true},${decision.task},${decision.priority})`;
      if(!Array.isArray(rows)||rows.length!==1||
        typeof rows[0].inserted!=="boolean"||rows[0].receipt!==key)
        throw Error("INVALID_QA_RECEIPT");
      return {inserted:rows[0].inserted,receipt:rows[0].receipt};
    }
  };
}
