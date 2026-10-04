"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function RobotCompanion() {
  const pathname = usePathname();

  useEffect(() => {
    const portal = document.querySelector<HTMLElement>(".axiom-robotics-portal");
    const avatar = portal?.querySelector<HTMLElement>(".axiom-robot-avatar");
    if (!portal || !avatar) return;
    let motionFrame = 0;
    const reset = () => {
      for (const name of ["--robot-head-x", "--robot-head-y", "--robot-eye-x", "--robot-eye-y"]) avatar.style.setProperty(name, "0px");
      for (const name of ["--robot-turn-x", "--robot-turn-y"]) avatar.style.setProperty(name, "0deg");
    };
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch" || reducedMotion.matches) return;
      cancelAnimationFrame(motionFrame);
      motionFrame = requestAnimationFrame(() => {
        const rect = avatar.getBoundingClientRect();
        const clamp = (value: number) => Math.max(-1, Math.min(1, value));
        const x = clamp((event.clientX - rect.left - rect.width / 2) / (rect.width * .65 + 65));
        const y = clamp((event.clientY - rect.top - rect.height / 2) / (rect.height * .65 + 65));
        avatar.style.setProperty("--robot-head-x", `${x * 2}px`);
        avatar.style.setProperty("--robot-head-y", `${y * 1.5}px`);
        avatar.style.setProperty("--robot-turn-x", `${-y * 6}deg`);
        avatar.style.setProperty("--robot-turn-y", `${x * 9}deg`);
        avatar.style.setProperty("--robot-eye-x", `${x * 3}px`);
        avatar.style.setProperty("--robot-eye-y", `${y * 2}px`);
      });
    };
    const stop = () => { cancelAnimationFrame(motionFrame); reset(); };
    document.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", stop);
    window.addEventListener("blur", stop);
    reducedMotion.addEventListener("change", stop);

    const hero = pathname === "/" ? document.querySelector<HTMLElement>("#inicio") : null;
    const slot = hero?.querySelector<HTMLElement>(".axiom-v6-stage-slot");
    const mobileSlot = hero?.querySelector<HTMLElement>(".axiom-v6-robot-slot");
    const stage = hero?.querySelector<HTMLElement>(".axiom-v6-video-stage");
    const cards = hero?.querySelector<HTMLElement>(".axiom-v6-cards");
    let layoutFrame = 0;
    let disposed = false;
    const align = () => {
      if (!hero || !slot || !stage || !cards || !mobileSlot) return;
      const desktop = matchMedia("(min-width:1300px)").matches;
      const target = (desktop ? slot : mobileSlot).getBoundingClientRect();
      const cardRect = cards.getBoundingClientRect();
      const scale = hero.getBoundingClientRect().width / hero.offsetWidth;
      const background = document.querySelector(".axiom-home-video-bg")?.getBoundingClientRect();
      const middle = background ? background.left + background.width / 2 : document.documentElement.clientWidth / 2;
      const stageCenter = target.left + stage.offsetWidth * scale / 2;
      stage.style.setProperty("--axiom-frame-shift", desktop ? `${(middle - stageCenter) / scale}px` : "0px");
      portal.dataset.placement = "hero";
      portal.style.setProperty("--robot-left", `${target.left + window.scrollX}px`);
      portal.style.setProperty("--robot-top", `${cardRect.top + window.scrollY}px`);
      portal.style.setProperty("--robot-width", `${cardRect.width}px`);
      portal.style.setProperty("--robot-height", `${cardRect.height}px`);
    };
    const schedule = () => {
      if (disposed) return;
      cancelAnimationFrame(layoutFrame);
      layoutFrame = requestAnimationFrame(align);
    };
    const observer = new ResizeObserver(schedule);
    if (hero && slot && cards && mobileSlot) {
      for (const element of [hero, slot, cards, mobileSlot]) observer.observe(element);
      schedule();
      void document.fonts.ready.then(schedule);
    }
    window.addEventListener("resize", schedule);
    return () => {
      disposed = true;
      cancelAnimationFrame(motionFrame);
      cancelAnimationFrame(layoutFrame);
      observer.disconnect();
      document.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", stop);
      window.removeEventListener("blur", stop);
      window.removeEventListener("resize", schedule);
      reducedMotion.removeEventListener("change", stop);
      reset();
      delete portal.dataset.placement;
      stage?.style.removeProperty("--axiom-frame-shift");
    };
  }, [pathname]);

  return null;
}
