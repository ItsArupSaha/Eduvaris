import OpenAI from "openai";
import { config } from "../config.js";

/**
 * Shared OpenAI client. gpt-4o-mini only (DeepSeek dropped per project decision).
 * Honors OPENAI_BASE_URL if set (proxy / Azure compat).
 */
export function makeClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY missing. Copy spike/.env.example to spike/.env and set it."
    );
  }
  return new OpenAI({ apiKey, ...(config.baseURL ? { baseURL: config.baseURL } : {}) });
}

export type { OpenAI };
