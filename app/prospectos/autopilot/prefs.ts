import "server-only";
import { cookies } from "next/headers";
import { dict, FX_COOKIE, LANG_COOKIE, parseFxMode, parseLang } from "./i18n";

/** Idioma y modo de efectos elegidos por la persona (cookies; por defecto español y 3D). */
export async function uiPrefs() {
  const jar = await cookies();
  const lang = parseLang(jar.get(LANG_COOKIE)?.value);
  const mode = parseFxMode(jar.get(FX_COOKIE)?.value);
  return { lang, mode, t: dict(lang), locale: lang === "en" ? "en-US" : "es-PR" };
}
