/**
 * Spike configuration. All values overridable via env vars.
 * GPT-4o-mini is the locked model (DeepSeek dropped per project decision).
 */
export const config = {
  model: process.env.SPIKE_MODEL ?? "gpt-4o-mini",
  runsPerSample: Number(process.env.SPIKE_RUNS_PER_SAMPLE ?? 10),
  bandGapThreshold: Number(process.env.SPIKE_BAND_GAP_THRESHOLD ?? 1.5),
  // Examiner/Validator retries: how many times to re-prompt if it returns
  // invalid JSON before counting the run as a hard failure. 3 gives the
  // targeted empty-findings correction a fair chance (1 original + 2 corrected).
  maxRetries: 3,
  temperature: 0.2, // deterministic-ish for consistency stats
  // Honor a custom OpenAI base URL if present (proxy / Azure compat).
  baseURL: process.env.OPENAI_BASE_URL,
} as const;

export type Config = typeof config;
