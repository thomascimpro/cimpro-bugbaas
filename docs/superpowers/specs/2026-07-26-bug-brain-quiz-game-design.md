# Bug Brain quiz game design

## Goal

Turn the existing generated Bug Professor questions into a standalone Play game that is fun, replayable, and safe against XP farming.

## Scope

Build a new Play game named **Bug Brain**.

Initial release includes:

- standalone single-player quiz game;
- daily rewarded run;
- unlimited free-play runs without repeatable XP rewards;
- score, streak, lives, difficulty ramp, and explanations;
- reviewed and validated question content;
- reuse of the existing five-item navigation and Play screen structure.

Not included in the first release:

- live quiz duels;
- public quiz leaderboard;
- user-generated questions;
- AI-generated questions;
- mandatory quiz gates for scans or progression.

## Entry point

Add Bug Brain as a clear game tile in the existing Play screen alongside Arcade and Duel.

The tile opens the Bug Brain screen with two actions:

1. **Daily Challenge**
2. **Free Play**

The existing Bug Professor quiz after a verified scan remains available as a contextual bonus.

## Game flow

### Daily Challenge

- Ten questions per calendar day.
- Three lives.
- One life is lost per wrong answer.
- Run ends after ten questions or zero lives.
- Difficulty starts easy, then mixes medium and hard questions.
- Correct-answer streak increases displayed score.
- First completion of the daily run can award XP.
- Daily run can be replayed, but rewards cannot be claimed twice.

Suggested reward model:

- 1 XP per correct answer for the first five correct answers;
- 5 XP completion bonus for finishing all ten questions;
- 5 XP perfect-run bonus for ten correct answers;
- maximum 15 XP per day from Bug Brain.

Reward claims must be server-authoritative and idempotent before release. Client-only reward counters are not acceptable.

### Free Play

- Unlimited ten-question runs.
- Three lives.
- Score and streak only.
- No repeatable account XP.
- May update local or account high score after validation.

## Scoring

Base score:

- easy: 100 points;
- medium: 200 points;
- hard: 300 points.

Streak multiplier:

- 1–2 correct: x1;
- 3–4 correct: x1.25;
- 5–7 correct: x1.5;
- 8–10 correct: x2.

Speed should not affect correctness rewards in the first version. A timer may be added later after mobile usability testing.

## Question content model

The current service produces 1000 combinations per language from:

- 20 insect profiles;
- 5 knowledge topics;
- 10 templates;
- 8 categories.

This is not equivalent to 1000 independently researched questions. The first release should prioritize verified quality over the advertised count.

### Required content review

Review every source fact in all 20 profiles:

- name;
- habitat;
- diet;
- activity period;
- taxonomic group;
- special trait.

For each fact, classify:

- verified;
- qualified wording required;
- reject.

Facts that vary strongly by species, sex, life stage, season, or geography must use qualified wording such as “many species”, “often”, or “as a larva”.

Review all templates in Dutch, English, and French for:

- grammar;
- natural wording;
- answer leakage;
- ambiguous pronouns;
- incorrect singular/plural combinations;
- mismatches between insect name and sentence structure.

Review distractors for:

- one defensible correct answer;
- same answer type;
- no duplicates;
- no synonyms that make two answers correct;
- plausible but clearly incorrect choices.

### Automated validation

Add tests that fail when:

- correct answer is absent from options;
- options are not unique;
- question, answer, or explanation is empty;
- generated IDs collide;
- a question has fewer than two options;
- question or option length exceeds agreed mobile-safe limits;
- the answer is trivially copied into an identify-the-bug question;
- a True/False statement is generated from an unverified fact;
- daily selection contains duplicate question IDs.

### Human sampling

Before release, manually inspect at least:

- 150 Dutch generated questions;
- 100 English generated questions;
- 100 French generated questions;
- every insect profile;
- every category;
- all hard-question patterns.

Rejected source facts or templates must be removed rather than patched with exceptions per generated question.

## Question selection

Daily Challenge:

- deterministic daily seed per date and user;
- same ten questions remain stable during that day for that user;
- no duplicate IDs in one run;
- category and difficulty mix;
- avoid questions used in the user’s recent history when enough alternatives exist.

Free Play:

- randomized run;
- no duplicate IDs in one run;
- avoid immediate repetition from previous run.

## State and persistence

Store or derive:

- daily challenge date/seed;
- answered question IDs;
- correct-answer count;
- run score;
- remaining lives;
- completion state;
- reward claim state;
- optional high score and best streak.

A closed app may resume an unfinished Daily Challenge for the same date. Free Play may restart instead of requiring persistent session recovery.

## UI

Bug Brain screen contains:

- game title and concise mode description;
- Daily Challenge and Free Play selector;
- progress indicator, for example 4/10;
- three life indicators;
- current score and streak;
- category and difficulty labels;
- one question with two or four large answer buttons;
- answer feedback with short explanation;
- next-question action;
- end-of-run result panel.

No tiny text. Answer buttons must work at 360 x 800 and large-text settings.

## Error handling

- Reward write failure: show reward pending or failed state; do not falsely show claimed XP.
- Offline Daily Challenge: allow play only when reward integrity can be preserved; otherwise clearly mark as practice with no reward.
- Invalid question: skip it and log a non-sensitive diagnostic; never block the whole run.
- Exhausted valid pool: fall back to verified questions, not unreviewed content.

## Integration with existing systems

- Add quiz progress hooks to daily and weekly missions only after the core game works.
- Keep scan-based Bug Professor quiz, but its reward policy must not bypass the daily Bug Brain cap.
- Do not modify the five-item BottomNav.
- Reuse existing XP display and reward feedback patterns.

## Testing

Minimum tests:

- question generator validation;
- deterministic daily selection;
- no duplicate run questions;
- lives and run-end behavior;
- score and streak calculations;
- daily reward cap;
- idempotent reward claim;
- replay gives no second reward;
- language switching;
- 360 x 800, 412 x 915, and tablet layout;
- Android back behavior;
- offline and reward failure states.

## Release criteria

Bug Brain is ready only when:

- reviewed source facts are marked verified or deliberately qualified;
- automated question tests pass;
- manual samples contain no known incorrect or broken questions;
- reward claims are idempotent;
- Daily Challenge cannot award more than 15 XP per user per day;
- Free Play cannot farm account XP;
- mobile layouts pass visual QA;
- existing scan, Arcade, Duel, missions, and BugDex flows still work.
