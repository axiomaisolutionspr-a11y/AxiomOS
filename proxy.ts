import { NextRequest, NextResponse } from "next/server";

// The public QA deployment exists only so Meta can reach this callback.
// Keep every other page and API route private to this branch deployment.
const META_QA_WEBHOOK_PATH = "/api/whatsapp-qa";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === META_QA_WEBHOOK_PATH) {
    if (request.method === "GET" || request.method === "POST") {
      return NextResponse.next();
    }

    return new NextResponse(null, {
      status: 405,
      headers: {
        Allow: "GET, POST",
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json(
    { ok: false },
    {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
