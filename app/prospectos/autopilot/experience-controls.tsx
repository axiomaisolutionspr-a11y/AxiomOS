"use client";
// Ajustes de la interfaz en un área secundaria: un botón pequeño "Ajustes" (engranaje) abre un panel
// con Efectos (3D / Sobrio) y Color; al lado queda un selector compacto ES | EN.
// Todo se guarda en cookies por un año. Efectos y color cambian al instante; el idioma recarga los
// textos desde el servidor para que menús, etiquetas y mensajes del sistema queden en el mismo idioma.
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { dict, FX_COOKIE, FX_THEMES, LANG_COOKIE, THEME_COOKIE, type FxMode, type FxTheme, type Lang } from "./i18n";

const YEAR = 60 * 60 * 24 * 365;
const save = (name: string, value: string) => {
  document.cookie = `${name}=${value}; Path=/prospectos/autopilot; Max-Age=${YEAR}; SameSite=Lax; Secure`;
};

export default function ExperienceControls({ lang, mode, theme = "azul" }: { lang: Lang; mode: FxMode; theme?: FxTheme }) {
  const router = useRouter();
  const [current, setCurrent] = useState(mode);
  const [color, setColor] = useState(theme);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const t = dict(lang);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const setMode = (next: FxMode) => {
    setCurrent(next);
    save(FX_COOKIE, next);
    document.querySelector<HTMLElement>("main.fx")?.setAttribute("data-fx-mode", next);
  };
  const setTheme = (next: FxTheme) => {
    setColor(next);
    save(THEME_COOKIE, next);
    document.querySelector<HTMLElement>("main.fx")?.setAttribute("data-fx-theme", next);
  };
  const setLang = (next: Lang) => {
    if (next === lang) return;
    save(LANG_COOKIE, next);
    document.documentElement.lang = next;
    start(() => router.refresh());
  };

  return <div ref={box} className="fx-controls">
    <div className="fx-seg fx-seg-sm" role="group" aria-label={t.languageHelp} aria-busy={pending}>
      <button type="button" lang="es" aria-pressed={lang === "es"} onClick={() => setLang("es")} title="Español">ES</button>
      <button type="button" lang="en" aria-pressed={lang === "en"} onClick={() => setLang("en")} title="English">EN</button>
    </div>
    <button type="button" className="fx-settings-btn" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)}>
      <span aria-hidden="true">⚙</span> {t.settings}
    </button>
    {open && <div id={panelId} role="dialog" aria-label={t.settings} className="fx-settings-panel">
      <p className="fx-settings-title">{t.effects}</p>
      <div className="fx-seg" role="group" aria-label={t.effectsHelp}>
        <button type="button" aria-pressed={current === "3d"} onClick={() => setMode("3d")}>{t.effects3d}</button>
        <button type="button" aria-pressed={current === "sobrio"} onClick={() => setMode("sobrio")}>{t.effectsCalm}</button>
      </div>
      <p className="fx-settings-hint">{current === "3d" ? t.effects3dHint : t.effectsCalmHint}</p>
      <p className="fx-settings-title">{t.color}</p>
      <div className="fx-swatches" role="group" aria-label={t.colorHelp}>
        {FX_THEMES.map((name) => <button key={name} type="button" aria-pressed={color === name} onClick={() => setTheme(name)}>
          <span className="fx-swatch" data-theme={name} aria-hidden="true" />{t.themes[name]}
        </button>)}
      </div>
    </div>}
  </div>;
}
