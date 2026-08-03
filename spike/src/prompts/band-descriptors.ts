/**
 * Official IELTS band descriptors — British Council public rubric,
 * "Updated May 2023" version.
 *
 * Sources:
 *   https://takeielts.britishcouncil.org/sites/default/files/ielts_writing_band_descriptors.pdf
 *   https://takeielts.britishcouncil.org/sites/default/files/ielts_speaking_band_descriptors.pdf
 *
 * Text below is verbatim/paraphrased from those PDFs. Negative-limiter phrases
 * (bolded in the official PDF as "will limit a rating") are wrapped in [LIM ... LIM].
 *
 * The "Pronunciation" speaking criterion is deliberately omitted: the Web Speech
 * API cannot grade it reliably (Section 6, Pronunciation Proxy). It is replaced
 * by "Abstract_Logic" (authored, see below) — the product measures Part-3-style
 * abstract reasoning, not pronunciation.
 */

export const SCORING_RULES = `
SCORING RULES (from the official rubric preamble):
1. FULLY-FIT RULE: A script earns band N ONLY if it meets ALL positive features
   of band N. Partial fit drops it to the band whose features ARE fully met.
2. NEGATIVE-LIMITER RULE: Phrases wrapped in [LIM ... LIM] cap the rating. If a
   [LIM] feature is present, the rating cannot exceed that band even if other
   signals read higher.
3. Aggregate score = arithmetic mean of the 4 criteria, rounded to nearest half-band.
`;

// ============================================================================
// WRITING TASK 2
// ============================================================================

export const WRITING_TASK_RESPONSE = `
TASK RESPONSE (Idea Development) — bands 5/6/7/8

Band 8
- The prompt is appropriately and sufficiently addressed.
- A clear and well-developed position is presented.
- Ideas are relevant, well extended and supported.
- Occasional omissions or lapses in content may occur.

Band 7
- The main parts of the prompt are appropriately addressed.
- A clear and developed position is presented.
- Main ideas are extended and supported [LIM but there may be a tendency to
  over-generalise or there may be a lack of focus and precision in supporting
  ideas/material. LIM]

Band 6
- The main parts of the prompt are addressed (though some may be more fully
  covered than others).
- A position is presented that is directly relevant to the prompt, [LIM although
  the conclusions drawn may be unclear, unjustified or repetitive. LIM]
- Main ideas are relevant, [LIM but some may be insufficiently developed or may
  lack clarity, while some supporting arguments and evidence may be less relevant
  or inadequate. LIM]

Band 5
- The main parts of the prompt are incompletely addressed. [LIM The format may be
  inappropriate in places. LIM]
- The writer expresses a position, [LIM but the development is not always clear. LIM]
- [LIM Some main ideas are put forward, but they are limited and are not
  sufficiently developed and/or there may be irrelevant detail. LIM]
- There may be some repetition.
`;

export const WRITING_COHERENCE = `
COHERENCE & COHESION — bands 5/6/7/8

Band 8
- The message can be followed with ease.
- Information and ideas are logically sequenced; cohesion is well managed.
- Occasional lapses may occur.
- Paragraphing is used sufficiently and appropriately.

Band 7
- Information and ideas are logically organised; clear progression throughout.
  (A few lapses may occur, but minor.)
- A range of cohesive devices including reference and substitution is used
  flexibly but with some inaccuracies or some over/under use.
- Paragraphing is generally used effectively; sequencing within paragraphs is
  generally logical.

Band 6
- Information and ideas are generally arranged coherently; clear overall progression.
- Cohesive devices are used to some good effect [LIM but cohesion within and/or
  between sentences may be faulty or mechanical due to misuse, overuse or
  omission. LIM]
- [LIM The use of reference and substitution may lack flexibility or clarity and
  result in some repetition or error. LIM]
- [LIM Paragraphing may not always be logical and/or the central topic may not
  always be clear. LIM]

Band 5
- Organisation is evident [LIM but is not wholly logical and there may be a lack
  of overall progression. LIM] (Nevertheless, a sense of underlying coherence.)
- The relationship of ideas can be followed [LIM but the sentences are not
  fluently linked to each other. LIM]
- [LIM There may be limited/overuse of cohesive devices with some inaccuracy. LIM]
- [LIM The writing may be repetitive due to inadequate and/or inaccurate use of
  reference and substitution. LIM]
- [LIM Paragraphing may be inadequate or missing. LIM]
`;

export const WRITING_LEXICAL = `
LEXICAL RESOURCE — bands 5/6/7/8

Band 8
- A wide resource is fluently and flexibly used to convey precise meanings.
- Skilful use of uncommon and/or idiomatic items when appropriate, despite
  occasional inaccuracies in word choice and collocation.
- Occasional errors in spelling and/or word formation may occur, but minimal
  impact on communication.

Band 7
- The resource is sufficient to allow some flexibility and precision.
- Some ability to use less common and/or idiomatic items.
- An awareness of style and collocation is evident, though inappropriacies occur.
- A few errors in spelling and/or word formation; they do not detract from clarity.

Band 6
- The resource is generally adequate and appropriate for the task.
- The meaning is generally clear [LIM in spite of a rather restricted range or a
  lack of precision in word choice. LIM]
- If the writer is a risk-taker, a wider range is used but with higher inaccuracy.
- Some errors in spelling and/or word formation, but these do not impede
  communication.

Band 5
- The resource is limited but minimally adequate for the task.
- Simple vocabulary may be used accurately [LIM but the range does not permit much
  variation in expression. LIM]
- [LIM There may be frequent lapses in the appropriacy of word choice and a lack
  of flexibility is apparent in frequent simplifications and/or repetitions. LIM]
- [LIM Errors in spelling and/or word formation may be noticeable and may cause
  some difficulty for the reader. LIM]
`;

export const WRITING_GRAMMAR = `
GRAMMATICAL RANGE & ACCURACY — bands 5/6/7/8

Band 8
- A wide range of structures is flexibly and accurately used.
- The majority of sentences are error-free; punctuation is well managed.
- Occasional, non-systematic errors; minimal impact on communication.

Band 7
- A variety of complex structures is used with some flexibility and accuracy.
- Grammar and punctuation are generally well controlled; error-free sentences are
  frequent.
- A few errors may persist; they do not impede communication.

Band 6
- A mix of simple and complex sentence forms is used [LIM but flexibility is
  limited. LIM]
- [LIM Examples of more complex structures are not marked by the same level of
  accuracy as in simple structures. LIM]
- Errors in grammar and punctuation occur, but rarely impede communication.

Band 5
- [LIM The range of structures is limited and rather repetitive. LIM]
- [LIM Although complex sentences are attempted, they tend to be faulty, and the
  greatest accuracy is achieved on simple sentences. LIM]
- [LIM Grammatical errors may be frequent and cause some difficulty for the
  reader. LIM]
- [LIM Punctuation may be faulty. LIM]
`;

export const WRITING_DESCRIPTORS = [
  WRITING_TASK_RESPONSE,
  WRITING_COHERENCE,
  WRITING_LEXICAL,
  WRITING_GRAMMAR,
].join("\n");

// ============================================================================
// SPEAKING
// ============================================================================

export const SPEAKING_FLUENCY = `
FLUENCY & COHESION — bands 5/6/7/8

NOTE: In this product, fluency is judged from QUANTITATIVE INPUTS supplied with
the transcript — Words-Per-Minute (WPM) and response latency (ms). Do NOT count
filler words ("um/uh") from the transcript text; STT drops them unreliably
(Section 6 tech note). Map the WPM/latency to the descriptors below:

  WPM >= 130, latency < 1500ms  -> band 8 zone (fluent, only very occasional
                                   repetition/self-correction)
  WPM 100-129, latency ~1500-2500ms -> band 7 zone (long turns without
                                   noticeable effort)
  WPM 75-99,  latency ~2500-4000ms  -> band 6 zone (willing to produce long
                                   turns; coherence lost at times)
  WPM < 75,   latency > 4000ms      -> band 5 zone (relies on repetition /
                                   slow speech)

These are ANCHORS, not hard cutoffs — combine with transcript evidence
(repetition, self-correction markers, discourse-marker overuse).

Band 8: Fluent with only very occasional repetition or self-correction.
        Hesitation mostly content-related. Topic development coherent, relevant.
Band 7: Able to keep going; long turns without noticeable effort. Some hesitation
        indicates language-access problems but does NOT affect coherence.
        Flexible use of discourse markers/connectives.
Band 6: Willing to produce long turns. Coherence may be lost at times via
        hesitation/repetition/self-correction. Range of discourse markers but
        [LIM not always appropriately. LIM]
Band 5: Usually keeps going [LIM but relies on repetition and self-correction
        and/or slow speech. LIM] Hesitations = mid-sentence searches for basic
        lexis/grammar. [LIM Overuse of certain discourse markers. LIM] Complex
        speech causes disfluency; simpler language may be fluent.
`;

export const SPEAKING_GRAMMAR = `
GRAMMATICAL RANGE & ACCURACY (Speaking) — bands 5/6/7/8

Band 8: Wide range of structures, flexibly used. Majority of sentences error free.
        Occasional non-systematic errors; a few basic errors may persist.
Band 7: A range of structures flexibly used. Error-free sentences frequent.
        Simple and complex sentences used effectively despite some errors.
        A few basic errors persist.
Band 6: A mix of short and complex forms; variety of structures [LIM with limited
        flexibility. LIM] [LIM Errors frequently occur in complex structures LIM]
        but rarely impede communication.
Band 5: Basic sentence forms fairly well controlled for accuracy. [LIM Complex
        structures are attempted but limited in range, nearly always contain
        errors and may lead to reformulation. LIM]
`;

export const SPEAKING_LEXICAL = `
LEXICAL RESOURCE (Speaking) — bands 5/6/7/8

Band 8: Wide resource, readily and flexibly used for all topics; precise meaning.
        Skilful use of less common and idiomatic items. Effective paraphrase.
Band 7: Resource flexibly used for a variety of topics. Some ability with less
        common/idiomatic items; awareness of style/collocation. Effective paraphrase.
Band 6: Resource sufficient to discuss topics at length. Vocabulary use may be
        inappropriate but meaning is clear. Generally able to paraphrase.
Band 5: Resource sufficient for familiar and unfamiliar topics [LIM but limited
        flexibility. LIM] [LIM Attempts paraphrase but not always with success. LIM]
`;

// ============================================================================
// ABSTRACT_LOGIC — authored FC + TR hybrid (not in official rubric)
// ============================================================================
// Approved design: hybrid of Speaking "Fluency & Coherence — topic development
// coherent, appropriate and relevant" (band 8 FC) and Writing "Task Response —
// position developed, ideas extended and supported" (band 8 TR).
//
// Measures how the candidate handles Part-3-style abstract questions: do they
// address the abstract question directly, develop a clear position, and support
// it with relevant reasoning or examples — as opposed to dodging into anecdote,
// repeating the prompt, or giving a one-line answer.
// ============================================================================

export const SPEAKING_ABSTRACT_LOGIC = `
ABSTRACT_LOGIC (authored criterion — NOT in the official IELTS rubric).
Measures handling of Part-3-style abstract questions. Hybrid of Speaking FC
("topic development coherent, appropriate and relevant") and Writing TR
("position developed, ideas extended and supported").

Band 8: Directly addresses the abstract question. Develops a clear, well-formed
        position. Supports it with relevant reasoning and/or apt examples.
        Topic development is coherent, appropriate and relevant throughout.
Band 7: Addresses the abstract question. Presents a developed position. Ideas are
        extended and supported [LIM but there may be a tendency to over-generalise
        or a lack of focus and precision in supporting ideas. LIM]
Band 6: Addresses the question, [LIM though some parts more fully than others. LIM]
        A directly relevant position is presented [LIM but conclusions may be
        unclear, unjustified or repetitive. LIM] [LIM Some ideas insufficiently
        developed; some supporting arguments less relevant or inadequate. LIM]
Band 5: [LIM The abstract question is incompletely addressed. LIM] A position is
        expressed [LIM but development is not always clear. LIM] [LIM Ideas are
        limited, not sufficiently developed, and/or there is irrelevant detail or
        mere anecdote that dodges the abstract point. LIM] Repetition of the
        prompt or one-line non-answers land here.
`;

export const SPEAKING_DESCRIPTORS = [
  SPEAKING_FLUENCY,
  SPEAKING_GRAMMAR,
  SPEAKING_LEXICAL,
  SPEAKING_ABSTRACT_LOGIC,
].join("\n");
