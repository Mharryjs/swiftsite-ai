import fs from "node:fs/promises";
import path from "node:path";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { uploads } from "@/db/schema";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
export const MAX_BYTES = 20 * 1024 * 1024;

export type Attachment = { id: string; name: string; mime: string; size: number };

export const filePath = (id: string) => path.join(UPLOAD_DIR, id.replace(/[^a-f0-9-]/gi, ""));

export const kindOf = (mime: string) =>
  mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime === "application/pdf" ? "pdf" : isText(mime) ? "text" : "file";

function isText(mime: string) {
  return (
    mime.startsWith("text/") ||
    /json|xml|javascript|typescript|csv|markdown|yaml|x-sh|x-python|sql/.test(mime)
  );
}

// Loads attachments the user owns, with bytes, for sending to the AI.
export async function loadAttachments(ids: string[], userId: string) {
  if (!ids.length) return [];
  const rows = await db.select().from(uploads).where(inArray(uploads.id, ids.slice(0, 6)));
  const mine = rows.filter((r) => r.userId === userId);
  return Promise.all(
    mine.map(async (r) => ({
      id: r.id,
      name: r.name,
      mime: r.mime,
      size: r.size,
      data: await fs.readFile(filePath(r.id)),
    }))
  );
}

export type LoadedFile = Awaited<ReturnType<typeof loadAttachments>>[number];
