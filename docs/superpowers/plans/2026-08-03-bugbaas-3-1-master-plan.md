# BugBaas 3.1 Progression, Research & Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BugBaas 3.1 vervangt de onduidelijke upgrade- en puntenstructuur door één kindvriendelijke progression-loop met permanente XP, gratis Onderzoekspunten, toekomstige BugGems, onderzoekbare duplicates, gegarandeerde Legendary/Mythical-routes en aantoonbaar betrouwbare regressietests.

**Architecture:** De bestaande BugDex-inventory, unlock history, mastery, trades, Museum, scans en rewards blijven de bron van waarheid. Nieuwe economie-, research-, herkomst- en migratiedata worden additief en server-authoritative toegevoegd. De 3.1-client stopt met oude upgradefuncties aanroepen, maar legacydata en tijdelijke oude-clientcompatibiliteit blijven tijdens de migratiefase bestaan. Iedere fase levert zelfstandig testbare software op en mag pas door wanneer unit-, server-, permissie-, visuele en waar nodig device-tests groen zijn.

**Tech Stack:** Expo, React Native, TypeScript, Firebase Authentication, Firestore, Firebase Cloud Functions, Node.js 24, `tsx`, Playwright, bestaande BugBaas assets, Android native movement bridge en bestaande BugScan-server.

## Global Constraints

- Werk voor implementatie in een geïsoleerde Git-worktree vanaf `codex/bugbaas-3.0`; raak de huidige vuile checkout en niet-getrackte assets niet aan.
- BugBaas 3.1 blijft localhost/intern totdat de eigenaar expliciet toestemming geeft voor Firebase, Vercel, APK of store-publicatie.
- Behoud alle bestaande BugDex-copies, unlock history, mastery, squads, trades, Museumplaatsingen, badges, titels, characters, Daily/Weekly missions en 2.10.19-compatibele data.
- Nieuwe Firestore-paden zijn additief. Bestaande client-write-regels worden nooit verruimd.
- Currency, duplicate-conversie, researchaankopen, researchclaims, scanpassen, migraties en premium grants zijn server-authoritative, transactioneel en idempotent.
- `verifiedObservations` blijft owner-read/server-write-only via een UID-gebonden kortlevend BugScan-bewijs.
- Exacte GPS blijft privé en wordt nooit sociaal of publiek opgeslagen.
- Behoud de vijf bestaande BottomNav-items; Research komt achter Collection/BugDex en als compacte World-kaart, niet als nieuwe hoofdtab.
- De interface moet zonder handleiding begrijpelijk zijn voor een tienjarige: één primaire actie, korte zinnen, vaste iconen en vooraf tonen wat wordt gebruikt, behouden en ontvangen.
- XP is permanente status, Onderzoekspunten zijn gratis currency en BugGems zijn premium currency. Deze drie betekenissen mogen nergens worden vermengd.
- BugGems kunnen in 3.1.0 gratis worden verdiend en uitgegeven aan goedgekeurde items; euro-aankopen blijven uitgeschakeld totdat store-receiptvalidatie en ouderbevestiging afzonderlijk zijn goedgekeurd en getest.
- Geen lootboxes, willekeurige betaalde beloningen, directe betaalde Legendary/Mythical bugs of betaalde Ranked-power.
- Geen vrije AI-feiten, AI-missies, AI-rewards of AI-keuze van proxybugs. Feiten en proxyrelaties zijn vooraf gecontroleerde data.
- Research mag door scans sneller gaan, maar iedere research moet zonder camera, premium betaling of tijdelijke deadline haalbaar zijn.
- Gebruik bestaande BugArt en rarity-effecten. Nieuwe gegenereerde assets zijn text-free, gebundeld en volgen de bestaande BugBaas-stijl.
- Minimaal tappable oppervlak is 44×44 px. Geen belangrijke actie of target mag achter HUD, safe area, BottomNav of footer vallen.
- Ondersteun reduced motion. Animaties mogen geen rewardclaim, navigatie of herstel blokkeren.
- Iedere taak start met een falende test of reproduceerbaar bewijs, eindigt met relevante tests en krijgt een afzonderlijke commit.
- Een functie heet pas `complete` wanneer bron, geauthenticeerde runtime, relevante permissies, belangrijke foutstatussen en vereiste screenshots bewezen zijn.
- Voor iedere merge: relevante tests, `npm run typecheck`, `git diff --check` en een gerichte regressierun.
- Voor 3.1-release: versie `3.1.0`, Android `versionCode 317`; pas wijzigen in de expliciete releasevoorbereidingstaak.

---

# 1. Bevestigde uitgangssituatie

## 1.1 Code-audit

De codecontrole van 3 augustus 2026 bevestigt:

- `src/services/bugDexService.ts` bevat nog de oude willekeurige combine-/upgradepaden, dagelijkse upgraderestricties en `source: "combine"`.
- `src/screens/BugDexScreen.tsx` bezit nog een groot ingebed Upgrade-paneel en roept de combinefuncties direct aan.
- `src/components/BugDexUnlockModal.tsx` heeft bruikbare spring-, glow-, rarity- en Mythical-effecten, maar een duplicate toont hoofdzakelijk `+1` en één sluitknop.
- `src/components/BuddyOverlay.tsx` kiest de eerste geldige bug uit de actieve squad als fallback en bevat geen zichtbare Buddy-kiezer.
- Tap Duel gebruikt momenteel 56 targets in 30 seconden en maximaal 10 zichtbare targets. De HUD ligt absoluut over het speelveld terwijl target-Y tot circa 4% van de bovenkant kan komen.
- `not_in_catalog` scans leveren een Journal-waarneming maar geen gecontroleerde vergelijkbare BugDex-beloning.
- Journal-writes gaan correct via `recordVerifiedObservation`; directe client-writes naar `verifiedObservations` zijn terecht verboden.
- Movement Radar bevat al `awardedToday`, `claimableRewards`, `maxRewards`, 1.500 meter per wandelreward en maximaal 10 rewards per dag. De huidige `x/10 bugs`-tekst is niet de gevraagde kleine duidelijke `Vandaag x/10`-badge.
- Bestaande Research Target gebruikt één actief doel met server-gevalideerde evidence en is een geschikte migratiebron, maar de selectie en presentatie horen in 3.1 bij het Onderzoekscentrum.
- Accountprogressie gebruikt nog `totalPoints` op veel plaatsen. Sommige verwijderpaden kunnen punten verlagen, wat niet past bij permanente lifetime XP.
- Mastery 1–20 en de onderliggende XP zijn breed verweven met gameplay. De data blijft daarom bestaan; alleen de spelersweergave verandert naar Training met vijf sterren.

## 1.2 Test-audit

Bewezen baseline:

- `npm run typecheck`: groen.
- Gerichte Buddy-, Journal-, Scan-, Movement-, Research-, rewardmodal- en Tap Duel-tests via `tsx`: 43/43 groen.
- BugScan-clienttests via `tsx`: 30/30 groen.
- BugScan-servertests: 43/43 groen.
- Firebase Functions-tests: 74/74 groen.

Bevestigd infrastructuurgat:

- De officiële TypeScript-testcommando's gebruiken onder Node 24 `node --experimental-strip-types --test` terwijl `package.json` CommonJS is. Daardoor falen de scripts vóórdat de tests worden uitgevoerd.
- `npx tsx --test` voert dezelfde tests wel correct uit.
- Bestaande Playwright-scripts gebruiken een hardcoded npm-cachepad en zijn daardoor niet reproduceerbaar voor collega's of CI.
- Er is geen centrale `verify:3.1`-poort die progression, BugScan, Functions, Rules, UI, migratie en screenshots samen afdwingt.

## 1.3 Screenshot-audit

Beschikbare historische baselinebeelden bestaan onder onder andere:

- `output/android-qa-beta4/`
- `output/qa-full-pass/`
- `output/playwright/`
- `output/visual-factory/current-added-bugdex-audit/`

Deze beelden bewijzen de oude schermen, maar niet de nieuwe 3.1-states. De bestaande screen-reviewdocumenten markeren veel visuele onderdelen bovendien als `partial` of `pending`. Daarom begint 3.1 met een nieuwe reproduceerbare voor-meting en eindigt iedere UI-fase met vergelijkbare na-beelden.

---

# 2. Definitief productcontract

## 2.1 Begrijpbare kernloop

```text
Speel, loop of scan
→ ontvang een bug en XP
→ nieuwe soort gaat naar de BugDex
→ duplicate bewaren of onderzoeken
→ ontvang een weetje en Onderzoekspunten
→ start een duidelijk onderzoek
→ voltooi stappen
→ ontvang de gekozen bug gegarandeerd
```

Een tienjarige moet na maximaal één minuut kunnen uitleggen:

- XP laat zien hoeveel ik gespeeld heb.
- Onderzoekspunten zijn gratis geld voor onderzoek en hulpmiddelen.
- BugGems zijn speciale munten voor extra scans en uiterlijk.
- Mijn eerste exemplaar blijft veilig.
- Ik koop een onderzoek, niet rechtstreeks een Legendary/Mythical.

## 2.2 XP

- Nieuwe `lifetimeXp` start exact gelijk aan bestaande `totalPoints`.
- XP kan worden toegevoegd maar nooit verwijderd.
- `totalPoints` blijft tijdelijk een compatibiliteitsspiegel voor oude clients en rankings.
- Uitgeven van Onderzoekspunten of BugGems verandert XP niet.
- Levelcurve:

```ts
export function xpForLevel(level: number): number {
  return Math.ceil((2 / 3) * Math.pow(Math.max(0, level - 1), 3));
}

export function levelForXp(xp: number): number {
  return Math.max(1, Math.floor(Math.cbrt(Math.max(0, xp) * 1.5)) + 1);
}
```

- Levels geven status, titels, profielranden, cosmetics en op vaste mijlpalen kleine gratis BugGem-grants.
- Levels geven geen sterkere bugs, dropkans, researchmultiplier of Ranked-voordeel.
- Bestaande titels, badges, characters en cosmetics worden grandfathered en kunnen niet opnieuw vergrendelen.

## 2.3 Onderzoekspunten

Nieuwe ontdekking:

| Rarity | Onderzoekspunten |
|---|---:|
| Gewoon | 10 |
| Zeldzaam | 30 |
| Episch | 80 |
| Legendarisch | 200 |
| Mythisch | 500 |

Duplicate onderzoeken:

| Rarity | Onderzoekspunten per extra copy |
|---|---:|
| Gewoon | 5 |
| Zeldzaam | 15 |
| Episch | 40 |
| Legendarisch | 100 |
| Mythisch | 250 |

Regels:

- Minimaal één copy per soort blijft altijd behouden.
- Open trades, gereserveerde copies en handmatig vergrendelde copies worden uitgesloten.
- Geen automatische conversie bij migratie.
- De server toont eerst een preview en voert daarna exact die preview transactioneel uit.
- Het saldo kan nooit negatief zijn.
- Iedere mutatie krijgt een permanent economy-event met uniek event-ID.

## 2.4 BugGems

3.1.0-bronnen:

- Levelmijlpalen.
- Vaste achievements.
- Goedgekeurde events.
- Eenmalige migratiegrants wanneer van toepassing.

3.1.0-uitgaven:

- Extra Scanpas: 60 BugGems voor drie extra geldige scans diezelfde Amsterdamse dag; maximaal één pas per dag.
- Cosmetics: kaartframes, profielranden, avataritems, Museum-/labthema's en rarity-effecten.
- Een vaste Research Kit mag later als niet-willekeurige bundel worden toegevoegd.

Niet actief in 3.1.0:

- Euro-aankopen.
- Directe aankoop van Legendary/Mythical bugs.
- Betaald overslaan van researchopdrachten.
- Betaalde random kisten.

## 2.5 Weetjes en dossiers

Per soort ondersteunt het model drie gecontroleerde dossierdelen:

1. Basisweetje bij eerste ontdekking.
2. Extra weetje bij de eerste onderzochte duplicate.
3. Extra weetje bij de tweede onderzochte duplicate; dossier compleet.

Daarna geven duplicates alleen Onderzoekspunten.

Wanneer een soort nog geen gecontroleerd extra weetje heeft, toont de app geen verzonnen tekst maar:

> Je hebt alle beschikbare informatie over deze bug onderzocht.

Nieuwe feiten worden pas gepubliceerd na inhoudelijke review, bronregistratie en catalogustest.

## 2.6 Research

Er is maximaal één actief hoofdonderzoek.

| Onderzoek | Kosten | Structuur | Beloning |
|---|---:|---|---|
| Eenvoudig veldonderzoek | Gratis | 1 actie | XP/RP of gewone/zeldzame bug |
| Gewone/zeldzame soort | 300–600 RP | 1–2 stappen | Gekozen soort gegarandeerd |
| Epische soort | 1.500 RP | 2–3 stappen | Gekozen soort gegarandeerd |
| Legendary | 3.000 RP | 4 hoofdstukken | Gekozen Legendary gegarandeerd |
| Mythical | 12.000 RP | 6 hoofdstukken en voorwaarden | Gekozen Mythical gegarandeerd |

Algemene regels:

- De speler kiest uit drie passende ontbrekende doelen; bij bijna complete categorieën worden alle resterende doelen getoond.
- Geen onderzoek verloopt.
- Geen scan is verplicht; scanacties tellen sneller, maar iedere stap heeft een gratis alternatief via spelen, lopen, duplicates of Campaign.
- Lucky drops, vaste Campaign-rewards en events blijven aanvullende routes.
- Researchpunten kopen toegang, nooit automatische afronding.
- Mythical vereist een passend level, drie afgeronde Legendary onderzoeken en minimaal één Museumvleugel op Master.

## 2.7 Shop

Onderzoekspunten:

| Item | Prijs | Exact effect |
|---|---:|---|
| Habitatlokker | 250 RP | Volgende 10 bugbeloningen worden binnen de al gekozen rarity naar het gekozen habitat gewogen |
| Soortenradar | 400 RP | Volgende 10 bugbeloningen geven voorrang aan ontbrekende soorten binnen de al gekozen rarity |
| Onderzoeksboost | 300 RP | Volgende 3 passende acties geven één extra researchstap; niet stapelbaar |
| Missiewissel | 75 RP | Vervangt één toegestane dagelijkse/wekelijkse missie door een gelijkwaardige missie |
| Soortonderzoek | 300–1.500 RP | Start een gekozen gewone/zeldzame/epische research |
| Legendary onderzoek | 3.000 RP | Start een gekozen Legendary-route |
| Mythical onderzoek | 12.000 RP | Start een Mythical-verhaallijn wanneer voorwaarden zijn behaald |

BugGems:

| Item | Prijs | Exact effect |
|---|---:|---|
| Extra Scanpas | 60 Gems | Drie extra geldige scans vandaag, maximaal één pas per dag |
| Cosmetics | Vaste catalogusprijs | Alleen visuele of profielgebonden inhoud |

Lures en radar veranderen nooit de rarity. Boosts kunnen niet stapelen.

## 2.8 Bestaande spelers

Alles blijft behouden:

- Inventory en copycounts.
- Unlock history.
- Mastery, skills, Crown-rangen en battle wins.
- Squads en Buddy-state.
- Open trades.
- Museumplaatsingen en rewardclaims.
- Titels, badges en characters.

Eenmalig veteranenpakket op basis van bestaande unieke soorten:

| Unieke soorten | Start-RP |
|---:|---:|
| 1–49 | 250 |
| 50–149 | 750 |
| 150–299 | 1.500 |
| 300+ | 2.500 |

- Geen retroactieve RP per historische soort; dat zou extreme saldi maken.
- Bestaande duplicates blijven handmatig converteerbaar tegen de normale raritywaarde.
- Oude Research Target blijft doel/progress/claimstatus behouden als `legacy` contract.
- Voltooid maar niet geclaimd oud onderzoek wordt veilig claimbaar gehouden.
- Eerder via XP vrijgespeelde bugs blijven bezit; XP ontgrendelt na 3.1 geen nieuwe soorten meer.
- Oude combine-rewards blijven bezit en krijgen herkomsttag `Oude upgrade`.
- Oude verbruikte bugs worden niet terugbetaald.

Veteranen met Legendary/Mythical bezit:

- `owned` en `fullyResearched` zijn verschillende statussen.
- Een al bezeten Legendary/Mythical opent een gratis veteranenresearch zonder tweede eerste-copy-beloning.
- Afronding geeft een prestige-frame, titel, Museumstandaard of aura en de tag `Volledig onderzocht`.
- Een extra Legendary/Mythical copy kan normaal voor respectievelijk 100/250 RP worden onderzocht.

## 2.9 Herkomst en Zelf gevonden

Nieuwe immutable acquisition events bewaren per reward:

- bugId.
- source.
- sourceDetail.
- acquiredAt.
- copyDelta.
- eventId.
- exactScanSpecies indien relevant.
- proxyBugId indien relevant.

Zichtbare tags:

- Zelf gevonden.
- Onderzocht.
- Campaign.
- Gewonnen.
- Gelopen.
- Event.
- Geruild.
- Oude upgrade.
- Legacy.
- Vergelijkbare scanbeloning.

Historische records krijgen alleen feiten die uit bestaande data afleidbaar zijn. Er worden geen per-copy datums verzonnen.

`Zelf gevonden` is een BugDex-filter/actie, geen vierde Collection-tab. Alleen exact geverifieerde catalogusscans krijgen deze tag. Het Journal blijft de lijst met individuele waarnemingen.

## 2.10 Out-of-catalog scanproxy

De scan blijft de werkelijk gevonden soort tonen met Nederlandse en wetenschappelijke naam.

Een vergelijkbare BugDex-beloning mag alleen wanneer een vooraf gecontroleerde taxonomische mapping bestaat:

1. Exacte alias → exacte catalogussoort.
2. Zelfde soortgroep/geslacht met goedgekeurde proxy → proxy toegestaan.
3. Alleen brede visuele gelijkenis → geen proxy.
4. Geen betrouwbare mapping → Journal + XP/RP/researchprogressie, geen BugDex-copy.

Proxyregels:

- Maximaal rarity `Zeldzaam`.
- Nooit Legendary/Mythical/Epic.
- Tag `Vergelijkbare scanbeloning`.
- Niet meetellen als `Zelf gevonden` voor de proxysoort.
- De echte soort blijft zichtbaar bij `Andere echte vondsten`.
- AI kiest nooit zelfstandig de proxy.

## 2.11 Views

### World

- Compacte actieve-researchkaart met één volgende stap.
- Movement Radar toont klein maar prominent `Vandaag x/10`.
- `x/10` telt alleen server-bevestigde claims; klaarstaande maar ongeclaimde rewards veranderen de teller niet.

### Scan

- `gratis gebruikt / 3` en eventueel `extra gebruikt / 3` duidelijk zichtbaar.
- Exacte identificatie en BugDex-beloning apart benoemd.
- Journal-syncstatus met specifieke fout en veilige pending-herstelroute.

### Collection / BugDex

- Bestaande tabs blijven BugDex, Museum en Journal.
- BugDex-dashboard toont `Zelf gevonden`, `Onderzoekscentrum`, `Mijn team`, `Handelen`.
- Oude Upgrade-kaart en Upgrade-paneel verdwijnen uit 3.1.

### Onderzoekscentrum

- Saldo.
- Actief onderzoek.
- Duplicates onderzoeken.
- Kleine shop.

### Profile

- Onderzoekerslevel, lifetime XP en voortgang.
- Geen gameplay-power aan level gekoppeld.

### Buddy

- `Kies een andere Buddy` met eigen-bugkiezer.

### Tap Duel

- 68 targets per 30 seconden, maximaal 10 tegelijk.
- HUD buiten het coordinate-systeem van het speelveld.
- Volledige target-hitbox binnen de veilige zone.

---

# 3. Data- en bestandsarchitectuur

## 3.1 Nieuwe Firestore-paden

| Pad | Schrijver | Lezer | Doel |
|---|---|---|---|
| `users/{uid}` rootvelden | server plus tijdelijk gevalideerde legacy-writers | eigenaar en bestaande publieke projecties | `lifetimeXp` als nieuwe XP-bron en `totalPoints` als tijdelijke compatibiliteitsspiegel |
| `users/{uid}/economy/state` | server | eigenaar | researchPoints, bugGems, featureVersion |
| `users/{uid}/economyEvents/{eventId}` | server | eigenaar | immutable currencyledger |
| `users/{uid}/researchContracts/{contractId}` | server | eigenaar | actief/afgerond onderzoek |
| `users/{uid}/researchEvents/{eventId}` | server | eigenaar | idempotente researchprogressie |
| `users/{uid}/speciesResearch/{bugId}` | server | eigenaar | factslots en volledig-onderzochtstatus |
| `users/{uid}/acquisitionEvents/{eventId}` | server | eigenaar | nieuwe herkomst per copy/reward |
| `users/{uid}/migration/bugbaas-3-1` | server | eigenaar | eenmalige migratieversie en grants |
| `users/{uid}/scanPasses/{dayId}` | server | eigenaar | extra scanrecht en verbruik |
| `users/{uid}/pendingVerifiedScans/{scanId}` | server | eigenaar | herstelbare verplichte Journal-write |
| `appConfig/bugbaas31` | server/developer | ingelogde gebruiker | rolloutflags voor economy, Research Center, migratie, proxy, Gems en commerce |

Alle subcollectiewrites in deze tabel zijn server-only. De client mag alleen lezen en HTTPS Functions aanroepen. `users/{uid}.lifetimeXp` wordt door 3.1-serverpaden verhoogd; legacy writers mogen tijdens de compatibiliteitsperiode alleen `totalPoints` volgens hun bestaande regels wijzigen. Een synchronisatie-endpoint verhoogt `lifetimeXp` wanneer een oude client `totalPoints` hoger heeft gemaakt, maar verlaagt XP nooit.

## 3.2 Nieuwe appbestanden

- `src/services/progression/economyModel.ts`
- `src/services/progression/economyModel.test.ts`
- `src/services/progression/economyService.ts`
- `src/services/progression/duplicateResearchModel.ts`
- `src/services/progression/duplicateResearchModel.test.ts`
- `src/services/progression/speciesResearchModel.ts`
- `src/services/progression/speciesResearchModel.test.ts`
- `src/services/progression/researchContractModel.ts`
- `src/services/progression/researchContractModel.test.ts`
- `src/services/progression/researchShopModel.ts`
- `src/services/progression/researchShopModel.test.ts`
- `src/services/progression/scanPassModel.ts`
- `src/services/progression/scanPassModel.test.ts`
- `src/services/progression/migrationModel.ts`
- `src/services/progression/migrationModel.test.ts`
- `src/services/progression/acquisitionHistoryModel.ts`
- `src/services/progression/acquisitionHistoryModel.test.ts`
- `src/services/progression/bugMotionModel.ts`
- `src/services/progression/bugMotionModel.test.ts`
- `src/services/progression/bugbaas31FeatureFlags.ts`
- `src/services/fieldJournalErrorModel.ts`
- `src/services/fieldJournalErrorModel.test.ts`
- `src/services/pendingFieldJournalService.ts`
- `src/services/researchArt.ts`
- `src/services/tapDuelLayoutModel.ts`
- `src/services/tapDuelLayoutModel.test.ts`
- `src/screens/ResearchCenterScreen.tsx`
- `src/screens/research/ActiveResearchPanel.tsx`
- `src/screens/research/DuplicateResearchPanel.tsx`
- `src/screens/research/ResearchShopPanel.tsx`
- `src/screens/research/ResearchTargetPicker.tsx`
- `src/components/rewards/RewardQueueProvider.tsx`
- `src/components/rewards/BugDiscoveryModal.tsx`
- `src/components/rewards/DuplicateResearchModal.tsx`
- `src/components/AnimatedBugArt.tsx`
- `src/components/BugBaas31MigrationModal.tsx`
- `src/components/BugBaas31MigrationModal.structure.test.ts`
- `src/components/BuddyPickerModal.tsx`
- `src/components/BuddyPickerModal.test.ts`
- `src/components/TrainingStars.tsx`
- `src/components/TrainingStars.test.ts`

## 3.3 Nieuwe server/shared/scripts

- `firebase/functions/economyCore.js`
- `firebase/functions/economyCore.test.js`
- `firebase/functions/researchContractCore.js`
- `firebase/functions/researchContractCore.test.js`
- `firebase/functions/migrationCore.js`
- `firebase/functions/migrationCore.test.js`
- `firebase/functions/scanProxyCore.js`
- `firebase/functions/scanProxyCore.test.js`
- `shared/scan-proxy-groups.json`
- `shared/bugdex-research-facts.json`
- `scripts/preview_bugbaas_31_migration.mjs`
- `scripts/run-ts-tests.mjs`
- `scripts/validate_research_facts.mjs`
- `scripts/bugbaas31ResearchAssets.test.mjs`
- `tests/firestore/bugbaas31.rules.test.mjs`
- `playwright.config.ts`
- `scripts/qa/bugbaas31-auth.ts`
- `scripts/qa/bugbaas31-baseline.spec.ts`
- `scripts/qa/bugbaas31-fixtures.ts`
- `scripts/qa/bugbaas31-visual.spec.ts`
- `scripts/qa/bugbaas31-functional.spec.ts`
- `scripts/qa/bugbaas31-concurrency.mjs`
- `.github/workflows/bugbaas-3-1-verify.yml`
- `docs/visual/bugbaas-3.1-research-assets.md`
- `docs/reviews/bugbaas-3.1-visual-qa.md`
- `docs/reviews/bugbaas-3.1-android-qa.md`
- `docs/reviews/bugbaas-3.1-migration-rehearsal.md`
- `docs/reviews/bugbaas-3.1-release-readiness.md`

## 3.4 Belangrijkste interfaces

```ts
export type EconomyState = {
  version: 1;
  researchPoints: number;
  bugGems: number;
  updatedAt: string;
};

export type EconomyEvent = {
  id: string;
  currency: "xp" | "research_points" | "bug_gems";
  delta: number;
  reason: string;
  referenceId: string;
  createdAt: string;
};

export type ResearchContractTier = "field" | "common_rare" | "epic" | "legendary" | "mythic" | "veteran";

export type ResearchContract = {
  id: string;
  bugId: string;
  tier: ResearchContractTier;
  status: "active" | "completed" | "claimed";
  chapterIndex: number;
  steps: ResearchStep[];
  startedAt: string;
  completedAt?: string;
  claimedAt?: string;
  legacyProgress?: number;
};

export type ResearchStep = {
  id: string;
  kind: "receive_bug" | "unique_family" | "research_duplicates" | "walk_km" | "play_completions" | "campaign_win" | "verified_scan" | "museum_master";
  target: number;
  progress: number;
  scanBonus?: number;
};

export type AcquisitionSource =
  | "verified_scan"
  | "scan_proxy"
  | "research"
  | "campaign"
  | "play"
  | "movement"
  | "event"
  | "trade"
  | "legacy_upgrade"
  | "legacy";
```

---

# 4. Implementation Tasks

### Task 1: Isolated worktree and reproducible test runner

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/run-ts-tests.mjs`
- Create: `.github/workflows/bugbaas-3-1-verify.yml`
- Test: existing `*.test.ts`, `server/realBugScan/*.test.mjs`, `firebase/functions/*.test.js`

**Interfaces:**
- Produces: `npm run test:ts`, `npm run test:3.1:core`, `npm run verify:3.1`.
- Consumes: existing TypeScript, MJS and Firebase testfiles.

- [ ] **Step 1: Create an isolated worktree**

Use the `superpowers:using-git-worktrees` skill and create a clean worktree from `codex/bugbaas-3.0`. Confirm `git status --short` is empty before modifying files.

- [ ] **Step 2: Record the failing official runner**

Run:

```bash
npm run test:real-bug-scan
```

Expected before the fix: FAIL before test execution with `Cannot use import statement outside a module` for `.test.ts` files.

- [ ] **Step 3: Add pinned test dependencies and scripts**

Add pinned dev dependencies `tsx`, `@playwright/test`, `@firebase/rules-unit-testing` and `firebase-tools`. Add scripts:

```json
{
  "test:ts": "node scripts/run-ts-tests.mjs",
  "test:real-bug-scan": "tsx --test src/services/pendingBugDexDiscovery.test.ts src/services/realBugCameraAsset.test.ts src/services/realBugScanContract.test.ts src/services/realBugScanFingerprint.test.ts src/services/realBugScanImagePolicy.test.ts src/services/realBugScanProgress.test.ts src/services/realBugScanReward.test.ts src/services/realBugScanUsage.test.ts && node --test server/realBugScan/*.test.mjs",
  "test:3.1:core": "tsx --test src/services/progression/*.test.ts src/services/tapDuelLayoutModel.test.ts",
  "test:3.1:functions": "npm --prefix firebase/functions test",
  "test:3.1:rules": "firebase emulators:exec --only firestore \"node --test tests/firestore/bugbaas31.rules.test.mjs\"",
  "test:3.1:visual": "playwright test scripts/qa/bugbaas31-visual.spec.ts",
  "test:3.1:functional": "playwright test scripts/qa/bugbaas31-functional.spec.ts",
  "verify:3.1": "npm run typecheck && npm run test:ts && npm run test:real-bug-scan && npm run test:3.1:functions && npm run test:3.1:rules && npm run validate:bug-art"
}
```

`scripts/run-ts-tests.mjs` discovers app `.test.ts` files outside dependency/build/output directories, splits them into bounded batches and invokes the local `tsx` binary with `--test`.

- [ ] **Step 4: Run the repaired baseline**

Run:

```bash
npm run typecheck
npm run test:real-bug-scan
npm --prefix firebase/functions test
```

Expected: typecheck green; 30 client scan tests, 43 scan server tests and 74 Function tests green, subject to additional tests added by later tasks.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json scripts/run-ts-tests.mjs .github/workflows/bugbaas-3-1-verify.yml
git commit -m "test: make BugBaas suites reproducible"
```

### Task 2: Deterministic visual baseline and screenshot inventory

**Files:**
- Create: `playwright.config.ts`
- Create: `scripts/qa/bugbaas31-auth.ts`
- Create: `scripts/qa/bugbaas31-baseline.spec.ts`
- Create: `docs/reviews/bugbaas-3.1-visual-qa.md`
- Reference: `output/android-qa-beta4/`, `output/qa-full-pass/`, `output/playwright/`

**Interfaces:**
- Produces: deterministic authenticated screenshot harness and baseline report.
- Consumes: `BUGBAAS_TEST_EMAIL`, `BUGBAAS_TEST_PASSWORD`, localhost web build.

- [ ] **Step 1: Write a failing baseline test**

Create a Playwright test that expects screenshots for World, Scan, Play, BugDex, Journal, Museum, Profile, Buddy and Tap Duel at all required viewports. The test must fail because the new baseline directory is empty.

Required viewports:

```ts
[
  { name: "phone-360", width: 360, height: 800 },
  { name: "phone-390", width: 390, height: 844 },
  { name: "phone-430", width: 430, height: 932 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 }
]
```

- [ ] **Step 2: Run and confirm the red phase**

```bash
npx playwright test scripts/qa/bugbaas31-baseline.spec.ts
```

Expected: FAIL on missing baseline images, not on authentication or a hardcoded Playwright path.

- [ ] **Step 3: Implement portable authentication and screenshot capture**

Use `@playwright/test` imports only. Fail clearly when test credentials are missing. Capture console errors, page errors, request failures, viewport dimensions and visible route text into a JSON report.

- [ ] **Step 4: Capture current before-images**

Save under:

```text
output/bugbaas-3.1-qa/before/phone-360/world.png
output/bugbaas-3.1-qa/before/phone-390/world.png
output/bugbaas-3.1-qa/before/phone-430/world.png
output/bugbaas-3.1-qa/before/tablet/world.png
output/bugbaas-3.1-qa/before/desktop/world.png
```

Gebruik dezelfde vaste schermnamen (`world`, `scan`, `play`, `bugdex`, `journal`, `museum`, `profile`, `buddy`, `tap-duel`) onder iedere viewportmap.

Include at least:

- World Today and Movement Radar.
- Scan capture, result and Journal stage.
- Play Arcade and Tap Duel running.
- Collection BugDex dashboard, old Upgrade panel, Journal and Museum.
- Existing duplicate reward modal.
- Buddy overlay.
- Profile XP.

- [ ] **Step 5: Document visible baseline defects**

In `docs/reviews/bugbaas-3.1-visual-qa.md`, record screenshot path, viewport, defect, severity and intended 3.1 correction. Include Buddy selection absence, Upgrade density, duplicate action absence, movement badge clarity and Tap Duel HUD overlap.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts scripts/qa/bugbaas31-auth.ts scripts/qa/bugbaas31-baseline.spec.ts docs/reviews/bugbaas-3.1-visual-qa.md
git commit -m "test: capture BugBaas 3.1 visual baseline"
```

### Task 3: Economy model, lifetime XP and level compatibility

**Files:**
- Create: `src/services/progression/economyModel.ts`
- Create: `src/services/progression/economyModel.test.ts`
- Modify: `src/types.ts`
- Modify: `src/services/userService.ts`
- Modify: `src/services/pointsService.ts`
- Modify: `src/services/bugService.ts`

**Interfaces:**
- Produces: `xpForLevel`, `levelForXp`, `normalizeEconomyState`, `researchPointValueForRarity`, `newDiscoveryPointValueForRarity`.
- Consumes: existing `User.totalPoints`, `BugDexRarity`.

- [ ] **Step 1: Write failing economy tests**

Test exact values:

```ts
assert.equal(levelForXp(0), 1);
assert.equal(xpForLevel(25), Math.ceil((2 / 3) * 24 ** 3));
assert.deepEqual(researchPointValues, {
  Gewoon: 5,
  Zeldzaam: 15,
  Episch: 40,
  Legendarisch: 100,
  Mythisch: 250
});
```

Also prove lifetime XP cannot be reduced by a negative delta.

- [ ] **Step 2: Run and confirm failure**

```bash
npx tsx --test src/services/progression/economyModel.test.ts
```

Expected: FAIL because the economy model does not exist.

- [ ] **Step 3: Implement pure economy functions**

Add strict finite-number normalization, non-negative balances and exact tables from section 2. `users/{uid}.lifetimeXp` is authoritative for nieuwe XP; `users/{uid}.totalPoints` blijft een tijdelijke compatibiliteitsspiegel. `economy/state` bevat alleen Research Points, BugGems en de dataversie.

- [ ] **Step 4: Add user compatibility fields**

Extend `User` with optional `lifetimeXp` and `progressionVersion`. Research Points en BugGems worden via `EconomyState` geladen en niet als tweede saldo op het root-userdocument opgeslagen. During normalization:

```ts
lifetimeXp = Math.max(user.lifetimeXp ?? 0, user.totalPoints ?? 0)
```

Do not overwrite grandfathered unlocks or cosmetics.

- [ ] **Step 5: Stop XP decrements**

Change delete/reversal paths so report deletion may update `bugCount` or report state but never subtract lifetime XP. Inventory all `totalPoints` writers with `rg -n "totalPoints" src firebase/functions firestore.rules`; migrate 3.1 rewardwriters to one `grantLifetimeXp` helper that raises `lifetimeXp` and mirrors `totalPoints`. Add `syncLifetimeXpFloor` so rewards earned by a temporary old client can raise `lifetimeXp` to a higher legacy `totalPoints`, never lower it. Add regressions for report deletion and old-client/new-client synchronization.

- [ ] **Step 6: Run focused and broad tests**

```bash
npx tsx --test src/services/progression/economyModel.test.ts src/services/userService*.test.ts src/services/pointsService*.test.ts src/services/bugService*.test.ts
npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/services/progression/economyModel.ts src/services/progression/economyModel.test.ts src/services/userService.ts src/services/pointsService.ts src/services/bugService.ts
git commit -m "feat: add permanent BugBaas economy model"
```

### Task 4: Server-authoritative economy ledger and Firestore rules

**Files:**
- Create: `firebase/functions/economyCore.js`
- Create: `firebase/functions/economyCore.test.js`
- Modify: `firebase/functions/index.js`
- Modify: `firestore.rules`
- Modify: `firestore.indexes.json`
- Create: `tests/firestore/bugbaas31.rules.test.mjs`
- Create: `src/services/progression/economyService.ts`
- Create: `src/services/progression/bugbaas31FeatureFlags.ts`

**Interfaces:**
- Produces HTTPS endpoints `economyStatus`, `syncLifetimeXpFloor`, `previewDuplicateResearch`, `researchDuplicates`, `purchaseResearchItem`, `claimLevelMilestones` and read access to `appConfig/bugbaas31`.
- Consumes pure economy values from equivalent shared constants synchronized by tests.

- [ ] **Step 1: Write failing core tests**

Cover:

- Same event-ID cannot grant twice.
- Negative spend is rejected.
- Insufficient balance is rejected.
- Concurrent duplicate research cannot consume the same copy twice.
- Research Points and BugGems cannot become negative.
- XP grants only increase lifetime XP.

- [ ] **Step 2: Write failing Rules tests**

Prove owner can read new paths, client cannot create/update/delete them, another user cannot read them and existing `verifiedObservations`/Buddy/trade rules remain unchanged. Prove `appConfig/bugbaas31` is readable by an authenticated player, not writable by a normal client and absent/invalid config safely resolves to all 3.1 flags false.

- [ ] **Step 3: Implement pure ledger planning**

`economyCore.js` returns deterministic transaction plans. `index.js` performs Firestore reads/writes in one transaction and writes an immutable `economyEvents/{eventId}` document. XP plans raise root `users/{uid}.lifetimeXp` and mirror `totalPoints`; RP/Gem plans mutate only `economy/state`. `syncLifetimeXpFloor` is monotonic and can only copy a higher legacy `totalPoints` into `lifetimeXp`.

- [ ] **Step 4: Add read-only client service**

`economyService.ts` calls endpoints with Firebase bearer token and never writes economy paths directly. `bugbaas31FeatureFlags.ts` reads and strictly normalizes `appConfig/bugbaas31`; missing, malformed or failed reads disable every new feature.

- [ ] **Step 5: Run tests**

```bash
npm --prefix firebase/functions test
npm run test:3.1:rules
npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add firebase/functions/economyCore.js firebase/functions/economyCore.test.js firebase/functions/index.js firestore.rules firestore.indexes.json tests/firestore/bugbaas31.rules.test.mjs src/services/progression/economyService.ts src/services/progression/bugbaas31FeatureFlags.ts
git commit -m "feat: add server-authoritative research economy"
```

### Task 5: Duplicate research model and safety preview

**Files:**
- Create: `src/services/progression/duplicateResearchModel.ts`
- Create: `src/services/progression/duplicateResearchModel.test.ts`
- Modify: `src/services/bugDexService.ts`
- Modify: `src/services/tradeService.ts`

**Interfaces:**
- Produces: `buildDuplicateResearchPreview(items, reservations, locks)`, `DuplicateResearchPreview`.
- Consumes: inventory, open trade reservations, rarity point table.

- [ ] **Step 1: Write failing preview tests**

Prove:

- Count 1 gives spendable 0.
- Count 4 gives spendable 3.
- Open trade copies are excluded.
- Locked copies are excluded.
- Mixed-rarity total is exact.
- Batch preview lists fact unlocks separately from point-only copies.

- [ ] **Step 2: Run red phase**

```bash
npx tsx --test src/services/progression/duplicateResearchModel.test.ts
```

- [ ] **Step 3: Implement pure preview**

The preview includes exact consumed counts, retained counts, RP total, newly unlocked fact slots and excluded reasons.

- [ ] **Step 4: Connect server endpoint**

The server recalculates the preview inside the transaction. Never trust client totals. Preserve existing inventory metadata and decrement only approved copies.

- [ ] **Step 5: Add legacy combine guard**

3.1 UI stops importing combine functions. Keep legacy functions temporarily for old-client compatibility but guard new 3.1 clients from invoking them and mark them deprecated in code comments and tests.

- [ ] **Step 6: Run inventory/trade/economy regressions**

```bash
npx tsx --test src/services/progression/duplicateResearchModel.test.ts src/services/bugDexService*.test.ts src/services/tradeService*.test.ts
npm --prefix firebase/functions test
```

- [ ] **Step 7: Commit**

```bash
git add src/services/progression/duplicateResearchModel.ts src/services/progression/duplicateResearchModel.test.ts src/services/bugDexService.ts src/services/tradeService.ts firebase/functions/index.js firebase/functions/economyCore.js firebase/functions/economyCore.test.js
git commit -m "feat: safely research duplicate bugs"
```

### Task 6: Controlled facts and species research

**Files:**
- Create: `shared/bugdex-research-facts.json`
- Create: `src/services/progression/speciesResearchModel.ts`
- Create: `src/services/progression/speciesResearchModel.test.ts`
- Modify: `firebase/functions/economyCore.js`
- Modify: `firebase/functions/index.js`
- Modify: `src/services/i18n.tsx`
- Create: `scripts/validate_research_facts.mjs`

**Interfaces:**
- Produces: fact slots `base`, `duplicate_1`, `duplicate_2`; server-updated `speciesResearch/{bugId}`.
- Consumes: canonical catalog IDs and existing base facts.

- [ ] **Step 1: Write failing schema tests**

Validate unique catalog IDs, no empty published fact, supported languages, maximum length and no unknown species IDs.

- [ ] **Step 2: Seed safe initial content**

Copy the existing reviewed base fact into slot 1. Add extra slots only where content has been reviewed. Missing slots remain absent rather than generated.

- [ ] **Step 3: Implement fact progression**

Duplicate 1 unlocks the next available locked fact. Duplicate 2 unlocks the final available fact. Additional duplicates give only RP. A species with no extra fact returns `all_available_known`.

- [ ] **Step 4: Add server transaction update**

Duplicate research updates species fact progress in the same transaction as inventory and currency.

- [ ] **Step 5: Run validation**

```bash
node scripts/validate_research_facts.mjs
npx tsx --test src/services/progression/speciesResearchModel.test.ts
npm --prefix firebase/functions test
```

- [ ] **Step 6: Commit**

```bash
git add shared/bugdex-research-facts.json scripts/validate_research_facts.mjs src/services/progression/speciesResearchModel.ts src/services/progression/speciesResearchModel.test.ts src/services/i18n.tsx firebase/functions/economyCore.js firebase/functions/index.js
git commit -m "feat: add reviewed BugDex research facts"
```

### Task 7: Central reward queue and animated discovery/duplicate flow

**Files:**
- Create: `src/components/rewards/RewardQueueProvider.tsx`
- Create: `src/components/rewards/RewardQueueProvider.test.ts`
- Create: `src/components/rewards/BugDiscoveryModal.tsx`
- Create: `src/components/rewards/DuplicateResearchModal.tsx`
- Create: `src/components/AnimatedBugArt.tsx`
- Create: `src/services/progression/bugMotionModel.ts`
- Create: `src/services/progression/bugMotionModel.test.ts`
- Modify: `src/components/BugDexUnlockModal.tsx`
- Modify: `App.tsx`

**Interfaces:**
- Produces: `enqueueReward`, priority queue, motion presets `flutter|crawl|hop|hover|idle`.
- Consumes: exact server reward receipts and reduced-motion preference.

- [ ] **Step 1: Write failing queue tests**

Prove Legendary/Mythical > new species > dossier/research completion > duplicate research > XP/RP toast, and that small rewards batch rather than overlap.

- [ ] **Step 2: Write failing duplicate-modal structure tests**

Require:

- Title `Deze bug had je al`.
- Exact copycount and RP value.
- Buttons `Onderzoek nu` and `Bewaar`.
- Text proving one copy remains safe.
- No direct inventory mutation from the modal.

- [ ] **Step 3: Implement shared animation shell**

Use existing rarity aura assets and animate only transforms/opacity around existing BugArt. Respect reduced motion and terminate loops on unmount.

- [ ] **Step 4: Implement research animation states**

```text
preview → bug_motion → research_machine → points_fly → fact_reveal → receipt
```

The server call occurs after confirmation. Failure returns to preview with inventory unchanged.

- [ ] **Step 5: Replace direct overlapping reward presentation**

Route existing unlock, badge, rank and research receipts through the queue without changing their authoritative source.

- [ ] **Step 6: Visual and automated tests**

Capture Common, Rare, Epic, Legendary, Mythical, duplicate-with-fact, duplicate-without-fact and batch states at phone/tablet sizes.

- [ ] **Step 7: Commit**

```bash
git add App.tsx src/components/rewards src/components/AnimatedBugArt.tsx src/components/BugDexUnlockModal.tsx src/services/progression/bugMotionModel.ts src/services/progression/bugMotionModel.test.ts
git commit -m "feat: unify animated BugBaas rewards"
```

### Task 8: Research contract model and server lifecycle

**Files:**
- Create: `src/services/progression/researchContractModel.ts`
- Create: `src/services/progression/researchContractModel.test.ts`
- Create: `firebase/functions/researchContractCore.js`
- Create: `firebase/functions/researchContractCore.test.js`
- Modify: `firebase/functions/index.js`
- Modify: `src/services/researchTargetModel.ts`
- Modify: `src/services/researchTargetService.ts`

**Interfaces:**
- Produces endpoints `researchCatalog`, `startResearchContract`, `researchContractStatus`, `claimResearchContract` and evidence sync.
- Consumes economy spend endpoint, inventory, Museum status, level and legacy Research Target.

- [ ] **Step 1: Write failing pure contract tests**

Test exact costs, tier chapter counts, one-active-contract rule, no expiry, prerequisites, scan bonus with free alternative and guaranteed target reward.

- [ ] **Step 2: Write failing idempotency tests**

The same evidence event cannot count twice; claim retry returns the same receipt; spending and contract creation happen atomically.

- [ ] **Step 3: Implement deterministic templates**

Templates use finite task kinds from the interface. Every generated contract is validated to contain at least one non-scan route for each chapter.

- [ ] **Step 4: Implement server endpoints**

Server checks target eligibility, balance, inventory, prerequisites and active contract inside one transaction.

- [ ] **Step 5: Bridge legacy Research Target**

Read existing target/progress and expose it as a `legacy` contract without resetting progress or claiming twice.

- [ ] **Step 6: Run tests**

```bash
npx tsx --test src/services/progression/researchContractModel.test.ts src/services/researchTargetService.test.ts
npm --prefix firebase/functions test
npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add src/services/progression/researchContractModel.ts src/services/progression/researchContractModel.test.ts src/services/researchTargetModel.ts src/services/researchTargetService.ts firebase/functions/researchContractCore.js firebase/functions/researchContractCore.test.js firebase/functions/index.js
git commit -m "feat: add guaranteed research contracts"
```

### Task 9: Research shop and bounded boost inventory

**Files:**
- Create: `src/services/progression/researchShopModel.ts`
- Create: `src/services/progression/researchShopModel.test.ts`
- Modify: `firebase/functions/economyCore.js`
- Modify: `firebase/functions/index.js`
- Modify: `src/services/bugDexService.ts`
- Modify: `src/services/dailyMissionService.ts`

**Interfaces:**
- Produces fixed item catalog and active effects for lure, radar, research boost and reroll.
- Consumes economy ledger and reward selection pipeline.

- [ ] **Step 1: Write failing catalog tests**

Assert exact item IDs, prices, durations/counts, one-currency pricing and no unknown/random product payloads.

- [ ] **Step 2: Write reward-safety tests**

Prove lure/radar cannot increase rarity, cannot produce Legendary/Mythical outside an already rolled rarity and cannot stack beyond one active effect of each class.

- [ ] **Step 3: Implement server purchase and effect state**

Purchase checks price from server catalog, not client input. Write an economy event and active effect transactionally.

- [ ] **Step 4: Integrate reward selection**

Apply habitat/missing preference only after rarity determination. Consume one charge only after a real bug reward is granted.

- [ ] **Step 5: Implement mission reroll boundaries**

Reroll only an allowed incomplete mission and replace it with a server-selected equivalent category/effort. Never reroll claimed missions.

- [ ] **Step 6: Run tests and commit**

```bash
npx tsx --test src/services/progression/researchShopModel.test.ts src/services/bugDexService*.test.ts src/services/dailyMissionService*.test.ts
npm --prefix firebase/functions test
git add src/services/progression/researchShopModel.ts src/services/progression/researchShopModel.test.ts src/services/bugDexService.ts src/services/dailyMissionService.ts firebase/functions/economyCore.js firebase/functions/index.js
git commit -m "feat: add bounded research shop items"
```

### Task 10: Research Center replaces Upgrade UI

**Files:**
- Create: `src/screens/ResearchCenterScreen.tsx`
- Create: `src/screens/ResearchCenterScreen.structure.test.ts`
- Create: `src/screens/research/ActiveResearchPanel.tsx`
- Create: `src/screens/research/DuplicateResearchPanel.tsx`
- Create: `src/screens/research/ResearchShopPanel.tsx`
- Create: `src/screens/research/ResearchTargetPicker.tsx`
- Modify: `src/screens/BugDexScreen.tsx`
- Modify: `src/screens/CollectionScreen.tsx`
- Modify: `src/navigation/appNavigation.ts`
- Modify: `App.tsx`
- Modify: `src/services/i18n.tsx`

**Interfaces:**
- Produces one Research Center route/overlay with active research, duplicates and shop.
- Consumes economy, duplicate preview, contract and shop services.

- [ ] **Step 1: Write failing ownership tests**

Require:

- BugDex contains no visible Upgrade action/panel.
- No 3.1 component imports combine functions.
- Research Center exists behind Collection/BugDex.
- World cannot open a second separate research selection system.

- [ ] **Step 2: Build the simple screen hierarchy**

Top to bottom:

1. Saldo header.
2. Active Research.
3. Duplicate Research.
4. Shop.

Only one section may present a dominant CTA at a time.

- [ ] **Step 3: Replace BugDex actions**

Dashboard actions become `Zelf gevonden`, `Onderzoekscentrum`, `Mijn team`, `Handelen`. Remove duplicate Museum shortcut because Museum is already a Collection tab.

- [ ] **Step 4: Preserve legacy deep links**

Old `upgrade` links redirect to Research Center with a one-time explanation; no old combine UI appears.

- [ ] **Step 5: Screenshot QA**

Capture empty, active research, many duplicates, no duplicates, insufficient balance, shop purchase confirmation and completed research at all viewports.

- [ ] **Step 6: Commit**

```bash
git add App.tsx src/navigation/appNavigation.ts src/screens/ResearchCenterScreen.tsx src/screens/ResearchCenterScreen.structure.test.ts src/screens/research src/screens/BugDexScreen.tsx src/screens/CollectionScreen.tsx src/services/i18n.tsx
git commit -m "feat: replace BugDex upgrades with Research Center"
```

### Task 11: Acquisition history, source tags and Zelf gevonden

**Files:**
- Create: `src/services/progression/acquisitionHistoryModel.ts`
- Create: `src/services/progression/acquisitionHistoryModel.test.ts`
- Modify: `firebase/functions/index.js`
- Modify: `src/services/bugDexService.ts`
- Modify: `src/screens/BugDexScreen.tsx`
- Modify: `src/screens/FieldJournalScreen.tsx`
- Modify: `src/services/i18n.tsx`

**Interfaces:**
- Produces immutable acquisition events and display-tag priority.
- Consumes existing inventory sources, unlock dates, verified observations and trade data.

- [ ] **Step 1: Write failing tag-priority tests**

Priority:

```text
Zelf gevonden > Onderzocht > Geruild > Campaign/Event > Gelopen/Gewonnen > Oude upgrade > Legacy
```

Proxy rewards must never receive `Zelf gevonden`.

- [ ] **Step 2: Implement event writes for new rewards**

Every server-authoritative bug grant writes one acquisition event using the same reward event-ID. Retry must not create a second event.

- [ ] **Step 3: Build honest legacy summaries**

Generate display-only summaries from `sources`, first/last unlock dates and verified observations. Do not create fictional copy-level dates.

- [ ] **Step 4: Add Zelf gevonden filter and grouped cards**

Show exact scanned catalog species, observation count, first/last date and dossier progress. Add `Andere echte vondsten` for out-of-catalog species.

- [ ] **Step 5: Add bug detail timeline**

New acquisitions show event rows. Legacy items show `Eerder verkregen in BugBaas` when exact history is unavailable.

- [ ] **Step 6: Run tests/screenshots and commit**

```bash
npx tsx --test src/services/progression/acquisitionHistoryModel.test.ts src/screens/BugDexScreen*.test.ts src/screens/FieldJournalScreen*.test.ts
npm --prefix firebase/functions test
git add src/services/progression/acquisitionHistoryModel.ts src/services/progression/acquisitionHistoryModel.test.ts src/services/bugDexService.ts src/screens/BugDexScreen.tsx src/screens/FieldJournalScreen.tsx src/services/i18n.tsx firebase/functions/index.js
git commit -m "feat: add BugDex acquisition history and self-found filter"
```

### Task 12: Safe scan proxy and exact identification presentation

**Files:**
- Create: `shared/scan-proxy-groups.json`
- Create: `firebase/functions/scanProxyCore.js`
- Create: `firebase/functions/scanProxyCore.test.js`
- Modify: `server/realBugScan/classification.mjs`
- Modify: `server/realBugScan/classification.test.mjs`
- Modify: `server/realBugScan/handler.mjs`
- Modify: `src/services/realBugScanContract.ts`
- Modify: `src/services/realBugScanService.ts`
- Modify: `src/screens/RealBugScanScreen.tsx`

**Interfaces:**
- Produces separate `identification` and optional `proxyReward` contracts.
- Consumes reviewed taxonomic proxy mappings.

- [ ] **Step 1: Write failing proxy tests**

Cases:

- Exact alias → exact match.
- Approved missing green grasshopper → configured normal green grasshopper proxy.
- Unapproved visual similarity → no proxy.
- Proxy target Epic/Legendary/Mythical → rejected by validator.
- Proxy does not set exact self-found tag.

- [ ] **Step 2: Implement reviewed proxy data and validation**

Every mapping includes source taxon key, target bug ID, relationship type and reviewer note. Validate target exists and rarity is at most Rare.

- [ ] **Step 3: Extend API contract**

Return:

```ts
proxyReward?: {
  bugId: string;
  bugName: string;
  rarity: "Gewoon" | "Zeldzaam";
  relationship: "same_genus" | "approved_group";
}
```

- [ ] **Step 4: Grant proxy idempotently**

Use the scan ID as the event ID. Exact observed species remains in the verified observation; proxy acquisition source is `scan_proxy`.

- [ ] **Step 5: Update result copy**

Display actual species first, then explicitly:

> Deze exacte soort staat nog niet apart in de BugDex. Je krijgt een vergelijkbare BugDex-beloning.

- [ ] **Step 6: Run full scan suite**

```bash
npm run test:real-bug-scan
npm --prefix firebase/functions test
npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add shared/scan-proxy-groups.json firebase/functions/scanProxyCore.js firebase/functions/scanProxyCore.test.js server/realBugScan/classification.mjs server/realBugScan/classification.test.mjs server/realBugScan/handler.mjs src/services/realBugScanContract.ts src/services/realBugScanService.ts src/screens/RealBugScanScreen.tsx
git commit -m "feat: grant safe comparable rewards for missing scan species"
```

### Task 13: Journal root-cause fix and pending sync recovery

**Files:**
- Create: `src/services/fieldJournalErrorModel.ts`
- Create: `src/services/fieldJournalErrorModel.test.ts`
- Modify: `src/services/fieldJournalService.ts`
- Modify: `src/screens/RealBugScanScreen.tsx`
- Modify: `firebase/functions/index.js`
- Modify: `firestore.rules`
- Create: `src/services/pendingFieldJournalService.ts`
- Test: `scripts/qa/bugbaas31-functional.spec.ts`

**Interfaces:**
- Produces classified errors `location_denied|location_inaccurate|auth_expired|receipt_invalid|server_unavailable|network_offline` and retryable pending scan state.
- Consumes existing receipt verification and location normalization.

- [ ] **Step 1: Reproduce with an authenticated test account**

Capture HTTP status, response body, token audience, receipt age and client state for the reported Journal failure. Do not change rules before root cause is identified.

- [ ] **Step 2: Write a failing regression for the proven cause**

The test must reproduce the exact failing boundary: location, auth, receipt or server persistence.

- [ ] **Step 3: Add explicit error classification**

Map server/client errors to one actionable message and action. Never show raw permission text to a child.

- [ ] **Step 4: Add safe pending sync**

A successful scan whose Journal-write fails transiently creates a server- or device-backed pending record. The player may leave the screen; the app retries on reconnect/app-open. The observation and all dependent rewards are still granted at most once.

- [ ] **Step 5: Preserve security**

Keep direct `verifiedObservations` create/update/delete denied. Pending records are owner-readable and server-written only.

- [ ] **Step 6: Test failure matrix**

- Location denied.
- Inaccurate location.
- Token refresh.
- Expired/invalid receipt.
- Offline request.
- Function 5xx.
- App close during request.
- Retry after restart.
- Duplicate retry.

- [ ] **Step 7: Commit**

```bash
git add src/services/fieldJournalErrorModel.ts src/services/fieldJournalErrorModel.test.ts src/services/fieldJournalService.ts src/services/pendingFieldJournalService.ts src/screens/RealBugScanScreen.tsx firebase/functions/index.js firestore.rules scripts/qa/bugbaas31-functional.spec.ts
git commit -m "fix: make verified Journal saves recoverable"
```

### Task 14: Extra Scan Pass and premium-ready BugGem controls

**Files:**
- Create: `src/services/progression/scanPassModel.ts`
- Create: `src/services/progression/scanPassModel.test.ts`
- Modify: `server/realBugScan/firebaseUsageStore.mjs`
- Modify: `server/realBugScan/handler.mjs`
- Modify: `firebase/functions/index.js`
- Modify: `firestore.rules`
- Modify: `tests/firestore/bugbaas31.rules.test.mjs`
- Modify: `src/services/realBugScanService.ts`
- Modify: `src/screens/RealBugScanScreen.tsx`
- Modify: `src/screens/research/ResearchShopPanel.tsx`

**Interfaces:**
- Produces server status `{ freeUsed, freeLimit: 3, extraUsed, extraLimit, passPurchased }`.
- Consumes BugGem economy spend.

- [ ] **Step 1: Write failing quota tests**

Prove base limit 3, purchased limit 6, max one pass/day, rejected scans do not consume and Amsterdam midnight resets both counters.

- [ ] **Step 2: Implement atomic pass purchase**

Spend exactly 60 Gems and create server-written `scanPasses/{dayId}` in one transaction. Retry returns the existing pass without charging again. De eigenaar mag het pasdocument lezen, maar nooit zelf schrijven.

- [ ] **Step 3: Update scan reservation**

`firebaseUsageStore.mjs` leest zowel `realBugScanServerUsage/{dayId}` als het owner-readable `scanPasses/{dayId}` met hetzelfde Firebase-token. Reserve against free capacity first, then extra capacity. Refund the exact bucket on inconclusive/rejected result. Firestore Rules berekenen onafhankelijk dezelfde limiet: maximaal 3 zonder pas en maximaal 6 wanneer het server-written pasdocument voor die Amsterdamse dag bestaat. De client kan de limiet dus niet zelf verhogen.

- [ ] **Step 4: Add clear UI**

Show remaining free and extra attempts. At the base limit, offer the pass only when not already purchased and enough Gems exist.

- [ ] **Step 5: Keep euro purchases disabled**

No store SDK, euro button or fake checkout in 3.1.0. Add an explicit feature flag defaulting false for future commerce.

- [ ] **Step 6: Run scan/economy tests and commit**

```bash
npm run test:real-bug-scan
npm --prefix firebase/functions test
npx tsx --test src/services/progression/scanPassModel.test.ts
git add src/services/progression/scanPassModel.ts src/services/progression/scanPassModel.test.ts server/realBugScan/firebaseUsageStore.mjs server/realBugScan/handler.mjs firebase/functions/index.js firestore.rules tests/firestore/bugbaas31.rules.test.mjs src/services/realBugScanService.ts src/screens/RealBugScanScreen.tsx src/screens/research/ResearchShopPanel.tsx
git commit -m "feat: add bounded BugGem scan passes"
```

### Task 15: Migration model, preview and veteran handling

**Files:**
- Create: `src/services/progression/migrationModel.ts`
- Create: `src/services/progression/migrationModel.test.ts`
- Create: `firebase/functions/migrationCore.js`
- Create: `firebase/functions/migrationCore.test.js`
- Create: `scripts/preview_bugbaas_31_migration.mjs`
- Modify: `firebase/functions/index.js`
- Modify: `src/services/researchTargetService.ts`

**Interfaces:**
- Produces deterministic `MigrationPreview` and idempotent `applyBugBaas31Migration`.
- Consumes user, inventory, unlocks, mastery, trades, Museum, legacy research and economy paths.

- [ ] **Step 1: Write migration fixtures**

Fixtures:

1. New player.
2. Normal player.
3. Veteran 300+ species.
4. Many duplicates.
5. Many Mythicals.
6. Open trade.
7. Active old research.
8. Completed unclaimed old research.
9. Count-zero/inconsistent legacy records.

- [ ] **Step 2: Write failing invariants**

Assert:

- `lifetimeXp === old totalPoints` at migration start.
- No inventory count decreases.
- No mastery/title/character/trade/Museum data changes.
- Veteran RP matches exact bracket.
- Migration event cannot apply twice.
- Open trade reservations remain unavailable for duplicate conversion.
- Legacy research target/progress/claimability persists.

- [ ] **Step 3: Implement read-only preview script**

The script reads approved accounts, writes no Firebase data and outputs aggregate distributions plus per-test-account JSON without emails or secrets.

- [ ] **Step 4: Add veteran Legendary/Mythical tracks**

Create free `veteran` contracts for owned premium bugs. Claim gives prestige receipt/cosmetic status, not another first copy.

- [ ] **Step 5: Implement transactionally idempotent migration**

Use migration document ID `bugbaas-3-1`. On retry, return existing results.

- [ ] **Step 6: Run dry-run and review outliers**

Stop rollout when any account has negative values, impossible copycount, missing target or an RP grant outside the specified bracket.

- [ ] **Step 7: Commit**

```bash
git add src/services/progression/migrationModel.ts src/services/progression/migrationModel.test.ts firebase/functions/migrationCore.js firebase/functions/migrationCore.test.js firebase/functions/index.js scripts/preview_bugbaas_31_migration.mjs src/services/researchTargetService.ts
git commit -m "feat: add safe BugBaas 3.1 migration"
```

### Task 16: Migration onboarding, account levels and Training stars

**Files:**
- Create: `src/components/BugBaas31MigrationModal.tsx`
- Create: `src/components/BugBaas31MigrationModal.structure.test.ts`
- Create: `src/components/TrainingStars.tsx`
- Create: `src/components/TrainingStars.test.ts`
- Modify: `src/screens/ProfileScreen.tsx`
- Modify: `src/screens/BugDexScreen.tsx`
- Modify: `src/components/BuddyOverlay.tsx`
- Modify: `src/screens/BugSmashDuelScreen.tsx`
- Modify: `src/screens/MuseumScreen.tsx`
- Modify: `App.tsx`
- Modify: `src/services/i18n.tsx`

**Interfaces:**
- Produces four-step onboarding driven only by server migration receipt.
- Consumes economy/migration status.

- [ ] **Step 1: Write failing copy/structure tests**

Require screens:

1. XP behouden.
2. Collectie behouden.
3. Duplicates beschikbaar voor onderzoek, niet automatisch gebruikt.
4. Upgrades vervangen door Onderzoekscentrum.

- [ ] **Step 2: Write failing Training-star tests**

Assert exact mappings for mastery levels 1, 4, 5, 8, 9, 12, 13, 16, 17 and 20. Structuretests must fail while active Profile, BugDex, Buddy, Play-squad and Museum surfaces still render raw `LV.x` as their primary child-facing label.

- [ ] **Step 3: Implement exact migration receipt**

Show old points, lifetime XP, new level, veteran RP and duplicate preview. Never show a value calculated only on the client.

- [ ] **Step 4: Update Profile and all active mastery surfaces**

Display level, lifetime XP and progress to next level. Explain `XP kun je niet uitgeven`. Voeg één gedeeld `TrainingStars`-component toe met mapping 1–4=★, 5–8=★★, 9–12=★★★, 13–16=★★★★ en 17–20=★★★★★. Vervang op actieve player-facing surfaces de ruwe `LV.x`/mastery-XP-weergave door `Training x/5` en sterren in Profile, BugDex-kaarten/detail, Buddy, Play-squad en Museum. Onderliggende mastery-levels, skillgrenzen, sortering en serverdata blijven ongewijzigd en mogen in een geavanceerd detail voor volwassenen beschikbaar blijven.

- [ ] **Step 5: Run focused tests and screenshot states**

```bash
npx tsx --test src/components/TrainingStars.test.ts src/components/BugBaas31MigrationModal.structure.test.ts src/screens/BugDexScreen.structure.test.ts src/components/BuddyOverlay.structure.test.ts src/screens/BugSmashDuelScreen.structure.test.ts
npm run typecheck
```

Capture new player, normal migrated player, veteran with many Mythicals and each active Training-star surface at all phone/tablet sizes.

- [ ] **Step 6: Commit**

```bash
git add App.tsx src/components/BugBaas31MigrationModal.tsx src/components/BugBaas31MigrationModal.structure.test.ts src/components/TrainingStars.tsx src/components/TrainingStars.test.ts src/screens/ProfileScreen.tsx src/screens/BugDexScreen.tsx src/components/BuddyOverlay.tsx src/screens/BugSmashDuelScreen.tsx src/screens/MuseumScreen.tsx src/services/i18n.tsx
git commit -m "feat: explain BugBaas 3.1 migration and levels"
```

### Task 17: Buddy bug picker regression fix

**Files:**
- Create: `src/components/BuddyPickerModal.tsx`
- Create: `src/components/BuddyPickerModal.test.ts`
- Modify: `src/components/BuddyOverlay.tsx`
- Modify: `src/components/BuddyOverlay.structure.test.ts`
- Modify: `src/services/bugBuddyService.ts`

**Interfaces:**
- Produces `selectBuddyBug(user, bugId)` and owned-bug picker.
- Consumes inventory and existing owner-only Buddy state.

- [ ] **Step 1: Write a failing test proving no picker exists**

Require visible `Kies een andere Buddy` and an `onSelectBug` path. Current source must fail.

- [ ] **Step 2: Implement picker**

Show current Buddy, active squad first, then all owned bugs with search and rarity filter.

- [ ] **Step 3: Enforce task safety**

Block switching while an active expedition exists. A finished unclaimed expedition remains attached to the original Buddy until claimed.

- [ ] **Step 4: Persist and reload**

Use existing Buddy state rule and fields. Do not widen Firestore permissions.

- [ ] **Step 5: Test and screenshot**

Owned selection, non-owned rejection, app restart, active-task block, old missing Buddy fallback, phone/tablet layout.

- [ ] **Step 6: Commit**

```bash
git add src/components/BuddyPickerModal.tsx src/components/BuddyPickerModal.test.ts src/components/BuddyOverlay.tsx src/components/BuddyOverlay.structure.test.ts src/services/bugBuddyService.ts
git commit -m "fix: restore selectable Bug Buddy"
```

### Task 18: Tap Duel density and safe playfield regression fix

**Files:**
- Create: `src/services/tapDuelLayoutModel.ts`
- Create: `src/services/tapDuelLayoutModel.test.ts`
- Modify: `src/services/bugSmashDuelService.ts`
- Modify: `src/screens/BugSmashDuelScreen.tsx`
- Modify: `src/screens/BugSmashDuelScreen.structure.test.ts`
- Test: `scripts/qa/bugbaas31-functional.spec.ts`

**Interfaces:**
- Produces deterministic safe target coordinates within measured playfield bounds.
- Consumes seed, target index, rarity, viewport and HUD/footer measurements.

- [ ] **Step 1: Write failing layout property tests**

For at least 10.000 generated targets over all required viewports, assert the full hitbox does not intersect HUD, footer, safe-area margin or screen edge.

- [ ] **Step 2: Write deterministic density tests**

Set normal Tap Duel count to 68, duration 30.000 ms and maximum visible 10. Same seed must produce same IDs, timing and normalized positions on both clients.

- [ ] **Step 3: Split layout into real zones**

Render HUD as a fixed sibling above the playfield rather than an absolute overlay sharing target coordinates. Render footer as a sibling below the playfield.

- [ ] **Step 4: Preserve scoring and multi-tap rarity**

Do not change score values or required taps unless playtest evidence separately approves it.

- [ ] **Step 5: Browser interaction test**

Automatically tap targets near every edge. Assert every visible target receives taps and no HUD element captures them.

- [ ] **Step 6: Performance check**

Measure frame pacing and input responsiveness on small Android emulator and one physical Android device. Reject the change if target count causes sustained jank or missed input relative to baseline.

- [ ] **Step 7: Commit**

```bash
git add src/services/tapDuelLayoutModel.ts src/services/tapDuelLayoutModel.test.ts src/services/bugSmashDuelService.ts src/screens/BugSmashDuelScreen.tsx src/screens/BugSmashDuelScreen.structure.test.ts scripts/qa/bugbaas31-functional.spec.ts
git commit -m "fix: keep denser Tap Duel targets fully tappable"
```

### Task 19: World research summary and movement `Vandaag x/10`

**Files:**
- Modify: `src/screens/WorldScreen.tsx`
- Modify: `src/screens/world/ResearchProgressCard.tsx`
- Modify: `src/screens/world/MovementRadarCard.tsx`
- Modify: `src/screens/world/WorldTodayModel.ts`
- Modify: `src/screens/world/WorldTodayModel.test.ts`
- Modify: `android/app/src/main/java/nl/cimpro/bugbaas/MovementRadarNative.kt`
- Modify: `android/app/src/main/java/nl/cimpro/bugbaas/BugBaasNativeModule.kt`
- Modify: `android/app/src/main/java/nl/cimpro/bugbaas/BugRadarWidgetProvider.kt`
- Modify: `android/app/src/main/res/layout/bug_radar_widget.xml`
- Modify: `android/app/src/main/res/layout/bug_radar_widget_compact.xml`
- Modify: `src/services/i18n.tsx`

**Interfaces:**
- Produces compact active research action and server-confirmed claim badge.
- Consumes `MovementRadarProgress.awardedToday/maxRewards` and active Research Contract.

- [ ] **Step 1: Write failing badge tests**

Require `Vandaag 0/10`, `Vandaag 3/10`, `Vandaag 10/10`. Claimable but unclaimed rewards do not increment `awardedToday`.

- [ ] **Step 2: Add compact top-right badge**

Keep it visible without increasing card height materially. Animate only the numeric change after confirmed claim.

- [ ] **Step 3: Synchronize app and widget**

Both surfaces read the same native/server progress and cannot increment independently.

- [ ] **Step 4: Replace World target picker**

World shows only current goal, progress and `Open onderzoek`. Target selection/shop remain in Research Center.

- [ ] **Step 5: Test reset boundaries**

Amsterdam midnight, app restart, two devices, widget claim, failed claim, queued reward and max 10.

- [ ] **Step 6: Screenshot and commit**

```bash
npx tsx --test src/screens/world/WorldTodayModel.test.ts src/screens/WorldScreen.structure.test.ts
git add src/screens/WorldScreen.tsx src/screens/world/ResearchProgressCard.tsx src/screens/world/MovementRadarCard.tsx src/screens/world/WorldTodayModel.ts src/screens/world/WorldTodayModel.test.ts src/services/i18n.tsx android/app/src/main/java/nl/cimpro/bugbaas/MovementRadarNative.kt android/app/src/main/java/nl/cimpro/bugbaas/BugBaasNativeModule.kt android/app/src/main/java/nl/cimpro/bugbaas/BugRadarWidgetProvider.kt android/app/src/main/res/layout/bug_radar_widget.xml android/app/src/main/res/layout/bug_radar_widget_compact.xml
git commit -m "feat: clarify daily movement and active research"
```

### Task 20: New research visuals and asset validation

**Files:**
- Create: text-free assets under `assets/generated/bugbaas-3.1/`
- Create: `src/services/researchArt.ts`
- Create: `scripts/bugbaas31ResearchAssets.test.mjs`
- Create: `docs/visual/bugbaas-3.1-research-assets.md`

**Interfaces:**
- Produces bundled lab, research machine, RP, Gem, scan pass, habitat lure and silhouette assets.
- Consumes existing palette/style guide.

- [ ] **Step 1: Define asset sheet before generation**

Document dimensions, transparent/opaque requirement, intended component, mobile crop and fallback. Required assets:

- Research Lab room/hero.
- Research machine.
- Onderzoekspunten icon.
- BugGem icon.
- Extra Scanpas.
- Five habitat lures.
- Generic locked Legendary/Mythical research silhouettes.

- [ ] **Step 2: Generate and review each asset separately**

Reject baked text, checkerboards, wrong species, excessive glow, weak silhouette or unreadable 48 px icon.

- [ ] **Step 3: Validate files**

Implement `scripts/bugbaas31ResearchAssets.test.mjs` and check existence, dimensions, alpha, file size, WebP validity, transparent-corner requirements for icons, required opaque hero crops and no duplicate unintended mapping.

- [ ] **Step 4: Integrate with semantic accessibility labels**

Images remain decorative where adjacent text communicates meaning. Currency icons never replace numeric/text labels.

- [ ] **Step 5: Capture contact sheet and in-app screenshots**

Review assets both isolated and inside phone/tablet screens. Run:

```bash
node --test scripts/bugbaas31ResearchAssets.test.mjs
npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add assets/generated/bugbaas-3.1 src/services/researchArt.ts scripts/bugbaas31ResearchAssets.test.mjs docs/visual/bugbaas-3.1-research-assets.md
git commit -m "feat: add BugBaas 3.1 research artwork"
```

### Task 21: Full functional Playwright suite and neighboring regressions

**Files:**
- Create: `scripts/qa/bugbaas31-functional.spec.ts`
- Create: `scripts/qa/bugbaas31-visual.spec.ts`
- Create: `scripts/qa/bugbaas31-fixtures.ts`
- Modify: `playwright.config.ts`
- Modify: `docs/reviews/bugbaas-3.1-visual-qa.md`

**Interfaces:**
- Produces screenshots, videos/traces on failure and `output/bugbaas-3.1-qa/report.json`.
- Consumes test accounts and local/emulated backend.

- [ ] **Step 1: Define test-account fixtures**

Use separate accounts for new, normal, veteran, many duplicates, many Mythicals, open trade, active legacy research, active Buddy task and pending Journal sync.

- [ ] **Step 2: Implement core end-to-end flows**

- Receive new bug.
- Receive duplicate, save it.
- Receive duplicate, research it.
- Batch research with exclusion.
- Unlock fact.
- Buy shop item.
- Start/complete/claim simple research.
- Legendary guaranteed route.
- Mythical prerequisite lock.
- Zelf gevonden and acquisition tags.
- Migration onboarding.
- Extra scan pass.
- Safe proxy scan result.
- Buddy change.
- Tap Duel edge targets.
- Journal retry.
- Movement x/10.

- [ ] **Step 3: Add neighboring regression flows**

- Trade before/after duplicate conversion.
- Museum placements.
- Squad editing.
- Daily/Weekly missions.
- Campaign rewards.
- Ranked duel with two users.
- All Arcade modes launch and return.
- Profile/title/character access.
- App restart persistence.

- [ ] **Step 4: Add console/network gates**

Fail on unexpected console errors, page errors, unhandled request failures or 4xx/5xx responses from required 3.1 endpoints. Explicitly allow expected 401 tests only in dedicated unauthenticated cases.

- [ ] **Step 5: Produce before/after visual report**

For every required screen and viewport, link before and after screenshots and record PASS/FAIL for clipping, hierarchy, tap target, contrast, motion and child comprehension.

- [ ] **Step 6: Commit**

```bash
git add scripts/qa playwright.config.ts docs/reviews/bugbaas-3.1-visual-qa.md
git commit -m "test: cover BugBaas 3.1 end to end"
```

### Task 22: Android emulator/device QA and performance proof

**Files:**
- Create: `docs/reviews/bugbaas-3.1-android-qa.md`
- Update: `TESTRESULTS.md`

**Interfaces:**
- Produces device evidence, screenshots, UI trees, logcat and performance notes.
- Consumes an internal APK built only after explicit owner approval for a local test build.

- [ ] **Step 1: Run small phone emulator**

Validate 360×800-equivalent layout, camera permission states, location permission, Journal retry, duplicate animation, Research Center and Tap Duel.

- [ ] **Step 2: Run tablet emulator**

Validate 768×1024-equivalent layout, no stretched cards, bounded grids and Tap Duel safe area.

- [ ] **Step 3: Run one physical Android device**

Validate camera, location, Health Connect/movement, widget sync, touch latency, sound and app background/restore.

- [ ] **Step 4: Capture performance evidence**

Use `gfxinfo`/Perfetto or equivalent for Tap Duel and reward animations. Compare to the pre-3.1 baseline and record missed frames/input issues rather than claiming smoothness from code inspection.

- [ ] **Step 5: Record permissions**

Confirm required camera/location permissions remain, and microphone, overlay and legacy storage permissions remain absent.

- [ ] **Step 6: Commit QA report**

```bash
git add docs/reviews/bugbaas-3.1-android-qa.md TESTRESULTS.md
git commit -m "docs: record BugBaas 3.1 Android QA"
```

### Task 23: Security, concurrency and migration release rehearsal

**Files:**
- Modify: `tests/firestore/bugbaas31.rules.test.mjs`
- Create: `scripts/qa/bugbaas31-concurrency.mjs`
- Create: `docs/reviews/bugbaas-3.1-migration-rehearsal.md`
- Update: `TESTRESULTS.md`

**Interfaces:**
- Produces proof for double-submit, two-device and rollback conditions.
- Consumes emulator/test-project data only.

- [ ] **Step 1: Run two-device races**

Race duplicate research, shop purchase, research claim, scan pass purchase, migration and Journal retry. Assert one authoritative result and no negative/inconsistent state.

- [ ] **Step 2: Run permissions matrix**

Owner read, other-user denial, client-write denial and server-write success for every new path. Re-run existing trade, Buddy, Museum and observation rule tests.

- [ ] **Step 3: Rehearse migration on a sanitized copy**

Run preview, inspect outliers, apply migration once, re-run, compare all protected fields and simulate rollback to the 3.0 client while additive data remains.

- [ ] **Step 4: Verify old-client behavior**

Old client may ignore new data but must not lose inventory or crash. If old combine endpoints remain temporarily, verify they cannot corrupt 3.1 research reservations.

- [ ] **Step 5: Document pass/fail and commit**

```bash
git add tests/firestore/bugbaas31.rules.test.mjs scripts/qa/bugbaas31-concurrency.mjs docs/reviews/bugbaas-3.1-migration-rehearsal.md TESTRESULTS.md
git commit -m "test: rehearse BugBaas 3.1 security and migration"
```

### Task 24: Documentation, help and child comprehension test

**Files:**
- Modify: `src/components/HelpTourOverlay.tsx`
- Modify: `src/components/HelpTourOverlayModel.ts`
- Modify: `src/services/i18n.tsx`
- Modify: `README.md`
- Modify: `STATUS.md`
- Modify: `DECISIONS.md`
- Modify: `CHANGELOG.md`
- Modify: `TESTRESULTS.md`
- Modify: `3.0_FEATURE_STATUS.md`

**Interfaces:**
- Produces final help copy and traceable completion status.
- Consumes approved product terms and test evidence.

- [ ] **Step 1: Replace outdated help routes**

Help explains only XP, Onderzoekspunten, BugGems, duplicates, research and Zelf gevonden. It no longer teaches combining/upgrading.

- [ ] **Step 2: Run comprehension review**

Use at least five testers unfamiliar with the rework, preferably including younger users/parents. Ask them to answer the five product questions without coaching. Record misunderstood words/actions and revise copy.

- [ ] **Step 3: Update decisions and status honestly**

Mark every subsystem `complete`, `partial`, `deferred` or `not built`, with proof links. Do not write `complete in source` as equivalent to runtime-complete.

- [ ] **Step 4: Run localization checks**

No hardcoded visible Dutch/English/French copy in new shared UI. Dynamic species/user names remain untouched.

- [ ] **Step 5: Commit**

```bash
git add src/components/HelpTourOverlay.tsx src/components/HelpTourOverlayModel.ts src/services/i18n.tsx README.md STATUS.md DECISIONS.md CHANGELOG.md TESTRESULTS.md 3.0_FEATURE_STATUS.md
git commit -m "docs: explain and record BugBaas 3.1"
```

### Task 25: Final verification and explicit release preparation

**Files:**
- Modify only after approval: `package.json`, `package-lock.json`, `app.json`, `android/app/build.gradle`
- Create: `docs/reviews/bugbaas-3.1-release-readiness.md`

**Interfaces:**
- Produces a release candidate, not an automatic deployment.
- Consumes all prior QA reports.

- [ ] **Step 1: Run complete verification**

```bash
npm run verify:3.1
npm run test:3.1:functional
npm run test:3.1:visual
npx expo export --platform web --output-dir dist-bugbaas-3.1-check --clear
git diff --check
```

Expected: all green, no unexpected console/network errors and approved screenshot diffs.

- [ ] **Step 2: Verify coverage matrix**

Every requirement in section 2 maps to an implemented task, automated test and where relevant screenshot/device proof.

- [ ] **Step 3: Check release blockers**

Block release for any of:

- Migration outlier.
- Negative or duplicate currency event.
- Broken Journal save/retry.
- Buddy selection regression.
- Tap Duel overlap or missed edge taps.
- Proxy mislabelled as exact self-found.
- Direct client write to server-only path.
- Missing small-phone/tablet screenshots.
- Premium/euro purchase visible without validated commerce.

- [ ] **Step 4: Prepare version only after explicit approval**

Set versionName/package/app version to `3.1.0` and Android versionCode to `317`. Build output does not imply permission to publish.

- [ ] **Step 5: Produce release-readiness report**

Record exact test counts, commands, screenshots, APK metadata if locally built, signing verification, known limitations and explicit untested items.

- [ ] **Step 6: Commit release metadata**

```bash
git add package.json package-lock.json app.json android/app/build.gradle docs/reviews/bugbaas-3.1-release-readiness.md
git commit -m "release: prepare BugBaas 3.1.0"
```

No Firebase deploy, Vercel promotion, APK distribution or store upload occurs without a separate explicit owner instruction.

---

# 5. Required screenshot matrix

Every row must have before/after evidence where a before-state exists.

| Flow/state | 360×800 | 390×844 | 430×932 | 768×1024 | 1440×900 |
|---|---:|---:|---:|---:|---:|
| World + `Vandaag x/10` | ✓ | ✓ | ✓ | ✓ | ✓ |
| World active research | ✓ | ✓ | ✓ | ✓ | ✓ |
| Research Center empty/active | ✓ | ✓ | ✓ | ✓ | ✓ |
| Duplicate preview | ✓ | ✓ | ✓ | ✓ | ✓ |
| Duplicate animation/fact | ✓ | ✓ | ✓ | ✓ | ✓ |
| Batch duplicate receipt | ✓ | ✓ | ✓ | ✓ | ✓ |
| Research target picker | ✓ | ✓ | ✓ | ✓ | ✓ |
| Shop and purchase confirm | ✓ | ✓ | ✓ | ✓ | ✓ |
| Legendary research | ✓ | ✓ | ✓ | ✓ | ✓ |
| Mythical research locked/active | ✓ | ✓ | ✓ | ✓ | ✓ |
| Zelf gevonden | ✓ | ✓ | ✓ | ✓ | ✓ |
| Acquisition timeline/tags | ✓ | ✓ | ✓ | ✓ | ✓ |
| Scan exact/proxy/no-proxy | ✓ | ✓ | ✓ | ✓ | ✓ |
| Scan pass/limit | ✓ | ✓ | ✓ | ✓ | ✓ |
| Journal success/error/pending | ✓ | ✓ | ✓ | ✓ | ✓ |
| Buddy picker/blocked task | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tap Duel running/edges | ✓ | ✓ | ✓ | ✓ | ✓ |
| Migration normal/veteran | ✓ | ✓ | ✓ | ✓ | ✓ |
| Profile XP/level | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reduced motion reward | ✓ | ✓ | ✓ | ✓ | ✓ |

Visual PASS requires:

- Geen tekstafsnijding of horizontale overflow.
- Geen primaire actie onder BottomNav/safe area.
- Eén duidelijke primaire actie per modal/panel.
- RP- en Gem-iconen zijn niet te verwarren.
- Prijs, saldo na aankoop en ontvangen effect zijn zichtbaar.
- Volledige tappable zone blijft in beeld.
- Geen dubbele/overlappende rewardmodals.
- Contrast en tekstgrootte zijn leesbaar.
- Animatie eindigt in een stabiele bruikbare state.

---

# 6. Required functional test matrix

| Gebied | Minimaal bewijs |
|---|---|
| XP | 1:1 migratie, append-only, levels, grandfathering |
| RP | alle raritywaarden, saldo, spend, idempotency, concurrency |
| Gems | gratis grants, scanpas, geen euroflow, geen negatief saldo |
| Duplicates | eerste copy, trades, locks, batch, facts, retry |
| Research | start, evidence, no-scan path, claim, one active, veteran route |
| Shop | vaste prijzen, no rarity boost, charges, no stacking |
| BugDex | Zelf gevonden, tags, legacy honesty, timeline |
| Scan | exact, alias, proxy, no proxy, quota, authenticity, idempotency |
| Journal | auth, receipt, location, offline, pending retry, privacy |
| Buddy | kiezen, opslaan, actieve taak, oude state |
| Tap Duel | 68 targets, deterministic, safe bounds, input, score, FPS |
| Movement | app/widget x/10, queued, failed claim, reset, two devices |
| Migration | fixtures, dry-run, duplicate apply, rollback, old client |
| Neighbor regressions | trade, Museum, squad, missions, Campaign, Ranked, Arcade, Profile |

---

# 7. Rollout and rollback

## 7.1 Feature flags

Use het signed-in-readable, server/developer-written document `appConfig/bugbaas31`, geladen via `src/services/progression/bugbaas31FeatureFlags.ts`, met vaste booleans:

- `bugbaas31EconomyEnabled`
- `bugbaas31ResearchCenterEnabled`
- `bugbaas31MigrationEnabled`
- `bugbaas31ScanProxyEnabled`
- `bugbaas31BugGemsEnabled`
- `bugbaas31CommerceEnabled` — remains false in 3.1.0.

## 7.2 Rollout order

1. Test runner and baseline.
2. Additive backend/rules with flags off.
3. Economy and migration dry-run.
4. Internal test accounts.
5. UI and animations behind flags.
6. Closed Android/web beta after explicit approval.
7. Migration on a small approved cohort.
8. Full migration only after audit.
9. Release candidate.
10. Production only after separate explicit approval.

## 7.3 Rollback

- Turn off 3.1 flags; old 3.0 client continues reading existing inventory and user data.
- Do not delete additive 3.1 data during rollback.
- Economy events remain immutable for later audit.
- A migration already applied is not reversed by subtracting currency or XP; instead disable spend/features and investigate.
- Legacy combine backend remains temporarily available only for compatible old clients until adoption threshold and audit permit removal.

---

# 8. Coverage check against requested scope

| User requirement | Covered by |
|---|---|
| Kindvriendelijk, bestaande functies vervangen | Sections 2, Tasks 10, 16, 24 |
| XP eerlijk, oude spelers hoger zonder power | Sections 2.2/2.8, Tasks 3, 15, 16 |
| RP als currency | Sections 2.3/2.7, Tasks 3–6, 9–10 |
| BugGems en extra scans | Sections 2.4/2.7, Tasks 4, 14 |
| Duplicate popup, animatie, facts en tierwaarde | Sections 2.3/2.5, Tasks 5–7 |
| Legendary/Mythical gegarandeerd | Section 2.6, Tasks 8–10 |
| Bestaande Mythicals zinvol houden | Section 2.8, Tasks 8, 15–16 |
| Zelf gevonden BugDex-sectie | Section 2.9, Task 11 |
| Herkomsttags | Section 2.9, Task 11 |
| Upgrade volledig weg uit nieuwe UI | Tasks 5, 10, 24 |
| Journal-permissie veilig houden/fout oplossen | Task 13 |
| Buddy weer selecteerbaar | Task 17 |
| Meer Tap Duel bugs en geen HUD-overlap | Task 18 |
| Vergelijkbare scanreward | Section 2.10, Task 12 |
| 1,5 km teller `Vandaag x/10` | Task 19 |
| Screenshots en visuele kwaliteit | Tasks 2, 7, 10–22, section 5 |
| Alles regressietesten | Tasks 1, 21–23, section 6 |
| Migratie old → new | Tasks 15–16 |
| Veilige release/rollback | Tasks 23–25, section 7 |

---

# 9. Plan self-review

## Spec coverage

Alle eisen uit de gesprekken van 3 augustus 2026 zijn gekoppeld aan minimaal één implementation task, testgebied en waar relevant screenshot/devicegate. De eerdere hybrid-progressionbeslissing die premium currency verbood en upgrades deels behield, wordt door dit 3.1-plan expliciet vervangen. Bestaande data en beveiligingsbeslissingen blijven behouden.

## Placeholder scan

Dit plan bevat geen open implementatieplaatsaanduidingen. Prijzen, copywaarden, researchkosten, scanlimieten, viewports, paden, taken, testcommando's en releaseversies zijn expliciet vastgelegd.

## Type consistency

Dezelfde namen worden door het plan gebruikt voor `EconomyState`, `EconomyEvent`, `ResearchContract`, `ResearchStep`, `AcquisitionSource`, `lifetimeXp`, `researchPoints`, `bugGems` en de nieuwe Firestore-paden. Legacy `totalPoints` blijft alleen een tijdelijke compatibiliteitsspiegel.

## Known uncertainty requiring measured evidence

- De exacte economie is een startbalans. De migratiepreview en playtests mogen prijzen/opbrengsten alleen via een apart expliciet balancebesluit aanpassen.
- De actuele Journal-foutoorzaak moet met een authentieke foutrespons worden bewezen; regels verruimen is uitgesloten.
- 68 Tap Duel-targets is de startvariant en moet op echte input/FPS worden vergeleken met 64 en 72 voordat de definitieve waarde wordt vrijgegeven.
- Nieuwe visuele assets zijn nog niet ontworpen of goedgekeurd; Task 20 bevat hun concrete productie- en afkeurproces.

Planstatus: gereed voor review. Er is met dit document geen appcode, Firebase-regel, productieomgeving, APK of deployment gewijzigd.
