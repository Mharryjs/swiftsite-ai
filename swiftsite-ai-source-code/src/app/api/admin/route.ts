import { NextResponse } from "next/server";
import { count, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages, toolRuns, uploads, users } from "@/db/schema";
import { hasAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validId = (id: string) => /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id);

export async function GET(req: Request) {
  if (!(await hasAdminSession())) return NextResponse.json({ error: "Owner PIN required." }, { status: 403 });
  const params = new URL(req.url).searchParams;
  const userId = params.get("user");
  const filterUser = userId && validId(userId) ? userId : null;
  const offset = Math.min(10000, Math.max(0, Number(params.get("offset")) || 0));
  const oneDayAgo = new Date(Date.now() - 86_400_000);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000);

  const [[visitorCount], [chatCount], [questionCount], [todayCount], [activeCount], [toolCount], [fileCount]] = await Promise.all([
    db.select({ n: count() }).from(users).where(eq(users.role, "visitor")),
    db.select({ n: count() }).from(conversations),
    db.select({ n: count() }).from(messages).where(eq(messages.role, "user")),
    db.select({ n: count() }).from(messages).where(sql`${messages.role} = 'user' and ${messages.createdAt} > ${oneDayAgo}`),
    db.select({ n: count() }).from(users).where(sql`${users.role} = 'visitor' and ${users.lastSeenAt} > ${fiveMinutesAgo}`),
    db.select({ n: count() }).from(toolRuns),
    db.select({ n: count() }).from(uploads),
  ]);

  const people = await db.select({
    id: users.id,
    role: users.role,
    createdAt: users.createdAt,
    lastSeenAt: users.lastSeenAt,
    chats: sql<number>`(select count(*)::int from conversations c where c.user_id = "users"."id")`,
    questions: sql<number>`(select count(*)::int from messages m join conversations c on m.conversation_id = c.id where c.user_id = "users"."id" and m.role = 'user')`,
  }).from(users).where(eq(users.role, "visitor")).orderBy(desc(users.lastSeenAt)).limit(300);

  const activity = await db.select({
    id: messages.id,
    role: messages.role,
    content: messages.content,
    kind: messages.toolName,
    createdAt: messages.createdAt,
    conversationId: conversations.id,
    title: conversations.title,
    visitorId: conversations.userId,
  }).from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(filterUser ? eq(conversations.userId, filterUser) : undefined)
    .orderBy(desc(messages.createdAt))
    .limit(100)
    .offset(offset);

  const recentChats = await db.select({
    id: conversations.id,
    title: conversations.title,
    visitorId: conversations.userId,
    createdAt: conversations.createdAt,
    messageCount: sql<number>`(select count(*)::int from messages m where m.conversation_id = "conversations"."id")`,
  }).from(conversations)
    .where(filterUser ? eq(conversations.userId, filterUser) : undefined)
    .orderBy(desc(conversations.createdAt))
    .limit(100);

  return NextResponse.json({
    stats: {
      visitors: visitorCount?.n ?? 0,
      chats: chatCount?.n ?? 0,
      questions: questionCount?.n ?? 0,
      today: todayCount?.n ?? 0,
      online: activeCount?.n ?? 0,
      tools: toolCount?.n ?? 0,
      uploads: fileCount?.n ?? 0,
    },
    people: people.map((p) => ({
      ...p,
      label: `Visitor ${p.id.slice(0, 6).toUpperCase()}`,
      // Anonymous IDs are not real-world identities.
    })),
    activity,
    recentChats,
    hasMore: activity.length === 100,
    updatedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
