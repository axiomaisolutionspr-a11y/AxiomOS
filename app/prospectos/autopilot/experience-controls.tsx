"use client";
// Controles visibles para cambiar el modo de efectos (3D / Sobrio) y el idioma (Español / English).
// Ambos se guardan en cookies por un año. El modo cambia al instante; el idioma recarga los textos
// desde el servidor para que menús, etiquetas y mensajes del sistema queden en el mismo idioma.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { dict, FX_COOKIE, LANG_COOKIE, type FxMode, type Lang } from "./i18n";

const YEAR = 60 * 60 * 24 * 365;
const save = (name: string, value: string) => {
  document.cookie = `${name}=${value}; Path=/prospectos/autopilot; Max-Age=${YEAR}; SameSite=Lax; Secure`;
};

export default function ExperienceControls({ lang, mode }: { lang: Lang; mode: FxMode }) {
  const router = useRouter();
  const [current, setCurrent] = useState(mode);
  const [pending, start] = useTransition();
  const t = dict(lang);

  const setMode = (next: FxMode) => {
    setCurrent(next);
    save(FX_COOKIE, next);
    document.querySelector<HTMLElement>("main.fx")?.setAttribute("data-fx-mode", next);
  };
  const setLang = (next: Lang) => {
    if (next === lang) return;
    save(LANG_COOKIE, next);
    document.documentElement.lang = next;
    start(() => router.refresh());
  };

  return <div className="fx-controls">
    <div className="fx-seg" role="group" aria-label={t.effectsHelp}>
      <span className="fx-seg-label">{t.effects}</span>
      <button type="button" aria-pressed={current === "3d"} onClick={() => setMode("3d")}>{t.effects3d}</button>
      <button type="button" aria-pressed={current === "sobrio"} onClick={() => setMode("sobrio")}>{t.effectsCalm}</button>
    </div>
    <div className="fx-seg" role="group" aria-label={t.languageHelp} aria-busy={pending}>
      <button type="button" lang="es" aria-pressed={lang === "es"} onClick={() => setLang("es")}>Español</button>
      <button type="button" lang="en" aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button>
    </div>
  </div>;
}
