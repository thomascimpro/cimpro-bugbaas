# BugBaas 3.0 working agreement

## Release boundary

- BugBaas 3.0 is localhost-only until the owner explicitly approves a beta release.
- Never deploy 3.0 to Vercel, promote an alias, publish an APK, or alter the 2.10.19 release path without explicit approval.
- Keep 2.10.19 data, collections, user rewards, daily/weekly missions, BugDex inventory and Firebase clients compatible.

## Firebase and gameplay safety

- Additive Firestore rules only. New 3.0 data lives in new paths; never widen existing write rules.
- Rewards, team scores, boss contributions and claims must be server-authoritative and idempotent. Client-only counters are display-only.
- Field observations require the short-lived, UID-bound BugScan receipt and are written only by `recordVerifiedObservation`.
- Do not store exact GPS for social, team or map features. Prefer server-aggregated region/biome data.
- Never log, commit, copy or document secrets. Local environment files remain ignored.

## Product and UI

- Preserve the five-item BottomNav. New 3.0 features live behind existing screens or one calm entry card.
- BugDex remains the functional collection. Museum is a read-only visual layer over existing inventory.
- Reuse existing BugBaas art, colors and components before creating assets or adding dependencies.
- Do not relabel a daily or weekly checklist as a new feature. New 3.0 loops need their own place, visual identity and player action.
- Generated art must be text-free, referenced from the app bundle and used as a world, room or object layer rather than a generic card banner.
- AI may explain a scan, but no free-form AI may create missions, rewards, safety claims or species facts without constrained server validation.

## Validation and handoff

- Before claiming a feature works, run the smallest relevant tests plus `git diff --check`.
- Separate source/build proof from authenticated browser, device, Firebase and production proof.
- Keep `STATUS.md`, `DECISIONS.md`, `CHANGELOG.md` and `TESTRESULTS.md` current for substantive 3.0 work.
- Record each original 3.0 feature as complete, partial, deferred or not built; do not call the full vision complete while items remain partial.
