import { NextResponse } from "next/server";
import { db } from "@/db";
import { toolRuns } from "@/db/schema";
import { isTool, runTool, TOOL_CATALOG } from "@/lib/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ tools: TOOL_CATALOG });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { tool?: unknown; input?: unknown }
      | null;
    const tool = typeof body?.tool === "string" ? body.tool.trim() : "";
    const input = typeof body?.input === "string" ? body.input.slice(0, 2000) : "";

    if (!tool) return NextResponse.json({ error: "tool is required" }, { status: 400 });
    if (!isTool(tool)) {
      return NextResponse.json(
        { error: `Unknown tool "${tool}".`, tools: TOOL_CATALOG.map((t) => t.name) },
        { status: 400 }
      );
    }

    const result = runTool(tool, input);

    // Log every run — logging must never break the tool itself.
    try {
      await db.insert(toolRuns).values({
        tool: result.tool,
        input: result.input,
        ok: result.ok,
        output: result,
      });
    } catch (e) {
      console.error("tool_runs insert failed", e);
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
