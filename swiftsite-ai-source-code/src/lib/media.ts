import { toEnglishPrompt } from "./ai";

export type Media = { kind: "image" | "video"; prompt: string; urls: string[] };

const imageWords = /\b(image|images|picture|pic|photo|tasveer|tasvir|drawing|painting|logo|wallpaper|poster|illustration)\b/i;
const makeWords = /\b(bana|banao|banado|bana do|banaen|banaye|banaiye|generate|create|make|draw|design|paint|chahiye|dikhao)\b/i;

export function detectMedia(msg: string): "image" | "video" | null {
  const m = msg.trim();
  if (/^\/image\b/i.test(m)) return "image";
  if (/^\/video\b/i.test(m)) return "video";
  if (/\b(video|clip|animation)\b/i.test(m) && makeWords.test(m)) return "video";
  if (imageWords.test(m) && makeWords.test(m)) return "image";
  if (/^(draw|paint|sketch)\b/i.test(m)) return "image";
  return null;
}

const imgUrl = (prompt: string, seed: number, w = 1024, h = 1024) =>
  `/api/media/image?prompt=${encodeURIComponent(prompt)}&seed=${seed}&w=${w}&h=${h}`;

// Four shots of the same subject; the client animates them into a 10s clip.
const shots = ["wide establishing shot", "medium shot", "close-up detail", "dramatic final shot, golden light"];

export async function buildMedia(kind: "image" | "video", msg: string): Promise<Media> {
  const raw = msg.replace(/^\/(image|video)\s*/i, "").trim() || "a beautiful green landscape";
  const prompt = await toEnglishPrompt(raw);
  const seed = Math.floor(Math.random() * 1_000_000);

  if (kind === "image") return { kind, prompt, urls: [imgUrl(prompt, seed)] };

  return {
    kind,
    prompt,
    urls: shots.map((s, i) => imgUrl(`${prompt}, ${s}, cinematic, consistent style`, seed + i, 960, 540)),
  };
}
