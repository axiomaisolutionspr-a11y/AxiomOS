"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Contact, Sector, STAGES, dateLabel, inputDate, isClosed, needsAttention, nextAction } from "../../lib/crm/model";
import { SECTORS, demoContacts } from "../../lib/crm/demo-data";
import { authorizeSimpleCalls, startSimpleCall } from "./calls";
import WhatsAppAvisos from "../WhatsAppAvisos";
import CerrarSesionButton from "../CerrarSesionButton";
import { saveSimpleContact, markContactReviewed, deleteSimpleContact } from "./actions";
import "./workspace.css";

type View = "inicio" | "clientes" | "seguimientos";
type FocusFilter = "Todos" | "Sin revisar" | "Vencidos" | "Oportunidades";
const ACTIVE_STAGES:Contact["stage"][]=["Interesado","Cita agendada","Cotización enviada","Negociación"];
function displayContactName(contact:Contact){
  if(contact.name !== "Contacto de WhatsApp" && contact.name !== "Contacto sin identificar") return contact.name;
  const profile=contact.notes.match(/Nombre de perfil\s*\(sin verificar\):\s*([^\n\r]+)/i)?.[1]?.trim();
  return profile ? `${profile} (sin verificar)` : contact.name;
}

function prDay(value:string|number|Date){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Puerto_Rico",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value));}
function priorityLabel(contact:Contact,now:number){
  if(contact.unread>0)return "Mensaje nuevo";
  if(contact.followUpAt&&new Date(contact.followUpAt).getTime()<=now&&!isClosed(contact))return "Seguimiento vencido";
  if(ACTIVE_STAGES.includes(contact.stage))return "Oportunidad activa";
  if(contact.followUpAt)return "Seguimiento programado";
  return "Por contactar";
}
function Icon({name,size=22}:{name:string;size?:number}) {
  const paths:Record<string,string> = {home:"M3 10 12 3l9 7v10h-6v-7H9v7H3Z",users:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M17 11h6",clock:"M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",chat:"M21 11.5a8 8 0 0 1-8 8H5l-4 3 2-6a8 8 0 1 1 18-5Z",arrow:"M5 12h14m-6-6 6 6-6 6",check:"m5 12 4 4L19 6",search:"M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",spark:"m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z",reset:"M3 10a9 9 0 1 1 2 9M3 3v7h7",close:"m6 6 12 12M6 18 18 6"};
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.spark}/></svg>;
}
export default function CRMWorkspace({mode,initialContacts}:{mode:"live"|"demo";initialContacts:Contact[]}) {
  const router=useRouter();
  const [sector,setSector]=useState<Sector>("optica");
  const [demoRows,setDemoRows]=useState<Contact[]>(()=>demoContacts("optica"));
  const [view,setView]=useState<View>("inicio");
  const [search,setSearch]=useState("");
  const [channelFilter,setChannelFilter]=useState("Todos");
  const [stageFilter,setStageFilter]=useState("Todos");
  const [ownerFilter,setOwnerFilter]=useState("Todos");
  const [focusFilter,setFocusFilter]=useState<FocusFilter>("Todos");
  const [calling,setCalling]=useState(false);
  const [callAuthorized,setCallAuthorized]=useState(false);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [editing,setEditing]=useState(false);
  const [saving,setSaving]=useState(false);
  const [status,setStatus]=useState("");
  const [formMode,setFormMode]=useState<"reminder"|"details">("reminder");
  const [confirmingDelete,setConfirmingDelete]=useState(false);
  const [flow,setFlow]=useState(0);
  const [runId,setRunId]=useState(0);
  const contacts=mode==="demo" ? demoRows : initialContacts;
  const scenario=SECTORS[sector];
  const selected=contacts.find(c=>c.id===selectedId);
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=setInterval(()=>{setNow(Date.now());if(mode==="live"&&!editing&&!calling&&!saving&&document.visibilityState==="visible")router.refresh();},20000);return ()=>clearInterval(timer);},[mode,editing,calling,saving,router]);
  const attention=contacts.filter(c=>needsAttention(c,now));
  const stats=useMemo(()=>{
    const today=prDay(now);
    return {
      unread:contacts.filter(c=>c.unread>0).length,
      overdue:contacts.filter(c=>!isClosed(c)&&Boolean(c.followUpAt)&&new Date(c.followUpAt!).getTime()<=now).length,
      today:contacts.filter(c=>!isClosed(c)&&Boolean(c.followUpAt)&&prDay(c.followUpAt!)===today).length,
      opportunities:contacts.filter(c=>ACTIVE_STAGES.includes(c.stage)).length,
      won:contacts.filter(c=>c.stage==="Vendido").length,
    };
  },[contacts,now]);
  const visible=useMemo(()=>contacts.filter(c=>{
    if(view==="inicio"&&!needsAttention(c,now))return false;
    if(view==="seguimientos"&&(isClosed(c)||!c.followUpAt))return false;
    if(focusFilter==="Sin revisar"&&c.unread===0)return false;
    if(focusFilter==="Vencidos"&&(isClosed(c)||!c.followUpAt||new Date(c.followUpAt).getTime()>now))return false;
    if(focusFilter==="Oportunidades"&&!ACTIVE_STAGES.includes(c.stage))return false;
    if(channelFilter!=="Todos"&&c.channel!==channelFilter)return false;
    if(stageFilter!=="Todos"&&c.stage!==stageFilter)return false;
    if(ownerFilter!=="Todos"&&(c.assignee||"Sin asignar")!==ownerFilter)return false;
    return `${displayContactName(c)} ${c.name} ${c.phone} ${c.company} ${c.request}`.toLowerCase().includes(search.toLowerCase());
  }).sort((a,b)=>Number(needsAttention(b,now))-Number(needsAttention(a,now))||new Date(b.lastSeenAt).getTime()-new Date(a.lastSeenAt).getTime()),[contacts,view,search,now,channelFilter,stageFilter,ownerFilter,focusFilter]);

  function choose(id:string){setSelectedId(id);setEditing(false);setCalling(false);setConfirmingDelete(false);setStatus("");}
  function update(id:string,patch:Partial<Contact>){if(mode==="demo")setDemoRows(rows=>rows.map(c=>c.id===id?{...c,...patch}:c));}
  function changeSector(value:Sector){setSector(value);setDemoRows(demoContacts(value));setFlow(0);setRunId(0);setSelectedId(null);setEditing(false);setCalling(false);setStatus("");setSearch("");}
  function reset(){setDemoRows(demoContacts(sector));setFlow(0);setRunId(id=>id+1);setSelectedId(null);setEditing(false);setCalling(false);setStatus("Demo reiniciado. Todos los datos son ficticios.");}
  function advanceDemo(){
    const id=`flow-${sector}-${runId}`; const time=new Date().toISOString();
    if(flow===0){
      const contact:Contact={id,name:scenario.client,company:scenario.company,phone:"",stage:"Nuevo",assignee:"",followUpAt:null,lastSeenAt:time,notes:"Contacto ficticio de demostración.",request:scenario.request,nextAction:"Brain recoge la información necesaria.",unread:1,channel:"WhatsApp",messages:[{id:`${id}-1`,text:scenario.request,at:time,incoming:true,channel:"WhatsApp"}]};
      setDemoRows(rows=>[contact,...rows]);choose(id);setView("inicio");setSearch("");setFlow(1);setStatus("Consulta simulada recibida. El contacto aparece automáticamente.");
    }else if(flow===1){
      setDemoRows(rows=>rows.map(c=>c.id===id?{...c,messages:[{id:`${id}-2`,text:scenario.reply,at:time,incoming:false,channel:"WhatsApp"},...c.messages],nextAction:"Esperar los datos del cliente."}:c));choose(id);setFlow(2);setStatus("Brain responde con una pregunta breve. Es una simulación.");
    }else if(flow===2){
      setDemoRows(rows=>rows.map(c=>c.id===id?{...c,stage:"Interesado",unread:2,request:scenario.answer,nextAction:scenario.action,messages:[{id:`${id}-3`,text:scenario.answer,at:time,incoming:true,channel:"WhatsApp"},...c.messages]}:c));choose(id);setFlow(3);setStatus("Los datos están organizados. El equipo sabe qué revisar.");
    }else if(flow===3){
      update(id,{assignee:scenario.assignee,stage:"Seguimiento",followUpAt:new Date(Date.now()+3600000).toISOString(),nextAction:scenario.action});choose(id);setFlow(4);setStatus("Seguimiento simulado asignado. No se reservó una cita ni se aprobó financiamiento.");
    }else{
      update(id,{unread:0,stage:"Contactado",nextAction:"El equipo revisó la consulta y dio seguimiento. Confirmar el próximo paso con el cliente."});setFlow(5);setStatus("Flujo completado: consulta, respuesta, información y seguimiento humano.");
    }
  }
  async function save(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault(); if(!selected||saving)return;
    const data=new FormData(event.currentTarget); const reviewed=data.get("reviewed")==="true";
    const followup=String(data.get("followUpAt")||"");
    const patch:Partial<Contact>={stage:String(data.get("stage")) as Contact["stage"],assignee:String(data.get("assignee")||""),followUpAt:followup?new Date(`${followup}:00-04:00`).toISOString():null,unread:reviewed?0:selected.unread};
    patch.nextAction=nextAction({...selected,...patch});
    if(mode==="demo"){const note=String(data.get("note")||"").trim();if(note)patch.notes=`${selected.notes}\n\nNota del equipo: ${note}`;update(selected.id,patch);setEditing(false);setStatus("Cambio aplicado solo en este demo. No se envió nada.");return;}
    setSaving(true);setStatus("");
    try{const result=await saveSimpleContact(data);if(result.ok){setEditing(false);setStatus(formMode==="reminder"?"Recordatorio guardado.":"Cambios guardados.");router.refresh();}else setStatus(result.error||"No se pudo guardar.");}
    catch{setStatus("No se pudo conectar. Conserva tus cambios e intenta otra vez.");}
    finally{setSaving(false);}
  }

  async function markReviewed(){
    if(!selected||saving)return;
    const patch:Partial<Contact>={unread:0};
    if(mode==="demo"){update(selected.id,patch);setStatus("Consulta revisada. Los recordatorios se conservan.");return;}
    setSaving(true);
    try{const result=await markContactReviewed(selected.id);if(result.ok){setStatus("Consulta revisada. Los recordatorios se conservan.");router.refresh();}else setStatus(result.error||"No se pudo guardar.");}catch{setStatus("No se pudo guardar. Intenta otra vez.");}finally{setSaving(false);}
  }
  async function deleteContact(){
    if(!selected||saving||mode!=="live")return;
    setSaving(true);setStatus("");
    try{
      const result=await deleteSimpleContact(selected.id,selected.phone,selected.company);
      if(result.ok){
        setSelectedId(null);setConfirmingDelete(false);
        setStatus(`Contacto eliminado del CRM. ${result.deletedCalls||0} registro(s) de llamada asociado(s) también se eliminaron. Los mensajes originales de WhatsApp se conservaron para no alterar Brain.`);
        router.refresh();
      }else setStatus(result.error||"No se pudo eliminar.");
    }catch{setStatus("No se pudo eliminar. El registro permanece intacto.");}
    finally{setSaving(false);}
  }
  function openForm(value:"reminder"|"details"){setCalling(false);setFormMode(value);setEditing(true);setStatus("");}
  async function authorizeCalls(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(saving||mode!=="live")return;
    const data=new FormData(event.currentTarget);setSaving(true);setStatus("");
    try{
      const result=await authorizeSimpleCalls(data);
      if(result.ok){setCallAuthorized(true);setStatus("PIN verificado. Las llamadas están autorizadas durante 10 minutos.");}
      else setStatus(result.error||"No se pudo autorizar la llamada.");
    }catch{setStatus("No se pudo verificar el PIN. Intenta otra vez.");}
    finally{setSaving(false);}
  }
  async function placeCall(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(!selected||saving)return;if(mode==="demo"){setCalling(false);setStatus("Llamada del asistente simulada. No se contactó a nadie.");return;}const data=new FormData(event.currentTarget);data.set("id",selected.id);setSaving(true);setStatus("");try{const result=await startSimpleCall(data);if(result.ok){setCalling(false);setStatus("Telnyx aceptó iniciar la llamada. Revisa el resultado en el historial.");}else setStatus(result.error||"No se pudo iniciar la llamada.");}catch{setStatus("No pudimos confirmar si se inició la llamada. Revisa el historial antes de intentar otra vez.");}finally{setSaving(false);}}
  const latestWA=contacts.flatMap(c=>c.messages).filter(m=>m.incoming&&m.channel==="WhatsApp"&&/^wa-\d+$/.test(m.id)).reduce((max,m)=>BigInt(m.id.slice(3))>BigInt(max)?m.id.slice(3):max,"0");
  const pendingWA=contacts.reduce((sum,c)=>sum+(c.channel==="WhatsApp"?c.unread:0),0);
  const title=view==="inicio"?"¿A quién atendemos hoy?":view==="clientes"?"Tus clientes":"Tus recordatorios";
  return <main className="crm-workspace">
    <header className="simple-header"><div className="simple-brand"><Image src="/images/axiomai-hero-logo.webp" alt="Logo original de AxiomAI Solutions" width={120} height={90}/><span>AxiomAI<strong>Tu negocio, en orden.</strong></span></div><span className="simple-mode">{mode==="demo"?"Demo · datos ficticios":"CRM · AxiomAI"}</span></header>
    <div className="simple-shell">
      {mode==="demo"&&<section className="simple-demo" aria-label="Probar el demo"><label>Ejemplo de negocio<select value={sector} onChange={e=>changeSector(e.target.value as Sector)}><option value="optica">Óptica</option><option value="dealer">Dealer de autos</option></select></label><div><button className="simple-button primary" type="button" disabled={editing||saving} onClick={()=>flow===5?reset():advanceDemo()}><Icon name="spark" size={20}/>{["Probar con un mensaje","Ver qué responde Brain","Ver la respuesta del cliente","Ver el recordatorio","Terminar el ejemplo","Probar otra vez"][flow]}</button><small>Una demostración. No envía mensajes reales.</small></div></section>}
      <div className="simple-status" role="status" aria-live="polite">{status}</div>
      {!selected?<>
        <section className="simple-heading"><p>AXIOMAI CRM</p><h1>{title}</h1><span>{view==="inicio"?"Tu centro de acción para responder, priorizar y avanzar oportunidades.":view==="clientes"?"Busca un cliente y abre su conversación.":"Aquí están los próximos contactos que programaste."}</span></section>
        <section className="crm-command" aria-label="Resumen de ventas">
          <div className="crm-command-copy"><span>HOY EN AXIOMAI</span><h2>Enfócate en lo que mueve el negocio</h2><p>Mensajes, seguimientos y oportunidades, ordenados para decidir el próximo paso.</p></div>
          <div className="crm-metrics">
            <button type="button" onClick={()=>{setView("clientes");setFocusFilter("Sin revisar");}}><Icon name="chat"/><strong>{stats.unread}</strong><span>con mensajes nuevos</span></button>
            <button type="button" onClick={()=>{setView("clientes");setFocusFilter("Vencidos");}}><Icon name="clock"/><strong>{stats.overdue}</strong><span>seguimientos vencidos</span></button>
            <button type="button" onClick={()=>{setView("seguimientos");setFocusFilter("Todos");}}><Icon name="clock"/><strong>{stats.today}</strong><span>programados para hoy</span></button>
            <button type="button" onClick={()=>{setView("clientes");setFocusFilter("Oportunidades");}}><Icon name="spark"/><strong>{stats.opportunities}</strong><span>oportunidades activas</span></button>
          </div>
          <div className="crm-pipeline" aria-label="Resumen del embudo"><span>Embudo activo</span><div><i style={{width:`${Math.min(100,contacts.length?((stats.opportunities+stats.won)/contacts.length)*100:0)}%`}}/></div><strong>{stats.won} ventas cerradas</strong></div>
        </section>
        <nav className="simple-tabs" aria-label="Ver clientes">{([{id:"inicio",label:"Por atender"},{id:"clientes",label:"Todos los clientes"},{id:"seguimientos",label:"Recordatorios"}] as const).map(item=><button type="button" key={item.id} aria-pressed={view===item.id} className={view===item.id?"active":""} onClick={()=>{setView(item.id);setSearch("");setStatus("");}}>{item.label}{item.id==="inicio"&&attention.length>0&&<b>{attention.length}</b>}</button>)}</nav>
        <label className="simple-search"><Icon name="search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, empresa, teléfono o necesidad…" aria-label="Buscar un cliente"/></label>
        <div className="focus-filters" aria-label="Prioridad">{(["Todos","Sin revisar","Vencidos","Oportunidades"] as FocusFilter[]).map(value=><button type="button" key={value} className={focusFilter===value?"active":""} aria-pressed={focusFilter===value} onClick={()=>setFocusFilter(value)}>{value}</button>)}</div>
        <div className="simple-filters"><label>Canal<select value={channelFilter} onChange={e=>setChannelFilter(e.target.value)}>{["Todos","WhatsApp","Llamada","Web"].map(v=><option key={v}>{v}</option>)}</select></label><label>Estado<select value={stageFilter} onChange={e=>setStageFilter(e.target.value)}>{["Todos",...STAGES].map(v=><option key={v}>{v}</option>)}</select></label><label>Responsable<select value={ownerFilter} onChange={e=>setOwnerFilter(e.target.value)}>{["Todos",...new Set(contacts.map(c=>c.assignee||"Sin asignar"))].map(v=><option key={v}>{v}</option>)}</select></label>{(channelFilter!=="Todos"||stageFilter!=="Todos"||ownerFilter!=="Todos"||focusFilter!=="Todos"||search)&&<button type="button" className="simple-clear" onClick={()=>{setChannelFilter("Todos");setStageFilter("Todos");setOwnerFilter("Todos");setFocusFilter("Todos");setSearch("");}}>Limpiar filtros</button>}</div><p className="simple-results">{visible.length} {visible.length===1?"cliente encontrado":"clientes encontrados"}</p>
        <section className="simple-list" aria-label="Lista de clientes">{visible.length===0?<div className="simple-empty"><Icon name="check" size={34}/><h2>{search?"No encontramos ese cliente":"No hay contactos en este filtro"}</h2><p>{search?"Prueba con su teléfono, empresa o necesidad.":"Cambia la prioridad o abre Todos los clientes."}</p><button className="simple-button secondary" onClick={()=>{setView("clientes");setFocusFilter("Todos");setSearch("");}} type="button">Ver todos los clientes</button></div>:visible.map(c=><button type="button" className="simple-client" key={c.id} onClick={()=>choose(c.id)}><span className="simple-avatar">{displayContactName(c).split(" ").slice(0,2).map(n=>n[0]).join("")}</span><span className="simple-client-copy"><span className="client-topline"><strong>{displayContactName(c)}</strong><em data-priority={priorityLabel(c,now)}>{priorityLabel(c,now)}</em></span>{c.company&&<span className="client-company">{c.company}</span>}<span>{c.request}</span><small>{c.unread>0?`${c.unread} ${c.unread===1?"consulta sin revisar":"consultas sin revisar"} · ${c.channel}`:c.followUpAt?`Recordatorio: ${dateLabel(c.followUpAt)}`:c.channel}</small><span className="client-next"><b>Próximo paso:</b> {c.nextAction}</span></span><span className="simple-open">Abrir<Icon name="arrow" size={20}/></span></button>)}</section>
      </>:<section className="simple-person" key={selected.id}>
        <button type="button" className="simple-back" disabled={saving} onClick={()=>{setSelectedId(null);setEditing(false);setCalling(false);setConfirmingDelete(false);setStatus("");}}>← Volver a los clientes</button>
        <header className="simple-person-heading"><span className="simple-avatar large">{displayContactName(selected).split(" ").slice(0,2).map(n=>n[0]).join("")}</span><div><p>{selected.channel}</p><h1>{displayContactName(selected)}</h1><span>{selected.company}{selected.phone?` · ${selected.phone}`:""}</span></div></header>
        <section className="simple-request"><span>LO QUE NECESITA</span><p>{selected.request}</p>{selected.followUpAt&&<small><Icon name="clock" size={18}/>Recordatorio: {dateLabel(selected.followUpAt)}</small>}</section>
        <section className="next-action-card"><span>PRÓXIMA MEJOR ACCIÓN</span><strong>{selected.nextAction}</strong><small>{priorityLabel(selected,now)} · {selected.stage}</small>{!selected.followUpAt&&!isClosed(selected)&&<small>Sin seguimiento programado. Define una fecha antes de dejar este contacto pendiente.</small>}</section>
        {!editing?<><div className="simple-actions"><button type="button" className="simple-button primary" disabled={saving||selected.unread===0} onClick={markReviewed}><Icon name="check"/>{saving?"Guardando…":selected.unread===0?"Consulta revisada":"Ya lo revisé"}</button>{selected.phone&&<a className="simple-button whatsapp" href={`https://wa.me/${selected.phone.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"><Icon name="chat"/>Escribir por WhatsApp</a>}<button type="button" className="simple-button secondary" disabled={saving} onClick={()=>openForm("reminder")}><Icon name="clock"/>Programar seguimiento</button>{mode==="live"&&selected.phone?<a className="simple-button secondary" href={`tel:${selected.phone.replace(/[^+\d]/g,"")}`}>Llamar</a>:<button type="button" className="simple-button secondary" disabled={mode==="live"} onClick={()=>setStatus("Llamada simulada. En tu CRM, Llamar abre el teléfono del dispositivo cuando el contacto tiene número.")}>Llamar</button>}<button type="button" className="simple-button secondary" disabled={saving||(mode==="live"&&!selected.phone)} onClick={()=>{setCalling(!calling);setStatus("");}}>Llamar con AxiomAI</button></div><p className="simple-help">Revisar quita el aviso. Programar seguimiento guarda cuándo volver a contactar.{mode==="live"&&!selected.phone?" Este contacto no tiene teléfono registrado.":""}</p></>:<form className="simple-form" onSubmit={save}>
          <h2>{formMode==="reminder"?"¿Cuándo quieres volver a contactarlo?":"Datos del cliente"}</h2><input type="hidden" name="id" value={selected.id}/>
          {formMode==="reminder"?<><input type="hidden" name="stage" value={isClosed(selected)?selected.stage:"Seguimiento"}/><input type="hidden" name="assignee" value={selected.assignee}/><label>Fecha y hora · Puerto Rico<input type="datetime-local" name="followUpAt" required defaultValue={inputDate(selected.followUpAt)}/></label><label>Qué necesitas hacer <span>(opcional)</span><textarea name="note" placeholder="Ejemplo: confirmar si desea una cita" rows={2}/></label></>:<><label>Estado<select name="stage" defaultValue={selected.stage}>{STAGES.map(stage=><option key={stage}>{stage}</option>)}</select></label><label>Quién lo atiende<input name="assignee" defaultValue={selected.assignee} placeholder="Nombre del responsable"/></label><label>Próximo contacto · Puerto Rico<input type="datetime-local" name="followUpAt" defaultValue={inputDate(selected.followUpAt)}/></label><label>Añadir una nota<textarea name="note" rows={3}/></label></>}
          <div className="simple-actions"><button type="submit" className="simple-button primary" disabled={saving}>{saving?"Guardando…":formMode==="reminder"?"Guardar recordatorio":"Guardar cambios"}</button><button type="button" className="simple-button secondary" disabled={saving} onClick={()=>setEditing(false)}>Cancelar</button></div><p className="simple-help">{mode==="demo"?"Se guarda solo en este ejemplo.":"Se guarda en tu CRM. No envía mensajes al cliente."}</p>
        </form>}
        {calling&&(!callAuthorized&&mode==="live"?<form className="simple-form" onSubmit={authorizeCalls}><h2>Autorizar llamadas</h2><p>Introduce el PIN de llamada en el formulario privado. Verificarlo no inicia ninguna llamada.</p><label>PIN de llamada<input name="crm_call_pin" type="password" inputMode="numeric" autoComplete="current-password" required/></label><div className="simple-actions"><button type="submit" className="simple-button primary" disabled={saving}>{saving?"Verificando…":"Autorizar llamadas"}</button><button type="button" className="simple-button secondary" disabled={saving} onClick={()=>setCalling(false)}>Cancelar</button></div></form>:<form className="simple-form" onSubmit={placeCall}><h2>Llamar con AxiomAI</h2><p>{mode==="demo"?"Ejemplo de llamada del asistente. No contacta a nadie.":`El asistente llamará a ${selected.name} al ${selected.phone}.`}</p>{mode==="live"&&<p className="simple-help">PIN verificado. La llamada todavía no se ha iniciado.</p>}<input type="hidden" name="id" value={selected.id}/><div className="simple-actions"><button type="submit" className="simple-button primary" disabled={saving}>{saving?"Iniciando…":mode==="demo"?"Simular llamada":"Iniciar llamada"}</button><button type="button" className="simple-button secondary" disabled={saving} onClick={()=>setCalling(false)}>Cancelar</button></div></form>)}
        <details className="simple-history" open={mode==="demo" && selected.id.startsWith("flow-") || undefined}><summary>Ver la conversación</summary><div className="simple-messages">{selected.messages.length===0?<p>No hay conversación guardada.</p>:[...selected.messages].reverse().map(m=><article className={m.incoming?"incoming":"outgoing"} key={m.id}><strong>{m.incoming?displayContactName(selected):"Brain"}</strong><p>{m.text}</p><small>{dateLabel(m.at)}</small></article>)}</div></details>
        <details className="simple-history"><summary>Ver notas y más detalles</summary><p className="simple-notes">{selected.notes||"Sin notas adicionales."}</p><p>Estado: {selected.stage} · Responsable: {selected.assignee||"Sin asignar"}</p><button type="button" disabled={saving} className="simple-button secondary" onClick={()=>openForm("details")}>Editar estos datos</button>
          {mode==="live"&&<div className="simple-delete-zone">{!confirmingDelete?<button type="button" disabled={saving} className="simple-button danger-outline" onClick={()=>setConfirmingDelete(true)}>Eliminar contacto</button>:<><p><strong>Esta acción es permanente.</strong> Eliminará el contacto y sus llamadas asociadas del CRM. Los mensajes originales de WhatsApp se conservarán para no alterar Brain.</p><div className="simple-actions"><button type="button" disabled={saving} className="simple-button danger" onClick={deleteContact}>{saving?"Eliminando…":"Eliminar definitivamente"}</button><button type="button" disabled={saving} className="simple-button secondary" onClick={()=>setConfirmingDelete(false)}>Cancelar</button></div></>}</div>}
        </details>
      </section>}
      {mode==="live"&&<details className="simple-history"><summary>Avisos de WhatsApp</summary><WhatsAppAvisos pendientes={pendingWA} ultimoMensajeId={latestWA} autoRefresh={false}/></details>}
      <footer className="simple-footer"><span>{mode==="demo"?"Ejemplo con personas ficticias.":"Últimos 200 contactos · se actualiza automáticamente."}</span><details><summary>Otras opciones</summary><a href={mode==="demo"?"/prospectos/simple":"/prospectos/demo"}>{mode==="demo"?"Abrir nuestro CRM":"Probar la demostración"}</a><a href="/prospectos/anterior">Abrir el CRM anterior</a>{mode==="live"&&<CerrarSesionButton/>}{mode==="live"&&<button type="button" disabled={editing||saving} onClick={()=>router.refresh()}>Actualizar ahora</button>}</details></footer>
    </div>
  </main>;
}
