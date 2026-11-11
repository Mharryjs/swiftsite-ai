import { Fragment, type ReactNode } from "react";
import { CodeBlock } from "./CodeBlock";

// Small on purpose — covers what chat replies actually use:
// headings, bold/italic, inline code, fenced code, lists, links.

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${key}-${i++}`;
    if (tok.startsWith("`")) {
      out.push(
        <code key={k} className="rounded bg-leaf-950/8 px-1 py-0.5 font-mono text-[0.85em] text-leaf-800">
          {tok.slice(1, -1)}
        </code>
      );
    } else if (tok.startsWith("**")) {
      out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("[")) {
      const [, label, href] = tok.match(/\[([^\]]+)\]\(([^)]+)\)/)!;
      out.push(
        <a key={k} href={href} target="_blank" rel="noreferrer" className="text-leaf-700 underline underline-offset-2">
          {label}
        </a>
      );
    } else {
      out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    const k = `p${blocks.length}`;
    blocks.push(
      <p key={k}>
        {para.map((l, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            {inline(l, `${k}-${i}`)}
          </Fragment>
        ))}
      </p>
    );
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const k = `l${blocks.length}`;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={k} className={`space-y-1 pl-5 ${list.ordered ? "list-decimal" : "list-disc"} marker:text-leaf-600`}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it, `${k}-${i}`)}</li>
        ))}
      </Tag>
    );
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (line.trim().startsWith("```")) {
      flushPara();
      flushList();
      const lang = line.trim().slice(3);
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trim().startsWith("```")) code.push(lines[i++]!);
      const closed = i < lines.length;
      blocks.push(<CodeBlock key={`c${blocks.length}`} lang={lang} code={code.join("\n")} streaming={!closed} />);
      continue;
    }

    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      flushPara();
      flushList();
      blocks.push(
        <p key={`h${blocks.length}`} className="font-bold text-leaf-950">
          {inline(h[2]!, `h${i}`)}
        </p>
      );
      continue;
    }

    const li = line.match(/^\s*([-*•]|\d+[.)])\s+(.*)/);
    if (li) {
      flushPara();
      const ordered = /\d/.test(li[1]!);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(li[2]!);
      continue;
    }

    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();

  return <div className="space-y-3">{blocks}</div>;
}
