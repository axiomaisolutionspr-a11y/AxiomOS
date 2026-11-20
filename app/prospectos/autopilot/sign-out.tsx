"use client";
import { createAuthClient } from "@neon/auth/next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { dict, type Lang } from "./i18n";
const auth=createAuthClient();
export default function SignOut({ lang = "es" }: { lang?: Lang }){
  const t = dict(lang);
  const router=useRouter();const [error,setError]=useState("");const [pending,setPending]=useState(false);
  return <div><button disabled={pending} className="rounded border px-4 py-2" onClick={async()=>{
    setPending(true);setError("");
    try {const result=await auth.signOut();if(result.error) setError(t.signOutFailed);
      else {router.replace("/prospectos/autopilot/acceso");router.refresh();}}
    catch {setError(t.signOutFailed);} finally {setPending(false);}
  }}>{pending?t.signingOut:t.signOut}</button>{error&&<p role="alert">{error}</p>}</div>;
}
