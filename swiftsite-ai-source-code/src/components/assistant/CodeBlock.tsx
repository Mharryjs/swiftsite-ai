"use client";

import { useState } from "react";
import { Check, Code2, Copy, Download, Eye, Maximize2 } from "lucide-react";

export function CodeBlock({ lang, code, streaming = false }: { lang: string; code: string; streaming?: boolean }) {
  const isHtml = /^(html|htm)$/i.test(lang) || /^\s*<(!doctype|html)/i.test(code);
  const [selectedView, setSelectedView] = useState<"preview" | "code" | null>(null);
  const view = streaming ? "code" : selectedView ?? (isHtml ? "preview" : "code");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const openFull = () => {
    const url = URL.createObjectURL(new Blob([code], { type: "text/html" }));
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const download = () => {
    const suffix = isHtml ? "html" : /^[a-z0-9]+$/i.test(lang) ? lang.toLowerCase() : "txt";
    const url = URL.createObjectURL(new Blob([code], { type: isHtml ? "text/html" : "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `swiftsite-page.${suffix}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-leaf-950/10 bg-leaf-950">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5">
        <span className="font-mono text-[10px] tracking-wider text-leaf-300 uppercase">{lang || "code"}{streaming && " · writing…"}</span>
        <div className="flex items-center gap-1">
          {isHtml && (
            <>
              <button
                onClick={() => setSelectedView("preview")}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] ${view === "preview" ? "bg-white/15 text-white" : "text-leaf-200/70 hover:text-white"}`}
              >
                <Eye className="h-3 w-3" /> Preview
              </button>
              <button
                onClick={() => setSelectedView("code")}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] ${view === "code" ? "bg-white/15 text-white" : "text-leaf-200/70 hover:text-white"}`}
              >
                <Code2 className="h-3 w-3" /> Code
              </button>
              <button onClick={openFull} title="Open in new tab" className="cursor-pointer rounded-md px-1.5 py-1 text-leaf-200/70 hover:text-white">
                <Maximize2 className="h-3 w-3" />
              </button>
            </>
          )}
          <button onClick={download} title="Download code" className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] text-leaf-200/70 hover:text-white">
            <Download className="h-3 w-3" /> <span className="hidden sm:inline">Download</span>
          </button>
          <button onClick={copy} className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] text-leaf-200/70 hover:text-white">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      {view === "preview" && isHtml && !streaming ? (
        <iframe title="Preview" srcDoc={code} sandbox="allow-scripts allow-forms allow-modals" className="h-[420px] w-full bg-white" />
      ) : (
        <pre className="max-h-[480px] overflow-auto px-4 py-3 text-[13px] leading-relaxed text-leaf-100">
          <code className="font-mono">{code}</code>
        </pre>
      )}
    </div>
  );
}
