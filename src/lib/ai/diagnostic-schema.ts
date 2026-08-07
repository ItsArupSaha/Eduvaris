/**
 * Deep Diagnostic Report — strict Zod schema.
 *
 * This is the verbatim mirror of the JSON schema approved in the Part 2 design
 * (section C). The shape, field names, and constraints are load-bearing: both
 * the Examiner and Validator agents are constrained to produce exactly this
 * object, and the Validator re-validates its own output against the same schema.
 *
 * The cardinality caps and the headline length limit come straight from the
 * approved design — do not relax them without an explicit change request.
 *
 * IMPORTANT: "severity" is a triage label (high / medium / low urgency to act),
 * NOT a score. There is deliberately no numeric field anywhere in this schema.
 */
import { z } from "zod";

/** A micro-skill observation backed by concrete evidence. */
const MicroSkillEntrySchema = z.object({
  microSkill: z.string(),
  evidence: z.string(),
  description: z.string(),
});

/** A critical weakness carries an extra triage urgency. */
const WeaknessEntrySchema = MicroSkillEntrySchema.extend({
  severity: z.enum(["high", "medium", "low"]),
});

/** The action plan is an ordered, concrete sequence. */
const ActionStepSchema = z.object({
  step: z.number().int().positive(),
  title: z.string(),
  detail: z.string(),
  targets: z.array(z.string()),
});

/** The single deepest underlying issue tying weaknesses together. */
const RootCauseSchema = z.object({
  diagnosis: z.string(),
  linkedWeaknesses: z.array(z.string()),
});

export const DiagnosticReportSchema = z.object({
  summary: z.object({
    // <=120 chars, per the approved design.
    headline: z.string().max(120),
    overview: z.string(),
  }),
  // 1–4 items — a report with no strengths is valid.
  strengths: z.array(MicroSkillEntrySchema).min(0).max(4),
  // 0–4 items.
  emergingPatterns: z.array(MicroSkillEntrySchema).min(0).max(4),
  // 1–5 items — at least one critical weakness unless the bundle is genuinely
  // flawless (rare). The Validator enforces this interpretation.
  criticalWeaknesses: z.array(WeaknessEntrySchema).min(0).max(5),
  rootCause: RootCauseSchema,
  // 2–5 items, ordered by priority.
  actionPlan: z.array(ActionStepSchema).min(2).max(5),
});

export type DiagnosticReport = z.infer<typeof DiagnosticReportSchema>;
