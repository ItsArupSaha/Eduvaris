"use client";

import { motion, useReducedMotion } from "framer-motion";

interface HeroCTAProps {
  visible: boolean;
}

/**
 * "Get Started" CTA. Hidden until the manga conversation finishes (or skip is
 * hit), then fades in with a gentle pulse to draw the eye. Reduced-motion users
 * get an instant fade with no pulse.
 */
export function HeroCTA({ visible }: HeroCTAProps) {
  const prefersReducedMotion = useReducedMotion();

  if (!visible) return null;

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-4 mt-8"
    >
      <motion.a
        href="/login"
        className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300"
        {...(prefersReducedMotion
          ? {}
          : {
              animate: { scale: [1, 1.03, 1] },
              transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const },
            })}
      >
        Get Started
      </motion.a>
      <p className="text-xs text-slate-400">
        1 free demo · 50 BDT per module · Google sign-in
      </p>
    </motion.div>
  );
}
