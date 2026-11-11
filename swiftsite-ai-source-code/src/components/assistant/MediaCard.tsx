"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Film, ImageIcon, Loader2, RotateCcw } from "lucide-react";

export type Media = { kind: "image" | "video"; prompt: string; urls: string[] };

function loadImage(src: string, timeoutMs = 90_000) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const t = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    img.onload = () => {
      clearTimeout(t);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(t);
      reject(new Error("image failed"));
    };
    img.src = src;
  });
}

function ImageResult({ media }: { media: Media }) {
  const [src, setSrc] = useState(media.urls[0]!);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  return (
    <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/60">
      <div className="relative aspect-square w-full max-w-md bg-leaf-100/60">
        {state !== "ready" && (
          <div className="absolute inset-0 grid place-items-center text-center text-sm text-leaf-950/60">
            {state === "loading" ? (
              <span className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-leaf-600" />
                Painting your image… (10–30s)
              </span>
            ) : (
              <span className="flex flex-col items-center gap-2 px-6">
                The image service is busy.
                <button
                  className="btn btn-ghost !py-1.5 !text-xs"
                  onClick={() => {
                    setState("loading");
                    setSrc(`${media.urls[0]}&r=${Date.now()}`);
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Try again
                </button>
              </span>
            )}
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={media.prompt}
          onLoad={() => setState("ready")}
          onError={() => setState("error")}
          className={`h-full w-full object-cover transition-opacity duration-500 ${state === "ready" ? "opacity-100" : "opacity-0"}`}
        />
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-leaf-950/60">
          <ImageIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{media.prompt}</span>
        </span>
        {state === "ready" && (
          <a href={src} download="swiftsite-image.jpg" className="btn btn-ghost shrink-0 !px-2.5 !py-1 !text-xs">
            <Download className="h-3.5 w-3.5" /> Save
          </a>
        )}
      </div>
    </div>
  );
}

const W = 1280;
const H = 720;
const SECONDS = 10;
const FPS = 30;

function pickMime() {
  const options = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  return options.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
}

function VideoResult({ media }: { media: Media }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("Starting…");
  const [progress, setProgress] = useState(0);
  const [video, setVideo] = useState<{ url: string; ext: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let made: string | null = null;

    (async () => {
      try {
        setFailed(false);
        setVideo(null);
        // One at a time — the free image service only serves one request per visitor.
        const frames: HTMLImageElement[] = [];
        for (let i = 0; i < media.urls.length; i++) {
          if (cancelled) return;
          setStatus(`Creating scene ${i + 1} of ${media.urls.length}…`);
          setProgress(Math.round((i / media.urls.length) * 50));
          const u = media.urls[i]!;
          try {
            frames.push(await loadImage(attempt ? `${u}&r=${attempt}` : u));
          } catch {
            // skip this shot; we can still make a video from the others
          }
        }
        if (!frames.length) throw new Error("no frames");
        while (frames.length < 2) frames.push(frames[0]!);
        if (cancelled) return;

        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        const mime = pickMime();
        const stream = canvas.captureStream(FPS);
        const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6_000_000 } : undefined);
        const chunks: Blob[] = [];
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        const finished = new Promise<void>((r) => (rec.onstop = () => r()));

        const per = SECONDS / frames.length;
        const fade = 0.6;

        // Ken Burns: each shot slowly zooms and drifts, shots cross-fade.
        const drawShot = (img: HTMLImageElement, t: number, idx: number, alpha: number) => {
          const zoom = 1.04 + 0.12 * t;
          const dir = idx % 2 ? -1 : 1;
          const scale = Math.max(W / img.width, H / img.height) * zoom;
          const w = img.width * scale;
          const h = img.height * scale;
          const x = (W - w) / 2 + dir * 40 * (t - 0.5);
          const y = (H - h) / 2 + 18 * (0.5 - t);
          ctx.globalAlpha = alpha;
          ctx.drawImage(img, x, y, w, h);
          ctx.globalAlpha = 1;
        };

        setStatus("Rendering video…");
        rec.start(250);
        const start = performance.now();

        await new Promise<void>((resolve) => {
          const tick = () => {
            if (cancelled) return resolve();
            const s = (performance.now() - start) / 1000;
            if (s >= SECONDS) return resolve();
            const i = Math.min(frames.length - 1, Math.floor(s / per));
            const local = (s - i * per) / per;
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, W, H);
            drawShot(frames[i]!, local, i, 1);
            const into = s - i * per;
            if (i < frames.length - 1 && into > per - fade) {
              drawShot(frames[i + 1]!, 0, i + 1, (into - (per - fade)) / fade);
            }
            // fade in / out at the ends
            const edge = Math.min(s, SECONDS - s);
            if (edge < 0.5) {
              ctx.fillStyle = `rgba(0,0,0,${1 - edge / 0.5})`;
              ctx.fillRect(0, 0, W, H);
            }
            setProgress(50 + Math.round((s / SECONDS) * 50));
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });

        rec.stop();
        await finished;
        if (cancelled) return;
        const type = mime.split(";")[0] || "video/webm";
        made = URL.createObjectURL(new Blob(chunks, { type }));
        setVideo({ url: made, ext: type.includes("mp4") ? "mp4" : "webm" });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [media, attempt]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/60">
      <div className="relative aspect-video w-full bg-black">
        <canvas ref={canvasRef} width={W} height={H} className={`h-full w-full ${video ? "hidden" : ""}`} />
        {video && <video src={video.url} controls autoPlay loop playsInline className="h-full w-full" />}
        {!video && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pt-8 pb-3 text-xs text-white">
            {failed ? (
              <span className="flex items-center gap-2">
                The image service is busy.
                <button className="cursor-pointer font-semibold underline" onClick={() => setAttempt((a) => a + 1)}>
                  Try again
                </button>
              </span>
            ) : (
              <>
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> {status}
                </span>
                <span className="mt-2 block h-1 overflow-hidden rounded bg-white/20">
                  <span className="block h-full bg-leaf-400 transition-all" style={{ width: `${progress}%` }} />
                </span>
              </>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-leaf-950/60">
          <Film className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">10s · {media.prompt}</span>
        </span>
        {video && (
          <a href={video.url} download={`swiftsite-video.${video.ext}`} className="btn btn-ghost shrink-0 !px-2.5 !py-1 !text-xs">
            <Download className="h-3.5 w-3.5" /> Download
          </a>
        )}
      </div>
    </div>
  );
}

export function MediaCard({ media }: { media: Media }) {
  return media.kind === "image" ? <ImageResult media={media} /> : <VideoResult media={media} />;
}
