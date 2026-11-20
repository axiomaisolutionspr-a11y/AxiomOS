"use client";
// Efectos del tema "Holo" para las páginas de Autopilot.
// - Lo que tocas se eleva (data-fx-active) y las tarjetas vecinas retroceden (data-fx-focus).
// - Inclinación 3D y luz que siguen el dedo o el puntero, con un pulso al tocar.
// - Oculta el robot BrainBot del sitio público, que tapaba formularios en el teléfono.
// Sin dependencias; respeta "reducir movimiento" del sistema.
import { useEffect } from "react";
import "./futuro.css";

const CARD = "article, section.rounded-xl, section.rounded-2xl, div.rounded-xl, div.rounded-2xl";
const MAX_TILT = 7;

export default function FuturoFx() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("main.fx");
    if (!root) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let active: HTMLElement | null = null;
    let settle = 0;

    const cardFrom = (target: EventTarget | null) =>
      target instanceof Element ? (target.closest(CARD) as HTMLElement | null) : null;

    const point = (card: HTMLElement, x: number, y: number, tilt: boolean) => {
      const r = card.getBoundingClientRect();
      const px = Math.min(Math.max((x - r.left) / r.width, 0), 1);
      const py = Math.min(Math.max((y - r.top) / r.height, 0), 1);
      card.style.setProperty("--fx-x", `${(px * 100).toFixed(1)}%`);
      card.style.setProperty("--fx-y", `${(py * 100).toFixed(1)}%`);
      if (still || !tilt) return;
      // Las tarjetas altas se inclinan menos para no marear.
      const k = Math.min(1, 320 / r.height);
      card.style.setProperty("--fx-rx", `${((0.5 - py) * MAX_TILT * k).toFixed(2)}deg`);
      card.style.setProperty("--fx-ry", `${((px - 0.5) * MAX_TILT * k).toFixed(2)}deg`);
    };
    const flatten = (card: HTMLElement) => {
      card.style.setProperty("--fx-rx", "0deg");
      card.style.setProperty("--fx-ry", "0deg");
    };

    const activate = (card: HTMLElement | null) => {
      if (card === active) return;
      if (active) {
        active.removeAttribute("data-fx-active");
        active.parentElement?.removeAttribute("data-fx-focus");
        flatten(active);
      }
      active = card;
      if (card) {
        card.setAttribute("data-fx-active", "");
        card.parentElement?.setAttribute("data-fx-focus", "");
      }
    };

    const onDown = (e: PointerEvent) => {
      const card = cardFrom(e.target);
      if (!card || !root.contains(card)) return activate(null);
      activate(card);
      point(card, e.clientX, e.clientY, true);
      if (!still) {
        card.removeAttribute("data-fx-pulse");
        void card.offsetWidth; // reinicia la animación del pulso
        card.setAttribute("data-fx-pulse", "");
      }
      // En el teléfono la inclinación vuelve a plano y la tarjeta queda elevada.
      window.clearTimeout(settle);
      if (e.pointerType !== "mouse") settle = window.setTimeout(() => flatten(card), 420);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const card = cardFrom(e.target);
      if (card && card === active) point(card, e.clientX, e.clientY, true);
      else if (card) point(card, e.clientX, e.clientY, false);
    };
    const onFocus = (e: FocusEvent) => {
      const card = cardFrom(e.target);
      if (card && root.contains(card)) activate(card);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") activate(null); };

    document.addEventListener("pointerdown", onDown, { passive: true });
    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("focusin", onFocus);
    document.addEventListener("keydown", onKey);
    return () => {
      activate(null);
      window.clearTimeout(settle);
      document.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("focusin", onFocus);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return <style>{".axiom-robotics-portal{display:none!important}"}</style>;
}
