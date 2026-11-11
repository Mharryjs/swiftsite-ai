# SwiftSite Assistant

Installable AI chat and website builder, built with Next.js App Router, TypeScript, PostgreSQL and Drizzle ORM.

## Start the project

```bash
npm install
cp .env.example .env
# Edit .env: set DATABASE_URL, ADMIN_PIN_HASH and ADMIN_ENCRYPTION_KEY
npx drizzle-kit push
npm run dev
```

The public site is at `/`. The installable app opens directly at `/chat`; there is **no email sign-in**. Each browser gets its own private, random httpOnly visitor session. The shortcut **Windows + Ctrl + Shift + Z** (or **Ctrl + Shift + Z** if intercepted) opens the owner dashboard at `/dashboard`. That screen also has a PIN prompt, so the shortcut is not a security boundary.

### Owner PIN

The owner PIN is **never stored in the repository**. Generate a scrypt hash for `ADMIN_PIN_HASH` as shown in `.env.example`. Keep the PIN private and choose a longer PIN on a public deployment: a four-digit PIN can be guessed even with rate limiting. Failed attempts are rate-limited in PostgreSQL and the unlocked admin session is an httpOnly cookie valid for 12 hours.

### Gemini connection

`gemini.google.com` is Google's consumer website; third-party apps cannot link its personal chat sessions to their own backend. SwiftSite uses the **official Gemini API** instead. The owner can add a key from [Google AI Studio](https://aistudio.google.com/apikey) in `/dashboard` → **Settings**. It is tested against Google, encrypted at rest using `ADMIN_ENCRYPTION_KEY` and never returned to the browser. Optionally set `GEMINI_API_KEY` in `.env` as a server-side secret. The default model is `gemini-2.5-flash-lite`.

Without a Gemini key, free public fallback routes are used. They can rate-limit or fail, so unlimited instant AI responses cannot be guaranteed without a reliable provider. Calculator and other built-in tools run locally on the server.

### Install on phone or laptop

The chat header has **Install app**. On iPhone use **Share → Add to Home Screen**; on Android/desktop use the browser's Install action. The PWA manifest starts at `/chat` and standalone mode keeps the assistant as the primary screen. The service worker never caches conversations, files, API requests or admin pages.

## What works

- Streaming chat in English, Roman Urdu or Urdu with six selectable modes.
- Anonymous per-browser history in PostgreSQL and file attachments up to 20 MB.
- Single-file HTML/CSS/JS page building with live sandboxed preview and download.
- Twelve quick slash commands, including calculations, conversions and JSON.
- Image requests and a browser-created 10-second video from generated scenes (availability depends on the external image service).
- PIN-protected owner dashboard: live visitor counts, conversation feed, chat detail, Gemini model/key test, assistant instructions, welcome text, and app name. Settings are read from the database on every new AI request, and visible chat branding refreshes automatically.

## Files & security

- `src/db/schema.ts`: Drizzle tables for anonymous visitors, sessions, chats, uploads, settings and PIN access.
- `src/lib/ai.ts`: Gemini streaming and fallback providers; all keys remain server-side.
- `src/lib/site-settings.ts`: encrypted Gemini key and live admin settings.
- `src/app/dashboard`: admin PIN prompt and dashboard UI.
- `uploads/`: local user file data, excluded from Git.
- `public/sw.js` and `src/app/manifest.ts`: install support.

**Never commit `.env`, `.env.local`, uploads or database credentials.** `.gitignore` already covers them. On production hosting, configure a persistent upload volume; an ephemeral container will not preserve uploaded files across restarts. Visitors have anonymous IDs, not verified real-world identities.

## Validation

```bash
npx next typegen
npm exec tsc -- --noEmit --pretty false
npm run build
```

## Credits

MharryJS built the core platform. Hiba Kashif shaped the structure, visual design and image/video tools.
