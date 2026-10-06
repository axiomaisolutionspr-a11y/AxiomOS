"use client";

import { useMemo, useState } from "react";
import { useRoboticsLanguage } from "./robotics-language";

const iconPaths: Record<string, string[]> = {
  serve: ["M3 13h18l-2 7H5l-2-7Z", "M6 12a6 6 0 0 1 12 0", "M8 17h.01M12 17h.01M16 17h.01"],
  host: ["M4 21V5l8-3 8 3v16", "M9 21v-5h6v5", "M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01"],
  clean: ["m4 20 9-9", "m10 14 4 4", "m13 11 6-6 2 2-6 6", "M3 21h6"],
  turf: ["M20 4C11 4 5 7 5 14a6 6 0 0 0 6 6c7 0 9-7 9-16Z", "M4 21c3-5 7-8 13-12"],
  move: ["M3 7h13v11H3z", "M16 11h3l2 3v4h-5", "M7 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"],
  industrial: ["M3 21V9l6 3V8l6 4V5l6 3v13H3Z", "M7 17h.01M12 17h.01M17 17h.01"],
  connect: ["M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M17 8h4M19 6v4"],
  future: ["M12 3v3M12 18v3M3 12h3M18 12h3", "m5.6 5.6 2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1", "M12 8v8M8 12h8"],
  assess: ["M10.5 18a7.5 7.5 0 1 1 5.3-2.2", "m16 16 5 5"],
  compare: ["M4 6h16M4 12h16M4 18h16", "M8 4v4M15 10v4M11 16v4"],
  design: ["M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z", "m13.5 6.5 4 4"],
  deploy: ["M4 12h14", "m13 6 6 6-6 6", "M4 5v14"],
  industry: ["M3 21V9l6 3V8l6 4V5l6 3v13H3Z", "M7 17h.01M12 17h.01M17 17h.01"],
  task: ["M4 7h5l3 5-3 5H4", "m12 12 4-4 3 2-4 4", "M18 14v5M15 19h6"],
  environment: ["M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z", "M12 10h.01"],
  scale: ["M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5", "M4 4l6 6m10-6-6 6M4 20l6-6m10 6-6-6"],
  priority: ["M12 3v3M12 18v3M3 12h3M18 12h3", "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z", "M12 10v4m-2-2h4"],
  orchestration: ["M12 5v5m0 4v5M5 12h14", "M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM12 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"],
  leads: ["M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M19 8v6m-3-3h6"],
  alerts: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z", "M10 21h4"],
  reports: ["M4 19V5M4 19h17", "m7 15 4-4 3 2 6-7", "M16 6h4v4"],
  fallback: ["M12 3v3M12 18v3M3 12h3M18 12h3", "M12 8v8M8 12h8"],
};
function RoboticsIcon({ name, className }: { name: string; className?: string }) {
  const paths = iconPaths[name] ?? iconPaths.fallback;
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths.map((d, i) => <path key={i} d={d} />)}</svg>;
}
const matchIconNames = ["industry", "task", "environment", "scale", "priority"];
const brainIconNames = ["orchestration", "leads", "alerts", "reports"];


type Match = {
  sector: string;
  task: string;
  environment: string;
  scale: string;
  priority: string;
};

const initialMatch: Match = { sector: "", task: "", environment: "", scale: "", priority: "" };

const content = {
  es: {
    nav: { solutions: "Soluciones", match: "Robot Match", brain: "Brain", contact: "Contacto" },
    sectors: [
      { key: "serve", title: "Axiom Serve", eyebrow: "RESTAURANTES + HOSPITALIDAD", text: "Robots de servicio para entrega, recogido de mesas, apoyo al salón y operaciones de alto volumen.", accent: "SERVICIO" },
      { key: "host", title: "Axiom Host", eyebrow: "RECEPCIÓN + EXPERIENCIA", text: "Recepción, orientación, promociones, telepresencia y atención guiada para clientes y visitantes.", accent: "RECEPCIÓN" },
      { key: "clean", title: "Axiom Clean", eyebrow: "LIMPIEZA COMERCIAL", text: "Limpieza autónoma de pisos para hoteles, hospitales, centros comerciales, oficinas, almacenes y contratistas.", accent: "LIMPIEZA" },
      { key: "turf", title: "Axiom Turf", eyebrow: "TERRENOS + CORTE", text: "Mantenimiento autónomo de terrenos para resorts, golf, deportes, municipios y grandes propiedades.", accent: "TERRENOS" },
      { key: "move", title: "Axiom Move", eyebrow: "ALMACÉN + LOGÍSTICA", text: "AMRs para mover materiales, carros, suministros y trabajo en proceso dentro de la operación.", accent: "LOGÍSTICA" },
      { key: "industrial", title: "Axiom Industrial", eyebrow: "COBOTS + AUTOMATIZACIÓN", text: "Paletizado, atención de máquinas, pick-and-place, soldadura y procesos repetitivos de manufactura.", accent: "INDUSTRIAL" },
      { key: "connect", title: "Axiom Connect", eyebrow: "TELEPRESENCIA + SALUD", text: "Telepresencia, orientación, entrega interna y conexión remota para salud y atención especializada.", accent: "CONECTAR" },
      { key: "future", title: "Future Robotics", eyebrow: "PLATAFORMAS EMERGENTES", text: "Humanoides, inspección, seguridad y tecnologías emergentes bajo pilotos controlados y casos de uso reales.", accent: "FUTURO" },
    ],
    prototypes: [
      { name: "GreetingBot Nova", maker: "OrionStar", fit: "Recepción + orientación", sector: "host", note: "Salas de exhibición, tiendas, vestíbulos y orientación multilingüe." },
      { name: "Cruzr 1S", maker: "UBTECH", fit: "Experiencia premium", sector: "host", note: "Experiencias de marca, salas de exhibición y demostraciones inteligentes." },
      { name: "BellaBot Pro", maker: "PUDU", fit: "Entrega de servicio", sector: "serve", note: "Restaurantes, hospitalidad y entrega interna." },
      { name: "Phantas", maker: "Gausium", fit: "Limpieza compacta 4-en-1", sector: "clean", note: "Pisos mixtos, salud, tiendas, oficinas y hoteles." },
      { name: "Scrubber 75", maker: "Gausium", fit: "Limpieza de trabajo pesado", sector: "clean", note: "Almacenes, estacionamientos, manufactura y grandes superficies." },
      { name: "MiR250", maker: "MiR", fit: "AMR flexible", sector: "move", note: "Flujo de materiales, WIP, contenedores, carros y abastecimiento de línea." },
      { name: "PUDU T300", maker: "PUDU", fit: "Entrega industrial", sector: "move", note: "Carga interna, logística industrial y operación continua." },
      { name: "Elite Robots CS", maker: "Elite Robots", fit: "Automatización con cobot", sector: "industrial", note: "Paletizado, atención de máquinas, soldadura y empaque." },
      { name: "temi V3", maker: "temi", fit: "Telepresencia + apps", sector: "connect", note: "Salud, senior living, especialistas remotos y concierge." },
      { name: "Kress RTKn", maker: "Kress", fit: "Cuidado autónomo de terrenos", sector: "turf", note: "Mantenimiento de terrenos para grandes propiedades y hospitalidad." },
      { name: "FireFly AMP", maker: "FireFly", fit: "Corte a gran escala", sector: "turf", note: "Golf, deportes, municipios y grandes terrenos." },
      { name: "Scythe M.52", maker: "Scythe", fit: "Corte comercial", sector: "turf", note: "Contratistas de paisajismo y operaciones comerciales." },
    ],
    hero: {
      kicker: "INTEGRACIÓN ROBÓTICA • PUERTO RICO",
      titleA: "EL ROBOT CORRECTO",
      titleB: "PARA TU NEGOCIO.",
      text: "Analizamos tu operación, comparamos tecnologías y diseñamos la solución robótica correcta. No comenzamos con un catálogo. Comenzamos con tu problema.",
      find: "Encuentra tu robot",
      explore: "Explorar soluciones",
      assess: "EVALUAR",
      compare: "COMPARAR",
      deploy: "IMPLEMENTAR",
      footer: ["Brain piensa.", "La robótica ejecuta.", "Tu operación mejora."],
    },
    solutions: {
      kicker: "UN INTEGRADOR • MÚLTIPLES TECNOLOGÍAS",
      titleA: "No vendemos un robot.",
      titleB: "Diseñamos una solución.",
      text: "Ocho divisiones para cubrir operaciones reales, desde la recepción hasta el almacén y el terreno exterior.",
    },
    method: {
      kicker: "EL MÉTODO AXIOMAI",
      titleA: "Del problema operativo",
      titleB: "a una implementación medible.",
      steps: [
        ["assess", "EVALUAR", "Medimos flujo, espacio, tareas, carga, tráfico, infraestructura y restricciones."],
        ["compare", "COMPARAR", "Comparamos fabricantes, modelos, soporte, integración, costo y disponibilidad."],
        ["design", "DISEÑAR", "Diseñamos Robot Match, integración con Brain, SOPs, piloto y KPIs."],
        ["deploy", "IMPLEMENTAR", "Implementamos, entrenamos, medimos y escalamos solo si los datos lo justifican."],
      ],
    },
    match: {
      kicker: "ROBOT MATCH • EVALUACIÓN PRELIMINAR",
      titleA: "¿Qué robot necesita",
      titleB: "tu operación?",
      text: "Responde cinco preguntas. El resultado es una orientación inicial; el Robot Match final requiere evaluación del sitio.",
      labels: ["Industria / operación", "Tarea repetitiva principal", "Ambiente", "Escala", "Prioridad"],
      select: "Selecciona",
      sectors: [["serve","Restaurante / Hospitalidad"],["host","Retail / Sala de exhibición"],["connect","Salud / Senior Living"],["move","Almacén / Logística"],["industrial","Manufactura / Industrial"],["clean","Limpieza comercial"],["turf","Terrenos / Corte"]],
      tasks: [["host","Recibir / orientar clientes"],["serve","Entrega / mover artículos"],["clean","Limpieza de pisos"],["move","Mover materiales / carros"],["industrial","Paletizado / atención de máquinas"],["connect","Telepresencia / atención remota"],["turf","Cortar grama / mantener terreno"]],
      environments: [["public","Público / clientes presentes"],["back","Área de servicio / back of house"],["industrial","Almacén / industrial"],["health","Salud"],["outdoor","Exterior / terreno"]],
      scales: [["small","Pequeña / una zona"],["medium","Mediana / múltiples zonas"],["large","Grande / campus o instalación"],["multi","Multi-sitio / cadena"]],
      priorities: [["experience","Experiencia del cliente"],["labor","Reducir trabajo repetitivo"],["capacity","Aumentar cobertura / capacidad"],["safety","Seguridad / consistencia"],["data","Integración / datos / reportes"]],
      button: "Generar recomendación preliminar",
      placeholderTag: "BRAIN + ROBOT MATCH",
      placeholderTitle: "Tu operación primero.",
      placeholderText: "Selecciona la industria y la tarea. Luego comparamos la tecnología alrededor del caso de uso.",
      resultTag: "COINCIDENCIA PRELIMINAR",
      customTitle: "Robot Match personalizado",
      customSub: "Comparación multi-fabricante",
      customText: "Seleccionaremos plataformas según la evaluación técnica y comercial.",
      note: "Resultado orientativo. Validamos dimensiones, rutas, carga útil, red, seguridad, soporte, garantía y precio antes de recomendar una plataforma al cliente.",
    },
    brain: {
      kicker: "LA CAPA DE INTELIGENCIA",
      titleA: "Brain piensa.",
      titleB: "La robótica ejecuta.",
      text: "Brain puede conectar la interacción física con tareas, prospectos, alertas, seguimiento, CRM, WhatsApp y reportes. El robot deja de ser una demostración aislada y se convierte en parte de la operación.",
      points: ["Orquestación de tareas", "Captura de prospectos e intención", "Alertas y transferencia a humanos", "KPIs y reportes operacionales"],
    },
    prototypesSection: {
      kicker: "ENFOQUE MULTI-FABRICANTE",
      titleA: "La plataforma correcta",
      titleB: "para cada misión.",
      text: "Estos son ejemplos de tecnologías evaluadas dentro de nuestro Robot Match. La disponibilidad y relación comercial se confirma antes de una propuesta final.",
    },
    cta: {
      kicker: "COMIENZA CON LA OPERACIÓN",
      titleA: "Antes de comprar un robot,",
      titleB: "descubre cuál necesitas.",
      text: "Evaluación inicial para empresas en Puerto Rico. Analizamos el caso de uso, comparamos tecnologías y diseñamos un piloto medible.",
      evaluation: "Solicitar evaluación",
    },
    footerSub: "AxiomAI Robotics • Puerto Rico",
    languageButton: "EN",
    languageLabel: "Cambiar a inglés",
  },
  en: {
    nav: { solutions: "Solutions", match: "Robot Match", brain: "Brain", contact: "Contact" },
    sectors: [
      { key: "serve", title: "Axiom Serve", eyebrow: "RESTAURANTS + HOSPITALITY", text: "Service robots for delivery, bussing, dining-room support and high-volume operations.", accent: "SERVICE" },
      { key: "host", title: "Axiom Host", eyebrow: "RECEPTION + EXPERIENCE", text: "Reception, guidance, promotions, telepresence and guided customer or visitor experiences.", accent: "HOST" },
      { key: "clean", title: "Axiom Clean", eyebrow: "COMMERCIAL CLEANING", text: "Autonomous floor care for hotels, hospitals, malls, offices, warehouses and contractors.", accent: "CLEAN" },
      { key: "turf", title: "Axiom Turf", eyebrow: "GROUNDS + MOWING", text: "Autonomous grounds maintenance for resorts, golf, sports, municipalities and large properties.", accent: "TURF" },
      { key: "move", title: "Axiom Move", eyebrow: "WAREHOUSE + LOGISTICS", text: "AMRs for moving materials, carts, supplies and work in process across the operation.", accent: "MOVE" },
      { key: "industrial", title: "Axiom Industrial", eyebrow: "COBOTS + AUTOMATION", text: "Palletizing, machine tending, pick-and-place, welding and repetitive manufacturing processes.", accent: "INDUSTRIAL" },
      { key: "connect", title: "Axiom Connect", eyebrow: "TELEPRESENCE + HEALTHCARE", text: "Telepresence, guidance, internal delivery and remote connection for healthcare and specialized service.", accent: "CONNECT" },
      { key: "future", title: "Future Robotics", eyebrow: "EMERGING PLATFORMS", text: "Humanoids, inspection, security and emerging technologies under controlled pilots and real use cases.", accent: "FUTURE" },
    ],
    prototypes: [
      { name: "GreetingBot Nova", maker: "OrionStar", fit: "Reception + guidance", sector: "host", note: "Showrooms, retail, lobbies and multilingual guidance." },
      { name: "Cruzr 1S", maker: "UBTECH", fit: "Premium customer experience", sector: "host", note: "Brand experiences, showrooms and smart demos." },
      { name: "BellaBot Pro", maker: "PUDU", fit: "Service delivery", sector: "serve", note: "Restaurants, hospitality and internal delivery." },
      { name: "Phantas", maker: "Gausium", fit: "Compact 4-in-1 cleaning", sector: "clean", note: "Mixed floors, healthcare, retail, offices and hotels." },
      { name: "Scrubber 75", maker: "Gausium", fit: "Heavy-duty cleaning", sector: "clean", note: "Warehouses, parking, manufacturing and large floor areas." },
      { name: "MiR250", maker: "MiR", fit: "Flexible AMR", sector: "move", note: "Material flow, WIP, bins, carts and line-side replenishment." },
      { name: "PUDU T300", maker: "PUDU", fit: "Industrial delivery", sector: "move", note: "Internal transport, industrial logistics and continuous operation." },
      { name: "Elite Robots CS", maker: "Elite Robots", fit: "Cobot automation", sector: "industrial", note: "Palletizing, machine tending, welding and packaging." },
      { name: "temi V3", maker: "temi", fit: "Telepresence + apps", sector: "connect", note: "Healthcare, senior living, remote specialists and concierge." },
      { name: "Kress RTKn", maker: "Kress", fit: "Autonomous turf care", sector: "turf", note: "Grounds maintenance for large properties and hospitality." },
      { name: "FireFly AMP", maker: "FireFly", fit: "Large-scale mowing", sector: "turf", note: "Golf, sports, municipal and large grounds." },
      { name: "Scythe M.52", maker: "Scythe", fit: "Commercial mowing", sector: "turf", note: "Landscaping contractors and commercial operations." },
    ],
    hero: {
      kicker: "ROBOTICS INTEGRATION • PUERTO RICO",
      titleA: "THE RIGHT ROBOT",
      titleB: "FOR YOUR BUSINESS.",
      text: "We analyze your operation, compare technologies and design the right robotics solution. We do not start with a catalog. We start with your problem.",
      find: "Find your robot",
      explore: "Explore solutions",
      assess: "ASSESS",
      compare: "COMPARE",
      deploy: "DEPLOY",
      footer: ["Brain thinks.", "Robotics executes.", "Your operation improves."],
    },
    solutions: {
      kicker: "ONE INTEGRATOR • MULTIPLE TECHNOLOGIES",
      titleA: "We do not sell a robot.",
      titleB: "We design a solution.",
      text: "Eight divisions covering real operations, from the front desk to the warehouse and outdoor grounds.",
    },
    method: {
      kicker: "THE AXIOMAI METHOD",
      titleA: "From operational problem",
      titleB: "to measurable deployment.",
      steps: [
        ["assess", "ASSESS", "We measure flow, space, tasks, load, traffic, infrastructure and constraints."],
        ["compare", "COMPARE", "We compare manufacturers, models, support, integration, cost and availability."],
        ["design", "DESIGN", "We design the Robot Match, Brain integration, SOPs, pilot and KPIs."],
        ["deploy", "DEPLOY", "We deploy, train, measure and scale only when the data supports it."],
      ],
    },
    match: {
      kicker: "ROBOT MATCH • PRELIMINARY ASSESSMENT",
      titleA: "What robot does",
      titleB: "your operation need?",
      text: "Answer five questions. The result is an initial direction; final Robot Match requires a site assessment.",
      labels: ["Industry / operation", "Main repetitive task", "Environment", "Scale", "Priority"],
      select: "Select",
      sectors: [["serve","Restaurant / Hospitality"],["host","Retail / Showroom"],["connect","Healthcare / Senior Living"],["move","Warehouse / Logistics"],["industrial","Manufacturing / Industrial"],["clean","Commercial Cleaning"],["turf","Grounds / Turf"]],
      tasks: [["host","Receive / guide customers"],["serve","Delivery / move items"],["clean","Floor cleaning"],["move","Move materials / carts"],["industrial","Palletizing / machine tending"],["connect","Telepresence / remote service"],["turf","Mowing / grounds maintenance"]],
      environments: [["public","Public / customers present"],["back","Back of house"],["industrial","Warehouse / industrial"],["health","Healthcare"],["outdoor","Outdoor / grounds"]],
      scales: [["small","Small / one zone"],["medium","Medium / multiple zones"],["large","Large / campus or facility"],["multi","Multi-site / chain"]],
      priorities: [["experience","Customer experience"],["labor","Reduce repetitive work"],["capacity","Increase coverage / capacity"],["safety","Safety / consistency"],["data","Integration / data / reporting"]],
      button: "Generate preliminary recommendation",
      placeholderTag: "BRAIN + ROBOT MATCH",
      placeholderTitle: "Your operation comes first.",
      placeholderText: "Select the industry and task. Then we compare the technology around the use case.",
      resultTag: "PRELIMINARY MATCH",
      customTitle: "Custom Robot Match",
      customSub: "Multi-manufacturer comparison",
      customText: "We will select platforms based on the technical and commercial assessment.",
      note: "Directional result. We validate dimensions, routes, payload, network, safety, support, warranty and pricing before recommending a platform to the client.",
    },
    brain: {
      kicker: "THE INTELLIGENCE LAYER",
      titleA: "Brain thinks.",
      titleB: "Robotics executes.",
      text: "Brain can connect physical interaction with tasks, leads, alerts, follow-up, CRM, WhatsApp and reporting. The robot stops being an isolated demo and becomes part of the operation.",
      points: ["Task orchestration", "Lead & intent capture", "Alerts & human handoff", "KPI & operational reporting"],
    },
    prototypesSection: {
      kicker: "MULTI-MANUFACTURER APPROACH",
      titleA: "The right platform",
      titleB: "for every mission.",
      text: "These are examples of technologies evaluated within our Robot Match. Availability and commercial relationship are confirmed before a final proposal.",
    },
    cta: {
      kicker: "START WITH THE OPERATION",
      titleA: "Before buying a robot,",
      titleB: "discover which one you need.",
      text: "Initial assessment for companies in Puerto Rico. We analyze the use case, compare technologies and design a measurable pilot.",
      evaluation: "Request assessment",
    },
    footerSub: "AxiomAI Robotics • Puerto Rico",
    languageButton: "ES",
    languageLabel: "Cambiar a español",
  },
};

function recommendedKey(match: Match) {
  if (match.task) return match.task;
  if (match.sector) return match.sector;
  return "host";
}

export default function RoboticsExperience() {
  const { language, toggleLanguage } = useRoboticsLanguage();
  const copy = content[language];
  const [match, setMatch] = useState<Match>(initialMatch);
  const [showResult, setShowResult] = useState(false);
  const resultKey = useMemo(() => recommendedKey(match), [match]);
  const result = copy.sectors.find((s) => s.key === resultKey) ?? copy.sectors[1];
  const resultBots = copy.prototypes.filter((p) => p.sector === resultKey).slice(0, 3);

  function setField(field: keyof Match, value: string) {
    setMatch((current) => ({ ...current, [field]: value }));
    setShowResult(false);
  }

  const optionList = (items: string[][]) => items.map(([value, label]) => <option key={value} value={value}>{label}</option>);

  return (
    <main className="robotics-page">
      <nav className="robotics-nav">
        <a href="/" className="robotics-brand" aria-label="AxiomAI Solutions home">
          <img src="/logo.png" alt="AxiomAI Solutions" />
          <span>AxiomAI Robotics</span>
        </a>
        <div className="robotics-nav-links">
          <a href="#solutions">{copy.nav.solutions}</a>
          <a href="#match">{copy.nav.match}</a>
          <a href="#brain">{copy.nav.brain}</a>
          <a href="#contact">{copy.nav.contact}</a>
        </div>
        <button className="robotics-lang-toggle" type="button" onClick={toggleLanguage} aria-label={copy.languageLabel} title={copy.languageLabel}>
          {copy.languageButton}
        </button>
      </nav>

      <section className="robotics-hero">
        <div className="robotics-orb robotics-orb-one" />
        <div className="robotics-orb robotics-orb-two" />
        <div className="robotics-grid-glow" />
        <div className="robotics-hero-copy">
          <span className="robotics-kicker">{copy.hero.kicker}</span>
          <h1>{copy.hero.titleA}<br /><span>{copy.hero.titleB}</span></h1>
          <p>{copy.hero.text}</p>
          <div className="robotics-actions">
            <a className="robotics-btn robotics-btn-primary" href="#match">{copy.hero.find}</a>
            <a className="robotics-btn robotics-btn-secondary" href="#solutions">{copy.hero.explore}</a>
          </div>
        </div>
        <div className="robotics-hero-visual" aria-hidden="true">
          <div className="robotics-core-ring ring-a" />
          <div className="robotics-core-ring ring-b" />
          <div className="robotics-core-ring ring-c" />
          <img src="/axiomos-brain-neon.png" alt="" />
          <div className="robotics-signal signal-one">{copy.hero.assess}</div>
          <div className="robotics-signal signal-two">{copy.hero.compare}</div>
          <div className="robotics-signal signal-three">{copy.hero.deploy}</div>
        </div>
        <div className="robotics-hero-footer">
          {copy.hero.footer.map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>

      <section id="solutions" className="robotics-section robotics-solutions">
        <div className="robotics-section-heading">
          <span className="robotics-kicker">{copy.solutions.kicker}</span>
          <h2>{copy.solutions.titleA}<br /><span>{copy.solutions.titleB}</span></h2>
          <p>{copy.solutions.text}</p>
        </div>
        <div className="robotics-sector-grid">
          {copy.sectors.map((sector) => (
            <article className="robotics-sector-card" key={sector.key}>
              <div className="robotics-sector-icon"><RoboticsIcon name={sector.key} /></div>
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
          <span className="robotics-kicker">{copy.method.kicker}</span>
          <h2>{copy.method.titleA}<br /><span>{copy.method.titleB}</span></h2>
        </div>
        <div className="robotics-method-line">
          {copy.method.steps.map(([iconName, title, text]) => (
            <div className="robotics-method-step" key={iconName}>
              <span className="robotics-method-icon"><RoboticsIcon name={iconName} /></span><h3>{title}</h3><p>{text}
            </div>
          ))}
        </div>
      </section>

      <section id="match" className="robotics-section robotics-match">
        <div className="robotics-section-heading">
          <span className="robotics-kicker">{copy.match.kicker}</span>
          <h2>{copy.match.titleA}<br /><span>{copy.match.titleB}</span></h2>
          <p>{copy.match.text}</p>
        </div>

        <div className="robotics-match-shell">
          <div className="robotics-match-form">
            <label><span className="robotics-match-label"><RoboticsIcon name={matchIconNames[0]} />{copy.match.labels[0]}</span><select value={match.sector} onChange={(e) => setField("sector", e.target.value)}><option value="">{copy.match.select}</option>{optionList(copy.match.sectors)}</select></label>
            <label><span className="robotics-match-label"><RoboticsIcon name={matchIconNames[1]} />{copy.match.labels[1]}</span><select value={match.task} onChange={(e) => setField("task", e.target.value)}><option value="">{copy.match.select}</option>{optionList(copy.match.tasks)}</select></label>
            <label><span className="robotics-match-label"><RoboticsIcon name={matchIconNames[2]} />{copy.match.labels[2]}</span><select value={match.environment} onChange={(e) => setField("environment", e.target.value)}><option value="">{copy.match.select}</option>{optionList(copy.match.environments)}</select></label>
            <label><span className="robotics-match-label"><RoboticsIcon name={matchIconNames[3]} />{copy.match.labels[3]}</span><select value={match.scale} onChange={(e) => setField("scale", e.target.value)}><option value="">{copy.match.select}</option>{optionList(copy.match.scales)}</select></label>
            <label><span className="robotics-match-label"><RoboticsIcon name={matchIconNames[4]} />{copy.match.labels[4]}</span><select value={match.priority} onChange={(e) => setField("priority", e.target.value)}><option value="">{copy.match.select}</option>{optionList(copy.match.priorities)}</select></label>
            <button className="robotics-btn robotics-btn-primary robotics-match-button" onClick={() => setShowResult(true)} disabled={!match.sector || !match.task}>{copy.match.button}</button>
          </div>

          <div className={`robotics-match-result ${showResult ? "is-visible" : ""}`}>
            {!showResult ? (
              <div className="robotics-placeholder">
                <img src="/axiomos-brain-neon.png" alt="Brain" />
                <span>{copy.match.placeholderTag}</span>
                <h3>{copy.match.placeholderTitle}</h3>
                <p>{copy.match.placeholderText}</p>
              </div>
            ) : (
              <div>
                <span className="robotics-result-tag">{copy.match.resultTag}</span>
                <h3>{result.title}</h3>
                <p>{result.text}</p>
                <div className="robotics-result-bots">
                  {resultBots.length ? resultBots.map((bot) => (
                    <div key={bot.name}><small>{bot.maker}</small><strong>{bot.name}</strong><span>{bot.fit}</span><p>{bot.note}</p></div>
                  )) : (
                    <div><small>AXIOMAI</small><strong>{copy.match.customTitle}</strong><span>{copy.match.customSub}</span><p>{copy.match.customText}</p></div>
                  )}
                </div>
                <p className="robotics-result-note">{copy.match.note}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="brain" className="robotics-section robotics-brain">
        <div className="robotics-brain-visual"><div className="robotics-brain-halo" /><img src="/axiomos-brain-neon.png" alt="AxiomAI Brain" /></div>
        <div className="robotics-brain-copy">
          <span className="robotics-kicker">{copy.brain.kicker}</span>
          <h2>{copy.brain.titleA}<br /><span>{copy.brain.titleB}</span></h2>
          <p>{copy.brain.text}</p>
          <div className="robotics-brain-points">
            {copy.brain.points.map((point, index) => <div key={point}><strong className="robotics-brain-point-icon"><RoboticsIcon name={brainIconNames[index]} /></strong><span>{point}</span></div>)}
          </div>
        </div>
      </section>

      <section className="robotics-section robotics-prototypes">
        <div className="robotics-section-heading robotics-heading-left">
          <span className="robotics-kicker">{copy.prototypesSection.kicker}</span>
          <h2>{copy.prototypesSection.titleA}<br /><span>{copy.prototypesSection.titleB}</span></h2>
          <p>{copy.prototypesSection.text}</p>
        </div>
        <div className="robotics-prototype-strip">
          {copy.prototypes.slice(0, 8).map((bot) => <article key={bot.name}><span>{bot.maker}</span><h3>{bot.name}</h3><strong>{bot.fit}</strong><p>{bot.note}</p></article>)}
        </div>
      </section>

      <section id="contact" className="robotics-cta">
        <div><span className="robotics-kicker">{copy.cta.kicker}</span><h2>{copy.cta.titleA}<br /><span>{copy.cta.titleB}</span></h2><p>{copy.cta.text}</p></div>
        <div className="robotics-cta-actions">
          <a className="robotics-btn robotics-btn-primary" href="/solicitud">{copy.cta.evaluation}</a>
          <a className="robotics-btn robotics-btn-secondary" href="https://wa.me/17874503679">WhatsApp</a>
          <a className="robotics-email" href="mailto:contacto@axiomaisolutions.org">contacto@axiomaisolutions.org</a>
        </div>
      </section>

      <footer className="robotics-footer">
        <img src="/logo.png" alt="AxiomAI Solutions" />
        <div><strong>AxiomAI Solutions LLC</strong><span>{copy.footerSub}</span></div>
        <div className="robotics-footer-right"><span>1 (787) 450-3679</span><span>axiomaisolutions.org</span></div>
      </footer>
    </main>
  );
}
