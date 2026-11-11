import crypto from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminAttempts, adminSessions } from "@/db/schema";

const COOKIE = "ss_admin";
const HOURS = 12;

function hash(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function pinMatches(pin: string) {
  const stored = process.env.ADMIN_PIN_HASH ?? "";
  const [salt, digest] = stored.split(":");
  if (!salt || !digest || !/^\d{4,12}$/.test(pin)) return false;
  const expected = Buffer.from(digest, "hex");
  const candidate = crypto.scryptSync(pin, salt, 64);
  return expected.length === candidate.length && crypto.timingSafeEqual(expected, candidate);
}

export function adminIsConfigured() {
  return Boolean(process.env.ADMIN_PIN_HASH && process.env.ADMIN_ENCRYPTION_KEY);
}

export async function hasAdminSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  const [own] = await db.select({ expiresAt: adminSessions.expiresAt })
    .from(adminSessions)
    .where(eq(adminSessions.id, hash(token)))
    .limit(1);
  return Boolean(own && own.expiresAt > new Date());
}

export async function unlockAdmin(pin: string, req: Request): Promise<{ ok: boolean; error?: string; status?: number }> {
  if (!adminIsConfigured()) return { ok: false, error: "Admin is not configured on this server.", status: 503 };
  const forwarded = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const ipKey = hash(`ss-admin:${forwarded.slice(0, 100)}`);
  const [attempt] = await db.select().from(adminAttempts).where(eq(adminAttempts.id, ipKey)).limit(1);
  const now = Date.now();
  if (attempt?.blockedUntil && attempt.blockedUntil.getTime() > now) {
    return { ok: false, error: "Too many attempts. Try again later.", status: 429 };
  }

  if (!pinMatches(pin)) {
    const stillInWindow = attempt && !attempt.blockedUntil && attempt.updatedAt.getTime() > now - 60 * 60 * 1000;
    const failures = (stillInWindow ? attempt.failures : 0) + 1;
    const blockedUntil = failures >= 5 ? new Date(now + 15 * 60 * 1000) : null;
    await db.insert(adminAttempts).values({ id: ipKey, failures, blockedUntil, updatedAt: new Date() })
      .onConflictDoUpdate({ target: adminAttempts.id, set: { failures, blockedUntil, updatedAt: new Date() } });
    return { ok: false, error: "Incorrect PIN.", status: 401 };
  }

  await db.delete(adminAttempts).where(eq(adminAttempts.id, ipKey));
  const token = crypto.randomBytes(32).toString("base64url");
  await db.insert(adminSessions).values({ id: hash(token), expiresAt: new Date(now + HOURS * 60 * 60 * 1000) });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: HOURS * 60 * 60,
  });
  return { ok: true };
}

export async function lockAdmin() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(adminSessions).where(eq(adminSessions.id, hash(token)));
  jar.delete(COOKIE);
}
