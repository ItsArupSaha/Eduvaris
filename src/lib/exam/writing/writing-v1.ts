/**
 * Writing v1 — first shipped Writing diagnostic form.
 *
 * Restructured as a genuine 25-minute pressure test of cognitive endurance.
 *
 *   1. paraphrase    — 5 prompts, 1 min each (5 min), easy→hard lexical ladder.
 *   2. cohesion      — 2 scrambled paragraphs (5 min), drag-and-drop reorder
 *                      + transition-chip gap placement.
 *   3. bodyParagraph — 1 IELTS Task 2 prompt, full 250-word essay (15 min),
 *                      live word counter (amber 200, green 250+).
 *
 * Overall time: 25 min (1500 s). AI grading lands in Task 10; for now the
 * deterministic grader handles cohesion exactly and marks free text as
 * submitted.
 */
import type { WritingExam } from "../content-types";

export const WRITING_V1: WritingExam = {
  id: "writing-v1",
  version: 1,
  module: "writing",
  durationSeconds: 25 * 60,
  stations: [
    /* ----------------------- Station 1: Paraphrasing --------------------- */
    {
      kind: "paraphrase",
      id: "paraphrase",
      title: "Station 1 — Paraphrasing",
      instructions:
        "Rewrite each prompt in 1-2 sentences WITHOUT using the banned words. You have exactly 1 minute per prompt. The prompts get harder as you go.",
      questions: [
        {
          // Rung 1 — moderate, common vocabulary.
          id: "q1",
          kind: "paraphrase",
          marks: 1,
          prompt:
            "Many people believe that social media has a detrimental effect on personal relationships.",
          bannedWords: ["detrimental", "effect", "many", "believe"],
          perQuestionSeconds: 60,
        },
        {
          // Rung 2 — slightly more abstract.
          id: "q2",
          kind: "paraphrase",
          marks: 1,
          prompt:
            "The government should invest more money in public transportation to reduce traffic congestion.",
          bannedWords: ["invest", "reduce", "congestion", "should"],
          perQuestionSeconds: 60,
        },
        {
          // Rung 3 — academic register.
          id: "q3",
          kind: "paraphrase",
          marks: 1,
          prompt:
            "Technology has fundamentally altered the way young people communicate with each other.",
          bannedWords: ["fundamentally", "altered", "communicate", "technology"],
          perQuestionSeconds: 60,
        },
        {
          // Rung 4 — complex clause structure.
          id: "q4",
          kind: "paraphrase",
          marks: 1,
          prompt:
            "Notwithstanding the overwhelming evidence, a significant proportion of the populace remains skeptical about the efficacy of the proposed intervention.",
          bannedWords: [
            "notwithstanding",
            "overwhelming",
            "proportion",
            "efficacy",
            "skeptical",
          ],
          perQuestionSeconds: 60,
        },
        {
          // Rung 5 — dense, abstract, hedged academic claim.
          id: "q5",
          kind: "paraphrase",
          marks: 1,
          prompt:
            "The ostensibly inexorable march of urbanisation has precipitated a concomitant decline in the cultural cohesion that historically characterised rural communities.",
          bannedWords: [
            "ostensibly",
            "inexorable",
            "precipitated",
            "concomitant",
            "cohesion",
          ],
          perQuestionSeconds: 60,
        },
      ],
    },

    /* ----------------------- Station 2: Cohesion ------------------------ */
    {
      kind: "cohesion",
      id: "cohesion",
      title: "Station 2 — Cohesion Builder",
      instructions:
        "For each paragraph: drag the sentences into a logical order, then drag the best transition chip into the gap where it belongs. You have 5 minutes for both paragraphs.",
      questions: [
        {
          // Paragraph A — cause/effect on coral migration.
          id: "q1",
          kind: "cohesion",
          marks: 1,
          scrambledSentences: [
            "As a result, many species are forced to migrate to cooler waters, disrupting entire marine ecosystems.",
            "Rising ocean temperatures have emerged as one of the most visible consequences of climate change.",
            "This migration, however, is not always possible for slow-moving or bottom-dwelling creatures.",
            "Coral reefs, in particular, cannot relocate and instead undergo bleaching when the heat becomes extreme.",
          ],
          // Correct order: topic(1) → consequence(0) → limitation(2) → case(3)
          correctOrder: [1, 0, 2, 3],
          transitionOptions: [
            "In contrast",
            "Furthermore",
            "Nevertheless",
            "Similarly",
          ],
          // "In contrast" — the coral case contrasts with migrating species.
          correctTransition: 0,
          // Placed in gap 3 — between sentence 3 (the limitation) and
          // sentence 4 (the coral case).
          correctTransitionGap: 3,
        },
        {
          // Paragraph B — remote work productivity.
          id: "q2",
          kind: "cohesion",
          marks: 1,
          scrambledSentences: [
            "Employees who work from home report higher levels of focus, citing fewer interruptions from colleagues.",
            "The shift toward remote work has reshaped how companies measure productivity.",
            "Traditional metrics, such as hours spent at a desk, no longer capture the full picture of output.",
            "Consequently, many firms have begun evaluating staff on deliverables rather than presence.",
          ],
          // Correct order: topic(1) → evidence(0) → problem(2) → result(3)
          correctOrder: [1, 0, 2, 3],
          transitionOptions: [
            "Moreover",
            "Consequently",
            "Meanwhile",
            "Conversely",
          ],
          // "Moreover" — adds further evidence after the focus claim.
          correctTransition: 0,
          // Placed in gap 1 — between the topic and the first evidence.
          correctTransitionGap: 1,
        },
      ],
    },

    /* ---------------------- Station 3: Body Paragraph -------------------- */
    {
      kind: "bodyParagraph",
      id: "bodyParagraph",
      title: "Station 3 — Pressure Production",
      instructions:
        "Write a full IELTS Task 2 essay (minimum 250 words) responding to the prompt. The word counter turns amber at 200 and green at 250. You have 15 minutes.",
      questions: [
        {
          id: "q1",
          kind: "bodyParagraph",
          marks: 1,
          prompt:
            "Some experts argue that remote work reduces employee productivity, while others claim it improves work-life balance and overall output. " +
            "Discuss both these views and give your own opinion. " +
            "Give reasons for your answer and include any relevant examples from your own knowledge or experience.",
          minWords: 250,
        },
      ],
    },
  ],
};
