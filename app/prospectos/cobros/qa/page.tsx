"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Location = { id: string; name: string };
type Station = { id: string; location_id: string; display_name: string };
type Product = { id: string; sku: string; description: string; price_cents: string; tax_basis_points: number };
type Data = { ok: boolean; locations: Location[]; stations: Station[]; products: Product[] };
type CartItem = { sku: string; quantity: number };

const money = (cents: number) => new Intl.NumberFormat("es-PR", { style: "currency", currency: "USD" }).format(cents / 100);

export default function PosQaWorkspace() {
  const [auth, setAuth] = useState<"checking"|"logged_out"|"logged_in"|"disabled">("checking");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [locationId, setLocationId] = useState("");
  const [stationId, setStationId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pendingKey, setPendingKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const result = await fetch("/api/pos/qa/catalog", { cache: "no-store" });
    if (!result.ok) throw Error("No pudimos cargar el catálogo QA.");
    const parsed: Data = await result.json();
    if (!parsed.ok) throw Error("No se pudo consultar el comercio.");
    setData(parsed);
    setLocationId(parsed.locations[0]?.id || "");
    setStationId(parsed.stations.find((s) => s.location_id === parsed.locations[0]?.id)?.id || "");
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/pos/qa/session", { cache: "no-store" });
        if (!active) return;
        if (response.status === 503) { setAuth("disabled"); return; }
        if (response.ok) {
          setAuth("logged_in");
          try { await load(); } catch { if (active) setMessage("No se pudo cargar el catálogo. Revisa la configuración de QA."); }
        } else setAuth("logged_out");
      } catch { if (active) setAuth("disabled"); }
    })();
    return () => { active = false; };
  }, [load]);

  const stations = useMemo(() =>
    data?.stations.filter((s) => s.location_id === locationId) || [], [data, locationId]);
  const totals = useMemo(() => {
    let subtotal = 0, tax = 0;
    for (const entry of cart) {
      const product = data?.products.find((p) => p.sku === entry.sku);
      if (!product) continue;
      const line = Number(product.price_cents) * entry.quantity;
      subtotal += line;
      tax += Math.round(line * product.tax_basis_points / 10000);
    }
    return { subtotal, tax, total: subtotal + tax };
  }, [cart, data]);

  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/pos/qa/session", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      setPassword("");
      if (!response.ok) throw Error(response.status === 401
        ? "Usuario o contraseña incorrectos." : "Acceso no disponible.");
      setAuth("logged_in"); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Acceso no disponible."); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/pos/qa/session", {
        method: "DELETE", credentials: "same-origin",
      });
      if (!response.ok) throw Error("No se pudo revocar la sesión. Inténtalo de nuevo.");
      setAuth("logged_out"); setData(null); setCart([]); setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cerrar sesión.");
    } finally { setBusy(false); }
  }

  function add(sku: string) {
    if (busy) return;
    setCart((previous) => {
      const found = previous.find((p) => p.sku === sku);
      return found ? previous.map((p) => p.sku === sku ? { ...p, quantity: Math.min(9999,p.quantity+1) } : p)
        : [...previous, { sku, quantity: 1 }];
    });
    setPendingKey(""); setMessage("");
  }

  function change(sku: string, delta: number) {
    if (busy) return;
    setCart((previous) => previous.map((p) => p.sku === sku
      ? { ...p, quantity: p.quantity + delta } : p).filter((p) => p.quantity > 0 && p.quantity <= 9999));
    setPendingKey(""); setMessage("");
  }

  async function saveDraft() {
    if (!stationId || !locationId || !cart.length || busy) return;
    setBusy(true); setMessage("");
    const key = pendingKey || crypto.randomUUID();
    if (!pendingKey) setPendingKey(key);
    try {
      const response = await fetch("/api/pos/qa/orders", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, stationId, idempotencyKey: key, items: cart }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw Error(payload.error || "No se pudo guardar el borrador.");
      setCart([]); setPendingKey("");
      setMessage("Borrador guardado en Neon QA: " + String(payload.order?.id || "") +
        ". NO SE COBRÓ DINERO NI SE DESCONTÓ INVENTARIO.");
    } catch (error) {
      setMessage((error instanceof Error ? error.message : "Error desconocido") +
        " Si la respuesta fue incierta, pulsa Guardar nuevamente sin cambiar la orden para usar la misma clave.");
    } finally { setBusy(false); }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#05101d", color: "#f0f7ff",
      fontFamily: "Arial,sans-serif", padding: "24px", lineHeight: 1.5 }}>
      <div style={{ maxWidth: 1060, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
          <img src="/logo.png" width="105" height="86" alt="AxiomAI Solutions" style={{ objectFit: "contain" }}/>
          <div><small style={{ color: "#60d7ff" }}>AxiomOS / LABORATORIO QA</small>
            <h1 style={{ margin: "3px 0" }}>Estaciones de cobro · Conexión de pruebas</h1>
            <p style={{ color: "#aec6da" }}>Borradores persistentes, sin banco ni operaciones reales.</p></div>
        </header>
        <div role="alert" style={{ padding: 16, marginBottom: 24, background: "#3b2816", border: "1px solid #bd9252", borderRadius: 12 }}>
          <strong>SOLO QA — NO ES UNA CAJA OPERATIVA.</strong> Aquí nunca se procesan tarjetas,
          no se entregan comprobantes fiscales y no se reciben fondos. Las órdenes permanecen en Neon QA.
        </div>
        <p><a style={{ color: "#83d8ff" }} href="/prospectos/cobros">← Volver a demostración</a></p>
        {auth === "checking" && <p>Comprobando conexión segura…</p>}
        {auth === "disabled" && <div role="status">
          <h2>Conexión todavía desactivada</h2>
          <p>Debemos configurar la base Neon QA, la lista de operadores y los secretos de sesión
          en el entorno Preview. El módulo no se habilitará en producción.</p>
        </div>}
        {auth === "logged_out" && <form onSubmit={login} style={{ maxWidth: 390, display: "grid", gap: 13 }}>
          <h2>Acceso individual del operador QA</h2>
          <label>Usuario de pruebas<input required autoComplete="username" value={username}
            onChange={(e) => setUsername(e.target.value)} style={inputStyle}/></label>
          <label>Contraseña<input required type="password" autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)} style={inputStyle}/></label>
          <button style={buttonStyle} disabled={busy}>Entrar a QA</button>
        </form>}
        {auth === "logged_in" && <div>
          <button type="button" style={{ ...buttonStyle, background: "#163857", color: "#fff" }}
            onClick={logout}>Cerrar sesión QA</button>
          {data && <div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", margin: "22px 0" }}>
              <label>Sucursal<select value={locationId} onChange={(e) => {
                setLocationId(e.target.value); setStationId(data.stations.find((s) => s.location_id === e.target.value)?.id || "");
                setCart([]); setPendingKey("");
              }} style={inputStyle}>{data.locations.map((l) =>
                <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
              <label>Estación<select value={stationId} onChange={(e) => { setStationId(e.target.value); setCart([]); setPendingKey(""); }}
                style={inputStyle}>{stations.map((s) =>
                  <option key={s.id} value={s.id}>{s.display_name}</option>)}</select></label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
              <section style={cardStyle}><h2>Catálogo QA</h2>
                {data.products.map((p) => <div key={p.id} style={rowStyle}>
                  <div><strong>{p.description}</strong><br/><small>{p.sku} · IVU configurado: {p.tax_basis_points / 100}%</small><br/>
                    {money(Number(p.price_cents))}</div>
                  <button type="button" disabled={busy || !stationId} onClick={() => add(p.sku)} style={buttonStyle}>Añadir</button>
                </div>)}
                {!data.products.length && <p>Sin productos configurados en este comercio QA.</p>}
              </section>
              <section style={cardStyle}><h2>Orden en borrador</h2>
                {cart.map((c) => <div key={c.sku} style={rowStyle}>
                  <strong>{c.sku}</strong>
                  <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                    <button disabled={busy} type="button" onClick={() => change(c.sku,-1)}>−</button>
                    <span>{c.quantity}</span>
                    <button disabled={busy} type="button" onClick={() => change(c.sku,1)}>+</button></div></div>)}
                {!cart.length && <p>No hay artículos.</p>}
                <p>Subtotal: {money(totals.subtotal)}<br/>IVU ilustrativo: {money(totals.tax)}</p>
                <h3>Total simulado: {money(totals.total)}</h3>
                <button type="button" style={buttonStyle} disabled={busy || !cart.length || !stationId}
                  onClick={saveDraft}>Guardar borrador en Neon QA</button>
                <p style={{ fontSize: 12, color: "#b2cce0" }}>No autoriza cobros ni afecta existencias.
                  La terminal Evertec/ATH requiere configuración y aprobación separada.</p>
              </section>
            </div>
          </div>}
        </div>}
        {!!message && <p role="status" style={{ padding: 14, background: "#10344e", borderRadius: 9, overflowWrap: "anywhere" }}>{message}</p>}
      </div>
    </main>
  );
}

const inputStyle = { display: "block", width: "100%", minWidth: 230, padding: "12px",
  borderRadius: 8, background: "#09263b", border: "1px solid #4389ae", color: "#fff", marginTop: 5 };
const buttonStyle = { cursor: "pointer", padding: "11px 14px", border: "none", borderRadius: 8,
  background: "#43c5ff", color: "#041827", fontWeight: 700 as const };
const cardStyle = { background: "#0b2035", border: "1px solid #235379", borderRadius: 12, padding: 20 };
const rowStyle = { display: "flex", alignItems: "center", justifyContent: "space-between",
  flexWrap: "wrap" as const, gap: 14, padding: "14px 0", borderBottom: "1px solid #25455e" };
