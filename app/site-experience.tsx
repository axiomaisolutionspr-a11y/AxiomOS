"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function SiteExperience() {
  const pathname = usePathname();
  const publicPage = pathname === "/" || pathname === "/brain" || pathname === "/robotics";
  const music = useRef<HTMLAudioElement>(null);
  const narration = useRef<HTMLAudioElement>(null);
  const [narrating, setNarrating] = useState(false);
  const [voiceStarted, setVoiceStarted] = useState(false);
  const [voiceError, setVoiceError] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const narrationSource = useRef<MediaElementAudioSourceNode | null>(null);
  const narrationAnalyser = useRef<AnalyserNode | null>(null);
  const narrationFrame = useRef<number>(0);
  const voiceEnvelope = useRef(0);
  const enabledRef = useRef(true);
  const [enabled, setEnabled] = useState(true);

  const resetRobotVoiceMotion = () => {
    cancelAnimationFrame(narrationFrame.current);
    narrationFrame.current = 0;
    voiceEnvelope.current = 0;
    const portal = document.querySelector<HTMLElement>(".axiom-robotics-portal");
    if (!portal) return;
    for (const name of ["--robot-mouth-open", "--robot-mouth-width", "--robot-speak-x", "--robot-speak-y", "--robot-speak-rot-x", "--robot-speak-rot-y", "--robot-left-y", "--robot-left-rotate", "--robot-right-y", "--robot-right-rotate", "--robot-body-y"]) {
      portal.style.removeProperty(name);
    }
  };

  const startRobotVoiceMotion = () => {
    const voice = narration.current;
    if (!voice) return;
    const ctx = context.current ?? (context.current = new AudioContext());
    const analyser = narrationAnalyser.current ?? (() => {
      try {
        const source = narrationSource.current ?? ctx.createMediaElementSource(voice);
        const node = ctx.createAnalyser();
        node.fftSize = 512;
        node.smoothingTimeConstant = 0.84;
        source.connect(node);
        node.connect(ctx.destination);
        narrationSource.current = source;
        narrationAnalyser.current = node;
        return node;
      } catch {
        return null;
      }
    })();
    if (!analyser) return;
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    cancelAnimationFrame(narrationFrame.current);
    const samples = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      const portal = document.querySelector<HTMLElement>(".axiom-robotics-portal");
      if (!portal || voice.paused || voice.ended) {
        resetRobotVoiceMotion();
        return;
      }
      analyser.getByteFrequencyData(samples);
      let weighted = 0;
      let weight = 0;
      const speechBins = Math.min(92, samples.length);
      for (let index = 2; index < speechBins; index += 1) {
        const binWeight = index < 44 ? 1.35 : 0.55;
        weighted += samples[index] * binWeight;
        weight += binWeight;
      }
      const average = weight ? weighted / weight / 255 : 0;
      const rawLevel = Math.max(0, Math.min(1, (average - 0.075) * 5.2));
      const previous = voiceEnvelope.current;
      const smoothing = rawLevel > previous ? 0.32 : 0.12;
      const envelope = previous + (rawLevel - previous) * smoothing;
      voiceEnvelope.current = envelope;
      const time = voice.currentTime;
      const gesture = Math.min(1, envelope * 1.8);
      portal.style.setProperty("--robot-mouth-open", (0.08 + envelope * 0.92).toFixed(2));
      portal.style.setProperty("--robot-mouth-width", (0.90 + envelope * 0.10).toFixed(2));
      portal.style.setProperty("--robot-speak-x", `${(Math.sin(time * 1.05) * gesture * 0.75).toFixed(2)}px`);
      portal.style.setProperty("--robot-speak-y", `${(Math.cos(time * 0.92) * gesture * 0.55).toFixed(2)}px`);
      portal.style.setProperty("--robot-speak-rot-x", `${(Math.sin(time * 0.78) * gesture * 1.1).toFixed(2)}deg`);
      portal.style.setProperty("--robot-speak-rot-y", `${(Math.cos(time * 0.68) * gesture * 1.3).toFixed(2)}deg`);
      portal.style.setProperty("--robot-left-y", `${(Math.sin(time * 1.18) * gesture * 5.5).toFixed(2)}px`);
      portal.style.setProperty("--robot-left-rotate", `${(Math.sin(time * 1.18 + Math.PI / 2) * gesture * 4.8).toFixed(2)}deg`);
      portal.style.setProperty("--robot-right-y", `${(Math.sin(time * 1.02 + Math.PI) * gesture * 4.2).toFixed(2)}px`);
      portal.style.setProperty("--robot-right-rotate", `${(Math.sin(time * 1.02 + Math.PI / 2) * gesture * 4.4).toFixed(2)}deg`);
      portal.style.setProperty("--robot-body-y", `${(Math.sin(time * 1.1) * gesture * 1.15).toFixed(2)}px`);
      narrationFrame.current = requestAnimationFrame(tick);
    };
    tick();
  };

  useEffect(() => {
    if (!publicPage) return;
    const track = music.current;
    const voice = narration.current;
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
        track.volume = voice && !voice.paused ? 0.045 : 0.18;
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
      if (!element || element.matches(':disabled,[aria-disabled="true"]') || element.closest(".axiom-sound-toggle,.axiom-narration-toggle")) return;
      tone(element.matches('.home-brain-shell,.brain-orb-button,a[href^="/brain"]') || pathname === "/brain");
    };
    const pointer = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest(".axiom-sound-toggle,.axiom-narration-toggle")) return;
      if (event.button === 0) { start(); playAction(event.target); }
    };
    const keyboard = (event: KeyboardEvent) => { if (event.key === "Enter" || event.key === " ") start(); };
    const click = (event: MouseEvent) => { if (event.detail === 0) { start(); playAction(event.target); } };
    const visibility = () => {
      if (document.hidden) { track.pause(); voice?.pause(); void context.current?.suspend(); }
      else start();
    };
    const foregroundChange = (event: Event) => {
      if (event.target instanceof HTMLVideoElement && event.target.classList.contains("axiom-v6-video-main")) {
        if (!event.target.paused && !event.target.muted) { track.pause(); voice?.pause(); }
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
      voice?.pause();
      resetRobotVoiceMotion();
      void context.current?.close();
      context.current = null;
      narrationSource.current = null;
      narrationAnalyser.current = null;
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
      narration.current?.pause();
      void context.current?.suspend();
    }
  };
  const toggleNarration = () => {
    const voice = narration.current;
    if (!voice) return;
    if (!voice.paused) { voice.pause(); return; }
    document.querySelector<HTMLVideoElement>(".axiom-v6-video-main")?.pause();
    enabledRef.current = true;
    setEnabled(true);
    setVoiceError(false);
    try { localStorage.setItem("axiomai_sound", "on"); } catch {}
    if (voice.ended) voice.currentTime = 0;
    if (music.current) {
      music.current.volume = 0.045;
      void music.current.play().catch(() => {});
    }
    void voice.play().catch(() => {
      setVoiceError(true);
      if (music.current) music.current.volume = 0.18;
    });
  };
  return (
