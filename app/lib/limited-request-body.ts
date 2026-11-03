/**
 * Bounded request-body reader for public endpoints.
 * Stream the body instead of trusting Content-Length, which may be absent.
 * Preserve the exact UTF-8 payload string used for webhook signatures.
 */
export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body exceeds configured size limit");
    this.name = "RequestBodyTooLargeError";
  }
}

export async function readLimitedUtf8Body(request: Request, maxBytes: number): Promise<string> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new Error("Invalid body size limit");
  const declared = request.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > maxBytes) {
    throw new RequestBodyTooLargeError();
  }
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        void reader.cancel().catch(() => {});
        throw new RequestBodyTooLargeError();
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total).toString("utf8");
}
