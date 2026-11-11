export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Fetches the picture from the free image service and streams it back from
// our own domain. Same-origin images can be drawn into a <canvas>, which is
// what the video maker needs. The service is rate limited, so retry a few times.
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const prompt = (p.get("prompt") ?? "").slice(0, 600).trim();
  if (!prompt) return new Response("prompt required", { status: 400 });
  const seed = Number(p.get("seed")) || 1;
  const w = Math.min(1280, Math.max(256, Number(p.get("w")) || 1024));
  const h = Math.min(1280, Math.max(256, Number(p.get("h")) || 1024));

  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux`;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      const type = res.headers.get("content-type") ?? "";
      if (res.ok && type.startsWith("image/")) {
        return new Response(await res.arrayBuffer(), {
          headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" },
        });
      }
    } catch {
      // timeout — fall through and retry
    }
    await new Promise((r) => setTimeout(r, 3000 + attempt * 2500));
  }
  return new Response("Image service is busy, try again in a minute.", { status: 503 });
}
