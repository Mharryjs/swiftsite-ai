import crypto from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

const COOKIE = "ss_session";
const DAYS = 90;
export type User = typeof users.$inferSelect;

const digest = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

export async function startSession(visitorId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const maxAge = DAYS * 24 * 60 * 60;
  await db.insert(sessions).values({ id: digest(token), userId: visitorId, expiresAt: new Date(Date.now() + maxAge * 1000) });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [entry] = await db.select({ visitor: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, digest(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const visitor = entry?.visitor ?? null;
  if (visitor && Date.now() - visitor.lastSeenAt.getTime() > 60_000) {
    await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, visitor.id)).catch(() => {});
  }
  return visitor;
}
