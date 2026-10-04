"use client";

import { usePathname } from "next/navigation";

function BackgroundScene({ source, className, start = 0 }: { source: string; className: string; start?: number }) {
  return (
    <div className={`axiom-home-scene ${className}`}>
      <video
        className="axiom-home-scene-main"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedMetadata={(event) => {
          if (start && event.currentTarget.duration > start) event.currentTarget.currentTime = start;
        }}
        onCanPlay={(event) => {
          if (event.currentTarget.paused) void event.currentTarget.play().catch(() => {});
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
