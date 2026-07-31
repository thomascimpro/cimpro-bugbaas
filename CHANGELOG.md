# Changelog

## 2026-07-31 - BugBaas 3.0.6

- Ranked arcadegames gebruiken tijdens het spelen het volledige gamevlak zonder losse titelbalk. Normale Bug Defence gebruikt opnieuw de 2.10.19-tick en neutrale balans; eventmodifiers blijven alleen binnen Zwermbeleg actief.
- Iedere geslaagde fotoscan maakt verplicht eerst een privé-veldnotitie met de actuele telefoonlocatie. Pas daarna verschijnen de scan-, Weekvondst- en BugDex-beloningen.
- BugScan identificeert de zichtbare soort onafhankelijk van de BugDex. Exacte namen en veilige aliassen worden server-side vanaf 70% gekoppeld; concrete ontbrekende soorten gaan vanaf dezelfde grens naar de developer-wachtrij in plaats van naar een geforceerde app-soort.
- Alle bugbeloningen gebruiken één bron-gelabeld `Bug X ontdekt`-scherm voor onder meer foto, Duel, Daily, Weekly, Museum, Onderzoek, Campaign, Buddy en Arcade. De willekeurige casino-presentatie is uitgeschakeld.
- Museum-rewards worden alleen via de zichtbare claimknop server-side toegekend. Permanente claims blokkeren dubbel innen; voltooide zalen verwijzen door naar Prestige, Kroonzaal en seizoensfinales.
- Onderzoekskaarten hebben grotere touchdoelen, de quiz na een fotoscan gaat over de daadwerkelijk herkende bug, Arcade telt ontdekte soorten en de wereldkaart kan met `WERELD` tot zoomniveau 2 uitzoomen.
- De regio-indicator legt `NIVEAU X VAN 5`, voltooiing en herhaalbare week-/seizoensprogressie uit.
- Toegevoegd aan de BugDex: rode bosmier, rode katoenwants, gouden wielwebspin, zwarte wegmier en struiksprinkhaan, met transparante WebP-art en veilige wetenschappelijke aliassen.
- Acht bestaande developer-waarnemingen zijn beoordeeld; zes unieke speler/soort-combinaties hebben één exemplaar ontvangen en twee dubbele inzendingen zijn zonder extra beloning afgehandeld.
- iPhone Safari behoudt de lichte WebAudio- en 3D-renderroute. Vleugeljacht is vrij op web en blijft in Android vergrendeld met een link naar `https://bugbaas.vercel.app`.

## 2026-07-29 - Vercel iPhone- en BugScan-hotfix

- De iPhone Safari-webclient speelt lichte meerklank-WebAudio-feedback af zonder de laggevende pool van APK-WAV-spelers; andere webbrowsers blijven de bestaande pakketgeluiden gebruiken.
- BugScan herkent exacte BugDex-namen vanaf 70% ook bij een foutief `uncertain`-modelantwoord en stuurt concrete ontbrekende soorten vanaf 70% naar de developer-wachtrij. Losse accolades rond modeltekst worden verwijderd.
- Het webslot van Vleugeljacht 3D is verwijderd en de bestaande tik-bij-100%-netslag blijft actief.
- Het iPhone-renderprofiel van Vleugeljacht gebruikt minder GPU-zware effecten en objecten; desktopweergave blijft ongewijzigd.
- Gepubliceerd op `https://bugbaas.vercel.app` als deployment `dpl_5umNvb7VYihAyNK45eNUxTzVF1we`.

## 2026-07-29 - BugBaas 3.0.5 Android-release

- Android-versie verhoogd naar `3.0.5` (`versionCode 314`) met de actuele 3.0-productiecorrecties voor BugScan, geluiden, Bug Tower-besturing, duels, Buddy-voortgang en Solo Campaign.
- Vleugeljacht 3D opent vanuit de APK bewust `https://bugbaas.vercel.app`, zodat Android dezelfde vrijgegeven game gebruikt als productie.
- De runtime-BugDex en het gedeelde BugScan-cataloguscontract zijn op 512 bestaande app-items gesynchroniseerd.
- Alleen de benodigde Android-rechten blijven in het pakket; microfoon- en verouderde opslagrechten zijn niet opgenomen.
- De APK gebruikt dezelfde Android-certificaatketen als de openbare 3.0.4-APK, zodat gebruikers deze versie over 3.0.4 kunnen installeren.

## 2026-07-29 - BugBaas 3.0.4 iPhone- en gameplaycorrecties

- Webcamera op iPhone opent via de mobiele camera-picker; BugScan accepteert exacte catalogusmatches vanaf 70% en beoordeelt anatomische kenmerken in een aangescherpte tweede stap.
- Trading rendert grote collecties in pagina's, actieve routes en de Play-workspace overleven schermrotatie, en iPhone Safari gebruikt een begrensde arcade-/audio-renderroute.
- Foregroundvangsten tonen geen losse `+10 XP`-popup meer; Bug Tower stuurt minder snel links/rechts.
- Zoekzones hebben een langere client/servergrens en een productie-fallback; open en recente duels tonen het gespeelde spel plus beschikbare scores.
- De weekly `10x Solo Campaign-boss` is vervangen door het bereiken van het laatste Solo Campaign-level met een Epische bug en 70 XP.
- Vleugeljacht 3D is op web ontgrendeld, markeert de vangzone duidelijk en wacht bij 100% op een tik ergens op het speelveld om met het zichtbare net te vangen.
- Gepubliceerd op `https://bugbaas.vercel.app` met de BugBaas-productie-Firebase en Vercel-env.

## 2026-07-29 - BugBaas 3.0.4 volledige Vleugeljacht 3D-herstel

- Android gebruikt exact dezelfde volledige procedurele 3D-boswereld, insecten, terrein, bomen en het fysieke vangnet als de Vercel-game.
- Een zichtbare marker vangt ieder zichtbaar insect na 1,5 seconde richten; afstand blokkeert de vangst niet meer.
- Insecten behouden verschillende bewegingssnelheden en leveren 1, 2 of 3 punten op basis van hun beweeglijkheid.
- De 60-secondenrun en aparte `butterfly_catch`-resultaatopslag blijven behouden voor training en ranked.
- De webgame wordt lokaal in een interne WebView gebundeld met dezelfde Three.js `0.180.0`; Android opent daarvoor geen Chrome of externe URL.

## 2026-07-29 - Vleugeljacht lokale Android-host

- De Android-route vervangen door een interne WebView die de bestaande `index.html` en `prototype.js` rechtstreeks uit de APK laadt.
- Three.js `0.180.0`, de key-art en alle gamecode worden lokaal meegebundeld; de game heeft geen browser, Vercel of netwerk nodig.
- Appbridge toegevoegd voor ranked/training-resultaten, highscoreopslag en telefoonoriëntatie.
- Geen APK-build of Android-devicetest uitgevoerd bij deze bronwijziging.

## 2026-07-29 - BugBaas 3.0.1

- De huidige BugBaas 3.0-versie uitgebracht als officiële Android-release `3.0.1` (versionCode 309).
- De vernieuwde Vlindervangst, vloeiendere arcadegames, herstelde Daily-foregroundbug en actuele Museumdoelen zijn opgenomen.
- Officiële APK gebouwd met CimPro-uploadsigning en de webversie gepubliceerd op `bugbaasv3.vercel.app`.
- De map `C:\Users\thoma.THOMAS\Documents\Codex\CimPro BugBaas-3.0` vastgelegd als canonieke bron voor volgende 3.x-releases.

## 2026-07-29 - 360° HD-vlindervangst prototype

- Het eerdere vlakke Three.js-prototype uitgebreid naar een volledige 360° bosweide met terrein, sky dome, bomen, heuvels en instanced begroeiing rondom de speler.
- Opt-in telefoonoriëntatie, herkalibratie, vloeiende quaternioncamera, sleepfallback en fullscreenbesturing toegevoegd.
- Vlinders vernieuwd met procedurele HD-vleugelpatronen, vier afzonderlijke vleugels, lichaam, ogen, voelsprieten en natuurlijke gesloten 3D-routes.
- Vlindernet vernieuwd met houten steel, metalen verbinding, draadmand, motion trails, vloeiende wind-up/slag/terugkeer en maximaal één vangst per slag.
- Alleen het lokale prototype en documentatie zijn gewijzigd; geen app-integratie, deployment of APK-build uitgevoerd.

## 2026-07-28 - Bug Brain vragenbank opgeschoond

- Alle 3.000 gegenereerde taalvarianten gecontroleerd op antwoordverraad, kromme Nederlandse bijzinnen en uitlegteksten die na een punt met een kleine letter doorgingen.
- Taxonomische groepsantwoorden gebruiken nu consistente wetenschappelijke insectenordes, zoals `Mantodea`, `Coleoptera` en `Odonata`, in plaats van labels die de soortnaam vrijwel herhalen.
- Nederlandse herkennings- en expertvragen zijn herschreven naar grammaticaal volledige zinnen zonder de inhoud of beloningen van Bug Brain te wijzigen.
- Geen APK gebouwd en niets gedeployed.

## 2026-07-28 - 3.0.0-beta.8 Journaal-scroll en Weekvondst

- Veldjournaal gebruikt nu een volledig ondoorzichtige, niet-geanimeerde scrolllaag; Android-overscroll en het wegclippen van rijen zijn uitgeschakeld om het witte scherm tijdens neerwaarts scrollen te voorkomen.
- Wereld > Vandaag toont onder Onderzoek iedere week drie veelvoorkomende soorten, met een directe knop naar BugScan.
- De eerste bevestigde Weekvondst per gebruiker en week is lokaal voorbereid als server-authoritatieve, idempotente beloning van 50 XP plus één Epische BugDex-bug.
- Android beta verhoogd naar `3.0.0-beta.8` / versionCode `307`; x86_64-APK gebouwd en op Small Phone getest.
- Firebase Functions-broncode is niet gedeployed; de Weekvondst-beloning wordt pas live na afzonderlijke deploymentgoedkeuring.

## 2026-07-28 - BugDex 500 en Mythische kroonrangen

- Uitgebreid van 249 naar 500 unieke BugDex-bugs over Gewoon t/m Mythisch.
- Dubbele WebP-assets verwijderd uit de actieve assetset; BugDex-mappings gebruiken transparante PNG’s. Twee foutieve hommelbeelden zijn vervangen met imagegen-assets.
- Toegevoegd: `battleWins`, idempotente PvE-winregistratie, Kroonrangen, CrownGlow, voortgang naar de volgende upgrade en upgrade-popup voor Mythische bugs.
- Kroonbonus geldt alleen voor PvE en is begrensd op +10%; ranked Duel/PvP en bestaande mastery-XP-logica blijven ongewijzigd.
- Geen deployment of release-build uitgevoerd.

## 2026-07-27 - Arcade games remain open in fullscreen

- Fixed Practice and Ranked games immediately closing when fullscreen gameplay started.
- Kept the app-shell component stable so the active Play workspace and game state are no longer remounted away.
- Added regression coverage for the fullscreen wrapper and mobile browser verification for both launch modes.

## 2026-07-27 - Field-note proof verification

- Fixed v2 BugScan receipt verification so Firebase validates the signing key derived from the synchronized Vercel/Firebase secret.
- Preserved the ten-minute proof lifetime, UID binding and server-only observation write path.
- Added cross-runtime regression tests for valid, mismatched, wrong-user and expired receipts.


## 2026-07-27 - BugDex unlock popup rarity styling

- Restored the cleaner 2.10.20 unlock-card composition.
- Bug rarity now controls the popup border, heading, stars, circular art backdrop, streak text and action button.
- Removed the beige specimen archive frame, stamp and plinth while preserving premium aura and mythic effects.


## 2026-07-27 - Arcade ranked/practice launch

- Fixed Ranked and Practice buttons failing to open a game when stale duel state was still active.
- Practice launches now reset the previous duel and enter the selected game directly.
- Ranked launches now reset stale duel state before matchmaking starts.


## 2026-07-27 - Zwermbeleg boss-art mobile

- Fixed the Zwermbeleg boss image appearing as an oversized cropped wing/body on mobile web.
- The full square boss art now fits inside a taller compact hero card.


## 2026-07-27 - Persistent mobile Play workspace

- Fixed the mobile Arcade game selector disappearing shortly after opening `PLAY NOW` because stale duel state remained mounted behind the closed modal.
- `PLAY NOW` now opens a clean Arcade workspace every time.
- Open duels and Recent duels now start collapsed and can be expanded separately.


## 2026-07-27 - Foreground rewards and field notes

- Foreground catch rewards can now appear on every signed-in screen instead of only World.
- Fixed field-note authentication when the Firebase client token and Cloud Functions runtime use different trusted BugBaas project audiences.
- Deployed the two field-note endpoints and published the updated web app to `bugbaasv3.vercel.app`.

## 2026-07-26 - Museum mobile scrolling

- Museum gebruikt nu één verticale paginascroll in plaats van een klein intern scrollvenster.
- Zaal, doelen en collectie groeien mee met hun inhoud op korte en lange telefoons.
- Horizontale zaalkeuze blijft apart scrollbaar.
- Extra onderruimte houdt content bereikbaar boven de vaste BottomNav en safe area.
- Geen deployment uitgevoerd.

## 2026-07-26 - Duel moved into Arcade

- Removed the separate Duel tab from Play.
- Added Open duels and Recent duels below Arcade, with open requests shown first.
- Kept Tap Duel, direct duel links, notifications, matchmaking and rewards on the existing duel flow.
- Expanded BugDex Active Squad with helper type, cooldown, hits, AOE targets and mythic special descriptions.

## 2026-07-26 - Mobile arcade selector

- Arcade toont nu alle zes games tegelijk in een 2x3-raster op telefoons en 3x2 op brede schermen.
- Vergrendelde games blijven zichtbaar met hun bestaande unlock-eis.
- Horizontaal scrollen door games is verwijderd.
- Solo Campaign staat als compacte brede rij direct onder het raster.
- Ranked-, Practice-, featured- en unlockgedrag zijn ongewijzigd gebleven.

## 3.0.0-beta.1 - Draggable Bug World map

- Added free mouse and touch panning to the existing Bug World OSM map.
- Search zones now refresh automatically around the viewed field after panning, with a viewport-aware search radius and finer cache cells.
- Kept existing finding markers, biome markers, player location, zoom, location recentering, zone toggle and scan action intact.
- No deployment was performed.

## 3.0.0-beta.1 - BugScan unlock confirmation

- Successful matched real-bug scans now pass the exact granted BugDex drop to the existing unlock modal.
- Real-bug scan rewards bypass the roaming catch queue and show their new-species or extra-copy confirmation immediately.
- The existing idempotent BugDex inventory and unlock transaction remains the source of truth.
- No deployment was performed.

## 3.0.0-beta.1 - BugDex checkerboard asset cleanup

- Audited all 249 active BugDex artwork mappings for baked white/grey transparency grids.
- Replaced 11 affected mappings with transparent existing artwork; Mosquito and eight other exact species use their clean counterparts.
- Aardhommel and Weidehommel temporarily use the closest clean bumblebee artwork because their exact source files contain a baked checkerboard.
- Added a regression test that blocks the 11 contaminated source files from returning to active BugDex mappings.
- No deployment was performed.

## 3.0.0-beta.1 - Museum rewards and endgame

- Added one-time Open, Curated and Master rewards for every normal Museum gallery, including retroactive evaluation for existing collections.
- Added server-verified Prestige goals and Crown Hall Bronze, Silver, Gold and Museum Legend progression for endgame players.
- Added one compact child-friendly next-reward panel using existing Museum, BugDex and badge assets.
- Museum reward receipts are permanent and idempotent; replacing exhibits cannot generate XP again.
- No deployment was performed.

## 3.0.0-beta.1 - Duel launch and Play hero framing

- Added visible random-duel and player-challenge actions inside the Duel workspace opened from Play Now.
- Adjusted Duel and Ranking phone hero heights so their landscape artwork is no longer excessively cropped.
- No deployment was performed.

## 3.0.0-beta.1 - BugDex ranking and back navigation

- Added a Ranking mode for the number of unlocked bugs per player.
- Added a visible back button to leave the Ranking workspace and return to Play.
- Added Dutch, English and French labels for the new ranking mode and metric.
- No deployment was performed.

## 3.0.0-beta.1 - BugScan review safe area

- Made the review stage explicitly scrollable when crop controls and actions extend below the phone viewport.
- Added compact phone sizing for the review photo frame, crop controls and Analyze/New photo actions so the fixed bottom navigation no longer obscures the action zone.
- No deployment was performed.

## 3.0.0-beta.1 - 2.10.20 mission parity (local source)

- Restored the six concrete daily missions and six concrete weekly missions from 2.10.20, including their targets, localized labels and XP rewards.
- Retired the V3 Explorer/Trainer/Team Bronze/Silver/Gold mission tier layer because it did not communicate an actionable goal.
- Preserved the legacy daily and weekly claim-ID formats so mission claims remain date/week scoped.
- No deployment was performed.

## 3.0.0-beta.1 - Vercel v3 audio parity

- Added the same 12 WAV sound effects used by Android to the web asset bundle.
- Web game, bug-catch, unlock and interface-tap sounds now use the shared WAV files, with a browser-safe fallback when playback is blocked.
- Published the change to `https://bugbaasv3.vercel.app`.

## 3.0.0-beta.1 - Mobile viewport corrections

- Enlarged the BugScan live camera area to the phone width and kept gallery capture reachable above fixed navigation.
- Contained Swarm Siege boss art, replaced the cropped Arcade contact sheet with a complete game scene, and moved Museum exhibit selection into a scrollable modal.

## 3.0.0-beta.1 - Compact Android beta APK

- Aligned Android metadata to version code 300 and version name `3.0.0-beta.1`.
- Re-encoded large opaque runtime art as JPEG and large transparent runtime art as WebP.
- Reduced the release APK from 104.04 MiB to 75.19 MiB without removing BugDex entries or gameplay assets.
- Produced an arm64 Android 8+ internal beta APK with Hermes, R8 and resource shrinking enabled.

## 3.0.0-beta.1 - Responsive game and World correction

- Bounded Play hero art across phone and tablet viewport heights.
- Centered and capped Bubble Swarm on larger screens without changing gameplay coordinates or difficulty.
- Removed the white World quick-action block and prevented compact World hero overlap.

## 3.0.0-beta.1 - Commercial game refactor slice 1 (local source)

- Added new reviewed BugBaas emblem, launcher icon and Scan medallion assets.
- Reworked login, background motion and bottom navigation around the new visual identity.
- Simplified World Today to one contextual primary action with visible reason, reward and progress.
- Removed the 120-second and 50,000-point endings from Bug Tower and Bubble Swarm.
- Added continuous Bubble Swarm pressure scaling and retained real danger-line game over.
- Expanded the Functions development-origin allowlist to equivalent `localhost` and `127.0.0.1` ports.
- Restored a green full-project TypeScript check by correcting stale structural-test paths and Bug Professor quiz typing.
- No deployment was performed.

## 3.0.0-beta.1 - World biome visual implementation (local source)

- Added one active World biome hero backed by a shared six-biome atlas for Tuin, Park, Water, Nacht, Kantoor and Binnen.
- Integrated route progress, movement sync, search and finding markers, one next-action strip and one primary BugScan action into the hero.
- Reworked Research into an image-led encounter directly below the hero while preserving existing event, Buddy and mission behavior.
- Replaced World marker text symbols with scalable React Native location, search, scan, found and lock glyphs without adding a dependency.
- Documented the Field Expedition Atlas direction and remaining image optimization and physical Android QA work.
- No deployment was performed.

## 3.0.0-beta.1 - Authenticated production corrections (local source)

- Added bounded server and client timeouts for optional OSM search zones, with a retryable non-blocking map state.
- Kept Daily and Weekly missions permanently reachable from World Today.
- Added a Settings action to the user's own Profile and restored Settings back-navigation to Profile.
- Added a distinct Swarm Siege preview card state for the Friday signal window.
- Localized the proven mixed-language Map, Field Journal and Museum Exhibit Editor copy in Dutch, English and French.
- No deployment was performed.

## 3.0.0-beta.1 - Hybrid progression master implementation and production release

- Added a complete acquisition catalog for all 231 BugDex species with starter, field, research, campaign, event and mythic routes.
- Added targeted Research with three missing-species choices, daily source caps, server evidence verification, exact species encounters, progression receipts and a non-decaying five-day Momentum cycle.
- Rebuilt World Today around one Next Action, active Research, Museum-wing Research focus and one contextual secondary signal.
- Split BugScan into capture, review, identification, result and impact stages while preserving camera, AI and reward contracts.
- Added a Collection workspace with BugDex, Museum and Journal tabs, exact missing-species/event-return routes and three-tier Mastery Team cosmetic challenges.
- Replaced automatic Museum champions with guided player-owned exhibit placements: one slot at discovered, three at open and six at curated/master. Stage goals now scale from each room's real catalog size.
- Added Crown Hall season trophies and kept Museum as a read-only visual layer over the same BugDex inventory.
- Replaced the six one-time Expedition discoveries with thirty region tiers inside World Map.
- Added owned-species Play unlocks, daily featured Arcade rotation, Duel/Campaign unlock at ten species and Collection-owned squad editing.
- Replaced random Solo Campaign boss drops with five visible, one-time, server-authoritative species milestones; weekly resets refill lives without deleting the highest wave.
- Centralized mastery activity rewards and capped ranked mastery assistance at 3%.
- Reworked Swarm Siege into a Friday preview, Saturday 12:00-18:00 live battle and Sunday result window with three timed charges, four phases, reconnectable tickets, partial rewards and a server-locked active-player-scaled HP target.
- Changed Team Hunt to the first weekend of each month, added missing team categories and moved the Conservatory Guardian to the final week of an eight-week season with automatic reward finalization.
- Replaced grind missions with Discover/Train/Contribute dailies and Explorer/Trainer/Team weekly tracks. Completed rewards auto-award without random species drops.
- Added endgame completion by acquisition source, exact event return schedules and Crown Hall master at 90% BugDex plus five mastered core wings.
- Retired active standalone Expedition and duplicate squad flows; legacy Museum/Journal routes redirect to Collection.
- Deployed Firestore Rules to `bugbaas-3`, Cloud Functions to `thomascimpro-6266f` and Vercel production deployment `dpl_DerYgX6Np594ZVYP94XumQnb5g4L` to `https://bugbaasv3.vercel.app`.
- Built Android debug APK `android/app/build/outputs/apk/debug/app-debug.apk`; physical-device QA remains open because no ADB target was connected.

## 3.0.0-beta.1 - Hybrid progression catalog foundation (localhost only)

- Added one central progression definition for all 231 current BugDex species.
- Classified species into starter, field, research, campaign, event and mythic acquisition routes without changing current ownership or rewards.
- Added habitat and Museum-wing metadata, research tiers, campaign milestones, event pools and explicit Mythic endgame paths.
- Guaranteed that an exact verified BugScan remains a valid unlock route for every catalog species.
- Documented migration behavior for every existing BugDex reward source and preserved inventory, mastery, unlocks, squads, trades and field notes.

## 3.0.0-beta.1 - Insect Museum redesign (localhost only)

- Rebuilt Museum around four clearly named rooms: Vondstenhal, Wonderkas, Nachtkabinet and Kroonzaal.
- Added image-led room navigation, large insect displays, newest-arrival presentation and a compact collection wall using existing bundled artwork.
- Corrected recent discoveries to use newest `lastUnlockedAt` values and removed the duplicate active-squad exhibit from Museum.
- Added Dutch, English and French Museum copy plus loading, empty, locked and retry states.
- Added tested deterministic room assignment without Firebase, reward or inventory changes.

## 3.0.0-beta.1 - Swarm Siege (localhost only)

- Added a Friday–Monday asynchronous community boss using Nest Defense and four deterministic AI Director modifiers.
- Added three server-issued attempts per UTC day, bounded 0–3 damage, persistent shared HP, idempotent submissions and post-event contributor claims.
- Replaced the empty Events state and visible Guardian route with live, upcoming and result Swarm Siege cards while retaining Team Hunt as a separate weekend event.
- Kept event runs separate from normal Arcade high scores and result storage.

## 3.0.0-beta.1 - Private sightings map foundation (localhost only)

- Added an opt-in Scan-to-Field-Journal location flow that sends location only when selected and stores only a server-rounded map cell.
- Kept markers owner-only in the verified-observation path; raw GPS, public markers, team markers and reward effects are deliberately excluded.

## 3.0.0-beta.1 - Discovery UX pass

- Added an illustrated Today goal board directly below Home statistics, with one direct action and explicit collection/world reward.
- Moved Expedition actions ahead of the biome list and explained each shared or personal outcome.
- Preserved navigation context when returning from Field Journal.

## 3.0 local beta

- Voeg een wekelijkse expeditie toe die alleen bevestigde persoonlijke veldvondsten telt.
- Voeg een privé Veldjournaal met habitat- en gedragsnotities plus BugFoto Bingo toe.
- Bewaar veldvondsten uitsluitend via een kortlevend, servergeverifieerd BugScan-bewijs; clientschrijfrechten zijn gesloten.
- Voeg Museum v2 toe als levende, geïllustreerde galerij met echte BugDex-bewoners en subtiele lichtanimatie.
- Vervang de generieke expeditiekaart door Expedition World: een privé ontdekkingskaart met biomen uit bevestigde veldvondsten.
- Voeg Bug Professor en transparante herkenningsfeedback toe zonder extra AI-calls of rewards; verwijder de dubbele Daily Spotlight.
- Vervang de herkenningsmedaille door Field Photo Stamps: afgeleide, geanimeerde documentatiestempels voor een eerste soort, habitat of specifiek gedrag; geen AI-fotokwaliteitsoordeel en geen extra XP.
- Voeg Conservatory Guardian toe: een aparte co-op release-boss met geanimeerde visual, servergetelde geverifieerde bijdragen en een eenmalige contributorbeloning.
- Label de lokale preview als `3.0.0-beta.1` en voorkom een eindeloze opstartspinner met een veilige auth-fallback naar inloggen.
- Geef Home een v3-conservatoriumhero met een geÃ¯llustreerd veldjournaal, terrariumlicht en leesbare actieknoppen.
- Geef de meldingenlijst en nieuwe-meldingflow een eigen Field Operations-hero; formulieren, filters en opslaggedrag blijven identiek.
- Geef Buddy een levende terrariumgloed en de actieve BugSquad-potjes in alle minigames een subtiele zeldzaamheidsaura; er verandert geen game- of rewardlogica.
- Voeg Daily Field Signal toe: Ã©Ã©n veilige, datumgedreven expeditiescan die alleen bestaande bevestigde veldnotities leest en geen dubbele beloning geeft.

## 2.10.19

- BugScan verstuurt tot 2048 px met hogere JPEG-kwaliteit en gebruikt twee veilige fallbackstappen om onder Vercels requestlimiet te blijven.
- Een exacte BugDex-match of concrete nieuwe soort wordt vanaf 70% confidence geaccepteerd; vage en geforceerde matches blijven geblokkeerd.
- De herkennings-AI beoordeelt normale telefoonfoto's minder snel als slechte kwaliteit en gebruikt meer redeneer- en outputruimte.

## 2.10.18

- BugScan voorkomt afgebroken AI-resultaten met een ruimer outputbudget, compacte meertalige velden en precies één automatische herstelpoging.
- BugScan stuurt een scherpere 1536 px-foto naar de herkennings-AI en toont altijd wat volgens de AI op de foto staat.
- Herkenning benoemt eerst de werkelijke soort en vergelijkt die daarna pas met BugDex, zodat geen dichtstbijzijnde catalogusbug wordt geforceerd.
- Soorten buiten BugDex worden met vinder, soortnamen, confidence, uitleg, feitje en reviewfoto voor developer-review opgeslagen.
- Verborgen testaccounts zijn uit de productieomgeving verwijderd.

## 2.10.17

- BugScan stuurt voortaan een veel scherpere foto naar de herkennings-AI en toont ook bij een onzekere of afgekeurde scan wat er volgens de AI op de foto staat.
- Soorten buiten de BugDex worden met vinder, soortnaam, confidence, uitleg, feitje en reviewfoto als developer-record opgeslagen.
- 48 nieuwe Nederlandse BugDex-soorten gebruiken eigen transparante, visueel gecontroleerde afbeeldingen.
- BugScan verbruikt alleen een dagelijkse poging bij een geldige BugDex-match of een zekere nieuwe soort; onzekere, slechte of bugloze foto's kosten geen poging.
- Een zekere soort buiten de catalogus wordt als developer-suggestie vastgelegd; bestaande BugDex-soorten geven de normale reward.
- Google-login op web gebruikt uitsluitend Firebase popup-authenticatie en initialiseert geen native Android-module meer.
- FitnessSyncer ondersteunt persoonlijke versleutelde OAuth-credentials, PKCE, detailimport van activiteiten en providerbrede deduplicatie.
- Expo is bijgewerkt naar de bij SDK 54 passende patchversie en high/critical dependency-audits zijn opgelost.

## 2.10.15

- De FitnessSyncer-koppelknop op web blijft actief en geeft een duidelijke activatiemelding wanneer de providerconfiguratie nog ontbreekt.
- FitnessSyncer HTTPS-endpoints accepteren browserrequests weer en controleren daarna veilig het ingelogde Firebase-account.
- Elke geldige BugScan geeft voortaan altijd één extra kopie van de herkende bug in de BugDex.
- Bugs met `count: 0` worden door een nieuwe echte scan weer owned.
- Unieke scans gebruiken een eigen reward-event; dubbele verwerking van hetzelfde event blijft geblokkeerd.

## 2.10.14

- Nieuwe `BugScan`-tab fotografeert echte bugs en koppelt een betrouwbare herkenning direct aan de BugDex.
- Bestaande bug-, tip-, trick- en ideemeldingen blijven bereikbaar via een compacte kaart onderaan Home.
- Nieuwe daily mission `Spot 1 echte bug` telt alleen een geldige bugherkenning of reviewwaardige vondst.
- Vercel reserveert maximaal drie scans per gebruiker per Amsterdamse dag vóór OpenAI; dubbele scan-ID's en lokaal herhaalde foto's worden geweigerd.
- De officiële flow gebruikt alleen de camera, verkleint foto's client-side en beperkt gestructureerde AI-output zonder de hoge beeldanalysekwaliteit te verlagen.
- BugScan reserveert genoeg modeloutput voor een volledig gestructureerd resultaat; reasoning-only responses eindigen niet meer onterecht als tijdelijke analysefout.
- Oudere scanresponses en bestaande BugDex-unlocks met nul extra kopieën worden veilig genormaliseerd in plaats van afgekeurd als `Ongeldig scanresultaat ontvangen`.

## 2.10.13

- Web krijgt lichte interfacegeluiden op alle React Native Web-knoppen plus bestaande afzonderlijke game-, reward- en catchsounds.
- Home toont actuele Score- en Duel-ranks uit de volledige actieve gebruikerslijst in plaats van een beperkte of verouderde topselectie.
- Ranked matchmaking accepteert alle zes Arena-modes in Firestore, inclusief Bubble Swarm.
- Bug Tower-treden wisselen zichtbaarder links/rechts en krijgen op hogere floors oplopend vaker een extra grote verticale tussenruimte.
- FitnessSyncer verwerkt stappen naast afstand, voorkomt dubbeltelling tussen telefoon en horloge en keert na OAuth terug naar web of app-instellingen.
- Daily mission-bugrewards verschijnen direct als BugDex-popup en hoeven niet meer als rondlopende bug gevangen te worden.
- Buddy-timers worden direct in Firebase opgeslagen en blijven op absolute eindtijd doorlopen wanneer de webpagina gesloten is.
- Hidden/testaccounts en normale accounts blijven strikt gescheiden in Home en de volledige Score- en Duel-ranglijsten.
- Bug Tower start direct met opwaartse druk; een volle jumpbalk haalt circa 5-6 treden en de groene MEGA-power-up geeft +100 punten en een sterkere volgende sprong.
- Settings benoemt exact welke FitnessSyncer-configuratie nog ontbreekt.

## 2.10.11

- Google login on web uses Firebase popup authentication and no longer calls the unsupported React Native Google Sign-In implementation.
- Bug Tower supports uninterrupted long holds on web; selection/copy gestures cannot trigger an early jump.
- Owner-only Buddy, BugDex and mastery reward permissions were compiled and published to Firestore.

## 2.10.10

- Fullscreen webgames blokkeren tekstselectie, contextmenu en de mobiele copy-callout tijdens hold-controls.
- Bug Tower-pickups zweven los en seeded verspreid tussen de treden; de rocket vliegt 3 seconden met hogere klimsnelheid.
- Bubble Swarm bevat Bomb en Freeze in bestaande gridbubbels; drukrijen behouden hun horizontale volgorde en schuiven geanimeerd omlaag.
- Web Runner accepteert een verticale swipe omhoog als jump; Train-sluiten verlaat iedere minigame direct.
- Nest Defense gebruikt een afzonderlijk compact control deck en micro squad-overlay, zodat webcontrols het speelveld niet meer bedekken.
- Het nieuwe-meldingsformulier toont Bug, Tip, Trick en Idee permanent als categorieknoppen in plaats van achter een verborgen dropdown.
- Nest Defense gebruikt een afzonderlijke volledige taplaag; torenknoppen blijven interactief en spelvisuals kunnen handmatige aanvallen niet meer onderscheppen.
- BugDex-aantal-, legendary-, mythic- en setmedailles worden rechtstreeks uit de historische unlocklijst berekend.
- Alleen Train/practice toont een stopknop en accepteert Android-back tijdens een actieve run; ranked runs blijven gesloten tot het resultaat.

## 2.10.9

- Bug Glide houdt het karakter weer volledig rechts van de linker lijn; taps links van de lijn blijven de bug naar rechts sturen en visuele lagen onderscheppen geen input.
- Bug Tower toont een vaste `LAND → TAP → FLIP`-uitleg en een duidelijke 360ms `TAP NOW`-balk voor de extra salto.
- Bug Tower start survivaldruk ook bij een stilstaande speler, eindigt voor beginners rond 45-60 seconden en begrenst perfecte runs op 120 seconden.
- Tower-pickups verschijnen op seeded onregelmatige intervallen: coins geven score, rockets geven korte vlucht en springs laden één extra hoge salto.
- Bubble Swarm gebruikt een strak overlappend hexgrid zonder zichtbare lege ruimtes; projectielen behouden hun vloeiende volledige traject.
- Bomb, Freeze en Rainbow verschijnen gegarandeerd maar onregelmatig iedere 7-10 schoten; Rainbow neemt de sterkste aangrenzende kleur over.
- Bubble Swarm-druk is gekalibreerd op circa 52 seconden zonder spel, circa 90 seconden voor goede spelers en maximaal 120 seconden.

## 2.10.8

- Bug Tower-bediening gebruikt weer de volledige linker- en rechterhelft van het speelveld; moving platforms, vloerdruk, smallere treden en pickups schalen veel sneller op.
- Tredebreedte is vanaf floor 50 gehalveerd, vanaf 100 een derde en vanaf 200 een kwart, met vloeiende extra moeilijkheid tussen de mijlpalen.
- Coin- en rocket-pickups staan betrouwbaar op een trede; een getimede tap na een salto start direct een nieuwe salto.
- Bubble Swarm-projectielen volgen één vloeiend traject en eindigen exact op de gekozen gridcel, met een volledige richtlijn en vaker beschikbare bomb/freeze-power-ups.
- Train is hersteld voor alle arcadegames, inclusief Bubble Swarm, en oefenruns wijzigen geen ranked resultaat, Firestore-run of lokaal highscore-record.
- Herculeskever-afbeelding vervangen door een volledig zichtbare, transparante HD-versie zonder afgekapte hoorn of poten.

## 2.10.7

- Responsive web mobile shell toegevoegd met gecentreerde 460px-layout, locked document viewport en interne schermscroll.
- Actieve duelgames gebruiken een fullscreen game-shell zonder BottomNav, walking bugs of foreground reward overlays.
- Bug Tower uitgebreid met deterministische high-floor scaling, moving platforms, coins, chain jumps en tijdelijke rocket flight.
- Bubble Swarm uitgebreid met transform-geanimeerde wall-bounce projectielen, aim preview, bomb blast en freeze power-ups.
- Buddy action/status visuals gebruiken transparante PNG-assets; Hooiwagen-crop is gecorrigeerd.
- Dagelijkse duelmissie verhoogd van vijf naar zeven duels met behoud van het bestaande claim-id.

## 2.10.0

- Ranked inactivity-decay kan ratings onder 1000 brengen en stopt pas bij de absolute bodem van 100.
- Dagelijkse server-side ranked rating-decay toegevoegd via GitHub Actions, zodat gemiste dagen ook zonder app-login worden verwerkt.
- Bug Tower-kantelbesturing vervangen door vasthouden-om-te-rennen en loslaten-om-te-springen, inclusief zichtbare jump-power meter.
- Spronghoogte schaalt met aanloopafstand en snelheid; snelle geladen sprongen geven het keverpersonage een volledige spinanimatie.
- Iedere trede toont een floornummer en elke 100 floors start een nieuw achtergrondgenre met eigen platformkleuren.
- Vier nieuwe towerzones toegevoegd: Hive Jungle, Ember Forge, Sky Temple en Cosmic Void.
- Neerwaartse floor pressure, platformgaten, platformbreedtes en bewegende treden schalen vloeiender en worden op hoge floors steeds onhoudbaarder.
- Bubble Swarm toegevoegd als zesde Arena-game en zelfstandige soloscore-run.
- Drag-to-aim/release-to-shoot, geanimeerde projectielen, zes bug-bubbles, match-3, chain bonuses en vallende losgeraakte clusters toegevoegd.
- Oplopende zwermdruk, dalende misslimiet en een harde 90-seconden survivalgrens zorgen dat iedere run eindigt.
- Lokale highscores en afzonderlijke `arcadeGameResults/bubble_swarm/runs`-records toegevoegd zonder Bubble Swarm als duel/ranked-mode te registreren.
- Originele verticale tuinachtergrond en zes ronde insect-bubble-assets toegevoegd.
- 45 nieuwe BugDex-insecten toegevoegd met transparante 512x512-crops, Nederlandse namen, type, zeldzaamheid en oplopende unlocks.
- Vier nieuwe scoretiers toegevoegd op 5.000, 10.000, 20.000 en 40.000 punten, met eigen insectbeelden en frames.
- Nest Defense koppelt tap-effecten en vijandselectie exact aan de aangetikte positie binnen het speelveld, ook wanneer de bug zelf het touch-target is.
- Ranked Duel rating daalt met 5 punten per volledig gemiste dag; decay stopt op 1000 en wordt per dag maar eenmaal toegepast.
- Bug Tower toegevoegd als vijfde Arcade-game met kantelbesturing, tap-to-jump en zichtbare touchfallback.
- Nieuwe geanimeerde kever met idle-, ren-, spring-, val- en landingsposes plus een originele ijstorenachtergrond.
- Endless floors, wall-bounces, multi-floor combo's, vier torenzones, bewegende platforms en oplopende scrollsnelheid toegevoegd.
- Bug Tower gekoppeld aan training, ranked duels, lokale highscores, Arcade-resultaten en de dagelijkse five-game missie.
- Ranked Bug Tower-runs worden in Firebase herkenbaar gekoppeld aan hun duel; bestaande Arcade-games blijven hun oude recordvorm gebruiken.

## 2.9.3 - local changes

- Medailles, collectie-achievements en bijbehorende characters blijven unlocked nadat een bug is geruild of gebruikt.
- Web Runner, Nest Defense en Bug Glide blijven op tablets in portrait en kunnen tijdens ranked niet worden geannuleerd.
- Bug Glide heeft links een zichtbare klikbare stuurstrook waarmee de bug betrouwbaar naar rechts kan worden gestuurd.
- Nest Defense herkent taps op naderende vijanden betrouwbaarder op verschillende schermformaten.
- De buddywidget wisselt nu tussen afbeeldingen voor expeditievoortgang, reward klaar, beschikbaar en rust.

## 2.5.2

- Foreground reward-bugs uit wandelen/widget-claims blijven nu in queue tot ze gevangen zijn; unlock-popups wachten tot de reward-queue leeg is.
- Tijdelijk verborgen reward-bugs worden gepauzeerd in plaats van als gemist verwijderd, zodat meerdere verdiende bugs niet verloren gaan of dubbel worden uitgekeerd.

## 2.5.1

- Daily mission claims werken met gedeployde Firestore rules voor daily claims en mission progress.
- Solo Campaign boss-kills worden extra vastgelegd bij doorgaan naar de volgende wave, zodat wave 4/8/12/16/20 meetellen.

## 2.5.0

- Home heeft nu Daily missies met XP rewards en een daily BugDex bonus als alle daily doelen gehaald zijn.
- Weekly missies gebruiken nu echte Solo Campaign boss-kills voor het boss-doel.
- BugDex toont `niet unlocked` op basis van ooit unlocked, en losse per-bug upgradeknoppen zijn weggehaald.
- Rank toont top 3 nog maar een keer en laat characters zien in alle rankingrijen.

## 2.3.0

- Grote feature-release met alle verbeteringen sinds 2.2: Arena is uitgewerkt met Duel, Training en Solo Campaign.
- Solo Campaign heeft 20 waves, boss waves, dagelijkse boss rewards, levens, opgeslagen progress en betere balancing.
- Actieve Bug Squad helpt zichtbaar mee met Zap, Sticky, Shield, AOE, Burst en Mythic specials met timer-acties.
- BugDex heeft betere foreground rewards, nieuwe drop-balans, trade history, aparte Ruilen/Upgrades panels en HD knopbeelden.
- Organisaties zijn toegevoegd voor private bugs/ideeën/tricks, met ledenbeheer, invites, org-labels en org-ranking.
- Notificaties en badges zijn slimmer: Arena telt inkomende duels, BugDex telt inkomende ruilen, oude completed acties verdwijnen.
- Movement, weekly missions, starter boost, rankings en BugBaas Wiki zijn verder opgepoetst en beter uitgelegd.

## 2.2.35

- BugDex Upgrades heeft een nieuwe HD knopafbeelding met upgrade-machine, potjes en tier-pijlen.

## 2.2.34

- Cimpro ledenlijst stopt niet meer wanneer de organisatie-doc zelf geen leesrecht geeft; bekende leden laden dan alsnog via user-membershipvelden.

## 2.2.33

- Organisatiebeheer crasht niet meer op optionele invite-permission reads.
- Ledenlijst wordt robuuster geladen via user-membershipvelden en vult members-subcollection aanvullend aan.
- Firestore rules opnieuw gedeployed voor organisatiebeheer.

## 2.2.32

- BugDex heeft nu aparte dropdowns voor Ruilen en Upgrades, zodat de twee flows niet meer samen in een lange workshop zitten.
- Home toont de BugBaas Wiki als mooiere HD beeldknop.

## 2.2.31

- Organisatieleden toevoegen werkt nu op de geselecteerde username/userId en doet geen brede invite-checks meer op verborgen e-mailvelden.

## 2.2.30

- Home heeft onderaan een Help / BugBaas Wiki knop die de live wiki opent in de voorkeursbrowser.

## 2.2.29

- Profiel laadt organisatiegegevens vers uit Firestore, zodat Cimpro-leden niet meer als 0 leden blijven staan.
- Organisatiebeheerders kunnen de organisatienaam wijzigen en een organisatie verwijderen met bevestiging.
- Rank-tab heeft nu een dropdown om tussen alle spelers en je eigen organisatie-ranking te wisselen.
- Arena/BugDex badges tellen alleen echte inkomende acties: inkomende duels voor Arena en inkomende ruilverzoeken voor BugDex.

## 2.2.28

- Starter boost zit nu in de APK met de nieuwe drempel: accounts onder 80 XP krijgen 3 dagen 2x XP en extra BugDex-rolls.
- Bestaande actieve users onder 80 XP zijn server-side met terugwerkende kracht bijgewerkt.

## 2.2.27

- Arena-badge telt nu alleen inkomende duelacties, zodat uitgaande wachtduels geen onterechte badge meer geven.
- Foreground BugDex rewards uit duel en movement claims blijven langer in de wachtrij en kunnen ook buiten de hoofdtabbladen spawnen zodra de UI vrij is.
- Health Connect movement verwerkt hardlopen en fietsen beter apart zonder loopafstand kapot te maken.
- BugBaas Wiki is simpeler gemaakt met paginaknoppen, echte vlagknoppen en light/dark mode.

## 2.2.26

- Duel win BugDex rewards blijven nu als foreground catch verschijnen, ook als je na spelen terug op Arena staat.
- Ruilen toont duidelijk wat de ander aanbiedt, wat van jou gevraagd wordt, en bewaart een compacte ruilhistorie.
- Trade-selecties sorteren hogere tiers bovenaan, zodat zeldzame bugs sneller zichtbaar zijn.
- Random BugDex-routes zijn opnieuw gebalanceerd: Episch blijft onder 5% en Zeldzaam onder 25%, inclusief boosts en Android radar.

## 2.2.25

- Arena-tab badge telt duelacties nu op basis van echte actieve duelrecords in plaats van oude duel-notificaties.
- Uitgaande wachtduels tellen als 1 actieve Arena-actie en stale completed/gelezen duels tellen niet meer mee.
- Wiki-navigatie is verder opgepoetst met linkernavigatie, losse featurepagina's en uitgebreidere Mythic special uitleg.

## 2.2.24

- Navigatie-acties voor duels en ruilen zijn verplaatst van bovenin-toast naar badges op Arena, BugDex en de relevante tegenstanderkaarten.
- Solo Campaign is gebalanceerd: waves tot en met 16 zijn beter haalbaar met epische helpers; waves 17-20 blijven endgame.
- Actieve helperselectie toont nu attack-type afbeeldingen, inclusief Mythic special visuals.
- Boss 5 geeft nu een dagelijkse 15 XP reward en weekly all-3 bonus is lager gebalanceerd naar 75% Zeldzaam, 23% Episch en 2% Legendarisch.
- BugBaas Wiki toegevoegd met tabnavigatie, taalkeuze, drop-kansen, upgrade-uitleg en Mythic special kaarten.

## 2.2.23

- Epic en Legendary BugDex-kansen zijn lager gebalanceerd voor normale rewards, duel rewards, weekly rewards en foreground splats.
- Android radar-widget rolls zijn strakker gezet: minder Epic/Legendary, meer Zeldzaam.
- Starter boost blijft een extra onafhankelijke roll geven, maar gebruikt dezelfde lagere rarity-balans.

## 2.2.21

- BugDex ruilen en upgrades tonen actieve helperbugs als locked potjes en blokkeren selectie zolang ze actief zijn.
- Organisatiebeheer op profiel toont bestaande organisaties duidelijker, met inklapbaar ledenbeheer, uitnodigen en verwijderen.
- Helperbalance is aangepast: hogere rarity bugs geven sterker sticky/shield/control-effect en minder nadruk op pure damage.
- Arena duel-tegenstanders tonen oude completed scores niet meer; alleen pending scores blijven zichtbaar.
- Daily duel reward-status toont kort of reward al geclaimd is, terwijl extra duels zonder reward mogelijk blijven.
- Rank en foreground catch polish: namen zijn beter leesbaar en foreground catches blijven langer beschikbaar terwijl de app open is.

## 2.2.20

- Organisatiebeheer is zichtbaarer gemaakt: admins kunnen organisaties aanmaken, members beheren en org-meldingen herkennen op cards en details.
- BugDex toont je drie actieve helpers weer als HD potjes in de Bug Squad kaart.
- Arena toont helperpotjes ook bij actieve of wachtende duels.
- Duel wacht-score verschijnt alleen nog voor je eigen verzonden duel zolang de tegenstander nog moet spelen.
- Duel score-submit bewaart een veilige score op basis van gevangen bugs en voorkomt dat een late `0` een betere server-score overschrijft.

## 2.2.19

- Organisaties ondersteunen nu meerdere members per organisatie en meerdere organisaties per gebruiker.
- Org-members staan server-side onder `organizations/{orgId}/members/{uid}`, met legacy `organizationId` fallback voor oude app-versies.
- Bug/idee/tip/workaround aanmaken kan nu expliciet Public of onder een gekozen organisatie.
- Organisatiebeheer toont members per geselecteerde organisatie en uitnodigen/verwijderen werkt per organisatie.
- Firestore rules en Cimpro seed zijn bijgewerkt voor private org-meldingen en members.

## 2.2.18

- Actieve duelkaarten tonen nu jouw opgeslagen score in plaats van het aantal gevangen bugs.
- Duel score-submit corrigeert `score: 0` automatisch naar een minimale score op basis van gevangen bugs, en herstelt bestaande wachtende 0-score duels zolang de tegenstander nog niet gespeeld heeft.
- De dubbele passieve helperpotjes zijn uit actieve duels weggehaald; tijdens gameplay blijven alleen de helper towers met timer zichtbaar.
- Duelspawns zijn verhoogd van 48 naar 56 bugs per duel en blijven per duel-seed gelijk voor beide spelers.

## 2.2.17

- Duel retry is nu expliciet beschikbaar als jouw opgeslagen run 0 gevangen bugs heeft en de tegenstander nog niet gespeeld heeft.
- Een tegenstanderkaart met `actief duel loopt al` opent nu het bestaande duel, zodat je die 0-bugs retry ook na OK op het wacht-scherm kunt bereiken.

## 2.2.16

- Helper wisselen toont nu expliciet het attack type: Zap, Sticky, AOE, Shield of Burst.
- Het scherm `Score opgeslagen, wacht op andere speler` kan nu 1x worden weggeklikt zonder naar Home te gaan; Arena blijft bruikbaar en het actieve duel blijft zichtbaar in de lijst.
- De duellijst ververst na score-submit, zodat actieve duels je eigen gevangen bugs tonen.
- BugDex toont nog maar 1 ruilen/upgrades ingang: de HD workshopkaart opent/sluit direct het trade/upgrade panel.
- Weekly movement mission is verhoogd naar 7.5 km met decimalen-progress en screenshot weekly missions zijn verwijderd.

## 2.2.15

- Firestore duel rules zijn gelijkgetrokken met 48 duel bugs, zodat duel aanvragen niet meer op permissies falen.
- De uitdager mag zijn preplay score nu ook server-side opslaan terwijl het duel nog `pending` is.
- Lage duel scores onder 30 tonen weer een retry-optie en lokale scores worden automatisch opnieuw gesubmit als de server ze nog niet heeft.
- Solo Campaign bewaart nu wave en levens in Firestore met lokale fallback, zodat `2/3` levens na update/herstart niet terug naar `3/3` springt.

## 2.2.14

- Bug Squad helpers werken weer tijdens duel preplay en doen weer consequent damage per cooldown.
- Duel targets blijven tot vlak voor 0 seconden spawnen en de target pool is verhoogd, zodat snelle spelers/helpers de arena niet vroeg leegmaken.
- Solo Campaign powerups zijn actiever gebalanceerd: Lamp Focus geeft een kleine tapreductie plus periodieke lamp-hit; Bug Bomb is een handmatige beperkte AOE tijdens de wave.
- Duel XP blijft 10 XP voor winst en 5 XP voor verlies, maar telt nu maximaal 1x per dag per tegenstander; extra duels mogen wel gespeeld worden zonder extra reward.
- Actieve duel-blokkade toont hoeveel bugs jij in dat lopende duel hebt gepakt.

## 2.2.13

- Duel waiting hang gefixt: na je eigen ronde wordt de lokale score direct gebruikt om het wacht-op-andere-speler scherm te tonen.
- Fullscreen duel sluit na submit direct af in plaats van op een lege arena/spinner te blijven hangen.
- OK op het wacht-op-score scherm brengt je terug naar home.

## 2.2.12

- Duel preplay tap-regressie gefixt: de uitdager kan na het versturen van een challenge weer direct bugs raken.
- Bug Smash targets gebruiken nu directe press-in hits, zodat snelle dubbele taps meetellen.
- Solo Campaign heeft 3 levens per run: mislukte waves kunnen opnieuw, bij 0 levens start je weer op wave 1.
- Tijdens fullscreen duel/campaign is in-app navigatie naar home/tab geblokkeerd om per ongeluk wegklikken te voorkomen.
- Helper-bonussen zijn opnieuw gebalanceerd: hogere tiers hebben betere proc-kans, damage, control en late-target bereik.
- Bij wachten op de andere speler blijft je score zichtbaar; onder 30 punten kun je je eigen ronde opnieuw spelen zolang de ander nog niet gespeeld heeft.

## 2.2.11

- Solo Campaign boss waves geven nu extra daily boss rewards: boss 1 geeft 5 XP, boss 2 een normale BugDex unlock, boss 3 geeft 10 XP en boss 4 een zeldzame BugDex unlock.
- Boss bonusclaims zijn server-side per dag en bosslevel begrensd, zodat heropenen of opnieuw renderen geen dubbele rewards geeft.

## 2.2.10

- Duel-startflow gefixt: de uitdager krijgt na app sluiten/heropenen opnieuw een startknop zolang hij nog geen score heeft.
- Er kan nog maar een actief duel tussen twee spelers openstaan; bestaande pending/accepted duels blokkeren nieuwe aanvragen.
- Android meldingen worden opgeruimd na openen, afhandelen of reward claimen.
- Actieve Bug Squad toont nu per helper wat Zap, AOE, Sticky, Shield en Mythic specials in duel/campaign doen.
- Solo Campaign wave 11+ en 14+ hebben meer targets/spawnruimte en boss waves hebben veilige bonus-windows zonder extra penalty.

## 2.2.9

- Solo Campaign gaat alleen naar de volgende wave als de targetscore echt is gehaald.
- De result-knop gebruikt nu een expliciete wave-cleared state, zodat een gehaalde wave niet meer als restart level 1 eindigt.
- Bij niet halen blijft de campaign correct herstarten vanaf level 1.

## 2.2.8

- Arena-knoppen voor Duel, Training en Solo Campaign zijn hersteld naar duidelijke thumbnail-knoppen met vaste labels.
- Solo Campaign toont targetpunten alleen nog in het fullscreen spel als `x / target`.
- Gewonnen Solo Campaign waves tonen alleen de logische vervolgactie: volgende wave of campaign restart.
- Stoppen tijdens Solo Campaign vraagt nu bevestiging en de laatst vrijgespeelde wave wordt lokaal onthouden.

## 2.2.7

- Weekly mission claims zijn server-side toegestaan en worden na claim opnieuw gelezen, zodat claimknoppen niet blijven hangen.
- Weekly missions zijn zwaarder gebalanceerd en tonen nu vooraf hun reward: XP, normale BugDex of zeldzame BugDex.
- Nieuwe weekly movement mission: loop deze week 5 km.
- Arena-knoppen voor Duel, Training en Solo Campaign zijn duidelijker met HD image cards.
- Solo Campaign toont geen dubbele onderste squad meer, verbergt bonusitems tijdens waves en springt bij targetscore direct door naar de volgende wave.

## 2.2.6

- Duel resultaat-popups worden server-side als gezien opgeslagen, zodat Claim/OK niet opnieuw blijft verschijnen.
- Duel XP claim wordt samen met de server-side claim afgehandeld, zodat XP niet verloren gaat bij app sluiten.
- Arena heeft bovenaan directe knoppen voor Duel, Training en Solo Campaign.
- Geannuleerde duels verdwijnen uit Recent en actieve BugSquad slots tonen duidelijker hun role.

## 2.2.4

- Actieve squad-potjes zijn nu ook zichtbaar onderaan de fullscreen arena bij normale 1v1 duels, Training en Solo Campaign.
- Duel-starttekst verduidelijkt dat beide spelers hun eigen 30 seconden kunnen spelen.
- Weekly bonus claim is robuuster: XP en BugDex reward worden samen afgehandeld.

## 2.2.3

- Solo Campaign bosses zijn nu grote eigen boss-bugs met vijf HD designs, langere boss waves en veel meer HP.
- Verliezen in Solo Campaign start weer bij wave 1; campaign clear geeft 1x per dag een zeldzame BugDex reward.
- Weekly bonus claim geeft zichtbare foutmelding en gebruikt de geüpdatete user voor de BugDex reward.
- Bugs bekijken heeft een periode-dropdown: Alles, Vandaag en Deze week.
- Bug Radar widget toont open ruil- en duelverzoeken met een nieuwe HD request-visual.

## 2.2.2

- BugDex toont weer gewone bug-afbeeldingen in plaats van potjes.
- Duel en Solo Campaign gebruiken onderaan een nieuw rustig HD leeg potje voor de actieve squad.
- Solo Campaign toont targetpunten per level en gebruikt hogere, duidelijkere scoredoelen.
- APK blijft geoptimaliseerd rond 40 MB door zware afbeeldingen te vervangen/downscalen.

## 2.2.1

- GitHub release notes tonen de release-afbeelding nu bovenaan in de changelogtekst in plaats van als losse image attachment.
- Solo Campaign heeft boss rewards: Lamp Focus en Bug Bomb zijn solo-only powerups met eigen HD art en compacte inventory in de Solo kaart/HUD.
- Duel, Training en Solo Campaign zijn visueel duidelijker gesplitst op het startscherm.
- BugDex bugs en active squad gebruiken nu HD potjes met rarity/tier kleur.
- Solo Campaign targets zijn verhoogd; level 1 start nu op 60 punten.

## 2.2.0

- Duel helper-animaties blokkeren taps niet meer; hogere rarity targets hebben een iets grotere hitbox en Bug Squad potjes gebruiken de HD jar-art.
- Home vervangt de losse Acties-kaart door Solo Duel met nieuwe HD campaign-art.
- Bug Smash Duel heeft nu een Solo Campaign: 20 waves tegen BugBot, elke vierde wave een boss wave en oplopende targets/rarities zonder rewards.
- Solo Campaign balance is vastgelegd en gesimuleerd met beginner, gemiddelde, epic squad en mythic squad profielen.
- De 2.2.0 changelog-popup toont nieuwe HD release-art voor Solo Campaign.

## 2.1.23

- Duel toont na jouw score nu een wacht-op-resultaat popup als de andere speler nog moet spelen, en toont de uitslag als popup zodra beide scores geregistreerd zijn.
- Weekly bonus claim geeft nu ook XP tijdens de claim, zodat de weekly reward XP zichtbaar en opgeslagen wordt.
- Weekly mission XP is verlaagd van 15 naar 10 per missie; de complete weekly bonus geeft +10 XP naast de BugDex reward.

## 2.1.22

- Sticky helpers geven nu een korte slow/pauze en doen iets duidelijker hit-damage.
- Shield helpers grijpen eerder in bij bijna ontsnappende bugs, geven een korte guard-pauze en doen meer urgent damage.
- Helper base damage is licht verhoogd voor Zeldzaam, Episch en Mythisch.

## 2.1.21

- Bug Smash Duel helpers passen hun hits nu toe met dezelfde actuele tick-tijd als hun target-keuze, zodat helper damage niet meer wordt weggegooid terwijl tap damage wel werkt.
- Release blijft legacy-signed voor bestaande installs.

## 2.1.20

- Compatibility APK voor bestaande GitHub installs: release is weer met dezelfde legacy/debug signing als 2.1.18 gebouwd, zodat Android geen update-conflict geeft.
- Package blijft `nl.cimpro.bugbaas`; alleen `versionCode` is verhoogd naar 91.

## 2.1.19

- Feature train 2.1 blijft in release notes zichtbaar: Bug Smash Duel, training, helper bugs, Mythic specials, XP/reward-balans en Android install/signing horen samen uitgelegd te worden.
- Home toont geen losse Health Connect/helptekst meer onder de km-progressie.
- Bug Smash Duel helper-aanvallen gebruiken nu HD sprite-effecten en elke Mythic special heeft een eigen herkenbare animatie.
- Release- en balance-procedures zijn vastgelegd in Markdown, inclusief XP per actie, BugDex dropkansen en release note beleid.

## 2.1.18

- Nieuwe legacy APK met verhoogde Android versionCode, zodat toestellen de update boven 2.1.17 accepteren.

## 2.1.17

- Bug Squad helpers mikken nu alleen op bugs die echt zichtbaar in de arena staan, zodat aanvallen niet meer op verborgen targets lijken te missen.
- Helpers vermijden targets die al bijna uit beeld zijn; Shield mag nog iets later ingrijpen.
- Helper charge-bars tonen ook voor de eerste shot een gedeeltelijke lading in plaats van klaar/vol.

## 2.1.16

- Bug Squad helpers doen nu duidelijker echte hit-damage in Bug Smash Duel, zodat je na hun aanvallen minder hoeft te tikken.
- Helper damage schaalt balanced met helper-rarity en target-rarity; sterke helpers kunnen lage targets soms direct afmaken.
- Helper charge-bars starten niet meer vol en Legendary/Mythisch helpers laden sneller dan normale helpers.

## 2.1.15

- Bug Squad helpers in Bug Smash Duel hebben nu drie verschillende game-achtige attack animaties: orbs, slash en pulse-wave.
- Hits voelen duidelijker met muzzle flashes, impact sparks, target-ringen en AOE-secondary markers.
- De gameplay-kracht is gelijk gebleven; deze release verbetert alleen feedback, leesbaarheid en fun.

## 2.1.14

- Helper-aanvallen in Bug Smash Duel zijn duidelijker: je ziet nu vanaf welke actieve bug een hit komt en welke target geraakt wordt.
- Zap, Sticky, AOE en Shield hebben zichtbare impact-animaties; AOE markeert ook de extra geraakte bugs.
- Shield heeft een duidelijkere guard-ring en korte uitleg in de actieve Bug Squad-kaart.

## 2.1.10

- Bug Smash Duel toont de uitdager nu eerst een start-popup zodra de tegenstander accepteert.
- De accepterende speler gaat nog steeds direct door naar de countdown/game.

## 2.1.9

- Home gebruikt bovenin nu een compactere header en toont direct BugDex-voortgang als `x/125`.
- Firestore duel-regels accepteren nu de nieuwe 36 bugs per duel, zodat uitdagingen niet meer op permissies falen.
- Radar/queue bug rewards tonen direct een BugDex-popup, zodat duidelijk is welke bug je kreeg.
- Duel annuleren verwerkt sneller in de UI en meldt het als de server-cancel niet lukt.
- De release-APK wordt legacy-compatible gesigned voor gebruikers die vanaf 1.x updaten.

## 2.1.8

- Bug Smash Duel beweegt vloeiender: targets updaten vaker met kleinere stappen in plaats van grote zichtbare sprongen.
- Taps registreren directer doordat hit-count, score en gevangen bugs meteen in lokale refs worden bijgewerkt.
- Er komen meer bugs langs per duel, met een hogere zichtbare cap zonder de arena onbeperkt vol te renderen.

## 2.1.7

- Bug Smash Duel is lichter gemaakt voor Android: achtergrondbugs, foreground catch en in-app overlays draaien niet meer mee tijdens de duel-route.
- Actieve duels gebruiken nu een fullscreen arena met minder gelijktijdige targets en minder renderdruk.
- Duel-taps zijn beter gebalanceerd: hogere rarity kost meer taps, levert meer punten op en gewone hit-geluiden worden gethrottled voor soepelere gameplay.

## 2.1.6

- Duel-uitdagingen geven nu een echte telefoonmelding aan de uitgedaagde speler zodra diens app pushmeldingen heeft geregistreerd.
- Het duel-scherm toont voor de ontvanger duidelijk dat hij is uitgedaagd, met accepteer/weiger actie zolang het duel wacht.
- Helpers wisselen in het duel-scherm opent nu duidelijk de gevangen BugDex-collectie en de actieve helperpotjes zijn zelf tappable.
- Home gebruikt een nieuw HD settings-tandwiel en de losse `(i)` knop bij Beweeg radar is verwijderd.

## 2.1.5

- Duel starten vanaf een collega-profiel houdt die collega nu direct geselecteerd in het duel-scherm.
- Het duel-wachtscherm toont duidelijk dat je op acceptatie wacht en laat je actieve Bug Squad-bugs als potjes met bugafbeelding zien.
- Actieve duel-bonussen kunnen vanuit het duel-scherm worden gewisseld zonder eerst terug naar BugDex te gaan.

## 2.1.4

- Simpele collega-install release: één ARM64 APK, zonder AAB in GitHub release.
- APK is weer met de oude werkende install-key gesigned, zodat updates over 1.x/2.0.x installs blijven werken.
- Duel blijft behouden en Android permissies blijven opgeschoond.

## 2.1.3

- Install/Play Protect cleanup: overbodige launcher-badge en legacy storage permissies zijn uit de release-APK gehaald.
- Duel blijft behouden; deze fix raakt alleen Android manifest/signing/installatie.
- Let op: oude debug-signed APK's kunnen niet over dezelfde package worden geüpdatet met een release-signed APK. Verwijder een oude debug-installatie éénmalig als Android een package/signature conflict meldt.

## 2.1.2

- De bonus voor dubbele bugs heet nu XP, zodat duidelijk is dat duplicates extra XP-waarde geven.
- Bug Smash Duel staat duidelijker in de changelog-popup met een korte uitleg en duel-afbeelding.
- ARM release-APK opnieuw gebouwd met dezelfde echte upload signing, zodat Android/Play Protect hem kan accepteren.

## 2.1.1

- Bug Squad boosts in foreground en Bug Smash Duel zijn opnieuw gebalanceerd: elke bonuscategorie heeft nu een concreet nuttig effect.
- Catch assist vergroot nu de echte raakzone in plaats van gratis taps te verlagen; de vliegenmepper blijft alleen visuele feedback.
- Duel-bonussen zijn verdeeld over hitbox, rustiger targets, combo grace, support bonuspunten, focus startvoordeel, rarity/XP bonuspunten en betere duel-reward kans.
- Release builds worden niet meer met de Android debug-keystore ondertekend, maar met een lokale upload-keystore.
- Onnodige gevoelige Android-permissies zoals camera, microfoon, overlay en write external storage zijn uit de release manifest gehaald.

## 2.1.0

- Nieuw spelletje: Bug Smash Duel, waarin je een collega uitdaagt, na 3-2-1 tegelijk bugs smashed en de winnaar een BugDex reward kan claimen.
- Duel-uitdagingen werken via Home, collega-profiel en Android/in-app meldingen die direct naar de arena openen.
- Foreground bugs en Duel gebruiken nu dezelfde herbruikbare HD vliegenmepper-hit animatie met hit/catch feedback.
- Actieve Bug Squad-bonussen helpen nu ook in duels: kennisdelen, helpen, catch assist en catch time geven kleine gebalanceerde tap-voordelen.
- Changelog-popup voor 2.1.0 toont de nieuwe duel-visual, vliegenmepper en Bug Squad bonus-uitleg.

## 2.0.6

- Beweegrewards zijn actiever: lopen geeft nu per 1,5 km een radar reward, hardlopen per 3 km en fietsen per 5 km.
- Het daglimiet voor beweegrewards is verhoogd naar 10 per dag en de teller reset weer naar 0/10 op een nieuwe dag.
- Rest-kilometers lopen door naar de volgende dag voor reward-progress, zonder totale km of badges dubbel te tellen.
- Ruilselectie toont nu welke bugs nieuw voor jou zijn en welke aangeboden bugs de collega nog mist.
- Expo Go login crasht niet meer op de native Google Sign-In module; e-mail login blijft testbaar in Expo Go.
- Release notes hebben een nieuwe HD BugBaas visual voor radar, ruilen en beweegdoelen.

## 2.0.5

- Home gebruikt grotere HD-knoppen voor profiel en instellingen, met character/app-badge visuals in plaats van simpele iconen.
- Home claim en radar-widget zijn gekoppeld: als een beweegreward via een van beide wordt geclaimd, verdwijnt dezelfde reward overal.
- Beweegrewards die via Home worden geclaimd starten direct als foreground bug reward in de app.
- BugDex collectie op profiel heeft een nieuwe HD kaart en de losse previewrij met vijf bugs is verwijderd.
- Collega-profielen bekijken is read-only en geeft geen random BugDex unlock meer.
- Bestaande badges worden bij deze update niet opnieuw als unlock-popup getoond; alleen nieuw verdiende badges verschijnen nog.

## 2.0.4

- Home-header is rustiger gemaakt: de grote bug bovenaan is weggehaald zodat lange namen beter passen.
- Ruilen en upgrades staan nu bovenaan in BugDex als duidelijke werkplaatskaart met afbeelding.
- Ruil- en upgrade-keuzes tonen nu ook de passieve Bug Squad-buff van elke bug.

## 2.0.3

- Badge unlock-popups worden nu per badge onthouden en verschijnen niet opnieuw als die badge al eerder als unlock is getoond.
- Changelog-popup wordt direct als gezien opgeslagen zodra hij opent, zodat dezelfde versie niet opnieuw blijft verschijnen.
- Collega-profielen tonen nu een read-only BugDex-overzicht met nummers, afbeeldingen, aantallen, rarity en buffs.
- Actieve bugs, snelle Home-acties en BugDex zichtbaarheid hebben compactere visuele knoppen.
- Radar-widget animatie is vloeiender met extra, kleinere frames.

## 2.0.2

- Zelfde visuele 2.x changelog als 2.0.1, zodat gebruikers na deze update nog steeds de grote update-uitleg zien.

## 2.0.1

- Grote samenvatting in de changelog-popup voor alles wat sinds de 1.x-reeks nieuw is, met korte uitleg en visuals per onderdeel.
- Beweeg radar, Health Connect, widget rewards en handmatig claimen staan duidelijker in de release-uitleg.
- BugDex-uitbreidingen, Mythische bugs, HD badges, characters, Bug Squad en rank-progressie worden samen uitgelegd.
- Release APK kleiner gemaakt door oversized afbeeldingen en Android-resources te optimaliseren zonder functies te verwijderen.

## 2.0.0

- Alle badge-afbeeldingen vervangen door HD game-badges in consistente BugBaas-stijl.
- Badge-overview vernieuwd voor profiel/changelog visuals.
- Bug Squad uitleg is herschreven in normale taal en toont actieve bugs met een HD potje-visual.
- Rank-progressie aangescherpt: hogere tiers vragen nu duidelijk meer XP.
- BugDex unlocks uit bestaande rank/point-regels worden server-side aangevuld in de gebruiker-inventory.

## 1.5.9

- Badges werken nu actief op basis van bugmeldingen, punten, splats, ruilen, upgrades en BugDex-mijlpalen.
- Nieuwe beweegbadges tellen totaal geregistreerde loop-, hardloop- en fietskilometers zonder dubbele dagtelling.
- Nieuwe rarity-badges voor eerste en meerdere Legendarische en Mythische BugDex-vondsten.
- Nieuwe HD bug-catcher characters zijn vrij te spelen met oplopende tiers en punten.
- Changelog-popup toont deze badge-update met visuele kaarten en bugbeelden.

## 1.5.8

- Changelog-popup vernieuwd met visuele kaarten en bugbeelden.
- Nieuwe updates rond Help, Mythisch en rewards worden duidelijker uitgelegd.
- Release voorbereid als patch bovenop de 1.5.7 functionaliteit.

## 1.5.7

- Afgeronde ruil-popup wordt nu lokaal per gebruiker onthouden na `Klaar`.
- BugDex wacht met tonen van oude geaccepteerde ruilen tot de lokale gezien-lijst geladen is.
- Firestore `requesterSeenAt` blijft bestaan, maar een oude ruil kan op hetzelfde toestel niet meer terug blijven komen.

## 1.5.6

- BugDex upgrades zijn nu totaal 1x per dag: na een Gewoon, Zeldzaam of Episch upgrade blokkeren alle upgrade-opties tot morgen.
- Oude per-route upgrade-events van dezelfde dag tellen ook mee, zodat bestaande daglimieten niet omzeild worden.
- Upgrade-uitleg in BugDex aangepast naar de nieuwe daglimiet.

## 1.5.5

- Beweegdoel rewards geven nu een echte Android-melding zodra er een radar bug reward klaarstaat.
- Nieuwe setting `Beweeg rewards` toegevoegd om deze meldingen uit te zetten.
- Ruilmeldingen blijven als echte Android-melding werken.

## 1.5.4

- Random foreground bugs tijdens app-gebruik verschijnen veel minder vaak: maximaal ongeveer 1 spawn-poging per 10 minuten.
- Forced radar/km foreground bugs blijven onveranderd direct werken.

## 1.5.3

- Home toont geen Health Connect datatype-statusregels meer zoals `Stappen: laatste ...`.
- Laatste-exemplaar waarschuwingen bij ruilen verwijderd.
- Dropdown-pijltjes/actie-indicators uit de dropdownknoppen gehaald.
- Trade-acties geven nu ook echte Android-notificaties; trade-verzoeken en geaccepteerde ruilen hebben duidelijkere meldingstekst.

## 1.5.2

- Ruil-resultaat opent pas na acceptatie en wordt na sluiten niet opnieuw getoond.
- Ruil- en upgradepanelen sluiten na verzenden of accepteren van een ruil.
- Ruilscherm en ruilanimatie tonen rarity duidelijker met kleur en label.
- `Laatste` chip-labels verwijderd uit ruil- en upgradechips; dubbele aantallen blijven zichtbaar.

## 1.5.1

- Resterende zichtbare labels bij bug melden, bugdetails, BugDex upgrades en report badges vertaald.
- Beweeg radar gebruikt nu taal-keys voor Lopen, Hardlopen, Fietsen en Health Connect datatypes.
- Bekende foutmeldingen en notificatietitels lopen nu via de vertaal-laag.
- Accessibility labels voor update, screenshot, commentaar en notificaties gelokaliseerd.

## 1.5.0

- Taalondersteuning toegevoegd voor Nederlands, Engels en Frans.
- Home heeft nu een compacte vlag-dropdown om taal te wisselen.
- Hoofdschermen, navigatie, meldingen, popups, BugDex flows, profiel en Health Connect uitleg gebruiken nu vertaalde UI-tekst.
- BugDex behoudt stabiele bugnamen en collectie-inhoud, zodat IDs en bestaande data niet breken.

## 1.4.6

- Character creation uitgebreid naar 12 bug-catcher presets met backpack en bugnet.
- Ruil-aanvragers krijgen nu ook een succes-popup zodra hun ruil is geaccepteerd.
- Upgrades zijn beperkt tot 1x per dag per route: Gewoon naar Zeldzaam, Zeldzaam naar Episch en Episch naar Legendarisch.
- BugDex toont in de upgrade-interface wanneer een route vandaag al gebruikt is.
- Daily login geeft nu altijd een common BugDex unlock.

## 1.4.5

- Profiel heeft nu character creation met bug-catcher presets.
- Ruilen toont de gekozen character-afbeelding van collega's.
- BugDex focust nu eerst op jouw ontdekte bugs.
- Ruilen en upgrades staan onder de BugDex in een inklapbare sectie.

## 1.4.4

- Upgrade-flow laat je nu zelf exact 3 verschillende bugs kiezen die worden verbruikt.
- Upgrade-knop blijft geblokkeerd tot er 3 geldige bugs van dezelfde lagere rarity geselecteerd zijn.
- Geselecteerde upgradebugs tonen duidelijk welke laatste exemplaren worden opgeofferd.

## 1.4.3

- BugDex toont standaard alleen gevonden bugs, met een knop om onbekende bugs tijdelijk zichtbaar te maken.
- Ruilen ondersteunt nu ook niet-dubbele bugs, met duidelijke waarschuwing bij laatste exemplaren.
- Collega kiezen bij ruilen gebruikt nu character-cards met naam onder het character.
- Upgrade-optie toegevoegd: combineer 3 verschillende bugs van dezelfde lagere rarity naar een hogere rarity.
- Foreground hits, catches en BugDex unlocks hebben kleine originele retro sounds.
- Bugmelding opslaan toont nu een korte automatische success-animatie in plaats van de oude tap-overlay.
- Een echte bugmelding geeft nu altijd een BugDex reward.

## 1.4.2

- Beweeg radar gebruikt Health Connect robuuster voor Google Fit, Samsung Health, Huawei via Health Sync en andere bron-apps.
- Stappen worden via Health Connect aggregate gelezen om dubbeltelling tussen bronnen te beperken.
- Afstand telt alleen nog binnen geldige walking/running/cycling trainingen.
- Home toont Health Connect datatype-status en een info-knop met koppelhulp.
- Herbruikbare app-basisdocumentatie toegevoegd voor toekomstige apps.

## 1.4.1

- Home Claim knop voor Beweeg radar verschijnt alleen wanneer er echt km-rewards te claimen zijn.

## 1.4.0

- Beweeg radar widget checkt nu periodiek native op beschikbare km-rewards en zet die direct klaar op de widget.
- Home Claim knop blijft zichtbaar, zodat spelers zelf kunnen kiezen tussen claimen via app of via widget.
- Health Connect background-permissie toegevoegd voor periodieke movement radar checks.
- Foreground bug tapgedrag teruggezet naar de eerdere ruimere hitbox zodat tappen weer betrouwbaar werkt.

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
# 2.10.11 - 2026-07-19

## 3.0 local beta - Conservatory Path

### Conservatory visual refresh

- Restyled login, global background, navigation, Home, BugDex, BugScan, Field Journal, Museum, social screens, settings and bug-reporting surfaces under one visual system.
- Added generated text-free `conservatory-app-background-v1.png` for the shared app shell.
- No gameplay, route, auth, Firebase or release behavior changed as part of this visual refresh.

- Added a private six-biome Expedition World with map reveal, beacon animation and a generated biome atlas.
- Added a cinematic Museum with animated terrarium motes and BugDex-derived visual wing milestones.
- Added server-owned, idempotent field milestones at 1, 3 and 6 verified observations (20/30/50 XP).
- Added an in-scan milestone reveal after a verified field note is stored.
- No production UI deployment, APK publish or 2.10.19 change was made; the additive Firebase event backend is deployed for localhost beta testing.

- Nest Defense manual attacks now use the complete playfield, including the lower path.
- Added a secure FitnessSyncer OAuth2/PKCE backend and client integration boundary for web distance imports.
- Added activity-only distance filtering, encrypted token storage, stable import IDs, and week-first movement registration.
# BugBaas 3.0 local beta — Team Hunt Weekend

- Added an animated Team Hunt Weekend screen reached through Expedition World's World Signals panel.
- Added server-owned Friday–Monday organization scoring for unique verified species, with idempotent contributions and a privacy-safe board.
- Added Function-only Firestore paths for event aggregates and personal contribution bookkeeping.

## 3.0 local beta - World home action hub

- Rebuilt `Vandaag` around the real daily walking goal with an animated walking bug and movement sync action.
- Daily and Weekly buttons now show their actual mission totals and open the correct mission tab.
- Active Team Hunt and Swarm Siege states are visible on Today while full Events and Map tabs remain available.
- Buddy status now appears on Today, and the Buddy overlay lets players choose from every expedition while preserving one active task at a time.
- Removed the beta version footer that could overlap the bottom navigation.

## 3.0 beta preview release

- Refreshed all primary navigation areas and their supporting screens, dialogs, game states and reward presentations with responsive, image-led layouts and lightweight animation.
- Added and connected the new BugBaas 3.0 branding, loading art, scan art, world art, event art and unused BugDex insect assets.
- Made Bug Tower and Bubble Swarm continue until game over while difficulty increases.
- Deployed backward-compatible Firestore rules and 15 additive 3.0 Functions to `thomascimpro-6266f`.
- Released the validated preview to `https://bugbaasv3.vercel.app`; the separate 2.10.20 live deployment was not changed.

## 3.0 local beta - Complete game UI pass

- Replaced the striped shell and text-symbol controls with image-led backgrounds, HD assets and consistent game controls.
- Made World, Scan, Play, Collection, Profile and Settings fit their main phone viewport; detail sheets retain internal scrolling.
- Added a responsive expedition texture, animated 1.5 km walking route and equal-size four-button navigation.
- Added five optimized insect assets from `assets/new` to BugDex with balanced Epic, Rare and Legendary tiers.
- Changed New Report into a fixed modal-style sheet and prevented roaming catch bugs from blocking forms.
- Made Bug Tower and Bubble Swarm endless until player failure, restored Web Runner tap-to-jump and tightened long-run score validation.
- Upgraded monthly duel rewards and added live-photo authenticity handling for screen, print and generated-image cues.
- Authorized `bugbaasv3.vercel.app` for Firebase Google authentication so the preview OAuth popup can complete.

## 3.0 local beta - Full QA and European field guide

- Added seven recognizable European bumblebees and completed the 249-entry BugDex with localized names, concise facts, balanced drop tiers and transparent art.
- Localized World route, habitat, sighting, Buddy duration and Research copy that previously mixed Dutch and English.
- Replaced the oversized Web Runner spider crop with a dedicated responsive moonlit web tunnel.
- Added an image-led fallback for unavailable Swarm Siege states and kept event art bounded on small screens.
- Replaced the raw Firebase unauthorized-domain message with a clear test-site Google-login explanation.
- Verified the four main destinations at phone, tablet and desktop sizes without page-level overflow.

## 3.0 beta - QA release

- Released the 249-entry BugDex, responsive World, localized research flow and updated arcade visuals to `bugbaasv3.vercel.app`.
- Verified email authentication, the Google authentication popup, all four main destinations and Bubble Swarm input on the production alias.
- Kept the separate 2.10.20 live deployment and Firebase backend configuration unchanged.

## 3.0 local beta - FitnessSyncer repair

- Fixed OAuth return handling for the BugBaas 3.0 preview domains instead of silently returning users to the old BugBaas web app.
- Made Activity and distance parsing tolerant of API field casing variants while retaining walking, running and cycling filtering.
- Added regression coverage for approved OAuth return URLs and distance parsing.

## 3.0 local beta - Vlindervangst skill rework

- Replaced tap-spam catching with track, hold-to-focus and timed-release capture mechanics.
- Rebuilt the meadow lighting, depth flight paths, species motion, woven net and continuous first-person swing.
- Added an animated bug-into-net capture, timing feedback, species points, combo scoring and recovery cooldown.
- Added optimized imagegen key art to the shared game picker and removed the duplicate standalone Arcade card.
- Matched the native game to the focus mechanic and smooth swing while keeping the existing 60-second ranked result flow.

## 3.0 local beta - Arcade, Museum and Daily hotfix

- Made Bug Glide and Bug Tower faster and moved four realtime arcade loops from interval timers to display-synchronized frames.
- Forced fresh Museum inventory and mastery reads so goal progress updates immediately on entry.
- Restored a tappable foreground bug after every claimed Daily while keeping the Daily XP safely pre-awarded.
