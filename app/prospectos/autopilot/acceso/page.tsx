"use client";
import { useState, type FormEvent } from "react";
import { createAuthClient } from "@neon/auth/next";
import { useRouter } from "next/navigation";

const auth = createAuthClient();
export default function AutopilotAccessPage() {
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
        if(result.error) setError("No se pudo enviar el código. Intenta nuevamente.");
        else {setEmail(address);setSent(true);}
      } else {
        const result=await auth.signIn.emailOtp({email,otp:String(form.get("code")||"").trim()});
        if(result.error) setError("Código inválido o vencido. Solicita uno nuevo.");
        else {router.replace("/prospectos/autopilot");router.refresh();}
      }
    } catch {setError("No se pudo verificar el acceso. Intenta nuevamente.");}
    finally {setPending(false);}
  }
  return <main className="mx-auto grid min-h-screen max-w-md place-content-center gap-5 px-5 text-slate-900">
    <h1 className="text-3xl font-bold">Acceso individual · AxiomOS QA</h1>
    <p>Ingresa con tu cuenta autorizada. Recibirás un código de un solo uso en tu correo.</p>
    <form onSubmit={submit} className="grid gap-4">
      {!sent ? <label className="grid gap-1">Correo<input name="email" type="email" autoComplete="username" required className="rounded border p-3"/></label>
        : <><p>Código enviado a {email}.</p><label className="grid gap-1">Código<input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required className="rounded border p-3"/></label></>}
      <button disabled={pending} className="rounded bg-blue-700 p-3 font-semibold text-white">{pending?"Procesando…":sent?"Verificar y entrar":"Enviar código"}</button>
    </form>
    {sent&&<button className="text-left text-blue-700 underline" onClick={()=>{setSent(false);setError("");}}>Cambiar correo o solicitar otro código</button>}
    {error&&<p role="alert" className="text-red-700">{error}</p>}
  </main>;
}
