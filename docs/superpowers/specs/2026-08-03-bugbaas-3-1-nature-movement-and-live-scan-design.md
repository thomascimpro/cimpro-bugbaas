# BugBaas 3.1 Nature Movement and Live Scan Design

**Date:** 2026-08-03
**Status:** Approved design, awaiting written-spec review

## Goal

Keep outdoor movement and real-bug photography rewarding on Android and web without breaking the working Android Movement Radar or making live photography frustrating for small, fast or flying bugs.

The design must remain understandable for a ten-year-old and must reduce, not increase, normal scan cost.

## Non-negotiable decisions

- FitnessSyncer is not part of the BugBaas 3.1 player promise while it is not proven reliable.
- Existing FitnessSyncer code is not deleted, but the normal 3.1 World and onboarding flows do not depend on it.
- Android Health Connect and the existing Movement Radar remain working during rollout.
- Web movement counts only GPS points that were actually received.
- A locked screen or background browser may continue to provide points, but BugBaas never promises that it will.
- Missing browser-background distance is never guessed or drawn as a straight line.
- A normal live bug scan uses one user-visible photo and one AI identification request.
- There is no countdown timer.
- A second user photo is requested only when authenticity is `uncertain`.
- `De bug is weg` is always available when a second photo is requested.
- A technical failure or missing second photo never spends another scan attempt.
- Extra local camera evidence must not create extra normal AI image calls.
- No automatic account punishment is based on one uncertain or rejected AI result.

## Part 1: Nature movement

### Child-facing promise

World shows one clear card:

> **Natuurtocht**
> Loop buiten en verdien Natuurvondsten.
> BugBaas telt alleen afstand die echt is gemeten.

The card shows:

- today’s valid distance;
- today’s claimed finds;
- distance to the next find;
- movement source;
- one main action.

Possible primary actions:

- `Start Natuurtocht`
- `Ga verder`
- `Claim Natuurvondst`
- `Health Connect instellen` on Android when no movement source is available

### Android sources

Android 3.1 supports:

1. existing Health Connect/native Movement Radar;
2. active GPS Nature Walk as an optional foreground fallback.

Health Connect remains the preferred automatic source. The new feature must not remove the widget, current local progress or current native permission flow during rollout.

### Browser source

The browser supports an active GPS Nature Walk.

The truthful explanation is:

> Je mag je scherm vergrendelen. Sommige telefoons pauzeren dan de browser. BugBaas telt alles wat echt binnenkomt en gaat verder wanneer je terugkomt.

The browser session:

- persists its session ID and last confirmed progress;
- changes to `possibly_paused` when the page becomes hidden;
- accepts location points that still arrive while hidden;
- resumes when the page becomes visible;
- never estimates the gap between the last point before suspension and the first point after resume.

### Optional screen-awake mode

During an active browser walk, offer:

> **Scherm aanhouden voor betrouwbare meting**

This is optional. The screen uses a dark low-power layout showing only:

- distance;
- next reward;
- pause/stop button;
- small nature artwork.

If wake lock is unavailable or removed, the walk continues with the honest browser limitations above.

### Distance validation

A GPS point is accepted only when:

- location permission is granted;
- reported accuracy is within the configured limit;
- timestamp order is valid;
- speed is compatible with walking or running;
- the jump from the prior accepted point is plausible;
- the session is active;
- the point is not already included through its deterministic point/event ID.

Cycling and vehicle-speed points do not count toward the walking Nature Walk unless a later explicit cycling mode is designed.

The server stores no public route. It stores only the minimum evidence needed for rewards and abuse analysis:

- session ID;
- Amsterdam day ID;
- accepted meters;
- duration;
- source;
- coarse validation result;
- claimed reward units;
- idempotent event IDs.

Exact route points are discarded after validation or kept only temporarily according to a documented short retention policy.

### Reward contract

The existing base remains:

- one movement reward unit per 1,500 valid metres;
- at most ten units per Amsterdam day.

Movement rewards use the existing `movement_radar` reward pool unless balancing tests explicitly approve a renamed but equivalent Nature Find pool.

Movement cannot directly award Mythical bugs. The existing rarity distribution must not silently become more generous during the platform unification.

### Safe source unification

The final 3.1 source of truth is a server-side daily movement ledger:

- `nativeConfirmedUnits`
- `tourConfirmedUnits`
- `effectiveUnits = max(nativeConfirmedUnits, tourConfirmedUnits)`
- `awardedUnits`

Only `effectiveUnits - awardedUnits` may produce new rewards.

The two sources are never added together.

Example:

- active GPS walk confirms 2 units;
- Health Connect later confirms 3 units;
- effective total becomes 3;
- only one additional unit becomes claimable.

### Phased rollout to avoid breaking Android

#### Phase M0: measurement only

- Existing Android Movement Radar stays authoritative.
- Active browser/app Nature Walk can calculate and display validated distance.
- New server ledger records comparison data but does not issue bugs.
- No existing reward or widget path is changed.

Exit gate:

- no regression in existing Android claims;
- browser sessions resume correctly;
- no impossible speed or duplicated-point rewards;
- comparison report documents native versus ledger differences.

#### Phase M1: shadow reward receipts

- The ledger computes which rewards it would have issued.
- Actual Android rewards still use the current path.
- Browser test accounts may use server rewards behind an allowlist/feature flag.
- Server checks existing `movement_radar` acquisition/reward events before calculating missing units.

Exit gate:

- no duplicate reward in repeated claims;
- Android current path and server shadow output match for the tested day cases;
- old 3.0.7 and new 3.1 same-account test is documented.

#### Phase M2: 3.1 server-authoritative movement rewards

- Browser and 3.1 Android use the same ledger and claim endpoint.
- Native Health Connect reports confirmed units instead of directly deciding final cross-platform reward count.
- The native widget still works, but its claim passes through or reconciles with the shared ledger.
- A local fallback remains available only for a documented server outage and must reconcile without duplicate rewards.

This phase may not ship until M0 and M1 evidence is green.

### Old APK compatibility

Old 3.0.7 continues to use its current Movement Radar implementation.

The 3.1 ledger must reconcile observable old `movement_radar` reward/acquisition events before issuing a new unit. Where an old client lacks a stable receipt, the known limitation must be recorded and tested rather than hidden.

No old native preference, widget state or Health Connect permission is deleted during 3.1 migration.

### Relationship to the existing master plan

The current master plan deliberately keeps Movement Radar device-bound. That remains the rule through M0 and M1. This specification may replace that limitation only when M2 passes every parity, old-APK and duplicate-reward gate. Until then, no document or UI may claim that browser and Android rewards are already unified.

## Part 2: Cost-controlled live scan authenticity

### Normal child-facing flow

1. Choose `Vind een echte bug`.
2. Take time to focus and zoom.
3. Press `Maak foto` once.
4. Review/crop if needed.
5. BugBaas identifies the bug and explains the reward.

There is no timer and no instruction to touch, move or disturb the bug.

For small or fast bugs the camera shows:

> Maak eerst de foto. Je kunt daarna nog inzoomen en bijsnijden.

### Existing-photo flow

`Herken een foto` remains available for learning and identification.

It may provide:

- name;
- scientific name;
- facts;
- a private note.

It does not automatically provide:

- `Zelf gevonden`;
- high-value event progress;
- valuable live-scan reward;
- verified Field Journal status.

### One normal AI image call

A normal scan sends one prepared image to the identification model.

The prepared image is a single compact evidence canvas containing:

- a large cropped/detail area for the bug;
- a smaller context area from the original frame.

The app chooses the smallest safe output plan:

- common clear subject: about 1024–1280 maximum side;
- very small subject or strong crop: up to about 1536 maximum side;
- avoid the current 2048/0.95 path when lower size preserves recognition;
- use adaptive JPEG/WebP quality around 0.82–0.88 after measured testing;
- do not upscale a small source.

Exact thresholds are selected from recognition and cost benchmarks, not guessed during implementation.

### Local evidence frames

Around the shutter event, the client may temporarily capture up to two low-resolution evidence frames, approximately 160–240 pixels maximum side.

These frames:

- are invisible to the normal player flow;
- are not used for species identification;
- normally never leave the device;
- are compared locally for basic liveness signals;
- are deleted immediately after the scan decision;
- do not create additional OpenAI image calls.

Local checks may detect:

- completely identical/replayed frames;
- obvious frozen input;
- natural camera/background movement;
- basic screen-like refresh or moire patterns when reliably detectable.

Local checks may add risk signals but may not independently ban a user or reject an otherwise valid scan during the first rollout phase.

### Cost-controlled AI response

For a known BugDex species, the model request should return only the fields needed for:

- subject present;
- image quality;
- authenticity;
- identification/taxon;
- confidence;
- short reason.

Facts, translations, quiz question, answer options and explanations come from the existing reviewed catalog.

For a genuinely new species, extra educational content is generated or reviewed once and then reused. It is not regenerated for every future photo of that species.

### Measurable cost gates

The scan rollout must meet all of these gates against the current production baseline:

- a clear normal scan makes exactly one identification-model request;
- only an `uncertain` path may make an additional authenticity request;
- average uploaded image bytes are at least 30% lower without reducing accepted identification accuracy by more than two percentage points on the reviewed benchmark set;
- average output tokens for a known catalog species are at least 50% lower;
- estimated model cost per 1,000 completed scans does not exceed the current baseline;
- the extra-photo request rate stays below 15% on normal field photos;
- when the extra-photo rate or false-uncertain rate exceeds its limit, the feature flag returns to logging-only mode rather than making the normal scan harder.

Cost/usage telemetry records at least:

- model and request type;
- source and prepared image dimensions;
- uploaded bytes;
- input and output tokens;
- latency;
- first-pass authenticity result;
- whether a second request was needed;
- final reward-safe status.

No exact user image, prompt secret or private location is written into cost telemetry.

### Uncertain-only second photo

A second user-visible photo is requested only when the first result has `captureAuthenticity = uncertain` or a similarly explicit risk state.

Popup:

> **De bug is herkend, maar we twijfelen aan de livefoto**
> Maak nog een foto wanneer dat lukt. Geen haast.

Actions:

- `Nog een foto maken`
- `De bug is weg`

There is no countdown. The player may refocus, zoom or choose a better angle.

### When the bug is gone

`De bug is weg` never causes a penalty.

Possible outcomes:

1. The first image is still sufficiently reliable:
   - normal verified result and reward.
2. Identification is good but live authenticity remains uncertain:
   - show name and facts;
   - allow private unverified Journal entry;
   - do not grant `Zelf gevonden` or high-value event/research progress;
   - do not consume another scan attempt.
3. The first image is clearly a reproduction:
   - no verified reward;
   - explain the strongest reason in simple language;
   - allow a new attempt.

### Extra-photo request cost

When the player can take a second photo:

- do not repeat the full identification/content request;
- locally build one compact comparison canvas containing photo one and photo two;
- use a short authenticity-only model schema;
- use the smallest image detail that passes benchmarks;
- reuse the first identification when the same subject is plausible;
- charge no second scan quota unit.

Thus only uncertain cases create an extra AI request.

### Image reuse controls

Before or alongside the AI call, calculate privacy-conscious fingerprints for:

- exact duplicate detection;
- near-duplicate/perceptual reuse;
- repeated use across the same account;
- high-confidence repeated use across accounts according to privacy policy.

The system stores fingerprints and minimal decision metadata, not an unlimited archive of full original photos.

Repeated suspicious reuse may lead to manual review. One match or one AI suspicion never automatically bans an account.

### Progressive activation

#### Phase S0: benchmark and logging

- Existing one-photo reward behavior remains.
- Compact evidence canvas is compared with the current image plan.
- Local evidence signals are logged without changing reward decisions.
- Actual model usage, latency, image bytes and output tokens are measured.

#### Phase S1: cost reduction

- Known-species requests use the compact response schema and catalog content.
- Adaptive image sizing becomes active only after recognition parity is proven.
- Existing authenticity rejection remains in place.
- No mandatory second photo yet.

#### Phase S2: uncertain-only extra photo

- `uncertain` results show the extra-photo popup.
- `De bug is weg` fallback is active.
- Second request is authenticity-only.
- Clear `live` and clear `reproduction` cases remain one-photo decisions.

#### Phase S3: verified-live label enforcement

Only after false-rejection tests pass:

- `Zelf gevonden`, important event progress and valuable live research require verified-live status;
- gallery/reference images remain identification-only;
- uncertain fallback remains friendly and non-punitive.

### Feature flags and rollback

Separate remote flags control:

- Nature Walk visibility;
- movement ledger shadow mode;
- server-authoritative movement claim;
- adaptive scan image size;
- compact known-species response;
- local evidence frames;
- uncertain extra-photo prompt;
- verified-live enforcement.

Every flag has a safe fallback to the previously working behavior. A scan/movement experiment cannot require an APK rollback to stop issuing new decisions.

## Visual requirements

### Nature Walk

Required artwork and states:

- illustrated nature path card;
- walking boot/leaf movement icon;
- start, active, possibly paused, resumed, GPS weak, permission denied, offline and completed states;
- dark screen-awake mode;
- reward popup showing distance, today count and next target;
- no full public route map.

### Live scan

Required artwork and states:

- clear live-camera versus existing-photo choice;
- focus/zoom help for small bugs;
- one-photo review state;
- uncertain authenticity popup;
- `De bug is weg` illustration;
- verified-live badge;
- recognized-but-unverified result;
- reproduction rejected result;
- technical retry without lost quota.

All screens use one dominant action, at least 44×44 tap targets and text that a ten-year-old understands.

## Required tests

### Movement

- Browser walk with visible page.
- Browser lock/hidden state where GPS continues.
- Browser lock/hidden state where GPS pauses.
- Resume without inventing missing distance.
- Wake lock accepted, rejected and revoked.
- GPS drift while standing still.
- Impossible vehicle-speed jump.
- Duplicate/replayed GPS point.
- Amsterdam day rollover.
- Health Connect only.
- Active Nature Walk only.
- Both sources: use maximum, never sum.
- Repeated claim is idempotent.
- Existing Android widget and Movement Radar regression suite.
- Old 3.0.7 plus 3.1 same account.
- No public route or exact location leak.

### Scan

- Clear real bug accepted with one photo.
- Tiny bug requiring strong crop remains identifiable.
- Butterfly flies away immediately after capture.
- Mild motion blur is not automatically rejected.
- Clear photographed screen rejected.
- Uncertain screen-like image requests another photo.
- `De bug is weg` does not spend quota.
- Second photo uses authenticity-only call.
- Same physical bug from two views accepted.
- Reused identical image detected.
- Known species does not regenerate facts/quiz/translations.
- New species content generated/reviewed once.
- Evidence frames are deleted and normally not uploaded.
- Cost/usage telemetry records image bytes, input/output tokens, latency and decision path.
- Existing scan, Journal receipt and reward tests remain green.

## Release blockers

Do not enable the final reward/enforcement phases when any of these is true:

- existing Android Movement Radar or widget regresses;
- browser gaps are converted into estimated distance;
- movement sources can be added together;
- repeated claims issue duplicate bugs;
- normal scan sends multiple full AI images;
- known species still regenerate all educational text every time;
- the extra photo appears for clear live scans;
- a timer is introduced;
- `De bug is weg` loses quota or causes punishment;
- small/fast bugs show materially higher false rejection;
- exact private routes become public or persist without necessity;
- cost telemetry is missing.

## Why this remains manageable

This is intentionally split into independent gates:

1. measurement without behavior changes;
2. cost reduction without stricter authenticity;
3. uncertain-only extra photo;
4. shared movement rewards only after parity evidence;
5. verified-live enforcement only after real-photo tests.

No phase requires replacing the entire working movement or scan system at once. Each can be disabled independently and must prove parity before taking authority from the current path.
