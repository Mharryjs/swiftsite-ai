import { NextResponse } from "next/server";
import { ensureVisitor, visitorProfile } from "@/lib/visitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const visitor = await ensureVisitor();
    return NextResponse.json({ visitor: visitorProfile(visitor) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Visitor session failed:", error);
    return NextResponse.json({ error: "Could not start your private workspace." }, { status: 503 });
  }
}
