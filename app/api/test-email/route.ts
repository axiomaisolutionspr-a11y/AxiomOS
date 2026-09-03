import { NextResponse } from "next/server";
import { sendEmailAlert } from "../../lib/send-email-alert";

export async function GET() {
  try {
    const result = await sendEmailAlert({
      callerName: "Prueba AxiomAI",
      callerCompany: "AxiomAI Solutions",
      callerPhone: "+1 787 450 3679",
      callReason: "Prueba de alerta por correo",
      callClassification: "Prueba del sistema",
      callOutcome: "Alerta de correo generada correctamente",
      nextAction: "Confirmar recepción del correo",
      callSummary:
        "Prueba manual del sistema de alertas de AxiomOS utilizando Resend.",
    });

    return NextResponse.json({
      ok: true,
      message: "Prueba de correo ejecutada",
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido al enviar el correo",
      },
      { status: 500 }
    );
  }
}