import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Node 24 native env loading (no dotenv dep). Silently no-op if no .env file.
try {
  process.loadEnvFile(resolve(process.cwd(), ".env"));
} catch {
  /* .env optional — env vars may be set in the shell instead */
}

import { config } from "./config.js";
import { makeClient } from "./agents/client.js";
import { runSample, type SampleResult } from "./pipeline.js";
import { computeMetrics, type GateReport } from "./metrics.js";
import { writingSamples } from "./samples/writing-samples.js";
import { speakingSamples } from "./samples/speaking-samples.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = resolve(__dirname, "../results");
const RAW_DIR = resolve(RESULTS_DIR, "raw");
const REPORT_PATH = resolve(RESULTS_DIR, "report.md");

// Module-scoped network retry counters, populated by collectRetries, read by renderReport.
let networkRetryEvents = 0;
const networkRetryLog: string[] = [];

async function main() {
  console.log(`\n=== IELTS Grading Feasibility Spike ===`);
  console.log(`Model: ${config.model} | runs/sample: ${config.runsPerSample} | band-gap threshold: ${config.bandGapThreshold}\n`);

  const client = makeClient();
  const all: SampleResult[] = [];

  // Writing
  console.log(`--- WRITING (${writingSamples.length} samples) ---`);
  for (const s of writingSamples) {
    console.log(`\nSample ${s.id}  [manual band ${s.manualBand}, level ${s.level}]`);
    const res = await runSample({
      client,
      sampleId: s.id,
      module: "writing",
      manualBand: s.manualBand,
      text: s.text,
      onProgress: (m) => console.log(m),
    });
    collectRetries(res);
    all.push(res);
  }

  // Speaking
  console.log(`\n--- SPEAKING (${speakingSamples.length} samples) ---`);
  for (const s of speakingSamples) {
    console.log(`\nSample ${s.id}  [manual band ${s.manualBand}, level ${s.level}]`);
    const res = await runSample({
      client,
      sampleId: s.id,
      module: "speaking",
      manualBand: s.manualBand,
      text: s.transcript,
      wpm: s.wpm,
      latencyMs: s.latencyMs,
      onProgress: (m) => console.log(m),
    });
    collectRetries(res);
    all.push(res);
  }

  // Metrics + report
  mkdirSync(RAW_DIR, { recursive: true });
  const metrics = computeMetrics(all);
  writeFileSync(resolve(RAW_DIR, "raw-results.json"), JSON.stringify(all, null, 2));
  writeFileSync(resolve(RAW_DIR, "metrics.json"), JSON.stringify(metrics, null, 2));
  writeFileSync(
    REPORT_PATH,
    renderReport(metrics, { networkRetryEvents, networkRetryLog })
  );
  console.log(`\nReport written: ${REPORT_PATH}`);
}

/** Fold per-run retry logs into the module-scoped counters for the report. */
function collectRetries(res: SampleResult): void {
  for (const r of res.runs) {
    for (const msg of r.examinerRetryLog) {
      networkRetryEvents++;
      networkRetryLog.push(`[Examiner ${res.sampleId} run ${r.runIndex}] ${msg}`);
    }
    if (r.validatorOnTampered) {
      for (const msg of r.validatorOnTampered.retryLog) {
        networkRetryEvents++;
        networkRetryLog.push(`[Validator ${res.sampleId}] ${msg}`);
      }
    }
  }
}

function renderReport(
  m: GateReport,
  net?: { networkRetryEvents: number; networkRetryLog: string[] }
): string {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const gates = [
    {
      name: "1. JSON Validity",
      target: "100% valid runs",
      actual: `${m.validity.validRuns}/${m.validity.totalRuns} (${pct(m.validity.rate)})`,
      pass: m.validity.rate === 1,
    },
    {
      name: "2. Hallucination Catch",
      target: `${m.hallucination.injected}/${m.hallucination.injected}`,
      actual: `${m.hallucination.caught}/${m.hallucination.injected} (${pct(m.hallucination.rate)})`,
      pass: m.hallucination.injected > 0 && m.hallucination.rate === 1,
    },
    {
      name: "3. Band Consistency",
      target: `0 samples with gap > ${config.bandGapThreshold}`,
      actual: `${m.bandConsistency.flaggedCount} flagged`,
      pass: m.bandConsistency.flaggedCount === 0,
    },
  ];
  const allPass = gates.every((g) => g.pass);

  let out = `# Task 1 — AI Grading Feasibility Spike Report\n\n`;
  out += `**Model:** \`${config.model}\`  |  **Runs per sample:** ${config.runsPerSample}  |  **Band-gap threshold:** ${config.bandGapThreshold}\n\n`;
  out += `**Overall verdict:** ${allPass ? "✅ ALL GATES PASSED" : "❌ ONE OR MORE GATES FAILED — refine prompts and re-run"}\n\n`;
  out += `---\n\n## Pass/Fail Gates\n\n`;
  out += `| Gate | Target | Actual | Status |\n|---|---|---|---|\n`;
  for (const g of gates) {
    out += `| ${g.name} | ${g.target} | ${g.actual} | ${g.pass ? "✅ PASS" : "❌ FAIL"} |\n`;
  }
  out += `\n> Per spec Section 7: every gate must pass before Task 2 begins.\n\n---\n\n`;

  // Validity detail
  out += `## Gate 1 — JSON Validity\n\n`;
  out += `**Rate:** ${pct(m.validity.rate)} (${m.validity.validRuns}/${m.validity.totalRuns} runs returned schema-valid JSON)\n`;
  if (m.validity.failures.length) {
    out += `\n**Failures:**\n\n`;
    for (const f of m.validity.failures) {
      out += `- \`${f.sampleId}\` run ${f.runIndex}: ${truncate(f.error, 200)}\n`;
    }
  } else {
    out += `\n_No parse failures._\n`;
  }
  out += `\n`;

  // Hallucination detail
  out += `## Gate 2 — Hallucination Catch (Validator)\n\n`;
  out += `**Catch rate:** ${pct(m.hallucination.rate)} (${m.hallucination.caught}/${m.hallucination.injected})\n`;
  out += `\nFor each sample, one finding's quote was deliberately corrupted and the Validator had to detect it.\n`;
  if (m.hallucination.misses.length) {
    out += `\n**Misses (Validator failed to catch the planted error):**\n\n`;
    for (const miss of m.hallucination.misses) {
      out += `- \`${miss.sampleId}\`\n`;
    }
  } else {
    out += `\n_No misses — Validator caught every injected hallucination._\n`;
  }
  out += `\n`;

  // Band consistency detail
  out += `## Gate 3 — Band Consistency (Examiner vs Manual)\n\n`;
  out += `Flag any sample where |Examiner mean − manual band| > ${config.bandGapThreshold}, or where there are no valid Examiner runs.\n\n`;
  out += `| Sample | Module | Manual | Examiner mean | Gap | Valid runs | Status |\n|---|---|---|---|---|---|---|\n`;
  for (const p of m.bandConsistency.perSample) {
    const mean = p.examinerMean === null ? "N/A" : String(p.examinerMean);
    const gap = p.gap === null ? "N/A" : String(p.gap);
    out += `| \`${p.sampleId}\` | ${p.module} | ${p.manual} | ${mean} | ${gap} | ${p.validRuns}/${config.runsPerSample} | ${p.flagged ? `❌ ${p.flagReason ?? "FLAGGED"}` : "✅ ok"} |\n`;
  }
  out += `\n`;

  // Latency
  out += `## Latency\n\n`;
  out += `| Agent | n | p50 | p90 |\n|---|---|---|---|\n`;
  out += `| Examiner | ${m.latency.examiner.count} | ${m.latency.examiner.p50}ms | ${m.latency.examiner.p90}ms |\n`;
  out += `| Validator | ${m.latency.validator.count} | ${m.latency.validator.p50}ms | ${m.latency.validator.p90}ms |\n`;
  out += `\n> Per spec Section 7: record latency per agent call. Two sequential gpt-4o-mini calls should land well under the 2-minute production target.\n\n`;

  // Network resilience
  out += `## Network Resilience\n\n`;
  if (net) {
    out += `**Network-layer retries fired:** ${net.networkRetryEvents}\n\n`;
    out += `Each retry = one transient failure (connection drop / 429 / 5xx) that was automatically retried with exponential backoff instead of crashing the run.\n`;
    if (net.networkRetryLog.length) {
      out += `\n<details><summary>Retry log (${net.networkRetryLog.length} events)</summary>\n\n`;
      out += "```\n";
      for (const line of net.networkRetryLog) out += `${line}\n`;
      out += "```\n\n</details>\n";
    } else {
      out += `\n_No transient network failures this run._\n`;
    }
  }
  out += `\n---\n\n`;

  out += `_Raw data: \`results/raw/raw-results.json\` and \`results/raw/metrics.json\`._\n`;
  return out;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

main().catch((err) => {
  console.error("\nSPIKE FAILED:", err);
  process.exit(1);
});
