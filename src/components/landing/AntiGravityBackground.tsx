"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion, type MotionValue } from "framer-motion";

/**
 * Non-overlapping Star-like Floating Keyword Field.
 *
 * Requirements met:
 * 1. ZERO word overlaps: Built on a strict deterministic grid layout.
 * 2. Star-like continuous floating & twinkling motion: Words move independently
 *    in smooth orbital floats with gentle opacity pulses like stars in the sky.
 * 3. Mouse anti-gravity repel preserved.
 * 4. Deep rich colors (slate, navy, coffee, maroon) on light cream background.
 */

const KEYWORDS = [
  "Lexical Resource", "Coherence", "Task Response", "Grammar", "Distractors",
  "Synonyms", "Antonyms", "Skimming", "Scanning", "True/False/Not Given",
  "Matching Headings", "Multiple Choice", "Fill in blanks", "Fluency",
  "Pronunciation", "Cohesion", "Punctuation", "Idiomatic", "Collocations",
  "Subject-Verb", "Tense", "Article", "Preposition", "Band 7", "Band 8",
  "Cue Card", "Part 1", "Part 2", "Part 3", "Diagnostic",
  "Micro-skills", "Paraphrasing", "Overview", "Trend", "Map Labeling",
  "Form Completion", "Spelling", "Word Formation",
  "Linking Words", "Conjunctions", "Inference", "Reference",
  "Main Idea", "Detail", "Summary", "Flowchart", "Diagram",
  "Note Completion", "Short Answer", "Tone", "Register", "Stress",
  "Intonation", "Connected Speech", "Chunking", "Self-Correction",
  "Complex Sentences", "Conditionals", "Passive Voice",
  "Discourse Markers", "Thesis", "Introduction", "Conclusion",
];

const REPEL_RADIUS = 120;
const REPEL_STRENGTH = 65;

const DEEP_COLORS = [
  "text-slate-800/85",   // deep slate
  "text-indigo-950/90",  // deep navy
  "text-amber-950/90",   // coffee brown
  "text-rose-950/90",    // deep maroon
  "text-[#2b1810]/85",   // espresso
];

interface WordStyle {
  rot: number;
  size: string;
  weight: string;
  color: string;
  duration: number;
  delay: number;
  floatY: number;
  floatX: number;
}

function seeded(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function styleForWord(index: number): WordStyle {
  const r1 = seeded(index * 7 + 1);
  const r2 = seeded(index * 13 + 3);
  const r3 = seeded(index * 17 + 5);
  const r4 = seeded(index * 23 + 9);
  const r5 = seeded(index * 31 + 15);
  
  const colorIndex = Math.floor(r4 * DEEP_COLORS.length);

  return {
    rot: (r1 - 0.5) * 6,
    size: r2 > 0.7 ? "text-sm" : "text-xs",
    weight: r3 > 0.5 ? "font-semibold" : "font-medium",
    color: DEEP_COLORS[colorIndex] || DEEP_COLORS[0],
    duration: 8 + r5 * 8,          // 8s to 16s smooth loop
    delay: -r4 * 10,               // Negative delay so all start mid-animation
    floatY: 8 + r1 * 12,           // 8px to 20px vertical float
    floatX: (r2 - 0.5) * 14,       // horizontal drift
  };
}

interface WordProps {
  word: string;
  baseX: number;
  baseY: number;
  style: WordStyle;
  containerRef: React.RefObject<HTMLDivElement | null>;
  mouse: { x: MotionValue<number>; y: MotionValue<number> };
}

function FloatingWord({ word, baseX, baseY, style, containerRef, mouse }: WordProps) {
  const wordRef = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);

  const smoothX = useSpring(offsetX, { stiffness: 100, damping: 20 });
  const smoothY = useSpring(offsetY, { stiffness: 100, damping: 20 });

  useEffect(() => {
    if (prefersReducedMotion) return;
    const container = containerRef.current;
    const el = wordRef.current;
    if (!container || !el) return;

    const handle = () => {
      const cRect = container.getBoundingClientRect();
      const wRect = el.getBoundingClientRect();
      const cx = wRect.left + wRect.width / 2 - cRect.left;
      const cy = wRect.top + wRect.height / 2 - cRect.top;
      const mx = mouse.x.get();
      const my = mouse.y.get();
      const dx = cx - mx;
      const dy = cy - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < REPEL_RADIUS && dist > 0.001) {
        const force = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
        offsetX.set((dx / dist) * force);
        offsetY.set((dy / dist) * force);
      } else {
        offsetX.set(0);
        offsetY.set(0);
      }
    };

    let raf = 0;
    const onMove = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(handle);
    };
    const ux = mouse.x.on("change", onMove);
    const uy = mouse.y.on("change", onMove);
    return () => {
      cancelAnimationFrame(raf);
      ux();
      uy();
    };
  }, [mouse.x, mouse.y, offsetX, offsetY, containerRef, prefersReducedMotion]);

  // Star-like floating & twinkling animation loop
  const starAnimation = prefersReducedMotion
    ? undefined
    : {
        y: [0, -style.floatY, 0, style.floatY, 0],
        x: [0, style.floatX, -style.floatX, 0],
        opacity: [0.65, 0.95, 0.7, 1, 0.65],
      };

  const starTransition = prefersReducedMotion
    ? undefined
    : {
        duration: style.duration,
        repeat: Infinity,
        ease: "easeInOut" as const,
        delay: style.delay,
      };

  return (
    <motion.div
      style={{
        position: "absolute",
        left: `${baseX}%`,
        top: `${baseY}%`,
        x: smoothX,
        y: smoothY,
      }}
      className="pointer-events-none"
    >
      <motion.span
        ref={wordRef}
        animate={starAnimation}
        transition={starTransition}
        className={`inline-block select-none ${style.color} ${style.size} ${style.weight} whitespace-nowrap tracking-wide`}
        style={{ rotate: `${style.rot}deg` }}
        aria-hidden
      >
        {word}
      </motion.span>
    </motion.div>
  );
}

export function AntiGravityBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const mouseX = useMotionValue(-9999);
  const mouseY = useMotionValue(-9999);
  const mouse = useMemo(() => ({ x: mouseX, y: mouseY }), [mouseX, mouseY]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || prefersReducedMotion) return;
    const handle = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x.set(e.clientX - rect.left);
      mouse.y.set(e.clientY - rect.top);
    };
    const leave = () => {
      mouse.x.set(-9999);
      mouse.y.set(-9999);
    };
    window.addEventListener("mousemove", handle);
    container.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("mousemove", handle);
      container.removeEventListener("mouseleave", leave);
    };
  }, [mouse, prefersReducedMotion]);

  // Construct a strict NON-OVERLAPPING grid layout (8 columns x 6 rows)
  const layout = useMemo(() => {
    const cols = 8;
    const rows = 6;
    const cellW = 100 / cols; // ~12.5% per column
    const cellH = 100 / rows; // ~16.6% per row

    const items: Array<{ x: number; y: number; word: string; style: WordStyle }> = [];
    let wordIdx = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (wordIdx >= KEYWORDS.length) break;

        // Skip exact center cells where notebook sits (cols 2..5 in rows 2..4)
        if (c >= 2 && c <= 5 && r >= 1 && r <= 4) {
          continue;
        }

        const seedVal = wordIdx * 19 + c * 7 + r * 13;
        const jitterX = (seeded(seedVal + 1) - 0.5) * (cellW * 0.35);
        const jitterY = (seeded(seedVal + 3) - 0.5) * (cellH * 0.35);

        const x = (c + 0.5) * cellW + jitterX;
        const y = (r + 0.5) * cellH + jitterY;

        items.push({
          x: Math.max(2, Math.min(92, x)),
          y: Math.max(3, Math.min(92, y)),
          word: KEYWORDS[wordIdx]!,
          style: styleForWord(wordIdx),
        });

        wordIdx++;
      }
    }
    return items;
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden
    >
      {layout.map((item, i) => (
        <FloatingWord
          key={item.word + i}
          word={item.word}
          baseX={item.x}
          baseY={item.y}
          style={item.style}
          containerRef={containerRef}
          mouse={mouse}
        />
      ))}
    </div>
  );
}
