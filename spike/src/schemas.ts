import { z } from "zod";

/**
 * Zod schemas — strict runtime validation of Examiner and Validator output.
 * These schemas port verbatim into Task 10 (production API routes).
 *
 * The Examiner's numeric band scores are INTERNAL (backend validation only).
 * Per product philosophy (Section 1), the user never sees a band score — they
 * see diagnostic labels (strength / emerging / critical) with statistical tiers.
 */

// ---- Shared enums -------------------------------------------------------------

export const WritingCriterion = z.enum([
  "taskResponse",
  "coherence",
  "lexical",
  "grammar",
]);
export type WritingCriterionT = z.infer<typeof WritingCriterion>;

export const SpeakingCriterion = z.enum([
  "fluency",
  "grammar",
  "lexical",
  "abstractLogic",
]);
export type SpeakingCriterionT = z.infer<typeof SpeakingCriterion>;

export const Severity = z.enum(["strength", "emerging", "critical"]);
export type SeverityT = z.infer<typeof Severity>;

// Statistical honesty tiers (Section 1, point 3).
// Tier is derived from how many items support a finding — encoded explicitly
// so the report renderer never has to infer it.
export const StatisticalTier = z.enum([
  "early_signal", // 1 item
  "emerging_pattern", // 2-3 items
  "confirmed_pattern", // 4+ items
]);
export type StatisticalTierT = z.infer<typeof StatisticalTier>;

// Band score: integer or half-band, 0-9.
export const BandScore = z
  .number()
  .min(0)
  .max(9)
  .refine((n) => Math.abs(n * 2 - Math.round(n * 2)) < 1e-9, {
    message: "Band score must be a whole or half band (e.g. 5, 5.5, 6)",
  });

// ---- Finding (shared shape) ---------------------------------------------------

export const Finding = z.object({
  criterion: z.string(),
  severity: Severity,
  statisticalTier: StatisticalTier,
  // VERBATIM quote from the student's source text — the Validator checks this.
  quote: z.string().min(1),
  bandLevel: BandScore,
  rootCause: z.string().min(1),
  actionPlan: z.string().min(1),
});
export type FindingT = z.infer<typeof Finding>;

// ---- Examiner output ----------------------------------------------------------

const baseExaminer = {
  findings: z.array(Finding).min(1),
  // Self-report: confirms the Examiner obeyed the "ignore truncated final
  // sentence" instruction (Section 7, Examiner Agent).
  ignoredTruncatedFinalSentence: z.boolean(),
  // Free-text summary of what the Examiner judged (used for audit / debugging).
  summary: z.string(),
};

export const WritingExaminerOutput = z.object({
  ...baseExaminer,
  module: z.literal("writing"),
  criterionScores: z.object({
    taskResponse: BandScore,
    coherence: BandScore,
    lexical: BandScore,
    grammar: BandScore,
  }),
  overall: BandScore,
});
export type WritingExaminerOutputT = z.infer<typeof WritingExaminerOutput>;

export const SpeakingExaminerOutput = z.object({
  ...baseExaminer,
  module: z.literal("speaking"),
  criterionScores: z.object({
    fluency: BandScore,
    grammar: BandScore,
    lexical: BandScore,
    abstractLogic: BandScore,
  }),
  overall: BandScore,
});
export type SpeakingExaminerOutputT = z.infer<typeof SpeakingExaminerOutput>;

export type ExaminerOutputT = WritingExaminerOutputT | SpeakingExaminerOutputT;

// ---- Validator output ---------------------------------------------------------

export const ValidatorIssueType = z.enum([
  "quote_not_found",
  "band_inconsistent",
  "severity_mismatch",
]);

export const ValidatorCorrection = z.object({
  findingIndex: z.number().int().min(0),
  issueType: ValidatorIssueType,
  description: z.string(),
  // What the Examiner originally claimed.
  original: z.string(),
  // What the Validator changed it to.
  corrected: z.string(),
});
export type ValidatorCorrectionT = z.infer<typeof ValidatorCorrection>;

export const ValidatorOutput = z.object({
  corrections: z.array(ValidatorCorrection),
  // Full corrected copy of the Examiner's JSON (unchanged if no corrections).
  correctedExaminerJSON: z.string(), // stringified for schema simplicity
  validatorConfidence: z.number().min(0).max(1),
});
export type ValidatorOutputT = z.infer<typeof ValidatorOutput>;

// ---- Helper: union for runtime module dispatch --------------------------------

export function parseExaminerOutput(
  module: "writing" | "speaking",
  raw: unknown
): ExaminerOutputT {
  const schema = module === "writing" ? WritingExaminerOutput : SpeakingExaminerOutput;
  return schema.parse(raw);
}

export function examinerSchemaFor(module: "writing" | "speaking") {
  return module === "writing" ? WritingExaminerOutput : SpeakingExaminerOutput;
}
