"use client";

import { useMemo, useState } from "react";

const sectors = [
  { key: "serve", title: "Axiom Serve", eyebrow: "RESTAURANTES + HOSPITALITY", text: "Robots de servicio para delivery, bussing, apoyo al salón y operaciones de alto volumen.", accent: "SERVICE" },
  { key: "host", title: "Axiom Host", eyebrow: "RECEPCIÓN + EXPERIENCIA", text: "Recepción, orientación, promociones, telepresencia y atención guiada para clientes y visitantes.", accent: "HOST" },
  { key: "clean", title: "Axiom Clean", eyebrow: "LIMPIEZA COMERCIAL", text: "Autonomous floor care para hoteles, hospitales, malls, oficinas, warehouses y contratistas.", accent: "CLEAN" },
  { key: "turf", title: "Axiom Turf", eyebrow: "GROUNDS + MOWING", text: "Mantenimiento autónomo de terrenos para resorts, golf, deportes, municipios y grandes propiedades.", accent: "TURF" },
  { key: "move", title: "Axiom Move", eyebrow: "WAREHOUSE + LOGÍSTICA", text: "AMRs para mover materiales, carts, suministros y trabajo en proceso dentro de la operación.", accent: "MOVE" },
  { key: "industrial", title: "Axiom Industrial", eyebrow: "COBOTS + AUTOMATION", text: "Palletizing, machine tending, pick-and-place, welding y procesos repetitivos de manufactura.", accent: "INDUSTRIAL" },
  { key: "connect", title: "Axiom Connect", eyebrow: "TELEPRESENCE + HEALTHCARE", text: "Telepresencia, orientación, delivery interno y conexión remota para salud y atención especializada.", accent: "CONNECT" },
  { key: "future", title: "Future Robotics", eyebrow: "EMERGING PLATFORMS", text: "Humanoids, inspection, security y tecnologías emergentes bajo pilotos controlados y casos de uso reales.", accent: "FUTURE" },
];

const prototypes = [
  { name: "GreetingBot Nova", maker: "OrionStar", fit: "Recepción + guidance", sector: "host", note: "Showrooms, retail, lobby y orientación multilingüe." },
  { name: "Cruzr 1S", maker: "UBTECH", fit: "Premium customer experience", sector: "host", note: "Experiencias de marca, showrooms y smart demos." },
  { name: "BellaBot Pro", maker: "PUDU", fit: "Service delivery", sector: "serve", note: "Restaurantes, hospitality y delivery interno." },
  { name: "Phantas", maker: "Gausium", fit: "Compact 4-in-1 cleaning", sector: "clean", note: "Mixed floors, healthcare, retail, offices y hoteles." },
  { name: "Scrubber 75", maker: "Gausium", fit: "Heavy-duty cleaning", sector: "clean", note: "Warehouses, parking, manufacturing y grandes superficies." },
  { name: "MiR250", maker: "MiR", fit: "Flexible AMR", sector: "move", note: "Material flow, WIP, bins, carts y line-side replenishment." },
  { name: "PUDU T300", maker: "PUDU", fit: "Industrial delivery", sector: "move", note: "Carga interna, logística industrial y operación 24/7." },
  { name: "Elite Robots CS", maker: "Elite Robots", fit: "Cobot automation", sector: "industrial", note: "Palletizing, machine tending, welding y packaging." },
  { name: "temi V3", maker: "temi", fit: "Telepresence + custom apps", sector: "connect", note: "Healthcare, senior living, remote specialists y concierge." },
  { name: "Kress RTKn", maker: "Kress", fit: "Autonomous turf care", sector: "turf", note: "Grounds maintenance para grandes propiedades y hospitality." },
  { name: "FireFly AMP", maker: "FireFly", fit: "Large-scale mowing", sector: "turf", note: "Golf, sports, municipal y large grounds." },
  { name: "Scythe M.52", maker: "Scythe", fit: "Commercial mowing", sector: "turf", note: "Landscaping contractors y operaciones comerciales." },
];

type Match = {
  sector: string;
  task: string;
  environment: string;
  scale: string;
  priority: string;
};

const initialMatch: Match = { sector: "", task: "", environment: "", scale: "", priority: "" };

function recommendedKey(match: Match) {
  const blob = `${match.sector} ${match.task} ${match.environment} ${match.priority}`.toLowerCase();
  if (blob.includes("clean") || blob.includes("limpieza") || blob.includes("piso")) return "clean";
  if (blob.includes("turf") || blob.includes("terreno") || blob.includes("grama") || blob.includes("mowing")) return "turf";
  if (blob.includes("warehouse") || blob.includes("logística") || blob.includes("material") || blob.includes("almacén")) return "move";
  if (blob.includes("manufact") || blob.includes("pallet") || blob.includes("machine") || blob.includes("industrial")) return "industrial";
  if (blob.includes("health") || blob.includes("telepres") || blob.includes("hospital") || blob.includes("clínica")) return "connect";
  if (blob.includes("rest") || blob.includes("hotel") || blob.includes("delivery") || blob.includes("mesas")) return "serve";
  return "host";
}

export default function RoboticsExperience() {
  const [match, setMatch] = useState<Match>(initialMatch);
  const [showResult, setShowResult] = useState(false);
  const resultKey = useMemo(() => recommendedKey(match), [match]);
  const result = sectors.find((s) => s.key === resultKey) ?? sectors[1];
  const resultBots = prototypes.filter((p) => p.sector === resultKey).slice(0, 3);

  function setField(field: keyof Match, value: string) {
    setMatch((current) => ({ ...current, [field]: value }));
    setShowResult(false);
  }

  return (
    <main className="robotics-page">
      <nav className="robotics-nav">
        <a href="/" className="robotics-brand" aria-label="AxiomAI Solutions home">
          <img src="/logo.png" alt="AxiomAI Solutions" />
          <span>AxiomAI Robotics</span>
        </a>
        <div className="robotics-nav-links">
          <a href="#solutions">Soluciones</a>
          <a href="#match">Robot Match</a>
          <a href="#brain">Brain</a>
          <a href="#contact">Contacto</a>
        </div>
      </nav>

      <section className="robotics-hero">
        <div className="robotics-orb robotics-orb-one" />
        <div className="robotics-orb robotics-orb-two" />
        <div className="robotics-grid-glow" />
        <div className="robotics-hero-copy">
          <span className="robotics-kicker">ROBOTICS INTEGRATION • PUERTO RICO</span>
          <h1>THE RIGHT ROBOT<br /><span>FOR YOUR BUSINESS.</span></h1>
          <p>
            Analizamos tu operación, comparamos tecnologías y diseñamos la solución robótica correcta. No comenzamos con un catálogo. Comenzamos con tu problema.
          </p>
          <div className="robotics-actions">
            <a className="robotics-btn robotics-btn-primary" href="#match">Encuentra tu robot</a>
            <a className="robotics-btn robotics-btn-secondary" href="#solutions">Explorar soluciones</a>
          </div>
        </div>
        <div className="robotics-hero-visual" aria-hidden="true">
          <div className="robotics-core-ring ring-a" />
          <div className="robotics-core-ring ring-b" />
          <div className="robotics-core-ring ring-c" />
          <img src="/axiomos-brain-neon.png" alt="" />
          <div className="robotics-signal signal-one">ASSESS</div>
          <div className="robotics-signal signal-two">MATCH</div>
          <div className="robotics-signal signal-three">DEPLOY</div>
        </div>
        <div className="robotics-hero-footer">
          <span>Brain piensa.</span>
          <span>La robótica ejecuta.</span>
          <span>Tu operación mejora.</span>
        </div>
      </section>

      <section id="solutions" className="robotics-section robotics-solutions">
        <div className="robotics-section-heading">
          <span className="robotics-kicker">ONE INTEGRATOR • MULTIPLE TECHNOLOGIES</span>
          <h2>No vendemos un robot.<br /><span>Diseñamos una solución.</span></h2>
          <p>Ocho divisiones para cubrir operaciones reales, desde el front desk hasta el warehouse y el terreno exterior.</p>
        </div>
        <div className="robotics-sector-grid">
          {sectors.map((sector, index) => (
            <article className="robotics-sector-card" key={sector.key}>
              <div className="robotics-sector-number">0{index + 1}</div>
              <div className="robotics-sector-accent">{sector.accent}</div>
              <span>{sector.eyebrow}</span>
              <h3>{sector.title}</h3>
              <p>{sector.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="robotics-section robotics-method">
        <div className="robotics-section-heading robotics-heading-left">
          <span className="robotics-kicker">THE AXIOMAI METHOD</span>
          <h2>Del problema operativo<br /><span>a una implementación medible.</span></h2>
        </div>
        <div className="robotics-method-line">
          {[
            ["01", "ASSESS", "Medimos flujo, espacio, tareas, carga, tráfico, infraestructura y restricciones."],
            ["02", "COMPARE", "Comparamos fabricantes, modelos, soporte, integración, costo y disponibilidad."],
            ["03", "DESIGN", "Diseñamos Robot Match, integración con Brain, SOPs, pilot y KPIs."],
            ["04", "DEPLOY", "Implementamos, entrenamos, medimos y escalamos solo si los datos lo justifican."],
          ].map(([n, title, text]) => (
            <div className="robotics-method-step" key={n}>
              <span>{n}</span><h3>{title}</h3><p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="match" className="robotics-section robotics-match">
        <div className="robotics-section-heading">
          <span className="robotics-kicker">ROBOT MATCH • PRELIMINARY ASSESSMENT</span>
          <h2>¿Qué robot necesita<br /><span>tu operación?</span></h2>
          <p>Responde cinco preguntas. El resultado es una orientación inicial; el Robot Match final requiere assessment del sitio.</p>
        </div>

        <div className="robotics-match-shell">
          <div className="robotics-match-form">
            <label>
              <span>1. Industria / operación</span>
              <select value={match.sector} onChange={(e) => setField("sector", e.target.value)}>
                <option value="">Selecciona</option>
                <option>Restaurante / Hospitality</option>
                <option>Retail / Showroom</option>
                <option>Healthcare / Senior Living</option>
                <option>Warehouse / Logistics</option>
                <option>Manufacturing / Industrial</option>
                <option>Commercial Cleaning</option>
                <option>Grounds / Turf</option>
              </select>
            </label>
            <label>
              <span>2. Tarea repetitiva principal</span>
              <select value={match.task} onChange={(e) => setField("task", e.target.value)}>
                <option value="">Selecciona</option>
                <option>Recibir / orientar clientes</option>
                <option>Delivery / mover artículos</option>
                <option>Limpieza de pisos</option>
                <option>Mover materiales / carts</option>
                <option>Palletizing / machine tending</option>
                <option>Telepresencia / atención remota</option>
                <option>Cortar grama / mantener terreno</option>
              </select>
            </label>
            <label>
              <span>3. Ambiente</span>
              <select value={match.environment} onChange={(e) => setField("environment", e.target.value)}>
                <option value="">Selecciona</option>
                <option>Público / clientes presentes</option>
                <option>Back of house</option>
                <option>Warehouse / industrial</option>
                <option>Healthcare</option>
                <option>Exterior / terreno</option>
              </select>
            </label>
            <label>
              <span>4. Escala</span>
              <select value={match.scale} onChange={(e) => setField("scale", e.target.value)}>
                <option value="">Selecciona</option>
                <option>Pequeña / una zona</option>
                <option>Mediana / múltiples zonas</option>
                <option>Grande / campus o facility</option>
                <option>Multi-site / cadena</option>
              </select>
            </label>
            <label>
              <span>5. Prioridad</span>
              <select value={match.priority} onChange={(e) => setField("priority", e.target.value)}>
                <option value="">Selecciona</option>
                <option>Experiencia del cliente</option>
                <option>Reducir trabajo repetitivo</option>
                <option>Aumentar cobertura / capacidad</option>
                <option>Seguridad / consistencia</option>
                <option>Integración / datos / reporting</option>
              </select>
            </label>
            <button className="robotics-btn robotics-btn-primary robotics-match-button" onClick={() => setShowResult(true)} disabled={!match.sector || !match.task}>
              Generar recomendación preliminar
            </button>
          </div>

          <div className={`robotics-match-result ${showResult ? "is-visible" : ""}`}>
            {!showResult ? (
              <div className="robotics-placeholder">
                <img src="/axiomos-brain-neon.png" alt="Brain" />
                <span>BRAIN + ROBOT MATCH</span>
                <h3>Tu operación primero.</h3>
                <p>Selecciona la industria y la tarea. Luego comparamos la tecnología alrededor del caso de uso.</p>
              </div>
            ) : (
              <div>
                <span className="robotics-result-tag">PRELIMINARY MATCH</span>
                <h3>{result.title}</h3>
                <p>{result.text}</p>
                <div className="robotics-result-bots">
                  {resultBots.length ? resultBots.map((bot) => (
                    <div key={bot.name}>
                      <small>{bot.maker}</small>
                      <strong>{bot.name}</strong>
                      <span>{bot.fit}</span>
                      <p>{bot.note}</p>
                    </div>
                  )) : (
                    <div>
                      <small>AXIOMAI</small><strong>Custom Robot Match</strong><span>Multi-manufacturer comparison</span><p>Seleccionaremos plataformas según el assessment técnico y comercial.</p>
                    </div>
                  )}
                </div>
                <p className="robotics-result-note">Resultado orientativo. Validamos dimensiones, rutas, payload, red, safety, soporte, warranty y pricing antes de recomendar una plataforma al cliente.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="brain" className="robotics-section robotics-brain">
        <div className="robotics-brain-visual">
          <div className="robotics-brain-halo" />
          <img src="/axiomos-brain-neon.png" alt="AxiomAI Brain" />
        </div>
        <div className="robotics-brain-copy">
          <span className="robotics-kicker">THE INTELLIGENCE LAYER</span>
          <h2>Brain piensa.<br /><span>La robótica ejecuta.</span></h2>
          <p>Brain puede conectar la interacción física con tareas, prospectos, alertas, seguimiento, CRM, WhatsApp y reporting. El robot deja de ser una demostración aislada y se convierte en parte de la operación.</p>
          <div className="robotics-brain-points">
            <div><strong>01</strong><span>Task orchestration</span></div>
            <div><strong>02</strong><span>Lead & intent capture</span></div>
            <div><strong>03</strong><span>Alerts & human handoff</span></div>
            <div><strong>04</strong><span>KPI & operational reporting</span></div>
          </div>
        </div>
      </section>

      <section className="robotics-section robotics-prototypes">
        <div className="robotics-section-heading robotics-heading-left">
          <span className="robotics-kicker">MULTI-MANUFACTURER APPROACH</span>
          <h2>La plataforma correcta<br /><span>para cada misión.</span></h2>
          <p>Estos son ejemplos de tecnologías evaluadas dentro de nuestro Robot Match. La disponibilidad y relación comercial se confirma antes de una propuesta final.</p>
        </div>
        <div className="robotics-prototype-strip">
          {prototypes.slice(0, 8).map((bot) => (
            <article key={bot.name}>
              <span>{bot.maker}</span>
              <h3>{bot.name}</h3>
              <strong>{bot.fit}</strong>
              <p>{bot.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="contact" className="robotics-cta">
        <div>
          <span className="robotics-kicker">START WITH THE OPERATION</span>
          <h2>Antes de comprar un robot,<br /><span>descubre cuál necesitas.</span></h2>
          <p>Evaluación inicial para empresas en Puerto Rico. Analizamos el caso de uso, comparamos tecnologías y diseñamos un pilot medible.</p>
        </div>
        <div className="robotics-cta-actions">
          <a className="robotics-btn robotics-btn-primary" href="/solicitud">Solicitar evaluación</a>
          <a className="robotics-btn robotics-btn-secondary" href="https://wa.me/17874503679">WhatsApp</a>
          <a className="robotics-email" href="mailto:contacto@axiomaisolutions.org">contacto@axiomaisolutions.org</a>
        </div>
      </section>

      <footer className="robotics-footer">
        <img src="/logo.png" alt="AxiomAI Solutions" />
        <div><strong>AxiomAI Solutions LLC</strong><span>AxiomAI Robotics • Puerto Rico</span></div>
        <div className="robotics-footer-right"><span>1 (787) 450-3679</span><span>axiomaisolutions.org</span></div>
      </footer>
    </main>
  );
}
