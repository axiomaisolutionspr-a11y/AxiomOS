import { commercialIdentityAuthConfig, commercialIdentityDatabase } from "../../../lib/commercial-identity";
import { uiPrefs } from "../prefs";
import AccessForm from "./access-form";

export const dynamic = "force-dynamic";

export default async function AutopilotAccessPage() {
  const { lang, mode, theme, t } = await uiPrefs();
  if (!commercialIdentityAuthConfig() || !commercialIdentityDatabase()) {
    return <main lang={lang} className="mx-auto grid min-h-screen max-w-md place-content-center px-5 text-slate-900">
      <h1 className="text-2xl font-bold">{t.accessDisabledTitle}</h1>
      <p className="mt-3">{t.accessDisabledText}</p>
    </main>;
  }
  return <AccessForm lang={lang} mode={mode} theme={theme} />;
}
