/** @param {boolean} manualOptOut */
export function novemberCampaignAudienceQuery(manualOptOut) {
  return `
    WITH inbound AS (
      SELECT
        right(regexp_replace(phone, '\\D', '', 'g'), 10) AS phone_key,
        count(*) FILTER (WHERE role = 'user')::int AS inbound_count,
        max(created_at) FILTER (WHERE role = 'user') AS last_inbound_at,
        bool_or(
          role = 'user'
          AND lower(trim(message)) ~
            '^(no|stop|parar|baja|cancelar|no me escribas|no deseo (mas|más) (mensajes|promociones))$'
        ) AS opted_out
      FROM whatsapp_messages
      GROUP BY 1
    )
    SELECT
      p.id::text AS id,
      coalesce(
        nullif(substring(coalesce(p.crm_notes, '') from
          'Nombre de perfil \\(sin verificar\\): ([^\\n\\r]+)'), ''),
        nullif(p.caller_name, 'Contacto de WhatsApp'),
        'Contacto'
      ) AS name,
      coalesce(p.caller_company, '') AS company,
      coalesce(p.caller_phone, '') AS phone,
      right(regexp_replace(coalesce(p.caller_phone, ''), '\\D', '', 'g'), 10) AS phone_key,
      p.crm_stage AS stage,
      i.inbound_count,
      i.last_inbound_at
    FROM prospects p
    JOIN inbound i
      ON i.phone_key =
        right(regexp_replace(coalesce(p.caller_phone, ''), '\\D', '', 'g'), 10)
    WHERE p.crm_stage NOT IN ('Vendido', 'Perdido')
      AND i.inbound_count > 0
      AND NOT i.opted_out
      ${manualOptOut ? "AND NOT axiomos_commercial.is_whatsapp_manually_opted_out(i.phone_key)" : ""}
      AND i.phone_key ~ '^(787|939)'
      AND lower(coalesce(p.caller_company, '')) <> 'axiomai solutions'
      AND lower(concat_ws(' ', p.caller_name, p.caller_company, p.crm_notes))
        !~ '(^|[^[:alnum:]])(prueba|qa|test)([^[:alnum:]]|$)'
      AND lower(coalesce(p.crm_notes, '')) NOT LIKE '%favor ignorar%'
    ORDER BY i.last_inbound_at DESC
    LIMIT 10
  `;
}

/** @param {boolean} manualOptOut */
export function reserveNovemberCampaignSendQuery(manualOptOut) {
  return `
    INSERT INTO whatsapp_campaign_sends (campaign_key, prospect_id, phone, template_name, consent_source, status)
    SELECT $1::text, $2::bigint, $3::text, $4::text, 'inbound_whatsapp', 'reserved'
    ${manualOptOut ? "WHERE NOT axiomos_commercial.is_whatsapp_manually_opted_out($3::text)" : ""}
    ON CONFLICT (campaign_key, phone) DO NOTHING
    RETURNING id::text AS id
  `;
}
