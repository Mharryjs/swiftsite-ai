import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { ensureVisitor } from "@/lib/visitor";
import { filePath, MAX_BYTES, UPLOAD_DIR } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await ensureVisitor();

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File is too big — 20 MB max." }, { status: 413 });

  const [row] = await db
    .insert(uploads)
    .values({
      userId: user.id,
      name: file.name.slice(0, 200) || "file",
      mime: file.type || "application/octet-stream",
      size: file.size,
    })
    .returning();

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(filePath(row!.id), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ attachment: { id: row!.id, name: row!.name, mime: row!.mime, size: row!.size } });
}
