/**
 * Cálculos del prototipo AxiomOS POS.
 * Importes expresados exclusivamente en centavos; tasas en puntos básicos.
 * No determina la clasificación fiscal de productos o servicios.
 */
export type PosItem = {
  sku: string;
  description: string;
  unitPriceCents: number;
  quantity: number;
  taxRateBasisPoints: number;
};

export type PosCalculatedLine = PosItem & {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

function assertValidCents(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(label + " debe ser un entero no negativo.");
  }
}

function safeAdd(a: number, b: number): number {
  const total = a + b;
  if (!Number.isSafeInteger(total)) {
    throw new Error("El monto excede el máximo permitido.");
  }
  return total;
}

export function calculateOrder(items: readonly PosItem[]): {
  lines: PosCalculatedLine[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
} {
  let subtotalCents = 0;
  let taxCents = 0;
  const lines: PosCalculatedLine[] = [];

  for (const item of items) {
    if (!item.sku || !item.description) {
      throw new Error("Cada artículo necesita código y descripción.");
    }
    assertValidCents(item.unitPriceCents, "Precio");
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 9999) {
      throw new Error("Cantidad inválida.");
    }
    if (!Number.isInteger(item.taxRateBasisPoints)
        || item.taxRateBasisPoints < 0 || item.taxRateBasisPoints > 10000) {
      throw new Error("Tasa contributiva inválida.");
    }
    const lineSubtotal = item.unitPriceCents * item.quantity;
    assertValidCents(lineSubtotal, "Subtotal");
    const lineTax = Math.round(lineSubtotal * item.taxRateBasisPoints / 10000);
    assertValidCents(lineTax, "IVU");
    const lineTotal = safeAdd(lineSubtotal, lineTax);
    subtotalCents = safeAdd(subtotalCents, lineSubtotal);
    taxCents = safeAdd(taxCents, lineTax);
    lines.push({ ...item, subtotalCents: lineSubtotal, taxCents: lineTax, totalCents: lineTotal });
  }

  return { lines, subtotalCents, taxCents, totalCents: safeAdd(subtotalCents, taxCents) };
}

export function formatMoney(cents: number): string {
  assertValidCents(cents, "Importe");
  return new Intl.NumberFormat("es-PR", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
