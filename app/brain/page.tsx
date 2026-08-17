"use client";

import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type ConversationMessage = {
  role: "user" | "assistant";
  text: string;
};

type BrainResponse = {
  result?: string;
  error?: string;
};

type BrainCase = {
  source: "AxiomOS Brain";
  query: string;
  analysis: string;
  profile: BusinessProfile;
  conversation: ConversationMessage[];
  createdAt: string;
};

type SavedBrainSession = {
  version: 1;
  conversation: ConversationMessage[];
  result: string;
  savedAt: string;
};

const BRAIN_SESSION_STORAGE_KEY = "axiomai_brain_session_v1";

function readSavedBrainSession(): SavedBrainSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(BRAIN_SESSION_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<SavedBrainSession>;

    const restoredConversation = Array.isArray(parsed.conversation)
      ? parsed.conversation.filter(
          (item): item is ConversationMessage =>
            Boolean(
              item &&
                (item.role === "user" || item.role === "assistant") &&
                typeof item.text === "string"
            )
        )
      : [];

    if (restoredConversation.length === 0) {
      return null;
    }

    const restoredResult =
      typeof parsed.result === "string" && parsed.result.trim()
        ? parsed.result
        : [...restoredConversation]
            .reverse()
            .find((item) => item.role === "assistant")?.text || "";

    return {
      version: 1,
      conversation: restoredConversation,
      result: restoredResult,
      savedAt:
        typeof parsed.savedAt === "string"
          ? parsed.savedAt
          : new Date().toISOString(),
    };
  } catch (storageError) {
    console.error(
      "No se pudo leer la conversación guardada de Brain:",
      storageError
    );
    return null;
  }
}

function persistBrainSession(
  conversation: ConversationMessage[],
  result: string
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (conversation.length === 0 && !result) {
      window.localStorage.removeItem(BRAIN_SESSION_STORAGE_KEY);
      return;
    }

    const savedSession: SavedBrainSession = {
      version: 1,
      conversation: conversation.map((item) => ({
        role: item.role,
        text: item.text,
      })),
      result,
      savedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(
      BRAIN_SESSION_STORAGE_KEY,
      JSON.stringify(savedSession)
    );
  } catch (storageError) {
    console.error(
      "No se pudo guardar la conversación de Brain:",
      storageError
    );
  }
}


type BusinessProfile = {
  businessType: string;
  focus: string;
  priority: string;
  complexity: string;
  channels: string[];
  summary: string;
  confirmedCount: number;
  assessmentCount: number;
  interactionCount: number;
};

const businessTypePatterns = [
  { pattern: /dealer|concesionario|venta de autos|vehículos/i, label: "Dealer de autos" },
  { pattern: /barber[ií]a|barbero/i, label: "Barbería" },
  { pattern: /sal[oó]n de belleza|estilista|peluquer/i, label: "Salón de belleza" },
  { pattern: /restaurante|cafeter[ií]a|food truck/i, label: "Restaurante / alimentos" },
  { pattern: /panader[ií]a|bakery|reposter[ií]a|pasteler[ií]a/i, label: "Panadería / repostería" },
  { pattern: /cuidado(?:s)? de (?:adultos mayores|personas mayores|envejecientes)|cuidador(?:es)?|home care|senior care|asistencia domiciliaria|hogar de (?:ancianos|envejecientes)/i, label: "Cuidado de adultos mayores" },
  { pattern: /dentista|dental|odontolog/i, label: "Oficina dental" },
  { pattern: /cl[ií]nica|consultorio|m[eé]dic[oa]/i, label: "Servicios de salud" },
  { pattern: /taller|mec[aá]nic[oa]|reparaci[oó]n de autos/i, label: "Taller automotriz" },
  { pattern: /construcci[oó]n|contratista|maquinaria pesada|excavaci[oó]n|movimiento de tierra|demolici[oó]n/i, label: "Construcción / maquinaria pesada" },
  { pattern: /plomer[ií]a|plomero/i, label: "Plomería" },
  { pattern: /electricista|servicios el[eé]ctricos/i, label: "Servicios eléctricos" },
  { pattern: /jardiner[ií]a|landscap|paisajismo/i, label: "Jardinería / paisajismo" },
  { pattern: /limpieza|cleaning service|mantenimiento de propiedades/i, label: "Limpieza / mantenimiento" },
  { pattern: /transport|camiones|acarreo|log[ií]stica/i, label: "Transporte / logística" },
  { pattern: /inmobiliaria|bienes ra[ií]ces|real estate|realtor/i, label: "Bienes raíces" },
  { pattern: /tienda|retail|comercio/i, label: "Comercio" },
  { pattern: /gimnasio|gym|entrenamiento/i, label: "Gimnasio / fitness" },
  { pattern: /hotel|hospedaje|airbnb|alojamiento/i, label: "Hospitalidad" },
  { pattern: /abogad|bufete|legal/i, label: "Servicios profesionales" },
];

function normalizeBusinessTypeLabel(value: string) {
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/^(?:la|el|los|las)\s+/i, "")
    .trim();

  if (!cleaned) {
    return "Por identificar";
  }

  const limited =
    cleaned.length > 72
      ? `${cleaned.slice(0, 69).trimEnd()}...`
      : cleaned;

  return limited.charAt(0).toUpperCase() + limited.slice(1);
}

function detectBusinessType(text: string) {
  const match = businessTypePatterns.find(({ pattern }) => pattern.test(text));

  if (match) {
    return match.label;
  }

  // Respaldo para negocios que no estén en la lista. Si el cliente describe
  // explícitamente su empresa, usamos únicamente sus propias palabras en vez
  // de inventar una categoría a partir de la respuesta de Brain.
  const explicitBusinessPatterns = [
    /(?:tengo|manejo|opero|dirijo|somos)\s+(?:una?|el|la)?\s*(?:compañ[ií]a|empresa|negocio)\s+(?:de|dedicad[oa]\s+a)\s+([^\n.!?]{3,90})/i,
    /mi\s+(?:compañ[ií]a|empresa|negocio)\s+(?:es|se\s+dedica)\s+(?:a|al|a\s+la|de)?\s*([^\n.!?]{3,90})/i,
  ];

  for (const pattern of explicitBusinessPatterns) {
    const explicitMatch = text.match(pattern);

    if (explicitMatch?.[1]) {
      return normalizeBusinessTypeLabel(explicitMatch[1]);
    }
  }

  return "Por identificar";
}

function detectFocus(text: string) {
  if (/conseguir\s+(?:m[aá]s\s+)?clientes|captar\s+(?:m[aá]s\s+)?clientes|atraer\s+(?:m[aá]s\s+)?clientes|prospect|ventas|cotizaci[oó]n|lead/i.test(text)) {
    return "Captación y ventas";
  }

  if (/cita|reserva|agenda|calendario/i.test(text)) {
    return "Atención y citas";
  }

  if (/inventario|veh[ií]culo|producto disponible/i.test(text)) {
    return "Inventario y seguimiento";
  }

  if (/whatsapp|mensaje|llamada|atenci[oó]n al cliente|responder consultas/i.test(text)) {
    return "Atención al cliente";
  }

  if (/orden|solicitud|pedido/i.test(text)) {
    return "Órdenes y solicitudes";
  }

  if (/document|reporte|administr|hoja de c[aá]lculo/i.test(text)) {
    return "Operación administrativa";
  }

  return "Por identificar";
}

function detectChannels(text: string) {
  const channelPatterns = [
    { pattern: /whatsapp/i, label: "WhatsApp" },
    { pattern: /llamada|llamadas|llamar|llaman|llamamos/i, label: "Llamadas" },
    { pattern: /instagram/i, label: "Instagram" },
    { pattern: /facebook/i, label: "Facebook" },
    { pattern: /p[aá]gina web|sitio web|web/i, label: "Página web" },
    { pattern: /correo|email|e-mail/i, label: "Correo" },
    { pattern: /formulario/i, label: "Formularios" },
    { pattern: /google calendar|outlook|calendly|calendario/i, label: "Calendario" },
  ];

  const detected = channelPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => label);

  if (/redes sociales/i.test(text) && !detected.some((label) => label === "Instagram" || label === "Facebook")) {
    detected.push("Redes sociales");
  }

  return detected.slice(0, 6);
}

function extractLevel(text: string, label: "Prioridad" | "Complejidad") {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(
    new RegExp(`${escapedLabel}\\s*:\\s*([^\\n]+)`, "i")
  );

  if (!match) {
    return "Por definir";
  }

  const cleaned = cleanMarkdownEscapes(match[1])
    .replace(/^[-•]\s*/, "")
    .trim();

  const level = cleaned.match(/^(Alta|Media|Baja|Media a alta|Media a baja)/i);

  if (!level) {
    return "Por definir";
  }

  return level[1]
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function extractDiagnosticSummary(text: string) {
  const lines = cleanMarkdownEscapes(text).split("\n");
  const diagnosticIndex = lines.findIndex((line) =>
    /^#{0,3}\s*Diagn[oó]stico\s*:?\s*$/i.test(line.trim())
  );

  // Si esta respuesta no incluye una sección de Diagnóstico, devolvemos vacío.
  // buildBusinessProfile buscará el último diagnóstico útil de la conversación.
  if (diagnosticIndex === -1) {
    return "";
  }

  const parts: string[] = [];

  for (let index = diagnosticIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (!line) {
      if (parts.length > 0) break;
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) break;

    parts.push(stripFormatting(line));

    if (parts.join(" ").length > 240) break;
  }

  const summary = parts.join(" ").trim();

  if (!summary) {
    return "";
  }

  return summary.length > 260
    ? `${summary.slice(0, 257).trimEnd()}...`
    : summary;
}

function buildBusinessProfile(
  conversation: ConversationMessage[],
  result: string
): BusinessProfile {
  const userMessages = conversation.filter((item) => item.role === "user");
  const userText = userMessages
    .map((item) => item.text)
    .join("\n");

  // Datos del negocio: solo se toman de lo que el cliente realmente ha dicho.
  // Así evitamos convertir recomendaciones de Brain en hechos confirmados.
  const businessType = detectBusinessType(userText);
  const focus = detectFocus(userText);
  const channels = detectChannels(userText);

  // Prioridad y complejidad sí son evaluaciones de Brain sobre el caso actual.
  const priority = extractLevel(result, "Prioridad");
  const complexity = extractLevel(result, "Complejidad");
  const currentSummary = extractDiagnosticSummary(result);
  const previousSummary = [...conversation]
    .reverse()
    .filter((item) => item.role === "assistant")
    .map((item) => extractDiagnosticSummary(item.text))
    .find((item) => item.length > 0);

  const summary =
    currentSummary ||
    previousSummary ||
    "Brain seguirá refinando este perfil a medida que avance la conversación.";

  const confirmedCount = [
    businessType !== "Por identificar",
    focus !== "Por identificar",
    channels.length > 0,
  ].filter(Boolean).length;

  const assessmentCount = [
    priority !== "Por definir",
    complexity !== "Por definir",
  ].filter(Boolean).length;

  return {
    businessType,
    focus,
    priority,
    complexity,
    channels,
    summary,
    confirmedCount,
    assessmentCount,
    interactionCount: userMessages.length,
  };
}

function getProfileNextQuestion(profile: BusinessProfile) {
  if (profile.businessType === "Por identificar") {
    return {
      label: "Tipo de negocio",
      question: "¿Qué tipo de negocio tienes y qué servicios o productos ofreces?",
    };
  }

  if (profile.focus === "Por identificar") {
    return {
      label: "Objetivo principal",
      question: "¿Cuál es el problema principal que quieres resolver o qué resultado quieres mejorar?",
    };
  }

  if (profile.channels.length === 0) {
    return {
      label: "Canales actuales",
      question: "¿Por qué canales te contactan hoy tus clientes: llamadas, WhatsApp, redes sociales, página web u otros?",
    };
  }

  return null;
}

const quickPrompts = [
  "¿Qué tareas de mi negocio puedo automatizar?",
  "Ayúdame a mejorar la atención a mis clientes.",
  "¿Cómo puedo usar IA para conseguir más prospectos?",
];

const followUpPrompts = [
  "Convierte esta recomendación en un plan de implementación por fases.",
  "¿Qué información y herramientas necesitaría para implementar esta solución?",
  "¿Qué automatización debería implementar primero y por qué?",
];

function cleanMarkdownEscapes(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/\\([\\`*_[\]{}()#+.!>\-])/g, "$1")
    .replace(/\\+\./g, ".")
    .replace(/\\+([:;!?])/g, "$1")
    .replace(/^(\s*)\*\s+/gm, "$1- ")
    .replace(/^(\s*)\+\s+/gm, "$1- ")
    .replace(/\*/g, "")
    .replace(/[ \t]+\n/g, "\n");
}

function stripFormatting(text: string) {
  return cleanMarkdownEscapes(text)
    .replace(/^[-•]\s*/, "")
    .replace(/^#{1,3}\s*/, "")
    .trim();
}

function cleanListItemText(text: string) {
  return cleanMarkdownEscapes(text)
    .trim()
    .replace(/[.;]+$/g, "")
    .trim();
}

function prepareBrainLines(text: string) {
  const rawLines = cleanMarkdownEscapes(text).split("\n");
  const merged: string[] = [];

  for (let index = 0; index < rawLines.length; index += 1) {
    const current = rawLines[index].trim();

    const standaloneNumber = current.match(/^(\d+)[.)]?$/);

    if (standaloneNumber) {
      let nextIndex = index + 1;

      while (
        nextIndex < rawLines.length &&
        !rawLines[nextIndex].trim()
      ) {
        nextIndex += 1;
      }

      if (nextIndex < rawLines.length) {
        const nextText = rawLines[nextIndex]
          .trim()
          .replace(/^[-•]\s*/, "");

        if (nextText) {
          merged.push(`${standaloneNumber[1]}. ${nextText}`);
          index = nextIndex;
          continue;
        }
      }
    }

    merged.push(rawLines[index]);
  }

  return merged;
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const cleaned = cleanMarkdownEscapes(text);

  return cleaned.split(/(\*\*.*?\*\*)/g).map((part, index) => {
    const normalized = part.replace(/\*/g, "");

    if (!normalized) {
      return null;
    }

    return (
      <span key={`${normalized}-${index}`}>
        {normalized}
      </span>
    );
  });
}

function BrainText({ text }: { text: string }) {
  const lines = prepareBrainLines(text);

  const sectionNames = [
    "Diagnóstico",
    "Automatización prioritaria",
    "Oportunidades de automatización",
    "Solución recomendada",
    "Prioridad y complejidad",
    "Prioridad",
    "Complejidad",
    "Impacto esperado",
    "Implementación sugerida",
    "Próximos pasos",
    "Cómo puede ayudar AxiomAI",
  ];

  return (
    <div
      style={{
        display: "grid",
        gap: "10px",
      }}
    >
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return (
            <div
              key={`space-${index}`}
              style={{ height: "3px" }}
            />
          );
        }

        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={`h4-${index}`}
              style={{
                margin: "14px 0 2px",
                color: "#ffffff",
                fontSize: "17px",
                lineHeight: 1.4,
                fontWeight: 850,
              }}
            >
              {renderInlineMarkdown(trimmed.slice(4))}
            </h4>
          );
        }

        if (
          trimmed.startsWith("## ") ||
          trimmed.startsWith("# ")
        ) {
          const content = trimmed.startsWith("## ")
            ? trimmed.slice(3)
            : trimmed.slice(2);

          return (
            <div
              key={`section-${index}`}
              style={{
                marginTop: "22px",
                paddingTop: "20px",
                borderTop:
                  "1px solid rgba(92, 198, 255, 0.15)",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "#ffffff",
                  fontSize: "21px",
                  lineHeight: 1.35,
                  fontWeight: 900,
                  letterSpacing: "-0.25px",
                }}
              >
                {renderInlineMarkdown(content)}
              </h3>
            </div>
          );
        }

        const plainLine = stripFormatting(trimmed);

        if (
          sectionNames.some(
            (section) =>
              section.toLowerCase() ===
              plainLine.replace(/:$/, "").toLowerCase()
          )
        ) {
          return (
            <div
              key={`label-${index}`}
              style={{
                marginTop: "22px",
                paddingTop: "20px",
                borderTop:
                  "1px solid rgba(92, 198, 255, 0.15)",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "#ffffff",
                  fontSize: "21px",
                  fontWeight: 900,
                  lineHeight: 1.35,
                  letterSpacing: "-0.25px",
                }}
              >
                {plainLine.replace(/:$/, "")}
              </h3>
            </div>
          );
        }

        const phaseMatch = plainLine.match(
          /^(?:Fase\s*|F)(\d+)\s*(?::|[—–-])?\s*(.+)$/i
        );

        if (phaseMatch) {
          return (
            <div
              key={`phase-${index}`}
              className="brain-phase-card"
              style={{
                marginTop: "10px",
                padding: "15px 17px",
                borderRadius: "14px",
                border:
                  "1px solid rgba(83, 183, 255, 0.2)",
                background:
                  "linear-gradient(135deg, rgba(17,67,112,0.28), rgba(6,26,49,0.44))",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span
                style={{
                  flex: "0 0 auto",
                  minWidth: "31px",
                  height: "31px",
                  padding: "0 9px",
                  borderRadius: "999px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#03111e",
                  background:
                    "linear-gradient(135deg, #62dcff, #3b9cff)",
                  fontSize: "12px",
                  fontWeight: 950,
                }}
              >
                F{phaseMatch[1]}
              </span>

              <strong
                style={{
                  color: "#f2fbff",
                  fontSize: "15px",
                }}
              >
                {"\u00A0"}
                {cleanListItemText(phaseMatch[2])}
              </strong>
            </div>
          );
        }

        const priorityMatch = plainLine.match(
          /^(Prioridad|Complejidad):\s*(Alta|Media|Baja)\.?(.*)$/i
        );

        if (priorityMatch) {
          const label = priorityMatch[1];
          const level = priorityMatch[2];
          const extra = priorityMatch[3];

          return (
            <div
              key={`priority-${index}`}
              className="brain-priority-row"
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                flexWrap: "wrap",
                margin: "3px 0",
              }}
            >
              <span
                style={{
                  color: "#91a9bf",
                  fontWeight: 750,
                }}
              >
                {`${label}:\u00A0`}
              </span>

              <span
                style={{
                  padding: "5px 10px",
                  borderRadius: "999px",
                  border:
                    "1px solid rgba(89,205,255,0.28)",
                  background:
                    "rgba(31,119,181,0.2)",
                  color: "#8fe5ff",
                  fontWeight: 900,
                  fontSize: "13px",
                }}
              >
                {level}
              </span>

              {extra.trim() && (
                <span
                  style={{
                    color: "#c6d5e3",
                  }}
                >
                  {renderInlineMarkdown(extra)}
                </span>
              )}
            </div>
          );
        }

        const standaloneLevel = plainLine.match(
          /^(Alta|Media|Baja)\.?$/i
        );

        if (standaloneLevel) {
          return (
            <div
              key={`level-${index}`}
              style={{
                margin: "2px 0",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 12px",
                  borderRadius: "999px",
                  border:
                    "1px solid rgba(89,205,255,0.28)",
                  background:
                    "rgba(31,119,181,0.2)",
                  color: "#8fe5ff",
                  fontWeight: 900,
                  fontSize: "13px",
                }}
              >
                {standaloneLevel[1]}
              </span>
            </div>
          );
        }

        if (trimmed.startsWith(">")) {
          const quote = trimmed.replace(/^>\s?/, "");

          return (
            <div
              key={`quote-${index}`}
              style={{
                margin: "3px 0",
                padding: "13px 16px",
                borderLeft: "3px solid #39c5ff",
                borderRadius: "0 12px 12px 0",
                background:
                  "rgba(23, 99, 158, 0.18)",
                color: "#d7efff",
                lineHeight: 1.65,
              }}
            >
              {renderInlineMarkdown(quote)}
            </div>
          );
        }

        const bulletMatch =
          trimmed.match(/^[-•]\s*(.*)$/);

        if (bulletMatch && bulletMatch[1]) {
          return (
            <div
              key={`bullet-${index}`}
              className="brain-bullet-row"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "20px minmax(0, 1fr)",
                gap: "7px",
                alignItems: "start",
                color: "#d8e4f2",
                lineHeight: 1.66,
                paddingLeft: "2px",
              }}
            >
              <span
                style={{
                  color: "#55c7ff",
                  fontWeight: 950,
                  fontSize: "17px",
                  lineHeight: 1.45,
                }}
              >
                •
              </span>

              <span>
                {renderInlineMarkdown(
                  cleanListItemText(bulletMatch[1])
                )}
              </span>
            </div>
          );
        }

        const numberedMatch =
          trimmed.match(/^(\d+)(?:[.)])?\s*(?=[A-ZÁÉÍÓÚÑ¿])(.*)$/);

        if (numberedMatch) {
          const number = numberedMatch[1];
          const content = numberedMatch[2];

          if (!content) {
            return null;
          }

          return (
            <div
              key={`number-${index}`}
              className="brain-number-row"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "35px minmax(0, 1fr)",
                gap: "7px",
                alignItems: "start",
                color: "#d8e4f2",
                lineHeight: 1.66,
                margin: "2px 0",
              }}
            >
              <span
                style={{
                  width: "27px",
                  height: "27px",
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  color: "#061320",
                  background:
                    "linear-gradient(135deg, #72e2ff, #4da5ff)",
                  fontWeight: 950,
                  fontSize: "12px",
                  marginTop: "1px",
                  boxShadow:
                    "0 0 14px rgba(74,184,255,0.18)",
                }}
              >
                {number}
              </span>

              <span>
                {"\u00A0"}
                {renderInlineMarkdown(cleanListItemText(content))}
              </span>
            </div>
          );
        }

        return (
          <p
            key={`p-${index}`}
            style={{
              margin: 0,
              color: "#d8e4f2",
              lineHeight: 1.72,
              fontSize: "15.5px",
            }}
          >
            {renderInlineMarkdown(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export default function BrainPage() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conversation, setConversation] =
    useState<ConversationMessage[]>([]);
  const [copyStatus, setCopyStatus] = useState("");
  const [storageReady, setStorageReady] = useState(false);

  const inputRef =
    useRef<HTMLTextAreaElement | null>(null);

  const answerRef =
    useRef<HTMLDivElement | null>(null);

  const businessProfile = buildBusinessProfile(
    conversation,
    result
  );

  const profileNextQuestion = getProfileNextQuestion(businessProfile);

  useEffect(() => {
    const savedSession = readSavedBrainSession();

    if (savedSession) {
      setConversation(savedSession.conversation);
      setResult(savedSession.result);
    }

    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    persistBrainSession(conversation, result);
  }, [conversation, result, storageReady]);

  async function askBrain(text?: string) {
    const finalMessage =
      (text ?? message).trim();

    if (!finalMessage || loading) {
      return;
    }

    // Si el usuario acaba de refrescar y React todavía no terminó de
    // restaurar el estado visual, recuperamos el contexto directamente
    // desde localStorage antes de enviar la nueva consulta.
    const savedSession =
      conversation.length === 0 ? readSavedBrainSession() : null;

    const baseConversation =
      conversation.length > 0
        ? conversation
        : savedSession?.conversation || [];

    if (conversation.length === 0 && baseConversation.length > 0) {
      setConversation(baseConversation);
      if (!result && savedSession?.result) {
        setResult(savedSession.result);
      }
    }

    const nextConversation: ConversationMessage[] = [
      ...baseConversation,
      {
        role: "user",
        text: finalMessage,
      },
    ];

    setLoading(true);
    setError("");
    setResult("");
    setCopyStatus("");

    try {
      const response = await fetch(
        "/api/brain",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            messages: nextConversation,
          }),
        }
      );

      const data =
        (await response.json()) as BrainResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "No se pudo completar la consulta."
        );
      }

      const answer =
        data.result ||
        "AxiomOS Brain no devolvió una respuesta.";

      const completedConversation: ConversationMessage[] = [
        ...nextConversation,
        {
          role: "assistant",
          text: answer,
        },
      ];

      setConversation(completedConversation);
      setResult(answer);
      setMessage("");

      // Guardado inmediato: no dependemos únicamente del siguiente ciclo
      // de render antes de que el usuario haga refresh o cierre la pestaña.
      persistBrainSession(completedConversation, answer);

      window.setTimeout(() => {
        answerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 120);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al conectar con AxiomOS Brain."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    void askBrain();
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      void askBrain();
    }
  }

  function startAnotherQuestion() {
    setResult("");
    setError("");
    setMessage("");
    setCopyStatus("");

    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }

  function startNewConversation() {
    if (loading) {
      return;
    }

    const confirmed = window.confirm(
      "¿Quieres iniciar una conversación nueva? Se borrará el contexto guardado de esta conversación."
    );

    if (!confirmed) {
      return;
    }

    setConversation([]);
    setResult("");
    setError("");
    setMessage("");
    setCopyStatus("");

    persistBrainSession([], "");

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }

  async function copyAnalysis() {
    try {
      await navigator.clipboard.writeText(
        prepareBrainLines(result)
          .map((line) => {
            const trimmedLine = line.trim();

            if (/^[-•]\s+/.test(trimmedLine)) {
              return line.replace(/[.;]+\s*$/, "");
            }

            return line;
          })
          .join("\n")
      );

      setCopyStatus("Copiado ✓");

      window.setTimeout(() => {
        setCopyStatus("");
      }, 1800);
    } catch (copyError) {
      console.error(
        "No se pudo copiar el análisis:",
        copyError
      );

      setCopyStatus("No se pudo copiar");
    }
  }

  function implementSolution() {
    const firstUserMessage = conversation.find(
      (item) => item.role === "user"
    );

    const brainCase: BrainCase = {
      source: "AxiomOS Brain",
      query:
        firstUserMessage?.text ||
        "El cliente desea implementar una solución analizada por AxiomOS Brain.",
      analysis: result,
      profile: {
        ...businessProfile,
        channels: [...businessProfile.channels],
      },
      conversation: conversation.map((item) => ({
        role: item.role,
        text: item.text,
      })),
      createdAt: new Date().toISOString(),
    };

    try {
      sessionStorage.setItem(
        "axiomai_brain_case",
        JSON.stringify(brainCase)
      );
    } catch (storageError) {
      console.error(
        "No se pudo guardar temporalmente el análisis de Brain:",
        storageError
      );
    }

  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 50% 0%, #123b72 0%, #071326 32%, #02050a 72%, #000 100%)",
        color: "white",
        fontFamily: "Arial, sans-serif",
        padding: "28px 18px 60px",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @keyframes brainAuraBreath {
          0%, 100% { transform: scale(0.9); opacity: 0.38; filter: blur(10px); }
          50% { transform: scale(1.12); opacity: 0.72; filter: blur(13px); }
        }

        @keyframes brainOrbitClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes brainOrbitCounter {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes brainCoreFloat {
          0%, 100% { transform: translate3d(var(--brain-x, 0px), calc(var(--brain-y, 0px) - 1px), 0) scale(1); }
          50% { transform: translate3d(var(--brain-x, 0px), calc(var(--brain-y, 0px) + 2px), 0) scale(1.035); }
        }

        @keyframes brainLoadingPulse {
          0%, 100% { opacity: 0.58; box-shadow: 0 0 10px rgba(91, 225, 255, 0.28); }
          50% { opacity: 1; box-shadow: 0 0 28px rgba(91, 225, 255, 0.78); }
        }

        @keyframes brainReadyPulse {
          0% { transform: scale(0.9); opacity: 0; }
          45% { transform: scale(1.16); opacity: 0.95; }
          100% { transform: scale(1); opacity: 0.42; }
        }

        @keyframes brainAnswerIn {
          from { opacity: 0; transform: translateY(18px) scale(0.992); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes brainEnergySweep {
          0% { left: -42%; opacity: 0; }
          12% { opacity: 1; }
          78% { opacity: 0.95; }
          100% { left: 108%; opacity: 0; }
        }

        @keyframes brainPanelReadyGlow {
          0% { box-shadow: 0 18px 55px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.03); }
          38% { box-shadow: 0 20px 64px rgba(0,0,0,0.3), 0 0 32px rgba(62, 208, 255, 0.24), inset 0 0 22px rgba(70, 202, 255, 0.055); }
          100% { box-shadow: 0 18px 55px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.03); }
        }

        .brain-orb-shell {
          isolation: isolate;
        }

        .brain-orb-aura {
          position: absolute;
          inset: 17px;
          border-radius: 999px;
          pointer-events: none;
          background: radial-gradient(circle, rgba(67, 213, 255, 0.44), rgba(33, 111, 255, 0.15) 48%, transparent 72%);
          animation: brainAuraBreath 3.6s ease-in-out infinite;
          z-index: 0;
        }

        .brain-orbit-ring {
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
          z-index: 1;
          opacity: 0.62;
        }

        .brain-orbit-ring-one {
          inset: 5px;
          border: 1px solid rgba(110, 230, 255, 0.42);
          border-top-color: rgba(255, 255, 255, 0.94);
          border-right-color: rgba(66, 170, 255, 0.18);
          animation: brainOrbitClockwise 9s linear infinite;
        }

        .brain-orbit-ring-two {
          inset: 13px;
          border: 1px dashed rgba(98, 203, 255, 0.34);
          border-left-color: rgba(129, 241, 255, 0.88);
          animation: brainOrbitCounter 13s linear infinite;
        }

        .brain-orb-button {
          z-index: 2;
          transition: transform 130ms ease-out, box-shadow 220ms ease, border-color 220ms ease;
          will-change: transform;
        }

        .brain-orb-button:hover {
          border-color: rgba(191, 247, 255, 0.96) !important;
          box-shadow: 0 0 44px rgba(42, 190, 255, 0.72), 0 0 92px rgba(21, 104, 255, 0.28), inset 0 0 28px rgba(255,255,255,0.2) !important;
        }

        .brain-orb-sheen {
          position: absolute;
          inset: 8px 15px auto 17px;
          height: 24px;
          border-radius: 999px;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(255,255,255,0.52), rgba(255,255,255,0));
          transform: rotate(-12deg);
          filter: blur(0.3px);
        }

        .brain-orb-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.18;
          background-image:
            linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.13) 1px, transparent 1px);
          background-size: 18px 18px;
          mask-image: radial-gradient(circle, black 32%, transparent 78%);
        }

        .brain-orb-core {
          position: relative;
          z-index: 3;
          display: inline-block;
          transform: translate3d(var(--brain-x, 0px), var(--brain-y, 0px), 0);
          animation: brainCoreFloat 3.2s ease-in-out infinite;
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.32));
          transition: filter 180ms ease;
        }

        .brain-orb-button:hover .brain-orb-core {
          filter: drop-shadow(0 5px 14px rgba(132, 239, 255, 0.42));
        }

        .brain-orb-shell.is-loading .brain-orbit-ring-one {
          animation-duration: 1.2s;
        }

        .brain-orb-shell.is-loading .brain-orbit-ring-two {
          animation-duration: 1.8s;
        }

        .brain-orb-shell.is-loading .brain-orb-aura {
          animation: brainLoadingPulse 1.1s ease-in-out infinite;
        }

        .brain-orb-shell.is-ready .brain-orb-aura {
          animation: brainReadyPulse 850ms ease-out 1, brainAuraBreath 3.6s ease-in-out 850ms infinite;
        }

        .brain-chip,
        .brain-primary-button,
        .brain-utility-button,
        .brain-follow-button,
        .brain-cta-button,
        .brain-secondary-button,
        .brain-phase-card,
        .brain-number-row,
        .brain-priority-row,
        .brain-bullet-row {
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background-color 180ms ease;
        }

        .brain-chip:not(:disabled):hover,
        .brain-follow-button:not(:disabled):hover,
        .brain-utility-button:hover,
        .brain-secondary-button:hover {
          transform: translateY(-2px);
          border-color: rgba(111, 222, 255, 0.62) !important;
          box-shadow: 0 10px 26px rgba(0, 117, 255, 0.16);
        }

        .brain-primary-button:not(:disabled):hover,
        .brain-cta-button:hover {
          transform: translateY(-2px) scale(1.015);
          box-shadow: 0 12px 34px rgba(53, 189, 255, 0.38) !important;
        }

        .brain-primary-button:not(:disabled):active,
        .brain-cta-button:active,
        .brain-chip:not(:disabled):active,
        .brain-follow-button:not(:disabled):active {
          transform: translateY(0) scale(0.98);
        }

        .brain-phase-card:hover {
          transform: translateY(-3px) translateX(2px);
          border-color: rgba(100, 221, 255, 0.48) !important;
          box-shadow: 0 12px 32px rgba(0, 109, 255, 0.14);
        }

        .brain-number-row:hover,
        .brain-priority-row:hover,
        .brain-bullet-row:hover {
          transform: translateX(3px);
        }

        .brain-answer-panel {
          position: relative;
          overflow: hidden;
          animation: brainAnswerIn 420ms ease-out both, brainPanelReadyGlow 1100ms ease-out 220ms 1;
        }

        .brain-answer-panel::before {
          content: "";
          position: absolute;
          top: 0;
          left: -42%;
          width: 38%;
          height: 2px;
          pointer-events: none;
          z-index: 3;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(126, 241, 255, 0.96), rgba(86, 153, 255, 0.9), transparent);
          box-shadow: 0 0 10px rgba(95, 226, 255, 0.88), 0 0 24px rgba(55, 133, 255, 0.48);
          animation: brainEnergySweep 1250ms cubic-bezier(0.2, 0.72, 0.25, 1) 160ms 1 forwards;
        }


        @keyframes brainProfileIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes brainProfilePulse {
          0%, 100% { opacity: 0.48; transform: scale(0.9); box-shadow: 0 0 0 rgba(84, 220, 255, 0); }
          50% { opacity: 1; transform: scale(1.12); box-shadow: 0 0 15px rgba(84, 220, 255, 0.62); }
        }

        @keyframes brainProfileScan {
          from { transform: translateX(-110%); opacity: 0; }
          15% { opacity: 0.85; }
          75% { opacity: 0.6; }
          to { transform: translateX(310%); opacity: 0; }
        }

        .brain-profile-panel {
          position: relative;
          overflow: hidden;
          animation: brainProfileIn 440ms ease-out 120ms both;
        }

        .brain-profile-panel::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 34%;
          height: 1px;
          pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(114, 231, 255, 0.82), transparent);
          animation: brainProfileScan 4.8s ease-in-out 900ms infinite;
        }

        .brain-profile-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #62ddff;
          animation: brainProfilePulse 2.1s ease-in-out infinite;
          flex: 0 0 auto;
        }

        .brain-profile-metric,
        .brain-profile-channel {
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
        }

        .brain-profile-metric:hover {
          transform: translateY(-2px);
          border-color: rgba(100, 221, 255, 0.42) !important;
          box-shadow: 0 10px 26px rgba(0, 117, 255, 0.12);
        }

        .brain-profile-channel:hover {
          transform: translateY(-1px);
          border-color: rgba(103, 232, 249, 0.48) !important;
        }


        .brain-profile-next {
          position: relative;
          overflow: hidden;
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
        }

        .brain-profile-next:hover {
          transform: translateY(-2px);
          border-color: rgba(103, 232, 249, 0.42) !important;
          box-shadow: 0 10px 28px rgba(0, 117, 255, 0.12);
        }

        @media (hover: none) {
          .brain-orb-button:hover,
          .brain-phase-card:hover,
          .brain-number-row:hover,
          .brain-priority-row:hover,
          .brain-bullet-row:hover,
          .brain-chip:hover,
          .brain-follow-button:hover,
          .brain-utility-button:hover,
          .brain-secondary-button:hover,
          .brain-primary-button:hover,
          .brain-cta-button:hover {
            transform: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .brain-orb-aura,
          .brain-orbit-ring,
          .brain-orb-core,
          .brain-answer-panel,
          .brain-answer-panel::before {
            animation: none !important;
          }

          .brain-orb-button,
          .brain-chip,
          .brain-primary-button,
          .brain-utility-button,
          .brain-follow-button,
          .brain-cta-button,
          .brain-secondary-button,
          .brain-phase-card,
          .brain-number-row,
          .brain-priority-row,
          .brain-bullet-row {
            transition: none !important;
          }
        }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: "980px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: "18px",
            marginBottom: "38px",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/"
            style={{
              color: "#9ccfff",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "15px",
            }}
          >
            ← Volver a AxiomAI
          </Link>

          <div
            style={{
              color: "#53b7ff",
              letterSpacing: "3px",
              fontSize: "12px",
              fontWeight: 800,
            }}
          >
            AXIOMOS • BRAIN 2.2
          </div>
        </header>

        <section
          style={{
            textAlign: "center",
            marginBottom: "30px",
          }}
        >
          <div
            className={`brain-orb-shell${loading ? " is-loading" : ""}${result && !loading ? " is-ready" : ""}`}
            style={{
              width: "126px",
              height: "126px",
              margin: "0 auto 6px",
              position: "relative",
              display: "grid",
              placeItems: "center",
            }}
          >
            <span className="brain-orbit-ring brain-orbit-ring-one" />
            <span className="brain-orbit-ring brain-orbit-ring-two" />
            <span className="brain-orb-aura" />

            <button
              type="button"
              aria-label="Activar AxiomOS Brain"
              onClick={() =>
                inputRef.current?.focus()
              }
              onPointerMove={(event) => {
                if (event.pointerType === "touch") return;

                const rect =
                  event.currentTarget.getBoundingClientRect();
                const x =
                  (event.clientX - rect.left) / rect.width;
                const y =
                  (event.clientY - rect.top) / rect.height;
                const nx = (x - 0.5) * 2;
                const ny = (y - 0.5) * 2;

                event.currentTarget.style.setProperty(
                  "--orb-x",
                  `${Math.round(x * 100)}%`
                );
                event.currentTarget.style.setProperty(
                  "--orb-y",
                  `${Math.round(y * 100)}%`
                );
                event.currentTarget.style.setProperty(
                  "--orb-rx",
                  `${(-ny * 10).toFixed(2)}deg`
                );
                event.currentTarget.style.setProperty(
                  "--orb-ry",
                  `${(nx * 12).toFixed(2)}deg`
                );
                event.currentTarget.style.setProperty(
                  "--orb-tx",
                  `${(nx * 7).toFixed(2)}px`
                );
                event.currentTarget.style.setProperty(
                  "--orb-ty",
                  `${(ny * 7).toFixed(2)}px`
                );
                event.currentTarget.style.setProperty(
                  "--brain-x",
                  `${(nx * 4).toFixed(2)}px`
                );
                event.currentTarget.style.setProperty(
                  "--brain-y",
                  `${(ny * 4).toFixed(2)}px`
                );
                event.currentTarget.style.setProperty(
                  "--orb-scale",
                  "1.045"
                );
              }}
              onPointerEnter={(event) => {
                event.currentTarget.style.setProperty(
                  "--orb-scale",
                  "1.045"
                );
              }}
              onPointerLeave={(event) => {
                const button = event.currentTarget;
                button.style.setProperty("--orb-x", "35%");
                button.style.setProperty("--orb-y", "30%");
                button.style.setProperty("--orb-rx", "0deg");
                button.style.setProperty("--orb-ry", "0deg");
                button.style.setProperty("--orb-tx", "0px");
                button.style.setProperty("--orb-ty", "0px");
                button.style.setProperty("--brain-x", "0px");
                button.style.setProperty("--brain-y", "0px");
                button.style.setProperty("--orb-scale", "1");
              }}
              onPointerDown={(event) => {
                event.currentTarget.style.setProperty(
                  "--orb-scale",
                  "0.94"
                );
              }}
              onPointerUp={(event) => {
                event.currentTarget.style.setProperty(
                  "--orb-scale",
                  "1.045"
                );
              }}
              className="brain-orb-button"
              style={{
                width: "94px",
                height: "94px",
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                position: "relative",
                overflow: "hidden",
                fontSize: "42px",
                background:
                  "radial-gradient(circle at var(--orb-x, 35%) var(--orb-y, 30%), rgba(255,255,255,0.98) 0%, #70efff 8%, #1686ee 38%, #082e68 70%, #031229 100%)",
                border:
                  "1px solid rgba(117, 225, 255, 0.78)",
                boxShadow:
                  "0 0 34px rgba(42, 170, 255, 0.56), 0 0 72px rgba(16, 112, 255, 0.2), inset 0 0 25px rgba(255,255,255,0.16)",
                cursor: "pointer",
                color: "white",
                transform:
                  "perspective(700px) translate3d(var(--orb-tx, 0px), var(--orb-ty, 0px), 0) rotateX(var(--orb-rx, 0deg)) rotateY(var(--orb-ry, 0deg)) scale(var(--orb-scale, 1))",
              }}
            >
              <span className="brain-orb-sheen" />
              <span className="brain-orb-grid" />
              <span className="brain-orb-core">🧠</span>
            </button>
          </div>

          <p
            style={{
              color: "#55c7ff",
              fontWeight: 800,
              letterSpacing: "4px",
              fontSize: "13px",
              marginBottom: "10px",
            }}
          >
            INTELIGENCIA OPERATIVA
          </p>

          <h1
            style={{
              fontSize:
                "clamp(40px, 8vw, 72px)",
              margin: "0 0 12px",
              letterSpacing: "-2px",
            }}
          >
            AxiomOS Brain
          </h1>

          <p
            style={{
              color: "#b7c8dc",
              maxWidth: "720px",
              margin: "0 auto",
              lineHeight: 1.7,
              fontSize: "17px",
            }}
          >
            Describe un problema de tu negocio.
            Brain identificará qué conviene
            mejorar primero y cómo convertirlo
            en una solución práctica.
          </p>
        </section>

        <section
          style={{
            border:
              "1px solid rgba(83, 183, 255, 0.32)",
            borderRadius: "26px",
            padding:
              "clamp(20px, 4vw, 34px)",
            background:
              "linear-gradient(145deg, rgba(9, 26, 51, 0.92), rgba(3, 10, 21, 0.94))",
            boxShadow:
              "0 28px 80px rgba(0, 0, 0, 0.42)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "22px",
            }}
          >
            {quickPrompts.map(
              (prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setMessage(prompt);
                    void askBrain(prompt);
                  }}
                  disabled={loading}
                  className="brain-chip"
                  style={{
                    padding:
                      "10px 13px",
                    borderRadius:
                      "999px",
                    border:
                      "1px solid rgba(83, 183, 255, 0.28)",
                    background:
                      "rgba(12, 42, 76, 0.66)",
                    color: "#cdeeff",
                    cursor: loading
                      ? "not-allowed"
                      : "pointer",
                    fontSize: "13px",
                    opacity: loading
                      ? 0.6
                      : 1,
                  }}
                >
                  {prompt}
                </button>
              )
            )}
          </div>

          <form
            onSubmit={handleSubmit}
          >
            <label
              htmlFor="brain-message"
              style={{
                display: "block",
                fontWeight: 700,
                marginBottom: "10px",
                color: "#dcecff",
              }}
            >
              ¿En qué quieres que Brain
              te ayude?
            </label>

            <textarea
              ref={inputRef}
              id="brain-message"
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value
                )
              }
              onKeyDown={
                handleKeyDown
              }
              rows={6}
              maxLength={4000}
              disabled={loading}
              placeholder="Ejemplo: Recibo muchas consultas por WhatsApp y se me pierden algunos seguimientos. ¿Qué debería automatizar primero?"
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                padding: "18px",
                borderRadius:
                  "16px",
                border:
                  "1px solid #285680",
                background:
                  "rgba(2, 9, 19, 0.9)",
                color: "white",
                fontSize: "16px",
                lineHeight: 1.6,
                resize: "vertical",
                outline: "none",
                fontFamily:
                  "Arial, sans-serif",
                opacity: loading
                  ? 0.72
                  : 1,
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap: "15px",
                marginTop: "14px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  color: "#7186a0",
                  fontSize: "12px",
                }}
              >
                Enter para enviar •
                Shift + Enter para nueva
                línea
              </span>

              <button
                type="submit"
                className="brain-primary-button"
                disabled={
                  loading ||
                  !message.trim()
                }
                style={{
                  padding:
                    "14px 24px",
                  border: "none",
                  borderRadius:
                    "13px",
                  background:
                    loading ||
                    !message.trim()
                      ? "#25445f"
                      : "linear-gradient(135deg, #1a79f2, #37d5ff)",
                  color: "white",
                  fontSize: "16px",
                  fontWeight: 850,
                  cursor:
                    loading ||
                    !message.trim()
                      ? "not-allowed"
                      : "pointer",
                  boxShadow:
                    loading ||
                    !message.trim()
                      ? "none"
                      : "0 0 28px rgba(53, 189, 255, 0.32)",
                }}
              >
                {loading
                  ? "Brain está analizando..."
                  : "Consultar a Brain"}
              </button>
            </div>
          </form>

          {loading && (
            <div
              style={{
                marginTop: "22px",
                padding:
                  "17px 18px",
                borderRadius:
                  "14px",
                border:
                  "1px solid rgba(83, 183, 255, 0.24)",
                background:
                  "rgba(10, 38, 68, 0.48)",
                color: "#bfe7ff",
                fontWeight: 700,
              }}
            >
              🧠 Brain está
              priorizando oportunidades y
              preparando una recomendación
              ejecutiva...
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: "24px",
                padding: "18px",
                borderRadius:
                  "15px",
                border:
                  "1px solid rgba(255, 111, 111, 0.45)",
                background:
                  "rgba(94, 18, 24, 0.35)",
                color: "#ffd2d2",
                lineHeight: 1.6,
              }}
            >
              {error}
            </div>
          )}

          {result && !loading && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginTop: "26px",
                }}
              >
                <strong
                  style={{
                    color: "#9ee6ff",
                    fontSize: "14px",
                  }}
                >
                  ✓ Análisis completado
                </strong>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={
                      copyAnalysis
                    }
                    className="brain-utility-button"
                    style={{
                      padding:
                        "10px 14px",
                      borderRadius:
                        "999px",
                      border:
                        "1px solid rgba(83,183,255,0.32)",
                      background:
                        "rgba(10,40,72,0.7)",
                      color:
                        "#d9f5ff",
                      fontWeight: 800,
                      cursor:
                        "pointer",
                    }}
                  >
                    {copyStatus ||
                      "Copiar análisis"}
                  </button>

                  <button
                    type="button"
                    className="brain-utility-button"
                    onClick={() =>
                      answerRef.current?.scrollIntoView(
                        {
                          behavior:
                            "smooth",
                          block: "start",
                        }
                      )
                    }
                    style={{
                      padding:
                        "10px 14px",
                      borderRadius:
                        "999px",
                      border:
                        "1px solid rgba(83,183,255,0.4)",
                      background:
                        "rgba(26,121,242,0.22)",
                      color:
                        "#d9f5ff",
                      fontWeight: 800,
                      cursor:
                        "pointer",
                    }}
                  >
                    Ver análisis ↓
                  </button>
                </div>
              </div>

              <div
                ref={answerRef}
                id="brain-answer"
                className="brain-answer-panel"
                style={{
                  marginTop: "14px",
                  padding:
                    "clamp(20px, 4vw, 30px)",
                  borderRadius:
                    "20px",
                  border:
                    "1px solid rgba(82, 205, 255, 0.42)",
                  background:
                    "linear-gradient(145deg, rgba(3,15,29,0.96), rgba(4,22,40,0.92))",
                  textAlign: "left",
                  scrollMarginTop:
                    "24px",
                  boxShadow:
                    "0 18px 55px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.03)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    gap: "10px",
                    marginBottom:
                      "18px",
                    paddingBottom:
                      "16px",
                    borderBottom:
                      "1px solid rgba(98,203,255,0.15)",
                  }}
                >
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius:
                        "50%",
                      display: "grid",
                      placeItems:
                        "center",
                      background:
                        "radial-gradient(circle at 35% 30%, #5ce8ff, #147de8 45%, #082e68)",
                      boxShadow:
                        "0 0 18px rgba(42,170,255,0.35)",
                      fontSize:
                        "18px",
                    }}
                  >
                    🧠
                  </div>

                  <div>
                    <div
                      style={{
                        color:
                          "#62cbff",
                        fontSize:
                          "11px",
                        fontWeight:
                          850,
                        letterSpacing:
                          "2.5px",
                      }}
                    >
                      AXIOMOS BRAIN
                      2.2
                    </div>

                    <div
                      style={{
                        color:
                          "#ffffff",
                        fontSize:
                          "16px",
                        fontWeight:
                          850,
                        marginTop:
                          "3px",
                      }}
                    >
                      Diagnóstico de
                      inteligencia operativa
                    </div>
                  </div>
                </div>

                <BrainText
                  text={result}
                />

                <div
                  className="brain-profile-panel"
                  style={{
                    marginTop: "30px",
                    padding: "22px",
                    borderRadius: "20px",
                    border: "1px solid rgba(83, 205, 255, 0.25)",
                    background:
                      "linear-gradient(145deg, rgba(7,35,62,0.74), rgba(4,20,38,0.86))",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.025), 0 16px 42px rgba(0,0,0,0.18)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "16px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "9px",
                          color: "#75dcff",
                          fontSize: "10px",
                          fontWeight: 900,
                          letterSpacing: "2.4px",
                          textTransform: "uppercase",
                        }}
                      >
                        <span className="brain-profile-dot" />
                        Perfil del negocio • actualización en vivo
                      </div>

                      <h3
                        style={{
                          margin: "9px 0 5px",
                          color: "#ffffff",
                          fontSize: "20px",
                          lineHeight: 1.3,
                          fontWeight: 900,
                        }}
                      >
                        Brain está construyendo contexto operativo
                      </h3>

                      <p
                        style={{
                          margin: 0,
                          color: "#91aac1",
                          fontSize: "13px",
                          lineHeight: 1.55,
                          maxWidth: "650px",
                        }}
                      >
                        Este perfil se refina con cada respuesta. Los datos del negocio se confirman con lo que el cliente realmente menciona.
                      </p>
                    </div>

                    <div
                      style={{
                        minWidth: "126px",
                        padding: "9px 12px",
                        borderRadius: "12px",
                        border: "1px solid rgba(94,210,255,0.22)",
                        background: "rgba(7, 28, 50, 0.62)",
                        textAlign: "right",
                      }}
                    >
                      <div
                        style={{
                          color: "#6edcff",
                          fontSize: "10px",
                          fontWeight: 900,
                          letterSpacing: "1.6px",
                        }}
                      >
                        CONTEXTO
                      </div>
                      <div
                        style={{
                          marginTop: "3px",
                          color: "#ffffff",
                          fontSize: "16px",
                          fontWeight: 900,
                        }}
                      >
                        {businessProfile.confirmedCount}/3 datos
                      </div>
                      <div
                        style={{
                          marginTop: "3px",
                          color: "#6f91ad",
                          fontSize: "9.5px",
                          fontWeight: 750,
                        }}
                      >
                        {businessProfile.assessmentCount}/2 evaluaciones Brain
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      height: "4px",
                      marginTop: "18px",
                      borderRadius: "999px",
                      background: "rgba(78, 168, 221, 0.12)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${(businessProfile.confirmedCount / 3) * 100}%`,
                        height: "100%",
                        borderRadius: "999px",
                        background:
                          "linear-gradient(90deg, #2f8df6, #58ddff)",
                        boxShadow: "0 0 14px rgba(72,210,255,0.38)",
                        transition: "width 420ms ease",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(145px, 1fr))",
                      gap: "10px",
                      marginTop: "16px",
                    }}
                  >
                    {[
                      ["Tipo de negocio", businessProfile.businessType],
                      ["Foco", businessProfile.focus],
                      ["Prioridad Brain", businessProfile.priority],
                      ["Complejidad Brain", businessProfile.complexity],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="brain-profile-metric"
                        style={{
                          padding: "13px 14px",
                          borderRadius: "14px",
                          border: "1px solid rgba(85,183,241,0.16)",
                          background: "rgba(5, 23, 42, 0.62)",
                        }}
                      >
                        <div
                          style={{
                            color: "#718da7",
                            fontSize: "10px",
                            fontWeight: 850,
                            letterSpacing: "1.1px",
                            textTransform: "uppercase",
                          }}
                        >
                          {label}
                        </div>
                        <div
                          style={{
                            marginTop: "5px",
                            color: "#eaf8ff",
                            fontSize: "13px",
                            fontWeight: 850,
                            lineHeight: 1.4,
                          }}
                        >
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: "12px",
                      marginTop: "12px",
                    }}
                  >
                    <div
                      style={{
                        padding: "15px",
                        borderRadius: "15px",
                        border: "1px solid rgba(85,183,241,0.14)",
                        background: "rgba(4, 19, 35, 0.58)",
                      }}
                    >
                      <div
                        style={{
                          color: "#7394ae",
                          fontSize: "10px",
                          fontWeight: 850,
                          letterSpacing: "1.2px",
                          textTransform: "uppercase",
                          marginBottom: "8px",
                        }}
                      >
                        Canales mencionados
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "7px",
                        }}
                      >
                        {(businessProfile.channels.length > 0
                          ? businessProfile.channels
                          : ["Por confirmar"]
                        ).map((channel) => (
                          <span
                            key={channel}
                            className="brain-profile-channel"
                            style={{
                              padding: "6px 9px",
                              borderRadius: "999px",
                              border:
                                "1px solid rgba(97,205,255,0.22)",
                              background: "rgba(16, 68, 108, 0.34)",
                              color: "#c8efff",
                              fontSize: "11px",
                              fontWeight: 750,
                            }}
                          >
                            {channel}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "15px",
                        borderRadius: "15px",
                        border: "1px solid rgba(85,183,241,0.14)",
                        background: "rgba(4, 19, 35, 0.58)",
                      }}
                    >
                      <div
                        style={{
                          color: "#7394ae",
                          fontSize: "10px",
                          fontWeight: 850,
                          letterSpacing: "1.2px",
                          textTransform: "uppercase",
                          marginBottom: "7px",
                        }}
                      >
                        Lectura principal de Brain
                      </div>
                      <p
                        style={{
                          margin: 0,
                          color: "#b8ccdc",
                          fontSize: "12.5px",
                          lineHeight: 1.55,
                        }}
                      >
                        {businessProfile.summary}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "12px",
                      color: "#5f7c96",
                      fontSize: "11px",
                      lineHeight: 1.45,
                    }}
                  >
                    Contexto confirmado a partir de {businessProfile.interactionCount || 1} {(businessProfile.interactionCount || 1) === 1 ? "interacción" : "interacciones"}. Los datos del negocio se toman de lo que el cliente ha mencionado; prioridad y complejidad son evaluaciones de Brain.
                  </div>


                  {profileNextQuestion ? (
                    <div
                      className="brain-profile-next"
                      style={{
                        marginTop: "14px",
                        padding: "14px 15px",
                        borderRadius: "15px",
                        border: "1px solid rgba(88, 198, 255, 0.18)",
                        background: "linear-gradient(135deg, rgba(14,63,106,0.30), rgba(5,27,49,0.58))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "14px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: "1 1 360px" }}>
                        <div
                          style={{
                            color: "#69d9ff",
                            fontSize: "9.5px",
                            fontWeight: 900,
                            letterSpacing: "1.5px",
                            textTransform: "uppercase",
                          }}
                        >
                          Siguiente dato útil • {profileNextQuestion.label}
                        </div>
                        <div
                          style={{
                            marginTop: "5px",
                            color: "#eaf8ff",
                            fontSize: "13px",
                            lineHeight: 1.5,
                            fontWeight: 780,
                          }}
                        >
                          {profileNextQuestion.question}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="brain-follow-button"
                        onClick={() => {
                          setMessage("");
                          window.setTimeout(() => {
                            inputRef.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                            inputRef.current?.focus();
                          }, 50);
                        }}
                        style={{
                          padding: "10px 13px",
                          borderRadius: "11px",
                          border: "1px solid rgba(92,207,255,0.30)",
                          background: "rgba(27,111,179,0.24)",
                          color: "#dff8ff",
                          fontSize: "12px",
                          fontWeight: 850,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Responder ahora ↑
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: "14px",
                        padding: "11px 13px",
                        borderRadius: "13px",
                        border: "1px solid rgba(104, 232, 181, 0.16)",
                        background: "rgba(20, 82, 65, 0.18)",
                        color: "#a9f0d3",
                        fontSize: "11.5px",
                        lineHeight: 1.5,
                        fontWeight: 780,
                      }}
                    >
                      ✓ Perfil base confirmado. Brain puede profundizar sin volver a pedir estos datos.
                    </div>
                  )}
                </div>

                <div
                  style={{
                    marginTop: "28px",
                    paddingTop: "22px",
                    borderTop:
                      "1px solid rgba(98,203,255,0.14)",
                  }}
                >
                  <div
                    style={{
                      color: "#ffffff",
                      fontWeight: 900,
                      fontSize: "16px",
                      marginBottom:
                        "7px",
                    }}
                  >
                    ¿Quieres profundizar?
                  </div>

                  <p
                    style={{
                      margin:
                        "0 0 14px",
                      color: "#90a9bf",
                      lineHeight: 1.6,
                      fontSize: "13px",
                    }}
                  >
                    Brain conserva el
                    contexto de este análisis.
                    Elige una dirección y
                    continuará desde aquí.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: "9px",
                      flexWrap: "wrap",
                    }}
                  >
                    {followUpPrompts.map(
                      (
                        prompt,
                        index
                      ) => (
                        <button
                          key={prompt}
                          type="button"
                          className="brain-follow-button"
                          disabled={
                            loading
                          }
                          onClick={() =>
                            void askBrain(
                              prompt
                            )
                          }
                          style={{
                            padding:
                              "10px 13px",
                            borderRadius:
                              "12px",
                            border:
                              "1px solid rgba(83,183,255,0.24)",
                            background:
                              "rgba(14,48,83,0.62)",
                            color:
                              "#cbeeff",
                            cursor:
                              "pointer",
                            fontSize:
                              "13px",
                            fontWeight:
                              750,
                          }}
                        >
                          {index === 0
                            ? "Plan por fases"
                            : index ===
                                1
                              ? "Qué necesito"
                              : "Qué hacer primero"}
                        </button>
                      )
                    )}
                  </div>
                </div>

               <div
  style={{
    marginTop: "28px",
    padding: "22px",
    borderRadius: "18px",
    border: "1px solid rgba(74, 197, 255, 0.28)",
    background:
      "linear-gradient(135deg, rgba(11, 52, 91, 0.58), rgba(5, 25, 48, 0.72))",
  }}
>
                  <div
                    style={{
                      color: "#ffffff",
                      fontSize: "18px",
                      fontWeight: 900,
                      marginBottom:
                        "8px",
                    }}
                  >
                    ¿Quieres convertir este
                    análisis en una solución
                    real?
                  </div>

                  <p
                    style={{
                      margin:
                        "0 0 18px",
                      color: "#afc8dd",
                      lineHeight: 1.65,
                      fontSize: "14px",
                    }}
                  >
                    AxiomAI Solutions puede
                    estudiar tu proceso,
                    definir la arquitectura
                    adecuada y ayudarte a
                    llevarla a implementación.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      alignItems:
                        "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <a
                      href="/#evaluacion"
                      onClick={implementSolution}
                      className="brain-cta-button"
                      style={{
                        display:
                          "inline-flex",
                        textDecoration:
                          "none",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        minHeight:
                          "48px",
                        padding:
                          "0 21px",
                        border: "none",
                        borderRadius:
                          "13px",
                        background:
                          "linear-gradient(135deg, #147df5, #35d4ff)",
                        color:
                          "#ffffff",
                        fontWeight:
                          900,
                        fontSize:
                          "14px",
                        cursor:
                          "pointer",
                        boxShadow:
                          "0 0 28px rgba(53,189,255,0.3)",
                      }}
                    >
                      Quiero implementar esta
                      solución →
                    </a>

                    <button
                      type="button"
                      onClick={
                        startAnotherQuestion
                      }
                      className="brain-secondary-button"
                      style={{
                        minHeight:
                          "48px",
                        padding:
                          "0 18px",
                        borderRadius:
                          "13px",
                        border:
                          "1px solid rgba(83,183,255,0.34)",
                        background:
                          "rgba(12,42,76,0.72)",
                        color:
                          "#d8f4ff",
                        fontWeight:
                          800,
                        cursor:
                          "pointer",
                      }}
                    >
                      Hacer otra pregunta
                    </button>

                    <button
                      type="button"
                      onClick={startNewConversation}
                      className="brain-secondary-button"
                      style={{
                        minHeight: "48px",
                        padding: "0 18px",
                        borderRadius: "13px",
                        border: "1px solid rgba(120,147,170,0.28)",
                        background: "rgba(6,18,31,0.72)",
                        color: "#9db4c8",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Nueva conversación
                    </button>
                  </div>

                  <div
                    style={{
                      marginTop:
                        "13px",
                      color:
                        "#7893aa",
                      fontSize:
                        "12px",
                    }}
                  >
                    Evaluación inicial gratuita
                    • Sin compromiso
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        <p
          style={{
            textAlign: "center",
            color: "#61758e",
            fontSize: "12px",
            marginTop: "24px",
            lineHeight: 1.6,
          }}
        >
          AxiomOS Brain ofrece orientación
          tecnológica inicial. Las decisiones
          importantes de negocio deben
          validarse con información específica
          de cada caso.
        </p>
      </div>
    </main>
  );
}
