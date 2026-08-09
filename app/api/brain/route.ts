import { NextResponse } from "next/server";

export async function POST(request: Request) {
try {
const { message } = await request.json();

if (!message || !message.trim()) {
return NextResponse.json(
{ error: "Escribe qué necesita tu negocio." },
{ status: 400 }
);
}

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
return NextResponse.json(
{ error: "La clave de OpenAI no está configurada." },
{ status: 500 }
);
}

const response = await fetch("https://api.openai.com/v1/responses", {
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${apiKey}`,
},
body: JSON.stringify({
model: "gpt-5.4-nano",
input: [
{
role: "developer",
content:
"Eres Brain, el asistente de AxiomAI Solutions. Analiza necesidades de negocios y recomienda soluciones prácticas de automatización, inteligencia artificial y software. Responde siempre en español claro. No inventes capacidades ni prometas resultados garantizados. Organiza la respuesta en: Diagnóstico, Solución recomendada y Próximo paso. Mantén la respuesta concisa y útil.",
},
{
role: "user",
content: message,
},
],
max_output_tokens: 500,
}),
});

const data = await response.json();

if (!response.ok) {
console.error("OpenAI API error:", data);

return NextResponse.json(
{
error:
data?.error?.message ||
"OpenAI no pudo completar el análisis.",
},
{ status: response.status }
);
}

const result =
data.output_text ||
data.output
?.flatMap((item: any) => item.content || [])
?.map((item: any) => item.text || "")
?.join("\n")
?.trim();

if (!result) {
return NextResponse.json(
{ error: "Brain no recibió una respuesta válida de OpenAI." },
{ status: 500 }
);
}

return NextResponse.json({ result });
} catch (error) {
console.error("Brain error:", error);

return NextResponse.json(
{ error: "No se pudo procesar la solicitud con Brain." },
{ status: 500 }
);
}
}