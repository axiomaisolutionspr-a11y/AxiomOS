"use client";
import { useState, type FormEvent } from "react";
import { createAuthClient } from "@neon/auth/next";
import { useRouter } from "next/navigation";

const auth = createAuthClient();
export default function AutopilotAccessPage() {
  const router=useRouter();
  const [error,setError]=useState("");
  const [pending,setPending]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setError("");setPending(true);
    const form=new FormData(event.currentTarget);
    try {
      const result=await auth.signIn.email({email:String(form.get("email")||"").trim(),password:String(form.get("password")||"")});
      if(result.error) setError("No se pudo iniciar sesión. Revisa tus credenciales.");
      else {router.replace("/prospectos/autopilot");router.refresh();}
    } catch {setError("No se pudo verificar el acceso. Intenta nuevamente.");}
    finally {setPending(false);}
  }
  return <main className="mx-auto grid min-h-screen max-w-md place-content-center gap-5 px-5 text-slate-900">
    <h1 className="text-3xl font-bold">Acceso individual · AxiomOS QA</h1>
    <p>Ingresa con tu cuenta autorizada. Cada persona tiene su propia sesión.</p>
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-1">Correo<input name="email" type="email" autoComplete="username" required className="rounded border p-3"/></label>
      <label className="grid gap-1">Contraseña<input name="password" type="password" autoComplete="current-password" required className="rounded border p-3"/></label>
      <button disabled={pending} className="rounded bg-blue-700 p-3 font-semibold text-white">{pending?"Verificando…":"Entrar"}</button>
    </form>
    {error&&<p role="alert" className="text-red-700">{error}</p>}
  </main>;
}
