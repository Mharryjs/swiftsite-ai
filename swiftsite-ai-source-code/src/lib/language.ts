// Used in both browser-safe helpers and the server-side AI provider.
// Keep this file free of database, fs and API imports.
const ROMAN_URDU = new Set(
  ("hai hain hoon tha thi ka ki ke ko se mein mai mera meri mere tera teri tum aap ap apna " +
    "kya kia kyun kyu kaise kese kaisa kahan kab kon kaun kis kisne kitna nahi nhi haan ji jee " +
    "acha accha theek thik bhai yaar yar karo kro kar karna krna karein karen kariye banao bana banado " +
    "chahiye chaiye chahta chahti batao btao bata bolo dekho dikhao samjhao likho likh dena lena suno sun " +
    "aur bhi sath saath liye lye wala wali wale abhi phir pehle baad kuch kuchh sab sabse bohat bahut " +
    "zyada kam ye yeh wo woh iska uska humein mujhe mujhy tumhe salam assalam alaikum shukriya " +
    "matlab sahi galat ghalat koi kal aaj bat baat ma ho kardo krdo").split(" ")
);

export type Lang = "roman-urdu" | "urdu" | "english";

export function detectLanguage(text: string): Lang {
  if (/[\u0600-\u06FF]/.test(text)) return "urdu";
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  if (!words.length) return "english";
  const hits = words.filter((word) => ROMAN_URDU.has(word)).length;
  return hits >= 2 || hits / words.length >= 0.2 ? "roman-urdu" : "english";
}
