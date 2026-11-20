import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Demo-only. Never use this credential mechanism for production CRM authentication.
const COOKIE = "axiomai_demo_qa_session";
const TWELVE_HOURS = 12 * 60 * 60 * 1000;

function safeMatch(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sessionSecret(): string | null {
  const secret = process.env.AXIOMAI_DEMO_QA_SESSION_SECRET;
  return secret && secret.length >= 48 ? secret : null;
}

function signature(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function isValidDemoAccessCode(candidate: unknown): boolean {
  if (typeof candidate !== "string" || candidate.length > 128) return false;
  const expected = process.env.AXIOMAI_DEMO_QA_ACCESS_CODE;
  const originalValid = typeof expected === "string" && expected.length >= 16 &&
    safeMatch(candidate, expected);
  // Short-lived secondary key for this QA preview only; never replaces the original.
  const temporary = process.env.AXIOMAI_DEMO_QA_TEMP_ACCESS_CODE;
  const expiresAt = Date.parse(process.env.AXIOMAI_DEMO_QA_TEMP_ACCESS_UNTIL ?? "");
  const temporaryValid = process.env.VERCEL_ENV === "preview" &&
    typeof temporary === "string" && temporary.length >= 20 &&
    Number.isFinite(expiresAt) && Date.now() < expiresAt &&
    safeMatch(candidate, temporary);
  return originalValid || temporaryValid;
}

export async function hasDemoSession(): Promise<boolean> {
  const secret = sessionSecret();
  if (!secret) return false;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 240) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || !/^\d{13}$/.test(parts[0]) ||
    !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{64}$/.test(parts[2])) return false;
  const expiry = Number(parts[0]);
  if (!Number.isSafeInteger(expiry) || expiry <= Date.now() ||
      expiry > Date.now() + TWELVE_HOURS) return false;
  return safeMatch(parts[2], signature(parts[0] + "." + parts[1], secret));
}

export function setDemoSession(response: NextResponse): NextResponse {
  const secret = sessionSecret();
  if (!secret) return response;
  const expiry = Date.now() + TWELVE_HOURS;
  const payload = String(expiry) + "." + randomBytes(16).toString("hex");
  response.cookies.set(COOKIE, payload + "." + signature(payload, secret), {
    httpOnly: true, secure: true, sameSite: "strict",
    path: "/api/demo-comercial", maxAge: TWELVE_HOURS / 1000
  });
  return response;
}

export function endDemoSession(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE, "", {
    httpOnly: true, secure: true, sameSite: "strict",
    path: "/api/demo-comercial", maxAge: 0
  });
  return response;
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    const originURL = new URL(origin);
    return originURL.host.toLowerCase() === host.toLowerCase()
      && (originURL.protocol === "https:" || originURL.hostname === "localhost");
  } catch {
    return false;
  }
}
