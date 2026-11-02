"use client";
import {useEffect,useState} from "react";
import {handoffAction} from "./handoff";
export default function HandoffPanel({id}:{id:string}) {
  const [name,setName]=useState("Alex"), [body,setBody]=useState(""), [status,setStatus]=useState(""), [busy,setBusy]=useState(false);
  const key="axira-qa-turn-"+id;
  useEffect(()=>{handoffAction("status",id,"","","").then(r=>setStatus(r.status)).catch(()=>setStatus("No se pudo consultar el turno"));},[id]);
  async function run(action:string) {
    setBusy(true);
    try {
      const result=await handoffAction(action,id,name,sessionStorage.getItem(key)||"",body);
      sessionStorage.setItem(key,result.token); setStatus(result.status);
      if(result.status==="Respuesta simulada guardada") setBody("");
    } catch {setStatus("No se pudo completar la acción");} finally {setBusy(false);}
  }
  return <fieldset disabled={busy}><legend>Conversación QA · envío simulado</legend><select aria-label="Asesor" value={name} onChange={e=>setName(e.target.value)}><option>Alex</option><option>Rolando</option></select>
    <button onClick={()=>run("take")}>Tomar conversación</button><button onClick={()=>run("recover")}>Recuperar mi turno</button><textarea aria-label="Respuesta del asesor" value={body} onChange={e=>setBody(e.target.value)} maxLength={4000}/>
    <button disabled={!body.trim()} onClick={()=>run("send")}>Simular respuesta</button><button onClick={()=>run("release")}>Devolver a Axira</button><p role="status">{status}</p></fieldset>;
}
