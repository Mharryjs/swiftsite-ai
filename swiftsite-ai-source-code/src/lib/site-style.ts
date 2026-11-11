export type SiteStyle = "simple" | "modern" | "glass" | "3d" | "editorial" | "bold";

export function styleFromPrompt(prompt: string): SiteStyle {
  if (/\b(3d|three[- ]?dimensional|parallax|depth|tilt)\b/i.test(prompt)) return "3d";
  if (/\b(glass|glassmorphism|frosted|transparent|transperent|transprent)\b/i.test(prompt)) return "glass";
  if (/\b(luxury|editorial|elegant|classy|premium|magazine)\b/i.test(prompt)) return "editorial";
  if (/\b(bold|neon|cyber|futuristic|vibrant)\b/i.test(prompt)) return "bold";
  if (/\b(modern|smooth|animated)\b/i.test(prompt)) return "modern";
  // No style requested: keep it simple instead of adding effects.
  return "simple";
}

export const styleName: Record<SiteStyle, string> = {
  simple: "simple, clean",
  modern: "modern",
  glass: "transparent glass",
  "3d": "3D transparent glass",
  editorial: "editorial",
  bold: "bold",
};

export const usesTilt = (style: SiteStyle) => style === "3d";

export function styleCSS(style: SiteStyle): string {
  if (style === "simple") {
    return `
/* Simple means simple: no floating decorations, blur, tilt or gradients. */
.scene,.visual,.orb{display:none!important}
.glass{background:var(--surface);border:1px solid color-mix(in srgb,var(--ink) 14%,transparent);box-shadow:0 3px 16px rgba(17,36,27,.04);-webkit-backdrop-filter:none;backdrop-filter:none}
.tilt,.depth{transform:none!important;will-change:auto;animation:none!important}
.tilt:hover{box-shadow:0 3px 16px rgba(17,36,27,.04)}
.btn:hover{transform:none;box-shadow:none}
.card::before,.card::after{display:none}
.hero{grid-template-columns:1fr;max-width:880px;padding:80px 0 50px}
.hero h1{font-size:clamp(2.8rem,6vw,5rem);letter-spacing:-.055em}
.intro h1{font-size:clamp(2.8rem,5vw,4.7rem);letter-spacing:-.06em}
.artshape{animation:none}
.shop-hero{grid-template-columns:1fr}.shop-art{display:none}
.product-art,.post-art{background:var(--bg);font-size:42px}
.shop-art span{transform:none;box-shadow:none}
@media(max-width:850px){main{grid-template-columns:1fr}}
`;
  }

  if (style === "modern") {
    return `
/* Clean modern look, without the 3D treatment. */
.orb{display:none}
.glass{background:color-mix(in srgb,var(--surface) 95%,transparent);border:1px solid color-mix(in srgb,var(--ink) 9%,transparent);box-shadow:0 12px 34px rgba(17,36,27,.07);-webkit-backdrop-filter:none;backdrop-filter:none}
.tilt,.depth{transform:none!important;will-change:auto}
.artshape{animation:none}
.shop-art span{transform:none;box-shadow:none}
`;
  }

  if (style === "glass") {
    return `
/* Transparent panels and soft light, but no perspective/tilt. */
.glass{background:color-mix(in srgb,var(--surface) 58%,transparent);border:1px solid rgba(255,255,255,.82);box-shadow:0 22px 60px rgba(20,42,28,.11),inset 0 1px rgba(255,255,255,.88);-webkit-backdrop-filter:blur(30px) saturate(170%);backdrop-filter:blur(30px) saturate(170%)}
.tilt,.depth{transform:none!important;will-change:auto}
`;
  }

  if (style === "3d") {
    return `
/* Layered translucent glass with real mouse-follow perspective. */
.scene{background:radial-gradient(ellipse at 74% 10%,color-mix(in srgb,var(--glow) 90%,transparent),transparent 44%),radial-gradient(ellipse at 8% 78%,color-mix(in srgb,var(--accent2) 40%,transparent),transparent 47%),var(--bg)}
.glass{background:linear-gradient(142deg,rgba(255,255,255,.64),color-mix(in srgb,var(--surface) 38%,transparent) 58%,rgba(255,255,255,.19));border:1px solid rgba(255,255,255,.84);box-shadow:inset 0 1px 0 rgba(255,255,255,.95),inset -1px -1px 0 rgba(255,255,255,.32),0 34px 85px rgba(18,55,35,.20),0 12px 25px rgba(18,55,35,.08);-webkit-backdrop-filter:blur(34px) saturate(180%);backdrop-filter:blur(34px) saturate(180%)}
.tilt{transform-style:preserve-3d;will-change:transform;box-shadow:0 30px 80px rgba(18,55,35,.15)}
.depth{transform:translateZ(58px)}
.card{isolation:isolate;transform-style:preserve-3d}
.card::after{content:'';position:absolute;z-index:-1;top:-36px;right:-28px;width:110px;height:110px;border-radius:28px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent2) 48%,white),rgba(255,255,255,.14));box-shadow:inset 1px 1px 0 rgba(255,255,255,.86),0 20px 42px rgba(34,65,35,.15);transform:translateZ(-50px) rotate(23deg);pointer-events:none}
.card::before{border-color:rgba(255,255,255,.85)}
.visual{transform-style:preserve-3d}
.art{transform-style:preserve-3d}
.artshape{transform:translateZ(40px);box-shadow:inset -25px -35px 55px rgba(0,0,0,.19),20px 38px 55px rgba(20,40,30,.23)}
.arttag{transform:translateZ(65px)}
.orb.a,.orb.b,.orb.c{filter:blur(1px)}
@media(prefers-reduced-motion:reduce){.tilt,.depth,.artshape,.arttag{transform:none!important}}
`;
  }

  if (style === "editorial") {
    return `
.orb{display:none}
.glass{background:color-mix(in srgb,var(--surface) 96%,transparent);border:1px solid color-mix(in srgb,var(--ink) 12%,transparent);box-shadow:0 10px 30px rgba(30,28,20,.06);-webkit-backdrop-filter:none;backdrop-filter:none}
.tilt,.depth{transform:none!important;will-change:auto}
.artshape{animation:none}
h1,h2,h3{font-family:'Fraunces',Georgia,serif;letter-spacing:-.05em}
.hero h1{font-size:clamp(3.6rem,7vw,7rem)}
`;
  }

  return `
.scene{background:radial-gradient(circle at 80% 22%,color-mix(in srgb,var(--glow) 85%,transparent),transparent 38%),radial-gradient(circle at 15% 85%,color-mix(in srgb,var(--accent2) 45%,transparent),transparent 43%),var(--bg)}
.glass{background:color-mix(in srgb,var(--surface) 84%,transparent);border:1px solid rgba(255,255,255,.7);box-shadow:0 15px 45px rgba(20,36,30,.15);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
.tilt,.depth{transform:none!important;will-change:auto}
.artshape{animation:none;border-radius:22%;transform:rotate(-12deg)}
.btn{border-radius:9px}
`;
}
