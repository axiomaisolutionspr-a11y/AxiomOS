"use client";
// Comportamiento visual de las páginas de Autopilot en sus dos modos (atributo data-fx-mode en <main>):
// - "3d": efectos completos de la v2 (commit 709810c). La sección tocada sale de la pantalla y deja su
//   hueco iluminado, inclinación hacia el dedo, giroscopio, pulso de luz, vibración y logo que sale.
// - "sobrio": la v3 estable. Solo se marca la sección seleccionada (borde azul y elevación leve) y el
//   logo sobresale un poco de su marco.
// El cambio de modo se aplica al instante sin recargar. Se respeta "reducir movimiento" del sistema.
// Respaldo de la v1 aprobada: commit da6169a y claude/respaldos/holo-v1-aprobado/.
import { useEffect } from "react";
import "./futuro.css";
import "./futuro-3d.css";

const CARD = "article, section.rounded-xl, section.rounded-2xl, div.rounded-xl, div.rounded-2xl";
const MAX_TILT = 9;
const MAX_GYRO = 10; // grados máximos de paralaje por giroscopio (solo 3D)

type OrientationPermission = { requestPermission?: () => Promise<"granted" | "denied"> };

export default function FuturoFx() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("main.fx");
    if (!root) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const full = () => root.getAttribute("data-fx-mode") === "3d" && !still;
    let active: HTMLElement | null = null;
    let slot: HTMLElement | null = null;
    let settle = 0;
    let order = 0;
    let logoTimer = 0;

    // ---- Tarjetas de primer nivel: se seleccionan como una unidad completa ----
    const mark = () => {
      root.querySelectorAll<HTMLElement>(CARD).forEach((el) => {
        if (el.hasAttribute("data-fx-card") || el.closest("header") || el.parentElement?.closest(CARD)) return;
        el.setAttribute("data-fx-card", "");
        if (still) return;
        el.style.setProperty("--fx-delay", `${Math.min(order++, 10) * 60}ms`);
        el.setAttribute("data-fx-enter", "");
        el.addEventListener("animationend", () => el.removeAttribute("data-fx-enter"), { once: true });
      });
    };
    mark();
    const cardsObserver = new MutationObserver(() => { order = 0; mark(); });
    cardsObserver.observe(root, { childList: true, subtree: true });

    const cardFrom = (target: EventTarget | null) =>
      target instanceof Element ? target.closest<HTMLElement>("[data-fx-card]") : null;

    const point = (card: HTMLElement, x: number, y: number, tilt: boolean) => {
      const r = card.getBoundingClientRect();
      const px = Math.min(Math.max((x - r.left) / r.width, 0), 1);
      const py = Math.min(Math.max((y - r.top) / r.height, 0), 1);
      card.style.setProperty("--fx-x", `${(px * 100).toFixed(1)}%`);
      card.style.setProperty("--fx-y", `${(py * 100).toFixed(1)}%`);
      if (!tilt) return;
      const k = Math.min(1, 360 / r.height); // las tarjetas altas se inclinan menos
      card.style.setProperty("--fx-rx", `${((0.5 - py) * MAX_TILT * k).toFixed(2)}deg`);
      card.style.setProperty("--fx-ry", `${((px - 0.5) * MAX_TILT * k).toFixed(2)}deg`);
    };
    const flatten = (card: HTMLElement) => {
      card.style.setProperty("--fx-rx", "0deg");
      card.style.setProperty("--fx-ry", "0deg");
    };

    // ---- Selección (ambos modos); en 3D además deja el hueco iluminado ----
    const activate = (card: HTMLElement | null) => {
      if (card === active) return;
      if (active) {
        active.removeAttribute("data-fx-active");
        active.parentElement?.removeAttribute("data-fx-focus");
        flatten(active);
      }
      slot?.remove();
      slot = null;
      root.querySelectorAll("[data-fx-stage]").forEach((el) => el.removeAttribute("data-fx-stage"));
      active = card;
      if (!card) return;
      if (full() && card.parentElement) {
        card.parentElement.setAttribute("data-fx-focus", "");
        slot = document.createElement("div");
        slot.className = "fx-slot";
        slot.style.cssText = `top:${card.offsetTop}px;left:${card.offsetLeft}px;width:${card.offsetWidth}px;height:${card.offsetHeight}px`;
        card.parentElement.insertBefore(slot, card);
        navigator.vibrate?.(8);
      }
      card.setAttribute("data-fx-active", "");
      Array.from(root.children).find((el) => el.contains(card))?.setAttribute("data-fx-stage", "");
    };

    const pulse = (card: HTMLElement, x: number, y: number) => {
      const r = card.getBoundingClientRect();
      const dot = document.createElement("span");
      dot.className = "fx-pulse";
      dot.style.left = `${x - r.left}px`;
      dot.style.top = `${y - r.top}px`;
      card.appendChild(dot);
      dot.addEventListener("animationend", () => dot.remove(), { once: true });
    };

    const popLogo = (logo: HTMLElement) => {
      logo.removeAttribute("data-pop");
      void logo.offsetWidth; // permite repetir el efecto con cada toque
      logo.setAttribute("data-pop", "");
      if (full()) navigator.vibrate?.([12, 60, 24]);
      window.clearTimeout(logoTimer);
      logoTimer = window.setTimeout(() => logo.removeAttribute("data-pop"), full() ? 1900 : 1400);
    };

    // ---- Giroscopio (solo 3D): lo de adelante se mueve más que el fondo ----
    let base: { b: number; g: number } | null = null;
    let target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;
    const clamp = (v: number) => Math.max(-MAX_GYRO, Math.min(MAX_GYRO, v));
    const tick = () => {
      current.x += (target.x - current.x) * 0.12;
      current.y += (target.y - current.y) * 0.12;
      root.style.setProperty("--gx", `${current.x.toFixed(2)}deg`);
      root.style.setProperty("--gy", `${current.y.toFixed(2)}deg`);
      frame = Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > 0.02 ? requestAnimationFrame(tick) : 0;
    };
    const aim = (x: number, y: number) => {
      target = { x: clamp(x), y: clamp(y) };
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      if (!full() || e.beta == null || e.gamma == null) return;
      if (!base) base = { b: e.beta, g: e.gamma };
      // La posición "neutra" se adapta poco a poco a cómo sostienes el teléfono.
      base.b += (e.beta - base.b) * 0.01;
      base.g += (e.gamma - base.g) * 0.01;
      aim((e.gamma - base.g) * 0.6, -(e.beta - base.b) * 0.6);
      if (active) {
        active.style.setProperty("--fx-x", `${50 + (e.gamma - base.g) * 3}%`);
        active.style.setProperty("--fx-y", `${30 - (e.beta - base.b) * 3}%`);
      }
    };
    let gyroAsked = false;
    const startGyro = () => {
      if (gyroAsked || !full() || typeof DeviceOrientationEvent === "undefined") return;
      gyroAsked = true;
      const req = (DeviceOrientationEvent as unknown as OrientationPermission).requestPermission;
      if (typeof req === "function") {
        req().then((r) => { if (r === "granted") window.addEventListener("deviceorientation", onOrient); }).catch(() => {});
      } else {
        window.addEventListener("deviceorientation", onOrient);
      }
    };
    startGyro(); // Android: sin permiso. iPhone: se pide al primer toque.

    // ---- Cambio de modo desde el botón: limpiar estado al instante ----
    const modeObserver = new MutationObserver(() => {
      activate(null);
      aim(0, 0);
      base = null;
      startGyro();
    });
    modeObserver.observe(root, { attributes: true, attributeFilter: ["data-fx-mode"] });

    // ---- Eventos ----
    const onDown = (e: PointerEvent) => {
      startGyro();
      const el = e.target instanceof Element ? e.target : null;
      const logo = el?.closest<HTMLElement>(".fx-logo");
      if (logo) { activate(null); popLogo(logo); return; }
      if (el?.closest(".fx-controls")) return;
      const card = cardFrom(e.target);
      if (!card || !root.contains(card)) return activate(null);
      activate(card);
      if (!full()) return;
      point(card, e.clientX, e.clientY, true);
      pulse(card, e.clientX, e.clientY);
      window.clearTimeout(settle);
      if (e.pointerType !== "mouse") settle = window.setTimeout(() => flatten(card), 480);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !full()) return;
      aim((e.clientX / innerWidth - 0.5) * 8, -(e.clientY / innerHeight - 0.5) * 8);
      const card = cardFrom(e.target);
      if (card) point(card, e.clientX, e.clientY, card === active);
    };
    const onFocus = (e: FocusEvent) => {
      const card = cardFrom(e.target);
      if (card) activate(card);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") activate(null); };
    // En el teléfono la barra del navegador cambia el alto al hacer scroll: solo reaccionar al ancho.
    let lastWidth = innerWidth;
    const onResize = () => { if (innerWidth !== lastWidth) { lastWidth = innerWidth; activate(null); } };

    document.addEventListener("pointerdown", onDown, { passive: true });
    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("focusin", onFocus);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      activate(null);
      cardsObserver.disconnect();
      modeObserver.disconnect();
      window.clearTimeout(settle);
      window.clearTimeout(logoTimer);
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("focusin", onFocus);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("deviceorientation", onOrient);
    };
  }, []);

  return <style>{".axiom-robotics-portal{display:none!important}"}</style>;
}
