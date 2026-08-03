# BugBaas 3.1 Symbol and Progression Language Design

**Date:** 2026-08-03
**Status:** Approved design, awaiting written-spec review
**Scope:** Player-facing symbols, labels, cards, popups and migration presentation for rarity, bug training, researcher level, medals, Crown, currencies, research and legacy achievements.

## 1. Problem

The current app already uses one to five stars for bug rarity in BugDex cards, reward popups, squad selection, trades, Tap Duel and other collection surfaces. Showing bug training with one to five stars would give one symbol two different meanings.

The app also exposes overlapping concepts:

- account points, tiers, prestige names and titles;
- bug mastery level, mastery rank and mastery skills;
- badges and planned medal paths;
- Mythical Crown ranks using names such as Elite, Master and Legend;
- multiple kinds of points and progress bars.

A ten-year-old must be able to identify what every symbol means without reading hidden rules.

## 2. Canonical rule

**One visual symbol has exactly one meaning everywhere in BugBaas 3.1.**

Icons always appear with a text label on first use and in every purchase or destructive confirmation. Color is never the only signal.

## 3. Final symbol language

| Concept | Visual language | Example | Meaning |
|---|---|---|---|
| Bug rarity | One to five stars plus rarity word | `★★★ Episch` | Fixed property of the species |
| Bug training | Five rounded training segments plus `Training x/5` | `▰▰▰□□ Training 3/5` | Personal progress with this species |
| Researcher level | Large number inside an XP progress ring | `Level 18` | Permanent account progress |
| Progression paths | One illustrated medallion per path and Roman rank I–IV | `Ontdekken III` | Long-term activity mastery |
| Legacy achievements | Badge or pin artwork | `Erfgoedbadge` | Historical achievement, not active progression |
| Mythical Crown | Crown with four separate jewels | `Kroon 3/4` | Mythical PvE endgame progress |
| Research Points | Microscope/research-token icon plus `RP` | `+40 RP` | Free research currency |
| BugGems | Faceted gem icon plus `Gems` | `60 Gems` | Special/cosmetic currency |
| Research task progress | Checklist marks and numeric progress | `3/5 stappen` | Actions remaining in a contract |
| Species dossier | Three paper pages or stamps | `2/3 weetjes` | Knowledge collected for a species |
| Acquisition source | Small source pictogram plus text/date | `Zelf gevonden · 3 aug.` | How the bug was obtained |

No account tier, training state, medal or Crown state may use rarity stars.

## 4. Rarity

Rarity keeps the existing one-to-five-star convention:

| Rarity | Display |
|---|---|
| Gewoon | `★ Gewoon` |
| Zeldzaam | `★★ Zeldzaam` |
| Episch | `★★★ Episch` |
| Legendarisch | `★★★★ Legendarisch` |
| Mythisch | `★★★★★ Mythisch` |

Rarity is fixed for the species. Training, Crown, purchases and cosmetics never change rarity.

Rarity may also use the existing color, frame and aura, but the word and star count remain visible where the player must compare bugs.

## 5. Training

### 5.1 Player-facing display

The words `mastery`, `mastery XP`, `rookie`, `trained`, `skilled`, `veteran`, `elite` and `master` are removed from the normal child-facing interface.

The player sees:

- `Training 1/5` through `Training 5/5`;
- five rounded horizontal segments;
- a progress bar to the next training stage;
- the bug role and one plain-language current effect;
- the next useful unlock.

Example:

> **Training 3/5**
>
> Rol: Schild
>
> Beschermt het nest tijdens bossgevechten.
>
> Nog 140 Training-XP tot Training 4/5.

### 5.2 Existing level mapping

Existing mastery data remains unchanged in Firebase. The player-facing stage is derived from the existing internal level:

| Existing mastery level | Player-facing stage |
|---:|---|
| 1–4 | Training 1/5 |
| 5–9 | Training 2/5 |
| 10–14 | Training 3/5 |
| 15–19 | Training 4/5 |
| 20 | Training 5/5 · Volledig getraind |

The existing level-3 passive unlock remains a small first-stage bonus. Existing skill thresholds at levels 5, 10, 15 and 20 align with Training stages 2–5.

### 5.3 Advanced detail

Raw level, lifetime Training-XP, source totals and old skill identifiers may remain in an optional advanced/debug detail. They are never the primary child-facing explanation and never appear on compact cards.

## 6. Researcher level

The permanent account progression is shown only as **Onderzoekerslevel**:

- large numeric level;
- lifetime XP progress ring;
- exact XP to the next level;
- next visible reward;
- text: `XP kun je niet uitgeven en kan niet dalen.`

Old account tiers, prestige labels and star-shaped tier medals disappear from the active HUD and Profile. Existing tier data and root `title` behavior remain for old APK compatibility and read-only legacy history.

## 7. Four progression medallions

The active long-term paths are:

1. Ontdekken
2. Onderzoeken
3. Trainen
4. Spelen

Each path uses one unique illustrated medallion, not a generic badge and not rarity stars. Each path has four ranks: I, II, III and IV.

A path card shows:

- medallion artwork;
- current Roman rank;
- one plain-language next action;
- numeric progress;
- next character or cosmetic with image;
- one primary button.

No hidden path points are introduced. Ranks are calculated monotonically from existing verified counters and migration credit.

## 8. Legacy badges

Existing badges are never deleted. They are assigned to one of two destinations:

- contribute to a new progression-path migration result; or
- remain visible in the **Erfgoedkabinet**.

Legacy badges keep badge/pin artwork and are explicitly labeled as historical achievements. They do not use medallion art, do not unlock power and do not compete with the four active paths.

## 9. Mythical Crown

Crown progression uses a crown with four distinct jewel sockets:

- Kroon 0/4
- Kroon 1/4
- Kroon 2/4
- Kroon 3/4
- Kroon 4/4 · Voltooid

The old names Crowned, Elite, Master and Legend are removed from the normal interface because they collide with rarity, training and account terms.

Each earned stage fills one jewel and unlocks its free Crown visual trial. Crown PvE power is earned through existing Training and battle-win requirements and cannot be bought. Optional Gem styles can recolor an already-earned Crown visual but cannot fill jewels or add power.

## 10. Currencies and progress

### 10.1 XP

- Icon: circular XP progress ring, never a star or the rarity-star row.
- Label: `XP`.
- Meaning: permanent account progression.

### 10.2 Training-XP

- Icon: small training/whistle icon.
- Label: `Training-XP`.
- Meaning: progress for one species.
- Never shown as account XP.

### 10.3 Research Points

- Icon: microscope/research token.
- Label: `Onderzoekspunten` or compact `RP` after first explanation.
- Meaning: free spendable research currency.

### 10.4 BugGems

- Icon: faceted gem.
- Label: `BugGems` or `Gems`.
- Meaning: special/cosmetic currency.
- No euro purchase in 3.1.0.

## 11. Cards

### 11.1 Compact BugDex card

A compact bug card contains at most:

1. bug image and name;
2. rarity word plus stars;
3. five training segments plus `x/5`;
4. owned count.

It does not show raw mastery level, mastery rank, account tier, full skill list, acquisition history or Crown requirements.

### 11.2 Bug detail

The detail screen may show:

- rarity stars;
- Training segments and next-stage progress;
- Kracht;
- role and `Goed in` explanation;
- Crown jewels for Mythicals;
- dossier pages;
- acquisition tags/timeline;
- one next recommended action.

These blocks remain visually separate. Rarity color must not be reused as the Training fill solely to avoid implying that Training changes rarity.

### 11.3 Squad and trade cards

Squad and trade cards use the same compact language:

- rarity stars;
- Training segments;
- role icon/text;
- Kracht only where relevant to PvE selection.

A trade never presents Training as rarity or as a separate per-copy random quality.

## 12. Popups and animation

Only one major celebration is shown at a time. Smaller rewards are collected in a compact receipt afterward.

| Event | Main animation | Stable final state |
|---|---|---|
| New bug | Rarity frame/aura and species motion | Stars, rarity word, source, reward, `Bekijk in BugDex` |
| Duplicate | Bug appears without a second rarity celebration | `Later beslissen` or `Onderzoek deze bug`, with retained/used/reward explanation |
| Training stage | One training segment fills left-to-right | `Training x/5`, new effect and next target |
| Researcher level | Number and XP ring advance | New level, reward and next-level target |
| Path rank | Correct medallion gains Roman rank | New rank, reward and next checklist |
| Crown stage | One jewel lights up | `Kroon x/4`, earned PvE bonus and free visual trial |
| New fact | Dossier page opens/stamps | Fact text and `x/3 weetjes` |
| Legacy migration | Calm summary, no rarity celebration | Preserved XP, Training, medals, badges and characters |

Reduced-motion variants use crossfades and instant stable states without particle flight, shake or parallax.

## 13. Acquisition source icons

| Source | Pictogram | Label |
|---|---|---|
| Verified scan | Camera | Zelf gevonden |
| Research | Microscope | Onderzocht |
| Campaign | Flag | Campaign |
| Game/PvE | Trophy | Gewonnen |
| Movement | Shoe | Gelopen |
| Event | Calendar | Event |
| Trade | Exchange arrows | Geruild |
| Old combine | Anvil | Oude upgrade |
| Unknown historical | Archive box | Legacy / Eerder verkregen |

Exact dates are shown only when stored. Historical dates are never invented.

## 14. Migration and compatibility

- Existing rarity is unchanged.
- Existing bugMastery level, lifetime XP, skills, wins and sources remain unchanged.
- Training stage is a derived view and requires no destructive data conversion.
- Existing Crown power remains derived from existing level and battle wins.
- Existing account XP, badges, characters, frames and cosmetics remain unlocked.
- Old APKs continue reading and writing their existing fields and labels.
- The 3.1 client does not write a new visual-only star/bar value to Firebase when it can be derived.
- A player can never lose an unlock because the visual language changed.

## 15. Plan supersession

This specification supersedes every reference in the BugBaas 3.1 master plan to:

- `TrainingStars`;
- Training displayed with `★` symbols;
- mastery-stage thresholds expressed as stars;
- star-based Mastery Team Challenge labels;
- Crown rank names `Elite`, `Master` or `Legend` in the child-facing UI.

The implementation plan must instead use a shared component such as `TrainingSegments` or `TrainingProgress`, with the exact level mapping in section 5.2.

Mastery Team Challenge requirements become:

- all three bugs Training 2/5;
- all three bugs Training 3/5;
- all three bugs Training 5/5.

The underlying existing level thresholds remain 5, 10 and 20.

## 16. Acceptance criteria

The design is accepted only when all of the following are true:

1. Rarity stars are used only for rarity.
2. Training uses only segmented bars plus `Training x/5`.
3. Account level uses only the level number and XP ring.
4. Progression paths use only their four illustrated medallions and Roman ranks.
5. Legacy achievements use badge/pin artwork and are visibly historical.
6. Crown uses only the crown and four jewels.
7. Every currency has a unique icon and written label.
8. No important meaning depends only on color.
9. Every destructive/spend popup states what is used, retained and received.
10. Compact cards contain no more than the defined four information groups.
11. Full, reduced-motion and small-screen screenshots pass on all required viewports.
12. A child tester can correctly explain rarity, Training, account level, medal, Crown, RP and Gems without coaching.
13. Existing users retain all data and unlocks.
14. Old APK compatibility tests remain green.

## 17. Required tests

- Unit tests for mastery-level to Training-stage boundaries: 1, 4, 5, 9, 10, 14, 15, 19 and 20.
- Component tests proving Training has no star glyph or rarity-star asset.
- Static scan that fails if `TrainingStars` or a Training label with `★` is introduced.
- Screenshot tests for Common through Mythical cards at Training 1/5 through 5/5.
- Screenshot tests for level, all four medallions, legacy badges and Crown 0/4 through 4/4.
- Accessibility tests proving every icon has a readable label.
- Migration tests proving the display conversion writes no destructive mastery data.
- Old/new APK tests proving existing mastery, Crown and account data remain usable.
- Child-comprehension test: at least four of five testers answer every core symbol question correctly.
