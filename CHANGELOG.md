# Changelog

## 1.2.4

- Android Bug Radar widget toegevoegd: toont een radar bug en opent exact die foreground catch.
- Foreground catches unlocken nu altijd exact de gevangen BugDex bug.
- Alle 117 BugDex bugs kunnen als foreground/radar bug spawnen, verdeeld per rarity.
- BugDex rarities herverdeeld op visuele indruk: kleine/plain bugs lager, grote/glanzende/hoornbugs hoger.
- Catch window verhoogd van 20 naar 30 seconden.

## 1.2.3

- Foreground catch bugs tonen geen cirkel meer na een hit.
- HP-bar voor foreground bugs is rood en blijft de enige health-indicator.

## 1.2.2

- Foreground catch bugs bewegen smoother en minder robotisch met native transform-animatie.
- HP-taps zijn betrouwbaarder: een fysieke tap kan niet meer meerdere hits tegelijk tellen.
- Android adaptive launcher icon toegevoegd zodat Pixel geen witte legacy-rand meer toont.
- E-mail login-toggle groter gemaakt voor betrouwbaarder tappen.

## 1.2.1

- Android native launcher icons bijgewerkt, zodat het nieuwe HD logo ook op telefoons zichtbaar wordt.
- Login-scherm badge bijgewerkt naar hetzelfde nieuwe HD logo.
- Splashscreen resources opnieuw gegenereerd vanuit het nieuwe app-logo.

## 1.2.0

- Nieuw HD app-logo met een bug hunter die softwarebugs in een pc vangt.
- Foreground catch bugs tonen nu duidelijke hit-feedback met shake, pulse en hit-ring.
- Foreground catch bugs gebruiken een tekstloze HP-bar in plaats van een zichtbare teller.
- Foreground catch bugs bewegen meer buglike met kruipstappen, bobbing en korte pauzes.

## 1.1.8

- Foreground catch bugs zijn nu een korte challenge in plaats van een simpele tap.
- Catch bugs blijven maximaal 20 seconden in beeld en bewegen sneller binnen het scherm.
- Moeilijkheid schaalt per rarity: betere bugs bewegen lastiger en vragen meer taps.
- Android tap-hitboxes volgen nu de zichtbare bugpositie tijdens beweging.
- Background walking bugs zijn betrouwbaarder over het hele scherm te splatten.

## 1.0.4

- App checkt bij opstarten of er een nieuwere GitHub Release beschikbaar is.
- Nieuwe versie melding verdwijnt automatisch na een paar seconden.
- Eigen bugs verwijderen toegevoegd met bevestigingspopup.
- Bij verwijderen worden bugpunten en bugcount ingetrokken.
- Firestore rules staan delete alleen toe voor de originele melder.

## 1.0.3

- Daily login geeft nu altijd een beloning: punten of een lage BugDex bug.
- Elke 5-daagse streak geeft een betere BugDex reward.
- Daily bonus popup toont streakdag en hoeveel dagen nog tot betere reward.
- Daily login gebruikt lokale dag en transactionele claim om dubbele rewards te voorkomen.

## 1.0.2

- Ranglijst top-3 toont geen prestige/tiertekst meer onder de rank.
- BugDex toont weer alle 31 slots met vraagtekens voor locked bugs.

## 1.0.1

- BugDex toont alleen nog vrijgespeelde bugs.
- Tieroverzicht op Home verplaatst naar een inklapbare dropdown.
- Huidige account-tier blijft direct zichtbaar op Home.

## 0.1.0

- Eerste Expo/React Native TypeScript app toegevoegd.
- Firebase Auth, Firestore en Storage integratie met placeholder-config toegevoegd.
- Bug melden, buglijst, bugdetail, statuswijziging, puntenlogica, leaderboard en profiel toegevoegd.
- Demo-modus toegevoegd voor smoke-tests zonder Firebase secrets.
