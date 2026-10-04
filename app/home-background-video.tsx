"use client";

import { usePathname } from "next/navigation";
import { useRef } from "react";

function BackgroundScene({ source, className, start = 0 }: { source: string; className: string; start?: number }) {
  const reflection = useRef<HTMLVideoElement>(null);
  const scene = useRef<HTMLVideoElement>(null);
  return (
    <div className={`axiom-home-scene ${className}`}>
      <video ref={reflection} className="axiom-home-scene-reflection" autoPlay muted loop playsInline preload="metadata" poster="/images/axiomai-presenter.png"
        onLoadedMetadata={(event) => {
          if (event.currentTarget.duration > start) event.currentTarget.currentTime = Math.max(start, scene.current?.currentTime ?? start);
        }}>
        <source src={source} type="video/mp4" />
      </video>
      <video ref={scene} className="axiom-home-scene-main" autoPlay muted loop playsInline preload="metadata" poster="/images/axiomai-presenter.png"
        onLoadedMetadata={(event) => {
          if (start && event.currentTarget.duration > start) event.currentTarget.currentTime = start;
        }}
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          if (video.duration > start && video.currentTime < start) video.currentTime = start;
          const fill = reflection.current;
          if (fill && fill.readyState > 0 && Math.abs(fill.currentTime - video.currentTime) > 0.6) fill.currentTime = video.currentTime;
        }}>
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
      <BackgroundScene className="axiom-home-solutions-scene" source="/videos/axiomai-avatar.mp4" start={5} />
      <BackgroundScene className="axiom-home-robotics-scene" source="/videos/axiomai-robotics-showcase-bg.mp4" />
      <div className="axiom-home-video-edge axiom-home-video-edge-left" />
      <div className="axiom-home-video-edge axiom-home-video-edge-right" />
      <div className="axiom-home-video-vignette" />
    </div>
  );
}
