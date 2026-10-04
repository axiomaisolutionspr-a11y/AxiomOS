"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function SiteExperience() {
  const pathname = usePathname();
  const publicPage = pathname === "/" || pathname === "/brain" || pathname === "/robotics";
  const music = useRef<HTMLAudioElement>(null);
  const context = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!publicPage) return;
    const track = music.current;
    if (!track) return;
    track.volume = 0.18;
    try {
      enabledRef.current = localStorage.getItem("axiomai_sound") !== "off";
      queueMicrotask(() => setEnabled(enabledRef.current));
      if (enabledRef.current && sessionStorage.getItem("axiomai_sound_started")) void track.play().catch(() => {});
    } catch { /* Audio remains usable when storage is unavailable. */ }

    const start = () => {
      if (!enabledRef.current || document.hidden) return;
      context.current ??= new AudioContext();
      if (context.current.state === "suspended") void context.current.resume().catch(() => {});
      const foreground = document.querySelector<HTMLVideoElement>(".axiom-v6-video-main");
      if (track.paused && (!foreground || foreground.paused || foreground.muted)) {
        void track.play().then(() => {
          try { sessionStorage.setItem("axiomai_sound_started", "1"); } catch {}
        }).catch(() => {});
      }
    };
    const tone = (brain: boolean) => {
      const ctx = context.current;
      if (!enabledRef.current || !ctx || ctx.state === "closed") return;
      (brain ? [523.25, 783.99, 1046.5] : [740]).forEach((frequency, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const time = ctx.currentTime + index * 0.045;
        oscillator.type = brain ? "sine" : "triangle";
        oscillator.frequency.setValueAtTime(frequency, time);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.82, time + 0.1);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(brain ? 0.07 : 0.045, time + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(time);
        oscillator.stop(time + 0.15);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    };
    const playAction = (target: EventTarget | null) => {
      const element = target instanceof Element ? target.closest<HTMLElement>('a[href],button,[role="button"],label:has(input[type="checkbox"]),label:has(input[type="radio"])') : null;
      if (!element || element.matches(':disabled,[aria-disabled="true"]') || element.closest(".axiom-sound-toggle")) return;
      tone(element.matches('.home-brain-shell,.brain-orb-button,a[href^="/brain"]') || pathname === "/brain");
    };
    const pointer = (event: PointerEvent) => { if (event.button === 0) { start(); playAction(event.target); } };
    const keyboard = (event: KeyboardEvent) => { if (event.key === "Enter" || event.key === " ") start(); };
    const click = (event: MouseEvent) => { if (event.detail === 0) { start(); playAction(event.target); } };
    const visibility = () => {
      if (document.hidden) { track.pause(); void context.current?.suspend(); }
      else start();
    };
    const foregroundChange = (event: Event) => {
      if (event.target instanceof HTMLVideoElement && event.target.classList.contains("axiom-v6-video-main")) {
        if (!event.target.paused && !event.target.muted) track.pause();
        else start();
      }
    };
    document.addEventListener("pointerdown", pointer, true);
    document.addEventListener("keydown", keyboard, true);
    document.addEventListener("click", click, true);
    document.addEventListener("visibilitychange", visibility);
    for (const name of ["play", "pause", "ended", "volumechange"]) document.addEventListener(name, foregroundChange, true);
    return () => {
      track.pause();
      void context.current?.close();
      context.current = null;
      document.removeEventListener("pointerdown", pointer, true);
      document.removeEventListener("keydown", keyboard, true);
      document.removeEventListener("click", click, true);
      document.removeEventListener("visibilitychange", visibility);
      for (const name of ["play", "pause", "ended", "volumechange"]) document.removeEventListener(name, foregroundChange, true);
    };
  }, [publicPage, pathname]);

  useEffect(() => {
    if (!publicPage || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const targets = () => [...document.querySelectorAll<HTMLElement>(".axiom-v6-brand,.home-brain-shell,.brain-orb-button")];
    const reset = () => targets().forEach((element) => {
      for (const name of ["--brain-x", "--brain-y", "--logo-brain-x", "--logo-brain-y"]) element.style.setProperty(name, "0px");
      delete element.dataset.brainNear;
    });
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      x = event.clientX;
      y = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        targets().forEach((element) => {
          const rect = element.getBoundingClientRect();
          const dx = Math.max(rect.left - x, 0, x - rect.right);
          const dy = Math.max(rect.top - y, 0, y - rect.bottom);
          const proximity = Math.max(0, 1 - Math.hypot(dx, dy) / 100);
          const logo = element.classList.contains("axiom-v6-brand");
          const strength = logo ? 3.5 : element.classList.contains("brain-orb-button") ? 5 : 12;
          const nx = Math.max(-1, Math.min(1, (x - rect.left - rect.width / 2) / (rect.width / 2 + 50)));
          const ny = Math.max(-1, Math.min(1, (y - rect.top - rect.height / 2) / (rect.height / 2 + 50)));
          element.style.setProperty(logo ? "--logo-brain-x" : "--brain-x", `${(nx * strength * proximity).toFixed(2)}px`);
          element.style.setProperty(logo ? "--logo-brain-y" : "--brain-y", `${(ny * strength * proximity).toFixed(2)}px`);
          element.dataset.brainNear = proximity > 0 ? "true" : "false";
        });
      });
    };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", reset);
    window.addEventListener("blur", reset);
    return () => {
      cancelAnimationFrame(frame);
      reset();
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", reset);
      window.removeEventListener("blur", reset);
    };
  }, [pathname, publicPage]);

  if (!publicPage) return null;
  const toggle = () => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    try { localStorage.setItem("axiomai_sound", next ? "on" : "off"); } catch {}
    if (next) {
      context.current ??= new AudioContext();
      void context.current.resume().catch(() => {});
      void music.current?.play().catch(() => {});
    } else {
      music.current?.pause();
      void context.current?.suspend();
    }
  };
  return (
    <>
      <audio ref={music} src="/audio/axiomai-future-drive.mp3" loop preload="none" />
      <button type="button" className="axiom-sound-toggle" aria-label={enabled ? "Silenciar música y sonidos / Mute sound" : "Activar música y sonidos / Enable sound"} aria-pressed={enabled} title={enabled ? "Sonido activado" : "Sonido desactivado"} onClick={toggle}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" />{enabled ? <><path d="M15 8a6 6 0 0 1 0 8" /><path d="M18 5a10 10 0 0 1 0 14" /></> : <path d="m16 9 5 6m0-6-5 6" />}</svg>
      </button>
    </>
  );
}
