import { config } from "./config.js";
import type { SampleResult, SingleRun } from "./pipeline.js";

export interface GateReport {
  validity: {
    totalRuns: number;
    validRuns: number;
    rate: number; // 0-1
    failures: { sampleId: string; runIndex: number; error: string }[];
  };
  hallucination: {
    injected: number;
    caught: number;
    rate: number;
    misses: { sampleId: string }[];
  };
  bandConsistency: {
    perSample: {
      sampleId: string;
      module: string;
      manual: number;
      examinerMean: number | null;
      gap: number | null;
      validRuns: number;
      flagged: boolean;
      flagReason: string | null;
    }[];
    flaggedCount: number;
  };
  latency: {
    examiner: { p50: number; p90: number; count: number };
    validator: { p50: number; p90: number; count: number };
  };
}

export function computeMetrics(results: SampleResult[]): GateReport {
  // Validity
  let totalRuns = 0;
  let validRuns = 0;
  const failures: GateReport["validity"]["failures"] = [];
  for (const s of results) {
    for (const r of s.runs) {
      totalRuns++;
      if (r.validJson) validRuns++;
      else failures.push({ sampleId: s.sampleId, runIndex: r.runIndex, error: r.parseError ?? "unknown" });
    }
  }

  // Hallucination
  let injected = 0;
  let caught = 0;
  const misses: GateReport["hallucination"]["misses"] = [];
  for (const s of results) {
    const runWithValidator = s.runs.find((r) => r.validatorOnTampered);
    if (runWithValidator?.validatorOnTampered) {
      injected++;
      if (runWithValidator.validatorOnTampered.caughtInjectedHallucination) caught++;
      else misses.push({ sampleId: s.sampleId });
    }
  }

  // Band consistency
  const perSample = results.map((s) => {
    const overalls = s.runs
      .filter((r) => r.examinerOutput)
      .map((r) => (r as Required<SingleRun>).examinerOutput.overall);
    const examinerMean = overalls.length ? mean(overalls) : NaN;
    const gap = Number.isNaN(examinerMean) ? NaN : Math.abs(examinerMean - s.manualBand);
    // Flag if: gap exceeds threshold OR no valid runs at all (can't assess consistency).
    const flagged = Number.isNaN(gap) || gap > config.bandGapThreshold;
    return {
      sampleId: s.sampleId,
      module: s.module,
      manual: s.manualBand,
      examinerMean: round2(examinerMean),
      gap: Number.isNaN(gap) ? null : round2(gap),
      validRuns: overalls.length,
      flagged,
      flagReason: Number.isNaN(gap)
        ? "no valid Examiner runs (cannot assess consistency)"
        : gap > config.bandGapThreshold
          ? `gap ${round2(gap)} > ${config.bandGapThreshold}`
          : null,
    };
  });

  // Latency
  const exLatencies: number[] = [];
  const valLatencies: number[] = [];
  for (const s of results) {
    for (const r of s.runs) {
      exLatencies.push(r.examinerLatencyMs);
      if (r.validatorOnTampered) valLatencies.push(r.validatorOnTampered.latencyMs);
    }
  }

  return {
    validity: { totalRuns, validRuns, rate: validRuns / totalRuns, failures },
    hallucination: { injected, caught, rate: injected ? caught / injected : 0, misses },
    bandConsistency: {
      perSample,
      flaggedCount: perSample.filter((p) => p.flagged).length,
    },
    latency: {
      examiner: { ...percentiles(exLatencies), count: exLatencies.length },
      validator: { ...percentiles(valLatencies), count: valLatencies.length },
    },
  };
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.ceil(p * sortedAsc.length) - 1);
  return sortedAsc[idx]!;
}
function percentiles(xs: number[]): { p50: number; p90: number } {
  const s = [...xs].sort((a, b) => a - b);
  return { p50: percentile(s, 0.5), p90: percentile(s, 0.9) };
}
