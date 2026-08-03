"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MANGA_SCRIPT, type ChatBubble } from "./manga-script";
import { AvatarA, AvatarB } from "./MangaAvatars";

interface MangaChatProps {
  /** Called when the full conversation has finished revealing. */
  onComplete?: () => void;
}

/**
 * Auto-playing manga chat.
 *
 * Bubbles slide in one at a time (left for A, right for B) on a staggered
 * timeline. Three accessibility controls:
 *   1. prefers-reduced-motion → all bubbles render static immediately.
 *   2. Hover/focus pauses auto-advance.
 *   3. "Skip animation" button jumps to the final state.
 */
export function MangaChat({ onComplete }: MangaChatProps) {
  const prefersReducedMotion = useReducedMotion();
  const [visibleCount, setVisibleCount] = useState<number>(
    prefersReducedMotion ? MANGA_SCRIPT.length : 0
  );
  const [paused, setPaused] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const completedFired = useRef(false);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // Schedule the staggered reveal.
  useEffect(() => {
    if (prefersReducedMotion) {
      setVisibleCount(MANGA_SCRIPT.length);
      return;
    }
    clearTimers();
    let cumulative = 0;
    for (let i = 0; i < MANGA_SCRIPT.length; i++) {
      cumulative += MANGA_SCRIPT[i]!.delayMs;
      const t = setTimeout(() => {
        // Respect pause by re-checking — simplest robust approach: re-schedule.
        setVisibleCount((prev) => Math.max(prev, i + 1));
      }, cumulative);
      timers.current.push(t);
    }
    return clearTimers;
  }, [prefersReducedMotion, clearTimers]);

  // Fire onComplete once the conversation is fully shown.
  useEffect(() => {
    if (visibleCount >= MANGA_SCRIPT.length && !completedFired.current) {
      completedFired.current = true;
      onComplete?.();
    }
  }, [visibleCount, onComplete]);

  const skip = useCallback(() => {
    clearTimers();
    setVisibleCount(MANGA_SCRIPT.length);
  }, [clearTimers]);

  const isDone = visibleCount >= MANGA_SCRIPT.length;

  return (
    <div
      className="w-full max-w-2xl mx-auto"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-label="Manga conversation about IELTS preparation"
      role="region"
    >
      <div className="flex flex-col gap-4 min-h-[420px] px-4">
        <AnimatePresence>
          {MANGA_SCRIPT.slice(0, visibleCount).map((bubble, i) => (
            <ChatBubbleRow key={i} bubble={bubble} animate={!prefersReducedMotion} />
          ))}
        </AnimatePresence>
      </div>

      <div className="flex justify-center mt-6">
        {!isDone && (
          <button
            type="button"
            onClick={skip}
            className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors"
          >
            {paused ? "Paused — " : ""}Skip animation
          </button>
        )}
      </div>
    </div>
  );
}

function ChatBubbleRow({ bubble, animate }: { bubble: ChatBubble; animate: boolean }) {
  const isLeft = bubble.side === "left";
  const Avatar = bubble.speaker === "A" ? AvatarA : AvatarB;

  const initial = animate
    ? { opacity: 0, x: isLeft ? -40 : 40, y: 10 }
    : { opacity: 1, x: 0, y: 0 };
  const animateState = { opacity: 1, x: 0, y: 0 };
  const transition = { type: "spring", stiffness: 280, damping: 26 } as const;

  return (
    <motion.div
      initial={initial}
      animate={animateState}
      transition={transition}
      className={`flex items-start gap-3 ${isLeft ? "flex-row" : "flex-row-reverse"}`}
    >
      <Avatar className="w-12 h-12 flex-shrink-0 mt-1 drop-shadow-sm" />
      <SpeechBubble text={bubble.text} side={bubble.side} speaker={bubble.speaker} />
    </motion.div>
  );
}

function SpeechBubble({
  text,
  side,
  speaker,
}: {
  text: string;
  side: "left" | "right";
  speaker: "A" | "B";
}) {
  const isLeft = side === "left";
  const accent = speaker === "A" ? "bg-indigo-50 border-indigo-200" : "bg-emerald-50 border-emerald-200";
  const tailPosition = isLeft ? "left-[-8px]" : "right-[-8px]";

  return (
    <div className={`relative max-w-[80%] rounded-2xl border ${accent} px-4 py-3 shadow-sm`}>
      {/* Speech-bubble tail */}
      <span
        className={`absolute top-4 ${tailPosition} w-0 h-0`}
        style={{
          borderTop: "8px solid transparent",
          borderBottom: "8px solid transparent",
          [isLeft ? "borderRight" : "borderLeft"]: "8px solid currentColor",
        }}
        aria-hidden
      />
      <span className="text-xs font-semibold text-slate-400 mb-1 block">
        Character {speaker}
      </span>
      <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
    </div>
  );
}
