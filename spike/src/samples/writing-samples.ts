/**
 * 6 synthetic IELTS Writing Task 2 essays.
 *
 * Authored to mimic realistic Bangladeshi student English at three levels:
 *   weak  (~band 5)   — systemic grammar errors, mechanical cohesion, thin ideas
 *   mid   (~band 6)   — communicative but error-laden, mechanical cohesion
 *   strong(~band 7.5) — flexible, mostly accurate, well-developed
 *
 * Each carries a `manualBand` = ground truth for the consistency check.
 * The reasoning documents WHY this band — used to sanity-check the Examiner.
 */

export interface WritingSample {
  id: string;
  level: "weak" | "mid" | "strong";
  manualBand: number; // ground truth
  manualReasoning: string;
  prompt: string;
  text: string;
}

const w1: WritingSample = {
  id: "W-weak-1",
  level: "weak",
  manualBand: 5,
  manualReasoning:
    "Systematic errors: articles missing, S-V agreement ('people wants'), tense drift, " +
    "memorized 'Every coin has two sides', mechanical Firstly/Secondly, very thin development. " +
    "All four criteria land at 5-5.5.",
  prompt:
    "Some people think that the government should invest more money in teaching science subjects, " +
    "while others believe that more funding should go to other subjects. Discuss both views and give your opinion.",
  text: `Nowadays education is very important for every country. Some people wants government spend more money for science subject. Other people think others subject also need money. I will discuss both view and give my opinion.

Firstly science is very important in modern time. Without science a country cannot development. For example Bangladesh need more engineer and doctor for development. If government give money for science then student can research and make new technology. Every coin has two sides.

Secondly others subject is also important like literature and history. If student only study science then they cannot learn about culture. Arts subject teach us moral value. So government should not ignore arts subject.

In my opinion government should balance both. Science give us economic development but arts give us good human. Both are necessary for society. So I think government should invest equal money for all subject.`,
};

const w2: WritingSample = {
  id: "W-weak-2",
  level: "weak",
  manualBand: 4.5,
  manualReasoning:
    "Severe S-V agreement errors, very limited range, 'due to the fact that' misused, " +
    "one-paragraph-no-paragraphing, off-task drift. Band 4-5 across the board.",
  prompt:
    "In many countries, the amount of crime is increasing. What do you think are the main causes of crime? " +
    "How can we deal with those causes?",
  text: `Crime is increase day by day in many country. It is big problem. People are afraid. There is many reason of crime and we must solve it.

One reason is poverty. Poor people do not get job so they do crime for money. Another reason is unemployment. Young people have no work so they become frustated and do crime. Also drug addiction is reason. Due to the fact that drug make people crazy and they do crime. Government should give job for young people. If people have money they do not do crime. Police should be strict and punish criminal. Family also should teach children good moral.

In conclusion crime is bad and we all responsible to stop it. Government and family both work together than crime will decrease.`,
};

const w3: WritingSample = {
  id: "W-mid-1",
  level: "mid",
  manualBand: 6,
  manualReasoning:
    "Communicative and mostly on-task. Frequent but non-impeding errors (articles, 'discuses', 'depend on'). " +
    "Mechanical cohesion (On the one hand / On the other hand) — band 6 CC limiter. " +
    "Limited lexical range. 6/6/6/6, overall 6.",
  prompt:
    "Some people believe that unpaid community service should be a compulsory part of high school programmes " +
    "(for example working for a charity, improving the neighbourhood or teaching younger children). " +
    "To what extent do you agree or disagree?",
  text: `It is often argued that community service should be a compulsory subject in high school. In my opinion, I partly agree with this idea because it has both benefits and drawbacks for students.

On the one hand, unpaid community service can teach students important life skills. For example, when students work for a charity, they learn how to communicate with different kinds of people and how to solve real problems. This kind of experience cannot be learned from text books. Moreover, it develop a sense of responsibility in young people, which is very important for their future.

On the other hand, high school students already have a lot of academic pressure. They need to prepare for public examination and university admission. If we add compulsory community service, it may increase their stress and reduce their study time. Some students may feel unfair because they have to work without payment.

In conclusion, I believe community service is valuable but it should not be compulsory for everyone. Schools can offer it as an optional activity so that interested students can join. This way, students get the benefits without extra burden on those who cannot manage.`,
};

const w4: WritingSample = {
  id: "W-mid-2",
  level: "mid",
  manualBand: 6.5,
  manualReasoning:
    "Better task response than W-mid-1 — position clearer, one extended example. " +
    "Lexical a bit more precise ('mitigate', 'wield'). But S-V agreement ('advancement have'), " +
    "article errors, mechanical cohesion hold it at 6.5. 6.5/6/6/6.5.",
  prompt:
    "Some people say that the increasing use of technology in the workplace has a negative effect on workers. " +
    "To what extent do you agree?",
  text: `The rapid advancement of technology have changed the modern workplace in many ways. While some people argue that this trend harm employees, I believe that the impact is mostly positive, although there are some genuine concerns.

On the positive side, technology make work more efficient and flexible. For instance, employees can now work from home using internet and cloud software, which save commuting time and allow a better work-life balance. In addition, automation reduce repetitive tasks, so workers can focus on more creative and meaningful parts of their job. A software developer I read about recently said that AI tools help him finish coding in half the time, which clearly mitigate stress.

However, there are legitimate negative effects. The most serious one is job displacement. When companies rely on machines, some workers lose their job and cannot easily find new one without retraining. Furthermore, constant connectivity through email and messaging apps blur the boundary between work and personal life, which can lead to burnout.

In conclusion, although technology create challenges like job loss and overwork, I think the benefits such as efficiency and flexibility outweigh them. Governments and companies should invest in retraining programmes to help workers adapt to these changes.`,
};

const w5: WritingSample = {
  id: "W-strong-1",
  level: "strong",
  manualBand: 7.5,
  manualReasoning:
    "Wide range of complex structures used accurately, precise vocabulary ('necessitate', 'instrumental', " +
    "'compelling case'), logical progression with reference/substitution, clear developed position. " +
    "Few non-impeding slips. 7.5/7.5/7/7.5.",
  prompt:
    "University education should be free for everyone. To what extent do you agree or disagree?",
  text: `The question of whether higher education should be tuition-free for all citizens has sparked considerable debate. While I agree that removing financial barriers to university is a worthy ideal, I believe a blanket free-tuition policy is neither economically realistic nor the most effective way to promote equal opportunity.

There is a compelling case for free education. When tuition is prohibitively expensive, talented students from low-income backgrounds are effectively locked out of the professions that could lift their families out of poverty. In countries such as Germany, where public universities charge no fees, social mobility is notably higher than in nations where students graduate with crippling debt. Free education, in this view, is an investment that pays for itself through a more skilled tax base.

However, the argument is more nuanced than it first appears. If universities are free for everyone, including students from wealthy families who could easily afford to pay, the system subsidises those who do not need help. This stretches limited public funds that might be better spent on early-years education, which research consistently shows yields the highest social return. A more targeted approach — means-tested tuition, generous scholarships, and income-contingent loans — achieves the equity goal without this inefficiency.

There is also a practical concern about quality. When universities depend entirely on state funding, they often face overcrowded classrooms and underpaid faculty, as has been observed in several Latin American systems. A mixed funding model, where those who can pay do so while the needy are supported, tends to produce better-resourced institutions.

In conclusion, while the principle of free higher education is laudable, a universal policy is economically inefficient and potentially damaging to quality. A means-tested system better serves the goal of genuine equal opportunity.`,
};

const w6: WritingSample = {
  id: "W-strong-2",
  level: "strong",
  manualBand: 8,
  manualReasoning:
    "Skilful use of uncommon lexis ('catalyst', 'vested', 'entrench'), flexible complex structures, " +
    "near-error-free, cohesive reference and substitution throughout, nuanced argument. " +
    "8/8/7.5/8 — overall 8.",
  prompt:
    "In some countries, more and more people are choosing to live alone. Is this a positive or negative trend?",
  text: `The rising number of single-person households is one of the most striking demographic shifts of the past half-century. Although some commentators frame this trend as a symptom of social fragmentation, I would argue that, on balance, it is a positive development that reflects genuine progress in personal autonomy.

The strongest argument in favour of solo living is that it is, for most people, a voluntary choice rather than an imposed fate. In previous generations, marriage and co-residence were near-economic necessities, particularly for women, who often lacked independent income. The fact that millions of adults can now afford to live alone testifies to rising prosperity and, more importantly, to the dismantling of economic structures that once forced people into partnerships they did not want. A widow no longer needs to move in with adult children; a young professional can build a career without a partner's income. These are hard-won freedoms.

Critics counter that solitary living breeds isolation and erodes the social fabric. This concern is not without merit — loneliness is a documented public-health issue, and tight-knit communities do provide safety nets that atomised living cannot. Yet the evidence suggests that people who live alone are not, in fact, more socially isolated; they are typically more active in civic and friendship networks than those who rely on a household for company. The isolation narrative often confuses living alone with being lonely, when the two are distinct.

There is, however, a legitimate downside worth naming: solo living is environmentally and economically costly, consuming more housing stock and energy per capita than shared households. In cities with severe housing shortages, this is a real policy challenge. But the remedy lies in housing supply and urban planning, not in reversing a trend that, for individuals, represents freedom.

In sum, the shift toward living alone is a largely positive byproduct of prosperity and autonomy. The genuine costs it imposes are best addressed through policy, not by curtailing the choice itself.`,
};

export const writingSamples: WritingSample[] = [w1, w2, w3, w4, w5, w6];
