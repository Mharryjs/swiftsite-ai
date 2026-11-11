import crypto from "node:crypto";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { GEMINI_MODELS, type GeminiModel } from "@/lib/gemini-models";
export { GEMINI_MODELS } from "@/lib/gemini-models";
export type { GeminiModel } from "@/lib/gemini-models";

const DEFAULTS = {
  appName: "SwiftSite Assistant",
  welcomeTitle: "Kya banayein aaj? ✨",
  welcomeSubtitle: "Ask anything. Share an image or file. Build a website or just talk.",
  systemPrompt: "Be helpful, natural and clear. Match the user's language: Roman Urdu in, Roman Urdu out; English in, English out. Remember the conversation. Reply briefly to greetings and thoroughly to actual questions.",
  model: "gemini-2.5-flash-lite" as GeminiModel,
};

export type PublicSettings = Pick<typeof DEFAULTS, "appName" | "welcomeTitle" | "welcomeSubtitle"> & { updatedAt: string };
export type RuntimeSettings = typeof DEFAULTS & { geminiKey: string | null; geminiKeySource: "dashboard" | "server" | null; updatedAt: string };

function getEncryptionKey() {
  const value = process.env.ADMIN_ENCRYPTION_KEY ?? "";
  const key = Buffer.from(value, "hex");
  if (key.length !== 32) throw new Error("ADMIN_ENCRYPTION_KEY must be 32 random bytes, hex encoded");
  return key;
}

export function encryptKey(secret: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return `v1:${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${ciphertext.toString("hex")}`;
}

function decryptKey(data: string): string | null {
  try {
    const [version, iv, tag, payload] = data.split(":");
    if (version !== "v1" || !iv || !tag || !payload) return null;
    const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(tag, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(payload, "hex")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export async function getRuntimeSettings(): Promise<RuntimeSettings> {
  let values: Record<string, string> = {};
  let updatedAt = new Date(0).toISOString();
  try {
    const rows = await db.select().from(siteSettings);
    values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    if (rows.length) updatedAt = new Date(Math.max(...rows.map((row) => row.updatedAt.getTime()))).toISOString();
  } catch (error) {
    // The landing page can still render before the schema has been pushed.
    console.warn("Settings not yet available:", (error as Error).message);
  }
  const dashboardKey = values.geminiKey ? decryptKey(values.geminiKey) : null;
  const serverKey = process.env.GEMINI_API_KEY?.trim() || null;
  const geminiKey = dashboardKey || serverKey;
  const configuredModel = values.model || process.env.GEMINI_MODEL || DEFAULTS.model;
  const model: GeminiModel = GEMINI_MODELS.includes(configuredModel as GeminiModel)
    ? configuredModel as GeminiModel : DEFAULTS.model;
  return {
    appName: values.appName?.trim() || DEFAULTS.appName,
    welcomeTitle: values.welcomeTitle?.trim() || DEFAULTS.welcomeTitle,
    welcomeSubtitle: values.welcomeSubtitle?.trim() || DEFAULTS.welcomeSubtitle,
    systemPrompt: values.systemPrompt?.trim() || DEFAULTS.systemPrompt,
    model,
    geminiKey,
    geminiKeySource: dashboardKey ? "dashboard" : serverKey ? "server" : null,
    updatedAt,
  };
}

export async function publicSettings(): Promise<PublicSettings> {
  const settings = await getRuntimeSettings();
  return {
    appName: settings.appName,
    welcomeTitle: settings.welcomeTitle,
    welcomeSubtitle: settings.welcomeSubtitle,
    updatedAt: settings.updatedAt,
  };
}

export async function setSetting(key: "appName" | "welcomeTitle" | "welcomeSubtitle" | "systemPrompt" | "model" | "geminiKey", value: string) {
  await db.insert(siteSettings).values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
}

export async function verifyGeminiKey(key: string, model: GeminiModel): Promise<{ ok: boolean; error?: string; quota?: boolean }> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Reply exactly OK" }] }], generationConfig: { maxOutputTokens: 16 } }),
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (res.ok) return { ok: true };
    if (res.status === 429) return { ok: true, quota: true, error: "Key saved, but Gemini's quota is currently full. It may work after the limit resets." };
    if (res.status === 400 || res.status === 401 || res.status === 403) return { ok: false, error: "Google rejected this key. Check the key in Google AI Studio and try again." };
    return { ok: false, error: `Google couldn't verify the key (HTTP ${res.status}). Please try again.` };
  } catch {
    return { ok: false, error: "Could not reach Google's API to test the key. Check your internet connection." };
  }
}
