import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { encryptKey, GEMINI_MODELS, getRuntimeSettings, setSetting, verifyGeminiKey, type GeminiModel } from "@/lib/site-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unauthorized = () => NextResponse.json({ error: "Owner PIN required." }, { status: 403 });

export async function GET() {
  if (!(await hasAdminSession())) return unauthorized();
  const s = await getRuntimeSettings();
  return NextResponse.json({
    appName: s.appName,
    welcomeTitle: s.welcomeTitle,
    welcomeSubtitle: s.welcomeSubtitle,
    systemPrompt: s.systemPrompt,
    model: s.model,
    geminiKeySet: Boolean(s.geminiKey),
    keySource: s.geminiKeySource,
    updatedAt: s.updatedAt,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!(await hasAdminSession())) return unauthorized();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid settings." }, { status: 400 });
  const model: GeminiModel = typeof body.model === "string" && GEMINI_MODELS.includes(body.model as GeminiModel)
    ? body.model as GeminiModel : "gemini-2.5-flash-lite";

  if (body.action === "test") {
    const key = typeof body.key === "string" && body.key.trim()
      ? body.key.trim() : (await getRuntimeSettings()).geminiKey;
    if (!key) return NextResponse.json({ error: "Add a Gemini API key first." }, { status: 400 });
    const result = await verifyGeminiKey(key, model);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  if (body.action === "clearKey") {
    await setSetting("geminiKey", "");
    return NextResponse.json({ ok: true, geminiKeySet: Boolean(process.env.GEMINI_API_KEY), note: process.env.GEMINI_API_KEY ? "Server environment key remains active." : "Key removed." });
  }

  if (body.action !== "save") return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  const fields = {
    appName: typeof body.appName === "string" ? body.appName.trim().slice(0, 60) : "",
    welcomeTitle: typeof body.welcomeTitle === "string" ? body.welcomeTitle.trim().slice(0, 110) : "",
    welcomeSubtitle: typeof body.welcomeSubtitle === "string" ? body.welcomeSubtitle.trim().slice(0, 220) : "",
    systemPrompt: typeof body.systemPrompt === "string" ? body.systemPrompt.trim().slice(0, 4000) : "",
  };
  if (!fields.appName || !fields.welcomeTitle || !fields.welcomeSubtitle) {
    return NextResponse.json({ error: "App name and welcome text cannot be blank." }, { status: 400 });
  }
  const newKey = typeof body.geminiKey === "string" ? body.geminiKey.trim() : "";
  let warning: string | undefined;
  const current = await getRuntimeSettings();
  const keyToVerify = newKey || (model !== current.model ? current.geminiKey : null);
  if (keyToVerify) {
    const check = await verifyGeminiKey(keyToVerify, model);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
    warning = check.quota ? check.error : undefined;
  }
  for (const [key, value] of Object.entries(fields)) {
    await setSetting(key as keyof typeof fields, value);
  }
  await setSetting("model", model);
  if (newKey) await setSetting("geminiKey", encryptKey(newKey));
  return NextResponse.json({ ok: true, geminiKeySet: Boolean(newKey || (await getRuntimeSettings()).geminiKey), warning });
}
