import type OpenAI from "openai";
import { config } from "./config.js";
import { callExaminer } from "./agents/examiner.js";
import { callValidator, quoteFoundInSource } from "./agents/validator.js";
import { injectHallucination } from "./samples/inject-hallucination.js";
import type { ExaminerOutputT, ValidatorOutputT } from "./schemas.js";

export interface SingleRun {
  runIndex: number;
  validJson: boolean;
  parseError?: string;
  examinerOutput?: ExaminerOutputT;
  examinerLatencyMs: number;
  examinerNetworkRetries: number;
  examinerRetryLog: string[];
  // Validator on the TAMPERED examiner output:
  validatorOnTampered?: {
    ok: boolean;
    output?: ValidatorOutputT;
    /** Did the Validator flag a correction for the tampered finding? */
    caughtInjectedHallucination: boolean;
    latencyMs: number;
    networkRetries: number;
    retryLog: string[];
  };
}

export interface SampleResult {
  sampleId: string;
  module: "writing" | "speaking";
  manualBand: number;
  runs: SingleRun[];
}

/**
 * Run the full pipeline for one sample:
 *   - Examiner × runsPerSample
 *   - For ONE of those runs (the last valid), inject a hallucination and run
 *     the Validator, checking that it catches the planted error.
 */
export async function runSample(args: {
  client: OpenAI;
  sampleId: string;
  module: "writing" | "speaking";
  manualBand: number;
  text: string;
  wpm?: number;
  latencyMs?: number;
  onProgress?: (msg: string) => void;
}): Promise<SampleResult> {
  const { client, sampleId, module, manualBand, text, onProgress } = args;
  const log = (m: string) => onProgress?.(m);
  const runs: SingleRun[] = [];

  for (let i = 0; i < config.runsPerSample; i++) {
    log(`  [${sampleId}] Examiner run ${i + 1}/${config.runsPerSample}...`);
    const ex = await callExaminer({
      client,
      module,
      text,
      wpm: args.wpm,
      latencyMs: args.latencyMs,
    });
    const run: SingleRun = {
      runIndex: i,
      validJson: ex.ok,
      examinerLatencyMs: ex.latencyMs,
      examinerNetworkRetries: ex.networkRetries,
      examinerRetryLog: ex.retryLog,
    };
    if (!ex.ok) {
      run.parseError = ex.error;
      runs.push(run);
      continue;
    }
    run.examinerOutput = ex.output;

    // On the LAST run, inject hallucination + run Validator.
    if (i === config.runsPerSample - 1) {
      log(`  [${sampleId}] Injecting hallucination + Validator...`);
      const { tampered, tamperedFindingIndex } = injectHallucination(ex.output, text);
      const tamperedJson = JSON.stringify(tampered);
      const val = await callValidator({ client, sourceText: text, examinerJson: tamperedJson });
      let caught = false;
      if (val.ok && val.output) {
        // Validator "catches" if it returns a quote_not_found correction that
        // points at the tampered finding, OR if its correctedExaminerJSON no
        // longer contains the tampered quote verbatim.
        const correctionTargetsTampered = val.output.corrections.some(
          (c) => c.findingIndex === tamperedFindingIndex &&
                 (c.issueType === "quote_not_found" || c.issueType === "severity_mismatch")
        );
        // Cross-check: does the Validator's corrected JSON restore a
        // source-grounded quote at that index?
        let correctedRestoresQuote = false;
        try {
          const corrected = JSON.parse(val.output.correctedExaminerJSON);
          const f = corrected.findings?.[tamperedFindingIndex];
          if (f && typeof f.quote === "string") {
            correctedRestoresQuote = quoteFoundInSource(f.quote, text);
          }
        } catch {
          /* ignore parse error of corrected JSON */
        }
        caught = correctionTargetsTampered || correctedRestoresQuote;
      }
      run.validatorOnTampered = {
        ok: val.ok,
        output: val.ok ? val.output : undefined,
        caughtInjectedHallucination: caught,
        latencyMs: val.latencyMs,
        networkRetries: val.networkRetries,
        retryLog: val.retryLog,
      };
    }
    runs.push(run);
  }

  return { sampleId, module, manualBand, runs };
}
