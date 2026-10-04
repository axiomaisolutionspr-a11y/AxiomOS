"use client";

import { usePathname } from "next/navigation";

export default function HomeBackgroundVideo() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <div className="axiom-home-video-bg" aria-hidden="true">
      <video
        className="axiom-home-bg-video axiom-home-bg-video-primary axiom-home-solutions-scene"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/images/axiomai-presenter.png"
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          if (video.duration > 5) video.currentTime = 5;
        }}
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          if (video.duration > 5 && video.currentTime < 5) video.currentTime = 5;
        }}
      >
        <source src="/videos/axiomai-avatar.mp4" type="video/mp4" />
      </video>
      <video
        className="axiom-home-bg-video axiom-home-bg-video-secondary axiom-home-robotics-scene"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/images/axiomai-presenter.png"
      >
        <source src="/videos/axiomai-robotics-showcase-bg.mp4" type="video/mp4" />
      </video>
      <div className="axiom-home-video-edge axiom-home-video-edge-left" />
      <div className="axiom-home-video-edge axiom-home-video-edge-right" />
      <div className="axiom-home-video-vignette" />
    </div>
  );
}
