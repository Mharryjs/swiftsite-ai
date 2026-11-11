import Link from "next/link";

export function LogoMark({ size = 36 }: { size?: number }) {
  const id = `ss${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id={`${id}-disc`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#f3fbe9" />
          <stop offset="0.55" stopColor="#dcf2c4" />
          <stop offset="1" stopColor="#c3e8a2" />
        </linearGradient>
        <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0cf7a" />
          <stop offset="0.45" stopColor="#c79a3a" />
          <stop offset="1" stopColor="#e8c470" />
        </linearGradient>
        <linearGradient id={`${id}-s`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#6fc23f" />
          <stop offset="0.38" stopColor="#3f8f27" />
          <stop offset="0.62" stopColor="#c99c3c" />
          <stop offset="1" stopColor="#f0d183" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29.5" fill={`url(#${id}-disc)`} />
      <circle cx="32" cy="32" r="29.5" fill="none" stroke={`url(#${id}-ring)`} strokeWidth="3" />
      <path
        d="M31 19.5c-5.6 0-9.9 2.2-9.9 6.6 0 3.6 2.9 5.4 8 6.6l3.6.9c2.4.6 3.4 1.2 3.4 2.4 0 1.6-1.9 2.6-5 2.6-3.3 0-5.9-1-8.2-2.7l-1.6 6.1c2.7 1.9 6.2 2.9 10.1 2.9 6.3 0 10.6-2.6 10.6-7.2 0-3.7-2.6-5.6-7.9-6.9l-3.6-.9c-2.3-.6-3.3-1.1-3.3-2.2 0-1.4 1.6-2.2 4.2-2.2 2.8 0 5.3.8 7.4 2.2l1.6-5.9c-2.5-1.5-5.6-2.3-9.4-2.3Z"
        fill={`url(#${id}-s)`}
      />
      <path
        d="M14 24a29.5 29.5 0 0 1 22-14"
        stroke="#fff"
        strokeOpacity=".65"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function LogoWord({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link aria-label="SwiftSite home" href={href} className="group">
      <span className="inline-flex items-center gap-2.5">
        <LogoMark size={compact ? 30 : 36} />
        <span className={`${compact ? "text-base" : "text-lg"} font-display font-bold tracking-[-0.055em]`}>
          <span className="text-leaf-900">Swift</span>
          <span className="bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
            Site
          </span>
        </span>
      </span>
    </Link>
  );
}
