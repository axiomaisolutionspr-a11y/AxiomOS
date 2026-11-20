"use client";
// Comportamiento del tema "Holo" v3 en las páginas de Autopilot.
// - Marca la sección seleccionada (data-fx-active) para iluminar su borde y, en modo 3D,
//   elevarla un poco como una sola pieza. Se selecciona al tocarla o al enfocar algo dentro.
// - Logo: al tocarlo se marca data-pop un momento (el CSS decide qué hacer según el modo).
// - Oculta el robot BrainBot del sitio público, que tapaba formularios en el teléfono.
// Sin giroscopio, inclinaciones, pulsos ni luces que sigan el dedo (v2 retirados por pedido).
// Respaldo v1 aprobada: commit da6169a y claude/respaldos/holo-v1-aprobado/.
import { useEffect } from "react";
import "./futuro.css";

const CARD = "article, section.rounded-xl, section.rounded-2xl, div.rounded-xl, div.rounded-2xl";

export default function FuturoFx() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("main.fx");
    if (!root) return;
    let active: HTMLElement | null = null;
    let order = 0;
    let logoTimer = 0;

    // Tarjetas de primer nivel: son las que se seleccionan como una unidad completa.
    const mark = () => {
      root.querySelectorAll<HTMLElement>(CARD).forEach((el) => {
        if (el.hasAttribute("data-fx-card") || el.closest("header") || el.parentElement?.closest(CARD)) return;
        el.setAttribute("data-fx-card", "");
        el.style.setProperty("--fx-delay", `${Math.min(order++, 8) * 40}ms`);
        el.setAttribute("data-fx-enter", "");
        el.addEventListener("animationend", () => el.removeAttribute("data-fx-enter"), { once: true });
      });
    };
    mark();
    const observer = new MutationObserver(() => { order = 0; mark(); });
    observer.observe(root, { childList: true, subtree: true });

    const cardFrom = (target: EventTarget | null) =>
      target instanceof Element ? target.closest<HTMLElement>("[data-fx-card]") : null;

    const activate = (card: HTMLElement | null) => {
      if (card === active) return;
      active?.removeAttribute("data-fx-active");
      root.querySelectorAll("[data-fx-stage]").forEach((el) => el.removeAttribute("data-fx-stage"));
      active = card;
      if (!card) return;
      card.setAttribute("data-fx-active", "");
      Array.from(root.children).find((el) => el.contains(card))?.setAttribute("data-fx-stage", "");
    };

    const popLogo = (logo: HTMLElement) => {
      logo.setAttribute("data-pop", "");
      window.clearTimeout(logoTimer);
      logoTimer = window.setTimeout(() => logo.removeAttribute("data-pop"), 1400);
    };

    const onDown = (e: PointerEvent) => {
      const logo = e.target instanceof Element ? e.target.closest<HTMLElement>(".fx-logo") : null;
      if (logo) { activate(null); popLogo(logo); return; }
      if (e.target instanceof Element && e.target.closest(".fx-controls")) return;
      const card = cardFrom(e.target);
      activate(card && root.contains(card) ? card : null);
    };
    const onFocus = (e: FocusEvent) => {
      const card = cardFrom(e.target);
      if (card) activate(card);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") activate(null); };

    document.addEventListener("pointerdown", onDown, { passive: true });
    root.addEventListener("focusin", onFocus);
    document.addEventListener("keydown", onKey);
    return () => {
      activate(null);
      observer.disconnect();
      window.clearTimeout(logoTimer);
      document.removeEventListener("pointerdown", onDown);
      root.removeEventListener("focusin", onFocus);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return <style>{".axiom-robotics-portal{display:none!important}"}</style>;
}
