import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";

export function matchesSecret(provided: string, expected: string) {
  return timingSafeEqual(
    createHash("sha256").update(provided).digest(),
    createHash("sha256").update(expected).digest()
  );
}

export async function hasCatalogSession() {
  const pin = process.env.AXIOMOS_CRM_ACCESS_PIN;
  const token = (await cookies()).get("axiomos_crm_session")?.value;
  if (!pin || !token) return false;
  const expected = createHash("sha256").update(`axiomos-crm:${pin}`).digest("hex");
  return matchesSecret(token, expected);
}
