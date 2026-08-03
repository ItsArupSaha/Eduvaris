import type { ExaminerOutputT } from "../schemas.js";

/**
 * Hallucination injector (spec Section 7, Task 1).
 *
 * Takes a valid Examiner output and DELIBERATELY corrupts exactly one finding's
 * quote so it no longer appears verbatim in the student's source text. The
 * Validator must catch this. We mutate at most one finding so the Validator's
 * job is unambiguous (a clean batch + 1 planted error).
 *
 * Corruption strategy: take the real quote, swap two interior words and change
 * one character — enough to defeat a fuzzy match, subtle enough to look like a
 * genuine Examiner paraphrase slip rather than obvious garbage.
 */
export function injectHallucination(
  output: ExaminerOutputT,
  sourceText: string
): { tampered: ExaminerOutputT; tamperedFindingIndex: number; originalQuote: string; tamperedQuote: string } {
  if (output.findings.length === 0) {
    throw new Error("Cannot inject hallucination: Examiner returned no findings.");
  }

  // Pick the first finding with a quote long enough to tamper meaningfully.
  const idx = output.findings.findIndex((f) => f.quote.split(/\s+/).length >= 4);
  const tamperedFindingIndex = idx === -1 ? 0 : idx;
  const target = output.findings[tamperedFindingIndex]!;
  const originalQuote = target.quote;

  const tamperedQuote = tamperQuote(originalQuote);

  const tampered: ExaminerOutputT = {
    ...output,
    findings: output.findings.map((f, i) =>
      i === tamperedFindingIndex ? { ...f, quote: tamperedQuote } : f
    ),
  };

  // Sanity: the tampered quote must NOT appear in the source.
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  if (norm(sourceText).includes(norm(tamperedQuote))) {
    // Fallback: mangle harder.
    const harder = "ZZXQ " + tamperedQuote + " NONEXISTENT";
    tampered.findings[tamperedFindingIndex]!.quote = harder;
    return {
      tampered,
      tamperedFindingIndex,
      originalQuote,
      tamperedQuote: harder,
    };
  }

  return { tampered, tamperedFindingIndex, originalQuote, tamperedQuote };
}

function tamperQuote(quote: string): string {
  const words = quote.split(/(\s+)/); // keep whitespace tokens
  const wordIdxs = words
    .map((w, i) => ({ w, i }))
    .filter((x) => /\S/.test(x.w) && x.w.length >= 3)
    .map((x) => x.i);
  if (wordIdxs.length >= 2) {
    const a = wordIdxs[0]!;
    const b = wordIdxs[1]!;
    [words[a], words[b]] = [words[b]!, words[a]!];
  }
  // Change one character in the first substantial word to defeat fuzzy matchers.
  const firstReal = words.findIndex((w) => /\S/.test(w) && w.length >= 3);
  if (firstReal !== -1) {
    const orig = words[firstReal]!;
    words[firstReal] = orig[0]!.toUpperCase() === orig[0]
      ? orig.slice(0, -1) + (orig.endsWith("e") ? "a" : "e")
      : orig.slice(0, -1) + (orig.endsWith("e") ? "a" : "e");
  }
  return words.join("");
}
