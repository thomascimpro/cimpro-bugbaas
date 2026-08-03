# BugBaas 3.1 Single-Chat Execution Protocol

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` in one persistent chat. Use `superpowers:using-git-worktrees` before any implementation. Do not use subagents for mutating work unless they share the same checked-out worktree and the main chat remains the only task/status owner.

**Goal:** Execute the approved BugBaas 3.1 master plan safely in one chat, one independently verified task at a time, while preventing context drift, duplicate execution, accidental 3.0 changes and unproven Firebase/release mutations.

**Architecture:** The chat uses an isolated Git worktree and a durable in-repository status ledger as external memory. Every master-plan task has one task ID, one active state, one receipt, one verification gate and normally one commit. Read-only tests may be repeated; mutating operations require a unique operation ID and may not be repeated without reconciling their receipt.

**Tech Stack:** Git worktrees, Expo/React Native, TypeScript, Node test runner, Playwright, Firebase Functions/Firestore emulator, Android emulator/device QA and Markdown execution receipts.

## Global Constraints

- Source plan: `docs/superpowers/plans/2026-08-03-bugbaas-3-1-master-plan.md`.
- This protocol is the required execution order and status procedure for that plan.
- Work only on branch `codex/bugbaas-3.1` in an isolated worktree.
- The existing `codex/bugbaas-3.0` checkout remains untouched except for already approved planning-document commits.
- Never manually copy the complete dirty 3.0 folder.
- Never copy `dist*`, `output`, screenshots, logs, caches, `.expo`, `.vercel`, `.idea`, temporary files, `node_modules`, APKs or generated contact sheets into 3.1.
- Never commit `.env*`, keystores, passwords, tokens, Firebase credentials or signing properties.
- New Firebase data remains additive and server-authoritative. Existing old-client paths, fields, endpoints and Rules contracts stay available.
- Feature flags remain off until the relevant implementation, Rules tests and authenticated runtime tests are green.
- No Firebase deploy, Vercel production promotion, APK publication, production migration apply or non-test cohort flag change without a separate explicit owner instruction.
- One task may be `IN_PROGRESS` at a time.
- A task is complete only when its receipt, tests, status row and commit hash agree.

---

# 1. Durable execution memory

## 1.1 Files created at execution start

Create these tracked files inside the 3.1 worktree:

- `docs/superpowers/execution/bugbaas-3.1-status.md`
- `docs/superpowers/execution/bugbaas-3.1-task-receipts/README.md`
- `docs/superpowers/execution/bugbaas-3.1-operation-receipts/README.md`
- `scripts/verify-bugbaas31-source-manifest.mjs`
- `docs/reviews/bugbaas-3.1-source-manifest.md`

The status file is the only current-state source. `STATUS.md`, `TESTRESULTS.md`, `DECISIONS.md` and `CHAT_HANDOFF_PROMPT.md` remain product/history documents and do not replace it.

## 1.2 Exact status header

`docs/superpowers/execution/bugbaas-3.1-status.md` starts with:

```markdown
# BugBaas 3.1 Execution Status

- Run ID: `bb31-<Amsterdam YYYYMMDD-HHMM>`
- Master plan: `docs/superpowers/plans/2026-08-03-bugbaas-3-1-master-plan.md`
- Execution protocol: `docs/superpowers/plans/2026-08-03-bugbaas-3-1-single-chat-execution-protocol.md`
- Base branch: `codex/bugbaas-3.0`
- Base commit: `<recorded by git rev-parse HEAD>`
- Work branch: `codex/bugbaas-3.1`
- Worktree: `<absolute managed worktree path>`
- Last green commit: `<initially base commit>`
- Current task: `none`
- Current step: `none`
- State: `READY`
- Firebase deployment: `NONE`
- Vercel production deployment: `NONE`
- APK published: `NO`
- Production migration applied: `NO`
- Last updated: `<Amsterdam ISO timestamp>`
```

The values in angle brackets are filled from the actual Git/worktree result during Task 1; they are not guessed.

## 1.3 Task table

Add all 29 master-plan tasks to one table:

```markdown
| Task | State | Started | Completed | Commit | Receipt | Last verification |
|---|---|---|---|---|---|---|
| BB31-T01 | NOT_STARTED | - | - | - | - | - |
```

Use only these states:

- `NOT_STARTED`
- `IN_PROGRESS`
- `VERIFYING`
- `BLOCKED`
- `COMPLETE`
- `ROLLED_BACK`

Exactly one row may be `IN_PROGRESS` or `VERIFYING`.

## 1.4 Task receipt

Each completed task creates:

`docs/superpowers/execution/bugbaas-3.1-task-receipts/BB31-TNN.md`

Required content:

```markdown
# BB31-TNN Receipt

- Task title:
- Base commit:
- Final commit:
- Files changed:
- Protected neighboring flows:
- Failing test observed:
- Focused tests:
- Broad regression tests:
- Rules tests:
- Visual/device evidence:
- Known limitations:
- Deployment performed: NO
- Result: PASS
```

A field that is not relevant is written as `NOT_APPLICABLE` with one sentence explaining why. Never write an untested item as PASS.

## 1.5 Operation receipt

Every mutating external operation uses a unique operation ID and creates a receipt before another operation is attempted:

`docs/superpowers/execution/bugbaas-3.1-operation-receipts/<operation-id>.md`

Operations requiring a receipt include:

- Firebase migration apply.
- Firebase Rules deploy.
- Firebase Function deploy.
- Feature-flag change outside emulator/test data.
- Vercel preview or production deployment.
- Signed APK build.
- APK publication.
- Store/version metadata change.

The receipt records requested action, owner approval message, pre-state, exact command/tool, result identifiers, post-state and rollback route. A matching successful receipt prevents the same operation from being repeated.

---

# 2. Clean 3.1 workspace instead of a folder copy

## 2.1 Required approach

Use the native DevSpace worktree mechanism with base ref `codex/bugbaas-3.0`. Create work branch `codex/bugbaas-3.1`. Prefer a managed path named or clearly identified as `CimPro BugBaas-3.1`.

A Git worktree checks out only tracked files. This intentionally excludes the current large set of untracked build folders, screenshots, logs, temporary assets and caches while preserving the exact committed 3.0 application.

Do not prune tracked files before the clean baseline passes. Manual selection of only apparently useful tracked files can silently omit runtime imports, native resources, scripts or release configuration. Prove files unused later in a separate cleanup task.

## 2.2 Initial commands

Run in the new worktree:

```bash
git branch --show-current
git rev-parse HEAD
git status --short
git ls-files | wc -l
git ls-files -o --exclude-standard | wc -l
```

Expected:

- Branch is `codex/bugbaas-3.1`.
- `git status --short` is empty.
- Untracked count is zero before local ignored configuration is added.

## 2.3 Source-manifest audit

`scripts/verify-bugbaas31-source-manifest.mjs` must inspect tracked runtime references from:

- `App.tsx`.
- `src/**/*.{ts,tsx}`.
- `app.json` and `app.config.js`.
- `package.json` scripts.
- `src/services/bugArt.ts` and BugDex catalog/fact/set data.
- `android/app/src/main` resources and manifests.
- `public` routes referenced by app navigation.
- Firebase/scan server imports.

It reports:

- Referenced file missing.
- Referenced file exists but is untracked.
- Duplicate asset target.
- Runtime import resolving into ignored output/cache folders.
- Tracked file candidates not referenced by source, package scripts, native resources or documentation links.

The first four conditions fail the gate. Unreferenced tracked candidates are informational only and are not deleted during workspace creation.

## 2.4 Controlled import allowlist

If the clean worktree is missing a genuinely required untracked runtime file, copy only the exact reviewed file and add it in one baseline-import commit. Record source path, destination path, why it is required and the import/reference proving usage in `docs/reviews/bugbaas-3.1-source-manifest.md`.

Allowed local-only ignored configuration:

- Required `.env.local` files, copied without printing values.
- Existing release keystore and signing properties only at the release gate.
- Local Firebase emulator cache when generated by the emulator itself.

Never import an entire untracked directory to solve one missing file.

## 2.5 Explicit denylist

Do not copy:

```text
node_modules/
.expo/
.vercel/
.idea/
output/
screenshots/
release/
dist*/
*.log
*.pid
*.stackdump
*.apk
*.aab
*_ui.xml
*-bundle.js
*-index.html
contact sheets
compression-test folders
source image batches not referenced by runtime
```

## 2.6 Baseline installation and proof

Run:

```bash
npm ci
npm run typecheck
npm run validate:bug-art
npx expo export --platform web --output-dir dist-bugbaas-3.1-baseline --clear
git diff --check
```

Delete or ignore the generated baseline export; never commit it. Record results in the Task 1 receipt. Existing known runner failures are recorded before Task 1 repairs them, exactly as the master plan requires.

---

# 3. Single-chat task loop

The same chat repeats this loop for every task. It may continue automatically after a green task; it stops only on a blocker or an approval gate.

## 3.1 Resume check

Before any task action:

```bash
git status --short
git branch --show-current
git log -5 --oneline
```

Then read:

1. The task section in the master plan.
2. The execution status header and task row.
3. The previous task receipt.
4. Relevant project instructions and changed neighboring files.

Decision rules:

- `COMPLETE` plus matching commit and receipt: skip the task.
- `IN_PROGRESS`: resume at the recorded step after checking the working diff.
- Status says COMPLETE but commit/receipt is missing: set `BLOCKED` and reconcile; do not rerun mutations.
- Commit exists but status says NOT_STARTED: inspect the commit and reconcile status before continuing.
- Dirty files unrelated to the current task: stop and identify their owner; do not bundle them.

## 3.2 Start task

Update the status row to `IN_PROGRESS`, set current task/current step and create the receipt with result `IN_PROGRESS`.

The chat sends a concise user update containing:

- Task ID and goal.
- Files expected to change.
- Protected neighboring flows.
- First test to be run.

## 3.3 Red phase

Write the exact failing test specified by the master plan. Run it and record the expected failure in the receipt.

A test that unexpectedly passes means the assumption is wrong. Inspect existing behavior before implementing anything.

## 3.4 Green phase

Implement only the smallest task-scoped change needed to pass the focused test. Do not opportunistically clean or refactor unrelated files.

For shared files such as `App.tsx`, `firebase/functions/index.js`, `firestore.rules`, `userService.ts` and `BugDexScreen.tsx`, update the change-impact map before broad verification.

## 3.5 Verification phase

Set task state to `VERIFYING`. Run, in order:

1. Focused unit/model test.
2. Related service/Function test.
3. Firestore Rules allow/deny tests when any path/rule changes.
4. Neighboring regression tests from the impact map.
5. Typecheck.
6. `git diff --check`.
7. Screenshot/browser/device proof when the task changes visible behavior.
8. Secret/path scan when configuration, server or release files changed.

A failed verification returns the task to `IN_PROGRESS`. Do not start another task.

## 3.6 Review before commit

Run:

```bash
git diff --stat
git diff --check
git status --short
```

Review every changed file against the task file list. Remove unrelated changes. Confirm no secrets, build output or local environment files are staged.

## 3.7 Commit and durable checkpoint

Update the task receipt to PASS, update the status row to COMPLETE and include both files in the same task commit.

Commit format:

```text
<type>(bb31-tNN): <task result>
```

After commit:

```bash
git rev-parse HEAD
git status --short
git log -1 --oneline
```

Expected: clean worktree and commit subject containing `bb31-tNN`.

Update `Last green commit` to the new hash. The chat sends a concise checkpoint with tests, commit and next task.

## 3.8 Context checkpoint

At every phase boundary, the chat rereads the status file, master-plan dependency section and last five commits. It writes a short `Context checkpoint` section into the status file containing:

- Completed task range.
- Current balances/data schema version.
- Active feature flags.
- Current Rules/Functions state.
- Known blockers.
- Exact next task.

This allows the same chat to survive summarization or context compaction without relying on conversational memory.

---

# 4. Required execution order

Do not rely only on numeric task order. Use this dependency-safe order:

## Phase A — Clean baseline and test harness

1. `BB31-T01` isolated worktree, source manifest and reproducible runner.
2. `BB31-T02` deterministic visual/quality baseline.

Checkpoint: tracked-only clean workspace, baseline screenshots and known failures recorded.

## Phase B — Additive economy and permanent sync foundation

3. `BB31-T03` pure economy, lifetime XP and XP-writer audit.
4. `BB31-T04` server-authoritative ledger and Rules.
5. `BB31-T15` migration model and preview.
6. `BB31-T22` old APK compatibility, root XP trigger and continuous reconciliation.

Checkpoint: old 3.0 data still works, new subcollections are additive, XP is monotone and the old/new client test fixtures pass before new reward UI is built.

## Phase C — Duplicates and controlled species knowledge

7. `BB31-T05` duplicate safety preview.
8. `BB31-T06` facts and dossier completion.
9. `BB31-T07` central reward queue.

Checkpoint: one copy/trades stay protected, duplicate transactions are idempotent and receipts are deterministic.

## Phase D — Research and shop

10. `BB31-T08` research contracts.
11. `BB31-T09` RP/Gem shop, effects and cosmetics.
12. `BB31-T10` Research Center replaces the new-client Upgrade UI.

Checkpoint: fixed prices, no direct Legendary/Mythical purchase, no power sale and no client-written currency/effects.

## Phase E — Provenance, scan and Journal

13. `BB31-T11` acquisition history and Zelf gevonden.
14. `BB31-T12` exact/proxy scan presentation.
15. `BB31-T13` Journal root-cause and pending retry.
16. `BB31-T14` additive scan quota/pass contract.

Checkpoint: old scan parser remains valid, exact observations stay private and Journal rewards are not presented before storage succeeds.

## Phase F — Migration presentation, assets and shared power foundation

17. `BB31-T16` migration onboarding, levels and Training stars.
18. `BB31-T20` generated/reviewed research, shop, role, PvE and Crown assets.
19. `BB31-T29` one shared Bug Power model, Crown visual trials, server-authoritative PvE and obsolete-feature audit.

Checkpoint: the child-facing Training/Kracht model, every required asset, old-feature decisions and server-side PvE math are fixed before event/gameplay surfaces are changed.

## Phase G — Existing gameplay fixes and final visual integration

20. `BB31-T17` Buddy picker.
21. `BB31-T18` Tap Duel density/safe playfield and Ranked no-power regression.
22. `BB31-T19` World research summary and same-device Movement x/10.
23. `BB31-T21` full visual system, shop/Crown previews, states and motion.

Checkpoint: all new and changed screens match the approved quality references and have full/reduced/low-end states while existing Buddy, games, widget and movement behavior remain functional.

## Phase H — Global proof and release preparation

24. `BB31-T23` change-impact and permission gate.
25. `BB31-T24` complete functional/visual Playwright suite.
26. `BB31-T25` Android/device/performance proof.
27. `BB31-T26` concurrency and migration rehearsal.
28. `BB31-T27` help, documentation and child comprehension.
29. `BB31-T28` final verification and release candidate preparation.

Checkpoint: release remains blocked until every required receipt is PASS and the owner separately approves deployment/publication.

---

# 5. Duplicate-execution prevention

## 5.1 Task identity

Every task is identified by `BB31-TNN` in four places:

- Status table.
- Task receipt filename.
- Commit subject.
- Relevant immutable server event IDs where the task introduces mutations.

Before starting a task, check:

```bash
git log --oneline --grep="bb31-tNN"
```

A matching commit plus COMPLETE status means the task is not rerun.

## 5.2 Safe reruns

May be rerun freely:

- Read-only searches.
- Unit tests.
- Typecheck.
- Local builds/exports into ignored output.
- Emulator Rules tests.
- Screenshot tests with deterministic fixtures.

Require receipt reconciliation before rerun:

- Currency grant/spend against shared Firebase data.
- Migration apply.
- Scan reward/observation creation.
- Production Rules/Functions deploy.
- Feature-flag update.
- Signed build/publication.

## 5.3 Server idempotency

Every new mutation uses deterministic event IDs from the master plan. The chat never invents timestamp-only event IDs for economy, migration, research, milestone, dossier or old-client reconciliation events.

## 5.4 Interrupted task

When interrupted:

1. Do not reset or discard work automatically.
2. Record current step, dirty files and last command in status.
3. On resume, inspect diff and rerun the last read-only verification.
4. Continue from the recorded step.
5. Never reapply an external mutation without checking its operation receipt and server state.

---

# 6. Approval gates

The chat may execute all local implementation and emulator tests continuously. It stops before:

- Copying a release keystore/signing properties into the worktree.
- Applying migration to non-test users.
- Deploying Firestore Rules or Functions to production.
- Changing production feature flags.
- Promoting Vercel to production.
- Building a signed release APK when the owner has not approved the local release build.
- Publishing/distributing an APK.
- Changing version metadata for release.

At a gate, report exact green evidence, proposed operation ID, affected environment and rollback. Wait for the owner’s explicit instruction for that operation only.

---

# 7. Optional tracked-file cleanup

Do not combine cleanup with feature work.

After `BB31-T26` is green, the source-manifest report may propose tracked deletion candidates. A separate cleanup commit is allowed only when all of these are true:

- No source/native/package/documentation reference.
- Not required by Expo export, Android build, Firebase tooling or release scripts.
- Full verification stays green after deletion.
- The candidate is not an old-client compatibility asset/path.
- The deletion is listed explicitly in a cleanup receipt.

The original 3.0 checkout and branch are never cleaned as part of this process.

---

# 8. Completion condition

The single-chat run is complete only when:

- All 29 task rows are COMPLETE.
- Every task has a PASS receipt and matching commit.
- Worktree is clean.
- Full test/visual/device/compatibility matrices are green or honestly marked NOT_RUN with release blocked.
- No production deployment/publication is implied by local completion.
- The final status file identifies the exact release-candidate commit and all remaining approval gates.
