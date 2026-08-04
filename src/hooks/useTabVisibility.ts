"use client";

import { useEffect } from "react";
import { useExamStore } from "@/store/exam-store";

/**
 * Anti-cheat tab-switch listener. Counts every hidden → visible cycle of the
 * document (tab switch, app switch on mobile, minimize+restore) by one.
 *
 * IMPORTANT — this is a SOFT signal only. A determined attacker can disable
 * client-side JS listeners. The real protection is server-side: server owns
 * the attempt doc, server stamps expiresAt, server grades. This counter is
 * captured for your review of suspicious attempts; it does not affect the
 * score. Documented honestly rather than oversold.
 *
 * Active only while the engine is in the "active" phase. Saves are debounced
 * by useAutosave, which picks up the `dirty` flag this sets.
 */
export function useTabVisibility(): void {
  const phase = useExamStore((s) => s.phase);
  const registerTabSwitch = useExamStore((s) => s.registerTabSwitch);

  useEffect(() => {
    if (phase !== "active") return;

    let wasHidden = false;
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        wasHidden = true;
      } else if (document.visibilityState === "visible" && wasHidden) {
        wasHidden = false;
        registerTabSwitch();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [phase, registerTabSwitch]);
}
