"use client";

import { useState } from "react";
import {
  calculateOrder,
  formatMoney,
  type PosItem,
  type PosCalculatedLine,
} from "../../lib/pos/calculations";
import "./pos-demo.css";

const stations = [
  { id: "CAJA-01", label: "Caja 01", kind: "Mostrador" },
  { id: "CAJA-02", label: "Caja 02", kind: "Mostrador" },
  { id: "TABLETA-01", label: "Tableta 01", kind: "Móvil" },
] as const;

type StationId = (typeof stations)[number]["id"];
type Product = Omit<PosItem, "quantity">;
type PaymentDemoMethod = "Efectivo" | "Tarjeta" | "ATH Móvil";
type DemoSale = {
  id: string;
  station: StationId;
  method: PaymentDemoMethod;
  at: string;
  lines: PosCalculatedLine[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

const products: Product[] = [
  { sku: "PRD-001", description: "Artículo de muestra A", unitPriceCents: 2499, taxRateBasisPoints: 1150 },
  { sku: "PRD-002", description: "Artículo de muestra B", unitPriceCents: 1250, taxRateBasisPoints: 1150 },
  { sku: "PRD-003", description: "Artículo exento de muestra", unitPriceCents: 750, taxRateBasisPoints: 0 },
  { sku: "SRV-001", description: "Servicio de muestra", unitPriceCents: 4500, taxRateBasisPoints: 0 },
];

const initialCarts: Record<StationId, PosItem[]> = {
  "CAJA-01": [],
  "CAJA-02": [],
  "TABLETA-01": [],
};

export default function PosDemo() {
  const [stationId, setStationId] = useState<StationId>("CAJA-01");
  const [carts, setCarts] = useState<Record<StationId, PosItem[]>>(initialCarts);
  const [method, setMethod] = useState<PaymentDemoMethod>("Efectivo");
  const [sales, setSales] = useState<DemoSale[]>([]);
  const [receipt, setReceipt] = useState<DemoSale | null>(null);

  const cart = carts[stationId];
  const order = calculateOrder(cart);
  const selectedStation = stations.find((station) => station.id === stationId);
  const stationSales = sales.filter((sale) => sale.station === stationId);
  const totalRecorded = stationSales.reduce((sum, sale) => sum + sale.totalCents, 0);

  function addItem(product: Product) {
    setCarts((previous) => {
      const current = previous[stationId];
      const existing = current.find((item) => item.sku === product.sku);
      const next = existing
        ? current.map((item) => item.sku === product.sku
          ? { ...item, quantity: Math.min(item.quantity + 1, 9999) } : item)
        : [...current, { ...product, quantity: 1 }];
      return { ...previous, [stationId]: next };
    });
  }

  function changeQuantity(sku: string, delta: number) {
    setCarts((previous) => ({
      ...previous,
      [stationId]: previous[stationId]
        .map((item) => item.sku === sku ? { ...item, quantity: item.quantity + delta } : item)
        .filter((item) => item.quantity > 0 && item.quantity <= 9999),
    }));
  }

  function simulateSale() {
    if (cart.length === 0) return;
    const totals = calculateOrder(cart);
    const sale: DemoSale = {
      id: "DEMO-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
      station: stationId,
      method,
      at: new Date().toISOString(),
      lines: totals.lines,
      subtotalCents: totals.subtotalCents,
      taxCents: totals.taxCents,
      totalCents: totals.totalCents,
    };
    setSales((previous) => [sale, ...previous].slice(0, 30));
    setReceipt(sale);
    setCarts((previous) => ({ ...previous, [stationId]: [] }));
  }

  return (
    <main className="pos-page">
      <header className="pos-header">
        <div className="pos-brand">
          <img src="/logo.png" alt="Logotipo oficial de AxiomAI Solutions" />
          <div>
            <span>AxiomOS CRM · Módulo experimental</span>
            <h1>Estaciones de cobro</h1>
            <p>Cajas, tableta y resumen de ventas en una sola pantalla.</p>
          </div>
        </div>
        <a className="pos-back" href="/prospectos/simple">← Volver al CRM</a>
      </header>

      <div className="pos-alert" role="status">
        <strong>DEMO LOCAL — NO REALIZA COBROS.</strong> Los productos, estaciones, operaciones y
        recibos son ficticios. No hay pasarela de pagos, conexión a terminal fiscal,
        facturación real, inventario sincronizado ni registros en Neon.
        Los resultados desaparecen al recargar esta página.
      </div>

      <section className="pos-station-bar" aria-label="Estaciones disponibles">
        {stations.map((station) => (
          <button
            key={station.id}
            type="button"
            className={"pos-station " + (stationId === station.id ? "pos-active" : "")}
            onClick={() => { setStationId(station.id); setReceipt(null); }}
            aria-pressed={stationId === station.id}
          >
            <strong>{station.label}</strong>
            <small>{station.kind} · {carts[station.id].length} tipos de artículo</small>
          </button>
        ))}
      </section>

      <section className="pos-summary" aria-label="Resumen de la estación">
        <div><small>Estación seleccionada</small><strong>{selectedStation?.label}</strong></div>
        <div><small>Ventas simuladas de esta sesión</small><strong>{stationSales.length}</strong></div>
        <div><small>Total simulado de esta estación</small><strong>{formatMoney(totalRecorded)}</strong></div>
      </section>

      <div className="pos-grid">
        <section className="pos-panel" aria-labelledby="pos-catalog-title">
          <div className="pos-section-header">
            <h2 id="pos-catalog-title">Catálogo de demostración</h2>
            <span>Ejemplos sin inventario real</span>
          </div>
          <div className="pos-catalog">
            {products.map((product) => (
              <article key={product.sku} className="pos-product">
                <div>
                  <small>{product.sku} · IVU ejemplo: {(product.taxRateBasisPoints / 100).toFixed(1)}%</small>
                  <h3>{product.description}</h3>
                  <strong>{formatMoney(product.unitPriceCents)}</strong>
                </div>
                <button type="button" onClick={() => addItem(product)}>Añadir</button>
              </article>
            ))}
          </div>
          <p className="pos-footnote">
            La clasificación y tasa de IVU son ilustrativas. Cada comercio requiere
            configuración fiscal específica antes de vender de verdad.
          </p>
        </section>

        <section className="pos-panel" aria-labelledby="pos-cart-title">
          <div className="pos-section-header">
            <h2 id="pos-cart-title">Orden · {selectedStation?.label}</h2>
            <button className="pos-link-button" type="button" disabled={cart.length === 0}
              onClick={() => setCarts((previous) => ({ ...previous, [stationId]: [] }))}>
              Vaciar
            </button>
          </div>
          {order.lines.length === 0 ? (
            <p className="pos-empty">Añade productos para preparar una venta de prueba.</p>
          ) : (
            <ul className="pos-cart">
              {order.lines.map((line) => (
                <li key={line.sku}>
                  <div>
                    <strong>{line.description}</strong>
                    <small>{formatMoney(line.unitPriceCents)} por unidad</small>
                  </div>
                  <div className="pos-qty">
                    <button type="button" aria-label={"Quitar una unidad de " + line.description}
                      onClick={() => changeQuantity(line.sku, -1)}>−</button>
                    <span>{line.quantity}</span>
                    <button type="button" aria-label={"Añadir una unidad de " + line.description}
                      onClick={() => changeQuantity(line.sku, 1)}>+</button>
                  </div>
                  <strong>{formatMoney(line.totalCents)}</strong>
                </li>
              ))}
            </ul>
          )}

          <div className="pos-totals">
            <p><span>Subtotal</span><strong>{formatMoney(order.subtotalCents)}</strong></p>
            <p><span>IVU ilustrativo</span><strong>{formatMoney(order.taxCents)}</strong></p>
            <p className="pos-grand-total"><span>Total</span><strong>{formatMoney(order.totalCents)}</strong></p>
          </div>

          <label className="pos-label" htmlFor="pos-payment-method">Método de pago de ejemplo</label>
          <select id="pos-payment-method" value={method}
            onChange={(event) => setMethod(event.target.value as PaymentDemoMethod)}>
            <option value="Efectivo">Efectivo (simulado)</option>
            <option value="Tarjeta">Tarjeta (sin procesador conectado)</option>
            <option value="ATH Móvil">ATH Móvil (sin procesador conectado)</option>
          </select>
          <button className="pos-checkout" type="button" onClick={simulateSale} disabled={!cart.length}>
            Registrar venta SIMULADA · {formatMoney(order.totalCents)}
          </button>
          <p className="pos-footnote">
            Nunca introduzcas datos de tarjetas aquí. Esta vista no autoriza,
            captura ni confirma pagos.
          </p>
        </section>
      </div>

      <section className="pos-panel pos-records" aria-labelledby="pos-history-title">
        <div className="pos-section-header"><h2 id="pos-history-title">Historial de pruebas (en memoria)</h2></div>
        {sales.length === 0 ? <p className="pos-empty">Aún no hay operaciones de demostración.</p> : (
          <div className="pos-table-wrap">
            <table>
              <thead><tr><th>Referencia</th><th>Estación</th><th>Método simulado</th><th>Fecha</th><th>Total</th></tr></thead>
              <tbody>{sales.map((sale) => (
                <tr key={sale.id}><td>{sale.id}</td><td>{sale.station}</td><td>{sale.method}</td>
                  <td>{new Date(sale.at).toLocaleString("es-PR")}</td><td>{formatMoney(sale.totalCents)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {receipt && (
        <section className="pos-panel pos-receipt" aria-label="Comprobante de demostración">
          <h2>Comprobante de prueba</h2>
          <p><strong>NO ES UN RECIBO FISCAL · NO SE COBRÓ DINERO</strong></p>
          <p>Referencia: {receipt.id} · {receipt.station} · {receipt.method}</p>
          {receipt.lines.map((line) => (
            <p key={line.sku}>{line.quantity} × {line.description}: {formatMoney(line.totalCents)}</p>
          ))}
          <p>Subtotal: {formatMoney(receipt.subtotalCents)} · IVU: {formatMoney(receipt.taxCents)}</p>
          <h3>Total simulado: {formatMoney(receipt.totalCents)}</h3>
        </section>
      )}
    </main>
  );
}
