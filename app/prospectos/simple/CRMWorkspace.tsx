"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Contact, Sector, STAGES, dateLabel, inputDate, isClosed, needsAttention, nextAction } from "../../lib/crm/model";
import { SECTORS, demoContacts } from "../../lib/crm/demo-data";
import { saveSimpleContact } from "./actions";
import "./workspace.css";

type View = "inicio" | "clientes" | "seguimientos";
function Icon({name,size=22}:{name:string;size?:number}) {
  const paths:Record<string,string> = {home:"M3 10 12 3l9 7v10h-6v-7H9v7H3Z",users:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M17 11h6",clock:"M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",chat:"M21 11.5a8 8 0 0 1-8 8H5l-4 3 2-6a8 8 0 1 1 18-5Z",arrow:"M5 12h14m-6-6 6 6-6 6",check:"m5 12 4 4L19 6",search:"M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",spark:"m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z",reset:"M3 10a9 9 0 1 1 2 9M3 3v7h7",close:"m6 6 12 12M6 18 18 6"};
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.spark}/></svg>;
}
const viewCopy = {inicio:{title:"Tu día, más claro.",description:"Estas son las personas que necesitan tu atención."},clientes:{title:"Cada cliente, en su lugar.",description:"Encuentra su conversación y organiza el próximo paso."},seguimientos:{title:"El próximo paso importa.",description:"Tus contactos pendientes de seguimiento, sin perder el hilo."}};
export default function CRMWorkspace({mode,initialContacts}:{mode:"live"|"demo";initialContacts:Contact[]}) {
  const router=useRouter();
  const [sector,setSector]=useState<Sector>("optica");
  const [demoRows,setDemoRows]=useState<Contact[]>(()=>demoContacts("optica"));
  const [overrides,setOverrides]=useState<Record<string,Partial<Contact>>>({});
  const [view,setView]=useState<View>("inicio");
  const [search,setSearch]=useState("");
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [editing,setEditing]=useState(false);
  const [saving,setSaving]=useState(false);
  const [status,setStatus]=useState("");
  const [filter,setFilter]=useState("todos");
  const [flow,setFlow]=useState(0);
  const [runId,setRunId]=useState(0);
  const contacts=mode==="demo" ? demoRows : initialContacts.map(c=>({...c,...overrides[c.id]}));
  const scenario=SECTORS[sector];
  const selected=contacts.find(c=>c.id===selectedId);
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=setInterval(()=>{setNow(Date.now());if(mode==="live"&&!editing&&!saving)router.refresh();},20000);return ()=>clearInterval(timer);},[mode,editing,saving,router]);
  const attention=contacts.filter(c=>needsAttention(c,now));
  const followups=contacts.filter(c=>!isClosed(c)&&c.followUpAt);
  const visible=useMemo(()=>contacts.filter(c=>{
    if(view==="inicio"&&!needsAttention(c,now))return false;
    if(view==="seguimientos"&&(isClosed(c)||!c.followUpAt))return false;
    if(filter==="whatsapp"&&c.channel!=="WhatsApp")return false;
    if(filter==="nuevos"&&c.stage!=="Nuevo")return false;
    return `${c.name} ${c.phone} ${c.company} ${c.request}`.toLowerCase().includes(search.toLowerCase());
  }).sort((a,b)=>Number(needsAttention(b,now))-Number(needsAttention(a,now))||new Date(b.lastSeenAt).getTime()-new Date(a.lastSeenAt).getTime()),[contacts,view,filter,search,now]);

  function choose(id:string){setSelectedId(id);setEditing(false);setStatus("");}
  function update(id:string,patch:Partial<Contact>){if(mode==="demo")setDemoRows(rows=>rows.map(c=>c.id===id?{...c,...patch}:c));else setOverrides(values=>({...values,[id]:{...values[id],...patch}}));}
  function changeSector(value:Sector){setSector(value);setDemoRows(demoContacts(value));setFlow(0);setRunId(0);setSelectedId(null);setEditing(false);setStatus("");setFilter("todos");setSearch("");}
  function reset(){setDemoRows(demoContacts(sector));setFlow(0);setRunId(id=>id+1);setSelectedId(null);setEditing(false);setStatus("Demo reiniciado. Todos los datos son ficticios.");}
  function advanceDemo(){
    const id=`flow-${sector}-${runId}`; const time=new Date().toISOString();
    if(flow===0){
      const contact:Contact={id,name:scenario.client,company:scenario.company,phone:"",stage:"Nuevo",assignee:"",followUpAt:null,lastSeenAt:time,notes:"Contacto ficticio de demostración.",request:scenario.request,nextAction:"Brain recoge la información necesaria.",unread:1,channel:"WhatsApp",messages:[{id:`${id}-1`,text:scenario.request,at:time,incoming:true,channel:"WhatsApp"}]};
      setDemoRows(rows=>[contact,...rows]);choose(id);setView("inicio");setSearch("");setFilter("todos");setFlow(1);setStatus("Consulta simulada recibida. El contacto aparece automáticamente.");
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
    try{const result=await saveSimpleContact(data);if(result.ok){setEditing(false);setStatus("Seguimiento guardado en tu CRM.");router.refresh();}else setStatus(result.error||"No se pudo guardar.");}
    catch{setStatus("No se pudo conectar. Conserva tus cambios e intenta otra vez.");}
    finally{setSaving(false);}
  }
  const flowLabels=["Consulta","Respuesta","Datos","Seguimiento","Atendido"];
  const buttonLabels=["Simular una consulta","Ver respuesta de Brain","Recibir datos del cliente","Asignar seguimiento","Marcar atención realizada"];
  return <main className="crm-workspace">
    <aside className="crm-sidebar">
      <a className="crm-brand" href="/prospectos/simple" aria-label="AxiomAI CRM"><Image src="/logo.png" alt="AxiomAI" width={48} height={48}/><span>AxiomAI<small>CRM · BRAIN</small></span></a>
      <div className="crm-nav-label">TU ESPACIO</div>
      <nav aria-label="Secciones del CRM">{([{id:"inicio",label:"Inicio",icon:"home"},{id:"clientes",label:"Clientes",icon:"users"},{id:"seguimientos",label:"Seguimientos",icon:"clock"}] as const).map(item=><button type="button" key={item.id} className={view===item.id?"active":""} aria-current={view===item.id?"page":undefined} onClick={()=>{setView(item.id);setSelectedId(null);setEditing(false);setFilter("todos");}}><Icon name={item.icon}/><span>{item.label}</span>{item.id==="inicio"&&attention.length>0&&<b>{attention.length}</b>}</button>)}</nav>
      <div className="crm-sidebar-bottom"><div className="crm-brain-mark"><Icon name="spark"/><span>Brain organiza.<br/><strong>Tú decides.</strong></span></div><a href={mode==="demo"?"/prospectos/simple":"/prospectos/demo"}><Icon name="arrow" size={18}/><span>{mode==="demo"?"Abrir mi CRM":"Probar demo"}</span></a><a href="/prospectos"><span>CRM actual</span></a></div>
    </aside>
    <div className="crm-main">
      <header className="crm-topbar"><div className="crm-topbar-left"><span className="crm-dot"/><span>{mode==="demo"?scenario.company:"AxiomAI Solutions"}</span><span className="crm-mode">{mode==="demo"?"DEMO · DATOS FICTICIOS":"VERSIÓN DE PRUEBA"}</span></div><div className="crm-user"><span>{mode==="demo"?"D":"R"}</span><div>{mode==="demo"?"Demostración":"Rolando"}<small>{mode==="demo"?"Sin envíos reales":"CRM conectado"}</small></div></div></header>
      <section className="crm-page-heading"><div><p className="crm-eyebrow">AXIOMAI CRM</p><h1>{viewCopy[view].title}</h1><p>{viewCopy[view].description}</p></div>{mode==="live"&&<button type="button" className="crm-btn crm-btn-white" disabled={editing} onClick={()=>{setOverrides({});router.refresh();setStatus("Solicité los contactos más recientes.");}}><Icon name="reset" size={18}/>Actualizar</button>}</section>
      {mode==="demo"&&<section className="crm-demo-panel" aria-label="Demostración por industria"><div className="crm-demo-intro"><span className="crm-demo-icon"><Icon name="spark"/></span><div><strong>Mira cómo trabaja Brain.</strong><p>Del primer mensaje al seguimiento, paso a paso.</p></div><div className="crm-sector-switch" role="group" aria-label="Industria del demo">{(["optica","dealer"] as const).map(s=><button key={s} type="button" aria-pressed={sector===s} className={sector===s?"selected":""} onClick={()=>changeSector(s)}>{SECTORS[s].label}</button>)}</div></div><div className="crm-flow">{flowLabels.map((label,i)=><div key={label} className={flow>i?"done":""}><span>{flow>i?<Icon name="check" size={14}/>:i+1}</span>{label}</div>)}</div><div className="crm-demo-actions"><button type="button" className="crm-btn crm-btn-blue" disabled={flow===5} onClick={advanceDemo}><Icon name={flow===5?"check":"arrow"} size={18}/>{flow===5?"Flujo completado":buttonLabels[flow]}</button><button type="button" className="crm-text-btn" onClick={reset}><Icon name="reset" size={16}/>Reiniciar demo</button><small>No envía mensajes, no reserva citas ni aprueba financiamiento.</small></div></section>}
      <section className="crm-stats" aria-label="Resumen"><button type="button" className={view==="inicio"?"chosen":""} onClick={()=>{setView("inicio");setSelectedId(null);}}><span className="crm-stat-icon blue"><Icon name="chat"/></span><div><span>Necesitan atención</span><strong>{attention.length}</strong></div><Icon name="arrow" size={18}/></button><button type="button" className={view==="seguimientos"?"chosen":""} onClick={()=>{setView("seguimientos");setSelectedId(null);}}><span className="crm-stat-icon amber"><Icon name="clock"/></span><div><span>Seguimientos pendientes</span><strong>{followups.length}</strong></div><Icon name="arrow" size={18}/></button><button type="button" className={view==="clientes"?"chosen":""} onClick={()=>{setView("clientes");setSelectedId(null);}}><span className="crm-stat-icon violet"><Icon name="users"/></span><div><span>Contactos organizados</span><strong>{contacts.length}</strong></div><Icon name="arrow" size={18}/></button></section>
      <div className="crm-notice" role="status" aria-live="polite">{status}</div>
      <section className={`crm-content ${selected?"has-selected":""}`}>
        <div className="crm-inbox"><div className="crm-inbox-heading"><h2>{view==="inicio"?"Por atender":view==="clientes"?"Tus contactos":"Por contactar"}</h2><span>{visible.length}</span></div><label className="crm-search"><Icon name="search" size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar nombre, teléfono o consulta" aria-label="Buscar contactos"/></label><div className="crm-filters" role="group" aria-label="Filtrar contactos">{[{id:"todos",label:"Todos"},{id:"whatsapp",label:"WhatsApp"},{id:"nuevos",label:"Nuevos"}].map(f=><button key={f.id} type="button" className={filter===f.id?"selected":""} aria-pressed={filter===f.id} onClick={()=>setFilter(f.id)}>{f.label}</button>)}</div><div className="crm-contact-list">{visible.length===0?<div className="crm-empty"><Icon name="check" size={28}/><strong>{search?"No encontramos ese contacto":"Todo al día en esta vista"}</strong><p>{search?"Prueba con otro nombre o teléfono.":"Abre Clientes para ver el resto de tu historial."}</p><button className="crm-text-btn" type="button" onClick={()=>{setView("clientes");setSearch("");setFilter("todos");}}>Ver todos los contactos<Icon name="arrow" size={16}/></button></div>:visible.map(c=><button type="button" className={`crm-contact ${selectedId===c.id?"selected":""}`} key={c.id} onClick={()=>choose(c.id)}><div className="crm-contact-top"><span className="crm-avatar">{c.name.split(" ").slice(0,2).map(n=>n[0]).join("")}</span><div><strong>{c.name}</strong><span>{c.channel} · {c.company||"Contacto de AxiomAI"}</span></div>{c.unread>0&&<b className="crm-unread">{c.unread}</b>}</div><p>{c.request}</p><div className="crm-contact-bottom"><span className={`crm-stage ${c.stage==="Nuevo"?"new":""}`}>{c.stage}</span><small>{c.followUpAt?dateLabel(c.followUpAt):"Sin seguimiento programado"}</small></div></button>)}</div><p className="crm-list-foot">{mode==="demo"?"Personas y conversaciones ficticias.":"Vista de los últimos 200 contactos. El CRM actual conserva el historial completo."}</p></div>
        <div className="crm-detail" key={selected?.id||"empty"}>{selected?<><button type="button" className="crm-text-btn crm-mobile-back" onClick={()=>{setSelectedId(null);setEditing(false);}}>← Volver a la lista</button><div className="crm-detail-head"><span className="crm-avatar large">{selected.name.split(" ").slice(0,2).map(n=>n[0]).join("")}</span><div><p className="crm-eyebrow">{selected.channel} · {selected.stage}</p><h2>{selected.name}</h2><p>{selected.company||"Contacto de AxiomAI"}{selected.phone?` · ${selected.phone}`:""}</p></div><button type="button" className="crm-icon-btn" aria-label="Cerrar contacto" onClick={()=>{setSelectedId(null);setEditing(false);}}><Icon name="close"/></button></div><section className="crm-brain-card"><div><Icon name="spark" size={20}/><span>PRÓXIMO PASO</span><b>{mode==="demo"?"Simulado":"Sugerido"}</b></div><h3>{selected.nextAction}</h3><p>{selected.assignee?`Responsable: ${selected.assignee}`:"Todavía no tiene responsable."}{selected.followUpAt?` · ${dateLabel(selected.followUpAt)}`:""}</p><button type="button" className="crm-btn crm-btn-blue" onClick={()=>setEditing(value=>!value)}><Icon name="clock" size={17}/>{editing?"Cerrar edición":"Organizar seguimiento"}</button></section>
          {editing&&<form onSubmit={save} className="crm-edit-form"><h3>Deja claro el próximo paso</h3><input name="id" type="hidden" value={selected.id}/><div className="crm-form-grid"><label>Estado<select name="stage" defaultValue={selected.stage}>{STAGES.map(s=><option key={s}>{s}</option>)}</select></label><label>Responsable<input name="assignee" defaultValue={selected.assignee} placeholder="Nombre del responsable"/></label></div><label>Próximo contacto · hora de Puerto Rico<input type="datetime-local" name="followUpAt" defaultValue={inputDate(selected.followUpAt)}/></label><label>Añadir una nota<textarea name="note" placeholder="Qué acordaron y qué falta por hacer" rows={3}/></label><label className="crm-checkbox"><input name="reviewed" type="checkbox" value="true" defaultChecked={false}/>Ya revisé los mensajes y llamadas de este contacto</label><p className="crm-form-help">{mode==="demo"?"Este cambio solo afecta la demostración.":"Al guardar, se actualiza el contacto en tu CRM. No envía mensajes ni realiza llamadas."}</p><div className="crm-edit-actions"><button type="submit" className="crm-btn crm-btn-blue" disabled={saving}>{saving?"Guardando…":"Guardar seguimiento"}</button><button type="button" className="crm-text-btn" onClick={()=>setEditing(false)}>Cancelar</button></div></form>}
          <div className="crm-detail-tabs"><h3>Conversación e historial</h3><span>{selected.messages.length} registros recientes</span></div><div className="crm-conversation">{selected.messages.length===0?<p className="crm-muted">Este contacto todavía no tiene mensajes o llamadas en el historial.</p>:[...selected.messages].reverse().map(m=><article className={`crm-message ${m.incoming?"incoming":"outgoing"}`} key={m.id}><span>{m.channel} · {m.incoming?selected.name:"Brain"}</span><p>{m.text}</p><small>{dateLabel(m.at)}</small></article>)}</div><details className="crm-notes"><summary>Ver notas del contacto</summary><p>{selected.notes||"Sin notas adicionales."}</p></details>{selected.phone&&<a href={`tel:${selected.phone.replace(/[^+\d]/g,"")}`} className="crm-text-btn">Llamar desde este dispositivo<Icon name="arrow" size={16}/></a>}</>:<div className="crm-welcome-card"><div className="crm-welcome-art"><span/><Icon name="spark" size={42}/><span/></div><p className="crm-eyebrow">MENOS RUIDO. MÁS CLARIDAD.</p><h2>Una conversación.<br/>Un próximo paso.</h2><p>Selecciona un contacto para ver qué necesita, revisar su historial y organizar el seguimiento.</p><div><Icon name="chat" size={19}/>Revisa la consulta</div><div><Icon name="users" size={19}/>Asigna un responsable</div><div><Icon name="clock" size={19}/>Programa el próximo contacto</div>{mode==="demo"&&<button className="crm-btn crm-btn-blue" type="button" onClick={()=>{if(flow===5)reset();else advanceDemo();}}>{flow===5?"Reiniciar el recorrido":"Verlo en acción"}<Icon name="arrow" size={17}/></button>}</div>}</div>
      </section>
      <footer className="crm-footer"><span>AxiomAI Solutions · Brain</span><span>{mode==="demo"?"Demo interactivo privado · sin conexiones reales":"Vista simple · mensajes y llamadas en un solo lugar"}</span></footer>
    </div>
  </main>;
}
