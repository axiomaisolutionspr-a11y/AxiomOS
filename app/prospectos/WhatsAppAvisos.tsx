"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function WhatsAppAvisos({ pendientes, ultimoMensajeId, autoRefresh=true }: {
  pendientes: number;
  ultimoMensajeId: string;
  autoRefresh?: boolean;
}) {
  const router = useRouter();
  const ultimo = useRef(ultimoMensajeId);
  const audio = useRef<AudioContext | null>(null);
  const [sonido, setSonido] = useState(false);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    const pausa = (event: Event) => {
      if (event.target instanceof HTMLElement && event.target.closest("form")) setPausado(true);
    };
    const guardar = () => setPausado(false);
    document.addEventListener("input", pausa);
    document.addEventListener("submit", guardar);
    return () => {
      document.removeEventListener("input", pausa);
      document.removeEventListener("submit", guardar);
    };
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const refresh = () => {
      if (!pausado && document.visibilityState === "visible") router.refresh();
    };
    const interval = window.setInterval(refresh, 20000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, pausado, autoRefresh]);

  useEffect(() => {
    const nuevo = BigInt(ultimoMensajeId) > BigInt(ultimo.current);
    ultimo.current = ultimoMensajeId;
    if (!nuevo || !sonido || !audio.current || pendientes === 0) return;
    const context = audio.current;
    if (context.state !== "running") return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.12, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
  }, [ultimoMensajeId, pendientes, sonido]);

  useEffect(() => () => { void audio.current?.close(); }, []);

  async function alternarSonido() {
    if (sonido) { setSonido(false); return; }
    try {
      audio.current ??= new AudioContext();
      await audio.current.resume();
      setSonido(audio.current.state === "running");
    } catch { setSonido(false); }
  }

  return (
    <div style={{ marginTop: 18, padding: 14, border: "1px solid #22d3ee", borderRadius: 12 }}>
      <p role="status" aria-live="polite" style={{ margin: "0 0 10px" }}>
        {pendientes > 0 ? `WhatsApp: ${pendientes} mensaje(s) sin revisar.` : "WhatsApp: sin mensajes pendientes."}
      </p>
      <div className="actions-row">
        <button className="button" type="button" aria-pressed={sonido} onClick={alternarSonido}>
          {sonido ? "Desactivar sonido" : "Activar sonido de WhatsApp"}
        </button>
        <button className="button secondary" type="button" onClick={() => { setPausado(false); router.refresh(); }}>
          Actualizar mensajes
        </button>
      </div>
      <p className="mini-value" style={{ marginTop: 10 }}>
        {pausado ? "Actualización pausada mientras editas. Guarda tus cambios antes de actualizar." : "Se actualiza cada 20 segundos mientras el CRM está visible. El sonido requiere mantener esta página abierta."}
      </p>
    </div>
  );
}
