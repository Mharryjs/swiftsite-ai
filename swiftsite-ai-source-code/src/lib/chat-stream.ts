import type { ToolResult } from "./tools";
import type { Media } from "./media";
import type { TeamPerson } from "./assistant";

export type ChatStreamEvent =
  | { type: "meta"; conversationId: string; title: string }
  | { type: "status"; text: string }
  | { type: "heartbeat" }
  | { type: "delta"; text: string }
  | { type: "reset"; text: string }
  | {
      type: "done";
      retryable?: boolean;
      reply: {
        content: string;
        tool: ToolResult | null;
        media: Media | null;
        suggestions: string[];
        team: TeamPerson[] | null;
      };
    };

export class ChatStreamError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ChatStreamError";
  }
}

// A stream can split a JSON line between network packets. Keep the remainder
// until the next packet arrives and insist on a final "done" event.
export async function readChatStream(
  response: Response,
  onEvent: (event: ChatStreamEvent) => void
): Promise<void> {
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new ChatStreamError(
      data.error ?? (response.status === 401 ? "Your private workspace could not be opened. Refresh the page." : "The server could not start that reply."),
      response.status
    );
  }
  if (!response.body) throw new ChatStreamError("The connection closed before the answer started.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let receivedDone = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (value) pending += decoder.decode(value, { stream: true });
      if (done) pending += decoder.decode();

      let newline: number;
      while ((newline = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, newline).trim();
        pending = pending.slice(newline + 1);
        if (!line) continue;
        let event: ChatStreamEvent;
        try {
          event = JSON.parse(line) as ChatStreamEvent;
        } catch {
          throw new ChatStreamError("The reply was interrupted while downloading. Try again.");
        }
        onEvent(event);
        if (event.type === "done") receivedDone = true;
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
  if (!receivedDone) throw new ChatStreamError("The connection stopped before the reply finished. Try again.");
}
