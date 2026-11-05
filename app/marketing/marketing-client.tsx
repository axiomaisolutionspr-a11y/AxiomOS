"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Language = "es" | "en";
const copy = {
  es: {
    navServices: "Servicios", navPackages: "Planes", navProcess: "Proceso", navHome: "Inicio",
    eyebrow: "NUEVA DIVISIÓN · AXIOMAI SOLUTIONS",
    titleA: "Publicidad que", titleB: "conecta y convierte.",
    intro: "Creatividad, videos, redes sociales y campañas digitales conectadas con inteligencia artificial, atención al cliente y seguimiento comercial.",
    heroCta: "Solicitar evaluación", secondaryCta: "Explorar servicios",
    heroBadge: "MARKETING + AUTOMATIZACIÓN + IA",
    statA: "Producción creativa", statADetail: "Diseño, videos y contenido",
    statB: "Distribución multicanal", statBDetail: "Campañas y redes sociales",
    statC: "Seguimiento inteligente", statCDetail: "Conexión con CRM y WhatsApp",
    servicesTitle: "Un estudio creativo conectado a tu negocio",
    servicesIntro: "Desde una pieza publicitaria hasta una estrategia completa. Cada servicio puede contratarse por separado o combinarse.",
    services: [
      { icon: "01", name: "Comerciales y videos con IA", detail: "Reels, Shorts, anuncios verticales, presentadores virtuales y videos explicativos, con revisión humana antes de publicar." },
      { icon: "02", name: "Redes sociales y comunidad", detail: "Calendario editorial, publicaciones, historias, guiones y gestión de contenido para las plataformas pertinentes." },
      { icon: "03", name: "Campañas Meta y Google", detail: "Planificación, configuración y optimización de anuncios pagados orientados a contactos y oportunidades medibles." },
      { icon: "04", name: "Diseño e identidad visual", detail: "Artes, promociones, miniaturas, catálogos digitales y materiales alineados con la identidad real de cada marca." },
      { icon: "05", name: "YouTube y contenido educativo", detail: "Estrategia del canal, videos largos y cortos, títulos, miniaturas, análisis de retención y optimización." },
      { icon: "06", name: "Prospectos y automatización", detail: "Conexiones opcionales con formularios, WhatsApp, Axira y CRM para organizar consultas y facilitar el seguimiento." },
    ],
    pathEyebrow: "DE LA IDEA A LA OPORTUNIDAD",
    pathTitle: "No nos quedamos en las visualizaciones.",
    pathSteps: ["Creamos contenido", "Publicamos o anunciamos", "Recibimos consultas", "Organizamos prospectos", "Medimos resultados"],
    packagesEyebrow: "MODALIDADES DE SERVICIO",
    packagesTitle: "Un plan que responda a tu etapa",
    packagesIntro: "El alcance, los entregables y la inversión se fijan en una propuesta escrita tras evaluar tu negocio.",
    packages: [
      { name: "CREA", description: "Producción individual", items: ["Comerciales y videos", "Diseños y promociones", "Guiones y miniaturas", "Entrega para aprobación"] },
      { name: "CRECE", description: "Contenido recurrente", items: ["Estrategia y calendario", "Contenido mensual", "Adaptación a redes", "Informe de desempeño"] },
      { name: "ESCALA", description: "Campañas y captación", items: ["Creatividad y anuncios", "Optimización de campañas", "Seguimiento de prospectos", "Integración CRM opcional"] },
    ],
    packageCta: "Solicitar propuesta",
    disclaimer: "El presupuesto de anuncios pagados, las suscripciones de terceros y la producción presencial se cotizan por separado. No garantizamos ventas ni resultados específicos.",
    processEyebrow: "UN PROCESO PROFESIONAL",
    processTitle: "Creatividad con control y resultados claros",
    process: [
      { title: "Diagnóstico", description: "Conocemos el público, la oferta, el presupuesto y el objetivo del cliente." },
      { title: "Producción y revisión", description: "Preparamos contenido, verificamos afirmaciones, derechos de uso y solicitamos aprobación." },
      { title: "Publicación", description: "Ejecutamos solo en los canales y cuentas autorizadas por el negocio." },
      { title: "Medición", description: "Revisamos costos, alcance, consultas, prospectos válidos y oportunidades." },
    ],
    footerTitle: "Tu negocio merece más que una publicación.",
    footerText: "Combina contenido atractivo con procesos inteligentes para atender mejor a cada cliente potencial.",
    contact: "Solicita una evaluación gratuita", back: "Volver a AxiomAI",
    contactNote: "Puerto Rico · Español e inglés · Atención para empresas",
    privacy: "Política de privacidad",
  },
  en: {
    navServices: "Services", navPackages: "Plans", navProcess: "Process", navHome: "Home",
    eyebrow: "NEW DIVISION · AXIOMAI SOLUTIONS",
    titleA: "Advertising that", titleB: "connects and converts.",
    intro: "Creative production, video, social media and digital campaigns connected to AI, customer service and sales follow-up.",
    heroCta: "Request an assessment", secondaryCta: "Explore services",
    heroBadge: "MARKETING + AUTOMATION + AI",
    statA: "Creative production", statADetail: "Design, videos and content",
    statB: "Multichannel distribution", statBDetail: "Campaigns and social media",
    statC: "Smart follow-up", statCDetail: "CRM and WhatsApp connections",
    servicesTitle: "A creative studio connected to your business",
    servicesIntro: "From a single ad to a complete strategy. Each service is available separately or as a bundle.",
    services: [
      { icon: "01", name: "Commercials and AI video", detail: "Reels, Shorts, vertical ads, virtual presenters and explainers, with human review before publishing." },
      { icon: "02", name: "Social media and community", detail: "Editorial calendars, posts, stories, scripts and content management for relevant channels." },
      { icon: "03", name: "Meta and Google campaigns", detail: "Planning, setup and optimization of paid ads to generate measurable inquiries and opportunities." },
      { icon: "04", name: "Design and visual identity", detail: "Graphics, promotions, thumbnails, digital catalogs and content consistent with each client's brand." },
      { icon: "05", name: "YouTube and educational content", detail: "Channel strategy, long and short videos, titles, thumbnails, retention analysis and optimization." },
      { icon: "06", name: "Leads and automation", detail: "Optional connections to forms, WhatsApp, Axira and CRM to organize inquiries and support follow-up." },
    ],
    pathEyebrow: "FROM IDEAS TO OPPORTUNITIES",
    pathTitle: "We go beyond views.",
    pathSteps: ["Create content", "Publish or advertise", "Capture inquiries", "Organize leads", "Measure outcomes"],
    packagesEyebrow: "SERVICE OPTIONS",
    packagesTitle: "A plan that fits your stage",
    packagesIntro: "Scope, deliverables and pricing are agreed in a written proposal after a business assessment.",
    packages: [
      { name: "CREATE", description: "One-time production", items: ["Commercials and videos", "Graphics and promotions", "Scripts and thumbnails", "Approval before delivery"] },
      { name: "GROW", description: "Recurring content", items: ["Strategy and calendar", "Monthly creative content", "Social media adaptation", "Performance report"] },
      { name: "SCALE", description: "Campaigns and lead generation", items: ["Creative and paid ads", "Campaign optimization", "Lead follow-up", "Optional CRM integration"] },
    ],
    packageCta: "Request proposal",
    disclaimer: "Ad spend, third-party subscriptions and on-site production are quoted separately. We do not guarantee sales or specific results.",
    processEyebrow: "A PROFESSIONAL PROCESS",
    processTitle: "Creative work with clear controls and outcomes",
    process: [
      { title: "Assessment", description: "We learn about your audience, offer, budget and business goals." },
      { title: "Production and review", description: "We prepare creative, verify claims and rights, and request approval." },
      { title: "Publishing", description: "We work only with channels and accounts authorized by the client." },
      { title: "Measurement", description: "We review costs, reach, inquiries, qualified leads and opportunities." },
    ],
    footerTitle: "Your business deserves more than a post.",
    footerText: "Combine compelling content and smart operations to serve each potential customer better.",
    contact: "Request a free assessment", back: "Back to AxiomAI",
    contactNote: "Puerto Rico · Spanish and English · Business services",
    privacy: "Privacy policy",
  },
} as const;

export default function MarketingExperience() {
  const [language, setLanguage] = useState<Language>("es");
  const t = copy[language];
  return (
    <main className="am-studio">
      <div className="am-ambient" aria-hidden="true" />
      <header className="am-header">
        <Link href="/" className="am-brand" aria-label="AxiomAI Solutions">
          <Image src="/axiomai-logo-transparent.webp" alt="" width={54} height={54} />
          <span><b>AXIOMAI</b><small>MARKETING & CREATIVE STUDIO</small></span>
        </Link>
        <nav aria-label="Marketing">
          <a href="#servicios-marketing">{t.navServices}</a>
          <a href="#planes-marketing">{t.navPackages}</a>
          <a href="#proceso-marketing">{t.navProcess}</a>
          <Link href="/">{t.navHome}</Link>
        </nav>
        <div className="am-languages" aria-label="Language / Idioma">
          <button type="button" onClick={() => setLanguage("es")} aria-pressed={language === "es"}>ES</button>
          <button type="button" onClick={() => setLanguage("en")} aria-pressed={language === "en"}>EN</button>
        </div>
      </header>
      <section className="am-hero">
        <div className="am-hero-copy">
          <span className="am-eyebrow"><i /> {t.eyebrow}</span>
          <h1>{t.titleA} <span>{t.titleB}</span></h1>
          <p>{t.intro}</p>
          <div className="am-actions">
            <Link className="am-btn am-btn-primary" href="/#evaluacion">{t.heroCta} <span aria-hidden="true">↗</span></Link>
            <a className="am-btn am-btn-outline" href="#servicios-marketing">{t.secondaryCta}</a>
          </div>
        </div>
        <div className="am-hero-art" aria-label={t.heroBadge}>
          <div className="am-orbit orbit-one" /><div className="am-orbit orbit-two" />
          <div className="am-center"><span>AXIOM</span><b>CREATIVE</b><small>AI × HUMAN</small></div>
          <span className="am-float am-float-a">VIDEO / SOCIAL</span>
          <span className="am-float am-float-b">CRM + AI</span>
          <span className="am-float am-float-c">ADS / DATA</span>
        </div>
      </section>
      <div className="am-highlights" aria-label={t.heroBadge}>
        <div><strong>{t.statA}</strong><span>{t.statADetail}</span></div>
        <div><strong>{t.statB}</strong><span>{t.statBDetail}</span></div>
        <div><strong>{t.statC}</strong><span>{t.statCDetail}</span></div>
      </div>
      <section id="servicios-marketing" className="am-section">
        <div className="am-section-head"><span className="am-kicker">01 / STUDIO</span><h2>{t.servicesTitle}</h2><p>{t.servicesIntro}</p></div>
        <div className="am-service-grid">
          {t.services.map(service => <article className="am-service" key={service.icon}>
            <span className="am-number">{service.icon} /</span>
            <h3>{service.name}</h3><p>{service.detail}</p>
          </article>)}
        </div>
      </section>
      <section className="am-path">
        <div className="am-section-head"><span className="am-kicker">{t.pathEyebrow}</span><h2>{t.pathTitle}</h2></div>
        <div className="am-path-grid">
          {t.pathSteps.map((step, index) => <div key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong></div>)}
        </div>
      </section>
      <section id="planes-marketing" className="am-section">
        <div className="am-section-head"><span className="am-kicker">{t.packagesEyebrow}</span><h2>{t.packagesTitle}</h2><p>{t.packagesIntro}</p></div>
        <div className="am-plan-grid">
          {t.packages.map((plan, index) => <article className={index === 1 ? "am-plan am-plan-featured" : "am-plan"} key={plan.name}>
            <span className="am-kicker">0{index + 1} / AXIOMAI</span><h3>{plan.name}</h3>
            <p>{plan.description}</p>
            <ul>{plan.items.map(item => <li key={item}>{item}</li>)}</ul>
            <Link href="/#evaluacion" className="am-plan-link">{t.packageCta} ↗</Link>
          </article>)}
        </div>
        <p className="am-disclaimer">{t.disclaimer}</p>
      </section>
      <section id="proceso-marketing" className="am-section am-process">
        <div className="am-section-head"><span className="am-kicker">{t.processEyebrow}</span><h2>{t.processTitle}</h2></div>
        <div className="am-process-grid">
          {t.process.map((step, index) => <article key={step.title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{step.title}</h3><p>{step.description}</p></article>)}
        </div>
      </section>
      <section className="am-final">
        <span className="am-kicker">AXIOMAI MARKETING & CREATIVE STUDIO</span>
        <h2>{t.footerTitle}</h2><p>{t.footerText}</p>
        <Link className="am-btn am-btn-primary" href="/#evaluacion">{t.contact} ↗</Link>
        <small>{t.contactNote}</small>
      </section>
      <footer className="am-footer">
        <Link href="/">{t.back}</Link><span>© 2026 AxiomAI Solutions</span><Link href="/privacy">{t.privacy}</Link>
      </footer>
    </main>
  );
}
