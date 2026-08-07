/**
 * AI Grading Service — the Deep Diagnostic pipeline (Task 10).
 *
 * runDiagnosticPipeline(attemptId) is the entry point. It is scheduled AFTER
 * the submit route has returned its HTTP response (via next/server's `after()`),
 * so students are never blocked waiting for the AI.
 *
 * Pipeline:
 *   1. Re-read the finalized attempt (grade, answers, transcripts, examId).
 *   2. Assemble the Evidence Bundle (pure).
 *   3. Examiner Agent (gpt-4o-mini) → Zod-validated report.
 *   4. Validator Agent (gpt-4o-mini) → Zod-validated, corrected report.
 *   5. Write diagnosticStatus:"ready" + diagnosticReport, or "error" on failure.
 *
 * Failure isolation: the outer try/catch ALWAYS writes a terminal status, so no
 * student is stuck on a "pending" spinner forever. Re-entry is guarded by the
 * pending-status check at the top, so a double-fire of `after()` is a no-op.
 */
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getExamForm } from "@/lib/exam/exam-forms";
import type { TestAttempt } from "@/lib/exam/attempt-types";
import { EXAMINER_SYSTEM_PROMPT, VALIDATOR_SYSTEM_PROMPT } from "./prompts";
import { DiagnosticReportSchema, type DiagnosticReport } from "./diagnostic-schema";
import { assembleEvidenceBundle } from "./evidence-bundle";

const MODEL = "gpt-4o-mini";
const MAX_ATTEMPTS = 3;
const MAX_TOKENS = 2500;

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY missing. Add it to .env.local to enable the diagnostic pipeline."
    );
  }
  return key;
}

/**
 * Run the Deep Diagnostic pipeline for one attempt. Idempotent: a no-op if the
 * attempt is no longer in the "pending" diagnostic state.
 */
export async function runDiagnosticPipeline(attemptId: string): Promise<void> {
  const log = (msg: string, extra?: unknown) =>
    console.info(`[diagnostic:${attemptId}] ${msg}`, extra ?? "");

  try {
    const db = adminDb();
    const ref = db.doc(`testAttempts/${attemptId}`);
    const snap = await ref.get();

    if (!snap.exists) {
      log("attempt not found — skipping");
      return;
    }
    const data = snap.data() as TestAttempt;

    // Re-entry guard: only proceed if still pending. This makes a double-fire
    // of after() (or a manual retry landing here) a safe no-op.
    if (data.diagnosticStatus !== "pending") {
      log(`already ${data.diagnosticStatus} — skipping`);
      return;
    }

    if (!data.grade) {
      log("no grade present — cannot diagnose");
      await markError(ref, "No deterministic grade was computed.");
      return;
    }

    const exam = getExamForm(data.examId, data.module);
    if (!exam) {
      log("exam form missing — cannot diagnose");
      await markError(ref, `Exam form ${data.examId} not found.`);
      return;
    }

    // 1. Assemble the Evidence Bundle (pure).
    const bundle = assembleEvidenceBundle(exam, data);
    log("bundle assembled", {
      module: bundle.module,
      items: bundle.items.length,
      writing: bundle.writingResponses.length,
      speaking: bundle.speakingTranscripts.length,
    });

    const client = new OpenAI({ apiKey: getApiKey() });

    // 2. Examiner Agent.
    const examinerReport = await callAgent({
      client,
      role: "examiner",
      systemPrompt: EXAMINER_SYSTEM_PROMPT,
      userContent: JSON.stringify(bundle),
      log,
    });
    if (!examinerReport) {
      await markError(ref, "Examiner agent did not return a valid report.");
      return;
    }
    log("examiner report produced");

    // 3. Validator Agent — receives BOTH the draft report and the bundle.
    const validatorReport = await callAgent({
      client,
      role: "validator",
      systemPrompt: VALIDATOR_SYSTEM_PROMPT,
      userContent: JSON.stringify({ report: examinerReport, bundle }),
      log,
    });
    const finalReport = validatorReport ?? examinerReport;
    log("validator report produced", { usedExaminerFallback: !validatorReport });

    // 4. Persist. Single write, terminal status.
    await ref.update({
      diagnosticStatus: "ready",
      diagnosticReport: finalReport,
      diagnosticGeneratedAt: FieldValue.serverTimestamp(),
      diagnosticError: FieldValue.delete(),
    });
    log("marked ready");
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[diagnostic:${attemptId}] pipeline crashed`, err);
    try {
      await markError(adminDb().doc(`testAttempts/${attemptId}`), reason);
    } catch (innerErr) {
      // If even the error write fails (e.g. transient Firestore outage), there
      // is nothing more we can do from here. The doc stays "pending" and a
      // future re-submit / retry can pick it up.
      console.error(`[diagnostic:${attemptId}] failed to write error status`, innerErr);
    }
  }
}

/* --------------------------- agent call helper -------------------------- */

interface AgentCallArgs {
  client: OpenAI;
  role: "examiner" | "validator";
  systemPrompt: string;
  userContent: string;
  log: (msg: string, extra?: unknown) => void;
}

/**
 * Call one agent with Structured Outputs, retrying up to MAX_ATTEMPTS times on
 * parse failure. Returns the validated report, or null if every attempt failed.
 * Network/API errors throw (caught by the outer pipeline handler).
 */
async function callAgent({
  client,
  role,
  systemPrompt,
  userContent,
  log,
}: AgentCallArgs): Promise<DiagnosticReport | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const completion = await client.chat.completions.parse({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: zodResponseFormat(DiagnosticReportSchema, "diagnostic_report"),
      });

      const message = completion.choices[0]?.message;
      // `.parse()` populates `parsed` after running the model output through
      // the Zod schema. We still re-validate with safeParse for certainty and
      // to surface a clean error message on retry.
      const candidate = message?.parsed ?? null;
      const result = DiagnosticReportSchema.safeParse(candidate);
      if (result.success) {
        return result.data;
      }
      log(`${role} attempt ${attempt} failed validation`, {
        zodError: result.error.issues.slice(0, 3),
        refusal: message?.refusal ?? null,
      });
    } catch (err) {
      // Could be a rate limit, transient API error, etc. Retry.
      log(`${role} attempt ${attempt} threw`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  log(`${role} exhausted ${MAX_ATTEMPTS} attempts`);
  return null;
}

/* ------------------------------- helpers -------------------------------- */

async function markError(
  ref: ReturnType<ReturnType<typeof adminDb>["doc"]>,
  reason: string
): Promise<void> {
  await ref.update({
    diagnosticStatus: "error",
    diagnosticError: reason.slice(0, 500),
    diagnosticGeneratedAt: FieldValue.serverTimestamp(),
  });
}
