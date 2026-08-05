/**
 * Listening v1 — first shipped Listening diagnostic form.
 *
 * Density tuned to mirror real IELTS pressure. 4 stations, 30 gradable
 * questions. The ceiling station (4) tests implicit meaning + speaker
 * attitude against a single dense, fast Band 8-9 clip — it pushes strong
 * candidates to their breaking point where a replay/review mechanic would
 * only flatter them.
 *
 *   1. distractor       — 6 short clips, 1 MCQ each, audio plays ONCE.
 *                         The transcript embeds the self-correction trap.
 *   2. audioFill        — 1 clip, 8 fill-in-the-blank (spelling/numbers).
 *   3. sentenceComplete — 1 academic clip, 8 sentence-completion questions.
 *   4. inference        — 1 dense fast clip, 8 implicit-meaning MCQs.
 *                         No transcript during the attempt. Play-once only.
 *
 * Overall time: 25 min (1500 s).
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
        {
          id: "q4",
          kind: "distractor",
          marks: 1,
          audioSrc: "/audio/listening/distractor-4.wav",
          prompt: "Who cannot arrive before the meeting time?",
          options: ["Sarah", "Tom", "The receptionist", "The driver"],
          correctOption: 1,
          transcript:
            "Hi Sarah, it's about tomorrow's meeting. I originally said 9:00, but actually, " +
            "let's make it 9:30 — Tom can't get here before then. So 9:30 it is. See you then.",
        },
        {
          id: "q5",
          kind: "distractor",
          marks: 1,
          audioSrc: "/audio/listening/distractor-5.wav",
          prompt: "What destination is announced for the service?",
          options: ["Oxford", "London", "Cambridge", "Brighton"],
          correctOption: 2,
          transcript:
            "Attention passengers. The 10:15 service to Cambridge will depart from Platform 5. " +
            "I'm sorry — correction — Platform 7. The 10:15 to Cambridge, Platform 7. " +
            "Please mind the gap when boarding.",
        },
        {
          id: "q6",
          kind: "distractor",
          marks: 1,
          audioSrc: "/audio/listening/distractor-6.wav",
          prompt: "How does the speaker feel about the dinner?",
          options: [
            "Worried it will be too small",
            "Annoyed at the late additions",
            "Positive — it should be enjoyable",
            "Indifferent",
          ],
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
        "The total amount due is 1-6-5 pounds and 4-0 pence. We close at 6 p.m. sharp, and the " +
        "branch reopens at 9 a.m. tomorrow. If you cannot collect today, the order will be held " +
        "under reference 7-4-9-2-1 for up to five working days. After that it returns to stock " +
        "and a refund of one hundred and sixty-five pounds and forty pence will be issued to " +
        "your card.",
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
        {
          id: "q5",
          kind: "audioFill",
          marks: 1,
          prompt: "Which floor is the reception desk on?",
          answer: "second",
          acceptAlternatives: ["2nd", "2"],
        },
        {
          id: "q6",
          kind: "audioFill",
          marks: 1,
          prompt: "Closing time (e.g. 6 p.m.):",
          answer: "6 p.m.",
          acceptAlternatives: ["6pm", "18:00", "6:00 p.m."],
        },
        {
          id: "q7",
          kind: "audioFill",
          marks: 1,
          prompt: "For how many working days is the order held?",
          answer: "five",
          acceptAlternatives: ["5"],
        },
        {
          id: "q8",
          kind: "audioFill",
          marks: 1,
          prompt: "What time does the branch reopen tomorrow (e.g. 9 a.m.)?",
          answer: "9 a.m.",
          acceptAlternatives: ["9am", "9:00 a.m.", "09:00"],
        },
      ],
    },

    /* -------------------- Station 3: Paraphrase Logic ------------------- */
    {
      kind: "sentenceComplete",
      id: "sentenceComplete",
      title: "Station 3 — Paraphrase Logic",
      instructions:
        "Listen to the academic talk once. Complete each sentence with the exact word or short phrase the speaker uses.",
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
        "certain is that the old model of reef resilience no longer holds. The shorthand many " +
        "researchers use is 'ecological inertia' — the tendency of a damaged system to keep " +
        "deteriorating even after the original pressure is removed. Reversing it would require " +
        "not just stopping the warming but actively restoring what was lost, a far harder task.",
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
        {
          id: "q4",
          kind: "sentenceComplete",
          marks: 1,
          stem: "Reefs once had ______ between shocks; now they face them every few years.",
          answer: "decades",
        },
        {
          id: "q5",
          kind: "sentenceComplete",
          marks: 1,
          stem: "Some scientists propose ______ breeding of heat-tolerant coral to buy time.",
          answer: "selective",
        },
        {
          id: "q6",
          kind: "sentenceComplete",
          marks: 1,
          stem: "The old model of reef ______ no longer holds.",
          answer: "resilience",
        },
        {
          id: "q7",
          kind: "sentenceComplete",
          marks: 1,
          stem: "Researchers call the system's tendency to keep failing 'ecological ______'.",
          answer: "inertia",
        },
        {
          id: "q8",
          kind: "sentenceComplete",
          marks: 1,
          stem: "Reversing inertia requires not just stopping warming but actively ______ what was lost.",
          answer: "restoring",
          acceptAlternatives: ["restore"],
        },
      ],
    },

    /* -------------------- Station 4: Advanced Inference ------------------- */
    {
      kind: "inference",
      id: "inference",
      title: "Station 4 — Advanced Inference (Speaker Attitude)",
      instructions:
        "A single dense, fast clip plays ONCE for the whole station. The questions test what is IMPLIED — tone, attitude, consequence — not facts you can scan for. No transcript is provided. Listen once, decide carefully.",
      audioSrc: "/audio/listening/inference.wav",
      transcript:
        "So — the new housing policy. On paper it looks decisive, and I suspect that's exactly " +
        "the problem. The minister keeps calling it 'bold', which, frankly, is the word " +
        "politicians reach for when the numbers won't do the talking. Consider what's actually " +
        "in it: a cap on rent increases, a pledge to build, and a fast-track planning route. " +
        "Now, the cap will, of course, be popular with sitting tenants — and I don't doubt " +
        "their relief is genuine. But ask yourself who it helps five years on, when the very " +
        "developers we're counting on to build quietly redirect their money elsewhere, because " +
        "the returns no longer clear their hurdle. We've seen this film before, haven't we. " +
        "The pledge to build is, I'm afraid, where the boldness curdles into something closer " +
        "to theatre — there are targets, naturally, there are always targets, but the machinery " +
        "to meet them, the planners, the trades, the land, is thinner now than when the targets " +
        "were last missed. And the fast-track planning route, the supposed accelerator, is, " +
        "rather conveniently, the same lever being used to push through developments that " +
        "would never have survived proper scrutiny. So when the minister tells you this is " +
        "about families, I'd invite you to notice what he does not mention: affordability " +
        "ratios, eviction protections, the actual wage floor. Those are the numbers that would " +
        "tell you whether this is a policy for tenants or a headline for the conference season. " +
        "I think we both know which one it is.",
      questions: [
        {
          id: "q1",
          kind: "inference",
          marks: 1,
          prompt:
            "What is the speaker's overall attitude toward the policy being described?",
          options: [
            "Enthusiastically supportive",
            "Cautiously optimistic",
            "Skeptical and quietly dismissive",
            "Completely neutral",
          ],
          correctOption: 2,
        },
        {
          id: "q2",
          kind: "inference",
          marks: 1,
          prompt:
            "When the speaker says politicians call a policy 'bold', what does she imply?",
          options: [
            "The policy genuinely takes courage.",
            "The word is a distraction from weak evidence.",
            "Boldness is a legal requirement for new policy.",
            "She agrees it is a bold move.",
          ],
          correctOption: 1,
        },
        {
          id: "q3",
          kind: "inference",
          marks: 1,
          prompt:
            "What is the implied long-term consequence of the rent cap, according to the speaker?",
          options: [
            "Developers will build more affordable homes.",
            "Tenants will be permanently protected.",
            "Investment will flow elsewhere and supply will suffer.",
            "Rents will fall sharply across the country.",
          ],
          correctOption: 2,
        },
        {
          id: "q4",
          kind: "inference",
          marks: 1,
          prompt:
            "The speaker calls the building pledge 'closer to theatre'. What does this suggest?",
          options: [
            "The pledge is genuinely ambitious.",
            "The pledge is performative and unlikely to be delivered.",
            "The pledge will be funded by arts councils.",
            "The pledge was written by dramatists.",
          ],
          correctOption: 1,
        },
        {
          id: "q5",
          kind: "inference",
          marks: 1,
          prompt:
            "What does 'we've seen this film before' imply about the speaker's view?",
          options: [
            "She believes the situation is entirely unprecedented.",
            "She thinks past attempts with the same pattern failed.",
            "She has worked in the film industry.",
            "She expects a surprising, positive twist.",
          ],
          correctOption: 1,
        },
        {
          id: "q6",
          kind: "inference",
          marks: 1,
          prompt:
            "What is the implied purpose of the fast-track planning route?",
          options: [
            "To speed up genuinely needed affordable housing",
            "To bypass scrutiny on developments that couldn't pass it",
            "To reduce the number of new homes built",
            "To train more planners",
          ],
          correctOption: 1,
        },
        {
          id: "q7",
          kind: "inference",
          marks: 1,
          prompt:
            "By omitting affordability ratios and wage figures, what does the speaker suggest the minister is doing?",
          options: [
            "Being honest about the policy's reach",
            "Avoiding the metrics that would expose the policy's limits",
            "Hiding that tenants will all benefit equally",
            "Forgetting to read the report",
          ],
          correctOption: 1,
        },
        {
          id: "q8",
          kind: "inference",
          marks: 1,
          prompt:
            "'I think we both know which one it is.' What is the speaker's underlying tone here?",
          options: [
            "Genuine uncertainty, seeking the audience's help",
            "Knowing, pointed irony aimed at the audience's agreement",
            "Surprise at an unexpected outcome",
            "Apology for being unable to judge the policy",
          ],
          correctOption: 1,
        },
      ],
    },
  ],
};
