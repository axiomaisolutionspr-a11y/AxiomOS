"use server";

import { redirect } from "next/navigation";
import { commercialIdentityAuth } from "../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember } from "../../../lib/commercial-identity";

const PATH = "/prospectos/autopilot/certificacion-sesion";
const QA_BASE = "https://ep-muddy-cloud-avprxkpx.neonauth.c-11.us-east-1.aws.neon.tech/neondb/auth";
const QA_EMAIL = "axiomaisolutionspr@gmail.com";
const QA_USER_ID = "1c71749d-577e-48d8-a1ae-f4fea4f931bb";
const ORIGIN = "https://www.axiomaisolutions.org";

function result(code: string): never {
  redirect(PATH + "?resultado=" + encodeURIComponent(code));
}

async function ownerAllowed(): Promise<boolean> {
  if (process.env.VERCEL_ENV !== "production" ||
      process.env.AXIOMOS_QA_SESSION_CERT_ENABLED !== "true") return false;
  const auth = commercialIdentityAuth();
  const reader = commercialIdentityDatabase();
  if (!auth || !reader) return false;
  const { data, error } = await auth.getSession();
  if (error || !data?.user?.id) return false;
  const member = await commercialMember(reader, data.user.id);
  return member?.role === "owner";
}

async function qaRequest(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(QA_BASE + path, {
    ...options,
    cache: "no-store",
    redirect: "manual",
    headers: {
      "Origin": ORIGIN,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(12000),
  });
}

function responseCookies(response: Response): string {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const cookies = headers.getSetCookie?.() ?? [response.headers.get("set-cookie")].filter((c): c is string => Boolean(c));
  return cookies.map(c => c.split(";")[0]).filter(c => /^[^=]+=/.test(c)).join("; ");
}

async function qaSession(cookie: string): Promise<{ user?: { id?: string } } | null> {
  const res = await qaRequest("/get-session", { headers: cookie ? { Cookie: cookie } : {} });
  if (!res.ok) throw new Error("SESSION_HTTP_" + res.status);
  return (await res.json()) as { user?: { id?: string } } | null;
}

export async function requestQaSignInOtp() {
  if (!(await ownerAllowed())) result("no_autorizado");
  try {
    const r = await qaRequest("/email-otp/send-verification-otp", {
      method: "POST", body: JSON.stringify({ email: QA_EMAIL, type: "sign-in" }),
    });
    if (!r.ok) result("envio_otp_fallido");
  } catch (err) {
    // Next.js redirect is an exception; avoid redirect inside the try below.
    if (err && typeof err === "object" && "digest" in err) throw err;
    result("envio_otp_fallido");
  }
  result("otp_enviado");
}

export async function verifyRevokeQaSession(form: FormData) {
  if (!(await ownerAllowed())) result("no_autorizado");
  const otp = String(form.get("otp") ?? "").trim();
  if (!/^\d{6}$/.test(otp)) result("codigo_invalido");
  let cookie = "";
  let outcome = "prueba_fallida";
  try {
    const login = await qaRequest("/sign-in/email-otp", {
      method: "POST",
      body: JSON.stringify({ email: QA_EMAIL, otp }),
    });
    if (!login.ok) {
      outcome = "otp_rechazado";
    } else {
      cookie = responseCookies(login);
      if (!cookie) {
        outcome = "sin_cookie";
      } else {
        const before = await qaSession(cookie);
        if (before?.user?.id !== QA_USER_ID) {
          outcome = "sesion_no_confirmada";
        } else {
          const signout = await qaRequest("/sign-out", {
            method: "POST",
            headers: { Cookie: cookie },
            body: "{}",
          });
          const after = await qaSession(cookie);
          outcome = signout.ok && after === null ? "revocacion_aprobada" : "revocacion_no_aprobada";
        }
      }
    }
  } catch {
    outcome = "error_red_qa";
  } finally {
    cookie = "";
  }
  result(outcome);
}
