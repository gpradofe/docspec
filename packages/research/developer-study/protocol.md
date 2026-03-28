# Developer Study Protocol

## Study Title
*Evaluating the Impact of Deep Semantic Test Intelligence on Developer Productivity and Test Quality*

## Research Questions

**RQ1:** Does DSTI-generated documentation improve developer understanding of unfamiliar code?
**RQ2:** Do DSTI-generated test stubs reduce time-to-first-test for new contributors?
**RQ3:** How do developers perceive the quality and usefulness of intent signals?

## Methodology

### Study Design
- **Type:** Within-subjects crossover design
- **Participants:** 30 professional Java developers (15 junior, 15 senior)
- **Duration:** 2 sessions x 90 minutes per participant
- **Compensation:** $100/session

### Tasks

#### Session 1: Code Comprehension (45 min each condition)

**Condition A (Control):** Standard JavaDoc + source code
- Task: Read and explain 3 unfamiliar methods from an open-source project
- Metrics: Accuracy of explanation, time to explain, confidence rating

**Condition B (Treatment):** JavaDoc + DocSpec DSTI output
- Task: Same 3 methods from a different project (matched complexity)
- Metrics: Same as Condition A

#### Session 2: Test Writing (45 min each condition)

**Condition A (Control):** Write tests with no stubs
- Task: Write JUnit 5 tests for 2 methods
- Metrics: Time to first test, test count, mutation score, code coverage

**Condition B (Treatment):** Write tests starting from DSTI-generated stubs
- Task: Same 2 methods from a different project (matched complexity)
- Metrics: Same as Condition A

### Counterbalancing
- Half of participants do Control→Treatment, half do Treatment→Control
- Projects rotated across sessions to avoid learning effects

## Measurements

### Quantitative
- Time-to-first-test (seconds)
- Number of test cases written
- Code coverage (JaCoCo)
- Mutation score (PIT)
- Explanation accuracy (0-5 rubric)
- Task completion rate

### Qualitative
- Post-session survey (Likert scale + open questions)
- Think-aloud protocol during tasks
- Semi-structured interview (15 min)

## Analysis Plan

1. Paired t-test or Wilcoxon signed-rank for each quantitative metric
2. Effect size (Cohen's d)
3. Thematic analysis of qualitative data
4. Inter-rater reliability (Cohen's kappa) for explanation accuracy

## Ethics
- IRB approval required
- Informed consent
- Data anonymized
- Participants can withdraw at any time
