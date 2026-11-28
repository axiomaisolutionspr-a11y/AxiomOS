// Registro de prospectos que llegan por redes sociales (Instagram / Messenger).
// Mismo formato y misma clave que /api/meta (`social:<canal>:<id>`), para que un
// prospecto que antes entraba por /api/meta siga siendo el mismo registro.

const MAX_NOTES_LENGTH = 6000;

const CHANNEL_LABELS = {
  instagram: "Instagram",
  messenger: "Facebook Messenger",
};

export function buildSocialProspect({ channel, senderId, messageId, text, reply }) {
  const source = CHANNEL_LABELS[channel] ?? String(channel);
  const notes = [
    "SOCIAL / AXIOMOS BRAIN — MENSAJE ENTRANTE",
    `Canal: ${source}`,
    `ID del mensaje: ${messageId ?? ""}`,
    `ID social: ${senderId}`,
    "",
    "Mensaje del prospecto:",
    text,
    "",
    "Respuesta de Axira:",
    reply ?? "(sin respuesta)",
  ]
    .join("\n")
    .slice(0, MAX_NOTES_LENGTH);

  return {
    prospectKey: `social:${channel}:${senderId}`,
    callerName: `Prospecto de ${source}`,
    notes,
  };
}

// `sql` es la función de plantilla de @neondatabase/serverless (neon(url)).
export async function saveSocialProspect(sql, prospect) {
  await sql`
    INSERT INTO prospects (
      prospect_key,
      caller_name,
      caller_phone,
      caller_company,
      crm_stage,
      assigned_to,
      crm_notes,
      first_seen_at,
      last_seen_at,
      created_at,
      updated_at
    )
    VALUES (
      ${prospect.prospectKey}::text,
      ${prospect.callerName}::text,
      ${null},
      ${null},
      ${"Nuevo"}::text,
      ${"Rolando"}::text,
      ${prospect.notes}::text,
      NOW(),
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (prospect_key)
    DO UPDATE SET
      crm_notes =
        CASE
          WHEN prospects.crm_notes IS NULL
            OR BTRIM(prospects.crm_notes) = ''
          THEN EXCLUDED.crm_notes
          ELSE prospects.crm_notes
            || E'\n\n'
            || EXCLUDED.crm_notes
        END,
      last_seen_at = NOW(),
      updated_at = NOW()
  `;
}
