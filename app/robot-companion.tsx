"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function RobotCompanion() {
  const pathname = usePathname();

  useEffect(() => {
    const portal = document.querySelector<HTMLElement>(".axiom-robotics-portal");
    const avatar = portal?.querySelector<HTMLElement>(".axiom-robot-avatar");
    if (!portal || !avatar) return;
    const talk = portal.querySelector<HTMLButtonElement>(".axiom-robot-talk");
    const speak = () => {
      const control = document.querySelector<HTMLButtonElement>(".axiom-narration-toggle");
      if (control) control.click();
      else window.location.assign("/#inicio");
    };
    talk?.addEventListener("click", speak);

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
      cancelAnimationFrame(layoutFrame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      talk?.removeEventListener("click", speak);
      delete portal.dataset.placement;
      stage?.style.removeProperty("--axiom-frame-shift");
    };
  }, [pathname]);

  return null;
}
