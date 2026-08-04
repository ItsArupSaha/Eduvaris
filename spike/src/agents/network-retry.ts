import type OpenAI from "openai";
import type { APIUserAbortError, RateLimitError } from "openai";

/**
 * Network-layer retry with exponential backoff.
 *
 * Retries ONLY transient faults:
 *   - connection drops / timeouts (the user's local internet flakiness)
 *   - 429 RateLimitError
 *   - 5xx server errors
 *
 * Does NOT retry:
 *   - 4xx (bad request, auth) — these will fail every time
 *   - successful responses that fail Zod validation — that's a JSON-shape
 *     problem handled by the caller's own retry loop, not here.
 */
export interface RetryOptions {
  maxRetries: number; // total ATTEMPTS = maxRetries + 1
  baseDelayMs: number;
  maxDelayMs: number;
  onRetry?: (info: { attempt: number; delayMs: number; reason: string }) => void;
}

export const DEFAULT_RETRY: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 2000,
  maxDelayMs: 30000,
};

const RETRYABLE_HINTS = [
  "connection error",
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENETUNREACH",
  "ECONNREFUSED",
  "socket hang up",
  "network",
  "timeout",
  "fetch failed",
  "aborted",
];

function isRetryable(err: unknown): { retry: boolean; reason: string } {
  if (err == null) return { retry: false, reason: "unknown" };
  // OpenAI SDK exposes a `status` on HTTP errors and a `name` on typed errors.
  const e = err as { status?: number; name?: string; message?: string };
  if (e.name === "RateLimitError" || e.status === 429) {
    return { retry: true, reason: "rate_limit_429" };
  }
  if (typeof e.status === "number" && e.status >= 500 && e.status < 600) {
    return { retry: true, reason: `server_${e.status}` };
  }
  // Connection-level (no status, name is a connection error or message matches).
  if (e.status === undefined) {
    const msg = (e.message ?? "").toLowerCase();
    if (RETRYABLE_HINTS.some((h) => msg.includes(h.toLowerCase()))) {
      return { retry: true, reason: `network:${e.name ?? "error"}` };
    }
  }
  return { retry: false, reason: e.name ?? `status_${e.status ?? "none"}` };
}

function backoffMs(attempt: number, base: number, max: number): number {
  // Exponential with full jitter.
  const exp = Math.min(max, base * 2 ** attempt);
  return Math.floor(Math.random() * exp);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run an OpenAI chat-completion request with network-layer retry.
 * Anything that throws from the SDK call itself (not from caller-side JSON
 * parsing) is eligible for retry per isRetryable().
 */
export async function withNetworkRetry(
  client: OpenAI,
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  opts: Partial<RetryOptions> = {}
): Promise<{ result: OpenAI.Chat.Completions.ChatCompletion; retries: number }> {
  const o: RetryOptions = { ...DEFAULT_RETRY, ...opts };
  let lastErr: unknown;
  for (let attempt = 0; attempt <= o.maxRetries; attempt++) {
    try {
      // maxRetries:0 on the SDK — we own the retry policy.
      const result = await client.chat.completions.create(params, { maxRetries: 0 });
      return { result, retries: attempt };
    } catch (err) {
      lastErr = err;
      const { retry, reason } = isRetryable(err);
      if (!retry || attempt === o.maxRetries) {
        throw err;
      }
      const delayMs = backoffMs(attempt, o.baseDelayMs, o.maxDelayMs);
      o.onRetry?.({ attempt: attempt + 1, delayMs, reason });
      await sleep(delayMs);
    }
  }
  throw lastErr;
}

// Re-export for type-only use in callers that need to name these.
export type { RateLimitError, APIUserAbortError };
