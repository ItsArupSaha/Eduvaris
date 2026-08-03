import type OpenAI from "openai";
import { config } from "../config.js";
import {
  examinerSchemaFor,
  type ExaminerOutputT,
  type WritingCriterionT,
  type SpeakingCriterionT,
} from "../schemas.js";
import { EXAMINER_WRITING_SYSTEM, buildExaminerWritingUser } from "../prompts/examiner-writing.js";
import { EXAMINER_SPEAKING_SYSTEM, buildExaminerSpeakingUser } from "../prompts/examiner-speaking.js";
import { withNetworkRetry } from "./network-retry.js";

/** Strip ```json fences + leading/trailing non-JSON noise so Zod can parse. */
export function extractJson(raw: string): string {
  let s = raw.trim();
  // Strip ```json ... ``` or ``` ... ``` fences.
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) s = fence[1].trim();
  // If still has stray text, grab the outermost { ... }.
  if (!s.startsWith("{")) {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) s = s.slice(start, end + 1);
  }
  return s;
}

export interface ExaminerRetryInfo {
  networkRetries: number;
  messages: string[];
}

export type ExaminerCallResult =
  | { ok: true; output: ExaminerOutputT; raw: string; attempts: number; latencyMs: number; networkRetries: number; retryLog: string[] }
  | { ok: false; error: string; raw: string; attempts: number; latencyMs: number; networkRetries: number; retryLog: string[] };

async function callOnce(
  client: OpenAI,
  systemPrompt: string,
  userPrompt: string,
  retryLog: string[],
  extraMessages: { role: "system" | "user" | "assistant"; content: string }[] = []
): Promise<{ raw: string; latencyMs: number; networkRetries: number }> {
  const t0 = Date.now();
  const { result, retries } = await withNetworkRetry(
    client,
    {
      model: config.model,
      temperature: config.temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
        ...extraMessages,
      ],
    },
    {
      onRetry: (info) => {
        retryLog.push(`attempt ${info.attempt} after ${info.reason}, backing off ${info.delayMs}ms`);
      },
    }
  );
  const latencyMs = Date.now() - t0;
  const raw = result.choices[0]?.message?.content ?? "";
  return { raw, latencyMs, networkRetries: retries };
}

/** Detect a Zod "findings array too small" failure in an error message. */
const EMPTY_FINDINGS_PATTERN = /array must contain at least 1|too_small.*findings|findings.*too_small/i;

const EMPTY_FINDINGS_CORRECTION =
  "VIOLATION: your previous response returned an EMPTY findings array. This is " +
  "a hard error. The findings array must NEVER be empty — even for a Band 8+ " +
  "script. Re-grade the SAME text and return at least one finding. If you found " +
  "no weaknesses, return a 'Genuine Strength' finding (severity \"strength\") " +
  "with a verbatim quote from the text proving the strength. A medical report " +
  "always has at least one note. Output the full corrected JSON object now.";

/**
 * Call the Examiner with up to config.maxRetries attempts on JSON-parse / Zod failure.
 * Network-layer retries (connection drops, 429, 5xx) are handled inside callOnce.
 */
export async function callExaminer(args: {
  client: OpenAI;
  module: "writing" | "speaking";
  text: string;
  wpm?: number;
  latencyMs?: number;
}): Promise<ExaminerCallResult> {
  const { client, module } = args;
  const system = module === "writing" ? EXAMINER_WRITING_SYSTEM : EXAMINER_SPEAKING_SYSTEM;
  const user =
    module === "writing"
      ? buildExaminerWritingUser(args.text)
      : buildExaminerSpeakingUser(args.text, args.wpm ?? 0, args.latencyMs ?? 0);

  let lastRaw = "";
  let totalLatency = 0;
  let totalNetworkRetries = 0;
  const retryLog: string[] = [];
  // On retry, inject a correction message tailored to the specific failure.
  // A naive same-prompt retry is useless for deterministic failures like the
  // empty-findings bug — the model just returns [] again. We tell it exactly
  // what it violated and how to fix it.
  let lastErrorWasEmptyFindings = false;
  let lastBadRaw: string | null = null;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    const extraMessages: { role: "system" | "user" | "assistant"; content: string }[] = [];
    if (lastErrorWasEmptyFindings && lastBadRaw !== null) {
      extraMessages.push(
        { role: "assistant", content: lastBadRaw },
        { role: "user", content: EMPTY_FINDINGS_CORRECTION }
      );
      retryLog.push(`attempt ${attempt}: injecting empty-findings correction`);
    }
    try {
      const { raw, latencyMs, networkRetries } = await callOnce(
        client, system, user, retryLog, extraMessages
      );
      lastRaw = raw;
      totalLatency += latencyMs;
      totalNetworkRetries += networkRetries;
      const parsed = JSON.parse(extractJson(raw));
      const validated = examinerSchemaFor(module).parse(parsed) as ExaminerOutputT;
      return {
        ok: true,
        output: validated,
        raw,
        attempts: attempt,
        latencyMs,
        networkRetries: totalNetworkRetries,
        retryLog,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      retryLog.push(`attempt ${attempt} parse/validate failed: ${msg.slice(0, 160)}`);
      lastErrorWasEmptyFindings = EMPTY_FINDINGS_PATTERN.test(msg);
      lastBadRaw = lastRaw;
      if (attempt === config.maxRetries) {
        return {
          ok: false,
          error: msg,
          raw: lastRaw,
          attempts: attempt,
          latencyMs: totalLatency,
          networkRetries: totalNetworkRetries,
          retryLog,
        };
      }
      // else retry with a targeted correction message (set above) on next loop.
    }
  }
  // unreachable
  return {
    ok: false,
    error: "exhausted retries",
    raw: lastRaw,
    attempts: config.maxRetries,
    latencyMs: totalLatency,
    networkRetries: totalNetworkRetries,
    retryLog,
  };
}

export type { WritingCriterionT, SpeakingCriterionT };
