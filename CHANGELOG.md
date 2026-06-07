# Changelog

## 1.3.10

- Update-knop opent nu de GitHub releasepagina in plaats van direct de APK asset, zodat OnePlus/Chrome minder snel blijft hangen na downloaden.

## 1.3.9

- Foreground despawn timer vervangen door een ronde ring die segment voor segment afloopt.

## 1.3.8

- Update notice wordt alleen gezet bij een strikt nieuwere GitHub release-tag.
- Foreground bugs worden alleen door een echte update notice geblokkeerd; gelijke of ongeldige versies tonen geen notice.

## 1.3.7

- Foreground bug hitbox verkleind naar de zichtbare bug-afbeelding.
- Foreground bugs tonen nu een kleine despawn-timer.
- Update-popup gebruikt nu de native APK-versie en blijft staan met Download/Later acties.
- Home toont de Beweeg radar Claim knop alleen als er echt iets te claimen is.

## 1.3.6

- Beweeg radar drempels aangepast: lopen 3 km, hardlopen 4 km en fietsen 6 km per radar bug.
- Home heeft nu een Claim knop op de Beweeg radar kaart om direct verdiende radarbugs op te halen.

## 1.3.4

- Health Connect koppeling gefixt met verplichte permission-rationale route.
- Beweeg radar leest nu ook Health Connect stappen en rekent die om naar loopafstand.
- Pixel 8 widget-test bevestigd: gevonden radarbugs tonen een bug-afbeelding en openen als foreground catch.

## 1.3.3

- Beweeg radar labels volledig Nederlands gemaakt: Lopen, Hardlopen en Fietsen.

## 1.3.2

- Home toont nu een compacte Beweeg radar kaart met dagelijkse km-doelen en rewardstatus.
- Movement radar voortgang is zichtbaar voor lopen, hardlopen en fietsen.
- GitHub APK release is arm64-only voor kleinere telefooninstallaties.

## 1.3.1

- Foreground en background bugs bewegen natuurlijker met insectachtige paden en logische rotatie.
- Bug Radar kan meerdere gevonden bugs stacken en opent ze een voor een als foreground catch.
- Movement radar bonuses toegevoegd via Health Connect: lopen 2 km, hardlopen 4 km en fietsen 8 km per radar bug, maximaal 5 per dag.
- Android Health Connect permissions en native widget-queue bridge toegevoegd.

## 1.3.0

- Bug Radar widget gebruikt nu 24 radarframes in plaats van 12.
- Scan-animatie is vloeiender met een korter frame-interval, zonder de totale rotatiesnelheid te verhogen.
- Radarframes blijven AppWidget-safe en zijn gecontroleerd met Android debug/release builds.

## 1.2.9

- Bug Radar widget gefixt: de rarity-aura gebruikt nu een AppWidget-safe `ImageView` in plaats van een unsupported generic `View`.
- Voorkomt de Android launcherfout waarbij de widget alleen “er is een fout opgetreden” toont.

## 1.2.8

- Bug Radar widget gebruikt nu 12 radarframes voor een soepelere scan-animatie.
- Radar finds worden via random roll-checks gepland, met avond- en weekendkans en maximaal 3 verspreide finds per dag.
- Gevonden radarbug blijft op de widget staan tot je de widget aantikt.
- Epische en legendarische radarbugs krijgen nu een duidelijke HD aura zonder rarity-tekst.
- BugDex unlock popup toont extra premium styling en HD aura-art voor epische en legendarische drops.

## 1.2.7

- Bug Radar widget-signalen kunnen nu soms random buiten kantooruren verschijnen.
- Buiten kantooruren gebruikt vroege ochtend, avond en weekendvensters.
- Daglimiet en minimale spreiding blijven hetzelfde: maximaal 3 signalen per dag en minimaal 60 minuten ertussen.

## 1.2.6

- Bug Radar widget gebruikt nu HD bitmap radarframes in plaats van de oude vector-radar.
- Widget heeft een simpele radar scan-animatie via framewissel.
- Widget schaalt nu vanaf 1x1 tot 2x2 en groter met een aparte compacte layout.
- Bij een gevonden bug toont de widget de echte BugDex afbeelding op de radar.

## 1.2.5

- Bug Radar widget compacter gemaakt met full-widget radar en echte BugDex afbeelding bij een gevonden bug.
- Widget gebruikt nu een radar scan-animatie en plant maximaal drie signalen per werkdag.
- Unlock popup toont geen rarity-tekst meer, maar een bug-weetje.
- Alle 117 BugDex bugs hebben nu een eigen weetje.
- Rarity blijft zichtbaar via border- en glowkleur.

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
