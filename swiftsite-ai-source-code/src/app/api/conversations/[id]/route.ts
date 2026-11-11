import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { hasAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function allowed(id: string) {
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) return null;
  const user = await currentUser();
  const admin = await hasAdminSession();
  if (!user && !admin) return null;
  const where = admin
    ? eq(conversations.id, id)
    : and(eq(conversations.id, id), eq(conversations.userId, user!.id));
  const [row] = await db.select().from(conversations).where(where).limit(1);
  return row ?? null;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!(await allowed(id))) return NextResponse.json({ messages: [] }, { status: 404 });
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt))
    .limit(400);
  return NextResponse.json({ messages: rows });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!(await allowed(id))) return NextResponse.json({ ok: false }, { status: 404 });
  await db.delete(conversations).where(eq(conversations.id, id));
  return NextResponse.json({ ok: true });
}
