"use client";
import { useState, type FormEvent } from "react";
import { createAuthClient } from "@neon/auth/next";
import { useRouter } from "next/navigation";
import FuturoFx from "../futuro-fx";
import HoloLogo from "../holo-logo";
import ExperienceControls from "../experience-controls";
import { dict, type FxMode, type Lang } from "../i18n";

const auth = createAuthClient();
export default function AutopilotAccessPage({ lang, mode }: { lang: Lang; mode: FxMode }) {
  const t = dict(lang);
  const router=useRouter();
  const [error,setError]=useState("");
  const [pending,setPending]=useState(false);
  const [sent,setSent]=useState(false);
  const [email,setEmail]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setError("");setPending(true);
    const form=new FormData(event.currentTarget);
    try {
      if(!sent) {
        const address=String(form.get("email")||"").trim().toLowerCase();
        const result=await auth.emailOtp.sendVerificationOtp({email:address,type:"sign-in"});
        if(result.error) setError(t.sendFailed);
        else {setEmail(address);setSent(true);}
      } else {
        const result=await auth.signIn.emailOtp({email,otp:String(form.get("code")||"").trim()});
        if(result.error) setError(t.codeInvalid);
        else {router.replace("/prospectos/autopilot");router.refresh();}
      }
    } catch {setError(t.verifyFailed);}
    finally {setPending(false);}
  }
  return <main lang={lang} data-fx-mode={mode} className="fx min-h-screen px-5 py-8">
    <FuturoFx />
    <div className="mx-auto grid max-w-md gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <HoloLogo label={t.logoLabel} />
        <ExperienceControls lang={lang} mode={mode} />
      </div>
      <section className="grid gap-5 rounded-2xl bg-white p-6">
        <h1 className="text-2xl font-bold sm:text-3xl">{t.accessTitle}</h1>
        <p className="text-slate-700">{t.accessIntro}</p>
        <form onSubmit={submit} className="grid gap-4">
          {!sent ? <label className="grid gap-1">{t.email}<input name="email" type="email" autoComplete="username" required className="rounded border p-3"/></label>
            : <><p>{t.codeSentTo} {email}.</p><label className="grid gap-1">{t.code}<input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required className="rounded border p-3"/></label></>}
          <button disabled={pending} className="rounded bg-blue-700 p-3 font-semibold text-white">{pending?t.processing:sent?t.verifyAndEnter:t.sendCode}</button>
        </form>
        {sent&&<button type="button" className="text-left text-blue-700 underline" onClick={()=>{setSent(false);setError("");}}>{t.changeEmail}</button>}
        {error&&<p role="alert" className="text-red-700">{error}</p>}
      </section>
    </div>
  </main>;
}
