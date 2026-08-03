/**
 * Stylized SVG manga-style avatars (placeholder art per Task 2 decision).
 * Swappable: replace internals with real <image> assets later without touching
 * the chat animation logic. Each avatar has a distinct color + expression so
 * the two speakers stay visually distinct in the conversation.
 */

interface AvatarProps {
  className?: string;
}

/** Character A — confident, slightly knowing expression. Indigo accent. */
export function AvatarA({ className }: AvatarProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Character A avatar"
    >
      <defs>
        <linearGradient id="avatar-a-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      {/* Head */}
      <circle cx="32" cy="28" r="20" fill="url(#avatar-a-bg)" />
      {/* Hair tuft */}
      <path d="M14 22 Q20 8 32 10 Q44 8 50 22 Q44 16 32 16 Q20 16 14 22 Z" fill="#1e1b4b" />
      {/* Eyes — sharp, knowing */}
      <ellipse cx="24" cy="28" rx="2.5" ry="3.5" fill="#0f172a" />
      <ellipse cx="40" cy="28" rx="2.5" ry="3.5" fill="#0f172a" />
      {/* Slight smirk */}
      <path d="M25 38 Q32 42 39 38" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Neck/shoulders */}
      <path d="M16 52 Q32 44 48 52 L48 64 L16 64 Z" fill="url(#avatar-a-bg)" />
    </svg>
  );
}

/** Character B — eager, slightly wide-eyed expression. Emerald accent. */
export function AvatarB({ className }: AvatarProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Character B avatar"
    >
      <defs>
        <linearGradient id="avatar-b-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      {/* Head */}
      <circle cx="32" cy="28" r="20" fill="url(#avatar-b-bg)" />
      {/* Hair — different style, side-swept */}
      <path d="M12 26 Q12 10 32 8 Q52 10 52 26 Q48 18 40 18 L38 20 Q30 16 22 22 Q16 22 12 26 Z" fill="#064e3b" />
      {/* Eyes — wider, eager */}
      <circle cx="24" cy="29" r="3.5" fill="#0f172a" />
      <circle cx="40" cy="29" r="3.5" fill="#0f172a" />
      <circle cx="25" cy="28" r="1" fill="#fff" />
      <circle cx="41" cy="28" r="1" fill="#fff" />
      {/* Open, excited mouth */}
      <ellipse cx="32" cy="39" rx="4" ry="3" fill="#0f172a" />
      {/* Neck/shoulders */}
      <path d="M16 52 Q32 44 48 52 L48 64 L16 64 Z" fill="url(#avatar-b-bg)" />
    </svg>
  );
}
