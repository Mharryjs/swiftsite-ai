import crypto from "node:crypto";

/* Types & catalog (mirrors the original SwiftSite 12-tool set)        */

export type ToolDetail = { label: string; value: string };

export type ToolResult = {
  ok: boolean;
  tool: string;
  input: string;
  title: string;
  value: string;
  details: ToolDetail[];
  error?: string;
};

export type ToolMeta = {
  name: string;
  usage: string;
  example: string;
  description: string;
};

export const TOOL_CATALOG: ToolMeta[] = [
  { name: "calc", usage: "/calc <expression>", example: "/calc (1250 * 12) / 7 + sqrt(144)", description: "Evaluates maths safely: operators, powers, percentages and functions like sqrt, log, sin." },
  { name: "convert", usage: "/convert <value> <unit> to <unit>", example: "/convert 5 miles to km", description: "Length, weight, volume, speed, area, data, time and temperature." },
  { name: "time", usage: "/time <city, zone…>", example: "/time karachi, london, new york", description: "Current local time for any city or IANA time zone, side by side." },
  { name: "days", usage: "/days <date> <date|±n>", example: "/days today 2026-12-25", description: "Days between two dates, or the date after adding or removing days." },
  { name: "password", usage: "/password [length]", example: "/password 24", description: "Strong random passwords from a cryptographically secure generator." },
  { name: "uuid", usage: "/uuid [count]", example: "/uuid 3", description: "Random v4 UUIDs, up to 20 at a time." },
  { name: "hash", usage: "/hash [algo] <text>", example: "/hash sha256 hello swiftsite", description: "MD5, SHA-1, SHA-256, SHA-384 and SHA-512 digests of any text." },
  { name: "base64", usage: "/base64 encode|decode <text>", example: "/base64 encode Hello, world", description: "Encode text to Base64 or decode it back, UTF-8 safe." },
  { name: "json", usage: "/json [minify|validate] <json>", example: "/json {\"name\":\"SwiftSite\",\"tools\":[1,2,3]}", description: "Validate, pretty-print or minify JSON with clear error messages." },
  { name: "count", usage: "/count <text>", example: "/count The quick brown fox jumps over the lazy dog.", description: "Words, characters, sentences and estimated reading time." },
  { name: "case", usage: "/case <style> <text>", example: "/case snake Hello World From SwiftSite", description: "UPPER, lower, Title, camelCase, snake_case, kebab-case and slugs." },
  { name: "random", usage: "/random [min max]|coin|dice", example: "/random 1 100", description: "A random number in a range, a coin flip or a dice roll." },
];

const TOOL_NAMES = new Set(TOOL_CATALOG.map((t) => t.name));
export const isTool = (name: string) => TOOL_NAMES.has(name.toLowerCase());

/* Helpers                                                             */

export function formatNumber(n: number, maxFractionDigits = 8): string {
  if (!Number.isFinite(n)) throw new Error("Result is not a finite number");
  const safe = Math.abs(n) < 1e-15 ? 0 : n;
  return safe.toLocaleString("en-US", { maximumFractionDigits: maxFractionDigits });
}

function fail(tool: string, input: string, message: string): ToolResult {
  return { ok: false, tool, input, title: "", value: "", details: [], error: message };
}

/* calc — safe recursive-descent evaluator (no eval, ever)             */

const CALC_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, floor: Math.floor,
  ceil: Math.ceil, round: (x) => Math.round(x), sin: Math.sin, cos: Math.cos,
  tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  ln: Math.log, log: Math.log10, log2: Math.log2, exp: Math.exp,
  min: Math.min, max: Math.max, pow: Math.pow,
};

const CALC_CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 };

function evalExpression(source: string): number {
  const s = source.replace(/,/g, "");
  let i = 0;
  const peek = () => s[i];
  const skipWs = () => { while (i < s.length && /\s/.test(s[i])) i++; };

  function parseExpr(): number {
    let v = parseTerm();
    skipWs();
    while (peek() === "+" || peek() === "-") {
      const op = s[i++]!;
      const r = parseTerm();
      v = op === "+" ? v + r : v - r;
      skipWs();
    }
    return v;
  }
  function parseTerm(): number {
    let v = parseUnary();
    skipWs();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = s[i++]!;
      const r = parseUnary();
      if (op === "*") v = v * r;
      else if (op === "/") {
        if (r === 0) throw new Error("Division by zero");
        v = v / r;
      } else v = v % r;
      skipWs();
    }
    return v;
  }
  function parseUnary(): number {
    skipWs();
    if (peek() === "-") { i++; return -parseUnary(); }
    if (peek() === "+") { i++; return parseUnary(); }
    return parsePower();
  }
  function parsePower(): number {
    const base = parsePrimary();
    skipWs();
    if (peek() === "^") { i++; return Math.pow(base, parseUnary()); }
    return base;
  }
  function parsePrimary(): number {
    skipWs();
    const ch = peek();
    if (ch === undefined) throw new Error("Unexpected end of expression");
    if (ch === "(") {
      i++;
      const v = parseExpr();
      skipWs();
      if (peek() !== ")") throw new Error("Missing closing parenthesis");
      i++;
      return postfix(v);
    }
    if (/[\d.]/.test(ch)) {
      const m = s.slice(i).match(/^\d*\.?\d+(?:[eE][+-]?\d+)?/);
      if (!m) throw new Error("Expected a number");
      i += m[0].length;
      return postfix(parseFloat(m[0]));
    }
    if (/[a-zA-Z_]/.test(ch)) {
      const m = s.slice(i).match(/^[a-zA-Z_][a-zA-Z0-9_]*/)!;
      const name = m[0].toLowerCase();
      i += m[0].length;
      skipWs();
      if (peek() === "(") {
        i++;
        const fn = CALC_FUNCTIONS[name];
        if (!fn) throw new Error(`Unknown function "${name}"`);
        const args: number[] = [];
        skipWs();
        if (peek() !== ")") {
          for (;;) {
            args.push(parseExpr());
            skipWs();
            if (peek() === ",") { i++; continue; }
            break;
          }
        }
        if (peek() !== ")") throw new Error("Missing closing parenthesis");
        i++;
        return postfix(fn(...args));
      }
      if (name in CALC_CONSTANTS) return postfix(CALC_CONSTANTS[name]!);
      throw new Error(`Unknown name "${name}"`);
    }
    throw new Error(`Unexpected "${ch}"`);
  }
  function postfix(v: number): number {
    skipWs();
    if (peek() === "%") {
      // Postfix percent unless digits follow (then it is the modulo operator).
      let j = i + 1;
      while (j < s.length && /\s/.test(s[j])) j++;
      const next = s[j];
      if (next === undefined || !/[\d.(]/.test(next)) {
        i++;
        return v / 100;
      }
    }
    return v;
  }

  const result = parseExpr();
  skipWs();
  if (i < s.length) throw new Error(`Unexpected "${s.slice(i).trim()}"`);
  if (!Number.isFinite(result)) throw new Error("Result is not finite");
  return result;
}

function calcTool(input: string): ToolResult {
  if (!input) throw new Error("Give me something to compute, e.g. /calc 15% of 2450");
  const preprocessed = input.replace(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/gi, "($1/100)*$2");
  const value = evalExpression(preprocessed);
  return { ok: true, tool: "calc", input, title: input, value: formatNumber(value), details: [] };
}

/* convert                                                             */

type Unit = { name: string; factor: number; kind: string };
const UNITS: Record<string, Unit> = {};
function regUnit(kind: string, factor: number, ...aliases: string[]) {
  for (const a of aliases) UNITS[a] = { name: aliases[0]!, factor, kind };
}

regUnit("length", 1000, "km", "kilometer", "kilometers");
regUnit("length", 1, "m", "meter", "meters", "metre", "metres");
regUnit("length", 0.01, "cm", "centimeter", "centimeters");
regUnit("length", 0.001, "mm", "millimeter", "millimeters");
regUnit("length", 1609.344, "mi", "mile", "miles");
regUnit("length", 0.9144, "yd", "yard", "yards");
regUnit("length", 0.3048, "ft", "foot", "feet");
regUnit("length", 0.0254, "in", "inch", "inches");
regUnit("mass", 1, "kg", "kilogram", "kilograms", "kilo", "kilos");
regUnit("mass", 0.001, "g", "gram", "grams");
regUnit("mass", 1e-6, "mg", "milligram", "milligrams");
regUnit("mass", 0.45359237, "lb", "lbs", "pound", "pounds");
regUnit("mass", 0.028349523125, "oz", "ounce", "ounces");
regUnit("mass", 6.35029318, "st", "stone", "stones");
regUnit("mass", 1000, "t", "tonne", "tonnes");
regUnit("volume", 1, "l", "liter", "liters", "litre", "litres");
regUnit("volume", 0.001, "ml", "milliliter", "milliliters");
regUnit("volume", 3.785411784, "gal", "gallon", "gallons");
regUnit("volume", 0.2365882365, "cup", "cups");
regUnit("volume", 1e3, "m3", "cubicmeter", "cubicmeters");
regUnit("speed", 1000 / 3600, "kmh", "kph", "km/h");
regUnit("speed", 1609.344 / 3600, "mph", "mi/h");
regUnit("speed", 1, "ms", "m/s");
regUnit("speed", 1853 / 3600, "kn", "knot", "knots");
regUnit("area", 1, "sqm", "m2");
regUnit("area", 1e6, "sqkm", "km2");
regUnit("area", 0.09290304, "sqft", "ft2");
regUnit("area", 0.83612736, "sqyd", "yd2");
regUnit("area", 4046.8564224, "acre", "acres");
regUnit("area", 10000, "hectare", "hectares", "ha");
regUnit("data", 1, "b", "byte", "bytes");
regUnit("data", 1024, "kb", "kilobyte", "kilobytes", "kib");
regUnit("data", 1024 ** 2, "mb", "megabyte", "megabytes", "mib");
regUnit("data", 1024 ** 3, "gb", "gigabyte", "gigabytes", "gib");
regUnit("data", 1024 ** 4, "tb", "terabyte", "terabytes", "tib");
regUnit("time", 0.001, "millisecond", "milliseconds");
regUnit("time", 1, "s", "sec", "secs", "second", "seconds");
regUnit("time", 60, "minute", "minutes");
regUnit("time", 3600, "h", "hr", "hrs", "hour", "hours");
regUnit("time", 86400, "day", "days");
regUnit("time", 604800, "week", "weeks");

function convertTemp(value: number, from: string, to: string): number {
  const norm = (u: string) =>
    ({ c: "c", celcius: "c", celsius: "c", f: "f", fahrenheit: "f", k: "k", kelvin: "k" }[u] ?? "");
  const f = norm(from);
  const t = norm(to);
  if (!f || !t) throw new Error(`Unknown temperature unit "${!f ? from : to}"`);
  const celsius = f === "c" ? value : f === "f" ? ((value - 32) * 5) / 9 : value - 273.15;
  return t === "c" ? celsius : t === "f" ? (celsius * 9) / 5 + 32 : celsius + 273.15;
}

function convertTool(input: string): ToolResult {
  const m = input.match(/(-?\d+(?:\.\d+)?)\s*([a-zA-Z/°²³]+)\s+(?:to|in|as)\s+([a-zA-Z/°²³]+)\s*\??$/i);
  if (!m) throw new Error(`Try "5 miles to km" — a value, a from-unit and a to-unit`);
  const value = parseFloat(m[1]!);
  const from = m[2]!.toLowerCase().replace("°", "");
  const to = m[3]!.toLowerCase().replace("°", "");

  if (["c", "f", "k", "celsius", "fahrenheit", "kelvin"].includes(from) || ["c", "f", "k", "celsius", "fahrenheit", "kelvin"].includes(to)) {
    const out = convertTemp(value, from, to);
    return {
      ok: true, tool: "convert", input,
      title: `${formatNumber(value, 4)} ${m[2]} =`,
      value: `${formatNumber(out, 4)} ${m[3]}`,
      details: [{ label: "Kind", value: "temperature" }],
    };
  }

  const uFrom = UNITS[from];
  const uTo = UNITS[to];
  if (!uFrom) throw new Error(`I don't know the unit "${m[2]}" yet`);
  if (!uTo) throw new Error(`I don't know the unit "${m[3]}" yet`);
  if (uFrom.kind !== uTo.kind) throw new Error(`Can't convert ${uFrom.kind} to ${uTo.kind}`);

  const out = (value * uFrom.factor) / uTo.factor;
  return {
    ok: true, tool: "convert", input,
    title: `${formatNumber(value, 6)} ${uFrom.name} =`,
    value: `${formatNumber(out, 6)} ${uTo.name}`,
    details: [
      { label: "Kind", value: uFrom.kind },
      { label: "Rate", value: `1 ${uFrom.name} = ${formatNumber(uFrom.factor / uTo.factor, 6)} ${uTo.name}` },
    ],
  };
}

/* time — single place or side-by-side world clock                     */

const CITY_ZONES: Record<string, string> = {
  tokyo: "Asia/Tokyo", london: "Europe/London", paris: "Europe/Paris", berlin: "Europe/Berlin",
  amsterdam: "Europe/Amsterdam", madrid: "Europe/Madrid", rome: "Europe/Rome", lisbon: "Europe/Lisbon",
  "new york": "America/New_York", nyc: "America/New_York", chicago: "America/Chicago",
  "los angeles": "America/Los_Angeles", la: "America/Los_Angeles", "san francisco": "America/Los_Angeles",
  toronto: "America/Toronto", vancouver: "America/Vancouver", "mexico city": "America/Mexico_City",
  dubai: "Asia/Dubai", singapore: "Asia/Singapore", "hong kong": "Asia/Hong_Kong",
  sydney: "Australia/Sydney", melbourne: "Australia/Melbourne", auckland: "Pacific/Auckland",
  mumbai: "Asia/Kolkata", delhi: "Asia/Kolkata", kolkata: "Asia/Kolkata", bangalore: "Asia/Kolkata",
  karachi: "Asia/Karachi", lahore: "Asia/Karachi", islamabad: "Asia/Karachi", dhaka: "Asia/Dhaka",
  bangkok: "Asia/Bangkok", jakarta: "Asia/Jakarta", seoul: "Asia/Seoul", shanghai: "Asia/Shanghai",
  beijing: "Asia/Shanghai", moscow: "Europe/Moscow", istanbul: "Europe/Istanbul",
  cairo: "Africa/Cairo", lagos: "Africa/Lagos", nairobi: "Africa/Nairobi",
  "sao paulo": "America/Sao_Paulo", "buenos aires": "America/Argentina/Buenos_Aires",
  utc: "UTC", gmt: "UTC", zulu: "UTC",
};

function resolveZone(place: string): { zone: string; label: string } {
  const cleaned = place.replace(/[?.!]/g, "").trim();
  if (!cleaned) return { zone: "UTC", label: "UTC" };
  const key = cleaned.toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ");
  if (CITY_ZONES[key]) return { zone: CITY_ZONES[key]!, label: cleaned };
  if (/^[A-Za-z]+\/[A-Za-z_+/-]+$/.test(cleaned)) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: cleaned });
      return { zone: cleaned, label: cleaned };
    } catch { /* fall through */ }
  }
  throw new Error(`Unknown place "${cleaned}" — try "Karachi" or an IANA zone like "Europe/Paris"`);
}

function timeTool(input: string): ToolResult {
  const cleaned = input.replace(/^in\s+/i, "").trim();
  const places = cleaned
    ? cleaned.split(/,|\band\b/i).map((p) => p.trim()).filter(Boolean)
    : ["UTC"];
  if (places.length > 6) throw new Error("Six places at a time, please");

  const now = new Date();

  if (places.length === 1) {
    const { zone, label } = resolveZone(places[0]!);
    const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
    const dateFmt = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const offset = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
      .formatToParts(now).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    return {
      ok: true, tool: "time", input,
      title: label === "UTC" ? "Coordinated Universal Time" : `Local time in ${label}`,
      value: timeFmt.format(now),
      details: [
        { label: "Date", value: dateFmt.format(now) },
        { label: "Zone", value: zone },
        { label: "Offset", value: offset },
      ],
    };
  }

  const lines: string[] = [];
  const details: ToolDetail[] = [];
  for (const p of places) {
    const { zone, label } = resolveZone(p);
    const t = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit", hour12: true }).format(now);
    const offset = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
      .formatToParts(now).find((x) => x.type === "timeZoneName")?.value ?? "GMT";
    lines.push(`${t}  ·  ${label}`);
    details.push({ label, value: `${zone} (${offset})` });
  }
  return {
    ok: true, tool: "time", input,
    title: `World clock — ${places.length} places`,
    value: lines.join("\n"),
    details,
  };
}

/* days                                                                */

function daysTool(input: string): ToolResult {
  const hasToday = /\btoday\b/i.test(input);
  const dateMatches = [...input.matchAll(/(\d{4})-(\d{1,2})-(\d{1,2})/g)];
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const toUtc = (m: RegExpMatchArray) => Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!);
  const fmtDate = (utc: number) =>
    new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(utc));

  // date arithmetic: "today + 30", "2026-01-01 - 14 days", "90 days from 2026-01-01"
  const arith = input.match(/(\d{4}-\d{1,2}-\d{1,2}|today)?\s*([+-])\s*(\d+)\s*(?:days?)?/i)
    ?? input.match(/(\d+)\s*days?\s+(?:from|after)\s+(\d{4}-\d{1,2}-\d{1,2}|today)/i);
  if (arith && (hasToday || dateMatches.length === 1) && !/(to|until|between|since)/i.test(input)) {
    let baseUtc: number;
    let delta: number;
    let baseLabel: string;
    if (arith.length >= 4 && arith[2]) {
      // "today + 30"
      baseLabel = arith[1] ?? "today";
      baseUtc = /today/i.test(baseLabel) ? todayUtc : toUtc(baseLabel.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)! as RegExpMatchArray);
      delta = (arith[2] === "-" ? -1 : 1) * parseInt(arith[3]!, 10);
    } else {
      // "30 days from today"
      delta = parseInt(arith[1]!, 10);
      baseLabel = arith[2] ?? "today";
      baseUtc = /today/i.test(baseLabel) ? todayUtc : toUtc(baseLabel.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)! as RegExpMatchArray);
    }
    const target = baseUtc + delta * 86_400_000;
    return {
      ok: true, tool: "days", input,
      title: `${/today/i.test(baseLabel) ? "today" : baseLabel} ${delta >= 0 ? "+" : "−"} ${Math.abs(delta)} days`,
      value: fmtDate(target),
      details: [
        { label: "Offset", value: `${delta} days` },
        { label: "ISO", value: new Date(target).toISOString().slice(0, 10) },
      ],
    };
  }

  let a: number, b: number, labelA: string, labelB: string;
  if (dateMatches.length >= 2) {
    a = toUtc(dateMatches[0]!); b = toUtc(dateMatches[1]!);
    labelA = dateMatches[0]![0]; labelB = dateMatches[1]![0];
  } else if (dateMatches.length === 1 && (hasToday || /until|since|till/i.test(input) || true)) {
    a = todayUtc; b = toUtc(dateMatches[0]!);
    labelA = "today"; labelB = dateMatches[0]![0];
  } else {
    throw new Error(`Give me dates like "today 2026-12-25" or "2026-01-01 to 2026-12-31"`);
  }

  const diff = Math.round((b - a) / 86_400_000);
  const abs = Math.abs(diff);
  const weeks = Math.floor(abs / 7);
  const remDays = abs % 7;
  const direction = diff === 0 ? "That's today" : diff > 0 ? `In ${formatNumber(abs)} days` : `${formatNumber(abs)} days ago`;

  return {
    ok: true, tool: "days", input,
    title: `${labelA} → ${labelB}`,
    value: `${formatNumber(abs)} ${abs === 1 ? "day" : "days"}`,
    details: [
      { label: "Direction", value: direction },
      { label: "Breakdown", value: `${formatNumber(weeks)} weeks, ${remDays} ${remDays === 1 ? "day" : "days"}` },
      { label: "Hours", value: formatNumber(abs * 24) },
    ],
  };
}

/* password / uuid / random                                            */

const PASS_WORDS = [
  "amber", "basil", "cinder", "dune", "ember", "fjord", "grove", "harbor",
  "iris", "juniper", "kapok", "lumen", "meadow", "north", "onyx", "prairie",
  "quartz", "river", "sable", "tundra", "umber", "velvet", "willow", "zephyr",
  "atlas", "birch", "comet", "delta", "echo", "fable", "glacier", "halo",
];

function pickChars(chars: string, count: number): string {
  let out = "";
  for (let i = 0; i < count; i++) out += chars[crypto.randomInt(chars.length)];
  return out;
}

function passwordTool(input: string): ToolResult {
  const lenMatch = input.match(/\d+/);
  const length = Math.min(128, Math.max(4, lenMatch ? parseInt(lenMatch[0], 10) : 16));

  if (/phrase|passphrase|words/i.test(input)) {
    const words = Math.min(8, Math.max(3, lenMatch ? parseInt(lenMatch[0], 10) : 4));
    const chosen = Array.from({ length: words }, () => PASS_WORDS[crypto.randomInt(PASS_WORDS.length)]!);
    return {
      ok: true, tool: "password", input, title: "Memorable passphrase",
      value: `${chosen.join("-")}-${crypto.randomInt(90) + 10}`,
      details: [
        { label: "Words", value: String(words) },
        { label: "Entropy", value: `≈${Math.round(words * Math.log2(PASS_WORDS.length) + 6.6)} bits` },
        { label: "Strength", value: "Strong" },
      ],
    };
  }

  const lower = "abcdefghjkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%^&*()-_=+[]{};:,.?";
  let pool = lower + upper + digits + symbols;
  let classes = [lower, upper, digits, symbols];
  let modeLabel = "Letters, digits & symbols";
  if (/pin|digits? only|numeric/i.test(input)) {
    pool = "0123456789"; classes = ["0123456789"]; modeLabel = "Numeric PIN";
  } else if (/no symbols|alnum|letters? and (numbers|digits)/i.test(input)) {
    pool = lower + upper + digits; classes = [lower, upper, digits]; modeLabel = "Letters & digits";
  } else if (/letters? only/i.test(input)) {
    pool = lower + upper; classes = [lower, upper]; modeLabel = "Letters only";
  }

  let password = "";
  for (let attempt = 0; attempt < 24; attempt++) {
    password = pickChars(pool, length);
    if (classes.every((cls) => [...cls].some((c) => password.includes(c)))) break;
  }
  const entropy = Math.round(length * Math.log2(pool.length));
  const strength = entropy < 40 ? "Weak" : entropy < 64 ? "Fair" : entropy < 96 ? "Strong" : "Excellent";
  return {
    ok: true, tool: "password", input, title: "Generated on the server — never stored",
    value: password,
    details: [
      { label: "Length", value: String(length) },
      { label: "Charset", value: modeLabel },
      { label: "Entropy", value: `≈${entropy} bits` },
      { label: "Strength", value: strength },
    ],
  };
}

function uuidTool(input: string): ToolResult {
  const m = input.match(/\d+/);
  const count = Math.min(20, Math.max(1, m ? parseInt(m[0], 10) : 1));
  const ids = Array.from({ length: count }, () => crypto.randomUUID());
  return {
    ok: true, tool: "uuid", input,
    title: count === 1 ? "Random UUID v4" : `${count} random UUID v4`,
    value: ids.join("\n"),
    details: [{ label: "Variant", value: "RFC 4122 v4 (random)" }],
  };
}

function randomTool(input: string): ToolResult {
  if (/\bcoin|flip\b/i.test(input)) {
    const v = crypto.randomInt(2) === 0 ? "Heads" : "Tails";
    return { ok: true, tool: "random", input, title: "Coin flip", value: v, details: [{ label: "Source", value: "Server CSPRNG" }] };
  }
  const dice = input.match(/\bd(?:ice|ie|(\d+))\b/i);
  if (/dice|die|d\d+/i.test(input)) {
    const sides = dice?.[1] ? Math.min(1000, Math.max(2, parseInt(dice[1], 10))) : 6;
    const v = crypto.randomInt(sides) + 1;
    return { ok: true, tool: "random", input, title: `d${sides} roll`, value: String(v), details: [{ label: "Sides", value: String(sides) }, { label: "Source", value: "Server CSPRNG" }] };
  }
  const nums = [...input.matchAll(/-?\d+/g)].map((m) => parseInt(m[0], 10));
  let lo = 1, hi = 100;
  if (nums.length >= 2) { lo = Math.min(nums[0]!, nums[1]!); hi = Math.max(nums[0]!, nums[1]!); }
  else if (nums.length === 1) { hi = nums[0]!; }
  if (hi - lo > 1e12) throw new Error("That range is a bit too large");
  const v = crypto.randomInt(hi - lo + 1) + lo;
  return {
    ok: true, tool: "random", input, title: `Random integer`,
    value: formatNumber(v),
    details: [
      { label: "Range", value: `${formatNumber(lo)} – ${formatNumber(hi)}` },
      { label: "Source", value: "Server CSPRNG" },
    ],
  };
}

/* hash / base64 / json / count / case                                 */

const HASH_ALGOS = ["md5", "sha1", "sha256", "sha384", "sha512"];

function hashTool(input: string): ToolResult {
  if (!input) throw new Error("Give me text to hash, e.g. /hash sha256 hello swiftsite");
  const m = input.match(/^(\w+)\s+([\s\S]+)$/);
  let algo = "sha256";
  let text = input;
  if (m && HASH_ALGOS.includes(m[1]!.toLowerCase())) {
    algo = m[1]!.toLowerCase();
    text = m[2]!;
  }
  const digest = crypto.createHash(algo).update(text, "utf8").digest("hex");
  return {
    ok: true, tool: "hash", input,
    title: `${algo.toUpperCase()} of "${text.length > 24 ? `${text.slice(0, 24)}…` : text}"`,
    value: digest,
    details: [
      { label: "Algorithm", value: algo.toUpperCase() },
      { label: "Digest", value: `${digest.length} hex chars` },
      { label: "Input", value: `${text.length} chars` },
    ],
  };
}

function base64Tool(input: string): ToolResult {
  const m = input.match(/^(encode|decode)\b\s*([\s\S]*)$/i);
  const mode = (m?.[1] ?? "encode").toLowerCase();
  const text = (m?.[2] ?? input).trim();
  if (!text) throw new Error("Give me text, e.g. /base64 encode Hello, world");
  if (mode === "decode") {
    if (!/^[A-Za-z0-9+/=\s]+$/.test(text)) throw new Error("That doesn't look like Base64");
    const decoded = Buffer.from(text.replace(/\s+/g, ""), "base64").toString("utf8");
    return {
      ok: true, tool: "base64", input, title: "Base64 decoded", value: decoded,
      details: [{ label: "Mode", value: "decode" }, { label: "Length", value: `${decoded.length} chars` }],
    };
  }
  const encoded = Buffer.from(text, "utf8").toString("base64");
  return {
    ok: true, tool: "base64", input, title: "Base64 encoded", value: encoded,
    details: [{ label: "Mode", value: "encode" }, { label: "Length", value: `${encoded.length} chars` }],
  };
}

function jsonTool(input: string): ToolResult {
  if (!input) throw new Error('Paste some JSON, e.g. /json {"name":"SwiftSite","tools":[1,2,3]}');
  const m = input.match(/^(minify|validate|format|pretty)\b\s*([\s\S]*)$/i);
  const op = (m?.[1] ?? "pretty").toLowerCase();
  const raw = (m?.[2] ?? input).trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON — ${e instanceof Error ? e.message.replace("in JSON at", "at") : "parse error"}`);
  }

  const typeLabel = Array.isArray(parsed) ? "array" : typeof parsed;
  const sizeLabel = `${new Blob([raw]).size.toLocaleString("en-US")} bytes`;
  const shape =
    parsed !== null && typeof parsed === "object"
      ? `${Object.keys(parsed as object).length} ${Array.isArray(parsed) ? "items" : "keys"}`
      : typeLabel;

  if (op === "validate") {
    return {
      ok: true, tool: "json", input, title: "JSON validation",
      value: "Valid JSON",
      details: [
        { label: "Type", value: typeLabel },
        { label: "Shape", value: shape },
        { label: "Size", value: sizeLabel },
      ],
    };
  }
  if (op === "minify") {
    return {
      ok: true, tool: "json", input, title: "Minified JSON", value: JSON.stringify(parsed),
      details: [{ label: "Size", value: sizeLabel }],
    };
  }
  let pretty = JSON.stringify(parsed, null, 2);
  let truncated = false;
  if (pretty.length > 1600) { pretty = pretty.slice(0, 1600); truncated = true; }
  return {
    ok: true, tool: "json", input, title: "Pretty-printed JSON",
    value: pretty + (truncated ? "\n… (preview truncated)" : ""),
    details: [
      { label: "Type", value: typeLabel },
      { label: "Shape", value: shape },
      { label: "Size", value: sizeLabel },
    ],
  };
}

function countTool(input: string): ToolResult {
  if (!input) throw new Error("Give me text to count, e.g. /count The quick brown fox");
  const words = input.split(/\s+/).filter(Boolean).length;
  const chars = input.length;
  const noSpaces = input.replace(/\s/g, "").length;
  const sentences = input.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length;
  const minutes = words / 200;
  const reading = minutes < 1 ? `${Math.max(1, Math.round(minutes * 60))} sec` : `${minutes.toFixed(1)} min`;
  return {
    ok: true, tool: "count", input, title: "Text statistics",
    value: `${formatNumber(words)} ${words === 1 ? "word" : "words"}`,
    details: [
      { label: "Characters", value: formatNumber(chars) },
      { label: "No spaces", value: formatNumber(noSpaces) },
      { label: "Sentences", value: formatNumber(sentences) },
      { label: "Reading time", value: reading },
    ],
  };
}

function caseTool(input: string): ToolResult {
  if (!input) throw new Error("Give me a style and text, e.g. /case snake Hello World From SwiftSite");
  const modes: Record<string, string> = {
    upper: "upper", lower: "lower", title: "title", camel: "camel", pascal: "pascal",
    snake: "snake", kebab: "kebab", slug: "slug", constant: "constant", dot: "dot",
  };
  const m = input.match(/^(\w+)\s+([\s\S]+)$/);
  const wordify = (text: string) =>
    text.normalize("NFKD").replace(/[̀-ͯ]/g, "").split(/[^a-zA-Z0-9]+/).filter(Boolean).map((w) => w.toLowerCase());

  let mode = "";
  let text = input;
  if (m && modes[m[1]!.toLowerCase()]) {
    mode = m[1]!.toLowerCase();
    text = m[2]!;
  }
  const words = wordify(text);
  if (words.length === 0) throw new Error("Nothing to convert in that text");

  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
  const variants: Record<string, string> = {
    upper: words.join(" ").toUpperCase(),
    lower: words.join(" "),
    title: words.map(cap).join(" "),
    camel: words[0]! + words.slice(1).map(cap).join(""),
    pascal: words.map(cap).join(""),
    snake: words.join("_"),
    kebab: words.join("-"),
    slug: words.join("-"),
    constant: words.join("_").toUpperCase(),
    dot: words.join("."),
  };

  if (mode) {
    return {
      ok: true, tool: "case", input, title: `${mode} case`,
      value: variants[mode]!,
      details: [{ label: "Words", value: String(words.length) }],
    };
  }
  return {
    ok: true, tool: "case", input, title: "All cases at once",
    value: variants.title,
    details: [
      { label: "camel", value: variants.camel },
      { label: "snake", value: variants.snake },
      { label: "kebab", value: variants.kebab },
      { label: "CONSTANT", value: variants.constant },
      { label: "UPPER", value: variants.upper.length > 28 ? `${variants.upper.slice(0, 28)}…` : variants.upper },
    ],
  };
}

/* Dispatcher                                                          */

export function runTool(rawTool: string, rawInput: string): ToolResult {
  const tool = rawTool.toLowerCase().trim();
  const input = rawInput.trim();
  try {
    switch (tool) {
      case "calc": return calcTool(input);
      case "convert": return convertTool(input);
      case "time": return timeTool(input);
      case "days": return daysTool(input);
      case "password": return passwordTool(input);
      case "uuid": return uuidTool(input);
      case "hash": return hashTool(input);
      case "base64": return base64Tool(input);
      case "json": return jsonTool(input);
      case "count": return countTool(input);
      case "case": return caseTool(input);
      case "random": return randomTool(input);
      default:
        return fail(tool, input, `Unknown tool "${tool}" — type /help for the full list`);
    }
  } catch (e) {
    return fail(tool, input, e instanceof Error ? e.message : "Something went wrong on the server");
  }
}
