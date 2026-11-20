// DEMO comercial: solo datos ficticios. Teléfonos permitidos: 787-555-0100 a 787-555-0199. Correos: ninguno.
const phone = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
const email = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const fictitious = /^(?:\+?1[\s.-]?)?\(?787\)?[\s.-]?555[\s.-]?01\d{2}$/;

export function hasRealContactData(text: string): boolean {
  if (email.test(text)) return true;
  return (text.match(phone) ?? []).some(p => !fictitious.test(p.trim()));
}
