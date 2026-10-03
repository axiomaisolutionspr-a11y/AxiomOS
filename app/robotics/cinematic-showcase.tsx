const scenes = [
  {
    key: "intro",
    eyebrow: "AXIOMAI ROBOTICS",
    title: "THE RIGHT ROBOT\nFOR YOUR BUSINESS.",
    text: "Analizamos tu operación, comparamos tecnologías y diseñamos la solución robótica correcta. No comenzamos con un catálogo. Comenzamos con tu problema.",
    tag: "ASSESS • MATCH • DEPLOY",
  },
  {
    key: "serve",
    eyebrow: "AXIOM SERVE + AXIOM HOST",
    title: "AUTOMATION\nTHAT MEETS PEOPLE.",
    text: "Restaurantes, hoteles, retail y showrooms: delivery, recepción, orientación, promociones y experiencias que conectan la interacción física con Brain.",
    tag: "SERVICE • HOSPITALITY • RETAIL",
  },
  {
    key: "clean",
    eyebrow: "AXIOM CLEAN",
    title: "CLEAN MORE.\nMEASURE EVERYTHING.",
    text: "Floor-care autónomo para hoteles, hospitales, malls, oficinas, warehouses y contratistas. Cada misión se diseña alrededor del piso, tráfico, suciedad y SOP.",
    tag: "SCRUB • VACUUM • SWEEP • REPORT",
  },
  {
    key: "turf",
    eyebrow: "AXIOM TURF",
    title: "AUTONOMY\nBEYOND FOUR WALLS.",
    text: "Mowing y grounds maintenance para resorts, golf, deportes, municipios y grandes propiedades, con Robot Match basado en acreage, terreno y operación.",
    tag: "GROUNDS • MOWING • OUTDOOR",
  },
  {
    key: "move",
    eyebrow: "AXIOM MOVE + INDUSTRIAL",
    title: "MATERIAL FLOW\nTHAT MOVES ITSELF.",
    text: "AMRs y cobots para line-side replenishment, carts, WIP, palletizing, machine tending y procesos repetitivos de manufactura.",
    tag: "AMR • COBOT • LOGISTICS",
  },
  {
    key: "connect",
    eyebrow: "AXIOM CONNECT",
    title: "PHYSICAL AUTOMATION.\nDIGITAL INTELLIGENCE.",
    text: "Telepresencia, healthcare, recepción y operaciones remotas conectadas con Brain para task orchestration, alertas, human handoff y reporting.",
    tag: "BRAIN THINKS • ROBOTICS EXECUTES",
  },
];

export default function CinematicShowcase() {
  return (
    <div className="ax-scenes" aria-label="AxiomAI Robotics cinematic overview">
      {scenes.map((scene, index) => (
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
            <span className="ax-scene-index">0{index + 1}</span>
            <span className="ax-scene-eyebrow">{scene.eyebrow}</span>
            <h1>{scene.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h1>
            <p>{scene.text}</p>
            <div className="ax-scene-tag">{scene.tag}</div>
            {index === 0 ? (
              <div className="ax-scene-actions">
                <a href="#match">Encuentra tu robot</a>
                <a href="#solutions">Explorar soluciones</a>
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
          <div className="ax-scene-scroll">SCROLL TO DISCOVER ↓</div>
        </section>
      ))}
    </div>
  );
}
