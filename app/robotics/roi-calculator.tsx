"use client";

import { type FormEvent, useMemo, useState } from "react";

type Language = "es" | "en";

type RoiInputs = {
  investment: number;
  hoursPerDay: number;
  laborCost: number;
  annualDays: number;
  realizableSavingsRate: number;
  annualRobotExpenses: number;
};

type LeadForm = {
  name: string;
  phone: string;
  business: string;
  email: string;
  consent: boolean;
  website: string;
};

const initialInputs: RoiInputs = {
  investment: 45000,
  hoursPerDay: 8,
  laborCost: 14,
  annualDays: 300,
  realizableSavingsRate: 70,
  annualRobotExpenses: 5556,
};

const initialLead: LeadForm = {
  name: "",
  phone: "",
  business: "",
  email: "",
  consent: false,
  website: "",
};

const copy = {
  es: {
    kicker: "CALCULADORA DE AHORRO + ROI",
    titleA: "Convierte tu operación",
    titleB: "en una decisión medible.",
    intro:
      "Ajusta los supuestos de tu operación para comparar el costo anual de la tarea manual con un escenario asistido por robótica.",
    fields: {
      investment: "Inversión inicial estimada",
      hoursPerDay: "Horas diarias que el robot libera",
      laborCost: "Costo laboral por hora",
      annualDays: "Días de operación al año",
      realizableSavingsRate: "Ahorro económico realizable",
      annualRobotExpenses: "Gastos anuales del robot",
    },
    hints: {
      investment: "Equipo, integración y puesta en marcha.",
      hoursPerDay: "Horas de trabajo repetitivo que pueden reasignarse.",
      laborCost: "Incluye salario y cargas cuando aplique.",
      annualDays: "Días reales de uso durante el año.",
      realizableSavingsRate: "Porción del costo laboral que puede convertirse en ahorro o capacidad útil.",
      annualRobotExpenses: "Mantenimiento, consumibles, software y otros costos recurrentes.",
    },
    results: "Resultado estimado",
    manualAnnual: "Costo manual anual",
    robotAnnual: "Costo anual con robot",
    netAnnual: "Ahorro neto anual",
    payback: "Recuperación",
    months: "meses",
    noPayback: "Sin recuperación con estos supuestos",
    comparison: "Comparación anual",
    manual: "Manual",
    robot: "Con robot",
    formula:
      "El escenario con robot conserva el costo laboral no realizable y suma los gastos anuales del robot. La inversión inicial se utiliza para calcular la recuperación.",
    disclaimer:
      "Resultados orientativos, no garantizados. La cifra final depende del flujo, superficie, turnos, mantenimiento, consumibles, financiamiento y validación del sitio.",
    leadTitle: "Solicita tu evaluación gratuita",
    leadText:
      "Guardaremos este análisis en AxiomOS para preparar una recomendación ajustada a tu operación.",
    name: "Nombre",
    phone: "Teléfono",
    business: "Negocio / empresa",
    email: "Correo electrónico",
    optional: "opcional",
    consent: "Acepto que AxiomAI Solutions me contacte sobre este análisis.",
    privacy: "Política de privacidad",
    submit: "Solicitar propuesta personalizada",
    submitting: "Registrando análisis…",
    success: "Análisis recibido. Ya quedó registrado en AxiomOS para seguimiento.",
    emailWarning:
      "El análisis quedó guardado en AxiomOS, pero la notificación por correo no pudo confirmarse.",
    error: "No pudimos registrar el análisis. Verifica los datos e inténtalo nuevamente.",
  },
  en: {
    kicker: "SAVINGS + ROI CALCULATOR",
    titleA: "Turn your operation",
    titleB: "into a measurable decision.",
    intro:
      "Adjust your operating assumptions to compare the annual cost of manual work with a robotics-assisted scenario.",
    fields: {
      investment: "Estimated initial investment",
      hoursPerDay: "Daily hours freed by the robot",
      laborCost: "Hourly labor cost",
      annualDays: "Operating days per year",
      realizableSavingsRate: "Realizable economic savings",
      annualRobotExpenses: "Annual robot expenses",
    },
    hints: {
      investment: "Equipment, integration and commissioning.",
      hoursPerDay: "Repetitive labor hours that can be reassigned.",
      laborCost: "Include wages and labor burden when applicable.",
      annualDays: "Actual operating days during the year.",
      realizableSavingsRate: "Share of labor cost that can become savings or useful capacity.",
      annualRobotExpenses: "Maintenance, consumables, software and other recurring costs.",
    },
    results: "Estimated result",
    manualAnnual: "Annual manual cost",
    robotAnnual: "Annual cost with robot",
    netAnnual: "Annual net savings",
    payback: "Payback",
    months: "months",
    noPayback: "No payback under these assumptions",
    comparison: "Annual comparison",
    manual: "Manual",
    robot: "With robot",
    formula:
      "The robot scenario retains non-realizable labor cost and adds annual robot expenses. Initial investment is used to calculate payback.",
    disclaimer:
      "Directional results, not guaranteed. Final figures depend on workflow, floor area, shifts, maintenance, consumables, financing and site validation.",
    leadTitle: "Request your free assessment",
    leadText:
      "We will save this analysis in AxiomOS to prepare a recommendation for your operation.",
    name: "Name",
    phone: "Phone",
    business: "Business / company",
    email: "Email",
    optional: "optional",
    consent: "I agree that AxiomAI Solutions may contact me about this analysis.",
    privacy: "Privacy policy",
    submit: "Request a personalized proposal",
    submitting: "Saving analysis…",
    success: "Analysis received. It is now registered in AxiomOS for follow-up.",
    emailWarning:
      "The analysis was saved in AxiomOS, but the email notification could not be confirmed.",
    error: "We could not save the analysis. Check the details and try again.",
  },
} as const;

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export default function RoiCalculator({ language }: { language: Language }) {
  const text = copy[language];
  const [inputs, setInputs] = useState<RoiInputs>(initialInputs);
  const [lead, setLead] = useState<LeadForm>(initialLead);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "warning" | "error">("idle");

  const results = useMemo(() => {
    const manualAnnual = inputs.hoursPerDay * inputs.laborCost * inputs.annualDays;
    const realizableLaborSavings = manualAnnual * (inputs.realizableSavingsRate / 100);
    const robotAnnual = Math.max(0, manualAnnual - realizableLaborSavings + inputs.annualRobotExpenses);
    const netAnnual = manualAnnual - robotAnnual;
    const paybackMonths = netAnnual > 0 ? (inputs.investment / netAnnual) * 12 : null;
    const chartMax = Math.max(manualAnnual, robotAnnual, 1);

    return {
      manualAnnual,
      robotAnnual,
      netAnnual,
      paybackMonths,
      manualWidth: `${(manualAnnual / chartMax) * 100}%`,
      robotWidth: `${(robotAnnual / chartMax) * 100}%`,
    };
  }, [inputs]);

  const money = useMemo(
    () =>
      new Intl.NumberFormat(language === "es" ? "es-PR" : "en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    [language]
  );

  function updateInput(field: keyof RoiInputs, value: string) {
    const number = Number(value);
    const limits: Record<keyof RoiInputs, [number, number]> = {
      investment: [0, 5000000],
      hoursPerDay: [0, 24],
      laborCost: [0, 500],
      annualDays: [0, 366],
      realizableSavingsRate: [0, 100],
      annualRobotExpenses: [0, 1000000],
    };
    const [min, max] = limits[field];
    setInputs((current) => ({ ...current, [field]: clamp(number, min, max) }));
    setStatus("idle");
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting" || lead.website) return;

    setStatus("submitting");
    const submissionId = `ROI-${Date.now()}`;
    const paybackText = results.paybackMonths
      ? `${results.paybackMonths.toFixed(1)} ${text.months}`
      : text.noPayback;
    const summary = [
      language === "es"
        ? "Solicitud de evaluación desde la calculadora ROI de AxiomAI Robotics."
        : "Assessment request from the AxiomAI Robotics ROI calculator.",
      `${text.fields.investment}: ${money.format(inputs.investment)}`,
      `${text.fields.hoursPerDay}: ${inputs.hoursPerDay}`,
      `${text.fields.laborCost}: ${money.format(inputs.laborCost)}`,
      `${text.fields.annualDays}: ${inputs.annualDays}`,
      `${text.fields.realizableSavingsRate}: ${inputs.realizableSavingsRate}%`,
      `${text.fields.annualRobotExpenses}: ${money.format(inputs.annualRobotExpenses)}`,
      `${text.manualAnnual}: ${money.format(results.manualAnnual)}`,
      `${text.robotAnnual}: ${money.format(results.robotAnnual)}`,
      `${text.netAnnual}: ${money.format(results.netAnnual)}`,
      `${text.payback}: ${paybackText}`,
    ].join("\n");

    const crmPayload = {
      nombre: lead.name.trim(),
      telefono: lead.phone.trim(),
      negocio: lead.business.trim(),
      email: lead.email.trim(),
      origen: "Calculadora ROI AxiomAI Robotics",
      id_solicitud: submissionId,
      mensaje: summary,
    };

    try {
      const crmResponse = await fetch("/api/prospectos-web", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(crmPayload),
      });
      const crmData = (await crmResponse.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!crmResponse.ok || !crmData?.ok) {
        throw new Error(crmData?.error || text.error);
      }

      const emailResponse = await fetch(
        "https://formsubmit.co/ajax/contacto@axiomaisolutions.org",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            _subject: `Nuevo análisis ROI Robotics — ${lead.business.trim() || lead.name.trim()}`,
            _template: "table",
            solicitud: submissionId,
            nombre: lead.name.trim(),
            telefono: lead.phone.trim(),
            negocio: lead.business.trim(),
            email: lead.email.trim(),
            analisis: summary,
          }),
        }
      ).catch(() => null);

      const emailData = emailResponse
        ? ((await emailResponse.json().catch(() => null)) as { success?: boolean } | null)
        : null;

      if (!emailResponse?.ok || !emailData?.success) {
        setStatus("warning");
        return;
      }

      setStatus("success");
      setLead(initialLead);
    } catch {
      setStatus("error");
    }
  }

  const fields: Array<{
    key: keyof RoiInputs;
    prefix?: string;
    suffix?: string;
    step: number;
  }> = [
    { key: "investment", prefix: "$", step: 1000 },
    { key: "hoursPerDay", step: 0.5 },
    { key: "laborCost", prefix: "$", step: 0.5 },
    { key: "annualDays", step: 1 },
    { key: "realizableSavingsRate", suffix: "%", step: 1 },
    { key: "annualRobotExpenses", prefix: "$", step: 100 },
  ];

  return (
    <section id="roi" className="robotics-section robotics-roi">
      <div className="robotics-section-heading robotics-heading-left robotics-roi-heading">
        <span className="robotics-kicker">{text.kicker}</span>
        <h2>{text.titleA}<br /><span>{text.titleB}</span></h2>
        <p>{text.intro}</p>
      </div>

      <div className="robotics-roi-shell">
        <div className="robotics-roi-inputs" aria-label={text.kicker}>
          {fields.map(({ key, prefix, suffix, step }) => (
            <label className="robotics-roi-field" key={key}>
              <span>{text.fields[key]}</span>
              <small>{text.hints[key]}</small>
              <div className="robotics-roi-control">
                {prefix && <b>{prefix}</b>}
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step={step}
                  value={inputs[key]}
                  onChange={(event) => updateInput(key, event.target.value)}
                />
                {suffix && <b>{suffix}</b>}
              </div>
            </label>
          ))}
        </div>

        <div className="robotics-roi-results" aria-live="polite">
          <span className="robotics-result-tag">{text.results}</span>
          <div className="robotics-roi-primary-results">
            <article>
              <span>{text.netAnnual}</span>
              <strong className={results.netAnnual < 0 ? "is-negative" : ""}>{money.format(results.netAnnual)}</strong>
            </article>
            <article>
              <span>{text.payback}</span>
              <strong>{results.paybackMonths ? `${results.paybackMonths.toFixed(1)} ${text.months}` : text.noPayback}</strong>
            </article>
          </div>

          <div className="robotics-roi-comparison">
            <h3>{text.comparison}</h3>
            <div className="robotics-roi-bar-row">
              <div><span>{text.manual}</span><strong>{money.format(results.manualAnnual)}</strong></div>
              <div className="robotics-roi-track"><i style={{ width: results.manualWidth }} /></div>
            </div>
            <div className="robotics-roi-bar-row robot">
              <div><span>{text.robot}</span><strong>{money.format(results.robotAnnual)}</strong></div>
              <div className="robotics-roi-track"><i style={{ width: results.robotWidth }} /></div>
            </div>
          </div>

          <p className="robotics-roi-formula">{text.formula}</p>
          <p className="robotics-roi-disclaimer">{text.disclaimer}</p>
        </div>
      </div>

      <form className="robotics-roi-lead" onSubmit={submitLead}>
        <div className="robotics-roi-lead-copy">
          <span className="robotics-kicker">AXIOMOS CRM</span>
          <h3>{text.leadTitle}</h3>
          <p>{text.leadText}</p>
        </div>
        <div className="robotics-roi-lead-fields">
          <label><span>{text.name}</span><input required autoComplete="name" value={lead.name} onChange={(event) => setLead((current) => ({ ...current, name: event.target.value }))} /></label>
          <label><span>{text.phone}</span><input required type="tel" autoComplete="tel" value={lead.phone} onChange={(event) => setLead((current) => ({ ...current, phone: event.target.value }))} /></label>
          <label><span>{text.business}</span><input autoComplete="organization" value={lead.business} onChange={(event) => setLead((current) => ({ ...current, business: event.target.value }))} /></label>
          <label><span>{text.email} <small>({text.optional})</small></span><input type="email" autoComplete="email" value={lead.email} onChange={(event) => setLead((current) => ({ ...current, email: event.target.value }))} /></label>
          <label className="robotics-roi-honeypot" aria-hidden="true"><span>Website</span><input tabIndex={-1} autoComplete="off" value={lead.website} onChange={(event) => setLead((current) => ({ ...current, website: event.target.value }))} /></label>
          <label className="robotics-roi-consent">
            <input required type="checkbox" checked={lead.consent} onChange={(event) => setLead((current) => ({ ...current, consent: event.target.checked }))} />
            <span>{text.consent} <a href="/privacy">{text.privacy}</a>.</span>
          </label>
          <button className="robotics-btn robotics-btn-primary" type="submit" disabled={status === "submitting"}>
            {status === "submitting" ? text.submitting : text.submit}
          </button>
          {status !== "idle" && status !== "submitting" && (
            <p className={`robotics-roi-status is-${status}`} role="status">
              {status === "success" ? text.success : status === "warning" ? text.emailWarning : text.error}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
