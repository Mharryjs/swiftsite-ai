import crypto from "node:crypto";
import { db } from "@/db";
import { users } from "@/db/schema";
import { currentUser, startSession } from "@/lib/auth";

export type VisitorProfile = { id: string; label: string; role: "visitor" };

// Every browser receives a random httpOnly workspace cookie. The synthetic
// address satisfies the legacy users table; it is never a real email or shown.
export async function ensureVisitor() {
  const existing = await currentUser();
  if (existing) return existing;

  const id = crypto.randomUUID();
  const [visitor] = await db.insert(users).values({
    id,
    email: `visitor-${id}@local.invalid`,
    name: `Visitor ${id.slice(0, 6).toUpperCase()}`,
    role: "visitor",
    lastSeenAt: new Date(),
  }).returning();
  await startSession(visitor!.id);
  return visitor!;
}

export function visitorProfile(user: typeof users.$inferSelect): VisitorProfile {
  return {
    id: user.id,
    label: user.role === "visitor" ? `Visitor ${user.id.slice(0, 6).toUpperCase()}` : (user.name || "Visitor"),
    role: "visitor",
  };
}
