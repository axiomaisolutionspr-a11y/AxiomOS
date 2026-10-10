"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import LogoCurrent from "./logo-current";

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
  const [logoTarget, setLogoTarget] = useState<HTMLElement | null>(null);

  const getRobotMotionTargets = () =>
    Array.from(document.querySelectorAll<HTMLElement>(".axiom-robotics-portal, .ax-hero-brainbot"));

  const setRobotSpeaking = (speaking: boolean) => {
    for (const target of getRobotMotionTargets()) {
      if (speaking) target.setAttribute("data-speaking", "true");
      else target.removeAttribute("data-speaking");
    }
  };

  const resetRobotVoiceMotion = () => {
    cancelAnimationFrame(narrationFrame.current);
    narrationFrame.current = 0;
    voiceEnvelope.current = 0;
    const targets = getRobotMotionTargets();
    if (!targets.length) return;
    for (const name of [
      "--robot-mouth-open",
      "--robot-mouth-width",
      "--robot-voice-level",
      "--robot-speak-x",
      "--robot-speak-y",
      "--robot-speak-rot-x",
      "--robot-speak-rot-y",
      "--robot-body-y",
      "--robot-body-rotate",
      "--robot-left-y",
      "--robot-left-rotate",
      "--robot-right-y",
      "--robot-right-rotate",
      "--robot-left-elbow",
      "--robot-right-elbow",
      "--robot-left-wrist",
      "--robot-right-wrist",
      "--robot-left-shoulder-y",
      "--robot-right-shoulder-y",
      "--robot-left-shoulder-roll",
      "--robot-right-shoulder-roll",
      "--robot-left-finger-spread",
      "--robot-right-finger-spread",
      "--robot-left-finger-curl",
      "--robot-right-finger-curl",
      "--robot-left-thumb",
      "--robot-right-thumb",
    ]) {
      for (const target of targets) target.style.removeProperty(name);
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
        node.smoothingTimeConstant = 0.72;
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
    const samples = new Uint8Array(analyser.fftSize);
    const tick = () => {
      const targets = getRobotMotionTargets();
      if (!targets.length || voice.paused || voice.ended) {
        resetRobotVoiceMotion();
        return;
      }
      const setRobotVariable = (name: string, value: string) => {
        for (const target of targets) target.style.setProperty(name, value);
      };
      analyser.getByteTimeDomainData(samples);
      let energy = 0;
      for (const sample of samples) {
        const value = (sample - 128) / 128;
        energy += value * value;
      }
      const rms = Math.sqrt(energy / samples.length);
      const rawLevel = Math.max(0, Math.min(1, (rms - 0.012) * 9));
      const previous = voiceEnvelope.current;
      const smoothing = rawLevel > previous ? 0.46 : 0.18;
      const envelope = previous + (rawLevel - previous) * smoothing;
      voiceEnvelope.current = envelope;
      const phase = performance.now() / 1000;
      const gesture = Math.min(1, envelope * 2.8);
      const slowPhase = phase * 1.05;
      const leftBeat = (Math.sin(slowPhase) + 1) / 2;
      const rightBeat = (Math.sin(slowPhase + Math.PI) + 1) / 2;
      const headBeat = Math.sin(phase * 3.1);
      const bodyBeat = Math.sin(phase * 2.05);
      const speechGate = Math.min(1, envelope * 4.2);
      const handEnergy = Math.min(1, envelope * 2.2);
      const cadence = (Math.sin(slowPhase * 0.72) + 1) / 2;
      // One open-palm gesture at a time, always directed away from the center of the body.
      const phrasePoses = [
        { left: 7, right: -2, leftElbow: 25, rightElbow: -7, leftWrist: 12, rightWrist: -3 },
        { left: 10, right: -3, leftElbow: 29, rightElbow: -8, leftWrist: 15, rightWrist: -4 },
        { left: 4, right: -4, leftElbow: 12, rightElbow: -12, leftWrist: 6, rightWrist: -6 },
        { left: 2, right: -7, leftElbow: 7, rightElbow: -25, leftWrist: 3, rightWrist: -12 },
        { left: 3, right: -10, leftElbow: 8, rightElbow: -29, leftWrist: 4, rightWrist: -15 },
        { left: 4, right: -4, leftElbow: 12, rightElbow: -12, leftWrist: 6, rightWrist: -6 },
      ] as const;
      const phraseStep = (voice.currentTime || phase) / 1.8;
      const phraseIndex = Math.floor(phraseStep) % phrasePoses.length;
      const nextPhraseIndex = (phraseIndex + 1) % phrasePoses.length;
      const poseProgress = phraseStep - Math.floor(phraseStep);
      const poseEase = (1 - Math.cos(Math.PI * poseProgress)) / 2;
      const mixPose = (from: number, to: number) => from + (to - from) * poseEase;
      const currentPose = phrasePoses[phraseIndex];
      const nextPose = phrasePoses[nextPhraseIndex];
      const pose = {
        left: mixPose(currentPose.left, nextPose.left),
        right: mixPose(currentPose.right, nextPose.right),
        leftElbow: mixPose(currentPose.leftElbow, nextPose.leftElbow),
        rightElbow: mixPose(currentPose.rightElbow, nextPose.rightElbow),
        leftWrist: mixPose(currentPose.leftWrist, nextPose.leftWrist),
        rightWrist: mixPose(currentPose.rightWrist, nextPose.rightWrist),
      };
      // Smoothed voice energy starts and stops the pose without rapid pumping motions.
      const emphasis = speechGate * (0.76 + handEnergy * 0.16 + cadence * 0.08);

      setRobotVariable("--robot-mouth-open", Math.min(1.5, 0.30 + envelope * 1.75).toFixed(2));
      setRobotVariable("--robot-mouth-width", (1 + envelope * 0.08).toFixed(2));
      setRobotVariable("--robot-voice-level", envelope.toFixed(3));
      setRobotVariable("--robot-speak-x", `${(headBeat * gesture * 0.8).toFixed(2)}px`);
      setRobotVariable("--robot-speak-y", `${(-gesture * 1.4 + Math.abs(headBeat) * gesture * 0.6).toFixed(2)}px`);
      setRobotVariable("--robot-speak-rot-x", `${(headBeat * gesture * 1.4).toFixed(2)}deg`);
      setRobotVariable("--robot-speak-rot-y", `${(Math.sin(phase * 1.55) * gesture * 2.4).toFixed(2)}deg`);
      setRobotVariable("--robot-body-y", `${(bodyBeat * gesture * 1.2).toFixed(2)}px`);
      setRobotVariable("--robot-body-rotate", `${(bodyBeat * gesture * 0.75).toFixed(2)}deg`);
      // The active palm opens to the outside; neither hand crosses the torso or pelvis.
      const leftActivity = Math.min(1, Math.max(0, pose.leftElbow - 4) / 18);
      const rightActivity = Math.min(1, Math.max(0, -pose.rightElbow - 4) / 18);
      const leftDrive = leftBeat * leftActivity;
      const rightDrive = rightBeat * rightActivity;
      setRobotVariable("--robot-left-y", `${(-emphasis * (0.12 + leftDrive * 0.22)).toFixed(2)}px`);
      setRobotVariable("--robot-left-rotate", `${(emphasis * pose.left).toFixed(2)}deg`);
      setRobotVariable("--robot-right-y", `${(-emphasis * (0.12 + rightDrive * 0.22)).toFixed(2)}px`);
      setRobotVariable("--robot-right-rotate", `${(emphasis * pose.right).toFixed(2)}deg`);
      setRobotVariable("--robot-left-elbow", `${(emphasis * pose.leftElbow).toFixed(2)}deg`);
      setRobotVariable("--robot-right-elbow", `${(emphasis * pose.rightElbow).toFixed(2)}deg`);
      setRobotVariable("--robot-left-wrist", `${(emphasis * pose.leftWrist).toFixed(2)}deg`);
      setRobotVariable("--robot-right-wrist", `${(emphasis * pose.rightWrist).toFixed(2)}deg`);
      setRobotVariable("--robot-left-shoulder-y", `${(-emphasis * (0.8 + leftDrive * 1.15)).toFixed(2)}px`);
      setRobotVariable("--robot-right-shoulder-y", `${(-emphasis * (0.8 + rightDrive * 1.15)).toFixed(2)}px`);
      setRobotVariable("--robot-left-shoulder-roll", `${(emphasis * (1.6 + leftDrive * 3.2)).toFixed(2)}deg`);
      setRobotVariable("--robot-right-shoulder-roll", `${(-emphasis * (1.6 + rightDrive * 3.2)).toFixed(2)}deg`);
      setRobotVariable("--robot-left-finger-spread", (1 + speechGate * (0.035 + leftActivity * 0.07)).toFixed(3));
      setRobotVariable("--robot-right-finger-spread", (1 + speechGate * (0.035 + rightActivity * 0.07)).toFixed(3));
      setRobotVariable("--robot-left-finger-curl", (1 - speechGate * (0.05 + leftActivity * 0.08)).toFixed(3));
      setRobotVariable("--robot-right-finger-curl", (1 - speechGate * (0.05 + rightActivity * 0.08)).toFixed(3));
      setRobotVariable("--robot-left-thumb", `${(-emphasis * (5 + leftActivity * 7)).toFixed(2)}deg`);
      setRobotVariable("--robot-right-thumb", `${(emphasis * (5 + rightActivity * 7)).toFixed(2)}deg`);
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
    const tone = async (brain: boolean) => {
      const ctx = context.current;
      if (!enabledRef.current || !ctx || ctx.state === "closed") return;
      try {
        if (ctx.state === "suspended") await ctx.resume();
      } catch {
        return;
      }
      if (ctx.state !== "running") return;
      (brain ? [523.25, 783.99, 1046.5] : [740]).forEach((frequency, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const time = ctx.currentTime + index * 0.045;
        oscillator.type = brain ? "sine" : "triangle";
        oscillator.frequency.setValueAtTime(frequency, time);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.82, time + 0.12);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(brain ? 0.065 : 0.095, time + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.19);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(time);
        oscillator.stop(time + 0.2);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    };
    const playAction = (target: EventTarget | null) => {
      const element = target instanceof Element ? target.closest<HTMLElement>('a[href],button,[role="button"],label:has(input[type="checkbox"]),label:has(input[type="radio"])') : null;
      if (!element || element.matches(':disabled,[aria-disabled="true"]') || element.closest(".axiom-sound-toggle,.axiom-narration-toggle")) return;
      void tone(element.matches('.home-brain-shell,.brain-orb-button,a[href^="/brain"]') || pathname === "/brain");
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
    let active = true;
    queueMicrotask(() => {
      if (active) setLogoTarget(document.querySelector<HTMLElement>(".axiom-v6-brand"));
    });
    return () => { active = false; };
  }, [pathname]);

  useEffect(() => {
    if (!publicPage || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const targets = () => [...document.querySelectorAll<HTMLElement>(".axiom-v6-brand,.home-brain-shell,.brain-orb-button,.axiom-robotics-portal,.ax-hero-brainbot")];
    const reset = () => targets().forEach((element) => {
      for (const name of ["--brain-x", "--brain-y", "--logo-brain-x", "--logo-brain-y"]) element.style.setProperty(name, "0px");
      delete element.dataset.brainNear;
      delete element.dataset.eyeFollowing;
      element.style.removeProperty("--robot-gaze-x");
      element.style.removeProperty("--robot-gaze-y");
      for (const name of ["--robot-head-x", "--robot-head-y", "--robot-cursor-rotate", "--robot-cursor-yaw"]) element.style.removeProperty(name);
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
          const robot = element.matches(".axiom-robotics-portal,.ax-hero-brainbot");
          const strength = logo ? 3.5 : element.classList.contains("brain-orb-button") ? 5 : 12;
          const nx = Math.max(-1, Math.min(1, (x - rect.left - rect.width / 2) / (rect.width / 2 + 50)));
          const ny = Math.max(-1, Math.min(1, (y - rect.top - rect.height / 2) / (rect.height / 2 + 50)));
          if (robot) {
            const head = element.querySelector(".brainbot-pro-head")?.getBoundingClientRect() ?? rect;
            const gazeX = Math.max(-1, Math.min(1, (x - head.left - head.width / 2) / 70));
            const gazeY = Math.max(-1, Math.min(1, (y - head.top - head.height / 2) / 70));
            element.dataset.eyeFollowing = proximity > 0 ? "true" : "false";
            element.style.setProperty("--robot-gaze-x", `${(gazeX * 3 * proximity).toFixed(2)}px`);
            element.style.setProperty("--robot-gaze-y", `${(gazeY * 2 * proximity).toFixed(2)}px`);
            element.style.setProperty("--robot-head-x", `${(nx * 4 * proximity).toFixed(2)}px`);
            element.style.setProperty("--robot-head-y", `${(ny * 2.5 * proximity).toFixed(2)}px`);
            element.style.setProperty("--robot-cursor-rotate", `${(nx * 7 * proximity).toFixed(2)}deg`);
            element.style.setProperty("--robot-cursor-yaw", `${(nx * 12 * proximity).toFixed(2)}deg`);
          }
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

  useEffect(() => {
    document.querySelector(".axiom-robot-talk")?.setAttribute("aria-pressed", String(narrating));
  }, [narrating]);

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
    <>
      {logoTarget && createPortal(<LogoCurrent />, logoTarget)}
      <audio ref={music} src="/audio/game-on-dopestuff.mp3" loop preload="none" />
      <>
        <audio ref={narration} src="/audio/axiomai-presentacion-roger.mp3" preload="none"
          onPlaying={() => { setRobotSpeaking(true); startRobotVoiceMotion(); setNarrating(true); setVoiceStarted(true); if (music.current) music.current.volume = 0.045; }}
          onPause={() => { setRobotSpeaking(false); resetRobotVoiceMotion(); setNarrating(false); if (music.current) music.current.volume = 0.18; }}
          onEnded={() => { setRobotSpeaking(false); resetRobotVoiceMotion(); setNarrating(false); setVoiceStarted(false); if (music.current) music.current.volume = 0.18; }}
          onError={() => { setRobotSpeaking(false); resetRobotVoiceMotion(); setNarrating(false); setVoiceError(true); if (music.current) music.current.volume = 0.18; }}
        />
        <button type="button" className="axiom-narration-toggle" aria-pressed={narrating} onClick={toggleNarration}>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{narrating ? <path d="M6 4h4v16H6zm8 0h4v16h-4z" /> : <path d="m7 4 14 8-14 8z" />}</svg>
          {narrating ? "Pausar narración" : voiceError ? "Reintentar narración" : voiceStarted ? "Continuar presentación" : "Escuchar presentación"}
        </button>
      </>
      <button type="button" className="axiom-sound-toggle" aria-label={enabled ? "Silenciar música, narración y sonidos / Mute sound" : "Activar música y sonidos / Enable sound"} aria-pressed={enabled} title={enabled ? "Sonido activado" : "Sonido desactivado"} onClick={toggle}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" />{enabled ? <><path d="M15 8a6 6 0 0 1 0 8" /><path d="M18 5a10 10 0 0 1 0 14" /></> : <path d="m16 9 5 6m0-6-5 6" />}</svg>
      </button>
    </>
  );
}
