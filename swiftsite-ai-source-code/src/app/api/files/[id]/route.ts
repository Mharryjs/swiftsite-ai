import fs from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { hasAdminSession } from "@/lib/admin-auth";
import { filePath } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) return new Response("Not found", { status: 404 });
  const user = await currentUser();
  const admin = await hasAdminSession();
  if (!user && !admin) return new Response("Workspace required", { status: 401 });

  const [row] = await db.select().from(uploads).where(eq(uploads.id, id)).limit(1);
  if (!row || (row.userId !== user?.id && !admin)) return new Response("Not found", { status: 404 });

  const data = await fs.readFile(filePath(row.id)).catch(() => null);
  if (!data) return new Response("Not found", { status: 404 });

  const safeInline = /^(image\/(png|jpeg|gif|webp)|video\/(mp4|webm|ogg)|audio\/(mpeg|ogg|wav)|application\/pdf|text\/plain)$/i.test(row.mime);
  // An uploaded HTML/SVG file must not execute scripts on our own origin.
  const contentType = safeInline ? row.mime : "application/octet-stream";
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(data.length),
      "Content-Disposition": `${safeInline ? "inline" : "attachment"}; filename="${encodeURIComponent(row.name)}"`,
      "Content-Security-Policy": "sandbox",
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
