"use client";
import { createAuthClient } from "@neon/auth/next";
import { useRouter } from "next/navigation";
import { useState } from "react";
const auth=createAuthClient();
export default function SignOut(){
  const router=useRouter();const [error,setError]=useState("");const [pending,setPending]=useState(false);
  return <div><button disabled={pending} className="rounded border px-4 py-2" onClick={async()=>{
    setPending(true);setError("");
    try {const result=await auth.signOut();if(result.error) setError("No se pudo cerrar la sesión.");
      else {router.replace("/prospectos/autopilot/acceso");router.refresh();}}
    catch {setError("No se pudo cerrar la sesión.");} finally {setPending(false);}
  }}>{pending?"Cerrando…":"Cerrar sesión"}</button>{error&&<p role="alert">{error}</p>}</div>;
}
