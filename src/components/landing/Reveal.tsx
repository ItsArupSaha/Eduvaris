"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { type ReactNode } from "react";

/**
 * Shared scroll-reveal wrapper. One place to tune the feel of every
 * below-the-fold section so motion stays consistent and intentional — not a
 * lazy fade on every block.
 *
 * `delay` lets callers stagger children inside a section without re-defining
 * variants everywhere. Honors prefers-reduced-motion (renders static).
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const prefersReducedMotion = useReducedMotion();
  const MotionTag = motion[as];

  const variants: Variants = {
    hidden: { opacity: 0, y },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
    },
  };

  if (prefersReducedMotion) {
    const Tag = as as "div";
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Stagger container — wrap a group of <Reveal> children so they cascade in
 * together instead of each waiting on its own viewport threshold.
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.12,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Child of <RevealGroup>. Uses the parent's stagger so set `delay = 0`.
 */
export function RevealItem({
  children,
  className,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const variants: Variants = {
    hidden: { opacity: 0, y },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <motion.div className={className} variants={variants}>
      {prefersReducedMotion ? <div>{children}</div> : children}
    </motion.div>
  );
}
