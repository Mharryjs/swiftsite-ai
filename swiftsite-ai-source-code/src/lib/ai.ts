import type { ModeId } from "./assistant";
import { kindOf, type LoadedFile } from "./uploads";
import { detectLanguage, type Lang } from "./language";
import { getRuntimeSettings, type RuntimeSettings } from "./site-settings";
export { detectLanguage } from "./language";
export type { Lang } from "./language";

// Use a configured Gemini/OpenAI key first. Without one, try two independent
// keyless providers. Anonymous providers can rate-limit; neither has an uptime guarantee.
// Replies are streamed as they arrive.

export const TEAM_FACTS = `About the people behind SwiftSite (use these facts exactly when asked):
- MharryJS — owner and founder of SwiftSite, full-stack web developer. Built the front end, back end, database, AI conversations, login and dashboard.
- Hiba Kashif (also known as Dua / Dua Khan) — full-stack web developer. Made the website's structure and design (page layout and visual style), and the image and video tools are credited to her.
- Never give out any email address or phone number for anyone.
- MharryJS links: LinkedIn https://www.linkedin.com/in/m-harry-js-98076442a · GitHub https://github.com/Mharryjs
- Hiba Kashif links: SwiftSite Instagram https://www.instagram.com/swif.site/ · LinkedIn https://www.linkedin.com/in/hiba-kashif-70b66b288`;

const personas: Record<ModeId, string> = {
  assistant: "You are a warm, thoughtful conversational assistant. For casual chat, reply naturally in one or two sentences. For real questions, give a complete useful answer with examples when helpful. Follow the user's tone and context.",
  developer:
    "You are a senior web developer and a clear teacher. For any website, page or UI request return ONE complete self-contained ```html file: <!DOCTYPE html>, CSS inside <style>, JavaScript inside <script>, modern, responsive and actually working — never leave placeholders like '...' or 'add more here'. For other languages use a correctly tagged code block (```js, ```python …). Keep the explanation after the code short.",
  writer: "You are a sharp writer and editor. Deliver the full piece they asked for, then offer one improvement idea.",
  translator: "You are a translator. Translate fully and naturally, then note any nuance worth knowing.",
  analyst: "You are an analyst. Break the problem down step by step with numbers or lists, and finish with your recommendation.",
  tutor: "You are a patient tutor. Teach step by step with examples, check understanding and suggest what to learn next.",
};

const base = `You are SwiftSite, a friendly AI assistant made by MharryJS with help from Hiba Kashif.

HOW TO TALK:
- Match the language and tone of the user's latest message. Roman Urdu gets Roman Urdu, English gets English.
- For a short social message such as "bt suno", "acha" or "hello": answer naturally in ONE or TWO short sentences, then invite them to continue. Do not recite your features.
- For an actual question, problem, explanation or request: answer it properly with enough useful detail and examples. Be concise if the user asks for speed; do not stop mid-answer.
- Remember earlier turns in the chat. If the user says "aur batao" or "continue", pick up the topic, rather than starting a generic greeting.
- Use paragraphs or a small list only when useful. Avoid repetitive pitches, filler, made-up personal experiences and claims that you are working on a project outside this conversation.
- Don't ask a follow-up question just to fill space; ask one only when it helps the user.

WHAT YOU CAN DO:
- Chat about anything and write complete HTML, CSS and JavaScript files. For any HTML/CSS request give one complete runnable \`\`\`html block — the chat renders a live preview.
- The app can also make images and 10-second videos: users just ask ("make an image of…", "make a video of…").
- You are SwiftSite, not the Gemini website. If asked about the provider, answer truthfully; never claim to be Google Gemini when it is not configured.

${TEAM_FACTS}`;

const langRule: Record<Lang, string> = {
  english: "LANGUAGE RULE: The user wrote in English. Reply ONLY in English — no Urdu or Roman Urdu words at all.",
  "roman-urdu":
    'LANGUAGE RULE: The user wrote in Roman Urdu. Reply ONLY in Roman Urdu with English letters, like Pakistanis text ("Ji bilkul, abhi bata deta hoon"). Never use Urdu/Arabic script. Code stays in English.',
  urdu: "LANGUAGE RULE: The user wrote in Urdu script. Reply in Urdu script.",
};

type Msg = { role: "system" | "user" | "assistant"; content: string };
type Turn = { role: string; content: string };

export function activeProvider() {
  if (process.env.GEMINI_API_KEY) return "Gemini";
  if (process.env.OPENAI_API_KEY) return "ChatGPT";
  return "SwiftSite AI";
}

// Reads an SSE response and yields each JSON payload.
async function* sse(res: Response) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        yield JSON.parse(data);
      } catch {
        // partial / keep-alive line
      }
    }
  }
}

async function* gemini(messages: Msg[], files: LoadedFile[], settings: RuntimeSettings, externalSignal?: AbortSignal) {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents: { role: string; parts: object[] }[] = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  // attach files to the latest user turn
  const last = [...contents].reverse().find((c) => c.role === "user");
  if (last) {
    for (const f of files) {
      const k = kindOf(f.mime);
      if (k === "image" || k === "video" || k === "pdf" || k === "text") {
        last.parts.push({ inline_data: { mime_type: k === "text" ? "text/plain" : f.mime, data: f.data.toString("base64") } });
      }
    }
  }
  const model = settings.model;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": settings.geminiKey ?? "" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents }),
      signal: externalSignal ? AbortSignal.any([externalSignal, AbortSignal.timeout(35_000)]) : AbortSignal.timeout(35_000),
    }
  );
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  for await (const d of sse(res)) {
    const t = d?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
    if (t) yield t as string;
  }
}

type AIError = Error & { retryAfter?: number; status?: number };

type StreamResult = { finishReason: string | null };

async function* openaiLike(
  url: string,
  key: string | null,
  model: string,
  messages: Msg[],
  firstByteMs: number,
  maxMs = 65_000,
  extra: Record<string, unknown> = {},
  onDone?: (result: StreamResult) => void,
  externalSignal?: AbortSignal
): AsyncGenerator<string> {
  const ctrl = new AbortController();
  const firstTimer = setTimeout(() => ctrl.abort(), firstByteMs);
  const totalTimer = setTimeout(() => ctrl.abort(), maxMs);
  // If the stream goes quiet mid-answer, treat it as dead instead of hanging.
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let receivedText = false;
  let finishReason: string | null = null;
  const BORED_MS = 8_000;
  const armIdle = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => ctrl.abort(), BORED_MS);
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify({ model, messages, stream: true, ...extra }),
      signal: externalSignal ? AbortSignal.any([ctrl.signal, externalSignal]) : ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let retryAfter = Number(res.headers.get("Retry-After"));
      if (!retryAfter || !Number.isFinite(retryAfter)) {
        try {
          const data = JSON.parse(body) as { error?: { retry_after?: number }; retry_after?: number };
          retryAfter = Number(data.error?.retry_after ?? data.retry_after ?? 0);
        } catch {
          retryAfter = Number(body.match(/Retry after (\d+)s/i)?.[1] ?? 0);
        }
      }
      throw Object.assign(new Error(`Provider unavailable (${res.status})`), {
        status: res.status,
        retryAfter: Number.isFinite(retryAfter) ? retryAfter : 0,
      }) as AIError;
    }
    if (!res.body) throw new Error("Provider returned an empty stream");

    armIdle();
    for await (const chunk of sse(res)) {
      const choice = chunk?.choices?.[0];
      if (choice?.finish_reason) finishReason = choice.finish_reason as string;
      const text = choice?.delta?.content;
      if (typeof text === "string" && text.length > 0) {
        if (!receivedText) clearTimeout(firstTimer);
        receivedText = true;
        armIdle();
        yield text;
      }
    }
    if (!receivedText) throw new Error("Provider returned no text");
    onDone?.({ finishReason });
  } finally {
    clearTimeout(firstTimer);
    clearTimeout(totalTimer);
    if (idleTimer) clearTimeout(idleTimer);
    ctrl.abort();
  }
}

export async function tryCustomWebsite(prompt: string, lang: Lang): Promise<string | null> {
  const messages: Msg[] = [
    {
      role: "system",
      content:
        "Build a complete, responsive single-file website for the user's exact request. Output ONLY one ```html code block with <!DOCTYPE html>, <html>, CSS in <style> and interactive JavaScript in <script>. Follow every color, theme, brand and feature they mentioned. If they ask for simple, keep it flat and simple. If they ask for 3D transparent, use backdrop-filter, depth layers and working pointer tilt. No placeholder text like 'add your code here'. For login, payments or booking, do not pretend there is a backend; validate the form and say backend integration is needed.",
    },
    { role: "user", content: prompt.slice(0, 1400) },
  ];
  let result = "";
  try {
    for await (const piece of openaiLike(
      "https://api.llm7.io/v1/chat/completions", null, "codestral-latest", messages,
      9_000, 22_000, { max_tokens: 3600 }
    )) {
      result += piece;
      if (result.length > 36_000) return null;
    }
  } catch {
    return null;
  }
  const code = result.match(/```(?:html)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (!code || !/<!doctype html/i.test(code) || !/<html\b/i.test(code) || !/<\/html>/i.test(code) ||
      !/<style\b[\s\S]*?<\/style>/i.test(code) || !/<script\b[\s\S]*?<\/script>/i.test(code)) return null;
  if (/\b(simple|minimal|plain)\b/i.test(prompt) && /backdrop-filter|rotateX\s*\(/i.test(code)) return null;
  if (/\b3d\b/i.test(prompt) && !/perspective|rotateX|translateZ/i.test(code)) return null;
  const intro = lang === "english"
    ? "Here's the complete page, built for your brief. Try **Preview** or **Download** the HTML file."
    : lang === "roman-urdu"
      ? "Yeh aap ke prompt ke mutabiq poori website hai. **Preview** se dekhein ya HTML **Download** karein."
      : "یہ آپ کی درخواست کے مطابق مکمل ویب پیج ہے۔ Preview یا Download استعمال کریں۔";
  return `${intro}\n\n\`\`\`html\n${code}\n\`\`\``;
}

export const hasConfiguredAI = (settings?: RuntimeSettings) => Boolean(settings?.geminiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);

type ProviderSpec = {
  name: string;
  url: string;
  key: string | null;
  model: string;
  firstByteMs: number;
  maxMs: number;
  extra: Record<string, unknown>;
};

function providers(settings: RuntimeSettings): ProviderSpec[] {
  const list: ProviderSpec[] = [];
  if (settings.geminiKey) list.push({ name: "Gemini", url: "gemini", key: settings.geminiKey, model: settings.model, firstByteMs: 12_000, maxMs: 40_000, extra: {} });
  if (process.env.OPENAI_API_KEY)
    list.push({
      name: "OpenAI",
      url: "https://api.openai.com/v1/chat/completions",
      key: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      firstByteMs: 12_000,
      maxMs: 40_000,
      extra: {},
    });
  // Independent anonymous gateways. No keys needed, but they can be busy or
  // rate-limited, so we rotate through them and retry within the deadline.
  list.push(
    { name: "LLM7 gpt-oss", url: "https://api.llm7.io/v1/chat/completions", key: null, model: "gpt-oss:20b", firstByteMs: 10_000, maxMs: 40_000, extra: { max_tokens: 4000 } },
    { name: "LLM7 codestral", url: "https://api.llm7.io/v1/chat/completions", key: null, model: "codestral-latest", firstByteMs: 10_000, maxMs: 40_000, extra: { max_tokens: 4000 } },
    { name: "LLM7 mistral", url: "https://api.llm7.io/v1/chat/completions", key: null, model: "mistral-Nemo-Instruct-2407", firstByteMs: 10_000, maxMs: 40_000, extra: { max_tokens: 4000 } },
    { name: "Pollinations", url: "https://text.pollinations.ai/openai", key: null, model: "openai", firstByteMs: 12_000, maxMs: 40_000, extra: { private: true } }
  );
  return list;
}

// Streams the reply. If a provider dies before sending anything we quietly
// move to the next one; once text has started we stick with it.
export const canSeeMedia = (settings: RuntimeSettings) => !!settings.geminiKey;

// Streams the reply. If a provider dies before sending anything we quietly
// move to the next one; once text has started we stick with it.
export async function* streamAI(history: Turn[], mode: ModeId, files: LoadedFile[] = [], providedSettings?: RuntimeSettings): AsyncGenerator<string> {
  const settings = providedSettings ?? await getRuntimeSettings();
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  const lang = detectLanguage(lastUser);
  const convo = history.slice(-12).map((m) => ({
    role: (m.role === "user" ? "user" : "assistant") as Msg["role"],
    content: m.content.slice(0, 6000),
  }));

  // Without Gemini the fallback model can only read text, so paste text files
  // into the prompt and describe everything else.
  if (!canSeeMedia(settings) && files.length && convo.length) {
    const notes = files.map((f) => {
      const k = kindOf(f.mime);
      if (k === "text") return `--- Attached file "${f.name}" ---\n${f.data.toString("utf8").slice(0, 20_000)}\n--- end ---`;
      return `[The user attached a ${k} "${f.name}". You cannot see its contents; if they ask about it, say image/video/PDF understanding switches on once the owner connects Gemini.]`;
    });
    convo[convo.length - 1]!.content += "\n\n" + notes.join("\n\n");
  }

  const wantsCode = /\b(html|css|javascript|js|code|coding|website|web ?page|landing page|component|script|react|python|function|button|form|navbar|portfolio)\b/i.test(lastUser);
  const persona = wantsCode && mode !== "developer" ? `${personas[mode]}\n\n${personas.developer}` : personas[mode];
  const messages: Msg[] = [
    { role: "system", content: `${base}\n\n${persona}\n\nOwner instructions: ${settings.systemPrompt}\n\nProvider status: ${settings.geminiKey ? "Gemini API configured as primary, with fallback providers if unavailable." : "Gemini API not configured. Public fallback providers are used; do not identify yourself as Gemini."}` },
    ...convo,
    { role: "system", content: langRule[lang] },
  ];

  const pool = providers(settings);
  const deadline = Date.now() + (hasConfiguredAI(settings) ? 48_000 : 30_000);
  const picks = hasConfiguredAI(settings)
    ? [...pool.filter((p) => p.name === "Gemini" || p.name === "OpenAI"), ...pool.filter((p) => p.name.startsWith("LLM7")).slice(0, 1)]
    : ["LLM7 gpt-oss", "LLM7 codestral", "LLM7 mistral", "Pollinations"]
        .map((name) => pool.find((p) => p.name === name))
        .filter((p): p is ProviderSpec => !!p);

  const run = (provider: ProviderSpec, turn: Msg[], signal: AbortSignal, finish: StreamResult) =>
    provider.name === "Gemini"
      ? gemini(turn, files, settings, signal)
      : openaiLike(provider.url, provider.key, provider.model, turn, provider.firstByteMs,
          provider.maxMs, provider.extra, (result) => { finish.finishReason = result.finishReason; }, signal);

  type RaceEntry = { provider: ProviderSpec; controller: AbortController; iterator: AsyncGenerator<string>; finish: StreamResult };
  const entries: RaceEntry[] = picks.map((provider) => {
    const controller = new AbortController();
    const finish: StreamResult = { finishReason: null };
    return { provider, controller, finish, iterator: run(provider, messages, controller.signal, finish) };
  });
  const timer = new AbortController();
  let winner: RaceEntry | null = null;
  let firstText = "";
  try {
    // First useful token wins, not the first HTTP headers. A stalled or
    // rate-limited provider can no longer hold everyone else behind it.
    const racing = entries.map(async (entry) => {
      // Give the configured Gemini model a head start. Public fallbacks only
      // enter the race if Gemini has not started replying after a few seconds.
      if (settings.geminiKey && entry.provider.name !== "Gemini") {
        await new Promise((resolve) => setTimeout(resolve, 4500));
        if (entry.controller.signal.aborted) throw new Error("Gemini already answered");
      }
      const result = await entry.iterator.next();
      if (result.done || !result.value) throw new Error(`${entry.provider.name} returned no text`);
      return { entry, text: result.value };
    });
    const first = await Promise.race([
      Promise.any(racing),
      new Promise<never>((_, reject) => {
        const t = setTimeout(() => reject(new Error("All chat routes are busy")), 16_000);
        timer.signal.addEventListener("abort", () => clearTimeout(t), { once: true });
      }),
    ]);
    winner = first.entry;
    firstText = first.text;
  } catch (error) {
    console.warn("No AI provider answered quickly:", (error as Error).message);
  } finally {
    timer.abort();
    for (const entry of entries) if (entry !== winner) entry.controller.abort();
  }

  if (!winner) {
    yield phrase("busy", lang);
    return;
  }

  let answer = firstText;
  yield firstText;
  try {
    for await (const chunk of winner.iterator) {
      answer += chunk;
      yield chunk;
      if (Date.now() >= deadline) break;
    }
  } catch (error) {
    console.warn(`${winner.provider.name} reply interrupted:`, (error as Error).message);
  } finally {
    winner.controller.abort();
  }

  // A token-limited answer can be continued once, within a short deadline.
  if (winner.finish.finishReason === "length" && Date.now() < deadline - 6_000) {
    const followUp: Msg[] = [
      ...messages,
      { role: "assistant", content: answer.slice(-10_000) },
      { role: "user", content: lang === "roman-urdu"
          ? "Jawab jahan ruka tha wahan se aage likhein, bina dohraye."
          : "Continue exactly where the reply stopped. Do not repeat the earlier text." },
    ];
    const controller = new AbortController();
    try {
      for await (const chunk of run(winner.provider, followUp, controller.signal, { finishReason: null })) {
        yield chunk;
        if (Date.now() >= deadline) break;
      }
    } catch {
      // The original response is still shown; the user can ask a follow-up.
    } finally {
      controller.abort();
    }
  }

}

// "ek pahar par sunset ki image banao" -> "sunset over a mountain, ..."
// Uses Gemini when available; otherwise strips the Urdu filler and goes as-is,
// so we don't burn the free text model's rate limit before the real reply.
export async function toEnglishPrompt(raw: string): Promise<string> {
  const cleaned = raw
    .replace(/\b(ek|aik|ki|ka|ke|ko|par|pe|mein|me|image|images|picture|pic|photo|tasveer|tasvir|video|clip|banao|bana|banado|bana do|do|please|plz|mujhe|meri|mere|liye|chahiye|make|create|generate|draw|of|an?|the)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const settings = await getRuntimeSettings();
  if (!settings.geminiKey) return (cleaned || raw).slice(0, 300) + ", highly detailed, beautiful lighting";
  let out = "";
  try {
    for await (const c of gemini(
      [
        { role: "system", content: "Rewrite the request as one short English image prompt (max 35 words): subject, setting, style, lighting. Output only the prompt." },
        { role: "user", content: raw },
      ],
      [],
      settings
    ))
      out += c;
  } catch {
    // fall back below
  }
  return (out.trim() || cleaned || raw).replace(/^["']|["']$/g, "").slice(0, 300);
}

const fixed = {
  image: ["Here's your image:", "Ye lijiye aap ki image:"],
  video: ["Here's your 10-second video — it's being put together right here in your browser:", "Ye lijiye aap ki 10 second ki video — yahin browser mein ban rahi hai:"],
  busy: [
    "Sorry, the AI didn't answer in time. Please send that again.",
    "Maazrat, AI ne waqt par jawab nahi diya. Dobara bhej dein please.",
  ],
} satisfies Record<string, [string, string]>;

export const phrase = (key: keyof typeof fixed, lang: Lang) => fixed[key][lang === "english" ? 0 : 1];
