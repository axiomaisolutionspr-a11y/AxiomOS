import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const runtime = "nodejs";
export const contentType = "image/webp";
export const size = { width: 1448, height: 1086 };
export default async function Icon() {
  const bytes = await readFile(join(process.cwd(), "public/images/axiomai-hero-logo.webp"));
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": contentType } });
}
