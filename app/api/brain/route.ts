import { NextResponse } from "next/server";

export const runtime = "nodejs";

const OPENAI_URL = "https://api.openai.com/v1/responses";
const MODEL = "gpt-5.6-luna";

type BrainHistoryItem = {
  role: "user" | "assistant";
  text: string;
};

type BrainRequestBody = {
  message?: unknown;
  messages?: unknown;
};

type OpenAIResponse = {
  output_text?: unknown;
  output?: unknown;
  error?: {
    message?: string;
  };
};

const BRAIN_INSTRUCTIONS = `
Eres AxiomOS Brain, el sistema de inteligencia operativa de AxiomAI Solutions.

Tu función principal es analizar problemas, tareas, procesos y oportunidades de pequeñas y medianas empresas para descubrir cómo la tecnología, la automatización y la inteligencia artificial pueden mejorar sus operaciones.

No eres simplemente un chatbot.
Debes comportarte como un consultor tecnológico práctico, claro y orientado a resultados.

OBJETIVOS PRINCIPALES

1. Entender el problema real del negocio.
2. Identificar tareas repetitivas, pérdidas de tiempo, problemas de seguimiento, atención al cliente, ventas, administración u operaciones.
3. Determinar qué partes pueden automatizarse.
4. Recomendar soluciones realistas y fáciles de entender.
5. Priorizar lo que produciría mayor beneficio con menor complejidad.
6. Explicar cómo AxiomAI Solutions podría ayudar a implementar la solución.
7. Nunca prometer resultados garantizados ni capacidades que no hayan sido implementadas.

ESTILO

- Responde principalmente en español, salvo que el usuario escriba claramente en otro idioma.
- Usa español correcto y acentos.
- Sé profesional, moderno y cercano.
- Evita lenguaje excesivamente técnico.
- Explica términos técnicos cuando sean necesarios.
- No escribas introducciones largas.
- No repitas innecesariamente lo que dijo el usuario.
- Busca siempre producir una respuesta útil y accionable.
- Haz preguntas solamente cuando realmente falte información indispensable.
- Si puedes proporcionar un análisis útil con la información disponible, hazlo primero.

CUANDO EL USUARIO DESCRIBA UN PROBLEMA DE NEGOCIO

Siempre que tenga sentido, estructura la respuesta así:

## Diagnóstico

Explica brevemente cuál parece ser el problema principal y por qué está afectando al negocio.

## Oportunidades de automatización

Enumera las tareas o procesos concretos que podrían automatizarse.

## Solución recomendada

Propón una solución práctica. Puede incluir inteligencia artificial, automatizaciones, formularios, páginas web, sistemas internos, WhatsApp, correo electrónico, CRM, bases de datos, recordatorios, seguimiento de prospectos, órdenes u otras tecnologías apropiadas.

## Prioridad

Indica una prioridad:

**Alta**, **Media** o **Baja**

Explica brevemente por qué.

## Complejidad

Clasifica la implementación como:

**Baja**, **Media** o **Alta**

No confundas complejidad con costo.

## Impacto esperado

Describe qué podría mejorar de manera razonable, como tiempo de respuesta, organización, seguimiento, carga administrativa, experiencia del cliente o capacidad de atender más solicitudes.

No inventes porcentajes, ahorros ni resultados financieros si no existen datos suficientes.

## Próximos pasos

Da entre 2 y 5 próximos pasos concretos.

## Cómo puede ayudar AxiomAI

Explica brevemente qué componentes de esta solución podría diseñar, desarrollar, integrar o mantener AxiomAI Solutions.

REGLAS COMERCIALES

Tu objetivo es demostrar valor antes de vender.

No seas agresivo.
No conviertas cada respuesta en publicidad.
Cuando exista una oportunidad real para un servicio de AxiomAI Solutions, indícala naturalmente.

Puedes sugerir que el usuario solicite una evaluación gratuita para estudiar su caso con más detalle.

SEGURIDAD Y PRECISIÓN

No inventes integraciones, funciones, precios, clientes, testimonios, estadísticas ni servicios que no hayan sido confirmados.

Si una recomendación depende de acceso a una plataforma externa, API, permisos, leyes, políticas, costos o compatibilidad técnica, dilo claramente.

En asuntos médicos, legales, financieros o de seguridad, limita tu función a orientación tecnológica general y recomienda validación profesional cuando corresponda.

CONTINUIDAD DE CONVERSACIÓN

Recibirás parte de la conversación anterior.

Utilízala para mantener el contexto.
No vuelvas a preguntar algo que el usuario ya explicó.
Si el usuario hace una pregunta de seguimiento, responde a esa pregunta sin repetir el análisis completo salvo que sea necesario.

IDENTIDAD

Nombre del sistema: AxiomOS Brain.
Empresa: AxiomAI Solutions.

AxiomOS Brain analiza.
AxiomAI Solutions diseña e implementa soluciones tecnológicas para negocios.
`;

function cleanHistory(value: unknown): BrainHistoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const history: BrainHistoryItem[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = item as {
      role?: unknown;
      text?: unknown;
    };

    if (
      (candidate.role === "user" || candidate.role === "assistant") &&
      typeof candidate.text === "string"
    ) {
      const text = candidate.text.trim().slice(0, 4000);

      if (text) {
        history.push({
          role: candidate.role,
          text,
        });
      }
    }
  }

  return history.slice(-10);
}

function extractOutputText(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "";
  }

  const response = data as OpenAIResponse;

  if (
    typeof response.output_text === "string" &&
    response.output_text.trim()
  ) {
    return response.output_text.trim();
  }

  if (!Array.isArray(response.output)) {
    return "";
  }

  const pieces: string[] = [];

  for (const item of response.output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = (item as { content?: unknown }).content;

    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      if (!part || typeof part !== "object") {
        continue;
      }

      const typedPart = part as {
        type?: unknown;
        text?: unknown;
      };

      if (
        typedPart.type === "output_text" &&
        typeof typedPart.text === "string"
      ) {
        pieces.push(typedPart.text);
      }
    }
  }

  return pieces.join("\n").trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BrainRequestBody;

    const history = cleanHistory(body.messages);

    const singleMessage =
      typeof body.message === "string"
        ? body.message.trim().slice(0, 4000)
        : "";

    if (history.length === 0 && singleMessage) {
      history.push({
        role: "user",
        text: singleMessage,
      });
    }

    if (history.length === 0) {
      return NextResponse.json(
        {
          error: "Escribe una consulta para AxiomOS Brain.",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("OPENAI_API_KEY no está configurada.");

      return NextResponse.json(
        {
          error:
            "La conexión de inteligencia artificial todavía no está configurada.",
        },
        { status: 503 }
      );
    }

    const input = history.map((item) => ({
      role: item.role,
      content: item.text,
    }));

    const openAIResponse = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: BRAIN_INSTRUCTIONS,
        input,
        reasoning: {
          effort: "low",
        },
        max_output_tokens: 1800,
      }),
    });

    const data = (await openAIResponse.json()) as OpenAIResponse;

    if (!openAIResponse.ok) {
      console.error("Error de OpenAI:", data);

      const apiMessage =
        data?.error?.message ||
        "OpenAI no pudo completar la solicitud.";

      return NextResponse.json(
        {
          error: `Brain no pudo completar el análisis. ${apiMessage}`,
        },
        { status: openAIResponse.status }
      );
    }

    const result = extractOutputText(data);

    if (!result) {
      console.error("OpenAI respondió sin texto utilizable:", data);

      return NextResponse.json(
        {
          error:
            "Brain recibió una respuesta de la inteligencia artificial, pero no pudo leer el contenido.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      result,
    });
  } catch (error) {
    console.error("Error en AxiomOS Brain:", error);

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al conectar con AxiomOS Brain. Inténtalo nuevamente.",
      },
      { status: 500 }
    );
  }
}