import type OpenAI from "openai";
import { config } from "../config.js";
import { ValidatorOutput, type ValidatorOutputT } from "../schemas.js";
import { VALIDATOR_SYSTEM, buildValidatorUser } from "../prompts/validator.js";
import { extractJson } from "./examiner.js";
import { withNetworkRetry } from "./network-retry.js";

export type ValidatorCallResult =
  | { ok: true; output: ValidatorOutputT; latencyMs: number; networkRetries: number; retryLog: string[] }
  | { ok: false; error: string; latencyMs: number; networkRetries: number; retryLog: string[] };

export async function callValidator(args: {
  client: OpenAI;
  sourceText: string;
  examinerJson: string;
}): Promise<ValidatorCallResult> {
  const { client, sourceText, examinerJson } = args;
  const t0 = Date.now();
  const retryLog: string[] = [];
  try {
    const { result, retries } = await withNetworkRetry(
      client,
      {
        model: config.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: VALIDATOR_SYSTEM },
          { role: "user", content: buildValidatorUser(sourceText, examinerJson) },
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
    const parsed = JSON.parse(extractJson(raw));
    const validated = ValidatorOutput.parse(parsed);
    return { ok: true, output: validated, latencyMs, networkRetries: retries, retryLog };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: msg,
      latencyMs: Date.now() - t0,
      networkRetries: 0,
      retryLog,
    };
  }
}

/**
 * Fuzzy quote match — normalize whitespace + lowercase before substring check.
 * Trivial capitalization/spacing differences must NOT false-flag.
 */
export function quoteFoundInSource(quote: string, source: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const q = norm(quote);
  const s = norm(source);
  if (!q) return false;
  // Also accept the quote with trailing punctuation stripped (Examiner may
  // include a period the source lacks, or vice versa).
  return s.includes(q) || s.includes(q.replace(/[.,;:!?]+$/g, ""));
}
