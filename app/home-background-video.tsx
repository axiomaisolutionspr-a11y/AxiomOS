"use client";

import { usePathname } from "next/navigation";

export default function HomeBackgroundVideo() {
  const pathname = usePathname();

  if (pathname !== "/") return null;

  return (
    <div className="axiom-home-video-bg" aria-hidden="true">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/images/axiomai-presenter.png"
      >
        <source src="/videos/axiomai-avatar.mp4" type="video/mp4" />
      </video>
      <div className="axiom-home-video-vignette" />
      <div className="axiom-home-video-grid" />
    </div>
  );
}
