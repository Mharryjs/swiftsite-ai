"use client";

import { FileText, Loader2, X } from "lucide-react";

export type Attachment = { id: string; name: string; mime: string; size: number };
export type Pending = { key: string; file: File; preview: string | null; att: Attachment | null; error: string | null };

const fmtSize = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
const url = (a: Attachment) => `/api/files/${a.id}`;

export async function uploadFile(file: File): Promise<Attachment> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  return data.attachment;
}

// Chips above the composer while files upload.
export function PendingTray({ items, onRemove }: { items: Pending[]; onRemove: (key: string) => void }) {
  if (!items.length) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {items.map((p) => (
        <div key={p.key} className="glass relative flex items-center gap-2 rounded-xl py-1.5 pr-7 pl-1.5">
          {p.preview && p.file.type.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.preview} alt="" className="h-10 w-10 rounded-lg object-cover" />
          ) : p.preview && p.file.type.startsWith("video/") ? (
            <video src={p.preview} className="h-10 w-10 rounded-lg object-cover" muted />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/70 text-leaf-700">
              <FileText className="h-4 w-4" />
            </span>
          )}
          <span className="max-w-[140px] min-w-0">
            <span className="block truncate text-xs font-semibold text-leaf-950">{p.file.name}</span>
            <span className={`block text-[10px] ${p.error ? "text-red-600" : "text-leaf-950/50"}`}>
              {p.error ?? (p.att ? fmtSize(p.file.size) : "uploading…")}
            </span>
          </span>
          {!p.att && !p.error && <Loader2 className="h-3.5 w-3.5 animate-spin text-leaf-600" />}
          <button
            onClick={() => onRemove(p.key)}
            aria-label="Remove"
            className="absolute top-1 right-1 grid h-5 w-5 cursor-pointer place-items-center rounded-full bg-white/80 text-leaf-950/60 hover:text-red-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

// Shown inside the user's message bubble.
export function AttachmentList({ items }: { items: Attachment[] }) {
  return (
    <div className="mb-2 flex flex-wrap justify-end gap-2">
      {items.map((a) =>
        a.mime.startsWith("image/") ? (
          <a key={a.id} href={url(a)} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url(a)} alt={a.name} className="max-h-56 max-w-[260px] rounded-2xl border border-white/70 object-cover shadow" />
          </a>
        ) : a.mime.startsWith("video/") ? (
          <video key={a.id} src={url(a)} controls className="max-h-60 max-w-[300px] rounded-2xl border border-white/70 bg-black shadow" />
        ) : (
          <a
            key={a.id}
            href={url(a)}
            target="_blank"
            rel="noreferrer"
            className="glass flex items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-white/80"
          >
            <FileText className="h-4 w-4 shrink-0 text-leaf-700" />
            <span className="min-w-0">
              <span className="block max-w-[200px] truncate text-xs font-semibold text-leaf-950">{a.name}</span>
              <span className="block text-[10px] text-leaf-950/50">{fmtSize(a.size)}</span>
            </span>
          </a>
        )
      )}
    </div>
  );
}
