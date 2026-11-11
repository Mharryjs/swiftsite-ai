import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages, toolRuns } from "@/db/schema";
import { isMode, quickReply, teamReply, type TeamPerson } from "@/lib/assistant";
import { detectLanguage, hasConfiguredAI, phrase, streamAI, tryCustomWebsite } from "@/lib/ai";
import { getRuntimeSettings } from "@/lib/site-settings";
import { ensureVisitor } from "@/lib/visitor";
import { buildMedia, detectMedia, type Media } from "@/lib/media";
import { buildSite, findBuildRequest, shouldTryCustomBuild } from "@/lib/site-builder";

import { loadAttachments, type Attachment } from "@/lib/uploads";
import type { ToolResult } from "@/lib/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

// Newline-delimited JSON: meta, status/heartbeat, delta, and done.
// Keeping the stream alive also avoids an idle proxy dropping a long AI reply.
export async function POST(req: Request) {
  try {
    const user = await ensureVisitor();
    const settings = await getRuntimeSettings();

    const body = await req.json().catch(() => null);
    const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
    const ids: string[] = Array.isArray(body?.attachments)
      ? body.attachments.filter((x: unknown) => typeof x === "string" && uuid.test(x)).slice(0, 6)
      : [];
    const files = await loadAttachments(ids, user.id);
    const attachments: Attachment[] = files.map(({ id, name, mime, size }) => ({ id, name, mime, size }));
    let message = typeof body?.message === "string" ? body.message.trim().slice(0, 6000) : "";
    if (!message && files.length) message = files.length === 1 ? `(sent ${files[0]!.name})` : `(sent ${files.length} files)`;
    if (!message) return NextResponse.json({ error: "Message is empty" }, { status: 400 });

    const mode = typeof body?.mode === "string" && isMode(body.mode) ? body.mode : "assistant";
    const requestId =
      typeof body?.requestId === "string" && uuid.test(body.requestId)
        ? body.requestId
        : null;
    let conversationId: string | null =
      typeof body?.conversationId === "string" && uuid.test(body.conversationId)
        ? body.conversationId
        : null;
    const title = message.length > 46 ? `${message.slice(0, 46)}…` : message;
    const lang = detectLanguage(message);

    if (conversationId) {
      const found = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, user.id)))
        .limit(1);
      if (!found.length) conversationId = null;
    }
    if (!conversationId) {
      const [row] = await db.insert(conversations).values({ title, userId: user.id }).returning({ id: conversations.id });
      conversationId = row!.id;
    }
    const convoId = conversationId;
    if (requestId) {
      const [previous] = await db
        .select({ id: messages.id })
        .from(messages)
        .where(and(eq(messages.conversationId, convoId), eq(messages.role, "user"), eq(messages.toolInput, requestId)))
        .limit(1);
      if (previous) {
        const [saved] = await db
          .select()
          .from(messages)
          .where(and(eq(messages.conversationId, convoId), eq(messages.role, "assistant"), eq(messages.toolInput, requestId)))
          .limit(1);
        if (saved) {
          const result = saved.toolOutput as Record<string, unknown> | null;
          const events = [
            { type: "meta", conversationId: convoId, title },
            {
              type: "done",
              reply: {
                content: saved.content,
                tool: result && "ok" in result ? result : null,
                media: result?.media ?? null,
                suggestions: [],
                team: result?.team ?? null,
              },
            },
          ];
          return new Response(events.map((e) => JSON.stringify(e)).join("\n") + "\n", {
            headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
          });
        }
      } else {
        await db.insert(messages).values({
          conversationId: convoId,
          role: "user",
          content: message,
          toolInput: requestId,
          toolOutput: attachments.length ? { attachments } : null,
        });
      }
    } else {
      await db.insert(messages).values({
        conversationId: convoId,
        role: "user",
        content: message,
        toolOutput: attachments.length ? { attachments } : null,
      });
    }

    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let closed = false;
        const send = (event: object) => {
          if (closed) return;
          try {
            controller.enqueue(enc.encode(JSON.stringify(event) + "\n"));
          } catch {
            closed = true;
          }
        };
        send({ type: "meta", conversationId: convoId, title });
        send({ type: "status", text: lang === "roman-urdu" ? "Aap ke liye poora jawab likh raha hoon…" : "Writing a full reply for you…" });
        const heartbeat = setInterval(() => send({ type: "heartbeat" }), 7000);

        let content = "";
        let tool: ToolResult | null = null;
        let media: Media | null = null;
        let suggestions: string[] = [];
        let team: TeamPerson[] | null = null;
        let buildPrompt: string | null = null;

        try {
          const mediaKind = files.length ? null : detectMedia(message);
          const teamAns = mediaKind ? null : teamReply(message, lang !== "english");
          const quick = mediaKind || teamAns || files.length ? null : quickReply(message);

          if (mediaKind) {
            send({ type: "status", text: "Preparing your media…" });
            media = await buildMedia(mediaKind, message);
            content = phrase(mediaKind, lang);
          } else if (teamAns) {
            content = teamAns.text;
            team = teamAns.people;
          } else if (quick) {
            content = quick.content;
            tool = quick.tool;
            suggestions = quick.suggestions;
          } else {
            // Fetch the latest turns, not the first 40 in a long conversation.
            const recent = await db
              .select({ role: messages.role, content: messages.content })
              .from(messages)
              .where(eq(messages.conversationId, convoId))
              .orderBy(desc(messages.createdAt))
              .limit(40);
            const history = recent.reverse();
            buildPrompt = files.length ? null : findBuildRequest(message, history);

            if (buildPrompt && !hasConfiguredAI(settings)) {
              send({ type: "status", text: "Building your page and live preview…" });
              content = (shouldTryCustomBuild(buildPrompt)
                ? await tryCustomWebsite(buildPrompt, lang)
                : null) ?? buildSite(buildPrompt, lang).content;
            } else {
              for await (const piece of streamAI(history, mode, files, settings)) {
                content += piece;
                send({ type: "delta", text: piece });
              }
              if (buildPrompt) {
                const html = /```html\s*[\s\S]*?<!doctype html[\s\S]*?<\/html>\s*```/i.test(content);
                const hasScript = /<script\b[\s\S]*?<\/script>/i.test(content);
                const needsJs = /\b(js|javascript|interactive|working|functional)\b/i.test(buildPrompt);
                if (!html || (needsJs && !hasScript)) {
                  // The configured model timed out or stopped mid-file: replace
                  // the partial draft with a complete, working local build.
                  content = buildSite(buildPrompt, lang).content;
                  send({ type: "reset", text: content });
                }
              }
            }
          }
        } catch (err) {
          console.error("Chat response failed:", err);
          if (buildPrompt) {
            content = buildSite(buildPrompt, lang).content;
            send({ type: "reset", text: content });
          } else if (!content) {
            content = phrase("busy", lang);
          }
        }

        const retryable = content === phrase("busy", lang);
        // Save completed answers before the final event. A busy-provider message
        // is not saved: the same request ID can be retried without duplicate turns.
        if (!retryable) {
          await db
            .insert(messages)
            .values({
              conversationId: convoId,
              role: "assistant",
              content,
              toolName: media?.kind ?? tool?.tool ?? null,
              toolInput: requestId ?? media?.prompt ?? tool?.input ?? null,
              toolOutput: media ? { media } : team ? { team } : tool,
            })
            .catch((e) => console.error("Could not save chat reply:", e));
        }

        if (tool) {
          await db.insert(toolRuns).values({ tool: tool.tool, input: tool.input, ok: tool.ok, output: tool }).catch(() => {});
        }
        clearInterval(heartbeat);
        send({ type: "done", reply: { content: retryable ? "" : content, tool, media, suggestions, team }, retryable });
        if (!closed) controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat request failed before streaming:", error);
    return NextResponse.json({ error: "Couldn't start that message. Please try again." }, { status: 503 });
  }
}
