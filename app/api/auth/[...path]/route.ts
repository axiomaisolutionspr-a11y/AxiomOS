import { commercialIdentityAuth } from "../../../lib/commercial-identity-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = {params: Promise<{path:string[]}>};
function handler() { return commercialIdentityAuth()?.handler(); }
function unavailable() { return Response.json({error:"Acceso individual no configurado."},{status:503,headers:{"Cache-Control":"no-store"}}); }
export async function GET(request: Request, context: Context) { return handler()?.GET(request,context) ?? unavailable(); }
export async function POST(request: Request, context: Context) { return handler()?.POST(request,context) ?? unavailable(); }
export async function PUT(request: Request, context: Context) { return handler()?.PUT(request,context) ?? unavailable(); }
export async function PATCH(request: Request, context: Context) { return handler()?.PATCH(request,context) ?? unavailable(); }
export async function DELETE(request: Request, context: Context) { return handler()?.DELETE(request,context) ?? unavailable(); }
