"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function HomeBackgroundVideo() {
  const pathname = usePathname();
  const secondaryVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = secondaryVideoRef.current;
    if (!video) return;

    const offsetSecondaryLayer = () => {
      if (Number.isFinite(video.duration) && video.duration > 8) {
        video.currentTime = Math.min(8, Math.max(0, video.duration - 1));
      }
      void video.play().catch(() => undefined);
    };

    video.addEventListener("loadedmetadata", offsetSecondaryLayer, { once: true });
    return () => video.removeEventListener("loadedmetadata", offsetSecondaryLayer);
  }, []);

  if (pathname !== "/") return null;

  return (
    <div className="axiom-home-video-bg" aria-hidden="true">
      <video
        className="axiom-home-bg-video axiom-home-bg-video-primary"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/images/axiomai-presenter.png"
      >
        <source src="/videos/axiomai-robotics-showcase-bg.mp4" type="video/mp4" />
        <source src="/videos/axiomai-avatar.mp4" type="video/mp4" />
      </video>

      <video
        ref={secondaryVideoRef}
        className="axiom-home-bg-video axiom-home-bg-video-secondary"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      >
        <source src="/videos/axiomai-robotics-showcase-bg.mp4" type="video/mp4" />
        <source src="/videos/axiomai-avatar.mp4" type="video/mp4" />
      </video>

      <div className="axiom-home-video-vignette" />
      <div className="axiom-home-video-aurora" />
      <div className="axiom-home-video-grid" />
      <div className="axiom-home-video-scan" />
    </div>
  );
}
