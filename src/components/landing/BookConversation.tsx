"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { OpenBook } from "./OpenBook";

/**
 * Smart dialogue conversation inside the compact open book.
 *
 * Sequence:
 * 1. Messages 1 to 5 reveal sequentially on the LEFT page until filled up.
 * 2. Messages 6 to 9 reveal sequentially on the RIGHT page.
 * 3. Once full conversation is complete, keep on screen for 5 SECONDS before restarting.
 */

type Speaker = "Arif" | "Sadia";

interface Line {
  speaker: Speaker;
  text: string;
  page: "left" | "right";
}

const SCRIPT: Line[] = [
  // Left page (5 messages — fills the left page completely)
  { speaker: "Arif", text: "Sadia, are you ready for your IELTS exam next month?", page: "left" },
  { speaker: "Sadia", text: "Not really, Arif. I keep taking mock tests but my score is stuck at 6.0.", page: "left" },
  { speaker: "Arif", text: "Mock tests only give you a score. They don't show your actual weaknesses.", page: "left" },
  { speaker: "Sadia", text: "What do you mean? I know I'm getting a 6.0.", page: "left" },
  { speaker: "Arif", text: "A 6.0 doesn't tell you why. Are you failing T/F/NG? Or struggling with synonyms?", page: "left" },

  // Right page (4 messages — fills the right page)
  { speaker: "Sadia", text: "I have no idea... I usually just guess the answers I don't know.", page: "right" },
  { speaker: "Arif", text: "Exactly! That's 'Happy Guessing.' You need a Deep Diagnostic of your English first.", page: "right" },
  { speaker: "Sadia", text: "A Deep Diagnostic? For English?", page: "right" },
  { speaker: "Arif", text: "Yes! A 50tk test that exposes your true root causes before you waste 20k BDT on real exam.", page: "right" },
];

const REVEAL_MS = 2400;     // Time between individual message reveals
const FULL_HOLD_MS = 5000;   // Keep entire completed conversation for 5 seconds before restart

export function BookConversation({ onComplete }: { onComplete?: () => void }) {
  const prefersReducedMotion = useReducedMotion();
  const [count, setCount] = useState<number>(prefersReducedMotion ? SCRIPT.length : 0);

  useEffect(() => {
    if (prefersReducedMotion) {
      onComplete?.();
      return;
    }

    let timer: NodeJS.Timeout;

    if (count < SCRIPT.length) {
      // Step to next message reveal
      timer = setTimeout(() => {
        setCount((c) => c + 1);
      }, REVEAL_MS);
    } else {
      // Full conversation revealed! Hold for 5 seconds, then restart sequence
      timer = setTimeout(() => {
        setCount(0);
      }, FULL_HOLD_MS);
    }

    return () => clearTimeout(timer);
  }, [count, prefersReducedMotion, onComplete]);

  useEffect(() => {
    if (count >= 1) onComplete?.();
  }, [count, onComplete]);

  const visible = SCRIPT.slice(0, count);
  const leftLines = visible.filter((l) => l.page === "left");
  const rightLines = visible.filter((l) => l.page === "right");

  return (
    <OpenBook
      leftChildren={
        <div className="flex flex-col gap-1 sm:gap-1.5 h-full justify-start overflow-hidden">
          <AnimatePresence mode="popLayout">
            {leftLines.map((line, i) => (
              <Bubble key={`l-${i}`} line={line} animate={!prefersReducedMotion} />
            ))}
          </AnimatePresence>
        </div>
      }
      rightChildren={
        <div className="flex flex-col gap-1 sm:gap-1.5 h-full justify-start overflow-hidden">
          <AnimatePresence mode="popLayout">
            {rightLines.map((line, i) => (
              <Bubble key={`r-${i}`} line={line} animate={!prefersReducedMotion} />
            ))}
          </AnimatePresence>
        </div>
      }
    />
  );
}

function Bubble({ line, animate }: { line: Line; animate: boolean }) {
  const isArif = line.speaker === "Arif";
  const tone = isArif
    ? "bg-rose-50/90 border-rose-200/90 text-slate-800 shadow-2xs"
    : "bg-amber-50/90 border-amber-200/90 text-slate-800 shadow-2xs";
  const tag = isArif
    ? "bg-gradient-to-r from-rose-600 to-rose-500 text-white"
    : "bg-gradient-to-r from-orange-600 to-amber-500 text-white";

  const motionProps = animate
    ? {
      initial: { opacity: 0, y: 5, scale: 0.98 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, scale: 0.98 },
      transition: { type: "spring" as const, stiffness: 380, damping: 26 },
    }
    : {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
    };

  return (
    <motion.div
      {...motionProps}
      className={`rounded-md border px-1.5 sm:px-2 py-1 ${tone} leading-tight`}
    >
      <div className="flex items-start gap-1 sm:gap-1.5">
        <span className={`shrink-0 rounded px-1 py-0.2 text-[7.5px] sm:text-[8.5px] font-extrabold uppercase tracking-wide mt-0.5 shadow-2xs ${tag}`}>
          {line.speaker}
        </span>
        <span className="text-[9.5px] sm:text-[10.5px] leading-[1.3] text-slate-800 font-medium">
          {line.text}
        </span>
      </div>
    </motion.div>
  );
}
