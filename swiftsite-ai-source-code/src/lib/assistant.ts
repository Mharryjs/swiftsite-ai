import { isTool, runTool, TOOL_CATALOG, type ToolResult } from "./tools";
import { detectLanguage } from "./language";

export type AssistantReply = {
  content: string;
  tool: ToolResult | null;
  suggestions: string[];
};

export const MODES = [
  { id: "assistant", label: "Assistant", blurb: "Everyday questions, ideas and answers." },
  { id: "developer", label: "Developer", blurb: "Write, explain and debug code." },
  { id: "writer", label: "Writer", blurb: "Emails, posts, rewrites and tone." },
  { id: "translator", label: "Translator", blurb: "Translate and polish across languages." },
  { id: "analyst", label: "Analyst", blurb: "Break down data, plans and decisions." },
  { id: "tutor", label: "Tutor", blurb: "Learn step by step with examples." },
] as const;

export type ModeId = (typeof MODES)[number]["id"];

export const isMode = (id: string): id is ModeId => MODES.some((m) => m.id === id);

const starters = ["/calc 15% of 2450", "/time karachi, london", "/password 24"];

function lead(r: ToolResult) {
  if (!r.ok) return `That didn't work — ${r.error}`;
  if (r.tool === "password") return "Here you go. It isn't saved anywhere:";
  return "Done:";
}

function tool(name: string, input: string): AssistantReply {
  const r = runTool(name, input);
  return { content: lead(r), tool: r, suggestions: [] };
}

export function helpText() {
  return (
    "Ask me anything — or use a quick command:\n\n" +
    TOOL_CATALOG.map((t) => `• ${t.usage}`).join("\n")
  );
}

// Tool-shaped messages are answered locally (fast, exact).
// Returns null when the message should go to the AI instead.
export function quickReply(raw: string): AssistantReply | null {
  const msg = raw.trim();
  const low = msg.toLowerCase();

  const slash = msg.match(/^\/([a-z0-9]+)\s*([\s\S]*)$/i);
  if (slash) {
    const name = slash[1]!.toLowerCase();
    if (name === "build" || name === "website" || name === "code") return null;
    if (name === "help") return { content: helpText(), tool: null, suggestions: starters };
    if (isTool(name)) return tool(name, slash[2]!);
    return { content: `No command called /${name}. Try /help.`, tool: null, suggestions: [] };
  }

  // Short conversational turns should feel like a conversation, not an ad.
  // These are tightly anchored: "hey bt suno, make me a site" still goes to AI.
  if (/^(?:(?:hey|hi|hello|acha|achaa|janu|jani|yaar|yar)\s+)?(?:(?:bt|bat|baat)\s+suno|suno)(?:\s+(?:janu|jani|yar|yaar))?[!?.,\s]*$/i.test(msg)) {
    return { content: "Haan sun raha hoon, batao! Kya baat hai?", tool: null, suggestions: [] };
  }
  if (/^(?:janu|jani|yaar|yar)?\s*(?:ek|aik)\s+(?:kam|kaam)\s+(?:ha|hai|he)(?:\s+(?:mujhe|mujhy|mujy))?[!?.,\s]*$/i.test(msg)) {
    return { content: "Haan, batao kya kaam hai? Main sun raha hoon.", tool: null, suggestions: [] };
  }
  if (/^(?:(?:hey|hi|hello)\s+)?(?:kasy|kaise|kese|kaisay|kesi)\s+ho(?:\s+(?:ap|aap|tum|jani|janu|janiu|yar|yaar)){0,3}[!?.,\s]*$/i.test(msg)) {
    return { content: "Main theek hoon, shukriya! Tum sunao, kaisay ho?", tool: null, suggestions: [] };
  }
  if (/^(?:oo|ooh|oh|hmm|hm|haan|han|acha|achaa|accha)[!?.,\s]*$/i.test(msg)) {
    return { content: "Haan, aage batao — main sun raha hoon.", tool: null, suggestions: [] };
  }
  if (/^(?:jaldi\s+){1,2}(?:bat|baat|bolo|batao|kro|karo)(?:\s+(?:kro|karo))?[!?.,\s]*$/i.test(msg)) {
    return { content: "Theek hai, seedha point par aate hain. Kya kaam hai?", tool: null, suggestions: [] };
  }
  if (/^(?:hi+|hello+|hey+|howdy|hwlo|helo|hlo|hllo)[!?.,\s]*$/i.test(msg)) {
    return { content: "Hey! How's it going? What can I help you with?", tool: null, suggestions: [] };
  }
  if (/^(?:salam|assalam(?:[ -]o[ -]alaikum)?)[!?.,\s]*$/i.test(msg)) {
    return { content: "Wa alaikum assalam! Kya haal hai? Batao, kis cheez mein madad karun?", tool: null, suggestions: [] };
  }
  if (/^(?:(?:tnx|thanks?|thank\s*u|shukriya|shukriya|thankyou|ty|tyvm|its? (?:okay|ok|ohky)|theek hai|achha|acha)[^\w]*)|(?:tnx|thanks|thank\s*u|shukriya|ty)\s+(?:bolna|ke liye|ka liya|karne ke liye|ke liye bhi)[!?.,\s]*$/i.test(msg)) {
    return {
      content: detectLanguage(msg) === "roman-urdu" || /tnx|shukriya|theek hai|acha|bolna|ke liye|ka liya/i.test(msg)
        ? "Koi baat nahi, yaar! Aur kya baat karni hai?"
        : "You're welcome! Anything else on your mind?",
      tool: null,
      suggestions: [],
    };
  }

  // plain maths like "15% of 240" or "(3+4)*2"
  const expr = msg
    .replace(/^(calc|calculate|what(?:'s| is)|whats|kitna hai|kitna)\s*/i, "")
    .replace(/[?=\s]+$/g, "");
  if (/^[\d\s.,+\-*/%^()]+$|^\d[\d\s.]*%\s*of\s*\d/i.test(expr) && /\d/.test(expr) && /[+\-*/^%]/.test(expr)) {
    const r = runTool("calc", expr);
    if (r.ok) return { content: lead(r), tool: r, suggestions: [] };
  }

  const conv = msg.match(/^(?:convert\s+)?(-?\d+(?:\.\d+)?)\s*([a-z/°]+)\s+(?:to|in)\s+([a-z/°]+)\s*\??$/i);
  if (conv) {
    const r = runTool("convert", `${conv[1]} ${conv[2]} to ${conv[3]}`);
    if (r.ok) return { content: lead(r), tool: r, suggestions: [] };
  }

  const t = low.match(/^(?:what(?:'s| is) the )?time (?:is it )?in ([a-z ,]+?)\??$/);
  if (t) {
    const r = runTool("time", t[1]!);
    if (r.ok) return { content: lead(r), tool: r, suggestions: [] };
  }

  return null;
}

const HARRY_LINKS = `• LinkedIn: https://www.linkedin.com/in/m-harry-js-98076442a
• GitHub: https://github.com/Mharryjs`;

const HIBA_LINKS = `• SwiftSite Instagram: https://www.instagram.com/swif.site/
• LinkedIn: https://www.linkedin.com/in/hiba-kashif-70b66b288`;

// Questions about the team get a fixed, exact answer — no AI guessing.
export type TeamPerson = "mharry" | "dua";

export function teamReply(raw: string, roman: boolean): { text: string; people: TeamPerson[] } | null {
  const text = teamText(raw, roman);
  if (!text) return null;
  const low = raw.toLowerCase();
  const dua = /dua|hiba|kashif/.test(low);
  const harry = /harry/.test(low);
  const people: TeamPerson[] = dua && !harry ? ["dua"] : harry && !dua ? ["mharry"] : ["mharry", "dua"];
  return { text, people };
}

function teamText(raw: string, roman: boolean): string | null {
  const low = raw.toLowerCase();
  const harry = /m\s*harry\s*js|mharry|harry js/.test(low);
  const dua = /dua\s*khan|\bdua\b|\bhiba\b|kashif/.test(low);
  const contact = /\b(contact|rabta|raabta|instagram|insta|linkedin|github|email|number|social|links?)\b/.test(low);
  const who = /\b(who|kon|kaun|kon hai|kaun hai|about|bare|baray|batao|tell)\b/.test(low);
  const maker = /\b(who (made|built|created|owns)|kis ne (banai|banaya|bnaya)|owner|malik|banane wala)\b/.test(low);
  const both = contact && /\b(dono|both|team|humara|hamara|our|aap|apka|apke|your)\b/.test(low);

  if (!harry && !dua && !maker && !(contact && /(swiftsite|owner|team|developer|dono|both|aap|apka|apke|tumhara|tumhare|your|you)/.test(low))) return null;
  if (!harry && !dua && !maker && !contact) return null;
  if ((harry || dua) && !who && !contact && !maker && raw.trim().split(/\s+/).length > 6) return null;

  if (roman) {
    let s = "";
    if (harry || maker || (!dua && contact))
      s += "**MharryJS** SwiftSite ke owner aur founder hain — full-stack web developer. Front end, back end, database, AI chat, login aur dashboard unka kaam hai.\n\n";
    if (dua || maker || both)
      s += "**Hiba Kashif** full-stack web developer hain (log unhein Dua bhi kehte hain). SwiftSite ka structure, visual design aur image/video tools unka kaam hain.\n\n";
    if (harry || maker || (!dua && contact)) s += `MharryJS se rabta:\n${HARRY_LINKS}\n\n`;
    if (dua || maker || both) s += `Hiba Kashif se rabta:\n${HIBA_LINKS}`;
    return s.trim();
  }
  let s = "";
  if (harry || maker || (!dua && contact))
    s += "**MharryJS** is the owner and founder of SwiftSite — a full-stack web developer who built the front end, back end, database, AI chat, login and dashboard.\n\n";
  if (dua || maker || both)
    s += "**Hiba Kashif** is a full-stack web developer (also known as Dua). She shaped SwiftSite's structure and visual design, and is credited for the image and video tools.\n\n";
  if (harry || maker || (!dua && contact)) s += `Contact MharryJS:\n${HARRY_LINKS}\n\n`;
  if (dua || maker || both) s += `Contact Hiba Kashif:\n${HIBA_LINKS}`;
  return s.trim();
}

export function offlineReply(): AssistantReply {
  return {
    content:
      "The AI is busy right now — give it a few seconds and try again. Meanwhile the quick commands still work:",
    tool: null,
    suggestions: starters,
  };
}
