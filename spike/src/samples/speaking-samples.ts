/**
 * 6 synthetic IELTS Speaking transcripts (Part-3 style abstract questions).
 *
 * Realistic Bangladeshi student spoken English at three levels. Each carries
 * quantitative inputs (WPM, response latency in ms) that anchor the fluency
 * score — the Examiner is told to use these, not STT filler-word counting.
 */

export interface SpeakingSample {
  id: string;
  level: "weak" | "mid" | "strong";
  manualBand: number;
  manualReasoning: string;
  wpm: number;
  latencyMs: number;
  prompt: string;
  transcript: string;
}

const s1: SpeakingSample = {
  id: "S-weak-1",
  level: "weak",
  manualBand: 5,
  manualReasoning:
    "Slow (WPM 62), heavy latency (5200ms), short turns, frequent basic errors, " +
    "dodges the abstract question with personal anecdote, repetition. " +
    "Fluency 5 / Grammar 4.5 / Lexical 5 / Abstract 5.",
  wpm: 62,
  latencyMs: 5200,
  prompt: "Do you think success is more about talent or about hard work?",
  transcript: `Hmm... yes... I think... hard work is very important. Because my father he work very hard every day and he get good result. So I think hard work. Talent is also good but... without work talent is nothing. So... yes... I believe hard work more important. My cousin also he study hard and he get scholarship in America. So hard work is the main thing for success.`,
};

const s2: SpeakingSample = {
  id: "S-weak-2",
  level: "weak",
  manualBand: 4.5,
  manualReasoning:
    "Very short, one-line answers with no development, frequent S-V errors, " +
    "limited vocabulary, repetition of the question. Band 4-5.",
  wpm: 58,
  latencyMs: 6100,
  prompt: "How important is it for people to keep learning new things throughout their lives?",
  transcript: `Learning new things is important. People should learn always. If people not learn then they cannot growth. Now technology change fast so we must learn. My teacher she say learning never stop. So everyone should learn new things in whole life. That is my opinion.`,
};

const s3: SpeakingSample = {
  id: "S-mid-1",
  level: "mid",
  manualBand: 6,
  manualReasoning:
    "Willing to produce longer turn (WPM 92). Some hesitation causes coherence loss. " +
    "Range of discourse markers but not always appropriate ('basically' overuse). " +
    "Errors frequent in complex structures but rarely impede. 6/6/6/6.",
  wpm: 92,
  latencyMs: 2900,
  prompt: "Should governments spend money on space exploration, or are there better uses for those funds?",
  transcript: `Well this is a interesting question. Basically I think space exploration is important but we have also many problems in earth that need money. Basically the government should find a balance. For example if we spend all money on space then poor people they will suffer because no money for hospital and school. But also space research give us new technology like satellite which help for communication and weather forecast. So basically my opinion is government should spend some money on space but more money on earth problems like poverty and education because these are more urgent for developing country.`,
};

const s4: SpeakingSample = {
  id: "S-mid-2",
  level: "mid",
  manualBand: 6.5,
  manualReasoning:
    "Longer turn, clearer position than S-mid-1, some good lexis ('allocate resources', " +
    "'tangible benefits'). But tense drift and article errors in complex structures. " +
    "Fluency 6.5 / Grammar 6 / Lexical 6.5 / Abstract 6.5.",
  wpm: 101,
  latencyMs: 2400,
  prompt: "Do you think social media has made people more connected or more isolated?",
  transcript: `That is a really good question and I have mixed feeling about it. On one hand social media definitely connect people because I can talk with my friend who live in another country very easily and cheaply. Before this was not possible. But on the other hand I think it also make people more isolated in a way because many people they just look at their phone and they do not talk with the person who is sitting next to them. For example in my family during dinner everyone is checking Facebook instead of talking. So I think the technology itself is neutral but how we use it decide if it connect or isolate. We need to be discipline about our screen time.`,
};

const s5: SpeakingSample = {
  id: "S-strong-1",
  level: "strong",
  manualBand: 7.5,
  manualReasoning:
    "Fluent long turn (WPM 124), mostly content-related hesitation, flexible discourse " +
    "markers, complex grammar mostly accurate, precise lexis, directly engages the " +
    "abstract question with reasoning + example. 7.5/7.5/7.5/7.5.",
  wpm: 124,
  latencyMs: 1600,
  prompt: "Do you think technological progress always leads to a better quality of life?",
  transcript: `Not necessarily, and I think that assumption is actually quite dangerous. Technology obviously gives us comfort and convenience, but quality of life is a much broader concept that includes mental wellbeing, social relationships, and a sense of purpose. Take smartphones, for example. They've made us more efficient in many ways, but studies consistently link heavy use to anxiety and shorter attention spans, especially among teenagers. Or consider automation — it boosts productivity, but if it displaces workers faster than it creates new roles, you get communities where people lose not just income but identity. So I'd argue progress is only valuable when it's guided by some understanding of what actually makes life meaningful, rather than just what makes it faster. Technology is a tool; the outcome depends entirely on how a society chooses to use it.`,
};

const s6: SpeakingSample = {
  id: "S-strong-2",
  level: "strong",
  manualBand: 8,
  manualReasoning:
    "Fluent (WPM 131), flexible complex grammar near error-free, wide and precise " +
    "lexical resource ('zero-sum framing', 'instrumentalising', 'civic fabric'), " +
    "nuanced abstract reasoning with apt example. 8/8/7.5/8.",
  wpm: 131,
  latencyMs: 1400,
  prompt: "Some people say competition is the main driver of progress. Do you agree?",
  transcript: `I'd push back on that framing, actually, because it treats competition and cooperation as opposites when in reality the most meaningful progress tends to emerge from both working together. Competition certainly sharpens incentives — markets, academic rankings, even sports, they all force people to improve. But the underlying infrastructure that makes competition productive is almost always cooperative in nature. The internet, the scientific method, open-source software — these are collective achievements that no single competitor built, and they're what allows competition to yield anything worthwhile at all. I also think the pure-competition narrative can be corrosive if taken too far. When every interaction becomes transactional, you erode the trust and civic fabric that society depends on, and ironically you end up with less innovation, not more. So I'd reframe the claim: competition is an important catalyst, but it needs a cooperative substrate to produce genuine, lasting progress.`,
};

export const speakingSamples: SpeakingSample[] = [s1, s2, s3, s4, s5, s6];
