"use client";

import { useState } from "react";

export default function CerrarSesionButton() {
  const [cerrando, setCerrando] = useState(false);

  async function cerrarSesion() {
    setCerrando(true);

    try {
      await fetch("/api/crm-auth", {
        method: "DELETE",
      });
    } finally {
      window.location.assign("/prospectos/acceso");
    }
  }

  return (
    <button
      type="button"
      onClick={cerrarSesion}
      disabled={cerrando}
      style={{
        padding: "10px 16px",
        border: "1px solid #286693",
        borderRadius: "10px",
        background: "#07182b",
        color: "#bfeaff",
        fontSize: "13px",
        fontWeight: 800,
        cursor: cerrando ? "wait" : "pointer",
        opacity: cerrando ? 0.7 : 1,
      }}
    >
      {cerrando ? "Cerrando..." : "Cerrar sesión"}
    </button>
  );
}