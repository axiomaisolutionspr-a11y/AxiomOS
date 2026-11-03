/**
 * AxiomOS POS provider boundary (QA).
 * This module MUST NOT call any external payment API or mark orders paid.
 * Full authorization/reconciliation belongs in a separate, certified integration.
 */
export type PosProvider = "ath_business" | "evertec_link";
export type PosConnectionState = "not_configured" | "awaiting_merchant_approval" | "approved_for_integration";
export type PosPaymentHandoff = {
  provider: PosProvider;
  orderId: string;
  merchantId: string;
  amountCents: number;
  currency: "USD";
  idempotencyKey: string;
};

export const providerRegistry: Readonly<Record<PosProvider, {
  label: string;
  method: "web" | "terminal";
  supportsPublicSandbox: boolean;
  needsMerchantCredentials: boolean;
  referenceUrl: string;
}>> = {
  ath_business: {
    label: "ATH Business",
    method: "web",
    supportsPublicSandbox: false,
    needsMerchantCredentials: true,
    referenceUrl: "https://github.com/evertec/ATHM-Payment-Button-API",
  },
  evertec_link: {
    label: "Link by Evertec",
    method: "terminal",
    supportsPublicSandbox: false, // Public documentation/SDK not confirmed.
    needsMerchantCredentials: true,
    referenceUrl: "https://evertecinc.com/aliados/",
  },
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validatePaymentHandoff(request: PosPaymentHandoff): {
  ok: boolean; reason: string;
} {
  if (!request || !(request.provider in providerRegistry)) return { ok: false, reason: "proveedor_no_admitido" };
  if (!uuid.test(request.orderId) || !uuid.test(request.merchantId))
    return { ok: false, reason: "identidad_invalida" };
  if (!Number.isSafeInteger(request.amountCents) || request.amountCents < 1)
    return { ok: false, reason: "importe_invalido" };
  if (request.currency !== "USD" || !/^[a-zA-Z0-9_-]{8,120}$/.test(request.idempotencyKey))
    return { ok: false, reason: "referencia_invalida" };
  // Published ATH API allows $1.00 to $1,500.00 for ecommerce payment service.
  if (request.provider === "ath_business"
    && (request.amountCents < 100 || request.amountCents > 150000))
    return { ok: false, reason: "ath_business_fuera_de_limites" };
  return { ok: true, reason: "estructura_valida_sin_autorizacion_de_pago" };
}

/** No actual processor is connected. Fail-closed by design until provider credential review. */
export async function submitPaymentToProcessor(_request: PosPaymentHandoff): Promise<never> {
  throw new Error("POS_PROVIDER_NOT_CONNECTED: missing merchant-specific certified integration.");
}

/**
 * A received webhook is notification only.
 * AxiomOS may mark an order paid ONLY after an authenticated, independently
 * verified processor status + amount + merchant + reconciliation reference.
 */
export function webhookIsSufficientProofOfPayment(): false { return false; }
