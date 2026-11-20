import type { CSSProperties } from "react";
// Logo de AxiomAI en relieve 3D, flotando sobre un proyector holográfico.
// El relieve son copias apiladas en profundidad (extrusión); la luz y la inclinación
// siguen al teléfono mediante --gx/--gy (las pone futuro-fx.tsx). Estilos en futuro.css.
const LAYERS = 7;

export default function HoloLogo() {
  return <div className="fx-logo" role="img" aria-label="AxiomAI Solutions">
    <div className="fx-logo-stage" aria-hidden="true">
      {Array.from({ length: LAYERS }, (_, i) =>
        <img key={i} src="/axiomos-logo-holo.webp" alt="" className="fx-logo-depth"
          style={{ "--fx-d": LAYERS - i } as CSSProperties} />)}
      <img src="/axiomos-logo-holo.webp" alt="" className="fx-logo-face" />
      <span className="fx-logo-shine" />
    </div>
    <span className="fx-logo-base" aria-hidden="true" />
  </div>;
}
