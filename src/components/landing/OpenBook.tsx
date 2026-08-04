"use client";

import { type ReactNode } from "react";

/**
 * Hyper-Realistic & Smart Open Book component.
 *
 * Clean book cover design:
 * - Removed extra light margins around page edges; cover background is consistently dark (#23120b).
 * - Pages sit directly inside the dark hardcover frame.
 * - Central spine crease with ribbon bookmark.
 * - Ivory ruled paper with red margin line.
 */
export function OpenBook({
  leftChildren,
  rightChildren,
}: {
  leftChildren: ReactNode;
  rightChildren: ReactNode;
}) {
  return (
    <div className="relative w-full max-w-[540px] mx-auto flex justify-center items-center select-none py-2">
      {/* Realistic Desk Drop Shadows */}
      <div
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[90%] h-8 rounded-[50%] bg-slate-950/25 blur-xl pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[75%] h-5 rounded-[50%] bg-amber-950/30 blur-md pointer-events-none"
        aria-hidden
      />

      {/* Outer Hardcover Leather Base Frame */}
      <div
        className="relative w-full rounded-2xl bg-[#23120b] p-2 sm:p-2.5 shadow-[0_22px_50px_rgba(15,23,42,0.35)] border border-[#170a05]"
      >
        {/* Ribbon Bookmark (drapes down the center spine) */}
        <div
          className="absolute left-1/2 -translate-x-1/2 top-0 -bottom-3 w-2.5 bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 shadow-md rounded-b-sm z-30 pointer-events-none border-x border-amber-400/40"
          aria-hidden
        />

        {/* Main Open Pages Surface */}
        <div
          className="relative grid grid-cols-2 w-full h-[270px] sm:h-[300px] bg-[#fcfaf5] rounded-xl overflow-hidden border border-amber-900/40 shadow-inner"
        >
          {/* Left Page */}
          <div className="relative bg-[#fcfaf5] p-2.5 sm:p-3.5 h-full overflow-hidden border-r border-amber-900/10">
            {/* Ruled notebook lines */}
            <div
              className="absolute inset-0 opacity-[0.05] pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, transparent, transparent 20px, #1e3a8a 20px, #1e3a8a 21px)",
                backgroundPosition: "0 6px",
              }}
              aria-hidden
            />
            {/* Red Left Margin Line */}
            <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-px bg-rose-400/30 pointer-events-none z-0" aria-hidden />

            {/* Inner Left Spine Shadow */}
            <div className="absolute right-0 top-0 bottom-0 w-5 bg-gradient-to-l from-amber-950/15 to-transparent pointer-events-none z-10" aria-hidden />

            <div className="relative z-10 pl-2 sm:pl-3 pr-2 h-full flex flex-col justify-start gap-1.5 overflow-hidden">
              {leftChildren}
            </div>
          </div>

          {/* Right Page */}
          <div className="relative bg-[#fcfaf5] p-2.5 sm:p-3.5 h-full overflow-hidden border-l border-amber-900/10">
            {/* Ruled notebook lines */}
            <div
              className="absolute inset-0 opacity-[0.05] pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, transparent, transparent 20px, #1e3a8a 20px, #1e3a8a 21px)",
                backgroundPosition: "0 6px",
              }}
              aria-hidden
            />

            {/* Inner Right Spine Shadow */}
            <div className="absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-amber-950/15 to-transparent pointer-events-none z-10" aria-hidden />

            <div className="relative z-10 pl-2 sm:pl-3 pr-1 h-full flex flex-col justify-start gap-1.5 overflow-hidden">
              {rightChildren}
            </div>
          </div>

          {/* Center Spine Crease Fold */}
          <div
            className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-3.5 bg-gradient-to-r from-slate-900/20 via-amber-950/30 to-slate-900/20 z-20 pointer-events-none"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
