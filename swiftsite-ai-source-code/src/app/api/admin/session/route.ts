import { NextResponse } from "next/server";
import { adminIsConfigured, hasAdminSession, lockAdmin, unlockAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ unlocked: await hasAdminSession(), configured: adminIsConfigured() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const pin = typeof body?.pin === "string" ? body.pin : "";
  const result = await unlockAdmin(pin, req);
  return NextResponse.json(result.ok ? { unlocked: true } : { error: result.error }, {
    status: result.status ?? 200,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function DELETE() {
  await lockAdmin();
  return NextResponse.json({ unlocked: false });
}
