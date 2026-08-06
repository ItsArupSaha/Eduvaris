/**
 * Speaking v1 — finalized Speaking diagnostic form.
 *
 * 4 stations, 11 graded transcript items. The app acts as the examiner: it
 * auto-plays teacher audio clips (placeholder silent WAVs under
 * /public/audio/speaking/) to brief or question the candidate. Student audio
 * is captured by the MediaRecorder API, uploaded to Firebase Storage in the
 * background, and transcribed server-side by Whisper on submit — but the
 * transcript is NEVER shown to the student.
 *
 *   1. imageFluency  — 3 images, 15s analysis + up to 60s speak each.
 *   2. rapidFire     — 3 Part 1 audio questions, 30s answer each.
 *   3. cueCard       — teacher briefing + 1 Part 2 cue card, 60s prep + full 120s speak (no cut-off).
 *   4. abstractAnswer — 4 Part 3 audio questions, 90s answer each.
 *
 * Overall time: 15 min (900 s).
 *
 * Audio + image assets are placeholders. Swap the files (keep filenames) to
 * ship real prompts — no code change needed.
 */
import type { SpeakingExam } from "../content-types";

export const SPEAKING_V1: SpeakingExam = {
  id: "speaking-v1",
  version: 1,
  module: "speaking",
  durationSeconds: 15 * 60,
  stations: [
    /* ----------------------- Station 1: Image Fluency ------------------- */
    {
      kind: "imageFluency",
      id: "imageFluency",
      title: "Station 1 — Spontaneous Fluency",
      instructions:
        "For each image: you have 15 seconds to analyse it, then up to 60 seconds to describe what you see. You can start speaking early by clicking the button.",
      questions: [
        {
          id: "q1",
          kind: "imageFluency",
          marks: 1,
          imageSrc: "/images/speaking/image-1.svg",
          analysisSeconds: 15,
          speakSeconds: 60,
        },
        {
          id: "q2",
          kind: "imageFluency",
          marks: 1,
          imageSrc: "/images/speaking/image-2.svg",
          analysisSeconds: 15,
          speakSeconds: 60,
        },
        {
          id: "q3",
          kind: "imageFluency",
          marks: 1,
          imageSrc: "/images/speaking/image-3.svg",
          analysisSeconds: 15,
          speakSeconds: 60,
        },
      ],
    },

    /* ----------------------- Station 2: Rapid Fire ---------------------- */
    {
      kind: "rapidFire",
      id: "rapidFire",
      title: "Station 2 — Rapid-Fire (Part 1)",
      instructions:
        "The examiner will ask each question aloud. After the audio finishes, click 'Start Speaking'. You have 30 seconds per answer.",
      questions: [
        {
          id: "q1",
          kind: "rapidFire",
          marks: 1,
          question: "Let's talk about your hometown. Where is it located?",
          examinerAudioSrc: "/audio/speaking/rf-1.wav",
          answerSeconds: 30,
        },
        {
          id: "q2",
          kind: "rapidFire",
          marks: 1,
          question: "What do you enjoy doing in your free time?",
          examinerAudioSrc: "/audio/speaking/rf-2.wav",
          answerSeconds: 30,
        },
        {
          id: "q3",
          kind: "rapidFire",
          marks: 1,
          question: "Has your taste in music changed since you were a child?",
          examinerAudioSrc: "/audio/speaking/rf-3.wav",
          answerSeconds: 30,
        },
      ],
    },

    /* ------------------------ Station 3: Cue Card ----------------------- */
    {
      kind: "cueCard",
      id: "cueCard",
      title: "Station 3 — Narrative Tense Control (Part 2)",
      // Spoken aloud by the teacher at the start of this station. The on-screen
      // text mirrors the audio so the written + spoken scripts stay in sync.
      examinerAudioSrc: "/audio/speaking/cue-instructions.wav",
      instructions:
        "Now I'd like you to speak for one to two minutes on a given topic. You have one minute to prepare before you speak. The cue card is on the screen. After your preparation time, you must speak for the full two minutes — there is no early cut-off.",
      questions: [
        {
          id: "q1",
          kind: "cueCard",
          marks: 1,
          topic: "Describe a memorable journey you have taken.",
          prompts: [
            "Where you went",
            "Who you went with",
            "What you did during the journey",
            "And explain why it was memorable",
          ],
          prepSeconds: 60,
          speakSeconds: 120,
          startCueSrc: "/audio/speaking/cue-start.wav",
        },
      ],
    },

    /* ---------------------- Station 4: Abstract ------------------------- */
    {
      kind: "abstractAnswer",
      id: "abstractAnswer",
      title: "Station 4 — Abstract Articulation (Part 3)",
      instructions:
        "The examiner will ask each question aloud. After the audio finishes, click 'Start Speaking'. You have 90 seconds per answer.",
      questions: [
        {
          id: "q1",
          kind: "abstractAnswer",
          marks: 1,
          question:
            "Some people say that success in life comes from taking risks, while others believe it comes from careful planning. Which view do you agree with, and why?",
          examinerAudioSrc: "/audio/speaking/abs-1.wav",
          answerSeconds: 90,
        },
        {
          id: "q2",
          kind: "abstractAnswer",
          marks: 1,
          question:
            "How far do you think technology has improved the quality of education in your country?",
          examinerAudioSrc: "/audio/speaking/abs-2.wav",
          answerSeconds: 90,
        },
        {
          id: "q3",
          kind: "abstractAnswer",
          marks: 1,
          question:
            "Do you think young people today face more pressure than previous generations?",
          examinerAudioSrc: "/audio/speaking/abs-3.wav",
          answerSeconds: 90,
        },
        {
          id: "q4",
          kind: "abstractAnswer",
          marks: 1,
          question:
            "To what extent should governments regulate the way people use social media?",
          examinerAudioSrc: "/audio/speaking/abs-4.wav",
          answerSeconds: 90,
        },
      ],
    },
  ],
};
