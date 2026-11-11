// Shared by the browser dashboard and server-side Gemini integration.
export const GEMINI_MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-3-flash-preview"] as const;
export type GeminiModel = (typeof GEMINI_MODELS)[number];
