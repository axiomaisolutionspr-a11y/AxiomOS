"use client";

import { useState } from "react";

export default function MetaConnectionPage() {
  const [connecting, setConnecting] = useState(false);
  function connectMeta() { setConnecting(true); window.location.href = "/api/meta/oauth?return_to=/conectar/meta"; }
  return (
    <main className="meta-connect-page">
      <section className="meta-connect-card" aria-labelledby="meta-connect-title">
        <div className="meta-connect-eyebrow">AxiomAI Brain</div>
        <h1 id="meta-connect-title">Conecta tus conversaciones de Meta</h1>
        <p className="meta-connect-lead">Conecta una Página de Facebook y su cuenta profesional de Instagram para recibir mensajes y responderlos automáticamente con AxiomAI Brain.</p>
        <div className="meta-connect-list">
          <div><span>1</span><p><strong>Autoriza Meta</strong><br />Inicia sesión con Facebook y elige la Página.</p></div>
          <div><span>2</span><p><strong>Selecciona los canales</strong><br />Messenger e Instagram quedan vinculados a tu negocio.</p></div>
          <div><span>3</span><p><strong>Activa Brain</strong><br />AxiomAI procesa las consultas y responde en el canal original.</p></div>
        </div>
        <button className="meta-connect-button" type="button" onClick={connectMeta} disabled={connecting}>{connecting ? "Abriendo Meta…" : "Conectar Facebook y Messenger"}</button>
        <p className="meta-connect-note">Solo solicitamos permisos necesarios para administrar mensajes de tu Página. Nunca mostramos ni compartimos tus tokens.</p>
      </section>
      <style jsx>{`
        .meta-connect-page{min-height:100vh;display:grid;place-items:center;padding:32px;background:radial-gradient(circle at 15% 10%,#173760 0,#07111f 42%,#040811 100%);color:#eef6ff;font-family:Arial,sans-serif}
        .meta-connect-card{width:min(680px,100%);padding:clamp(28px,6vw,58px);border:1px solid rgba(118,190,255,.35);border-radius:28px;background:rgba(7,18,35,.9);box-shadow:0 30px 90px rgba(0,0,0,.4)}
        .meta-connect-eyebrow{color:#70d7ff;font-size:13px;font-weight:700;letter-spacing:.16em;text-transform:uppercase} h1{margin:14px 0 16px;font-size:clamp(32px,6vw,56px);line-height:1.02;letter-spacing:-.04em}.meta-connect-lead{margin:0;color:#bdcde0;font-size:18px;line-height:1.55}.meta-connect-list{display:grid;gap:14px;margin:30px 0}.meta-connect-list>div{display:flex;gap:14px;align-items:flex-start;padding:15px 16px;border-radius:16px;background:rgba(255,255,255,.055)}.meta-connect-list span{display:grid;place-items:center;flex:0 0 30px;height:30px;border-radius:50%;background:#226cff;font-weight:700}.meta-connect-list p{margin:0;color:#c9d6e8;line-height:1.4}.meta-connect-list strong{color:#fff}.meta-connect-button{width:100%;border:0;border-radius:14px;padding:16px 20px;background:linear-gradient(90deg,#2374ff,#744dff);color:#fff;font-size:17px;font-weight:700;cursor:pointer}.meta-connect-button:disabled{opacity:.7;cursor:wait}.meta-connect-note{margin:16px 0 0;color:#8fa4bd;font-size:13px;line-height:1.5;text-align:center}
      `}</style>
    </main>
  );
}
