"use client";

import { usePathname } from "next/navigation";

export default function HomeBackgroundVideo() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <div className="axiom-home-video-bg" aria-hidden="true">
      <video
        className="axiom-home-scene axiom-home-automation-scene"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/images/axiomai-automation-bg.jpg"
      >
        <source src="/videos/axiomai-automation-bg.mp4" type="video/mp4" />
      </video>
      <video
        className="axiom-home-scene axiom-home-robotics-scene"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/images/axiomai-presenter.png"
      >
        <source src="/videos/axiomai-robotics-showcase-bg.mp4" type="video/mp4" />
      </video>
      <div className="axiom-home-video-vignette" />
    </div>
  );
}