# Task 1 — AI Grading Feasibility Spike Report

**Model:** `gpt-4o-mini`  |  **Runs per sample:** 10  |  **Band-gap threshold:** 1.5

**Overall verdict:** ✅ ALL GATES PASSED

---

## Pass/Fail Gates

| Gate | Target | Actual | Status |
|---|---|---|---|
| 1. JSON Validity | 100% valid runs | 120/120 (100.0%) | ✅ PASS |
| 2. Hallucination Catch | 12/12 | 12/12 (100.0%) | ✅ PASS |
| 3. Band Consistency | 0 samples with gap > 1.5 | 0 flagged | ✅ PASS |

> Per spec Section 7: every gate must pass before Task 2 begins.

---

## Gate 1 — JSON Validity

**Rate:** 100.0% (120/120 runs returned schema-valid JSON)

_No parse failures._

## Gate 2 — Hallucination Catch (Validator)

**Catch rate:** 100.0% (12/12)

For each sample, one finding's quote was deliberately corrupted and the Validator had to detect it.

_No misses — Validator caught every injected hallucination._

## Gate 3 — Band Consistency (Examiner vs Manual)

Flag any sample where |Examiner mean − manual band| > 1.5, or where there are no valid Examiner runs.

| Sample | Module | Manual | Examiner mean | Gap | Valid runs | Status |
|---|---|---|---|---|---|---|
| `W-weak-1` | writing | 5 | 5 | 0 | 10/10 | ✅ ok |
| `W-weak-2` | writing | 4.5 | 5 | 0.5 | 10/10 | ✅ ok |
| `W-mid-1` | writing | 6 | 6.4 | 0.4 | 10/10 | ✅ ok |
| `W-mid-2` | writing | 6.5 | 5.9 | 0.6 | 10/10 | ✅ ok |
| `W-strong-1` | writing | 7.5 | 8 | 0.5 | 10/10 | ✅ ok |
| `W-strong-2` | writing | 8 | 8 | 0 | 10/10 | ✅ ok |
| `S-weak-1` | speaking | 5 | 5 | 0 | 10/10 | ✅ ok |
| `S-weak-2` | speaking | 4.5 | 5 | 0.5 | 10/10 | ✅ ok |
| `S-mid-1` | speaking | 6 | 5.85 | 0.15 | 10/10 | ✅ ok |
| `S-mid-2` | speaking | 6.5 | 6 | 0.5 | 10/10 | ✅ ok |
| `S-strong-1` | speaking | 7.5 | 7.45 | 0.05 | 10/10 | ✅ ok |
| `S-strong-2` | speaking | 8 | 8 | 0 | 10/10 | ✅ ok |

## Latency

| Agent | n | p50 | p90 |
|---|---|---|---|
| Examiner | 120 | 5068ms | 6679ms |
| Validator | 12 | 6962ms | 9708ms |

> Per spec Section 7: record latency per agent call. Two sequential gpt-4o-mini calls should land well under the 2-minute production target.

## Network Resilience

**Network-layer retries fired:** 0

Each retry = one transient failure (connection drop / 429 / 5xx) that was automatically retried with exponential backoff instead of crashing the run.

_No transient network failures this run._

---

_Raw data: `results/raw/raw-results.json` and `results/raw/metrics.json`._
