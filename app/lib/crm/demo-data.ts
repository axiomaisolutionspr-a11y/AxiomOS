import { Contact, Sector } from "./model";
export const SECTORS = {
  optica: { label:"Óptica", company:"Óptica de demostración", service:"Citas y seguimiento", client:"Elena Rivera", request:"Necesito una cita para examen de la vista. ¿Aceptan mi plan?", reply:"Con gusto. ¿Qué plan tienes y qué día prefieres? El equipo debe confirmar cubierta y disponibilidad.", answer:"Tengo un plan privado y prefiero el martes en la mañana.", action:"Verificar el plan y confirmar un horario disponible.", assignee:"Recepción" },
  dealer: { label:"Dealer", company:"Dealer de demostración", service:"Prospectos y ventas", client:"Gabriel Torres", request:"Busco una SUV y quiero información de financiamiento.", reply:"Claro. ¿Qué vehículo te interesa, cuál es tu presupuesto aproximado y cuándo piensas comprar?", answer:"Me interesa una SUV compacta. Presupuesto por definir; quiero comprar este mes.", action:"Verificar inventario y conectar con un vendedor para evaluar opciones.", assignee:"Alex" },
} as const;
export function demoContacts(sector: Sector): Contact[] {
  const now = Date.now();
  const scenario = SECTORS[sector];
  const base = (id:string, name:string, request:string, stage:Contact["stage"], unread:number, offset:number): Contact => ({
    id, name, company:scenario.company, phone:"", stage, unread, assignee:scenario.assignee,
    followUpAt: offset ? new Date(now + offset * 3600000).toISOString() : null,
    lastSeenAt:new Date(now - 1800000).toISOString(), notes:"Datos ficticios para demostración. No se envían mensajes ni se reservan citas.", request,
    nextAction: sector === "optica" ? "Confirmar disponibilidad con recepción." : "Contactar y revisar las opciones con el vendedor.", channel:"WhatsApp",
    messages:[{id:`${id}-message`,text:request,at:new Date(now-1800000).toISOString(),incoming:true,channel:"WhatsApp"}],
  });
  return sector === "optica" ? [
    base("o1","Sofía Méndez","Quisiera coordinar un examen de la vista.","Nuevo",1,0),
    base("o2","Carlos Vega","¿Ya llegaron mis espejuelos?","Seguimiento",1,-2),
    base("o3","Ana López","Pendiente confirmar el horario de mi visita.","Interesado",0,2),
    base("o4","Luis Santiago","Recibí la cotización de mis lentes.","Cotización enviada",0,24),
  ] : [
    base("d1","Mariana Ortiz","Estoy buscando una SUV para mi familia.","Nuevo",1,0),
    base("d2","Diego Ramos","Me gustaría conocer los requisitos para financiamiento.","Seguimiento",1,-2),
    base("d3","Valeria Cruz","Quiero hacer una prueba de manejo.","Interesado",0,2),
    base("d4","Andrés Rivera","Estoy revisando la cotización del vehículo.","Cotización enviada",0,24),
  ];
}
