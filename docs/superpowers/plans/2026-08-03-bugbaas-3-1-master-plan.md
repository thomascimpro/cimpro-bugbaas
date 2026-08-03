# BugBaas 3.1 Progression, Research & Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BugBaas 3.1 vervangt de onduidelijke upgrade- en puntenstructuur door één kindvriendelijke progression-loop met permanente XP, gratis Onderzoekspunten, gratis verdienbare BugGems zonder actieve euroshop, onderzoekbare duplicates, gegarandeerde Legendary/Mythical-routes en aantoonbaar betrouwbare regressietests.

**Architecture:** De bestaande root-userdocumenten, BugDex-inventory, unlock history, mastery, trades, Museum, scans, oude Research Target en rewardpaden blijven ongewijzigde compatibiliteitsbronnen voor oude APK's. Nieuwe lifetime XP, Onderzoekspunten, BugGems, researchcontracten, herkomst en migratiestatus worden additief in server-authoritative subcollecties toegevoegd. Nieuwe 3.1-XP wordt transactioneel naar zowel de nieuwe lifetime-XP-bron als legacy `totalPoints` geschreven; voortgang uit een oude APK wordt bij iedere 3.1-start monotone bijgehaald zonder ooit data te verlagen. De 3.1-client toont geen oude upgrade-UI meer, maar oude endpoints, velden, regels en data blijven werken. Iedere fase levert zelfstandig testbare software op en mag pas door wanneer unit-, server-, permissie-, oude-client-, visuele en waar nodig device-tests groen zijn.

**Tech Stack:** Expo, React Native, TypeScript, Firebase Authentication, Firestore, Firebase Cloud Functions, Node.js 24, `tsx`, Playwright, bestaande BugBaas assets, Android native movement bridge en bestaande BugScan-server.

**Required execution protocol:** `docs/superpowers/plans/2026-08-03-bugbaas-3-1-single-chat-execution-protocol.md`. Dit protocol bepaalt worktree-isolatie, de daadwerkelijke dependencyvolgorde, statusnotities, task receipts, dubbele-uitvoerpreventie en approval gates voor uitvoering in één chat.

## Global Constraints

- Werk voor implementatie op branch `codex/bugbaas-3.1` in een geïsoleerde native Git-worktree vanaf de goedgekeurde `codex/bugbaas-3.0`-commit. Maak geen gewone mapkopie: de worktree neemt alleen tracked bronbestanden mee en laat de huidige vuile checkout plus niet-getrackte rommel onaangeraakt.
- Voer dit plan in één chat uit via het verplichte execution protocol. Gebruik `docs/superpowers/execution/bugbaas-3.1-status.md` als duurzame statusbron, maximaal één actieve taak en één receipt plus commit per voltooide taak.
- BugBaas 3.1 blijft localhost/intern totdat de eigenaar expliciet toestemming geeft voor Firebase, Vercel, APK of store-publicatie.
- Behoud alle bestaande BugDex-copies, unlock history, mastery, squads, trades, Museumplaatsingen, badges, titels, characters, Daily/Weekly missions en 2.10.19-compatibele data.
- Nieuwe Firestore-paden zijn additief. Geen bestaand veld, documentpad, endpoint, index of toegestane oude-clientwrite wordt in 3.1 verwijderd, hernoemd of strenger gemaakt zonder een bewezen compatibele vervanger.
- Oude APK-versies moeten na de backendwijzigingen kunnen inloggen, profielgegevens wijzigen, XP verdienen, bugs ontvangen, mastery opbouwen, handelen, Museum gebruiken, oud onderzoek voortzetten en oude upgrades uitvoeren zonder crash of permission error.
- Zet geen nieuwe 3.1-only velden op het root-userdocument wanneer een oude APK dat document volledig kan overschrijven. Lifetime XP, RP, Gems en migratiestatus staan daarom in server-written subcollecties; `totalPoints` blijft de legacy rootprojectie.
- Bestaande client-write-regels worden nooit verruimd. Nieuwe paden zijn owner-read/server-write-only tenzij een expliciet bestaand clientcontract anders vereist.
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
- Gebruik bestaande BugArt en rarity-effecten. Nieuwe gegenereerde assets zijn text-free, gebundeld, soort-/functiepassend en volgen minimaal de kwaliteit van de beste huidige BugDex-, Museum- en Legendary/Mythical-presentaties.
- Geen nieuw 3.1-scherm wordt als visueel compleet beschouwd zonder vastgelegde hiërarchie, loading/empty/error/locked/success-states, animatie-eindstaat, reduced-motionvariant en screenshots op alle vereiste viewports.
- Iedere popup toont in kindtaal wat er gebeurt, wat behouden blijft, wat wordt gebruikt en wat wordt ontvangen. Kleur alleen is nooit de enige betekenisdrager.
- Minimaal tappable oppervlak is 44×44 px. Geen belangrijke actie of target mag achter HUD, safe area, BottomNav of footer vallen.
- Ondersteun reduced motion. Animaties mogen geen rewardclaim, navigatie of herstel blokkeren.
- Iedere taak start met een falende test of reproduceerbaar bewijs, eindigt met relevante tests en krijgt een afzonderlijke commit.
- Iedere wijziging aan een gedeeld bestand krijgt een impactlijst met beschermde buurfuncties. Een Firestore Rules- of Functionswijziging krijgt zowel nieuwe allow/deny-tests als regressietests voor de bestaande oude-APK-contracten.
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
→ duplicate later bewaren, ruilen of onderzoeken
→ ontvang een weetje en Onderzoekspunten
→ start een duidelijk onderzoek
→ voltooi stappen
→ ontvang de gekozen bug gegarandeerd
→ train je favoriete bugs en gebruik hun rol in PvE-events
```

Een tienjarige moet na maximaal één minuut kunnen uitleggen:

- XP laat zien hoeveel ik gespeeld heb.
- Onderzoekspunten zijn gratis geld voor onderzoek en hulpmiddelen.
- BugGems zijn speciale munten voor extra scans en uiterlijk.
- Mijn eerste exemplaar blijft veilig.
- `Later beslissen` bewaart een duplicate zodat ik hem later kan ruilen of alsnog onderzoeken.
- Rarity geeft startkracht, Training maakt een bug sterker en de rol vertelt waar hij goed in is.
- Ik koop een onderzoek, niet rechtstreeks een Legendary/Mythical.
- Crown-power en Crown-rangen moet ik verdienen; alleen extra uiterlijk kan met Gems worden gekocht.

## 2.2 XP

- Nieuwe `lifetimeXp` start exact gelijk aan bestaande `totalPoints`.
- XP kan worden toegevoegd maar nooit verwijderd.
- `totalPoints` blijft in 3.1 de legacy/publice compatibiliteitsprojectie voor oude clients en rankings; verwijdering valt buiten dit plan.
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
- Vaste kindvriendelijke Onderzoekerstitels: level 1 `Beginnend onderzoeker`, level 5 `Speurneus`, level 10 `Veldonderzoeker`, level 20 `Bugexpert`, level 30 `Meesteronderzoeker`, level 40 en hoger `BugBaas`.
- De 3.1-titel wordt berekend uit lifetime XP en hoeft niet naar het legacy rootveld `title` geschreven te worden. Dat veld blijft voor oude APK's werken.
- Levels geven geen sterkere bugs, dropkans, researchmultiplier of Ranked-voordeel.
- Bestaande titels, badges, characters en cosmetics worden grandfathered, blijven ontgrendeld/zichtbaar en kunnen niet opnieuw vergrendelen. Een werkelijk bestaande gebruikersselectie wordt behouden; 3.1 introduceert geen nieuw titelselectiesysteem alleen voor legacy rangen.

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

Aanvullende vaste gratis bronnen:

- Eerste gratis eenvoudige veldresearch per Amsterdamse dag: 40 RP en 50 XP via `field_daily:<dayId>`.
- Eerste keer dat een driedelig soortdossier compleet wordt: 50 RP via `dossier_complete:<bugId>`.
- Scans, lopen en spellen geven niet onbeperkt los RP; ze leveren bugs en researchstappen. Zo blijven extra scans een versnelling zonder directe onbeperkte currencyfarm.

Regels:

- Minimaal één copy per soort blijft altijd behouden.
- Minimaal één eerste copy en copies in open trades worden automatisch uitgesloten. In de preview kan de speler soorten uitvinken die hij daarnaast wil bewaren; er komt geen apart permanent lock-systeem.
- Geen automatische conversie bij migratie.
- De server toont eerst een preview en voert daarna exact die preview transactioneel uit.
- Het saldo kan nooit negatief zijn.
- Iedere mutatie krijgt een permanent economy-event met uniek event-ID.

## 2.4 BugGems

3.1.0-bronnen, allemaal eenmalig en idempotent:

- Ieder Onderzoekerslevel dat deelbaar is door 5: 10 BugGems via event-ID `level_milestone:<level>`.
- Eerste Master-status per van de vijf normale Museumvleugels: 15 BugGems via `museum_master:<wingId>`.
- Eerste volledig afgeronde Legendary research: 20 BugGems.
- Eerste volledig afgeronde Mythical research: 40 BugGems.
- Bestaande spelers ontvangen reeds behaalde level-/Museummijlpalen retroactief via dezelfde events.
- Event-Gems en euro-aankopen zijn niet actief in 3.1.0 en vereisen een later apart catalogus-/commercebesluit.

3.1.0-uitgaven:

- Extra Scanpas: 60 BugGems voor drie extra geldige scans diezelfde Amsterdamse dag; maximaal één pas per dag.
- Vaste cosmetics zonder power: `researcher_profile_frame` 120 Gems, `bugdex_research_frame` 150 Gems, `museum_research_pedestal` 180 Gems, `research_lab_theme` 200 Gems, `crown_style_aurora` 160 Gems en `crown_style_obsidian` 160 Gems.
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
| Eenvoudig veldonderzoek | Gratis, 1× per Amsterdamse dag | 1 kleine actie | 50 XP + 40 RP |
| Gewone soort | 300 RP | 1 stap | Gekozen soort gegarandeerd |
| Zeldzame soort | 600 RP | 2 stappen | Gekozen soort gegarandeerd |
| Epische soort | 1.500 RP | 3 stappen | Gekozen soort gegarandeerd |
| Legendary | 3.000 RP | 4 hoofdstukken | Gekozen Legendary gegarandeerd |
| Mythical | 12.000 RP | 6 hoofdstukken en voorwaarden | Gekozen Mythical gegarandeerd |

Vaste moeilijkheidsstructuur:

- Gewoon: 1 kleine stap uit ontvangen, 0,5 km lopen, één game of twee duplicates onderzoeken.
- Zeldzaam: 2 verschillende stapcategorieën; nooit tweemaal dezelfde grindactie.
- Episch: 3 verschillende stapcategorieën, waaronder minimaal één collectie-/dossierstap en één speel-/beweegstap.
- Legendary: 4 hoofdstukken: ontvang 5 passende bugs waarvan 3 verschillende; onderzoek 10 passende duplicates; loop 3 km of voltooi 5 spellen volgens het vaste soorttemplate; voltooi één bestaande Campaignfinale. Een passende scan telt als ontvangen bug en kan een collectiestap versnellen.
- Mythical: 6 hoofdstukken: ontvang 15 passende bugs waarvan 6 verschillende; voltooi 3 passende dossiers; loop cumulatief 10 km; voltooi 10 spellen; rond één gekoppelde Legendary- of veteranenresearch af; voltooi de vaste Campaignfinale.
- Soort-/familiekoppelingen en gekozen `walk` versus `play`-templates staan in gecontroleerde catalogusdata, niet in AI-output.

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
| Gewoon soortonderzoek | 300 RP | Start één stap voor de gekozen gewone soort |
| Zeldzaam soortonderzoek | 600 RP | Start twee stappen voor de gekozen zeldzame soort |
| Episch soortonderzoek | 1.500 RP | Start drie stappen voor de gekozen epische soort |
| Legendary onderzoek | 3.000 RP | Start een gekozen Legendary-route |
| Mythical onderzoek | 12.000 RP | Start een Mythical-verhaallijn wanneer voorwaarden zijn behaald |

BugGems:

| Item | Prijs | Exact effect |
|---|---:|---|
| Extra Scanpas | 60 Gems | Drie extra geldige scans vandaag, maximaal één pas per dag |
| Researcher-profielrand | 120 Gems | Permanente profielcosmetic |
| BugDex Research-frame | 150 Gems | Permanente visuele bugkaartcosmetic |
| Museum Research-podium | 180 Gems | Permanent Museum-podium zonder rewardbonus |
| Research Lab-thema | 200 Gems | Permanent Onderzoekscentrum-thema zonder gameplaybonus |
| Aurora Crown-stijl | 160 Gems | Alternatieve paars-blauwe rand en achtergrond voor reeds verdiende Mythische Crown-visuals |
| Obsidian Crown-stijl | 160 Gems | Alternatieve zwart-gouden rand en achtergrond voor reeds verdiende Mythische Crown-visuals |

Lures en radar veranderen nooit de rarity. Boosts kunnen niet stapelen. Functionele RP-items worden na bevestiging direct geactiveerd; er komt geen extra onduidelijke itemrugzak. De speler kiest habitat/doel vóór betaling en ziet resterende charges in Onderzoekscentrum. Cosmetics schrijven alleen een permanente entitlement en veranderen geen stats, Ranked, drops of researchsnelheid. Crown-stijlen zijn alleen bruikbaar wanneer minimaal één bijbehorende Crown-visual eerlijk is verdiend; zij kopen nooit een Crown-rang, trial, battle win of PvE-bonus.

### Verplicht visueel productcontract

Geen product mag koopbaar zijn op basis van alleen tekst of een generiek munticoon.

| Product | Eigen visueel | Preview vóór aankoop | Actieve/eindstate |
|---|---|---|---|
| Habitatlokker | Vijf text-free habitatflesjes voor bos, water, nacht, grasland en stad | Tien voorbeeldrewardkaarten verschuiven zichtbaar naar het gekozen habitat, zonder raritywijziging | Habitatbadge en `x/10 over` in Onderzoekscentrum |
| Soortenradar | Radar met ontbrekende silhouetten | Voor/na-voorbeeld toont dat ontbrekende soorten voorrang krijgen binnen dezelfde rarity | Radarbadge en `x/10 over` |
| Onderzoeksboost | Microscoopenergie/gestempeld onderzoeksblad | Eén voorbeeldactie vult twee researchstappen in plaats van één | `x/3 acties over`; niet-stapelbaar |
| Missiewissel | Twee missiekaarten met wisselpijl | Huidige missie, toegestane gelijkwaardige vervanging en waarschuwing dat geclaimde missies niet kunnen | Directe nieuwe missiekaart |
| Gewoon soortonderzoek | Groene contractmap en gekozen Common silhouette/BugArt | Prijs, één stap en gegarandeerde doelbug | Actief contractpad |
| Zeldzaam soortonderzoek | Blauwe contractmap | Prijs, twee stappen en gegarandeerde doelbug | Actief contractpad |
| Episch soortonderzoek | Paarse contractmap | Prijs, drie stappen en gegarandeerde doelbug | Actief contractpad |
| Legendary onderzoek | Gouden dossiermap, vier hoofdstukzegels en doelbug | Alle voorwaarden, hoofdstukken en `Gegarandeerd` | Gouden actief researchpad/finale |
| Mythical onderzoek | Celestiale dossiermap, zes hoofdstukzegels en doelbug | Alle voorwaarden, hoofdstukken en `Gegarandeerd` | Mythisch actief researchpad/finale |
| Extra Scanpas | Veldticket met camera en drie perforaties | Dagquotum vóór/na: `3 gratis + 3 extra`; exacte eindtijd | Scanheader `extra x/3 gebruikt` |
| Researcher-profielrand | Volledige profielkaartmockup | Live voor/na op eigen avatar en naam | `In gebruik`/`Standaard` op Profile |
| BugDex Research-frame | Volledige BugDex-kaartmockup | Live voor/na rond een eigen gekozen bug | `In gebruik`/`Standaard` in BugDex |
| Museum Research-podium | Podium met neutrale voorbeeldbug | Live voor/na in de echte Museumruimte | Gekozen podium zichtbaar in Museum |
| Research Lab-thema | Alternatieve labachtergrondlagen | Fullscreen voor/na van Onderzoekscentrum | Thema actief, alle knoppen/contrast onveranderd |
| Aurora Crown-stijl | Paars-blauwe Crown-overlay | Preview rond een reeds verdiende Crown visual | Globale Crownstijl `Aurora` of `Standaard` |
| Obsidian Crown-stijl | Zwart-gouden Crown-overlay | Preview rond een reeds verdiende Crown visual | Globale Crownstijl `Obsidian` of `Standaard` |

Effectvolgorde en stacking:

1. De bestaande bron/event bepaalt eerst de basis-rarityroll.
2. Bestaande squad `radar_rarity` en een actieve gratis Bug Lamp mogen alleen volgens hun huidige gezamenlijke cap de rarityroll beïnvloeden; Task 29 bewaart de huidige cap en simuleert de combinatie.
3. Habitatlokker verandert daarna alleen de habitat-/familiegewichten van de reeds bepaalde rarity.
4. Soortenradar geeft daarna binnen diezelfde rarity voorrang aan een nog ontbrekende soort.
5. Onderzoeksboost verandert uitsluitend researchstappen en nooit de bugroll.
6. Dezelfde shop-effectklasse kan niet stapelen of opnieuw worden gekocht zolang charges actief zijn. Bug Lamp is een aparte gratis streakbooster en mag tegelijk actief zijn, maar verhoogt geen shopcharges.

De actieve-effectkaart toont deze volgorde in kindtaal, bijvoorbeeld:

> Bug Lamp: iets meer kans op zeldzaam
>
> Boslokker: vaker bosbugs
>
> Radar: liever een ontbrekende soort

Previewregels:

- De preview gebruikt echte eigen data waar privacyveilig mogelijk; anders een vaste lokale voorbeeldbug/avatar zonder serverwrite.
- `Koop` staat pas actief wanneer art, gelokaliseerde uitleg, prijs, saldo erna, beperking en eindstate aanwezig zijn.
- Functionele preview is een demonstratie en verbruikt niets.
- Cosmetic preview verandert de huidige loadout pas na een bevestigde serveraankoop/equipreceipt.
- Reduced motion toont dezelfde voor/na-informatie zonder draaiende of vliegende effecten.

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
- Afronding geeft een dossierzegel, titel, Museumplaquette of onderzoeksachtergrond en de tag `Volledig onderzocht`; veteranenresearch geeft geen Crown-power en gebruikt niet dezelfde rand/aura als Mythische Crown-progressie.
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

`Zelf gevonden` is een BugDex-filter/actie, geen vierde Collection-tab. Alleen exact geverifieerde catalogusscans krijgen deze tag. De kaarten gebruiken bestaande BugArt plus waarnemingsaantal en eerste/laatste datum; 3.1 introduceert geen nieuwe openbare fotogalerij, foto-uploadcollectie of extra storagepermission. Het Journal blijft de lijst met individuele privéwaarnemingen en exacte GPS blijft niet publiek.

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
- `x/10` telt alleen door de bestaande Android Movement Radar native module bevestigde claims op dat toestel; klaarstaande maar ongeclaimde rewards veranderen de teller niet.
- App en Android-widget lezen dezelfde native dagteller. Health Connect blijft device-private en wordt in 3.1 niet naar een nieuwe Firebase-afstandscollectie gekopieerd.

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
- Kleine shop met live previews voor ieder koopbaar item.
- Crown-stijlen tonen duidelijk `Alleen uiterlijk` en zijn pas bruikbaar na een verdiende Crown-visual.

### Bugdetail en squadkeuze

- Rarity als naam/kleurbadge, geen rarity-sterren.
- Kracht 60–100, Trainingsterren, rol en `Goed in`-uitleg.
- Mythische special en Crown-progressie in maximaal twee korte kaarten.
- Squadkeuze toont eventmatch, totale squadkracht en de concrete rolbijdrage vóór de run.

### PvE-events

- Zwermbeleg en battle-raids tonen doel, pogingen, aanbevolen rollen, persoonlijke reward, communitydoel en squadbijdrage.
- Resultaat toont per gebruikte bug wat Kracht, rol, special, Training en Crown deden.
- Release Boss blijft een geverifieerde-vondstenevent zonder squadpower.

### Profile

- Onderzoekerslevel, lifetime XP en voortgang.
- Geen gameplay-power aan level gekoppeld.

### Buddy

- `Kies een andere Buddy` met eigen-bugkiezer.

### Tap Duel

- 68 targets per 30 seconden, maximaal 10 tegelijk.
- HUD buiten het coordinate-systeem van het speelveld.
- Volledige target-hitbox binnen de veilige zone.

## 2.12 Senior visual-designcontract

### Visuele hoofdregels

- De 3.1-interface voelt als één levend insectenlaboratorium en niet als losse dashboards.
- Bestaande beste BugDex-art, rarity-aura's, Museum-podia en kaartcomposities zijn de kwaliteitsvloer.
- Nieuwe informatie blijft rustig: maximaal drie visuele hiërarchieniveaus per scherm, één dominante CTA en maximaal twee secundaire acties.
- XP gebruikt een gouden ster/leveltaal, Onderzoekspunten gebruiken een groen-turquoise microscoop/flesje en BugGems gebruiken een paars kristal. Ieder saldo toont altijd icoon én tekstlabel.
- Bodytekst is minimaal 12 px op telefoon; alleen compacte metadata/badges mogen 10–11 px zijn. Tappable targets zijn minimaal 44×44 px.
- Nieuwe art bevat geen ingebakken tekst. Alle labels, prijzen en uitleg blijven echte gelokaliseerde UI.
- Decoratieve animatie mag nooit over een knop, teller, bugtarget of tekst heen bewegen.

### Exacte schermplaatsing

| Surface | Plaats en hiërarchie | Wat verdwijnt/vervangt |
|---|---|---|
| World Today | Bestaande hero, daarna compacte `Actief onderzoek`-kaart, daarna Movement Radar, Missions en Buddy | Huidige uitgebreide Research Target-keuze verdwijnt van World |
| Collection | Bestaande tabs `BugDex`, `Museum`, `Journal` blijven | Geen vierde hoofdtab |
| BugDex-dashboard | 2×2 acties: `Onderzoekscentrum`, `Zelf gevonden`, `Mijn team`, `Handelen` | Upgradekaart en dubbele Museumshortcut verdwijnen |
| Onderzoekscentrum | Fullscreen workspace/modal vanuit BugDex; vaste saldoheader, actief onderzoek, duplicates, shop | Vervangt het volledige oude Upgrade-paneel |
| Bugdetail | BugArt, raritybadge, Kracht, Training-sterren, rol/`Goed in`, dossier, herkomst, Mythical special en Crownproef | Ruwe mastery-XP en rarity-sterren zijn niet langer de eerste uitleglaag |
| Scan | Quota boven de camera; na analyse eerst echte identificatie, daarna eventuele BugDex-beloning, daarna Journal-status | Geen samengevoegde onduidelijke resultaatkaart |
| Profile | Onderzoekerslevel en XP-ring bovenaan; RP/Gems worden alleen compact getoond waar ze bruikbaar zijn | Geen indruk dat XP uitgeefbaar is |
| Play/Tap Duel | HUD, echt speelveld en footer zijn afzonderlijke layoutzones | Geen absoluut overlappende HUD; Ranked gebruikt geen Kracht/Crown-multiplier |
| Zwermbeleg/battle-raid | Eerst boss/reward en roladvies, daarna squadpreview, daarna run, daarna bijdrage-receipt | Geen verborgen squadbonus zonder uitleg |
| Shoppreview | Productkaart opent live preview op de echte doelsurface of een duidelijke effectdemonstratie | Geen aankoop op basis van alleen naam en icoon |

### Verplichte popups en visuele staten

| Popup/state | Verplichte inhoud | Visuele behandeling |
|---|---|---|
| Nieuwe soort | Soort, rarity, bron, XP, RP, `Bekijk in BugDex` | Grote BugArt, rarity-aura, familiespecifieke beweging |
| Duplicate ontvangen | `Deze bug had je al`, totaal aantal, RP-waarde, mogelijk weetje, `Onderzoek nu`, `Later beslissen` | Bug staat levend centraal; eerste exemplaar zichtbaar beschermd; `Later beslissen` vermeldt dat later ruilen of onderzoeken mogelijk blijft |
| Duplicate onderzoeken | Exact aantal te gebruiken copies en preview van RP/weetjes | Onderzoeksmachine, scanlicht, puntenvlucht, dossierkaart |
| Batchonderzoek | Aantal gebruikte duplicates, automatisch beschermde tradecopies, uitgevinkte soorten, totaal RP en nieuwe weetjes | Eén samenvatting; nooit tientallen modals |
| Onderzoek kopen | Kosten, saldo erna, aantal stappen/hoofdstukken, gegarandeerde eindbug | Contractdossier met silhouet; geen misleidende directe bugkoop |
| Onderzoeksstap compleet | Welke stap klaar is en wat nu volgt | Stempel en verlichte padlijn |
| Legendary-finale | Gekozen Legendary en voltooide hoofdstukken | Gouden reveal, parallax, aura, maximaal 2,2 s |
| Mythical-finale | Gekozen Mythical en verhaalafronding | Paarse/celestiale reveal, maximaal 2,8 s |
| Shoppreview | Icoon/art, effect, duur/charges, beperkingen, prijs en live surfacepreview | Functionele items demonstreren effect; cosmetics tonen voor/na |
| Shopaankoop | Item, prijs, saldo erna, exacte duur/charges, `Gebruik nu` waar passend | Item tilt op en vliegt naar voorraad |
| Crown-rang behaald | Nieuwe rang, verdiende PvE-power en uitleg dat power niet gekocht is | Bestaande halo/ring, korte rank-reveal, stabiele Crownproef-CTA |
| Crownproef voltooid | Bug, rang en gratis rand/achtergrond/effect | Crownlaag bouwt rondom de bestaande BugArt op |
| PvE squadpreview/resultaat | Totale Kracht, aanbevolen rollen, roleffects, special/Crown en bijdrage per bug | Drie bugkaarten reageren subtiel; geen effect over knoppen/score |
| Level omhoog | Nieuw level, status/cosmetic, geen powerclaim | Korte XP-ringpulse, maximaal 1,2 s |
| Migratie | XP behouden, collectie behouden, duplicates beschikbaar, Upgrade vervangen | Vier rustige kaarten met echte serverwaarden; eenmalig |
| Latere oude-APK-sync | Alleen daadwerkelijk nieuwe XP/RP/soorten/staffelverschil | Compact `Voortgang bijgewerkt`-overzicht; geen popup wanneer delta nul is |
| Journal pending/error | Oorzaak in kindtaal en één duidelijke herstelactie | Geen rarity-feest of rewardclaim vóór veilige opslag |

### Bugbewegingspresets

Iedere catalogussoort krijgt via familie/type één preset, niet 883 losse animaties:

- `flutter`: vlinders, motten en lichte vliegers.
- `hover`: bijen, vliegen, libellen en zweefvliegen.
- `crawl`: kevers, wantsen, rupsen en traag lopende soorten.
- `skitter`: spinnen, mieren en snelle bodembugs.
- `hop`: sprinkhanen, krekels en springende soorten.
- `idle`: veilige subtiele adem-/antennebeweging als fallback.

De preset bepaalt alleen presentatie en nooit gameplayhitboxes of rewardlogica.

### Motiontiming en toegankelijkheid

- Scherm/paneeltransities: 180–260 ms.
- Kleine saldo-/stapfeedback: 300–600 ms.
- Duplicate-onderzoek vanaf bevestiging tot stabiele receipt: maximaal 1,8 s.
- Legendary/Mythical-reveal is na 600 ms overslaand en eindigt altijd in dezelfde claimbare state.
- Reduced motion gebruikt crossfades van 150–220 ms, geen rotatie, camerashake, parallax of vliegende currency.
- Lage Android-profielen gebruiken maximaal 12 particles, geen zware blur en geen permanente glowloops.
- Haptiek alleen bij bevestigde serverresultaten: duplicate gebruikt, feit onthuld, contract voltooid en Legendary/Mythical verkregen.

### Nieuwe visuele assets

Verplicht en afzonderlijk te keuren:

- Research Lab hero/room.
- Onderzoeksmachine met losse voor-/achterlagen voor animatie.
- RP-, BugGem- en XP-iconenset op 24, 32, 48 en 96 px.
- Scanpas, vijf Habitatlokker-varianten, Soortenradar, Onderzoeksboost en Missiewissel; ieder met locked/available/active-state.
- Researchcontractmap en hoofdstukstempels.
- Legendary/Mythical silhouettes zonder verkeerde soortdetails.
- `Zelf gevonden`, `Onderzocht`, `Legacy` en `Oude upgrade`-badges.
- Veteranendossierzegel, onderzoeksachtergrond en Museumplaquette zonder Crown-overlap.
- Crowned/Elite/Master/Legend-randlagen, achtergronden, halo's en Kroonzaal-hologram.
- Aurora- en Obsidian-Crownstijl als losse, text-free overlays.
- Role-iconen en roleffectvisuals voor Aanval, Snelheid, Schild, Chaos en Support.
- Shoppreviewmockups voor profielrand, BugDex-frame, Museumpodium, Labthema en Crown-stijlen op de echte doelsurface.
- Lege/error/locked illustraties voor Onderzoekscentrum.

Elke asset krijgt species/functionele review, alpha-/checkerboardcontrole, kleine-icoonleesbaarheid, telefoon-/tabletcrop en in-app screenshotgoedkeuring.

## 2.13 Firebase- en oude-APK-compatibiliteitscontract

### Additieve opslag

- Het bestaande rootpad `users/{uid}` behoudt exact de huidige velden en schrijfcontracten.
- Er wordt geen `lifetimeXp`, `researchPoints`, `bugGems` of migratieveld aan het rootdocument toegevoegd zolang oude APK's dit document volledig kunnen overschrijven.
- `users/{uid}.totalPoints` blijft de legacy/publice XP-projectie en leaderboardbron voor oude clients.
- Nieuwe lifetime XP, RP en Gems staan in `users/{uid}/economy/state`, owner-readable en server-written.
- Inventory, unlocks, mastery, Buddy, trades, Museum, Journal en oude Research Target blijven op hun bestaande paden; 3.1 leest ze live in plaats van ze te kopiëren.

### XP-synchronisatie

Nieuwe 3.1-XP-grant gebeurt in één servertransactie:

```text
economy/state.lifetimeXp += grant
users/{uid}.totalPoints += grant
immutable economyEvent
```

Na de eerste 3.1-migratie bewaakt een server `users/{uid}`-onUpdate-trigger iedere legacy `totalPoints`-wijziging. Stijgt `totalPoints` boven lifetime XP, dan verhoogt de trigger lifetime XP met een idempotent event op basis van het Firestore-event-ID. Daalt `totalPoints` onder lifetime XP, dan herstelt de trigger alleen `totalPoints` naar de permanente floor. Een door de trigger veroorzaakte herstelupdate ziet gelijke waarden en stopt, zodat geen lus ontstaat.

Bij eerste 3.1-open en iedere app-foreground voert de client daarnaast een goedkope monotone herstelreconciliatie uit:

```text
floor = max(economy.lifetimeXp, users/{uid}.totalPoints)
economy.lifetimeXp = floor
users/{uid}.totalPoints = floor
```

Daardoor:

- telt XP die na installatie nog met een oude APK is verdiend direct server-side en bij een gemiste trigger alsnog op foreground mee;
- kan een oud verwijder-/herberekenpad lifetime XP niet verlagen en wordt de legacy projectie automatisch hersteld;
- ziet een oude APK ook XP die via 3.1 is verdiend;
- blijven bestaande rankings werken.

### Eerste migratie en latere oude-APK-voortgang

De migratie is lazy: pas wanneer een speler 3.1 opent wordt de actuele oude staat als uitgangspunt gebruikt. Het migratiedocument bewaart:

- `appliedAt`.
- `lastReconciledAt`.
- `baselineOwnedBugIds`.
- `lastVeteranBracket`.
- `lastOwnedCount`.
- `legacyResearchId/status/progress`.
- versie van de migratieberekening.

Na migratie blijft oude-APK-progressie geldig. De goedkope XP-reconciliatie draait op iedere foreground. De volledige legacy-reconciliatie draait bij iedere nieuwe appstart, na een Amsterdamse dagwissel en na een expliciete retry; hij mag worden overgeslagen wanneer `lastOwnedCount`, veteranenstaffel en legacy-researchversie aantoonbaar ongewijzigd zijn.

- Nieuwe inventorycounts staan direct in dezelfde bestaande inventorydocumenten.
- Een nieuwe soort die na migratie door een oude APK wordt ontgrendeld, activeert een servertrigger met deterministisch event-ID `discovery:<bugId>`; die geeft exact eenmaal de normale discovery-RP en schrijft eerlijke herkomst.
- Als de trigger en eerste migratie exact tegelijk racen, vergelijkt de volgende volledige reconciliatie de actuele unlock-ID's met `baselineOwnedBugIds` en bestaande `discovery:<bugId>`-events. Daardoor wordt een gemiste post-baseline unlock alsnog eenmaal verwerkt.
- Duplicates die via de oude APK worden verdiend zijn direct zichtbaar in 3.1 en worden pas na expliciete keuze onderzocht.
- Een stijging naar een hogere veteranenstaffel geeft alleen het verschil met de eerder geclaimde staffel.
- Oude mastery, battle wins, Museum, trades en Buddy worden live gelezen en hoeven niet geconverteerd te worden.
- Oude Research Target blijft hetzelfde bronrecord; 3.1 toont het als legacycontract en leest bij iedere open de actuele status.
- Oude combine/upgrades blijven technisch werken voor oude APK's. 3.1 toont de resulterende bug als `Oude upgrade`; researchpreview reserveert niets langdurig en valideert inventory opnieuw bij bevestiging, zodat een tussentijdse oude combine geen negatieve count kan veroorzaken.

### Compatibiliteitsduur

3.1 verwijdert geen oude endpoint, regel, veld of combinepad. Uitfasering is een apart toekomstig project en vereist expliciete eigenaarstoestemming plus bewijs dat oude clients niet meer ondersteund hoeven te worden.

### Oude-/nieuwe-clienttest

De verplichte test gebruikt twee apparaten of emulatorprofielen met hetzelfde testaccount:

1. Apparaat A blijft op 3.0.7; apparaat B gebruikt 3.1.
2. A verdient XP, nieuwe bug, duplicate, mastery en oud onderzoek.
3. B komt foreground en synchroniseert zonder dubbele grants.
4. B verdient 3.1-XP/RP en start research.
5. A opent opnieuw, crasht niet en ziet gedeelde inventory/legacy `totalPoints`.
6. A voert een oude upgrade uit en verdient opnieuw progressie.
7. B synchroniseert opnieuw en verwerkt alleen het verschil.
8. A wordt als normale update naar 3.1 gebracht; alle data blijft aanwezig.

Een Android-downgrade is niet vereist en mag niet worden gebruikt als bewijs, omdat die installatie/data kan beïnvloeden.

## 2.14 Betrouwbaarheid-, permissie- en regressiecontract

- Voor ieder gewijzigd gedeeld bestand wordt vooraf vastgelegd welke bestaande functies het raakt en welke regressietest ze beschermt.
- Elke nieuwe Firestore-collectie krijgt: owner-read PASS, other-user read DENY, client create/update/delete DENY en server-write PASS.
- Iedere wijziging aan bestaande Rules krijgt daarnaast tests voor oude profielwrites, inventory, mastery, Buddy, trade, Journal, missions, Arcade en Research Target.
- Iedere Function behoudt bestaande request/responsecontracten; nieuwe parameters zijn optioneel of zitten in nieuwe endpoints.
- Geen UI-task mag Rules versoepelen om een runtimefout te verbergen.
- Geen feature is `complete` wanneer alleen unit-tests groen zijn; vereist zijn bron, geauthenticeerde runtime, foutstates, visuele screenshots en het relevante oude-clientbewijs.
- Onverwachte console errors, permission-denied responses, CORS-errors, unhandled promise rejections of 4xx/5xx op verplichte endpoints blokkeren release.

## 2.15 Bugkracht, rollen, PvE en Mythische Crown

### Geen CP per individuele copy

BugBaas 3.1 introduceert geen afzonderlijke CP, IV, aanval of verdediging per duplicate. Alle copies van dezelfde soort blijven één inventoryrecord met een count. Hierdoor blijven oude inventory, trades, mastery en APK's compatibel en hoeft een tienjarige niet te beoordelen welke van vier identieke copies "de beste" is.

De zichtbare waarde heet `Kracht` en wordt volledig afgeleid uit bestaande rarity en Training:

| Rarity | Startkracht | Kracht bij vijf Trainingsterren |
|---|---:|---:|
| Gewoon | 60 | 80 |
| Zeldzaam | 65 | 85 |
| Episch | 70 | 90 |
| Legendarisch | 75 | 95 |
| Mythisch | 80 | 100 |

Trainingbonus:

| Training | Bonus |
|---|---:|
| ★ | +0 |
| ★★ | +5 |
| ★★★ | +10 |
| ★★★★ | +15 |
| ★★★★★ | +20 |

Pure formule:

```ts
power = rarityBasePower[rarity] + (trainingStars - 1) * 5;
pvePowerMultiplier = 1 + (power - 60) / 200;
```

`pvePowerMultiplier` loopt daardoor van 1,00 tot maximaal 1,20 vóór Crown. Een volledig getrainde gewone bug heeft Kracht 80 en blijft dus bruikbaar naast een nieuwe ongetrainde Mythische bug met dezelfde Kracht 80.

### Rolsterkte

Bestaande masteryrollen blijven behouden. De rolsterkte gebruikt één gedeeld model in plaats van een tweede verborgen rarityberekening:

```ts
roleStrength = Math.min(10, rarityRoleBase[rarity] + trainingStars - 1);
```

Met `rarityRoleBase`: Gewoon 1, Zeldzaam 2, Episch 3, Legendarisch 5 en Mythisch 6.

| Rol | Kindvriendelijke uitleg | Exact PvE-effect |
|---|---|---|
| Aanval | Doet extra schade aan de boss | `+roleStrength%` bossdamage |
| Snelheid | Laat helpers en aanvallen sneller terugkomen | `roleStrength%` kortere helper-/towercooldown |
| Schild | Beschermt het nest | `+ceil(roleStrength / 3)` start-HP, maximaal +4 |
| Chaos | Raakt meerdere kleine vijanden | `+roleStrength%` damage op swarm/secondary targets |
| Support | Geeft resources en herstel | `+roleStrength%` startresources en recharge, per mode begrensd |

De eventcatalogus benoemt per boss één of twee aanbevolen rollen. Een passende volledig getrainde Epic/Legendary kan daardoor beter passen dan een Mythische bug met de verkeerde rol. De beste squad is niet automatisch drie Mythicals.

### Legendary en Mythical

Legendary:

- Start op Kracht 75 en eindigt op 95.
- Heeft een sterke normale rol en hoge roleStrength.
- Heeft geen Mythische Crown en geen exclusieve Mythische special.

Mythical:

- Start op Kracht 80 en eindigt op 100.
- Heeft de hoogste roleStrength.
- Heeft één vaste, gecontroleerde special uit `shared/bugbaas31-pve-catalog.json`, bijvoorbeeld freeze, chain hit, armor break, nestschild of squad-rally.
- Kan als enige een Mythische Crown-rang en bijbehorende PvE-bonus verdienen.

Specials zijn deterministisch, begrensd en nooit betaald. De catalogus bevat per Mythische soort exacte cooldown, targettype, cap en ondersteunde modes. Geen vrije AI of willekeur bepaalt een special.

| Mythische bug | Special | Exact PvE-effect |
|---|---|---|
| Koningin-Alexandravlinder | Royal Freeze | 1× per run: maximaal 5 normale zwermbugs 3 seconden stil; boss maximaal 1 seconde |
| Zonsondergangsmot | Prism Chain | Iedere 12 seconden: één extra hit op maximaal 3 secundaire doelen; geen ketting terug naar hetzelfde doel |
| Picasso-wants | Pattern Break | 1× per run: bossarmor 8% lager gedurende 6 seconden; niet stapelbaar |
| Roze esdoornmot | Candy Slow | Iedere 14 seconden: maximaal 5 doelen 25% langzamer gedurende 4 seconden |
| Giraffekevertje | Longneck Scout | Iedere 12 seconden: markeert 1 prioritair doel gedurende 5 seconden; squad doet daarop maximaal 8% extra damage |
| Doornbloembidsprinkhaan | Bloom Blade | 1× per run onder 25% boss-HP: maximaal 12% extra damage gedurende 5 seconden |
| Lantaarndrager | Lantern Signal | 1× per run: helper-/towercooldowns 10% korter gedurende 8 seconden |
| Glorieuze scarabee | Mirror Guard | 1× per run: voorkomt maximaal 2 nest-HP schade; ongebruikte shield verdwijnt na de run |

Deze waarden zijn startcaps. Task 29 mag ze alleen aanpassen via het vastgelegde balansrapport en een expliciet balancebesluit; nooit stil per scherm.

### Waar Kracht wel en niet werkt

Volledige Kracht, rollen, Mythical specials en Crown werken in:

- Solo Campaign.
- Zwermbeleg.
- Nieuwe of toekomstige echte battle-raids.
- Expliciet als PvE gemarkeerde boss-/eventruns.

Niet toepassen op:

- Ranked scorevermenigvuldiging.
- PvP Crown-power.
- Scan-, research-, drop- of Gemkansen.
- Release Boss/community observation event.

Tap Duel/Ranked behoudt zijn begrensde helpermechaniek en bestaande Mythische specials, maar gebruikt nooit `pvePowerMultiplier` of Crown-multiplier. Tests moeten aantonen dat een Kracht 100/Crown Legend-squad geen directe Ranked scorebonus krijgt.

### Zwermbeleg en battle-raids

Voor de start toont de app:

- Bossdoel en persoonlijke reward.
- Aanbevolen rollen.
- Gekozen drie bugs.
- Kracht per bug en totale squadkracht.
- Exacte roleffects.
- Eventuele Mythical special en Crown-bonus.

Voorbeeld in kindtaal:

> Totale Kracht 246
>
> Aanval: +8% bossdamage
>
> Schild: +2 nestleven
>
> Special: bevriest één grote zwerm

Na de run toont een receipt per bug:

- Persoonlijke bijdrage.
- Geactiveerde rol/special.
- Verdiende Training-XP.
- PvE-battlewin en eventuele Crown-progressie.
- Community damage en rewardstatus.

De server maakt bij runstart een authoritative squad snapshot uit actieve squad, inventory, mastery, rarity, Crown en eventcatalogus. De client stuurt bij submit alleen run-ID en basisscore. De server berekent en begrenst alle power-, role-, special- en Crown-effecten; clientwaarden worden nooit vertrouwd.

Release Boss blijft bewust een ander eventtype: echte geverifieerde vondsten vullen de communitymeter. Kracht en squad bepalen daar niets, zodat verzamelen en veldonderzoek hun eigen eindgame behouden.

### Mythische Crown

Bestaande automatische Crown-rangen en powerdrempels blijven behouden voor compatibiliteit:

| Rang | Bestaande eis | PvE-bonus |
|---|---|---:|
| Bekroond | mastery level 8 + 25 PvE-wins | +2,5% |
| Kroonelite | level 11 + 75 wins | +5% |
| Kroonmeester | level 14 + 150 wins | +7,5% |
| Kroonlegende | level 17 + 300 wins | +10% |

De power wordt dus verdiend via Training en echte PvE-wins en is nooit te koop.

Iedere behaalde rang opent daarnaast gratis een afzonderlijke `Crownproef` voor uiterlijk. Deze proef gebruikt geen RP/Gems en bezet niet het ene actieve hoofdonderzoek:

| Rang | Crownproef | Gratis visuele reward |
|---|---|---|
| Bekroond | Win 1 PvE-run met deze bug in de squad | Bronzen kroonring en rustige kaartachtergrond |
| Kroonelite | Win 3 extra PvE-runs met deze bug | Gouden bugrand en sterkere halo |
| Kroonmeester | Win 1 bossrun met deze bug; Campaign boss is altijd alternatief | Geanimeerde rolachtergrond en Museumlicht |
| Kroonlegende | Win 3 boss-/eventruns met deze bug | Volledige Crown-frame, showcaseachtergrond en Kroonzaal-hologram |

Een rang is direct actief voor power zodra de bestaande eisen zijn behaald. De Crownproef ontgrendelt alleen de bijbehorende visuele set en verhaalpresentatie. Daardoor blijven oude APK's en bestaande berekende Crown-rangen correct.

Bestaande spelers behouden hun huidige Crown-power. Voor iedere reeds behaalde rang staat de visuele Crownproef retroactief klaar. Een latere rang die via een oude APK wordt bereikt, wordt door de normale mastery-/legacyreconciliatie zichtbaar en opent dezelfde gratis proef zonder dubbele reward.

Gems kunnen alleen de globale Aurora- of Obsidian-stijl voor reeds verdiende Crown-visuals ontgrendelen. Zonder verdiende Crown-visual toont de shop wel een preview maar is aankoop geblokkeerd met:

> Verdien eerst een Mythische Crown.

### Kindvriendelijke uitleg in de app

Bugdetail toont bovenaan:

```text
Mythisch
Kracht 90
Training ★★★
Rol: Schild
Goed in: bosses en nestbescherming
```

Daaronder staan twee korte uitlegkaarten:

- `Hoe wordt deze bug sterker?` → speel PvE met de bug om Training en battlewins te verdienen.
- `Wat doet deze bug?` → één zin over rol en special.

Rarity wordt alleen als naam/kleurbadge getoond. De oude rarity-sterren verdwijnen uit de actieve 3.1-UI, zodat alleen Training vijf sterren gebruikt.

## 2.16 Oude functie-audit en definitieve bestemming

| Bestaande functie/data | 3.1-besluit | Reden/bescherming |
|---|---|---|
| Upgrade-kaart en combinepaneel | Verwijderen uit 3.1-UI | Vervangen door Onderzoekscentrum |
| Combinefuncties/endpoints/Rules | Legacy-only behouden | Oude APK's moeten blijven werken |
| `source: combine` | Tonen als `Oude upgrade` | Eerlijke herkomst; niet herschrijven |
| `upgradedBugDexCount` | Data behouden | Oude profielen/badges en Rules blijven compatibel |
| Badge `Upgrade-smid` | Alleen zichtbaar voor bestaande bezitters als `Pionier uit het oude upgradesysteem`; niet meer nieuw unlockbaar | Geen verloren badge, geen onhaalbare nieuwe opdracht |
| `evolutionLevel` | Catalogusveld behouden maar deprecaten; 3.1-Kracht mag het niet lezen | Geen risicovolle catalogusmigratie of tweede verborgen powerlaag |
| Rarity-sterren `★–★★★★★` | Verwijderen uit actieve kaarten/details | Training is het enige vijfsterrensysteem |
| Ruwe mastery `Lv.x` als hoofdlabel | Vervangen door Trainingsterren | Onderliggende levels/skills blijven intact voor advanced detail |
| Losse `rarityScale` in squadhelpers | Vervangen door gedeelde `bugPowerModel`/`roleStrength` | Eén verklaarbare strength-bron |
| Automatische Crown-popup | Vervangen door `Crown-rang behaald` plus aparte Crownproefkaart | Power blijft compatibel; uiterlijk krijgt echte gameplay |
| `CrownGlow` en bestaande crown halo/frame-assets | Hergebruiken als basismateriaal en visueel opnieuw keuren | Geen goede assets weggooien; wel kwaliteit bewijzen |
| Museum Kroonzaal | Volledig behouden | Andere endgame: collectie, podia en seizoenstrofeeën |
| Veteranen Legendary/Mythical research-frame/aura | Ontdubbelen naar dossierzegel, onderzoeksachtergrond en Museumplaquette | Crown-randen/aura's blijven exclusief voor Crownprogressie |
| Release Boss | Behouden als scan-/community-event | Niet ieder event wordt dezelfde squadbattle |
| XP-gebaseerde soortunlock | Alleen legacy bezit behouden; geen nieuwe unlocks in 3.1 | Research is de nieuwe gerichte route |
| Mythische Tap Duel-specials | Behouden en via centrale catalogus begrenzen | Geen regressie, wel dezelfde uitleg/caps als PvE |
| Oude `userTiers`, `TierBadge` en puntenrang in HUD/Profile | Verwijderen uit actieve 3.1-progressie en vervangen door Onderzoekerslevel | Anders ziet een kind twee levels; definities en oude titels blijven voor oude APK en een read-only legacy-overzicht |
| Oude punten-/bugcount-unlock via `minPoints`, `minBugs`, `unlockMode=rank` | Legacy-only behouden | 3.1 start geen nieuwe rank-unlocks; old-APK unlocks blijven geldig en worden additief gereconcilieerd |
| Puntenbadges zoals Puntenslijper/Statusstrijder | Behouden als achievements, niet als level | Lifetime XP blijft dezelfde historische basis; reeds verdiende en later behaalde badges blijven |
| Characters met punten-/badgevereisten | Behouden als cosmetics en toetsen aan de monotone lifetime-XP-floor | Geen characterverlies; filtertekst wordt `XP`/`Badges`, niet oude puntenrang |
| Oude rangtitels en rootveld `title` | Rootveld blijft automatisch bijgewerkt voor oude APK's; 3.1 toont het alleen in een read-only legacy-overzicht en nooit als huidig level | Onderzoekerslevel is de enige actieve levelpresentatie; geen nieuw selectiesysteem nodig |
| Oude Research Target | Alleen actief legacycontract in 3.1 | Oude en nieuwe startendpoints delen transactioneel één hoofdonderzoekslot; bestaande progressie/claim blijft |
| Bug Lamp | Behouden als gratis streakbooster buiten de shop | Vaste 12 uur en bestaande +2,5 procentpunt rarityboost; krijgt echte lamp-art, actieve state en duidelijke niet-betaalde uitleg |
| Mastery Team Challenge | Behouden en herschrijven naar Trainingsterren | Drempels level 5/10/20 worden zichtbaar als ★★/★★★/★★★★★; bestaande squadframes blijven |
| Bestaande masteryrollen/skills | Behouden en in Kracht/PvE-uitleg opnemen | Geen trainingsdata of skillprogressie verliezen; ruwe levels blijven advanced detail |
| Bestaande squadbonuscategorieën | Behouden, maar raritysterkte komt alleen uit gedeelde `roleStrength` | Map/catch/questfuncties blijven; geen tweede rarityScale |

Task 29 maakt voor ieder item een codezoekresultaat en PASS/KEEP/REPLACE/LEGACY-regel in `docs/reviews/bugbaas-3.1-obsolete-feature-audit.md`. Geen bestaand veld, badge of endpoint wordt verwijderd omdat het "nutteloos lijkt" zonder runtime-, oude-APK- en Rulesbewijs.

---

# 3. Data- en bestandsarchitectuur

## 3.1 Nieuwe Firestore-paden

| Pad | Schrijver | Lezer | Doel |
|---|---|---|---|
| `users/{uid}` bestaand rootdocument | bestaande client-/serverwriters volgens ongewijzigde Rules | eigenaar en bestaande publieke projecties | legacy `totalPoints`, profiel, publieke statistieken en volledige oude-APK-compatibiliteit; geen nieuwe 3.1-only rootvelden |
| `users/{uid}/economy/state` | server | eigenaar | lifetimeXp, researchPoints, bugGems, featureVersion, lastXpReconciledAt |
| `users/{uid}/economyEvents/{eventId}` | server | eigenaar | immutable currencyledger |
| `users/{uid}/researchContracts/{contractId}` | server | eigenaar | actief/afgerond onderzoek |
| `users/{uid}/researchEvents/{eventId}` | server | eigenaar | idempotente researchprogressie |
| `users/{uid}/researchEffects/{effectId}` | server | eigenaar | actieve Habitatlokker, Soortenradar of Onderzoeksboost met resterende charges |
| `users/{uid}/cosmeticEntitlements/{itemId}` | server | eigenaar | permanente vaste BugGem-cosmetics zonder gameplaystats |
| `users/{uid}/cosmeticLoadout/state` | server | eigenaar | per surface `default` of een owned cosmetic-ID; geen stats |
| `users/{uid}/crownTrials/{bugId}` | server | eigenaar | per Mythische bug visueel vrijgespeelde rang, actieve Crownproef en idempotente trialprogressie; power-rang blijft afgeleid uit bestaande mastery/wins |
| `users/{uid}/speciesResearch/{bugId}` | server | eigenaar | factslots en volledig-onderzochtstatus |
| `users/{uid}/acquisitionEvents/{eventId}` | server | eigenaar | nieuwe herkomst per copy/reward |
| `users/{uid}/migration/bugbaas-3-1` | server | eigenaar | appliedAt, lastReconciledAt, baselineOwnedBugIds, lastVeteranBracket, legacy research snapshot, migratieversie en grants |
| `users/{uid}/scanPasses/{dayId}` | server | eigenaar | extra scanrecht en verbruik |
| `users/{uid}/pendingVerifiedScans/{scanId}` | server | eigenaar | herstelbare verplichte Journal-write |
| `appConfig/bugbaas31` | server/developer | ingelogde gebruiker | rolloutflags voor economy, Research Center, migratie, legacy reconciliation, proxy, Gems en commerce |

Alle nieuwe subcollectiewrites in deze tabel zijn server-only. De client mag alleen lezen en HTTPS Functions aanroepen. Het bestaande root-userdocument en zijn huidige Rules blijven compatibel met oude APK's. 3.1-XP-writers verhogen in één transactie zowel `economy/state.lifetimeXp` als legacy `users/{uid}.totalPoints`. Een synchronisatie-endpoint gebruikt altijd de hoogste van beide waarden en verlaagt nooit één van beide. Hierdoor hoeft geen nieuw veld op het rootdocument te staan dat door een oude volledige `setDoc`-write verwijderd of geblokkeerd kan worden.

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
- `src/services/progression/cosmeticShopModel.ts`
- `src/services/progression/cosmeticShopModel.test.ts`
- `src/services/progression/scanPassModel.ts`
- `src/services/progression/scanPassModel.test.ts`
- `src/services/progression/migrationModel.ts`
- `src/services/progression/migrationModel.test.ts`
- `src/services/progression/acquisitionHistoryModel.ts`
- `src/services/progression/acquisitionHistoryModel.test.ts`
- `src/services/progression/bugMotionModel.ts`
- `src/services/progression/bugMotionModel.test.ts`
- `src/services/progression/bugbaas31FeatureFlags.ts`
- `src/services/progression/legacyCompatibilityService.ts`
- `src/services/progression/legacyCompatibilityService.test.ts`
- `src/services/progression/rewardPresentationModel.ts`
- `src/services/progression/rewardPresentationModel.test.ts`
- `src/services/progression/bugPowerModel.ts`
- `src/services/progression/bugPowerModel.test.ts`
- `src/services/progression/crownTrialModel.ts`
- `src/services/progression/crownTrialModel.test.ts`
- `src/theme/bugbaas31VisualTokens.ts`
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
- `src/components/research/ResearchLabBackdrop.tsx`
- `src/components/research/ResearchPath.tsx`
- `src/components/research/ResearchPurchaseModal.tsx`
- `src/components/research/ResearchEmptyState.tsx`
- `src/components/rewards/RewardQueueProvider.tsx`
- `src/components/rewards/BugDiscoveryModal.tsx`
- `src/components/rewards/DuplicateResearchModal.tsx`
- `src/components/rewards/ResearchChapterCompleteModal.tsx`
- `src/components/rewards/ResearchFinaleModal.tsx`
- `src/components/rewards/ShopPurchaseModal.tsx`
- `src/components/AnimatedBugArt.tsx`
- `src/components/BugBaas31MigrationModal.tsx`
- `src/components/BugBaas31MigrationModal.structure.test.ts`
- `src/components/BuddyPickerModal.tsx`
- `src/components/BuddyPickerModal.test.ts`
- `src/components/TrainingStars.tsx`
- `src/components/TrainingStars.test.ts`
- `src/components/BugPowerBadge.tsx`
- `src/components/BugPowerBadge.test.ts`
- `src/components/CrownTrialCard.tsx`
- `src/components/CrownVisualPreview.tsx`
- `src/components/rewards/CrownRankModal.tsx`
- `src/components/rewards/CrownTrialCompleteModal.tsx`
- `src/components/shop/ShopItemPreviewModal.tsx`

## 3.3 Nieuwe server/shared/scripts

- `firebase/functions/economyCore.js`
- `firebase/functions/economyCore.test.js`
- `firebase/functions/researchContractCore.js`
- `firebase/functions/researchContractCore.test.js`
- `firebase/functions/migrationCore.js`
- `firebase/functions/migrationCore.test.js`
- `firebase/functions/scanProxyCore.js`
- `firebase/functions/scanProxyCore.test.js`
- `firebase/functions/legacyCompatibilityCore.js`
- `firebase/functions/legacyCompatibilityCore.test.js`
- `firebase/functions/bugPowerCore.js`
- `firebase/functions/bugPowerCore.test.js`
- `firebase/functions/crownTrialCore.js`
- `firebase/functions/crownTrialCore.test.js`
- `shared/scan-proxy-groups.json`
- `shared/bugdex-research-facts.json`
- `shared/bugbaas31-research-catalog.json`
- `shared/bugbaas31-shop-catalog.json`
- `shared/bugbaas31-pve-catalog.json`
- `scripts/preview_bugbaas_31_migration.mjs`
- `scripts/simulate_bugbaas31_economy.mjs`
- `docs/reviews/bugbaas-3.1-economy-simulation.md`
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
- `scripts/qa/bugbaas31-old-new-client.spec.ts`
- `scripts/verify-bugbaas31-impact-map.mjs`
- `.github/workflows/bugbaas-3-1-verify.yml`
- `docs/visual/bugbaas-3.1-research-assets.md`
- `docs/visual/bugbaas-3.1-screen-motion-spec.md`
- `docs/reviews/bugbaas-3.1-visual-qa.md`
- `docs/reviews/bugbaas-3.1-android-qa.md`
- `docs/reviews/bugbaas-3.1-migration-rehearsal.md`
- `docs/reviews/bugbaas-3.1-old-apk-compatibility.md`
- `docs/reviews/bugbaas-3.1-change-impact-map.md`
- `docs/reviews/bugbaas-3.1-xp-writer-audit.md`
- `docs/reviews/bugbaas-3.1-obsolete-feature-audit.md`
- `docs/reviews/bugbaas-3.1-pve-balance.md`
- `docs/reviews/bugbaas-3.1-release-readiness.md`

## 3.4 Belangrijkste interfaces

```ts
export type EconomyState = {
  version: 1;
  lifetimeXp: number;
  researchPoints: number;
  bugGems: number;
  lastXpReconciledAt?: string;
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
  kind: "receive_bug" | "unique_family" | "research_duplicates" | "complete_dossiers" | "walk_km" | "play_completions" | "campaign_win" | "complete_related_research" | "verified_scan" | "museum_master";
  target: number;
  progress: number;
  scanBonus?: number;
};

export type BugPowerSummary = {
  bugId: string;
  power: number;
  trainingStars: 1 | 2 | 3 | 4 | 5;
  role: "attack" | "speed" | "shield" | "chaos" | "support";
  roleStrength: number;
  pveMultiplier: number;
  crownMultiplier: number;
  mythicSpecialId?: string;
};

export type CrownTrialState = {
  bugId: string;
  earnedRank: "none" | "crowned" | "elite" | "master" | "legend";
  visualRank: "none" | "crowned" | "elite" | "master" | "legend";
  activeTrialRank?: "crowned" | "elite" | "master" | "legend";
  progress: number;
  target: number;
  updatedAt: string;
};

export type LegacyReconciliationState = {
  version: 1;
  appliedAt: string;
  lastReconciledAt: string;
  baselineOwnedBugIds: string[];
  lastOwnedCount: number;
  lastVeteranBracket: 0 | 250 | 750 | 1500 | 2500;
  legacyResearchId?: string;
  legacyResearchStatus?: string;
  legacyResearchProgress?: number;
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

## 3.5 Firebase-permissie- en ownershipmatrix

| Gebied/pad | Oude client | 3.1 client | Server | Verplichte bescherming |
|---|---|---|---|---|
| `users/{uid}` | Huidige toegestane profiel-/progressiewrites blijven werken | Dezelfde legacywrites; nieuwe economy alleen via endpoint | Mag `totalPoints` spiegelen | Geen nieuw verplicht rootveld; andere gebruiker denied |
| `bugdexInventory` / `bugdexUnlocks` | Bestaande grant/trade/combinecontracten blijven | Lezen; nieuwe 3.1-grants server-authoritative | Grant, proxy, research, compatibility trigger | Eerste copy, non-negative count, trade/combine regressies |
| `bugMastery` / events | Bestaande ownerwrites volgens huidige regels | Zelfde services en Training-presentatie | Alleen bestaande serverpaden waar al van toepassing | Levels/skills/wins blijven exact behouden |
| Buddy | Bestaande ownerstate | Zelfde ownerstate plus bugkiezer | Geen bredere toegang | Alleen eigen owned bug; actieve taak veilig |
| Trades | Bestaande contracten | Ongewijzigd | Bestaande accept/rewardpaden | Research mag tradecopies niet gebruiken |
| Museum | Bestaande read/claimpaden | Ongewijzigd | Bestaande idempotente claims | Geen placement/rewardverlies |
| Oude Research Target | Bestaande evidence/progressie | Read-through legacycontract | Bestaande validatie/claim | Geen dubbele nieuwe teller of claim |
| `verifiedObservations` | Owner-read via bestaande endpoint | Owner-read via endpoint | Uitsluitend serverwrite | Exacte locatie privé; direct clientwrite denied |
| `economy/state` | Wordt genegeerd | Owner-read via service | Uitsluitend serverwrite | RP/Gems/XP niet negatief; immutable events |
| `researchContracts` / `researchEvents` | Wordt genegeerd | Owner-read via service | Uitsluitend serverwrite | Eén actief, idempotente evidence/claim |
| `researchEffects` | Wordt genegeerd | Owner-read via service | Uitsluitend serverwrite | Vaste charges, niet stapelbaar, geen rarityverhoging |
| `cosmeticEntitlements` | Wordt genegeerd | Owner-read | Uitsluitend serverwrite | Eenmalige entitlement, geen gameplayvelden |
| `cosmeticLoadout` | Wordt genegeerd | Owner-read | Uitsluitend serverwrite via equip-endpoint | Alleen `default` of daadwerkelijk owned item, geen stats |
| `crownTrials` | Wordt genegeerd | Owner-read via service | Uitsluitend serverwrite | Alleen Mythische owned bug, power-rang afgeleid uit bestaande mastery/wins, visual trial idempotent, geen cosmetic loadout of power sale |
| `speciesResearch` | Wordt genegeerd | Owner-read | Uitsluitend serverwrite | Alleen gecontroleerde facts |
| `acquisitionEvents` | Wordt genegeerd | Owner-read | Uitsluitend serverwrite/trigger | Eerlijke herkomst, event-ID uniek |
| `migration/bugbaas-3-1` | Wordt genegeerd | Owner-read | Uitsluitend serverwrite | Eenmalig plus monotone reconcile |
| `scanPasses` | Wordt genegeerd | Owner-read | Uitsluitend serverwrite | Max één/dag; quota Rules controleren mee |
| `pendingVerifiedScans` | Wordt genegeerd | Owner-read | Uitsluitend serverwrite | Retry zonder dubbele observation/reward |
| `appConfig/bugbaas31` | Wordt genegeerd | Signed-in read | Developer/serverwrite | Ontbrekend/fout = alle flags uit |

Iedere rij krijgt een concrete emulator-Rule-test en minstens één runtime- of servertest. Geen pad mag alleen op basis van documentatie als veilig gelden.

## 3.6 Verplichte uitvoeringsvolgorde en chatcheckpoints

De numerieke taakvolgorde is de documentindeling, niet overal de veiligste dependencyvolgorde. Uitvoering volgt exact het single-chat protocol:

1. Tasks 1–2: schone tracked-only worktree, bronmanifest, test- en visuele nulmeting.
2. Tasks 3–4, daarna 15 en 22: economy, additieve Firebasebasis, migratiemodel en voortdurende oude-/nieuwe-clientsynchronisatie vóór nieuwe reward-UI.
3. Tasks 5–14: duplicates, feiten, research, shop, herkomst, scan en Journal.
4. Task 16, daarna Task 20 en Task 29: migratiepresentatie/Training, benodigde assets en vervolgens het gedeelde Kracht-, rol-, Crown- en PvE-model.
5. Tasks 17–19 en daarna Task 21: bestaande gameplayfixes en de volledige samengevoegde visuele laag, inclusief shop- en Crown-previews.
6. Tasks 23–28: impact-, permissie-, oude-APK-, browser-, Android-, concurrency- en releasebewijs.

Bij iedere taak worden status, receipt, tests en commit bijgewerkt. Bij ieder fase-einde wordt een contextcheckpoint in het statusbestand geschreven. Read-only tests mogen worden herhaald; Firebasemigratie, deployments, feature-flagwijzigingen en releases vereisen een unieke operation receipt en expliciete eigenaarstoestemming.

---

# 4. Implementation Tasks

### Task 1: Clean tracked-only 3.1 worktree, durable status and reproducible runner

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/run-ts-tests.mjs`
- Create: `scripts/verify-bugbaas31-source-manifest.mjs`
- Create: `.github/workflows/bugbaas-3-1-verify.yml`
- Create: `docs/superpowers/execution/bugbaas-3.1-status.md`
- Create: `docs/superpowers/execution/bugbaas-3.1-task-receipts/README.md`
- Create: `docs/superpowers/execution/bugbaas-3.1-operation-receipts/README.md`
- Create: `docs/reviews/bugbaas-3.1-source-manifest.md`
- Test: existing `*.test.ts`, `server/realBugScan/*.test.mjs`, `firebase/functions/*.test.js`

**Interfaces:**
- Produces: clean branch `codex/bugbaas-3.1`, durable execution state, `npm run verify:3.1:source`, `npm run test:ts`, `npm run test:3.1:core`, `npm run verify:3.1`.
- Consumes: tracked 3.0 source, existing TypeScript/MJS/Firebase tests and the required single-chat execution protocol.

- [ ] **Step 1: Create the isolated tracked-only worktree**

Use `superpowers:using-git-worktrees` and the native DevSpace worktree mechanism with base ref `codex/bugbaas-3.0`. Create work branch `codex/bugbaas-3.1`; prefer a managed path clearly named `CimPro BugBaas-3.1`. Do not manually copy the existing folder.

Run in the new worktree:

```bash
git branch --show-current
git rev-parse HEAD
git status --short
git ls-files -o --exclude-standard | wc -l
```

Expected: branch `codex/bugbaas-3.1`, clean status and zero untracked files before ignored local configuration. Record the actual base commit and absolute worktree path in the execution status file.

- [ ] **Step 2: Bootstrap durable status and receipts**

Create the status header, all 29 task rows and receipt directories exactly as specified by `docs/superpowers/plans/2026-08-03-bugbaas-3-1-single-chat-execution-protocol.md`. Set only `BB31-T01` to `IN_PROGRESS`; all other tasks start `NOT_STARTED`. Record all deployment/publication fields as `NONE` or `NO`.

- [ ] **Step 3: Write the failing source-manifest audit**

Create tests/fixtures for `scripts/verify-bugbaas31-source-manifest.mjs` that fail on a missing referenced asset, an untracked runtime file, a duplicate asset target and a runtime import into ignored output. The audit scans `App.tsx`, `src`, package scripts, app/native configuration, BugArt/catalog data, `public` routes and Firebase/scan imports.

- [ ] **Step 4: Run and confirm the source-manifest red phase**

```bash
node --test scripts/verify-bugbaas31-source-manifest.test.mjs
```

Expected: FAIL because the verifier does not exist.

- [ ] **Step 5: Implement the source-manifest verifier**

The verifier returns nonzero for missing, untracked or ignored-output runtime dependencies. It writes no project files. Unreferenced tracked files are reported as cleanup candidates only and are not deleted. Add script:

```json
{
  "verify:3.1:source": "node scripts/verify-bugbaas31-source-manifest.mjs"
}
```

If a required file exists only in the dirty 3.0 checkout, import only that exact reviewed file, document its source/reference in `docs/reviews/bugbaas-3.1-source-manifest.md` and commit it with Task 1. Never copy a whole untracked directory.

- [ ] **Step 6: Record the failing official runner**

Run:

```bash
npm run test:real-bug-scan
```

Expected before the fix: FAIL before test execution with `Cannot use import statement outside a module` for `.test.ts` files.

- [ ] **Step 7: Add pinned test dependencies and scripts**

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
  "verify:3.1": "npm run verify:3.1:source && npm run typecheck && npm run test:ts && npm run test:real-bug-scan && npm run test:3.1:functions && npm run test:3.1:rules && npm run validate:bug-art"
}
```

`scripts/run-ts-tests.mjs` discovers app `.test.ts` files outside dependency/build/output directories, splits them into bounded batches and invokes the local `tsx` binary with `--test`.

- [ ] **Step 8: Run the clean baseline**

Run:

```bash
npm ci
npm run verify:3.1:source
npm run typecheck
npm run test:real-bug-scan
npm --prefix firebase/functions test
npm run validate:bug-art
npx expo export --platform web --output-dir dist-bugbaas-3.1-baseline --clear
git diff --check
```

Expected: source manifest green, typecheck green, 30 client scan tests, 43 scan server tests and 74 Function tests green subject to later-added tests, valid BugArt and successful web export. The generated export remains ignored and uncommitted.

- [ ] **Step 9: Complete receipt, status and commit**

Create `BB31-T01.md`, set Task 1 COMPLETE, record exact test counts and set `Last green commit` after committing:

```bash
git add package.json package-lock.json scripts/run-ts-tests.mjs scripts/verify-bugbaas31-source-manifest.mjs scripts/verify-bugbaas31-source-manifest.test.mjs .github/workflows/bugbaas-3-1-verify.yml docs/superpowers/execution docs/reviews/bugbaas-3.1-source-manifest.md
git commit -m "test(bb31-t01): create clean reproducible 3.1 workspace"
```

Confirm `git status --short` is empty before Task 2.

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

Create a Playwright test that expects screenshots for World, Scan, Play, BugDex, Journal, Museum, Profile, Buddy and Tap Duel at all required viewports. It also expects a `quality-reference` set containing the strongest existing BugDex new-species popup, Legendary/Mythical rarity presentation, Museum room/podium and best current card/hero composition. The test must fail because the new baseline directory is empty.

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
- Best current Common/Rare/Epic/Legendary/Mythical reward states.
- Best current BugDex detail/card and Museum room/podium.
- Current loading, empty, error and locked states where they exist.

- [ ] **Step 5: Document visible baseline defects**

In `docs/reviews/bugbaas-3.1-visual-qa.md`, record screenshot path, viewport, defect, severity and intended 3.1 correction. Include Buddy selection absence, Upgrade density, duplicate action absence, movement badge clarity and Tap Duel HUD overlap. Mark the selected quality-reference screenshots and list the exact qualities 3.1 must preserve: BugArt scale, rarity depth, edge treatment, typography hierarchy, spacing, animation restraint and stable final state.

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
- Create: `docs/reviews/bugbaas-3.1-xp-writer-audit.md`
- Create: `scripts/simulate_bugbaas31_economy.mjs`
- Create: `docs/reviews/bugbaas-3.1-economy-simulation.md`

**Interfaces:**
- Produces: `xpForLevel`, `levelForXp`, `researcherTitleForLevel`, `normalizeEconomyState`, `researchPointValueForRarity`, `newDiscoveryPointValueForRarity`.
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

Also prove lifetime XP cannot be reduced by a negative delta and exact title boundaries at levels 1, 5, 10, 20, 30 and 40.

- [ ] **Step 2: Run and confirm failure**

```bash
npx tsx --test src/services/progression/economyModel.test.ts
```

Expected: FAIL because the economy model does not exist.

- [ ] **Step 3: Implement pure economy functions**

Add strict finite-number normalization, non-negative balances and exact tables from section 2. `users/{uid}/economy/state.lifetimeXp` is de 3.1-bron voor permanente XP; bestaand `users/{uid}.totalPoints` blijft de legacy/publice projectie voor oude APK's en rankings. `economy/state` bevat lifetime XP, Research Points, BugGems en de dataversie.

- [ ] **Step 4: Add user compatibility fields**

Laat het bestaande `User`-rootcontract ongewijzigd zodat oude volledige `setDoc`-writes geldig blijven. Maak een aparte `ProgressionViewState` die `User.totalPoints` combineert met `EconomyState`:

```ts
lifetimeXp = Math.max(economy.lifetimeXp ?? 0, user.totalPoints ?? 0)
```

Research Points en BugGems worden alleen via `EconomyState` geladen. Voeg geen `lifetimeXp` of `progressionVersion` toe aan het root-userdocument. Do not overwrite grandfathered unlocks or cosmetics.

- [ ] **Step 5: Stop XP decrements**

Change 3.1 delete/reversal presentation so report deletion may update `bugCount` or report state but never subtract lifetime XP. Inventory every `totalPoints` writer with `rg -n "totalPoints" src firebase/functions firestore.rules` in `docs/reviews/bugbaas-3.1-xp-writer-audit.md`. Classify each source as: (A) existing server reward modified to dual-write, (B) existing direct client legacywrite followed immediately by signed `reconcileLegacyXp` before the 3.1 rewardreceipt, or (C) non-account/community counter that must not touch lifetime XP. Behoud oude endpointcontracts en writes voor oude APK's. Nieuwe 3.1 rewardwriters use `grantLifetimeXp`. The pure helper `lifetimeXpFloor` uses `max(economy.lifetimeXp, totalPoints)` and may only increase. Add regressions for every classified XP source, report deletion and old-client/new-client synchronization.

- [ ] **Step 6: Run focused and broad tests**

```bash
npx tsx --test src/services/progression/economyModel.test.ts src/services/userService*.test.ts src/services/pointsService*.test.ts src/services/bugService*.test.ts
npm run typecheck
```

- [ ] **Step 7: Run the economy simulation**

`scripts/simulate_bugbaas31_economy.mjs` runs deterministic scenarios at 10, 15 and 20 bugs/day using the actual catalog rarity mix plus low/medium/high duplicate conversion. Include daily fieldresearch and dossier bonuses. Report days to each shop item, 3.000-RP Legendary and 12.000-RP Mythical, plus starting balances for normal/veteran inventories. Target windows: normal active player Legendary permit in 21–35 days, low-activity player in no more than 60 days, Mythical currency in 90–150 days before task prerequisites, and ordinary RP items in 2–7 active days. The script fails only on impossible/negative/unbounded results; balance outside target windows blocks implementation pending an explicit balance decision rather than silently changing prices.

Run:

```bash
node scripts/simulate_bugbaas31_economy.mjs
```

Record all assumptions and percentiles in `docs/reviews/bugbaas-3.1-economy-simulation.md`.

- [ ] **Step 8: Commit**

```bash
git add src/types.ts src/services/progression/economyModel.ts src/services/progression/economyModel.test.ts src/services/userService.ts src/services/pointsService.ts src/services/bugService.ts docs/reviews/bugbaas-3.1-xp-writer-audit.md scripts/simulate_bugbaas31_economy.mjs docs/reviews/bugbaas-3.1-economy-simulation.md
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
- Produces HTTPS endpoints `economyStatus`, `previewDuplicateResearch`, `researchDuplicates`, `purchaseShopItem`, `equipCosmetic`, `claimProgressionMilestones`, the internal transaction helpers `grantLifetimeXp` and `grantBugGems`, and read access to `appConfig/bugbaas31`.
- Consumes pure economy values from equivalent shared constants synchronized by tests.

- [ ] **Step 1: Write failing core tests**

Cover:

- Same event-ID cannot grant twice.
- Negative spend is rejected.
- Insufficient balance is rejected.
- Concurrent duplicate research cannot consume the same copy twice.
- Research Points and BugGems cannot become negative.
- XP grants only increase lifetime XP.
- Level milestone Gems are exactly 10 for levels divisible by 5 and use one event per level.
- Museum Master Gems are exactly 15 per normal wing and use one event per wing.
- Cosmetic entitlement retry never charges twice.

- [ ] **Step 2: Write failing Rules tests**

Prove owner can read new paths, client cannot create/update/delete them, another user cannot read them and existing `verifiedObservations`/Buddy/trade rules remain unchanged. Prove `appConfig/bugbaas31` is readable by an authenticated player, not writable by a normal client and absent/invalid config safely resolves to all 3.1 flags false.

- [ ] **Step 3: Implement pure ledger planning**

`economyCore.js` returns deterministic transaction plans. `index.js` performs Firestore reads/writes in one transaction and writes an immutable `economyEvents/{eventId}` document. Update every Task 3 class-A existing Firebase rewardwriter in `firebase/functions/index.js` to use the same `grantLifetimeXp` transaction helper while preserving its existing endpoint response. XP plans raise `users/{uid}/economy/state.lifetimeXp` and root `users/{uid}.totalPoints` together; RP/Gem plans mutate only `economy/state`. The pure `lifetimeXpFloor` calculation is monotonic; Task 22 uses it for `reconcileLegacyXp`. Geen nieuw rootveld wordt toegevoegd.

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
- Produces: `buildDuplicateResearchPreview(items, tradeReservations, selectedBugIds?)`, `DuplicateResearchPreview`.
- Consumes: inventory, open trade reservations, rarity point table.

- [ ] **Step 1: Write failing preview tests**

Prove:

- Count 1 gives spendable 0.
- Count 4 gives spendable 3.
- Open trade copies are excluded.
- A species omitted from `selectedBugIds` is excluded without creating persistent lockdata.
- Mixed-rarity total is exact.
- Batch preview lists fact unlocks separately from point-only copies.

- [ ] **Step 2: Run red phase**

```bash
npx tsx --test src/services/progression/duplicateResearchModel.test.ts
```

- [ ] **Step 3: Implement pure preview**

The preview includes exact consumed counts, retained counts, RP total, newly unlocked fact slots and excluded reasons `first_copy`, `open_trade` or `not_selected`. The default selection contains every safely researchable species, so `Onderzoek alles` needs no manual setup.

- [ ] **Step 4: Connect server endpoint**

The client sends only selected bug IDs, never counts or totals. The server recalculates the preview inside the transaction. Never trust client totals. Preserve existing inventory metadata and decrement only approved copies.

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

Duplicate 1 unlocks the next available locked fact. Duplicate 2 unlocks the final available fact. Additional duplicates give only RP. A species with no extra fact returns `all_available_known`. The first transition to a complete three-part dossier grants exactly 50 RP with event-ID `dossier_complete:<bugId>` in the same transaction; retries and later duplicates never repeat it.

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
- Buttons `Onderzoek nu` and `Later beslissen`, with subtext `Blijft bewaard voor ruilen of later onderzoek`.
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
- Create: `shared/bugbaas31-research-catalog.json`
- Modify: `firebase/functions/index.js`
- Modify: `src/services/researchTargetModel.ts`
- Modify: `src/services/researchTargetService.ts`

**Interfaces:**
- Produces endpoints `researchCatalog`, `startResearchContract`, `researchContractStatus`, `claimResearchContract` and evidence sync.
- Consumes economy spend endpoint, inventory, Museum status, level and legacy Research Target.

- [ ] **Step 1: Write failing pure contract tests**

Test exact costs, tier chapter counts, one-active-contract rule, no expiry, prerequisites, scan bonus with free alternative and guaranteed target reward. Validate every Legendary/Mythical target in `shared/bugbaas31-research-catalog.json`: existing bug ID, controlled family/group, exact walk/play template, existing Campaign finale and for every Mythical one valid related Legendary/veteran route. Test one free fieldresearch per Amsterdam day, exact reward 40 RP + 50 XP, stable event-ID `field_daily:<dayId>` and no second daily claim.

- [ ] **Step 2: Write failing idempotency tests**

The same evidence event cannot count twice; claim retry returns the same receipt; spending and contract creation happen atomically.

- [ ] **Step 3: Implement deterministic templates**

Templates use finite task kinds from the interface. Every generated contract is validated to contain at least one non-scan route for each chapter. The daily fieldresearch has exactly one age-appropriate action: receive 1 matching bug, receive 3 bugs, research 2 duplicates, walk 0.5 km or complete 1 game. A valid scan may satisfy/accelerate a matching receive-bug task, but the daily task is never scan-only. Its target fits one normal session.

- [ ] **Step 4: Implement server endpoints**

Server checks target eligibility, balance, inventory, prerequisites and active contract inside one transaction. First-ever completed Legendary and Mythical research write idempotent Gem events of respectively 20 and 40 Gems in the same claim transaction; later completions do not repeat those grants.

- [ ] **Step 5: Bridge legacy Research Target**

Read existing target/progress and expose it as a `legacy` contract without resetting progress or claiming twice. An active or completed-unclaimed legacy target occupies the one main-research slot: `startResearchContract` must reject a second main contract until the legacy reward is claimed/closed. Update the existing `startResearchTarget` backend transaction to also check for a live 3.1 main contract; an old APK then receives its existing compatible `research already active/unavailable` error instead of creating a second route. If an old target and new contract race, exactly one start wins. If an old APK starts a legacy target while no new contract exists, 3.1 detects it on the next status read and applies the same rule.

- [ ] **Step 6: Run tests**

```bash
npx tsx --test src/services/progression/researchContractModel.test.ts src/services/researchTargetService.test.ts
npm --prefix firebase/functions test
npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add src/services/progression/researchContractModel.ts src/services/progression/researchContractModel.test.ts src/services/researchTargetModel.ts src/services/researchTargetService.ts firebase/functions/researchContractCore.js firebase/functions/researchContractCore.test.js shared/bugbaas31-research-catalog.json firebase/functions/index.js
git commit -m "feat: add guaranteed research contracts"
```

### Task 9: Research shop and bounded boost inventory

**Files:**
- Create: `src/services/progression/researchShopModel.ts`
- Create: `src/services/progression/researchShopModel.test.ts`
- Create: `src/services/progression/cosmeticShopModel.ts`
- Create: `src/services/progression/cosmeticShopModel.test.ts`
- Create: `shared/bugbaas31-shop-catalog.json`
- Create: `src/components/shop/ShopItemPreviewModal.tsx`
- Create: `src/components/shop/ShopItemPreviewModal.structure.test.ts`
- Modify: `firebase/functions/economyCore.js`
- Modify: `firebase/functions/index.js`
- Modify: `firestore.rules`
- Modify: `tests/firestore/bugbaas31.rules.test.mjs`
- Modify: `src/services/bugDexService.ts`
- Modify: `src/services/dailyMissionService.ts`

**Interfaces:**
- Produces one fixed server-validated shop catalog, active effects for lure/radar/research boost, immediate mission reroll and permanent cosmetic entitlements.
- Consumes economy ledger, reward selection pipeline and the exact RP/Gem catalog from section 2.7.

- [ ] **Step 1: Write failing catalog tests**

Assert exact functional IDs/prices/charges and exact cosmetics: `researcher_profile_frame=120 Gems`, `bugdex_research_frame=150`, `museum_research_pedestal=180`, `research_lab_theme=200`, `crown_style_aurora=160` and `crown_style_obsidian=160`. Every product uses exactly one currency, contains no random result, declares one reviewed icon/preview ID and is rejected when absent from the signed/shared catalog. Crown styles require an existing earned Crown visual and never set Crown rank/power.

- [ ] **Step 2: Write reward-safety tests**

Prove lure/radar cannot increase rarity, cannot produce Legendary/Mythical outside an already rolled rarity and cannot stack beyond one active effect of each class.

- [ ] **Step 3: Implement server purchase and effect state**

`purchaseShopItem` checks price and currency from the server catalog, not client input. Functional items activate immediately and write `researchEffects/{effectId}` with remaining charges; purchase is blocked while the same non-stackable effect is active. Cosmetics write one `cosmeticEntitlements/{itemId}` document, equip it in `cosmeticLoadout/state` and retry returns the existing entitlement without charging again. `equipCosmetic(surface, itemId | "default")` changes only the selected presentation after server ownership validation, so a speler kan altijd terug naar standaard. Mission reroll is immediate. Every spend and result is one transaction with one economy event.

- [ ] **Step 4: Integrate reward selection**

Apply habitat/missing preference only after rarity determination. Consume one charge only after a real bug reward is granted.

- [ ] **Step 5: Implement mission reroll boundaries**

Reroll only an allowed incomplete mission and replace it with a server-selected equivalent category/effort. Never reroll claimed missions.

- [ ] **Step 6: Implement mandatory item previews**

Every product card opens `ShopItemPreviewModal` before purchase. Functional items show a short deterministic effect demo plus exact charges/limits; cosmetics render a live before/after preview on Profile, BugDex, Museum, Research Lab or a sample earned Crown surface. The purchase CTA is disabled when the visual asset/preview is missing, when the same effect is active or when Crown prerequisites are absent.

- [ ] **Step 7: Add Rules regressions for effects and cosmetics**

Prove owner-read, other-user read denial and all normal-client create/update/delete denial for `researchEffects`, `cosmeticEntitlements` and `cosmeticLoadout`. Test purchase auto-equip, switch to `default`, equip owned item and reject an unowned/wrong-surface item. Prove a legacy profile/inventory write still passes after these paths exist.

- [ ] **Step 8: Run tests and commit**

```bash
npx tsx --test src/services/progression/researchShopModel.test.ts src/services/progression/cosmeticShopModel.test.ts src/services/bugDexService*.test.ts src/services/dailyMissionService*.test.ts
npm --prefix firebase/functions test
npm run test:3.1:rules
git add src/services/progression/researchShopModel.ts src/services/progression/researchShopModel.test.ts src/services/progression/cosmeticShopModel.ts src/services/progression/cosmeticShopModel.test.ts src/components/shop/ShopItemPreviewModal.tsx src/components/shop/ShopItemPreviewModal.structure.test.ts shared/bugbaas31-shop-catalog.json src/services/bugDexService.ts src/services/dailyMissionService.ts firebase/functions/economyCore.js firebase/functions/index.js firestore.rules tests/firestore/bugbaas31.rules.test.mjs
git commit -m "feat: add bounded research and cosmetic shop items"
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

1. Saldoheader met uitgeschreven `Onderzoekspunten` en `BugGems`.
2. Actief onderzoek met één volgende stap.
3. Dubbele bugs met preview en veilige eerste-copyuitleg.
4. `Handige spullen` voor RP-items.
5. `Uiterlijk` voor de vier vaste Gem-cosmetics.

Op telefoon zijn maximaal vier shopkaarten tegelijk zichtbaar voordat de gebruiker bewust verder scrolt. Alleen de sectie met de eerstvolgende relevante actie toont een dominante CTA; andere secties gebruiken secundaire knoppen.

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

Behoud alle bestaande statuswaarden en verplichte responsevelden zodat een 3.0.7-client dezelfde identificatie veilig kan parsen. Voeg alleen dit optionele additive veld toe:

```ts
proxyReward?: {
  bugId: string;
  bugName: string;
  rarity: "Gewoon" | "Zeldzaam";
  relationship: "same_genus" | "approved_group";
}
```

- [ ] **Step 4: Grant proxy idempotently**

Use the scan ID as the event ID. Exact observed species remains in the verified observation; proxy acquisition source is `scan_proxy`. Add a regression that the unchanged legacy 3.0.7 response parser accepts a response containing `proxyReward` and continues treating the identification status normally.

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

**Interfaces:**
- Produces classified errors `location_denied|location_inaccurate|auth_expired|receipt_invalid|server_unavailable|network_offline` and retryable pending scan state.
- Consumes existing receipt verification and location normalization.

- [ ] **Step 1: Reproduce with an authenticated test account**

Capture HTTP status, response body, token audience, receipt age, location accuracy, function deployment/version, CORS headers and client state for the reported Journal failure. Verify the Vercel BugScan signer and Firebase `recordVerifiedObservation` verifier use the same active receipt-secret/public-key path without logging the secret. Do not change rules before root cause is identified.

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
git add src/services/fieldJournalErrorModel.ts src/services/fieldJournalErrorModel.test.ts src/services/fieldJournalService.ts src/services/pendingFieldJournalService.ts src/screens/RealBugScanScreen.tsx firebase/functions/index.js firestore.rules
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
- Behoudt legacy responseveld `remainingScans` als `freeRemaining` met bereik 0–3 voor oude clients.
- Produces daarnaast optioneel 3.1-status `scanQuota: { freeUsed, freeLimit: 3, freeRemaining, extraUsed, extraLimit, extraRemaining, passPurchased }`.
- Consumes BugGem economy spend.

- [ ] **Step 1: Write failing quota tests**

Prove base limit 3, purchased accountlimit 6, max one pass/day, rejected scans do not consume and Amsterdam midnight resets both counters. Prove legacy `remainingScans` never exceeds 3, the unchanged 3.0.7 contract parser accepts every new response, and the 3.1 parser reads the optional `scanQuota` object.

- [ ] **Step 2: Implement atomic pass purchase**

Spend exactly 60 Gems and create server-written `scanPasses/{dayId}` in one transaction. Retry returns the existing pass without charging again. De eigenaar mag het pasdocument lezen, maar nooit zelf schrijven.

- [ ] **Step 3: Update scan reservation**

`firebaseUsageStore.mjs` leest zowel `realBugScanServerUsage/{dayId}` als het owner-readable `scanPasses/{dayId}` met hetzelfde Firebase-token. Reserve against free capacity first, then extra capacity. Refund the exact bucket on inconclusive/rejected result. Firestore Rules berekenen onafhankelijk dezelfde limiet: maximaal 3 zonder pas en maximaal 6 wanneer het server-written pasdocument voor die Amsterdamse dag bestaat. De client kan de limiet dus niet zelf verhogen. De handler houdt `remainingScans = freeRemaining` voor oude clients en voegt alleen het optionele additive `scanQuota` toe; geen bestaand responseveld verandert type of bereik.

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
10. Existing Mythische Crown ranks at none/crowned/elite/master/legend.
11. Existing `Upgrade-smid`, `upgradedBugDexCount` and Crown Hall placements/trophies.

- [ ] **Step 2: Write failing invariants**

Assert:

- `economy/state.lifetimeXp === old totalPoints` at migration start while the root user schema remains unchanged.
- No inventory count decreases.
- No mastery/title/character/trade/Museum/Crown Hall data changes.
- Existing Mythische Crown rank and current PvE multiplier are identical before/after migration.
- No Crown visual trial is falsely marked completed; each already earned rank is only made available as a free pending visual trial.
- Existing `Upgrade-smid` ownership and `upgradedBugDexCount` remain; nonowners do not receive the legacy badge.
- Veteran RP matches exact bracket.
- Retroactive level milestones grant 10 Gems per already reached level divisible by 5, exactly once.
- Retroactive normal Museum Master wings grant 15 Gems per already achieved wing, exactly once.
- `baselineOwnedBugIds`, `lastVeteranBracket`, `appliedAt` and legacy-research reference are deterministic.
- Migration event cannot apply twice.
- Open trade reservations remain unavailable for duplicate conversion.
- Legacy research target/progress/claimability persists.
- Progress earned in an old APK after migration can be reconciled without regranting the baseline package.

- [ ] **Step 3: Implement read-only preview script**

The script reads approved accounts, writes no Firebase data and outputs aggregate distributions plus per-test-account JSON without emails or secrets.

- [ ] **Step 4: Add veteran Legendary/Mythical tracks**

Create free `veteran` contracts for owned premium bugs. Claim gives dossier seal, research background, Museum plaque or title, not another first copy and never a Crown border/halo/power. Keep Crown visual trials as the separate Task 29 route.

- [ ] **Step 5: Implement transactionally idempotent migration**

Use migration document ID `bugbaas-3-1`. On retry, return existing results. Store the baseline and reconciliation fields required by section 2.13; do not copy live inventory/mastery/Museum data into parallel writable 3.1 collections.

- [ ] **Step 6: Run dry-run and review outliers**

Stop rollout when any account has negative values, impossible copycount, missing target, a root-schema mutation, a baseline owned-ID mismatch, an RP grant outside the specified bracket, changed Crown power, lost Crown Hall state or a veteran cosmetic colliding with a Crown visual. Also simulate one later old-APK unlock, Crown-rank increase and bracket crossing before approving the migration model.

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
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/components/AppHud.tsx`
- Modify: `src/components/AppHudModel.ts`
- Modify: `src/components/TierBadge.tsx`
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

Assert exact mappings for mastery levels 1, 4, 5, 8, 9, 12, 13, 16, 17 and 20. Structuretests must fail while active Profile, Home HUD, BugDex, Buddy, Play-squad and Museum surfaces still render raw `LV.x`, `userTiers` or the old pointsrang as their primary child-facing progression label.

- [ ] **Step 3: Implement exact migration receipt**

Show old points, lifetime XP, new level, veteran RP and duplicate preview. Never show a value calculated only on the client.

- [ ] **Step 4: Update Profile and all active mastery surfaces**

Display Onderzoekerslevel, lifetime XP and progress to next level. Explain `XP kun je niet uitgeven`. Replace active Home HUD/Profile `userTiers`, `TierBadge` and old pointsrang progress with the single Onderzoekerslevel; keep old tier/title definitions and root `title` behavior for old APKs plus a read-only legacy overview. 3.1 does not add a second title-selection preference. Voeg één gedeeld `TrainingStars`-component toe met mapping 1–4=★, 5–8=★★, 9–12=★★★, 13–16=★★★★ en 17–20=★★★★★. Vervang op actieve player-facing surfaces de ruwe `LV.x`/mastery-XP-weergave door `Training x/5` en sterren in Profile, BugDex-kaarten/detail, Buddy, Play-squad en Museum. Onderliggende mastery-levels, skillgrenzen, sortering en serverdata blijven ongewijzigd en mogen in een geavanceerd detail voor volwassenen beschikbaar blijven.

- [ ] **Step 5: Run focused tests and screenshot states**

```bash
npx tsx --test src/components/TrainingStars.test.ts src/components/BugBaas31MigrationModal.structure.test.ts src/screens/BugDexScreen.structure.test.ts src/components/BuddyOverlay.structure.test.ts src/screens/BugSmashDuelScreen.structure.test.ts
npm run typecheck
```

Capture new player, normal migrated player, veteran with many Mythicals and each active Training-star surface at all phone/tablet sizes.

- [ ] **Step 6: Commit**

```bash
git add App.tsx src/components/BugBaas31MigrationModal.tsx src/components/BugBaas31MigrationModal.structure.test.ts src/components/TrainingStars.tsx src/components/TrainingStars.test.ts src/screens/ProfileScreen.tsx src/screens/HomeScreen.tsx src/components/AppHud.tsx src/components/AppHudModel.ts src/components/TierBadge.tsx src/screens/BugDexScreen.tsx src/components/BuddyOverlay.tsx src/screens/BugSmashDuelScreen.tsx src/screens/MuseumScreen.tsx src/services/i18n.tsx
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

- [ ] **Step 5: Add the focused interaction harness**

Extend the deterministic layout/structure harness so targets are generated at every safe boundary and the same hit-test function accepts the target center while rejecting HUD/footer coordinates. Task 24 later repeats this through real Playwright pointer input on every required viewport.

- [ ] **Step 6: Performance check**

Measure frame pacing and input responsiveness on small Android emulator and one physical Android device. Reject the change if target count causes sustained jank or missed input relative to baseline.

- [ ] **Step 7: Commit**

```bash
git add src/services/tapDuelLayoutModel.ts src/services/tapDuelLayoutModel.test.ts src/services/bugSmashDuelService.ts src/screens/BugSmashDuelScreen.tsx src/screens/BugSmashDuelScreen.structure.test.ts
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
- Produces compact active research action and a native-confirmed same-device claim badge.
- Consumes `MovementRadarProgress.awardedToday/maxRewards` and active Research Contract.

- [ ] **Step 1: Write failing badge tests**

Require `Vandaag 0/10`, `Vandaag 3/10`, `Vandaag 10/10`. Claimable but unclaimed rewards do not increment `awardedToday`.

- [ ] **Step 2: Add compact top-right badge**

Keep it visible without increasing card height materially. Animate only the numeric change after confirmed claim.

- [ ] **Step 3: Synchronize app and widget**

Both app and widget read the same `MovementRadarNative` preference/day state and cannot increment independently on one installation. Refresh the widget after app claim and refresh the app after widget claim.

- [ ] **Step 4: Replace World target picker**

World shows only current goal, progress and `Open onderzoek`. Target selection/shop remain in Research Center.

- [ ] **Step 5: Test reset boundaries**

Amsterdam midnight, app restart, app/widget on the same installation, widget claim, failed claim, queued reward and max 10. Document that Health Connect claims remain device-scoped; cross-device claim unification is not introduced silently in 3.1 because old APKs/widgets have no compatible server claim receipt.

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
- Produces bundled lab, research machine, RP, Gem, scan pass, shop-item, role, PvE, Crown and silhouette assets.
- Consumes existing palette/style guide.

- [ ] **Step 1: Define asset sheet before generation**

Document dimensions, transparent/opaque requirement, intended component, mobile crop and fallback. Required assets:

- Research Lab room/hero with approved phone, tablet and desktop crops.
- Research machine split into front, chamber, light/effect and back layers for animation.
- Onderzoekspunten, BugGem and XP icons at 24/32/48/96 px.
- Extra Scanpas.
- Five habitat lures.
- Soortenradar, Onderzoeksboost and Missiewissel.
- Research contract folder, chapter path nodes and completion stamps.
- Generic locked Legendary/Mythical research silhouettes.
- `Zelf gevonden`, `Onderzocht`, `Legacy` and `Oude upgrade` visual badges.
- Veteran dossier seal, research background and Museum plaque without Crown styling.
- Purchasable `researcher_profile_frame`, `bugdex_research_frame`, `museum_research_pedestal` and alternate `research_lab_theme` layers.
- Five role icons plus compact boss weakness/recommended-role markers.
- Crowned/Elite/Master/Legend border, background, halo and Crown Hall hologram layers.
- Purchasable Aurora and Obsidian Crown-style overlays.
- Functional shop-item preview states: unavailable, available, selected and active/charges remaining.
- Bug Lamp text-free lamp icon, inactive/available/active glow states and a clear `gratis streakbeloning` visual distinct from the paid Gem shop.
- Cosmetic live-preview fixtures on Profile, BugDex, Museum, Research Lab and Crown surfaces.
- Empty, locked, offline and error illustrations for Research Center.

- [ ] **Step 2: Generate and review each asset separately**

Reject text embedded in artwork, checkerboards, wrong species, excessive glow, weak silhouettes, generic unrelated imagery, unreadable 24/32/48 px icons, crops that hide the focal object or visuals below the quality of the current best BugDex/Museum reward art. Reject any purchasable item that has no unique reviewed icon and no in-context preview asset/state.

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

### Task 21: Senior visual system, screen states and motion implementation

**Files:**
- Create: `src/theme/bugbaas31VisualTokens.ts`
- Create: `src/services/progression/rewardPresentationModel.ts`
- Create: `src/services/progression/rewardPresentationModel.test.ts`
- Create: `src/components/research/ResearchLabBackdrop.tsx`
- Create: `src/components/research/ResearchPath.tsx`
- Create: `src/components/research/ResearchPurchaseModal.tsx`
- Create: `src/components/research/ResearchEmptyState.tsx`
- Create: `src/components/rewards/ResearchChapterCompleteModal.tsx`
- Create: `src/components/rewards/ResearchFinaleModal.tsx`
- Create: `src/components/rewards/ShopPurchaseModal.tsx`
- Modify after Task 29 creates: `src/components/rewards/CrownRankModal.tsx`
- Modify after Task 29 creates: `src/components/rewards/CrownTrialCompleteModal.tsx`
- Modify after Task 29 creates: `src/components/CrownVisualPreview.tsx`
- Create: `docs/visual/bugbaas-3.1-screen-motion-spec.md`
- Modify: `src/screens/ResearchCenterScreen.tsx`
- Modify: `src/screens/research/ActiveResearchPanel.tsx`
- Modify: `src/screens/research/DuplicateResearchPanel.tsx`
- Modify: `src/screens/research/ResearchShopPanel.tsx`
- Modify: `src/screens/research/ResearchTargetPicker.tsx`
- Modify: `src/components/rewards/BugDiscoveryModal.tsx`
- Modify: `src/components/rewards/DuplicateResearchModal.tsx`
- Modify: `src/components/AnimatedBugArt.tsx`
- Modify: `src/screens/BugDexScreen.tsx`
- Modify: `src/screens/RealBugScanScreen.tsx`
- Modify: `src/screens/ProfileScreen.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/CollectionScreen.tsx`
- Modify: `src/screens/MuseumScreen.tsx`
- Modify: `src/services/i18n.tsx`

**Interfaces:**
- Produces `BugBaas31VisualTokens`, `RewardPresentation`, responsive screen-state models and deterministic motion modes `full|reduced|static_test`.
- Consumes exact server receipts, BugArt, research assets, `bugMotionModel` and accessibility/reduced-motion settings.

- [ ] **Step 1: Write the final screen/motion specification**

Document per surface: owner, position in navigation, hierarchy, primary CTA, loading/empty/error/locked/success states, popup sequence, motion preset, reduced-motion result, haptic moment and required screenshots. Copy section 2.12 verbatim as the minimum contract and add component names beside every state.

- [ ] **Step 2: Write failing presentation-model tests**

Require exact mapping from receipt type to popup, priority, button labels, motion duration and terminal state. Test at least:

```ts
assert.equal(presentationFor({ kind: "duplicate", hasNewFact: true }).modal, "duplicate_research");
assert.equal(presentationFor({ kind: "legendary_research_complete" }).maxDurationMs, 2200);
assert.equal(presentationFor({ kind: "mythic_research_complete", reducedMotion: true }).motionMode, "reduced");
```

- [ ] **Step 3: Implement shared visual tokens**

Define XP/RP/Gem icon use, spacing, corner radii, typography floors, overlay opacity, shadow/elevation bounds and rarity accents. Do not hardcode alternative colors inside individual 3.1 screens. Every currency control renders icon, localized label and numeric value.

- [ ] **Step 4: Implement responsive Research Center composition**

Phone uses one vertical workspace with sticky saldoheader and one dominant action. Tablet/desktop uses a bounded two-column layout: active research left, duplicates/shop right. Empty, loading, offline, insufficient-balance and completed states use dedicated art and actions rather than blank cards. Offline may show the last cached read-only saldo/progress with `Internet nodig om te kopen of onderzoeken`; spend, duplicate conversion and claims stay disabled and are never queued optimistically.

- [ ] **Step 5: Implement the complete popup set**

Implement new species, duplicate receive, duplicate research, batch receipt, research purchase, chapter complete, Legendary finale, Mythical finale, shop preview/purchase, Crown-rank reached, Crownproef complete, PvE squadpreview/result, level-up, one-time migration and compact later-legacy-sync presentations. Every modal must show what remains, what is spent and what is received before confirmation. Crown screens must say `Power verdiend` or `Alleen uiterlijk`; nooit suggereren dat Gems power kopen. A zero-delta legacy sync shows nothing. Server failure returns to a stable retryable state without changing the shown inventory/saldo.

- [ ] **Step 6: Implement deterministic animation states**

Use this state model:

```ts
type RewardMotionState =
  | "enter"
  | "bug_motion"
  | "confirm"
  | "research_machine"
  | "currency_transfer"
  | "fact_or_reward_reveal"
  | "stable_receipt";
```

`static_test` jumps to a named state for screenshots only in `__DEV__`/Playwright test builds, consumes local fixture receipts and cannot call reward endpoints or be enabled by a production query parameter. `reduced` crossfades without rotation, parallax, shake or particle flight. All timers and animation loops stop on unmount/background.

- [ ] **Step 7: Integrate function-specific art**

Use the Task 20 asset registry. Reject generic placeholder icons where a reviewed 3.1 asset exists. Verify 24/32/48 px currency legibility, phone/tablet hero crops, transparent edges and silhouettes. Apply cosmetic entitlements only to their exact surfaces: profile frame in Profile, research frame in BugDex, research podium in Museum, lab theme in Research Center and Crown style only around earned Crown visuals. Every product card opens an in-context live preview before purchase. An owned cosmetic card shows `In gebruik` or `Gebruiken`; every surface also offers `Standaard`. Text remains native UI and cosmetics never alter stats/layout hitboxes.

- [ ] **Step 8: Run visual acceptance**

Capture every row in section 5 in full, reduced and static-test mode where relevant. A senior UI review records hierarchy, spacing, contrast, art consistency, motion usefulness, final resting state and whether a ten-year-old can identify the primary action without coaching.

- [ ] **Step 9: Commit**

```bash
git add src/theme/bugbaas31VisualTokens.ts src/services/progression/rewardPresentationModel.ts src/services/progression/rewardPresentationModel.test.ts src/components/research src/components/rewards src/components/CrownVisualPreview.tsx src/components/AnimatedBugArt.tsx src/screens/ResearchCenterScreen.tsx src/screens/BugDexScreen.tsx src/screens/RealBugScanScreen.tsx src/screens/ProfileScreen.tsx src/screens/HomeScreen.tsx src/screens/CollectionScreen.tsx src/screens/MuseumScreen.tsx src/services/i18n.tsx docs/visual/bugbaas-3.1-screen-motion-spec.md
git commit -m "feat: implement BugBaas 3.1 visual and motion system"
```

### Task 22: Old APK compatibility and continuous legacy reconciliation

**Files:**
- Create: `firebase/functions/legacyCompatibilityCore.js`
- Create: `firebase/functions/legacyCompatibilityCore.test.js`
- Create: `src/services/progression/legacyCompatibilityService.ts`
- Create: `src/services/progression/legacyCompatibilityService.test.ts`
- Create: `scripts/qa/bugbaas31-old-new-client.spec.ts`
- Create: `docs/reviews/bugbaas-3.1-old-apk-compatibility.md`
- Modify: `firebase/functions/index.js`
- Modify: `firebase/functions/economyCore.js`
- Modify: `firebase/functions/migrationCore.js`
- Modify: `src/services/userService.ts`
- Modify: `src/services/bugBrainRewardService.ts`
- Modify: `src/services/bugDexService.ts`
- Modify: `src/services/bugService.ts`
- Modify: `src/services/bugSmashDuelService.ts`
- Modify: `src/services/dailyMissionService.ts`
- Modify: `src/services/weeklyMissionService.ts`
- Modify: `src/services/researchTargetService.ts`
- Modify: `App.tsx`
- Modify: `firestore.rules`
- Modify: `tests/firestore/bugbaas31.rules.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces HTTPS endpoints `reconcileLegacyXp` and `reconcileLegacyProgress`, an idempotent root-user XP onUpdate trigger, plus an idempotent BugDex-unlock create trigger using event ID `discovery:<bugId>`.
- Consumes existing root `totalPoints`, inventory/unlock/mastery/Buddy/trade/Museum/legacy-research data and 3.1 economy/migration state.

- [ ] **Step 1: Write failing compatibility fixtures**

Cover old client before first migration, old client after migration, old XP above new lifetime XP, old XP below permanent lifetime XP, new species from old client, duplicate from old client, old combine, veteran-bracket crossing, legacy-research progress, old-client mastery/battle-win increase crossing every Mythische Crown threshold and two-device retries.

- [ ] **Step 2: Prove the root schema remains unchanged**

Rules tests must show the current old-profile `setDoc`/`updateDoc` field sets still pass and no new root field is required. Add a regression that an old display-name update does not delete or block 3.1 economy because all new values live in subcollections.

- [ ] **Step 3: Implement monotone XP trigger and reconciliation**

Add a root-user onUpdate trigger that does nothing before the 3.1 migration exists. After migration, compare the changed `totalPoints` with `economy/state.lifetimeXp`: copy a higher legacy value into lifetime XP with event-ID derived from the Firestore trigger event; restore a lower legacy value to the lifetime floor without changing other profile fields; return immediately when equal. Add loop-prevention, retry and concurrent-new-reward tests.

The HTTPS repair endpoint uses the same pure rule inside one transaction:

```text
floor = max(existing economy lifetimeXp, existing root totalPoints)
write economy lifetimeXp = floor
write root totalPoints = floor only when lower
write one reconciliation event/status timestamp
```

Call the cheap HTTPS repair after authentication, on every foreground and immediately after every Task 3 class-B legacy client XP write before 3.1 presents the final XP receipt. It repairs a missed/delayed trigger; network failure leaves the last local view readable, marks the XP receipt as `wordt gesynchroniseerd` and retries later. It never applies a client-calculated lifetime balance. Return a signed delta receipt. The UI stays silent for a zero delta and queues one compact `Voortgang bijgewerkt` receipt for positive legacy XP/RP/species/bracket changes; it never repeats the full migration wizard.

- [ ] **Step 4: Wire every direct client XP writer from the audit**

Update the exact Task 3 class-B files: `userService`, `bugBrainRewardService`, `bugDexService`, `bugService`, `bugSmashDuelService`, `dailyMissionService` and `weeklyMissionService`. Keep their legacy `totalPoints` write shape for old-schema compatibility, then call `reconcileLegacyXp` before presenting the final 3.1 XP state. A retry may reconcile but may not repeat the original reward write. Add one focused test per service and one combined app flow.

- [ ] **Step 5: Implement lazy first migration from the latest old state**

The first 3.1-open reads the current server state at that moment, not build/install time. Store `baselineOwnedBugIds`, `lastOwnedCount`, veteran bracket and legacy-research reference. Do not create per-species historical RP events for baseline species; grant the bounded veteran package once.

- [ ] **Step 6: Handle new old-client unlocks after migration**

An on-create trigger for `bugdexUnlocks/{bugId}` checks whether migration exists and writes the deterministic discovery-RP/acquisition event once. The same event ID is used by 3.1 grant paths so trigger and direct server reward cannot double-pay. Existing-species duplicate updates do not grant discovery RP. `reconcileLegacyProgress` runs at appstart/day-change, compares current unlock IDs with baseline plus existing discovery events when counts changed and repairs a trigger/migration race exactly once.

- [ ] **Step 7: Reconcile veteran and legacy research progress**

On 3.1 foreground, compare the current unique-species count to the last granted bracket and grant only the difference. Read legacy Research Target live; never copy it into a second independently writable progress counter. A completed unclaimed legacy reward remains claimable once. Re-read current mastery/wins for owned Mythicals; a higher calculated Crown power-rank only opens the corresponding free visual trial and never auto-completes it or writes a new root field.

- [ ] **Step 8: Preserve old combine and shared inventory safety**

Do not remove old combine endpoints/Rules. New duplicate research creates no long-lived inventory reservation; confirmation re-reads inventory, open trades and the player's selected species transactionally. If an old combine changed counts after preview, return an updated preview rather than negative inventory or partial currency.

- [ ] **Step 9: Run the two-client matrix**

Use old 3.0.7 on device/emulator A and 3.1 on B with the same testaccount. Add `test:3.1:compat` as `playwright test scripts/qa/bugbaas31-old-new-client.spec.ts`. Perform the exact eight-step flow in section 2.13, including XP both directions, new bug, duplicate, mastery, Crown-threshold crossing, old research and old combine. Verify existing Crown power is identical, a new earned rank appears as a pending free visual trial, Crown style/loadout remains separate and no visual reward is duplicated. Then update A normally to 3.1 and verify all data. Record Firestore documents before/after without secrets.

- [ ] **Step 10: Commit**

```bash
git add firebase/functions/legacyCompatibilityCore.js firebase/functions/legacyCompatibilityCore.test.js firebase/functions/index.js firebase/functions/economyCore.js firebase/functions/migrationCore.js src/services/progression/legacyCompatibilityService.ts src/services/progression/legacyCompatibilityService.test.ts src/services/userService.ts src/services/bugBrainRewardService.ts src/services/bugDexService.ts src/services/bugService.ts src/services/bugSmashDuelService.ts src/services/dailyMissionService.ts src/services/weeklyMissionService.ts src/services/researchTargetService.ts App.tsx firestore.rules tests/firestore/bugbaas31.rules.test.mjs scripts/qa/bugbaas31-old-new-client.spec.ts docs/reviews/bugbaas-3.1-old-apk-compatibility.md package.json package-lock.json
git commit -m "feat: keep old BugBaas APK progress compatible"
```

### Task 23: Change-impact, permission and no-regression gate

**Files:**
- Create: `docs/reviews/bugbaas-3.1-change-impact-map.md`
- Create: `scripts/verify-bugbaas31-impact-map.mjs`
- Modify: `.github/workflows/bugbaas-3-1-verify.yml`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tests/firestore/bugbaas31.rules.test.mjs`

**Interfaces:**
- Produces `npm run verify:3.1:impact` and a machine-readable map from changed shared files to protected flows/tests.
- Consumes Git diff, test filenames, Rules blocks and the required functional/screenshot matrices.

- [ ] **Step 1: Build the change-impact map**

For every shared file touched by 3.1, document owner, changed behavior, protected old behavior, required unit/server/Rules/E2E tests and required screenshots. Include at least `App.tsx`, `BugDexScreen`, `RealBugScanScreen`, `BugSmashDuelScreen`, `SwarmSiegeScreen`, `NestDefenseGame`, `bugSquadService`, `bugSquadGameBalance`, `bugCrownService`, `pointsService`, `userService`, `bugDexService`, `researchTargetService`, `firebase/functions/index.js` and `firestore.rules`.

- [ ] **Step 2: Write a failing map verifier**

Fail when a mapped shared file changes but its required test command or screenshot row is absent. Fail when `firestore.rules` changes without both a new-path permission test and old-contract regression test.

- [ ] **Step 3: Add the full old-permission contract**

Automate allow/deny assertions for old profile, inventory, unlock, mastery, Buddy, trade, movement, mission, Arcade, Journal-read and Research Target paths. New economy/research/migration paths remain client-write denied.

- [ ] **Step 4: Add neighboring runtime gates**

A change to a reward pipeline must run Trade, Museum, Squad, Campaign, Ranked and all Arcade launch tests. A change to power/Crown/PvE files must run pure client/server vector parity, Ranked no-power, Solo, Zwermbeleg, Crown trial, old-APK threshold, Museum Kroonzaal and cosmetic no-stats tests. A change to Scan/Journal must run auth, receipt, quota, CORS, location and proxy tests. A visual/shop change must run every affected item preview row plus reduced-motion state.

- [ ] **Step 5: Wire CI and local verification**

Add both `verify:3.1:impact` and `test:3.1:compat` to the release-level verification path. CI uploads failing screenshots, traces, rule-test output, compatibility output and the impact report. Missing credentials may skip authenticated external smoke tests only with an explicit `NOT_RUN` report; they cannot be marked PASS or release-ready.

- [ ] **Step 6: Commit**

```bash
git add docs/reviews/bugbaas-3.1-change-impact-map.md scripts/verify-bugbaas31-impact-map.mjs .github/workflows/bugbaas-3-1-verify.yml package.json package-lock.json tests/firestore/bugbaas31.rules.test.mjs
git commit -m "test: require BugBaas change impact and permission proof"
```

### Task 24: Full functional Playwright suite and neighboring regressions

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

Use separate accounts for new, normal, veteran, many duplicates, many Mythicals, open trade, active legacy research, active Buddy task, pending Journal sync, insufficient RP/Gems, no duplicates, completed research and an old-APK/new-APK shared account.

- [ ] **Step 2: Implement core end-to-end flows**

- Receive new bug.
- Receive duplicate, choose `Later beslissen`, then later trade it or research it from the Duplicate panel.
- Receive duplicate, research it.
- Batch research with exclusion.
- Unlock fact.
- Open the unique effect/live preview and buy each RP/Gem shop item with a dedicated fixture; verify price, post-purchase balance, active/equipped state and `Standaard` reset.
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
- Research Center loading, empty, offline, locked, insufficient balance, completed and many-duplicates states.
- Research purchase confirmation with cost, post-purchase balance and guaranteed reward.
- Chapter-complete, Legendary-finale and Mythical-finale stable receipts.
- Full-motion, reduced-motion and deterministic static screenshot states.
- Bugdetail explains Kracht, Training, role, `Goed in` and Mythical special without rarity stars.
- Squad picker shows individual/total Kracht, event recommendations and exact role contribution.
- Zwermbeleg starts with server squad snapshot and ends with per-bug contribution receipt.
- Crown rank opens the correct free visual trial; claim is idempotent; Aurora/Obsidian remain cosmetic-only.
- Ranked result remains identical when only Kracht/Crown/cosmetic style changes.
- Upgrade-smid appears only for an existing owner as a legacy/pioneer badge.
- Old APK earns progress and crosses a Crown threshold after migration; 3.1 reconciles exactly once.

- [ ] **Step 3: Add neighboring regression flows**

- World Today, draggable map, private findings, biome/search zones, Bug Lamp, Movement Radar and Daily/Weekly missions.
- Team Hunt, Swarm Siege, Weekvondst and Release Boss loading/error/active/result states without required-endpoint CORS failures; Release Boss contribution remains observation-only and ignores squadpower.
- Trade before/after duplicate conversion, including multi-trade and accepted-trade mastery copy.
- Museum placement, claim, Prestige/Crown Hall and Journal navigation.
- Squad editing, mastery skills, Training/Kracht presentation, role recommendations, Crown visuals and Buddy expeditions.
- Solo Campaign wave/boss/reward persistence.
- Ranked matchmaking and duel completion with two users.
- All Arcade modes launch, play a smoke action, return and leave their existing reward/high-score contracts intact.
- Profile/title/character/badges/team/organization/settings/help-tour access.
- Notification and deep-link routes to Duel, Scan, Collection, Journal and events.
- App restart, background/foreground, offline/reconnect and pending reward persistence.
- Android Movement/Buddy widget state where platform test is available.
- Existing old profile/display-name writes after new subcollections exist.
- Existing inventory, mastery, Buddy, trade, Museum and legacy Research Target permissions.
- Existing foreground reward queue, badge/rank popups and notification deep links.

- [ ] **Step 4: Add console/network gates**

Fail on unexpected console errors, page errors, unhandled request failures or 4xx/5xx responses from required 3.1 endpoints. Explicitly allow expected 401 tests only in dedicated unauthenticated cases.

- [ ] **Step 5: Produce before/after visual report**

For every required screen and viewport, link before and after screenshots and record PASS/FAIL for clipping, hierarchy, tap target, contrast, art quality, motion usefulness, stable end state and child comprehension. Compare the new art/popup quality directly with the current BugDex/Museum/Legendary reference screenshots; a technically correct but visibly cheaper or generic result is FAIL.

- [ ] **Step 6: Commit**

```bash
git add scripts/qa playwright.config.ts docs/reviews/bugbaas-3.1-visual-qa.md
git commit -m "test: cover BugBaas 3.1 end to end"
```

### Task 25: Android emulator/device QA and performance proof

**Files:**
- Create: `docs/reviews/bugbaas-3.1-android-qa.md`
- Update: `TESTRESULTS.md`

**Interfaces:**
- Produces device evidence, screenshots, UI trees, logcat and performance notes.
- Consumes an internal APK built only after explicit owner approval for a local test build.

- [ ] **Step 1: Run small phone emulator**

Validate 360×800-equivalent layout, camera permission states, location permission, Journal retry, all Research Center states, duplicate later-decide/research animation, fact reveal, every shop item preview/purchase, Legendary/Mythical finales, Kracht/role cards, Crown rank/trial/style states, Zwermbeleg squadpreview/result, migration onboarding, Buddy picker, Movement `Vandaag x/10` and Tap Duel. Capture normal and reduced-motion variants.

- [ ] **Step 2: Run tablet emulator**

Validate 768×1024-equivalent layout, intended two-column Research Center, no stretched art/cards, bounded grids, readable shop/Crown/PvE popups, correct hero/Crown/shop preview crops and Tap Duel safe area.

- [ ] **Step 3: Run one physical Android device**

Validate camera, location, Health Connect/movement, widget sync, touch latency, sound, haptics, animation end states and app background/restore. Keep a second emulator/device on old 3.0.7 for the compatibility matrix and verify both clients can remain active on the same account.

- [ ] **Step 4: Capture performance evidence**

Use `gfxinfo`/Perfetto or equivalent for Tap Duel, duplicate research, Research Center/shop previews, Zwermbeleg with role/special effects and Legendary/Mythical/Crown reward animations. Compare to the pre-3.1 baseline and record missed frames/input issues rather than claiming smoothness from code inspection. Low-end mode must stay responsive with the bounded particle/blur rules from section 2.12.

- [ ] **Step 5: Record permissions**

Confirm required camera/location permissions remain, and microphone, overlay and legacy storage permissions remain absent.

- [ ] **Step 6: Commit QA report**

```bash
git add docs/reviews/bugbaas-3.1-android-qa.md TESTRESULTS.md
git commit -m "docs: record BugBaas 3.1 Android QA"
```

### Task 26: Security, concurrency and migration release rehearsal

**Files:**
- Modify: `tests/firestore/bugbaas31.rules.test.mjs`
- Create: `scripts/qa/bugbaas31-concurrency.mjs`
- Create: `docs/reviews/bugbaas-3.1-migration-rehearsal.md`
- Update: `TESTRESULTS.md`

**Interfaces:**
- Produces proof for double-submit, two-device and rollback conditions.
- Consumes emulator/test-project data only.

- [ ] **Step 1: Run two-device races**

Race duplicate research, shop purchase/equip/reset, Crown visual trial start/claim, Swarm run start/submit, old Research Target start versus new main-contract start, research claim, scan pass purchase, migration, old/new XP reconciliation, old-client unlock/Crown-threshold trigger, veteran-bracket grant and Journal retry. Assert one authoritative result, one immutable event per event-ID, one immutable PvE squad snapshot and no negative/inconsistent state.

- [ ] **Step 2: Run permissions matrix**

Owner read, other-user denial, client-write denial and server-write success for every new path, including `crownTrials`, cosmetic entitlement/loadout and server run snapshots. Re-run the complete old-client permission contract from Task 23, including old root profile writes, inventory/unlock, mastery, Buddy, trade, movement, missions, Arcade, Journal-read and Research Target. A new permission may never be justified only by making the UI work.

- [ ] **Step 3: Rehearse migration on a sanitized copy**

Run preview, inspect outliers, apply migration once, re-run, compare all protected fields and simulate rollback/feature-flag disable while additive data remains. Then let a 3.0.7 client earn more XP, a new species, duplicate, legacy-research progress and enough mastery/PvE wins to cross a Crown threshold. Prove the next 3.1 reconciliation adds only the real delta, preserves Crown power and opens but does not auto-complete the visual trial.

- [ ] **Step 4: Verify old-client behavior**

Old client may ignore new subcollections but must continue all supported actions without crash, CORS error or permission denial. Verify old profile full writes do not touch new economy/Crown data, new 3.1 XP remains visible through legacy `totalPoints`, old mastery/wins remain valid inputs for derived Kracht/Crown, old combine cannot create negative inventory, and old endpoints/Rules remain available. There is no automatic old-path removal in 3.1.

- [ ] **Step 5: Document pass/fail and commit**

```bash
git add tests/firestore/bugbaas31.rules.test.mjs scripts/qa/bugbaas31-concurrency.mjs docs/reviews/bugbaas-3.1-migration-rehearsal.md TESTRESULTS.md
git commit -m "test: rehearse BugBaas 3.1 security and migration"
```

### Task 27: Documentation, help and child comprehension test

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

Help explains XP, Onderzoekspunten, BugGems, duplicates, research, Zelf gevonden, Kracht, Training, rollen, PvE, Mythische specials, Crown-power versus Crown-uiterlijk and why one bug always remains safe. It states `Later beslissen = later ruilen of onderzoeken`, `Kracht werkt alleen in PvE` and `Gems kopen geen power`. It no longer teaches combining/upgrading in 3.1, but an old-APK user who later updates receives the migration explanation instead of an unexplained disappearance.

- [ ] **Step 2: Run comprehension review**

Use at least five testers unfamiliar with the rework, preferably including younger users/parents. Ask them without coaching to: explain XP/RP/Gems; find Onderzoekscentrum; explain `Later beslissen`; preserve, trade and research a duplicate; start simple research; identify the guaranteed Legendary route; explain Kracht versus Training; select a role that fits a boss; tell what each squadbug did after Zwermbeleg; explain why Release Boss uses real findings instead of Kracht; distinguish earned Crown-power, free Crownproef and paid cosmetic Crown-style; understand `Vandaag x/10`; recover a Journal error; and explain what happened to old Upgrades/Upgrade-smid. Require at least 4/5 correct on every core task before release; record misunderstood words/actions and revise copy/layout.

- [ ] **Step 3: Update decisions and status honestly**

Mark every subsystem `complete`, `partial`, `deferred` or `not built`, with proof links. Do not write `complete in source` as equivalent to runtime-complete.

- [ ] **Step 4: Run localization checks**

No hardcoded visible Dutch/English/French copy in new shared UI. Dynamic species/user names remain untouched.

- [ ] **Step 5: Commit**

```bash
git add src/components/HelpTourOverlay.tsx src/components/HelpTourOverlayModel.ts src/services/i18n.tsx README.md STATUS.md DECISIONS.md CHANGELOG.md TESTRESULTS.md 3.0_FEATURE_STATUS.md
git commit -m "docs: explain and record BugBaas 3.1"
```

### Task 28: Final verification and explicit release preparation

**Files:**
- Modify only after approval: `package.json`, `package-lock.json`, `app.json`, `android/app/build.gradle`
- Create: `docs/reviews/bugbaas-3.1-release-readiness.md`

**Interfaces:**
- Produces a release candidate, not an automatic deployment.
- Consumes all prior QA reports.

- [ ] **Step 1: Run complete verification**

```bash
npm run verify:3.1
npm run verify:3.1:impact
npm run test:3.1:compat
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
- Kracht or Crown-power purchasable with RP, Gems or euro's.
- Ranked/PvP score changes when only Kracht/Crown changes.
- Client-supplied PvE power, special, Crown or damage accepted by the server.
- A purchasable item without unique reviewed art and effect/live-surface preview.
- Crown Gem style usable without a previously earned Crown visual.
- `evolutionLevel` or a second hidden rarity table used by active 3.1 power code.
- Upgrade-smid newly unlockable or shown as an unmet modern objective.
- Root-user schema changed in a way that blocks an old 3.0.7 profile write.
- Old APK permission/CORS/runtime regression.
- Old-APK progress after migration not reconciled or reconciled twice.
- New 3.1 XP not mirrored to legacy `totalPoints`.
- Missing loading/empty/error/locked/success screenshots for a new surface.
- New artwork or animation reviewed as visibly below the existing BugDex/Museum quality floor.
- Reduced-motion or low-end Android path missing/broken.
- 3.1 APK signer differs from `dist/BugBaas-3.0.7.apk` or in-place update loses app data.

- [ ] **Step 4: Prepare version only after explicit approval**

Set versionName/package/app version to `3.1.0` and Android versionCode to `317`. Build output does not imply permission to publish.

- [ ] **Step 5: Produce release-readiness report**

Record exact test counts, commands, screenshots, APK metadata if locally built, signing verification, known limitations and explicit untested items. Compare the 3.1 signer certificate directly with `dist/BugBaas-3.0.7.apk` and prove an in-place Android update succeeds without uninstall or local-data loss; a build signed with a different key is a release blocker.

- [ ] **Step 6: Commit release metadata**

```bash
git add package.json package-lock.json app.json android/app/build.gradle docs/reviews/bugbaas-3.1-release-readiness.md
git commit -m "release: prepare BugBaas 3.1.0"
```

No Firebase deploy, Vercel promotion, APK distribution or store upload occurs without a separate explicit owner instruction.

### Task 29: Shared Bug Power, Crown trials and PvE event integration

> **Execution dependency:** Run this task after Tasks 16 and 20, and before Tasks 17–19 and 21, even though it is placed here to avoid renumbering the already approved task IDs.

**Files:**
- Create: `src/services/progression/bugPowerModel.ts`
- Create: `src/services/progression/bugPowerModel.test.ts`
- Create: `src/services/progression/crownTrialModel.ts`
- Create: `src/services/progression/crownTrialModel.test.ts`
- Create: `src/components/BugPowerBadge.tsx`
- Create: `src/components/BugPowerBadge.test.ts`
- Create: `src/components/CrownTrialCard.tsx`
- Create: `src/components/CrownVisualPreview.tsx`
- Create: `src/components/rewards/CrownRankModal.tsx`
- Create: `src/components/rewards/CrownTrialCompleteModal.tsx`
- Create: `shared/bugbaas31-pve-catalog.json`
- Create: `firebase/functions/bugPowerCore.js`
- Create: `firebase/functions/bugPowerCore.test.js`
- Create: `firebase/functions/crownTrialCore.js`
- Create: `firebase/functions/crownTrialCore.test.js`
- Create: `docs/reviews/bugbaas-3.1-pve-balance.md`
- Create: `docs/reviews/bugbaas-3.1-obsolete-feature-audit.md`
- Modify: `src/services/bugSquadService.ts`
- Modify: `src/services/bugSquadGameBalance.ts`
- Create: `src/services/bugSquadGameBalance.test.ts`
- Modify: `src/services/bugSquadHelperInfo.ts`
- Create: `src/services/bugSquadHelperInfo.test.ts`
- Modify: `src/services/bugDexService.ts`
- Modify: `src/services/bugCrownService.ts`
- Modify: `src/services/bugMasteryService.ts`
- Modify: `src/services/swarmSiegeService.ts`
- Modify: `src/screens/SwarmSiegeScreen.tsx`
- Modify: `src/components/swarm/SwarmAssaultGame.tsx`
- Modify: `src/components/minigames/NestDefenseGame.tsx`
- Modify: `src/screens/BugSmashDuelScreen.tsx`
- Modify: `src/screens/BugDexScreen.tsx`
- Modify: `src/screens/ProfileScreen.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/CollectionScreen.tsx`
- Modify: `src/components/AppHud.tsx`
- Modify: `src/components/AppHudModel.ts`
- Modify: `src/components/TierBadge.tsx`
- Modify: `src/components/collection/MasteryTeamChallengeCard.tsx`
- Modify: `src/screens/MuseumScreen.tsx`
- Modify: `src/services/pointsService.ts`
- Modify: `src/services/characterService.ts`
- Modify: `src/services/masteryTeamChallengeModel.ts`
- Modify: `src/services/bugLampService.ts`
- Modify: `src/services/i18n.tsx`
- Modify: `firebase/functions/index.js`
- Modify: `firestore.rules`
- Modify: `tests/firestore/bugbaas31.rules.test.mjs`

**Interfaces:**
- Produces `trainingStarsForMasteryLevel`, `powerForBug`, `roleStrengthForBug`, `pvePowerMultiplier`, `buildPveSquadSummary`, `rankedPowerMultiplier`, `CrownTrialState`, endpoints `crownTrialStatus`, `startCrownTrial`, `claimCrownTrialVisual`, and server-side PvE squad snapshots.
- Consumes existing rarity, mastery level/role, battle wins, active squad, inventory, Crown thresholds, event catalog, cosmetic entitlements and existing PvE run IDs.

- [ ] **Step 1: Write failing pure Kracht tests**

Require exact values:

```ts
assert.equal(powerForBug({ rarity: "Gewoon", masteryLevel: 1 }), 60);
assert.equal(powerForBug({ rarity: "Gewoon", masteryLevel: 17 }), 80);
assert.equal(powerForBug({ rarity: "Mythisch", masteryLevel: 1 }), 80);
assert.equal(powerForBug({ rarity: "Mythisch", masteryLevel: 17 }), 100);
assert.equal(pvePowerMultiplier(60), 1);
assert.equal(pvePowerMultiplier(100), 1.2);
assert.equal(rankedPowerMultiplier({ power: 100, crownMultiplier: 1.1 }), 1);
```

Test all mastery boundaries 1/4/5/8/9/12/13/16/17/20 and every rarity. Reject non-finite values and clamp to Kracht 60–100.

Run:

```bash
npx tsx --test src/services/progression/bugPowerModel.test.ts
```

Expected: FAIL because the model does not exist.

- [ ] **Step 2: Implement one shared client power model**

Implement the exact section 2.15 tables. Export a full `BugPowerSummary`; never read `evolutionLevel`. Remove the standalone `rarityScale` calculation from `bugSquadService.ts`; squad helper values consume `roleStrengthForBug` from the shared model and retain all existing caps. Move the current hardcoded `mythicSpecialByBugId` and rarity-based helper timing/hits from `bugSquadHelperInfo.ts` behind the validated shared PvE catalog/power model, while preserving the exact Ranked caps unless the balance report explicitly changes them.

Add a source guard test that fails when active 3.1 power/squad files read `evolutionLevel` or define a second rarity-to-power table outside `bugPowerModel.ts`/the shared catalog.

- [ ] **Step 3: Write and validate the PvE catalog**

`shared/bugbaas31-pve-catalog.json` contains:

- One entry for every Mythische bug with existing bug ID.
- One fixed special ID.
- Supported modes.
- Cooldown/once-per-run rule.
- Target kind.
- Numeric cap.
- Text/visual key.
- Boss role recommendations per Swarm phase/event.

Validation rejects unknown bugs, duplicate special ownership, unsupported role IDs, negative durations, caps above the documented maximum and any paid-only special.

- [ ] **Step 4: Mirror power calculation server-side**

`bugPowerCore.js` uses the same constants/catalog and tests the same vectors as the TypeScript model. At `startSwarmSiegeRun`, the server reads active squad, owned inventory, current mastery and Crown rank and returns an additive signed summary:

```ts
{
  squadSnapshotId: string;
  squad: BugPowerSummary[];
  totalPower: number;
  recommendedRoles: string[];
  expiresAt: string;
}
```

The snapshot is immutable for that run. `submitSwarmSiegeRun` accepts only existing run ID and base game score; the server loads the snapshot and computes bounded personal/community damage. It ignores client-supplied power, mastery, role, special, Crown and damage multipliers.

Keep all existing response fields so old clients still parse the event.

- [ ] **Step 5: Integrate PvE roles and specials without changing Ranked**

Use the server summary for Zwermbeleg result calculation and matching local presentation in `NestDefenseGame`. Apply:

- Attack to bossdamage.
- Speed to helper/tower cooldown.
- Shield to starting nest HP.
- Chaos to swarm/secondary damage.
- Support to bounded startresources/recharge.
- Mythical special according to the catalog.
- Crown multiplier only to PvE contribution.

`BugSmashDuelScreen` may keep existing capped helper behavior and Mythische visual specials, but test that Ranked/PvP never calls `pvePowerMultiplier`, applies Crown damage or multiplies score from displayed Kracht.

- [ ] **Step 6: Implement Crown trial state and endpoints**

Keep existing automatic Crown power thresholds unchanged. `crownTrialStatus` derives `earnedRank` from current rarity/mastery/wins and reads server-written visual progress.

`startCrownTrial(bugId, rank)` verifies:

- Bug is owned and Mythisch.
- Rank power requirement is already earned.
- Previous visual rank is complete.
- No same-rank trial was already completed.

It stores deterministic baseline/evidence state in `crownTrials/{bugId}`. New 3.1 PvE result endpoints write immutable evidence events for used bugs. Required evidence:

- crowned: 1 PvE win.
- elite: 3 additional PvE wins.
- master: 1 boss/event win, with Solo Campaign boss as permanent alternative.
- legend: 3 boss/event wins.

`claimCrownTrialVisual` verifies evidence and advances `visualRank` once. It gives no XP, RP, Gems or power. Retry returns the same receipt.

- [ ] **Step 7: Add Crown legacy compatibility**

At migration/reconciliation, existing calculated Crown power remains untouched. A player with an already earned rank sees its visual trial available. If mastery/wins later rise through an old APK, `crownTrialStatus` derives the higher earned rank on next read without duplicating visual rewards or requiring new root fields.

Do not alter the Museum Kroonzaal, season trophies or existing Crown Hall rewards.

- [ ] **Step 8: Implement child-facing Bug Power and Crown UI**

`BugPowerBadge` renders:

```text
Kracht 90
Training ★★★
Rol: Schild
Goed in: bosses en nestbescherming
```

Use it on BugDex detail, squad selection and event preview. Rarity is a word/color badge only. Advanced detail may still show raw mastery level/XP.

`CrownTrialCard` distinguishes:

- `Kracht-rang verdiend`.
- `Gratis Crownproef klaar`.
- `Visual vrijgespeeld`.
- `Alleen uiterlijk` for Gem style variants.

Replace `CrownUpgradeModal` with `CrownRankModal` and `CrownTrialCompleteModal`. Reuse `CrownGlow` only after the visual-quality review.

- [ ] **Step 9: Add mandatory squad preview and per-bug result receipt**

Zwermbeleg shows boss goal, attempts, reward, recommended roles, three selected bugs, individual/total Kracht, role effects, Mythical special and Crown bonus before `Start aanval`.

After submit, show the server receipt per bug: contribution, role/special triggers, Training XP, battle win and Crown trial progress. A ten-year-old must be able to answer `Wat deed mijn bug?` from this screen.

Release Boss remains unchanged except help text explicitly says that real findings, not squadpower, fill its meter.

- [ ] **Step 10: Implement Crown and shop visual previews**

Create free visual layers for all four Crown ranks and live previews for default/Aurora/Obsidian styles. `ShopItemPreviewModal` must render Crown styles around an earned sample visual; without any earned Crown, preview remains visible but purchase is disabled. Every purchasable item from section 2.7 must have a unique reviewed icon and either an effect demo or real-surface before/after preview.

- [ ] **Step 11: Add Firestore Rules tests**

For `crownTrials` prove:

- Owner read PASS.
- Other-user read DENY.
- Normal client create/update/delete DENY.
- Admin/Function emulator write PASS.
- Existing root profile, mastery, inventory, Museum, trade and old combine writes remain unchanged.

No Kracht field is stored on inventory/root user. All Kracht is derived from protected existing data and catalog constants.

- [ ] **Step 12: Complete the obsolete-feature audit**

Run code searches for every row in section 2.16 and write file/line evidence plus one status:

- `KEEP`.
- `REPLACE_IN_3_1_UI`.
- `LEGACY_ONLY`.
- `DEPRECATE_DATA_BUT_KEEP`.

Specific required outcomes:

- Upgrade-smid is hidden from nonowners and renamed for existing owners.
- `upgradedBugDexCount` and combine Rules remain.
- `evolutionLevel` remains in catalog but no 3.1 power path reads it.
- Rarity stars are absent from active 3.1 cards/details.
- Museum Kroonzaal and Release Boss remain functional.
- Active Home/Profile HUD no longer shows old `userTiers`/TierBadge/root `title` as a second level; legacy titles remain visible in a read-only overview and old APK behavior remains intact.
- `minPoints`/`minBugs` rank-unlocks remain callable for old APKs but are never presented as a 3.1 unlock route; active 3.1 reward/target selection does not call `isBugDexEntryUnlocked` to auto-grant species.
- Old points badges remain achievements; Upgrade-smid is the only owner-only frozen legacy badge.
- Point/badge characters remain unlocked using `max(lifetimeXp, totalPoints)` and never relock; the 3.1 filter says `XP` instead of implying an old pointsrank.
- Old `userTiers` titles remain visible as legacy history, but active HUD/Profile level comes only from Onderzoekerslevel and no unnecessary title-selection store is added.
- An active old Research Target blocks a second main research and remains claimable.
- Bug Lamp keeps its fixed streak reward/effect, gains reviewed lamp art and is clearly not a shop purchase.
- Mastery Team Challenge shows Training ★★/★★★/★★★★★ while preserving existing level thresholds and frames.
- Veteran research cosmetics do not overlap Crown visuals.

- [ ] **Step 13: Run balance simulations**

Simulate at least these squads in Solo/Swarm fixtures:

- Three one-star Common bugs.
- Three five-star Common bugs.
- Balanced Epic/Legendary roles.
- Three untrained Mythicals.
- Three five-star Mythicals.
- Maximum Crown Legend squad.
- Recommended-role Epic squad versus wrong-role Mythical squad.

Require:

- Fully trained Common squad remains viable.
- Recommended-role Epic/Legendary can outperform wrong-role Mythical.
- Maximum power/Crown never exceeds server caps or trivializes boss target.
- Ranked result remains identical when only Kracht/Crown changes.
- No purchased cosmetic changes any numeric result.

Record exact inputs, outputs and accepted ranges in `docs/reviews/bugbaas-3.1-pve-balance.md`.

- [ ] **Step 14: Run focused and neighboring tests**

```bash
npx tsx --test src/services/progression/bugPowerModel.test.ts src/services/progression/crownTrialModel.test.ts src/components/BugPowerBadge.test.ts src/services/bugSquadService.test.ts src/services/bugSquadGameBalance.test.ts src/services/bugSquadHelperInfo.test.ts src/services/bugCrownService.test.ts src/services/bugDexService*.test.ts
npm --prefix firebase/functions test
npm run test:3.1:rules
npm run test:3.1:functional
npm run test:3.1:visual
npm run typecheck
git diff --check
```

Also play one Solo Campaign run, one Tap Duel training run, one Ranked duel with two accounts, one Zwermbeleg run and open Release Boss.

- [ ] **Step 15: Commit**

```bash
git add src/services/progression/bugPowerModel.ts src/services/progression/bugPowerModel.test.ts src/services/progression/crownTrialModel.ts src/services/progression/crownTrialModel.test.ts src/components/BugPowerBadge.tsx src/components/BugPowerBadge.test.ts src/components/CrownTrialCard.tsx src/components/CrownVisualPreview.tsx src/components/rewards/CrownRankModal.tsx src/components/rewards/CrownTrialCompleteModal.tsx shared/bugbaas31-pve-catalog.json firebase/functions/bugPowerCore.js firebase/functions/bugPowerCore.test.js firebase/functions/crownTrialCore.js firebase/functions/crownTrialCore.test.js src/services/bugSquadService.ts src/services/bugSquadGameBalance.ts src/services/bugSquadGameBalance.test.ts src/services/bugSquadHelperInfo.ts src/services/bugSquadHelperInfo.test.ts src/services/bugDexService.ts src/services/bugCrownService.ts src/services/bugMasteryService.ts src/services/swarmSiegeService.ts src/screens/SwarmSiegeScreen.tsx src/components/swarm/SwarmAssaultGame.tsx src/components/minigames/NestDefenseGame.tsx src/screens/BugSmashDuelScreen.tsx src/screens/BugDexScreen.tsx src/screens/ProfileScreen.tsx src/screens/HomeScreen.tsx src/screens/CollectionScreen.tsx src/components/AppHud.tsx src/components/AppHudModel.ts src/components/TierBadge.tsx src/components/collection/MasteryTeamChallengeCard.tsx src/screens/MuseumScreen.tsx src/services/pointsService.ts src/services/characterService.ts src/services/masteryTeamChallengeModel.ts src/services/bugLampService.ts src/services/i18n.tsx firebase/functions/index.js firestore.rules tests/firestore/bugbaas31.rules.test.mjs docs/reviews/bugbaas-3.1-pve-balance.md docs/reviews/bugbaas-3.1-obsolete-feature-audit.md
git commit -m "feat(bb31-t29): add clear bug power crowns and PvE roles"
```

---

# 5. Required screenshot matrix

Every row must have before/after evidence where a before-state exists.

| Flow/state | 360×800 | 390×844 | 430×932 | 768×1024 | 1440×900 |
|---|---:|---:|---:|---:|---:|
| World + `Vandaag x/10` | ✓ | ✓ | ✓ | ✓ | ✓ |
| World active research | ✓ | ✓ | ✓ | ✓ | ✓ |
| Research Center loading/empty/active/offline/error | ✓ | ✓ | ✓ | ✓ | ✓ |
| Research Center insufficient balance/locked/completed | ✓ | ✓ | ✓ | ✓ | ✓ |
| New species popup per rarity | ✓ | ✓ | ✓ | ✓ | ✓ |
| Duplicate preview: later beslissen/ruilen/onderzoeken | ✓ | ✓ | ✓ | ✓ | ✓ |
| Duplicate animation/fact | ✓ | ✓ | ✓ | ✓ | ✓ |
| Batch duplicate receipt | ✓ | ✓ | ✓ | ✓ | ✓ |
| Research target picker | ✓ | ✓ | ✓ | ✓ | ✓ |
| Shop item icon/effect preview for every RP item | ✓ | ✓ | ✓ | ✓ | ✓ |
| Cosmetic before/after preview for every Gem item | ✓ | ✓ | ✓ | ✓ | ✓ |
| Shop and purchase confirm | ✓ | ✓ | ✓ | ✓ | ✓ |
| Research chapter complete | ✓ | ✓ | ✓ | ✓ | ✓ |
| Legendary research + finale | ✓ | ✓ | ✓ | ✓ | ✓ |
| Mythical research locked/active/finale | ✓ | ✓ | ✓ | ✓ | ✓ |
| Zelf gevonden | ✓ | ✓ | ✓ | ✓ | ✓ |
| Acquisition timeline/tags | ✓ | ✓ | ✓ | ✓ | ✓ |
| Scan exact/proxy/no-proxy | ✓ | ✓ | ✓ | ✓ | ✓ |
| Scan pass/limit | ✓ | ✓ | ✓ | ✓ | ✓ |
| Journal success/error/pending | ✓ | ✓ | ✓ | ✓ | ✓ |
| Buddy picker/blocked task | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tap Duel running/edges | ✓ | ✓ | ✓ | ✓ | ✓ |
| Migration new/normal/veteran/old-client-delta | ✓ | ✓ | ✓ | ✓ | ✓ |
| Profile XP/level | ✓ | ✓ | ✓ | ✓ | ✓ |
| Bugdetail Kracht/Training/rol/Mythical special | ✓ | ✓ | ✓ | ✓ | ✓ |
| Squad picker Kracht/eventmatch | ✓ | ✓ | ✓ | ✓ | ✓ |
| Zwermbeleg preview/running/per-bug result | ✓ | ✓ | ✓ | ✓ | ✓ |
| Crown rank/trial/complete/default-Aurora-Obsidian | ✓ | ✓ | ✓ | ✓ | ✓ |
| Training stars on BugDex/Buddy/Play/Museum | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reduced motion reward/research/finale | ✓ | ✓ | ✓ | ✓ | ✓ |
| Low-end visual profile | ✓ | ✓ | ✓ | ✓ | ✓ |

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
- Loading, empty, offline, error, locked, insufficient-balance, success en completed states zijn visueel ontworpen; geen kale placeholder of ongestylede fouttekst.
- Nieuwe art is minimaal gelijkwaardig aan de beste huidige BugDex-, Museum- en rarity-rewardreferenties.
- Full motion en reduced motion hebben dezelfde informatie, acties en einduitkomst.
- Een tienjarige kan zonder uitleg binnen vijf seconden de primaire actie, prijs en beloning aanwijzen.

---

# 6. Required functional test matrix

| Gebied | Minimaal bewijs |
|---|---|
| XP | 1:1 migratie, append-only, levels, grandfathering, dual-write naar lifetime XP en legacy totalPoints, foreground-reconcile |
| RP | alle raritywaarden, saldo, spend, idempotency, concurrency |
| Gems | gratis grants, scanpas, geen euroflow, geen negatief saldo |
| Duplicates | eerste copy, open trades, uitgevinkte soorten, batch, facts, retry |
| Research | start, evidence, no-scan path, claim, one active, veteran route |
| Shop | vaste prijzen, no rarity boost, charges, no stacking, unique icon, mandatory live preview, Crown prerequisite |
| BugDex | Zelf gevonden, tags, legacy honesty, timeline |
| Scan | exact, alias, proxy, no proxy, quota, authenticity, idempotency |
| Journal | auth, receipt, location, offline, pending retry, privacy |
| Buddy | kiezen, opslaan, actieve taak, oude state |
| Tap Duel | 68 targets, deterministic, safe bounds, input, score, FPS |
| Movement | same-device app/widget x/10, queued, failed claim, reset, max 10, Health Connect permissions |
| Bug Power | exact rarity/Training formula, roleStrength, no evolutionLevel dependency, no per-copy CP |
| PvE | server squad snapshot, bounded roles/specials/Crown, Swarm receipt, Solo integration, Release Boss unchanged |
| Crown | existing rank power preserved, free visual trials, idempotent claims, old-APK rank reconciliation, Gem styles cosmetic-only |
| Ranked fairness | Kracht/Crown multiplier always 1 in PvP; cosmetic changes never alter score |
| Obsolete features | Upgrade UI gone, combine legacy, Upgrade-smid legacy owner-only, rarity stars gone, Kroonzaal retained |
| Migration | fixtures, dry-run, duplicate apply, lazy first open, later old-client delta, veteran bracket delta, rollback flags |
| Old APK compatibility | root profile writes, XP beide richtingen, inventory, mastery, old research, old combine, two devices, update naar 3.1 |
| Permissions | owner/other/client/server matrix voor ieder nieuw pad plus alle bestaande oude-client allow-contracten |
| Visual system | iedere state, art quality floor, popup sequence, full/reduced/low-end motion, stable receipt |
| Change impact | iedere gedeelde file wijziging gekoppeld aan protected flows, tests en screenshots |
| Neighbor regressions | trade, Museum, squad, missions, Campaign, Ranked, Arcade, Profile |

---

# 7. Rollout and rollback

## 7.1 Feature flags

Use het signed-in-readable, server/developer-written document `appConfig/bugbaas31`, geladen via `src/services/progression/bugbaas31FeatureFlags.ts`, met vaste booleans:

- `bugbaas31EconomyEnabled`
- `bugbaas31ResearchCenterEnabled`
- `bugbaas31MigrationEnabled`
- `bugbaas31LegacyReconciliationEnabled`
- `bugbaas31ScanProxyEnabled`
- `bugbaas31BugGemsEnabled`
- `bugbaas31CommerceEnabled` — remains false in 3.1.0.

## 7.2 Rollout order

1. Test runner and baseline.
2. Additive backend/rules with flags off; run old 3.0.7 client smoke before any UI flag is enabled.
3. Economy, continuous reconciliation and migration dry-run.
4. Internal new/normal/veteran plus old-APK shared-account tests.
5. UI, artwork and animations behind flags.
6. Full permission/change-impact gate.
7. Closed Android/web beta after explicit approval with one device kept on 3.0.7.
8. Migration on a small approved cohort while old clients continue operating.
9. Full migration only after old/new-client and visual audits.
10. Release candidate.
11. Production only after separate explicit approval.

## 7.3 Rollback

- Turn off 3.1 flags; old 3.0 client continues reading existing inventory and user data.
- Do not delete additive 3.1 data during rollback.
- Economy events remain immutable for later audit.
- A migration already applied is not reversed by subtracting currency or XP; instead disable spend/features and investigate.
- Legacy combine backend, old endpoints, old root fields and existing client-write Rules remain available in 3.1; removal is outside this plan and requires separate explicit approval.
- Feature-flag rollback does not revert or subtract XP/RP/Gems. New UI is hidden, immutable ledgers remain for audit and legacy `totalPoints` continues to serve old clients.
- If reconciliation is disabled during incident response, old clients may continue writing legacy data; re-enabling must catch up monotonically from the latest server state.

---

# 8. Coverage check against requested scope

| User requirement | Covered by |
|---|---|
| Kindvriendelijk, bestaande functies vervangen | Sections 2/2.12/2.15/2.16, Tasks 10, 16, 21, 27, 29 |
| XP eerlijk, oude spelers hoger zonder power | Sections 2.2/2.8/2.13, Tasks 3, 15, 16, 22 |
| RP als currency | Sections 2.3/2.7, Tasks 3–6, 9–10 |
| BugGems, vaste cosmetics, Crown-stijlen en extra scans | Sections 2.4/2.7/2.15, Tasks 4, 8–9, 14–15, 21, 29 |
| Duplicate popup, animatie, facts en tierwaarde | Sections 2.3/2.5/2.12, Tasks 5–7, 21 |
| Legendary/Mythical gegarandeerd | Section 2.6, Tasks 8–10 |
| Bestaande Mythicals zinvol houden | Sections 2.8/2.15, Tasks 8, 15–16, 29 |
| Zelf gevonden BugDex-sectie | Section 2.9, Task 11 |
| Herkomsttags | Section 2.9, Task 11 |
| Upgrade volledig weg uit nieuwe UI maar oude APK blijft werken | Tasks 5, 10, 22, 24 |
| Journal-permissie veilig houden/fout oplossen | Task 13 |
| Buddy weer selecteerbaar | Task 17 |
| Meer Tap Duel bugs en geen HUD-overlap | Task 18 |
| Vergelijkbare scanreward | Section 2.10, Task 12 |
| 1,5 km teller `Vandaag x/10` | Task 19 |
| Volledige senior visual design, shoppreviews, Crown/PvE-art, popups en animaties | Sections 2.12/2.15, Tasks 9, 20–21, 24–25, 29, section 5 |
| Screenshots en visuele kwaliteit | Tasks 2, 7, 9–21, 24–25, 29, section 5 |
| Oude APK blijft werken en latere voortgang wordt bijgehaald | Section 2.13, Tasks 3–4, 15, 22, 26 |
| 3.0 niet beschadigen en alleen nuttige bron meenemen | Global Constraints, Section 3.6, Task 1 en het single-chat execution protocol Section 2 |
| Eén chat, deel voor deel, statusnotities en geen dubbele uitvoering | Section 3.6 en `2026-08-03-bugbaas-3-1-single-chat-execution-protocol.md` Sections 1/3/4/5 |
| Firebase additief, permissies niet verruimen | Sections 2.13–2.14/3.1/3.5, Tasks 4, 9, 13–15, 22–23, 26 |
| Alles regressietesten en wijzigingsimpact bewijzen | Tasks 1, 21–26, 29, section 6 |
| Migratie old → new plus latere old-client delta | Tasks 15–16, 22, 26 |
| Bugkracht zonder per-copy CP, rollen en PvE-waarde | Section 2.15, Task 29 |
| Crown-power verdienen, gratis visual trials en cosmetic-only Gem-stijlen | Section 2.15, Tasks 9, 20–21, 29 |
| Oude/nutteloze functies expliciet behouden, vervangen of legacy maken | Section 2.16, Tasks 10, 22, 24, 29 |
| Ieder koopbaar item heeft eigen art en effect/live preview | Sections 2.7/2.12, Tasks 9, 20–21, 24–25, 29 |
| Veilige release/rollback | Tasks 23–29, section 7 |

---

# 9. Plan self-review

## Spec coverage

Alle eisen uit de gesprekken van 3 augustus 2026 zijn gekoppeld aan minimaal één van de 29 implementation tasks, een testgebied en waar relevant screenshot/devicegate. De eerdere hybrid-progressionbeslissing die premium currency verbood en upgrades deels behield, wordt door dit 3.1-plan expliciet vervangen. Het plan bevat afzonderlijke contracten voor senior visual design, oude-APK-compatibiliteit, continue reconciliatie, Firebase-permissies en wijzigingsimpact. Het verplichte single-chat execution protocol voegt een tracked-only 3.1-worktree, bronmanifest, duurzame taskstatus, receipts, dependencyvolgorde en dubbele-uitvoerpreventie toe. Bestaande data, oude clientwrites en beveiligingsbeslissingen blijven behouden.

## Placeholder scan

Dit plan bevat geen open implementatieplaatsaanduidingen. Prijzen, copywaarden, researchkosten, scanlimieten, viewports, paden, taken, testcommando's en releaseversies zijn expliciet vastgelegd.

## Type consistency

Dezelfde namen worden door het plan gebruikt voor `EconomyState`, `EconomyEvent`, `BugPowerSummary`, `CrownTrialState`, `LegacyReconciliationState`, `ResearchContract`, `ResearchStep`, `AcquisitionSource`, `lifetimeXp`, `researchPoints`, `bugGems` en de nieuwe Firestore-paden. `lifetimeXp` staat uitsluitend in `economy/state`; legacy `totalPoints` blijft de rootcompatibiliteitsprojectie en wordt transactioneel gespiegeld.

## Known uncertainty requiring measured evidence

- De exacte economie is een startbalans. De migratiepreview en playtests mogen prijzen/opbrengsten alleen via een apart expliciet balancebesluit aanpassen.
- De actuele Journal-foutoorzaak moet met een authentieke foutrespons worden bewezen; regels verruimen is uitgesloten.
- 68 Tap Duel-targets is de startvariant en moet op echte input/FPS worden vergeleken met 64 en 72 voordat de definitieve waarde wordt vrijgegeven.
- Nieuwe visuele assets zijn nog niet ontworpen of goedgekeurd; Tasks 20–21 en 29 bevatten hun concrete productie-, integratie-, shoppreview-, Crown/PvE-motion- en afkeurproces.
- De Kracht-, roleStrength-, Crown- en bossbalans is exact gespecificeerd maar moet met Task 29-simulaties en echte PvE-runs aantonen dat lagere rarities bruikbaar blijven en verkeerde-role Mythicals niet altijd winnen.
- Oude-APK-compatibiliteit is pas bewezen na de echte twee-clientmatrix met 3.0.7 en 3.1; code-/Rules-tests alleen zijn daarvoor onvoldoende.
- Movement Radar/Health Connect blijft in 3.1 bewust toestelgebonden. App en widget op hetzelfde toestel delen één teller; cross-device deduplicatie vereist een toekomstig native/server-receiptprotocol en valt buiten deze rework om bestaande rewards en privacy niet te breken.

Planstatus: gereed voor review. Er is met dit document geen appcode, Firebase-regel, productieomgeving, APK of deployment gewijzigd.
