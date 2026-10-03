"use client";

import { useRoboticsLanguage } from "./robotics-language";

const scenes = {
  es: [
    {
      key: "intro",
      eyebrow: "AxiomAI Robotics",
      title: "EL ROBOT CORRECTO\nPARA TU NEGOCIO.",
      text: "Analizamos tu operación, comparamos tecnologías y diseñamos la solución robótica correcta. No comenzamos con un catálogo. Comenzamos con tu problema.",
      tag: "EVALUAR • COMPARAR • IMPLEMENTAR",
    },
    {
      key: "serve",
      eyebrow: "AxiomAI Serve + AxiomAI Host",
      title: "AUTOMATIZACIÓN\nQUE CONECTA CON PERSONAS.",
      text: "Restaurantes, hoteles, tiendas y salas de exhibición: entrega, recepción, orientación, promociones y experiencias conectadas con Brain.",
      tag: "SERVICIO • HOSPITALIDAD • RETAIL",
    },
    {
      key: "clean",
      eyebrow: "AxiomAI Clean",
      title: "LIMPIA MÁS.\nMIDE TODO.",
      text: "Limpieza autónoma de pisos para hoteles, hospitales, centros comerciales, oficinas, almacenes y contratistas. Cada misión se diseña según el piso, tráfico, suciedad y SOP.",
      tag: "FREGAR • ASPIRAR • BARRER • REPORTAR",
    },
    {
      key: "turf",
      eyebrow: "AxiomAI Turf",
      title: "AUTONOMÍA\nMÁS ALLÁ DE CUATRO PAREDES.",
      text: "Corte y mantenimiento autónomo de terrenos para resorts, golf, deportes, municipios y grandes propiedades, con Robot Match basado en área, terreno y operación.",
      tag: "TERRENOS • CORTE • EXTERIORES",
    },
    {
      key: "move",
      eyebrow: "AxiomAI Move + AxiomAI Industrial",
      title: "FLUJO DE MATERIALES\nQUE SE MUEVE SOLO.",
      text: "AMRs y cobots para abastecimiento de línea, carros, trabajo en proceso, paletizado, atención de máquinas y procesos repetitivos de manufactura.",
      tag: "AMR • COBOT • LOGÍSTICA",
    },
    {
      key: "connect",
      eyebrow: "AxiomAI Connect",
      title: "AUTOMATIZACIÓN FÍSICA.\nINTELIGENCIA DIGITAL.",
      text: "Telepresencia, salud, recepción y operaciones remotas conectadas con Brain para orquestar tareas, alertas, transferencia a humanos y reportes.",
      tag: "BRAIN PIENSA • LA ROBÓTICA EJECUTA",
    },
  ],
  en: [
    {
      key: "intro",
      eyebrow: "AxiomAI Robotics",
      title: "THE RIGHT ROBOT\nFOR YOUR BUSINESS.",
      text: "We analyze your operation, compare technologies and design the right robotics solution. We do not start with a catalog. We start with your problem.",
      tag: "ASSESS • COMPARE • DEPLOY",
    },
    {
      key: "serve",
      eyebrow: "AxiomAI Serve + AxiomAI Host",
      title: "AUTOMATION\nTHAT MEETS PEOPLE.",
      text: "Restaurants, hotels, retail and showrooms: delivery, reception, guidance, promotions and experiences connected with Brain.",
      tag: "SERVICE • HOSPITALITY • RETAIL",
    },
    {
      key: "clean",
      eyebrow: "AxiomAI Clean",
      title: "CLEAN MORE.\nMEASURE EVERYTHING.",
      text: "Autonomous floor care for hotels, hospitals, malls, offices, warehouses and contractors. Every mission is designed around floor type, traffic, soil and SOP.",
      tag: "SCRUB • VACUUM • SWEEP • REPORT",
    },
    {
      key: "turf",
      eyebrow: "AxiomAI Turf",
      title: "AUTONOMY\nBEYOND FOUR WALLS.",
      text: "Autonomous mowing and grounds maintenance for resorts, golf, sports, municipalities and large properties, with Robot Match based on acreage, terrain and operation.",
      tag: "GROUNDS • MOWING • OUTDOOR",
    },
    {
      key: "move",
      eyebrow: "AxiomAI Move + AxiomAI Industrial",
      title: "MATERIAL FLOW\nTHAT MOVES ITSELF.",
      text: "AMRs and cobots for line-side replenishment, carts, WIP, palletizing, machine tending and repetitive manufacturing processes.",
      tag: "AMR • COBOT • LOGISTICS",
    },
    {
      key: "connect",
      eyebrow: "AxiomAI Connect",
      title: "PHYSICAL AUTOMATION.\nDIGITAL INTELLIGENCE.",
      text: "Telepresence, healthcare, reception and remote operations connected with Brain for task orchestration, alerts, human handoff and reporting.",
      tag: "BRAIN THINKS • ROBOTICS EXECUTES",
    },
  ],
};

export default function CinematicShowcase() {
  const { language } = useRoboticsLanguage();
  const activeScenes = scenes[language];

  return (
    <div className="ax-scenes" aria-label={language === "es" ? "Resumen cinematográfico de AxiomAI Robotics" : "AxiomAI Robotics cinematic overview"}>
      {activeScenes.map((scene, index) => (
        <section className={`ax-scene ax-scene-${scene.key}`} key={scene.key}>
          {index === 0 ? (
            <video
              className="ax-scene-video"
              src="/videos/axiomai-avatar.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
            />
          ) : null}
          <div className="ax-scene-shade" />
          <div className="ax-scene-grid" />
          <div className="ax-scene-copy">
            <span className="ax-scene-eyebrow">{scene.eyebrow}</span>
            <h1>{scene.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h1>
            <p>{scene.text}</p>
            <div className="ax-scene-tag">{scene.tag}</div>
            {index === 0 ? (
              <div className="ax-scene-actions">
                <a href="#match">{language === "es" ? "Encuentra tu robot" : "Find your robot"}</a>
                <a href="#solutions">{language === "es" ? "Explorar soluciones" : "Explore solutions"}</a>
              </div>
            ) : null}
          </div>
          <div className="ax-scene-machine" aria-hidden="true">
            <div className="ax-machine-head" />
            <div className="ax-machine-core" />
            <div className="ax-machine-ring ax-machine-ring-a" />
            <div className="ax-machine-ring ax-machine-ring-b" />
            <div className="ax-machine-beam" />
          </div>
          <div className="ax-scene-floor" aria-hidden="true" />
          <div className="ax-scene-scroll">{language === "es" ? "DESLIZA PARA DESCUBRIR ↓" : "SCROLL TO DISCOVER ↓"}</div>
        </section>
      ))}
    </div>
  );
}
