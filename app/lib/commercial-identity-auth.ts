import { createNeonAuth } from "@neon/auth/next/server";
import { commercialIdentityAuthConfig } from "./commercial-identity";

export function commercialIdentityAuth() {
  const config=commercialIdentityAuthConfig();
  return config ? createNeonAuth(config) : null;
}
