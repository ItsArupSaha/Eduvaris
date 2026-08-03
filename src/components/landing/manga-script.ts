/**
 * Manga conversation script (verbatim from spec Section 4).
 * `delayMs` is the gap AFTER the previous bubble appears before this one slides in.
 */
export interface ChatBubble {
  speaker: "A" | "B";
  side: "left" | "right";
  text: string;
  delayMs: number;
}

export const MANGA_SCRIPT: ChatBubble[] = [
  {
    speaker: "A",
    side: "left",
    text: "Planning to sit for your IELTS exam?",
    delayMs: 600,
  },
  {
    speaker: "B",
    side: "right",
    text: "Yes, it's my dream to study abroad!",
    delayMs: 1400,
  },
  {
    speaker: "A",
    side: "left",
    text: "Wow! That sounds crazy! You're taking a step to fulfill your dream! But before preparing, have you identified your strengths and weaknesses?",
    delayMs: 2200,
  },
  {
    speaker: "B",
    side: "right",
    text: "Hmm... I just started taking mock tests.",
    delayMs: 1600,
  },
  {
    speaker: "A",
    side: "left",
    text: "Wait! Mock tests won't show your root weaknesses. Take the 50tk Diagnostic MRI first.",
    delayMs: 1800,
  },
];
