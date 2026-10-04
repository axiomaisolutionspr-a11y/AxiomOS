"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

function BackgroundScene({ source, className, start = 0 }: { source: string; className: string; start?: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const hero = document.getElementById("inicio");
    if (!video || !hero) return;

    let inView = true;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPlayback = () => {
      if (document.hidden || !inView || reducedMotion.matches) {
        video.pause();
      } else {
        void video.play().catch(() => {});
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    }, { rootMargin: "200px" });
    observer.observe(hero);
    document.addEventListener("visibilitychange", syncPlayback);
    reducedMotion.addEventListener("change", syncPlayback);
    syncPlayback();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      reducedMotion.removeEventListener("change", syncPlayback);
    };
  }, []);

  return (
    <div className={`axiom-home-scene ${className}`}>
      <video
        ref={videoRef}
        className="axiom-home-scene-main"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedMetadata={(event) => {
          if (start && event.currentTarget.duration > start) event.currentTarget.currentTime = start;
        }}
        onTimeUpdate={(event) => {
          if (start && event.currentTarget.duration > start && event.currentTarget.currentTime < start) {
            event.currentTarget.currentTime = start;
          }
        }}
      >
        <source src={source} type="video/mp4" />
      </video>
    </div>
  );
}

export default function HomeBackgroundVideo() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <div className="axiom-home-video-bg" aria-hidden="true">
      <BackgroundScene className="axiom-home-solutions-scene" source="/videos/axiomai-avatar-new-web.mp4" start={9} />
      <BackgroundScene className="axiom-home-robotics-scene" source="/videos/axiomai-robotics-showcase-bg-light.mp4" />
      <div className="axiom-home-video-edge axiom-home-video-edge-left" />
      <div className="axiom-home-video-edge axiom-home-video-edge-right" />
      <div className="axiom-home-video-vignette" />
    </div>
  );
}
