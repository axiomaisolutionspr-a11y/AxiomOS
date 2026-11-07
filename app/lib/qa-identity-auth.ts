import { createNeonAuth } from "@neon/auth/next/server";
import { qaIdentityAuthConfig } from "./qa-identity";

export function qaIdentityAuth() {
  const config=qaIdentityAuthConfig();
  return config ? createNeonAuth(config) : null;
}
