/**
 * Listening v1 — first shipped Listening diagnostic form.
 *
 * 4 stations:
 *   1. distractor       — 3 short clips, 1 MCQ each, audio plays ONCE.
 *                         The transcript embeds the self-correction trap
 *                         (Option A mentioned → "Actually..." → Option B).
 *   2. audioFill        — 1 clip, 4 fill-in-the-blank (spelling/numbers).
 *   3. sentenceComplete — 1 academic clip, 3 sentence-completion questions.
 *   4. replay           — review of Station 3 with bounded 15s replays.
 *                         Tracks correct→wrong deteriorations.
 *
 * 11 gradable questions total (replay re-grades Station 3's answers in place;
 * it has no independent score). Overall time: 25 min (1500 s).
 *
 * Audio assets are placeholder silent WAVs under /public/audio/listening/.
 * Replace the files (keep filenames) to ship real recorded audio — no code
 * change needed.
 */
import type { ListeningExam } from "../content-types";

export const LISTENING_V1: ListeningExam = {
  id: "listening-v1",
  version: 1,
  module: "listening",
  durationSeconds: 25 * 60,
  stations: [
    /* ----------------------- Station 1: Distractor ----------------------- */
    {
      kind: "distractor",
      id: "distractor",
      title: "Station 1 — The Distractor Trap",
      instructions:
        "Each clip plays ONCE. Listen carefully — the speaker may correct themselves. After the clip ends, choose the correct answer.",
      questions: [
        {
          id: "q1",
          kind: "distractor",
          marks: 1,
          audioSrc: "/audio/listening/distractor-1.wav",
          prompt: "What time does the meeting start?",
          options: [
            "9:00",
            "9:30",
            "10:00",
            "The meeting was cancelled",
          ],
          // Trap: speaker says 9:00, then "Actually, let's make it 9:30."
          correctOption: 1,
          transcript:
            "Hi Sarah, it's about tomorrow's meeting. I originally said 9:00, but actually, " +
            "let's make it 9:30 — Tom can't get here before then. So 9:30 it is. See you then.",
        },
        {
          id: "q2",
          kind: "distractor",
          marks: 1,
          audioSrc: "/audio/listening/distractor-2.wav",
          prompt: "Which platform should the passenger go to?",
          options: [
            "Platform 3",
            "Platform 5",
            "Platform 7",
            "Platform 9",
          ],
          // Trap: announced as Platform 5, then corrected to Platform 7.
          correctOption: 2,
          transcript:
            "Attention passengers. The 10:15 service to Cambridge will depart from Platform 5. " +
            "I'm sorry — correction — Platform 7. The 10:15 to Cambridge, Platform 7. " +
            "Please mind the gap when boarding.",
        },
        {
          id: "q3",
          kind: "distractor",
          marks: 1,
          audioSrc: "/audio/listening/distractor-3.wav",
          prompt: "How many people has the speaker invited?",
          options: ["Eight", "Ten", "Twelve", "Fourteen"],
          // Trap: starts with ten, corrects to twelve.
          correctOption: 2,
          transcript:
            "So for the dinner, I've invited... well, I started with ten people, but actually " +
            "I've added a couple more since then, so it's twelve now. Twelve for dinner. " +
            "Should be a good evening.",
        },
      ],
    },

    /* ----------------------- Station 2: Precision ----------------------- */
    {
      kind: "audioFill",
      id: "audioFill",
      title: "Station 2 — Precision & Spelling",
      instructions:
        "Listen to the message once. Fill in each blank with the exact word or number. Spelling counts — answers are matched after lowercasing and trimming.",
      audioSrc: "/audio/listening/precision.wav",
      transcript:
        "This is a message for Mr. Whitfield. Your order, reference number 7-4-9-2-1, is ready " +
        "for collection. Please ask for Dr. Okafor at the reception desk on the second floor. " +
        "The total amount due is 1-6-5 pounds and 4-0 pence. We close at 6 p.m.",
      questions: [
        {
          id: "q1",
          kind: "audioFill",
          marks: 1,
          prompt: "Customer's surname (spelling counts):",
          answer: "Whitfield",
        },
        {
          id: "q2",
          kind: "audioFill",
          marks: 1,
          prompt: "Order reference number:",
          answer: "74921",
          acceptAlternatives: ["74-9-2-1", "7-4-9-2-1"],
        },
        {
          id: "q3",
          kind: "audioFill",
          marks: 1,
          prompt: "Doctor's surname (spelling counts):",
          answer: "Okafor",
        },
        {
          id: "q4",
          kind: "audioFill",
          marks: 1,
          prompt: "Total amount in pounds and pence (e.g. 165.40):",
          answer: "165.40",
          acceptAlternatives: ["165 pounds 40 pence", "£165.40"],
        },
      ],
    },

    /* -------------------- Station 3: Paraphrase Logic ------------------- */
    {
      kind: "sentenceComplete",
      id: "sentenceComplete",
      title: "Station 3 — Paraphrase Logic",
      instructions:
        "Listen to the academic talk once. Complete each sentence with the exact word or short phrase the speaker uses. You may review these in the next station.",
      audioSrc: "/audio/listening/academic.wav",
      transcript:
        "Today's lecture revisits a long-standing debate in ecology. For decades, researchers " +
        "assumed that coral reefs could recover from almost any disturbance. That assumption " +
        "began to shift in the late 1990s, when unusually warm oceans triggered the first mass " +
        "bleaching event on record. The key insight was not the bleaching itself, but its " +
        "frequency. Where reefs once had decades between shocks, they now face them every few " +
        "years. This compressed recovery window is what biologists now consider the real threat. " +
        "Some argue that selective breeding of heat-tolerant coral could buy time, though no one " +
        "knows whether such interventions can scale to thousands of square kilometres. What is " +
        "certain is that the old model of reef resilience no longer holds.",
      questions: [
        {
          id: "q1",
          kind: "sentenceComplete",
          marks: 1,
          stem: "For decades, researchers assumed reefs could ______ from almost any disturbance.",
          answer: "recover",
        },
        {
          id: "q2",
          kind: "sentenceComplete",
          marks: 1,
          stem: "The first mass bleaching event on record occurred in the late ______.",
          answer: "1990s",
          acceptAlternatives: ["nineteen nineties", "1990's"],
        },
        {
          id: "q3",
          kind: "sentenceComplete",
          marks: 1,
          stem: "Biologists now consider the compressed ______ window the real threat.",
          answer: "recovery",
        },
      ],
    },

    /* -------------------- Station 4: Replay Proof ----------------------- */
    {
      kind: "replay",
      id: "replay",
      title: "Station 4 — The Replay Proof",
      instructions:
        "Review your Station 3 answers. You may replay a 15-second segment of the audio for each question — once. You may change your answers. Choose carefully: over-confident changes can lower your score.",
      audioSrc: "/audio/listening/academic.wav",
      transcript:
        "Today's lecture revisits a long-standing debate in ecology. For decades, researchers " +
        "assumed that coral reefs could recover from almost any disturbance. That assumption " +
        "began to shift in the late 1990s, when unusually warm oceans triggered the first mass " +
        "bleaching event on record. The key insight was not the bleaching itself, but its " +
        "frequency. Where reefs once had decades between shocks, they now face them every few " +
        "years. This compressed recovery window is what biologists now consider the real threat. " +
        "Some argue that selective breeding of heat-tolerant coral could buy time, though no one " +
        "knows whether such interventions can scale to thousands of square kilometres. What is " +
        "certain is that the old model of reef resilience no longer holds.",
      questions: [
        {
          id: "q1",
          kind: "replay",
          marks: 0, // replay re-grades Station 3; no independent marks
          sourceQuestionId: "q1",
          // "researchers assumed that coral reefs could recover" — ~8s mark
          segmentStart: 6,
          segmentEnd: 14,
        },
        {
          id: "q2",
          kind: "replay",
          marks: 0,
          sourceQuestionId: "q2",
          // "shift in the late 1990s" — ~18s mark
          segmentStart: 16,
          segmentEnd: 24,
        },
        {
          id: "q3",
          kind: "replay",
          marks: 0,
          sourceQuestionId: "q3",
          // "compressed recovery window" — ~42s mark
          segmentStart: 40,
          segmentEnd: 48,
        },
      ],
    },
  ],
};
