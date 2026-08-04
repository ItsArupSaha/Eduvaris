/**
 * Reading v1 — the first shipped diagnostic form.
 *
 * Authored by hand to control difficulty, distractors, and the exact sentence
 * boundaries the Proof mechanic relies on. A content bump = new version file
 * (reading-v2.ts) + new `version` number, so old attempts always re-grade
 * against their own key.
 *
 * Station budgets:
 *   1. skim     — 3 paragraphs, 3 heading-match questions
 *   2. synonym  — 1 passage, 3 paraphrase-match questions
 *   3. proof    — 1 passage (12 sentences), 4 T/F/NG, 15s per question
 *   4. scan     — 1 passage, 4 fill-in-the-blank
 *
 * 14 questions total. Overall time: 25 min (1500 s).
 */
import type { ReadingExam } from "../content-types";

export const READING_V1: ReadingExam = {
  id: "reading-v1",
  version: 1,
  module: "reading",
  durationSeconds: 25 * 60,
  stations: [
    /* ------------------------------------------------------------------- */
    {
      kind: "skim",
      id: "skim",
      title: "Station 1 — Skimming for the Main Idea",
      instructions:
        "Read each paragraph quickly. Then choose the heading that best captures its main idea. Do not read for detail — you have limited time.",
      paragraphs: [
        "For most of human history, coral reefs were considered indestructible. Sailors' logs from the eighteenth century describe the Great Barrier Reef as an endless wall of stone that simply grew back whatever storms broke off. That perception has collapsed. Within a single generation, biologists have watched large sections of the world's reefs turn from living colour to bare white skeleton — a change once thought to take centuries.",
        "The driver is not a single catastrophe but a slow subtraction. Slightly warmer water forces the coral animal to expel the tiny algae living inside its tissues, the partners that supply most of its food and colour. Without them the coral starves, slowly, while still alive. This process, called bleaching, was first recorded at scale in 1998 and has returned almost every year since.",
        "Whether recovery is still possible is now a question of pace rather than possibility. Laboratory coral can be bred to tolerate heat, and patches of wild reef do survive the worst years. But heat-tolerant coral would need to outpace warming that is itself accelerating, and nobody has yet shown this can be done across thousands of square kilometres. The honest answer is that the window is narrowing, not closed.",
      ],
      questions: [
        {
          id: "q1",
          kind: "skim",
          paragraphIndex: 0,
          marks: 1,
          prompt: "Choose the best heading for Paragraph A.",
          options: [
            "A. The economic value of coral reefs",
            "B. A shattered assumption of permanence",
            "C. How sailors mapped the reef in the 1700s",
            "D. The chemical makeup of coral skeletons",
          ],
          correctOption: 1,
        },
        {
          id: "q2",
          kind: "skim",
          paragraphIndex: 1,
          marks: 1,
          prompt: "Choose the best heading for Paragraph B.",
          options: [
            "A. A sudden geological collapse",
            "B. Pollution from coastal factories",
            "C. A slow starvation triggered by warmth",
            "D. Predatory fish that eat coral",
          ],
          correctOption: 2,
        },
        {
          id: "q3",
          kind: "skim",
          paragraphIndex: 2,
          marks: 1,
          prompt: "Choose the best heading for Paragraph C.",
          options: [
            "A. A guaranteed recovery within a decade",
            "B. The impossibility of any future for reefs",
            "C. Tourism as the main obstacle to repair",
            "D. A closing window, not a final verdict",
          ],
          correctOption: 3,
        },
      ],
    },

    /* ------------------------------------------------------------------- */
    {
      kind: "synonym",
      id: "synonym",
      title: "Station 2 — Synonym & Inference",
      instructions:
        "Each question rephrases an idea from the passage in different words. Pick the option whose meaning is closest to the original sentence.",
      passage:
        "Bleaching does not kill coral outright; it removes the organism's ability to feed itself. The polyp, left only with what it can catch on its own, slowly weakens. If temperatures return to normal within weeks, the algae may return and the coral recover. If the heat persists, the polyp dies and the reef begins to erode, a process that cannot be reversed by removing the original cause.",
      questions: [
        {
          id: "q1",
          kind: "synonym",
          marks: 1,
          prompt:
            "The author says bleaching 'removes the organism's ability to feed itself.' Which option best restates this?",
          options: [
            "Bleaching gives coral a new food source.",
            "Bleaching leaves the polyp temporarily or permanently without nutrition.",
            "Bleaching makes coral grow faster.",
            "Bleaching changes the coral's colour but not its diet.",
          ],
          correctOption: 1,
        },
        {
          id: "q2",
          kind: "synonym",
          marks: 1,
          prompt:
            "'If temperatures return to normal within weeks, the algae may return.' This means recovery is:",
          options: [
            "Impossible after bleaching.",
            "Guaranteed once temperatures drop.",
            "Conditional on the heat ending quickly enough.",
            "Dependent on human intervention.",
          ],
          correctOption: 2,
        },
        {
          id: "q3",
          kind: "synonym",
          marks: 1,
          prompt:
            "The author says erosion 'cannot be reversed by removing the original cause.' The closest meaning is:",
          options: [
            "Stopping the heat will rebuild an eroded reef.",
            "Once erosion begins, fixing the cause alone is not enough.",
            "Erosion is caused by too many fish.",
            "Erosion is a temporary seasonal effect.",
          ],
          correctOption: 1,
        },
      ],
    },

    /* ------------------------------------------------------------------- */
    {
      kind: "proof",
      id: "proof",
      title: "Station 3 — True / False / Not Given (with Proof)",
      instructions:
        "For each statement, first decide: True, False, or Not Given. If True or False, you must then click the exact sentence in the passage that proves your choice. You have 15 seconds per statement. 'Not Given' means the passage does not say either way — no proof sentence exists.",
      passage: {
        // Each entry is one discrete, clickable block in the UI.
        sentences: [
          "The idea that a species could be erased from the fossil record while still alive sounds impossible, yet it is exactly what some biologists now fear for coral.",
          "A species is conventionally considered extinct only after no living individual has been seen for fifty years.",
          "Reefs, however, do not vanish all at once; they degrade across many human lifetimes.",
          "A coral colony can therefore be functionally dead long before the last fragment of it dies.",
          "This gap between biological death and official recognition has no agreed name in biology.",
          "Some researchers call it 'zombie ecology', though the term has not been widely adopted.",
          "The phrase refers to ecosystems that continue to exist in name while having lost the activity that defined them.",
          "Critics argue that the term is melodramatic and obscures the slow recovery that does occur.",
          "What nobody disputes is that the gap exists and that it misleads the public.",
          "Headlines that announce 'the reef is dying' are therefore, in a narrow sense, often premature.",
          "They are also, in a deeper sense, often too late.",
          "The hardest part of communicating coral loss is that the most important moment is invisible.",
        ],
      },
      questions: [
        {
          id: "q1",
          kind: "tfng",
          marks: 1,
          statement: "Biologists consider a species extinct as soon as it stops reproducing.",
          verdict: "false",
          proofSentenceIndex: 1,
        },
        {
          id: "q2",
          kind: "tfng",
          marks: 1,
          statement: "Reefs disappear instantly when the coral dies.",
          verdict: "false",
          proofSentenceIndex: 2,
        },
        {
          id: "q3",
          kind: "tfng",
          marks: 1,
          statement: "All scientists agree that the term 'zombie ecology' is the correct label.",
          verdict: "not_given",
          // No proof sentence — by design. Not Given = passage doesn't decide.
          proofSentenceIndex: null,
        },
        {
          id: "q4",
          kind: "tfng",
          marks: 1,
          statement: "A coral colony can be functionally dead before its last fragment dies.",
          verdict: "true",
          proofSentenceIndex: 3,
        },
      ],
      perQuestionSeconds: 15,
    },

    /* ------------------------------------------------------------------- */
    {
      kind: "scan",
      id: "scan",
      title: "Station 4 — Precision Scanning",
      instructions:
        "Fill each blank with the exact word from the passage. Spelling counts — answers are matched after lowercasing, trimming, and stripping punctuation, but typos are marked wrong.",
      passage:
        "Mangrove forests line roughly two-thirds of tropical coastlines. Their dense, tangled roots trap sediment flowing from rivers, slowing the rate at which coastal land erodes into the sea. A single hectare of mature mangrove can store up to four times more carbon than the same area of rainforest, mostly buried deep in waterlogged soil where decomposition is slow. Despite this, mangroves are disappearing faster than almost any other habitat — cleared for shrimp farms, salt pans, and coastal resorts.",
      questions: [
        {
          id: "q1",
          kind: "scan",
          marks: 1,
          contextSentence: "Mangrove roots ____ sediment flowing from rivers.",
          answer: "trap",
        },
        {
          id: "q2",
          kind: "scan",
          marks: 1,
          contextSentence:
            "A hectare of mangrove stores up to ____ times more carbon than rainforest.",
          answer: "four",
          acceptAlternatives: ["4"],
        },
        {
          id: "q3",
          kind: "scan",
          marks: 1,
          contextSentence: "Carbon is buried in ____ soil where decomposition is slow.",
          answer: "waterlogged",
        },
        {
          id: "q4",
          kind: "scan",
          marks: 1,
          contextSentence: "Mangroves are cleared for shrimp farms, salt pans, and coastal ____.",
          answer: "resorts",
        },
      ],
    },
  ],
};

/**
 * The form's id/version are read by the registry (exam-forms.ts). Active-form
 * selection + id-based lookup happen there now — this file is pure content.
 */

