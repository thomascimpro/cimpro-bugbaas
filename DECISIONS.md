# Decisions

## 2026-08-11 - Geen redacted buildwaarden als runtime-URL

- Accepteer voor client-API-basisadressen uitsluitend een geldige HTTPS-URL. Lege, malformed, gequote of door tooling geredacte waarden vallen terug op de vaste productiehost.
- Controleer bij iedere Android-release de uiteindelijke `assets/app.config` in de APK; broncode- of env-controle alleen is onvoldoende om de werkelijk ingebakken URL te bewijzen.

## 2026-08-11 - Adaptieve BugScan en betrouwbare periodieke rewards

- Start iedere fotoanalyse met `medium` reasoning. Alleen een bruikbare maar onzekere levende-buguitkomst tussen 50% en 70% krijgt, als er nog voldoende tijd is, een eenmalige `high`-verdieping. Bij timeout blijft het eerste resultaat geldig.
- Bewaar de totale serverdeadline onder de Vercel-limiet en verhoog de functiegrens naar 90 seconden; zo blijft de normale scan snel en veroorzaakt een mislukte verdieping geen 504.
- Veldnotitietags zijn een kleine vaste lijst van maximaal drie keuzes. Ze veranderen de identificatie of beloning niet en worden samen met de server-gecontroleerde observatie opgeslagen.
- Geplande ranked- en duelacties op de standaardbranch checken expliciet de actuele 3.0-releasebranch uit, zodat productieautomatisering dezelfde beloningslogica gebruikt als de uitgebrachte app.

## 2026-08-10 - 3.0.10 duidelijke gestapelde rewards en anonieme fotostemming

- Een actieve Play-workspace is een gewone fullscreen overlay in dezelfde app-laag, zodat alleen verdiende foregroundbugs boven het duel kunnen verschijnen. Vrij rondlopende bugs blijven tijdens het duel uit; meerdere verdiende rewards blijven FIFO.
- Weeknominees komen eerst uit vorige week en daarna uit maximaal 52 oudere weken. Alleen als daar nog geen drie verschillende spelers zijn, worden bestaande echte thumbnails uit `pendingBugDexDiscoveries` gebruikt; afgekeurde foto's tellen niet mee.
- Iedere speler levert per bronweek alleen zijn beste foto. De keuze is per week stabiel willekeurig uit maximaal twaalf kwaliteitskandidaten; tijdens stemmen wordt geen naam naar de client gestuurd, alleen bij de winnaar.
- Collectievoltooiing is een ontdekkingsmeter en combineert huidige voorraad met blijvende unlockhistorie; een gebruikt exemplaar mag het ontdekte percentage niet verlagen.

## 2026-08-10 - 3.0.9 platformrelease met exact 1000 soorten

- De releasegrens is exact 1000 actieve BugDex-soorten. Extra goedgekeurde generatiebestanden blijven buiten catalogus, artregistry en runtime tot een latere expliciete uitbreiding.
- Alleen transparante WebP-bestanden zijn runtime-art. Ruwe BugDex-PNG's zijn bron-/generatiemateriaal en worden via `.vercelignore` niet naar productie geupload.
- De webrelease blijft op het gekoppelde 3.0-project `bugbaasv3.vercel.app`, met lichte iPhone-audio en vrije Vleugeljacht 3D. De Android-build blijft bewust anders: 3D-slot en externe link naar `bugbaas.vercel.app`.
- OpenAI-, Firebase-, Google- en receipt-secrets blijven uitsluitend in lokale/hosted env-opslag. Releasebron, Git-commit, APK-metadata en documentatie mogen geen secretwaarden bevatten.

## 2026-08-10 - BugScan bewaart detail tot de modelaanroep

- Gebruik de volledige telefoon-/systeemcamera en bewaar het originele camerabestand tot de speler zijn uitsnede bevestigt. Maak primaire en eventuele kleinere payloads telkens opnieuw uit die bron om dubbele JPEG-compressie te voorkomen.
- Stuur een uitsnede maximaal op 2560 px met een 2048/1600-payloadfallback en een afzonderlijke 640 px developer-thumbnail. De server gebruikt `detail: original`, zodat het model niet alsnog op een gereduceerde interne afbeelding redeneert.
- Gebruik `gpt-5.6-luna` met `reasoning.effort: max` voor de definitieve bronwijziging. Dit verbetert de beoordelingsruimte, maar vervangt geen goede pixels; daarom zijn camerakwaliteit, originele uitsnede en eerlijke confidence de eerste vangrails.
- Een concrete soortnaam vereist minimaal twee zichtbare soortdiagnostische kenmerken. De modelprompt kent de acceptatiegrens niet als doel en mag confidence nooit verhogen om een rewardroute te halen.
- Deze keuze is bron-only totdat een afzonderlijk releaseverzoek volgt; productie en de bestaande APK zijn niet gewijzigd.

## 2026-08-10 - Veldnotitie-, radar- en APK-hotfix

- Vercel en `recordVerifiedObservation` gebruiken exact hetzelfde cryptografisch willekeurige receipt-secret zonder verborgen regeleinde; het secret blijft buiten bron, APK en logs.
- Een handmatige radarclaim combineert bestaande widgetrewards en nieuwe Health Connect-rewards zonder deduplicatie, omdat twee exemplaren van dezelfde soort ook twee echte rewards zijn.
- BugDex-art blijft volledig lokaal in de APK, maar wordt begrensd op 512 px en WebP-kwaliteit 85. Dit behoudt transparantie en is voldoende voor de grootste huidige BugDex-weergave, terwijl een vaste 55 MiB-artbudgettest toekomstige APK-groei afvangt.

## Actueel BugDex-checkpoint 2026-08-10

- Promoot alleen assets met afzonderlijke PASS-gates; behoud bestaande IDs, afbeeldingen en `bugArt`-mappings.
- De queue staat op **483/610** en de actieve catalogus exact op **1000**; de bestaande runtime-variantunie blijft leidend voor nieuwe soortkaarten.
- De laatste vijf actieve kaarten zijn additief geregistreerd na afzonderlijke naam-, wetenschappelijke naam-, asset- en PASS-gates. Drie extra PASS-renders zijn buiten runtime gehouden om de catalogus niet boven 1000 te laten uitkomen.
- Wave 463-470 is additief geregistreerd met acht duidelijk verschillende Nederlandse soorten; `gewone-krabspin-misumena-vatia` en `gewone-doodgraver-nicrophorus-vespillo` zijn vóór imagegen als dubbelen overgeslagen.
- Wave 455-462 is additief geregistreerd met acht duidelijk verschillende Nederlandse soorten; `gewone-krabspin-misumena-vatia` is vóór imagegen als dubbel overgeslagen.
- Wave 447-454 is additief geregistreerd met acht duidelijk verschillende Nederlandse soorten; de bestaande naamgate bleef leidend voor mogelijke dubbelen.
- Wave 439-446 is additief geregistreerd met acht duidelijk verschillende Nederlandse soorten. De kandidaat `gewone-krabspin-misumena-vatia` is vóór imagegen overgeslagen omdat de genormaliseerde naam al bestond; er is geen dubbel toegevoegd.
- Wave 431-438 is additief geregistreerd met acht duidelijk verschillende Nederlandse soorten. De Zesvlekkige groefbij en het Wollig Gitje gebruiken de tweede blauwe renderpoging; de eerste magenta-renders zijn niet gemapt.
- Wave 423–430 is additief geregistreerd met acht nieuwe, duidelijk verschillende Nederlandse soorten. Zwervende Pantserjuffer, Zigzagtijger en Witte halvemaanzwever gebruiken de tweede renderpoging met blauwe chroma; de eerste pogingen zijn niet gemapt.
- Wave 415–422 is additief geregistreerd met acht nieuwe, duidelijk verschillende Nederlandse soorten. Parelmoermot, Paardenkastanjemineermot, Viervlekglansmug en Leverkleurige bladroller gebruiken de tweede renderpoging met blauwe chroma; de eerste pogingen zijn niet gemapt.
- Wave 407–414 is additief geregistreerd met acht nieuwe, duidelijk verschillende Nederlandse soorten. Zilverstreepgrasmot en Rotsheidenetwants gebruiken de tweede renderpoging met blauwe chroma; de eerste pogingen zijn niet gemapt.
- Wave 399–406 is additief geregistreerd met acht nieuwe, duidelijk verschillende Nederlandse soorten. Koraaljuffer gebruikt de tweede renderpoging met magenta chroma; de eerste poging is niet gemapt.
- Groene soorten krijgen geen groene chroma-key wanneer dat de alpha kan aantasten; het goudoogje is daarom met magenta chroma-key opnieuw gegenereerd en pas daarna gemapt.
- Assets met onduidelijke vleugels, te weinig zichtbare poten of kleurfranje worden buiten runtime gehouden tot een gerichte imagegen-correctie afzonderlijk PASS is.

## 2026-08-01 - Nederlandse soortkaarten blijven soortspecifiek en bug-only

- Bestaande generieke IDs blijven backwards-compatible; nieuwe herkenbare Nederlandse insecten en expliciet gevraagde spinachtigen krijgen alleen een nieuwe ID wanneer er nog geen betrouwbare eigen kaart of wetenschappelijke alias is.
- Slakken, pissebedden, duizendpoten en miljoenpoten worden niet als nieuwe BugDex-bugs toegevoegd. Ze blijven hoogstens zichtbaar als uitgesloten analyse-record.
- Nieuwe soort-assets worden pas gemapt na transparantie- en semantische review. Een technische alpha-channelcheck is onvoldoende; checkerboardpixels, witte halo’s of een verkeerde soort worden afgekeurd.
- De Nederlandse soortenwave heeft 82 kaarten geïntegreerd zonder nieuwe Firebase-collectie, badgepad of beloningsbron. De vierenvijftig nieuwe P0/P1-soorten zijn pas na imagegen, chroma-key-alpha, soort-/anatomie-/stijlreview en dubbele-check gemapt. Foto-cut-outs uit Wave 2/3 zijn stijl-afgekeurd en niet gekoppeld; de bestaande app-art blijft onaangeraakt. De kandidaten-datagate staat in `scripts/build_bugdex_nederland_photo_candidates.mjs` en de uitvoeringsregels in `docs/bugdex-nederland-asset-to-app-plan.md`.

## 2026-07-31 - BugScan, beloningen en 3.0.6 releasegrenzen

- Het beeldmodel krijgt geen lijst met BugDex-soorten. Het benoemt eerst onafhankelijk wat zichtbaar is; daarna koppelt de server alleen een exacte genormaliseerde naam, veilige alias of wetenschappelijke alias aan de catalogus. Zo kan de prompt niet meer naar de dichtstbijzijnde app-soort sturen.
- `gpt-5.6-luna` is de productiestandaard voor BugScan: een read-only A/B-test op vier handmatig beoordeelde spelersfoto's gaf 2/4 exacte namen tegenover 0/4 voor `gpt-5-mini`, met circa halve responstijd en lagere tokenprijs. De 70%- en developer-reviewroute blijft de vangrail voor lastige foto's.
- Een specifieke echte soort is vanaf 70% bruikbaar. Staat die niet in de BugDex, dan wordt een developer-record gemaakt. Foto's zonder zichtbare bug, reproducties en onzekere authenticiteit blijven geblokkeerd; de 70%-grens omzeilt die controles niet.
- Een geaccepteerde fotoscan is pas voltooid nadat een privé-veldnotitie met actuele locatie server-side is opgeslagen. De speler kan dit bewijs niet overslaan. Scan- en Weekvondst-rewards worden daarna gepresenteerd.
- Iedere soortbeloning gebruikt hetzelfde bron-gelabelde ontdekkingsscherm. Willekeurige rarity-spins worden niet gebruikt voor al bepaalde rewards; bron en exacte bug zijn altijd zichtbaar.
- Museum-rewards blijven server-authoritatief en eenmalig. De client toont en activeert alleen de volgende claim; permanente claimdocumenten zijn de bron voor idempotentie en endgamevoortgang.
- Normale Bug Defence behoudt de 2.10.19-simulatiestap en neutrale balans. Alleen expliciete Zwermbeleg-events mogen snelheid, HP, spawnmix of bossinterval wijzigen.
- Vleugeljacht 3D is vrij op Vercel. De Android-APK toont bewust een slot en opent `https://bugbaas.vercel.app`, zodat de zware 3D-route niet dubbel in de APK wordt onderhouden.
- iPhone Safari gebruikt lichte oscillatorgeluiden en een lager 3D-renderprofiel. Andere browsers en Android behouden de bestaande pakketgeluiden.

## 2026-07-29 - iPhone-webgeluid en 70%-scanclassificatie

- Alleen iPhone/iPad Safari wijkt op web af van de pakketgeluiden: deze route gebruikt maximaal twee korte WebAudio-oscillatoren per feedbackmoment en maakt geen `HTMLAudioElement`-pool aan. Android en andere webbrowsers behouden hun bestaande WAV-geluiden.
- De serverclassificatie gebruikt vanaf 70% de exact genormaliseerde BugDex-naam als bron voor een match, ook wanneer het model de catalogusstatus verkeerd als `uncertain` markeert. Een specifieke soort die niet exact in de catalogus staat wordt vanaf dezelfde grens `not_in_catalog` en blijft via `pendingBugDexDiscoveries` zichtbaar voor de developer.
- Reproducties, foto's zonder zichtbare bug en onzekere authenticiteit blijven afgewezen of in review; de 70%-regel omzeilt deze veiligheidsgrenzen niet.
- Vleugeljacht behoudt op desktop de volledige scène. iPhone Safari gebruikt een apart lichter profiel met 1× pixelratio, eenvoudigere materialen, geen antialiasing/schaduwen en acht gelijktijdige vliegende bugs.

## 2026-07-29 - Android 3.0.5 updatekanaal en Vleugeljacht

- Android Vleugeljacht 3D opent voor deze release bewust `https://bugbaas.vercel.app`; dit vervangt de eerdere lokale WebView-beslissing.
- De openbare 3.0.4-APK gebruikt de legacy Android-certificaatketen. Versie 3.0.5 gebruikt daarom exact dezelfde keten, zodat 3.0.4-gebruikers zonder verwijderen en dataverlies kunnen bijwerken.
- De eerdere algemene keuze voor CimPro-uploadsigning geldt niet voor dit bestaande openbare 3.0.4-updatekanaal; wisselen van certificaat zou een incompatibele installatie opleveren.
- Firebase-clientconfiguratie blijft vast op `thomascimpro-6266f`; lokale serverwachtwoorden en API-secrets worden niet in APK, Git of releasedocumentatie opgenomen.

## 2026-07-29 - Expliciet vrijgegeven 3.0.4-productiepromotie

- Op expliciet verzoek is deze 3.0.4-webrelease eenmalig gepromoveerd van de 3.x-bron naar `bugbaas.vercel.app`; dit vervangt voor deze release de eerdere preview-only grens.
- `bugbaas` en `bugbaasv3` blijven afzonderlijke Vercel-projecten. Na de productiepromotie is de lokale `.vercel`-koppeling teruggezet naar `bugbaasv3`.
- De webclient en serverroutes blijven op Firebase-project `thomascimpro-6266f`. Alleen de noodzakelijke productie-env is gesynchroniseerd; geheime waarden blijven buiten Git en documentatie.
- Vleugeljacht vangt niet automatisch. De speler houdt een bug 1,5 seconde in de vaste vangzone tot 100% en tikt daarna ergens op het speelveld om het net te laten slaan.

## 2026-07-29 - Canonieke 3.x-bron en releasekanaal

- `C:\Users\thoma.THOMAS\Documents\Codex\CimPro BugBaas-3.0` is vanaf 3.0.1 de enige canonieke bronmap voor BugBaas 3.x APK-builds en Vercel-releases.
- BugBaas 3.x wordt gepubliceerd op `bugbaasv3.vercel.app`; de afzonderlijke productie-alias `bugbaas.vercel.app` blijft buiten deze release.
- Officiële Android-releases gebruiken de bestaande CimPro-uploadsigning en mogen niet terugvallen op de legacy debugsleutel.

## 2026-07-29 - 3D eerst bewijzen als geïsoleerd 360° prototype

- De eerste BugBaas-3D-proef blijft een los Three.js-browserprototype en wordt nog niet in Expo of Firebase geïntegreerd.
- De speler staat stil in een volledige 3D-wereld; telefoonoriëntatie of slepen verandert alleen de kijkrichting. Vrij rondlopen, AR, multiplayer en gedeelde vlinders vallen buiten deze fase.
- De wereld en vlinders worden procedureel opgebouwd zonder GLB’s of externe texturebestanden, zodat spelgevoel, prestaties en besturing eerst afzonderlijk beoordeeld kunnen worden.
- Het net is first-person en client-side. Eén slag kan maximaal één vlinder vangen; scores hebben geen invloed op bestaande BugBaas-progressie of rewards.

## 2026-07-28 - Vaste productie-Firebase en BugDex WebP-validatie

- De BugBaas-client gebruikt voortaan altijd Firebase Auth en Firestore van het Firebase-project met weergavenaam `BugBaas` en project-ID `thomascimpro-6266f`. Omgevingsvariabelen mogen deze clientidentiteit niet meer overschrijven.
- De bestaande HTTPS Functions blijven bewust op project `thomascimpro-6266f`; deze scheiding is onderdeel van de productiearchitectuur.
- Actieve BugDex-artworkverwijzingen lopen via `src/services/bugArt.ts` naar `assets/bugdex-webp/*.webp`.
- Iedere APK-build voert eerst `validate:bug-art` uit en stopt wanneer een verwijzing geen `.webp` gebruikt, een bestand ontbreekt of geen geldig WebP-bestand is.

## 2026-07-28 - BugDex-artwork en catalogusuitbreiding naar 500

- De centrale `bugDexEntries`-lijst blijft de runtimebron; 251 nieuwe bestaande insectnamen zitten in een aparte expansion-module zodat de bestaande 249 entries en unlockroutes behouden blijven.
- De verdeling van de nieuwe entries is 80 Gewoon, 85 Zeldzaam, 60 Episch, 21 Legendarisch en 5 Mythisch. De shared catalogus en beide research-cataloguskopieën blijven synchroon.
- Transparante PNG is de canonieke rasterkeuze voor de actieve BugDex-mapping. Exacte dubbele WebP’s zijn uit de workspace gehaald maar buiten de workspace bewaard voor herstel.
- Voor de 251 nieuwe catalogussoorten is nog geen species-specifieke imagegen-set gemaakt; `BugArtImage` gebruikt daarom een transparante typefallback en maakt geen verkeerde soortmapping. De twee aantoonbaar foute hommel-assets zijn wel vervangen door soortspecifieke imagegen-PNG’s.

## 2026-07-28 - Mythische Crown-rangen

- Alleen Mythisch kan Bekroond, Kroonelite, Kroonmeester en Kroonlegende bereiken op respectievelijk level 8/11/14/17 en 25/75/150/300 gewonnen PvE-battles; de vaste multipliers zijn 1.025/1.05/1.075/1.10.
- `battleWins` wordt toegevoegd aan bestaande mastery-documenten en ontbrekende waarden worden als 0 gelezen. Er komt geen nieuwe Firebase-collectie en `crownRank` wordt niet opgeslagen.
- Battle wins gebruiken de bestaande idempotente `bugMasteryEvents`-subcollectie met stabiele event-ID’s en tellen alleen de werkelijk actieve squad mee. Ranked Duel/PvP en loss/quit-paden tellen niet.
- `CrownGlow` staat structureel achter `BugArtImage`, gebruikt één centrale kleurenpalet en schakelt pulse uit bij reduced motion. De PvE-multiplier wordt één keer centraal toegepast en nooit boven 1.10.

## 2026-07-27 - Fullscreen changes styles, never the app-shell component type

- The Play route keeps one stable `SafeAreaView` wrapper before, during and after gameplay.
- Fullscreen mode may change layout styles and visibility, but must not replace a parent component type around stateful screens.
- This prevents React from remounting `PlayScreen` and losing the active workspace, ranked duel or practice run when gameplay starts.

## 2026-07-27 - Scan receipts verify from the configured shared secret

- V2 BugScan receipts remain Ed25519-signed, UID-bound and valid for ten minutes.
- The verifier derives the Ed25519 public key from the same configured secret used by the signer. This removes the hidden dependency on a stale hardcoded key.
- The previous hardcoded public key remains only as a migration fallback for already-issued short-lived receipts; it is not the primary production trust path.
- Vercel and Firebase must use one synchronized receipt secret. Secret values are never logged, committed or documented.
- Field observations continue to be written only by the server-authoritative and idempotent `recordVerifiedObservation` function.


## 2026-07-26 Duel belongs to Arcade; squad explanation belongs to BugDex

- Play has no separate Duel tab. Tap Duel remains an Arcade game, while direct duel links open the existing duel workspace with Arcade selected.
- Open duel requests are shown before recent duel history because they require action.
- BugDex Active Squad is the single explanation surface for helper behavior. It shows helper type, cooldown, hits, AOE targets and mythic specials next to the existing mastery role and squad bonus.
- Gameplay calculations, duel persistence and reward authority remain unchanged.

## 2026-07-26 Arcade games stay visible while locked

- Arcade discovery uses one stable six-game grid. Locked games are not removed or hidden behind horizontal scrolling.
- Phone layouts use two columns below 700 px; wider layouts use three columns. Game callbacks, ordering and unlock thresholds remain unchanged.
- Solo Campaign stays separate from the six ranked/practice game tiles and uses one compact full-width row directly below them.

## 2026-07-26 Map panning keeps sightings separate from viewport

- Player location and stored finding coordinates remain data markers; `viewCenter` is local presentation state used only to render and search the currently viewed field.
- The existing OSM tile/marker projection remains authoritative. Panning uses its Web Mercator coordinate system rather than introducing a second map library.
- Search-zone requests are debounced for 600 ms, use a viewport-derived 250-3000 metre radius and retain the previous successful zone set during refresh or failure.
- Location recentering is explicit after manual panning. Automatic location resolution must not pull the map away after the user has started exploring another field.

## 2026-07-26 Real BugScan reward presentation

- The Firestore BugDex inventory/unlock transaction remains authoritative; the UI must present the exact `RealBugScanRewardResult` returned by that transaction rather than reconstructing a reward from identification text.
- `real_bug_scan` is an immediate presentation source because the user needs direct confirmation after a successful scan. It skips random rarity spins and roaming foreground catches.
- Only an actually granted copy opens the unlock modal. Identification without a granted reward cannot claim that the BugDex changed.

## 2026-07-26 BugDex artwork must contain real transparency

- A transparency preview grid baked into RGB pixels is rejected even when the file also contains an alpha channel.
- Active BugDex mappings use existing clean artwork rather than attempting a runtime mask or CSS cover-up.
- When no exact clean source exists, a close transparent species fallback is preferred and explicitly documented until replacement art is available.
- The known contaminated asset paths are guarded by a source regression test.

## 2026-07-26 Museum reward safety and endgame

- Normal Museum XP is awarded only once at Open, Curated and Master. Prestige and Crown Hall tiers award status, badges or fixed bugs without repeatable normal XP.
- Reward eligibility is recalculated from stored server evidence; the client only requests evaluation and presents the result.
- Existing collections receive retroactive rewards through the same permanent claim receipts as new progress.
- Prestige requires a mastered room, six different exhibits, four level-10 exhibits, a Legendary/Mythic exhibit and three verified observations. Museum Legend additionally requires all five Prestige rooms, a filled Crown Hall and a season trophy.
- Existing artwork is reused; missing optional cosmetics fall back to title/status rather than introducing placeholder assets.

## 2026-07-26 Duel launch and Play hero framing

- Play Now continues to open the Duel workspace, which now presents a primary random-duel action plus an optional direct player challenge. Both actions use the existing backend duel creation/claim contracts.
- Phone Duel and Ranking heroes retain `cover`, but use a shorter responsive frame because their source art is landscape; this keeps the focal scene visible without adding letterboxing or changing the desktop/tablet layout.
- Source checks and web export do not replace physical Android rendering approval.

## 2026-07-26 Public unlocked-bugs ranking

- The new Ranking mode uses the existing public `users.bugDexCount` projection, which is synchronized from BugDex unlock history, instead of reading another player's private `bugdexUnlocks` subcollection.
- Ranking is a mode within the existing Play workspace, so its back action closes the workspace and preserves the Play tab context.

## 2026-07-26 Review controls stay above fixed navigation

- BugScan review remains a vertically scrollable stage on phones because the crop controls and actions cannot be guaranteed to fit beside the fixed bottom navigation at every viewport height.
- Phone-only compact styles reduce vertical density without changing the photo crop behavior or the desktop/tablet visual treatment.
- A successful source/export check does not count as physical Android rendering approval; that still requires a device or emulator retest.

## 2026-07-26 Mission parity with 2.10.20

- V3 uses the same six concrete daily missions as 2.10.20: one duel, one real-bug scan, four different games, five duels, three kilometres and one Solo Campaign boss.
- V3 uses the same six concrete weekly missions: 15, 30, 45 and 60 kilometres, 50 duels and 10 Solo Campaign bosses.
- Explorer/Trainer/Team Bronze/Silver/Gold tracks are not used for missions; explicit action plus target plus XP is the mission contract. Other non-mission rank or event medals are unaffected.
- A daily or weekly completion bonus requires all six visible missions, and the legacy date/week claim-ID formats remain stable.

## 2026-07-25 Commercial game foundation

- The BugBaas brand is the green beetle expedition emblem; Scan has its own jumping-spider lens so the main action is recognizable without duplicating the app logo.
- World keeps four primary destinations: World, Scan, Play and Collection. Scan is the raised central action.
- A World hero may contain only one primary CTA. Its label is selected by the progression model and must show why it matters and what it rewards.
- Decorative shell motion is finite on entry. Gameplay timers and frame loops remain lifecycle-bound to active gameplay.
- Bug Tower and Bubble Swarm use survival contracts. Practical backend bounds remain in place for malformed or abusive submissions, but normal runs are not capped at two minutes or 50,000 points.
- Local development origins are explicit allowlist entries; production CORS remains closed to unknown origins.

## 2026-07-25 World biome visual direction

- World uses `Field Expedition Atlas`, not the conservatory hero, because six distinct habitats, route progress and scan intent must read as one expedition surface.
- One shared 3 × 2 atlas provides Tuin, Park, Water, Nacht, Kantoor and Binnen; React Native handles markers, route, locked state and actions so UI remains scalable and text-free.
- World Today keeps one dominant biome hero and one primary BugScan action. Research follows as the first encounter; passive systems stay compact and conditional.
- Text symbols are not accepted as final World markers. Location, search, scan, found and lock visuals are built as local React Native glyphs without adding a dependency.
- Current opaque PNG art remains a temporary runtime source until it can be exported within the style guide's WebP/JPEG size limits.

## 2026-07-24 Production correction boundaries

- OSM search zones are optional enrichment. Their upstream failure may never block the base map, private sightings, location controls or Scan entry.
- World Today may prioritize contextual cards, but Daily and Weekly mission access is permanent and independent of that priority model.
- Settings belongs to the user's own Profile; returning from Settings restores that Profile context.
- Swarm event presentation follows the server state exactly: upcoming, preview, live and result remain separate UI states.
- Static interface copy in V3 surfaces must use the shared i18n dictionaries; dynamic user or observation data is not rewritten.

## 2026-07-24 Hybrid progression architecture

- BugBaas gebruikt één vaste loop: vinden, onderzoeken, trainen, tentoonstellen en samen vechten.
- World, Scan, Play en Collection zijn de enige primaire bestemmingen. Museum en Journal zijn Collection-tabs; Expedition Routes horen bij World Map.
- Iedere BugDex-entry heeft exact één hoofdroute. Bestaande ownership blijft geldig en een exacte verified scan mag altijd dezelfde catalogussoort openen.
- Research is de gerichte casual route. De server controleert scanreceipts, arcade runs, Daily Route claims, Momentum-cycles en interne contribution events voordat progressie wordt toegekend.
- Kleine herhaalacties geven account-XP of Research-progress en geen blind random nieuwe soort.
- Museum-opstellingen worden door de speler gekozen. Podiums verbruiken geen inventory en mogen alleen owned, vleugelpassende soorten bevatten.
- Play-unlocks worden afgeleid uit owned species; er is geen aparte opgeslagen unlockwallet. Ranked mastery assist is begrensd op 3%.
- Solo Campaign heeft vijf vaste bosssoorten op waves 4/8/12/16/20. De Function verifieert de opgeslagen hoogste wave en bepaalt zelf soort, rarity en eenmalige claim; de client mag campaignrewards niet schrijven.
- Swarm Siege gebruikt Europe/Amsterdam en een zesuurvenster op zaterdag. Partial community progress blijft beloonbaar; core species zijn nooit exclusief voor topcontributors.
- Swarm HP wordt bij preview/live-init server-side één keer gelockt op `clamp(3 + recentActivePlayers * 6, 9, 360)`, met recent actief als `lastActiveAt` binnen veertien dagen. Een queryfout gebruikt veilig de legacy target 120.
- Team Hunt is collection-only en maandelijks. De Guardian is uitsluitend een season finale en geen tweede permanente bossmeter.
- Daily completion is twee van drie routes. Weekly progression gebruikt drie tracks en geen gestapelde afstands- of duelgrind.
- Crown Hall master vereist 90% totale BugDex en alle vijf kernvleugels op master. Seasons resetten nooit collectie, mastery of Museum-placement.
- Productiedeployment gebruikt één Firebase-project voor client Auth/Firestore en HTTPS Functions: weergavenaam `BugBaas`, project-ID `thomascimpro-6266f`. Web blijft op Vercel-project `bugbaasv3`.
- Geen fysieke Android-goedkeuring wordt afgeleid uit compiler- of APK-builds; camera, touch en tabletweergave blijven expliciet handmatig zolang geen ADB-target verbonden is.

## 2026-07-24 Hybrid progression foundation

- BugBaas uses the hybrid collector direction: verified real-world discoveries unlock exact species and habitats, while Play, mastery and squads deepen the same collection.
- Acquisition profiles describe the intended primary route, but never block an exact verified scan from unlocking the photographed catalog species.
- The starter choice is limited to `zilvervisje`, `lieveheersbeestje` and `springspin`; all existing owners keep their current inventory regardless of the new route classification.
- Campaign and event pools are explicit and finite. All Mythic entries have a named endgame path instead of relying on blind random drops.
- Legacy reward sources remain readable and previously granted rewards remain owned. Their future transition is documented as research, targeted reward, exact-species or directed-synthesis behavior.

## 2026-07-23 Swarm Siege

- Swarm Siege is asynchronous. Players do not need to be online together; accepted damage persists on one shared event aggregate.
- The MVP reuses Nest Defense with server-selected deterministic modifiers instead of introducing another minigame or free-form AI gameplay.
- The server issues run IDs, seeds, expiry and daily attempt state. The client may submit a score, but damage is bounded to 0–3 and cannot exceed remaining boss HP.
- Attempts are consumed when a run starts. An unsubmitted active run can be resumed until expiry; this prevents restart farming.
- Event runs never update normal Arcade high scores or `arcadeGameResults`.
- Only contributors can claim the fixed 75 XP reward. Claims remain available after the event, are server-written and idempotent.
- The former Conservatory Guardian remains in source for history but is removed from visible routing to avoid two competing co-op boss systems.

## 2026-07-21 BugBaas 3.0 local beta

- 3.0 blijft localhost-only; 2.10.19 behoudt de bestaande Vercel-alias en APK.
- Het Museum is een BugDex-weergave, geen tweede inventaris: het leest uitsluitend de bestaande voorraad en actieve squad.
- Een veldnotitie ontstaat alleen uit een kortlevend, UID-gebonden scanbewijs dat Firebase verifieert. Firestore-clients mogen de notities niet zelf schrijven.
- Professor en Field Photo Stamps zijn bewust lokale presentatie: ze mogen geen nieuwe reward, claim of AI-kosten veroorzaken. Stempels worden uitsluitend afgeleid uit opgeslagen, geverifieerde veldnotities en zijn geen AI-fotokwaliteitsoordeel. De Spotlight is verwijderd omdat hij bestaande daily missions dupliceerde.
- Expedition World gebruikt uitsluitend persoonlijke, bevestigde habitatnotities als visuele biome-ontdekkingen; er is geen GPS, publieke kaart, team-score of reward.

## 2026-07-21 BugScan confidence and image quality

- A 0.70 confidence boundary balances useful acceptance with protection against wrong rewards: it only auto-accepts a model-declared match whose localized name exactly matches the selected BugDex entry.
- Specific taxa outside BugDex use the same 0.70 boundary and still require a non-generic name, supporting fact and explicit `not_in_catalog` classification.
- Image preparation prioritizes 2048 px detail, then reduces resolution and compression only when needed to keep the base64 JSON request below Vercel's 4.5 MB function payload limit.

## 2026-07-21 BugScan structured-output recovery

- Incomplete or syntactically truncated structured AI output is retried exactly once with a larger budget; upstream HTTP failures are not automatically duplicated.
- The recognition model stays unchanged. Low reasoning effort and concise localized fields reserve more of the response budget for the required JSON contract.

## 2026-07-21 BugScan recognition and developer review

- AI identifies the photographed subject independently before receiving the BugDex comparison requirement; catalog entries are never candidate labels for the first identification step.
- AI input uses a 1536 px/0.90 JPEG and falls back to 1280 px/0.80 only above 4 MB, preserving small anatomical details while remaining below the 6 MB API data-URL limit.
- Missing BugDex taxa are stored in `pendingBugDexDiscoveries` with finder identity and localized review context; developer/admin claims can resolve those records.
- Existing live documents are not overwritten by review flows, and hidden test-account cleanup is scoped exclusively to `testAccount: true` users.

## 2026-07-19 web auth, rewards and Tower hold hotfix

- Web Google authentication uses the Firebase JavaScript SDK directly; native token exchange remains unchanged for Android.
- Tower does not trust web `Pressable.onPressOut` because browser selection/context gestures can cancel that event; a document-level `pointerup` is the authoritative release.
- Reward permissions are not widened globally: Buddy, BugDex and mastery writes stay UID-bound and schema-validated.

## 2026-07-19 web arcade interaction hotfix

- Selectie- en contextmenuonderdrukking geldt alleen zolang een duelgame fullscreen is; normale apptekst blijft selecteerbaar buiten games.
- Tower-pickups hebben eigen wereldcoordinaten en collision in plaats van platformvelden, zodat ze zichtbaar en fysiek los van treden kunnen staan.
- Bubble-pressure wisselt een globale hexgridfase bij iedere nieuwe rij; daardoor blijft de horizontale positie en volgorde van alle bestaande bubbels gelijk.
- Bubble-powerups activeren alleen wanneer hun gemarkeerde gridbubble wordt weggecleared; het afgeschoten projectiel blijft altijd een normale gekleurde bubble.
- Practice-X sluit direct zonder web-alert; non-practice runs blijven tot het resultaat beschermd.

## 2026-07-19 regression restoration release 2.10.10

- Reporttypes zijn primaire categorieën en blijven daarom zonder extra tap zichtbaar op het nieuwe-meldingsformulier.
- Nest Defense scheidt handmatige aanvalinput van de visuele en torenlagen; de lege taplaag meet uitsluitend zijn eigen veldcoördinaten.
- BugDex-medailles gebruiken de geladen `bugdexUnlocks` als directe bron voor totalen en rarity-aantallen, zodat ruilen of verbruiken nooit voortgang verwijdert.
- Vroegtijdig verlaten wordt bepaald door `practice`, niet door een afgeleide `ranked`-flag: alleen Train mag voor een resultaat stoppen.

## 2026-07-19 arcade survival tuning release 2.10.9

- De linker Bug Glide-strook blijft een inputzone, maar de karaktergrens gebruikt strookbreedte plus halve visuele spritebreedte zodat het karakter de lijn nooit kruist.
- Beide survivalgames gebruiken een harde 120-secondenlimiet; tijdsdruk maakt niet-spelen deterministisch fataal rond 45-60 seconden, terwijl actief vrijspelen de run richting 90 seconden kan rekken.
- Bug Tower-boosts en Bubble Swarm-power shots volgen seeded onregelmatige intervallen. Daardoor zijn ze testbaar en eerlijk voor gelijke seeds zonder op iedere trede of ieder schot te verschijnen.
- Bubble Swarm vergroot bubblebeelden en verkleint de verticale gridafstand binnen het bestaande 8-koloms staggered grid; match-, buur- en bankshotlogica blijft daardoor compatibel.

## 2026-07-18 arcade repair release 2.10.8

- Training is een expliciete practice-mode: het scherm slaat geen Firestore-run op en iedere minigame slaat in practice ook geen lokale highscore op.
- Bubble Swarm is voortaan zowel ranked via een willekeurige uitdaging als los te oefenen; dezelfde seed/resultaatflow als de andere arcadegames wordt gebruikt.
- Bubble-projectielen gebruiken één `Animated.Value` over het volledige pad. De laatste animatiepositie en de geplaatste gridcel zijn exact hetzelfde punt.
- Bug Tower gebruikt twee transparante touchhelften over het hele speelveld. De zichtbare pijlen en powermeter zijn feedback en geen losse kleine knoppen.
- Platformbreedte en moving-platform-kans schalen deterministisch per floor; rockets krijgen naast een zeldzame kans vaste intervallen zodat lange runs niet zonder power-up blijven.

## 2026-07-18 web shell and arcade release candidate

- De web-shell blijft maximaal 460px breed en gebruikt één interne scrollcontainer; de document-body wordt niet als tweede scrolllaag gebruikt.
- Fullscreen wordt gestuurd door de actuele game-state en niet door een mount-effect, zodat de navigatie niet kort terugkeert tijdens game-start of gamewissels.
- Bug Tower-platformbreedte en moving-platform-kans zijn deterministisch aan floor/seed gekoppeld; coins en rockets zijn pickups en beïnvloeden de runscore zonder nieuwe backend-schema's.
- Bubble Swarm gebruikt alleen React Native views, requestAnimationFrame en transform; power-ups blijven lokaal aan de bestaande solo-resultaatflow gekoppeld.
- Daily 7-duel target behoudt het oude claim-id zodat bestaande dagelijkse claims idempotent blijven.

- De inactivity-decay gebruikt dezelfde absolute ondergrens van 100 als normale Duel-ratingverliezen; 1000 blijft alleen de startrating.
- Ranked-inactiviteitsdecay draait dagelijks via GitHub Actions met de bestaande Firebase-service-accountsecret; het script is idempotent, gebruikt Firestore update-time preconditions en houdt de bodem op 1000.
- Bug Tower gebruikt geen kantelsensor meer: `onPressIn` links/rechts start de aanloop en `onPressOut` zet de opgebouwde afstand en snelheid om in sprongkracht.
- De minimale sprong blijft bruikbaar voor een nabije trede; maximale aanloop haalt circa 28,9% schermhoogte en spin activeert pas vanaf 72% snelheid plus 58% charge.
- Backgroundgenres wisselen per blok van 100 floors en worden boven floor 500 als steeds moeilijkere remixes herhaald, zodat een endless run geen onbeperkte set assets nodig heeft.
- Platformdruk schaalt continu met floor en in extra stappen per zone; time pressure is klein gehouden zodat vaardigheid belangrijker blijft dan alleen speeltijd.
- Bubble Swarm is uitsluitend solo en wordt niet aan `validDuelMode` of de dagelijkse duelmissie toegevoegd; alleen het bestaande solo Arcade-resultaatpad krijgt de nieuwe mode.
- De bubble-shooter gebruikt React Native views en `Animated` zonder nieuwe game- of canvasdependency: slepen richt, loslaten schiet, matches van drie verwijderen en niet meer aan het plafond verbonden clusters vallen.
- De moeilijkheid schaalt op drie assen: drukrijen komen steeds sneller, de misslimiet daalt van zes naar drie en na 28/55 seconden komen een vijfde en zesde bugkleur beschikbaar.
- Bubble Swarm gebruikt originele imagegen-art; sprites of geluiden uit bestaande commerciële bubble-shooters worden niet gekopieerd. De game hergebruikt de bestaande BugBaas arcade-soundset.
- Nieuwe BugDex-beelden gebruiken uitsluitend exacte uitsneden uit de aangeleverde bronbladen; onduidelijke exemplaren worden niet toegevoegd en zeldzaamheid volgt de visuele bijzonderheid.
- Hogere scoretiers schalen na 2.400 punten grofweg exponentieel naar 5.000, 10.000, 20.000 en 40.000; behaalde bestaande tiers blijven daardoor intact, terwijl de nieuwe top langdurig doel blijft.
- Nest Defense gebruikt absolute touchposities minus de gemeten speelveldoorsprong; lokale `locationX/locationY` van geneste vijand-views zijn hiervoor onbetrouwbaar.
- De vaste linker Bug Glide-strook is een actieve stuurzone: taps lopen door naar dezelfde physics-handler en geven daardoor een duidelijke impuls naar rechts.
- Ranked-inactiviteit wordt client-side bij Arena-open verwerkt: 5 Duel rating per volledig gemiste lokale kalenderdag, nooit lager dan 1000 en met een dagcheckpoint tegen dubbele decay.
- Bug Tower gebruikt originele BugBaas-assets en retro arcadefeedback; originele Icy Tower-sprites, muziek en samples worden niet gekopieerd.
- Alleen Bug Tower-ranked breidt het bestaande Arcade-resultaat uit met `ranked` en `duelId`; de vier bestaande gamerecords behouden hun huidige schema en aanroep.
- Tiltbesturing gebruikt de bestaande Android native module met gravity/accelerometer en geen nieuwe dependency; zichtbare links/rechtsknoppen blijven beschikbaar als sensorfallback.
- Een Bug Tower-run wordt uiteindelijk onhoudbaar door tijd- en floor-gebonden scrollversnelling, terwijl platformbreedte, gaten en beweging per hoogteband moeilijker worden.
- BugDex-achievements tellen unieke bugs uit `bugdexUnlocks`; inventory blijft alleen de bron voor actueel bezit en actieve squads.
- Ranked minigames mogen vóór het resultaat niet via de UI of Android-back worden verlaten.
- BugBaas gebruikt Android `appCategory=game`, zodat de bestaande portraitrestrictie op Android 16-tablets van toepassing blijft zonder de mobiele flow te wijzigen.
- De buddywidget communiceert zijn primaire status met bestaande state-drawables; verborgen tekstvelden blijven alleen compatibiliteitsdata.
- Nest Defense bepaalt handmatige tap-targets in pixels met een geschaalde hitradius, niet met één procentuele afstand over verschillende aspectratio's.
- Expo + React Native + TypeScript gebruikt voor Android-first mobiele app.
- Handmatige schermnavigatie gebruikt om V1 klein te houden en extra navigatie-dependency te vermijden.
- Firebase config staat als lege placeholder in `app.json`; geen secrets hardcoded.
- Demo-modus gebruikt lokale in-memory data wanneer Firebase config ontbreekt, zodat UI smoke-testbaar blijft.
- Punten: Afgekeurd/Dubbel = 0, Gefixt = basispunten + 15, Bevestigd/In behandeling = basispunten + 5.
- Firebase Spark/free plan is uitgangspunt; Cloud Functions, Cloud Storage en Blaze-only features zijn buiten scope.
- Screenshots worden client-side beperkt tot maximaal 640 px en JPEG-compressie 0.35.
- Screenshots worden als kleine data-URL in Firestore opgeslagen. Dit is bewust beperkt voor V1; grote of meerdere screenshots vereisen Blaze + Storage.
- Insect visuals zijn lokaal opgebouwd met React Native views en animaties. Geen externe assetfiles nodig voor V1.
- Als later externe insect-assets nodig zijn: Kenney CC0-packs of aangeleverde transparante PNG/WebP frame sequences gebruiken, geen GIF als eerste keuze.
- Tier-systeem gebruikt eigen insectnamen: Larve, Keverscout, Sprinkhaan Specialist, Libelle Leider, Opperbugmeister.
- Nummer 1 in leaderboard krijgt Opperbugmeister-label, los van normale puntentier.
- BugDex toont losse bug-art; potjes zijn alleen voor de actieve squad onder Duel/Solo Campaign.
- Solo Campaign targets zijn vaste level/wave gates; level 1 start hoger en boss-waves vragen duidelijk meer score.
- Solo Campaign bosses gebruiken eigen HD boss-art en custom target scaling in de bestaande native game view; geen extra chart/game-library toegevoegd.
- Campaign clear reward gebruikt `solo_campaign_clear` als dagelijkse BugDex source met gegarandeerd Zeldzaam, zodat het max 1x per dag claimbaar blijft.
- Bug Radar widget toont request-status als compacte native badges in plaats van extra schermen of notificatiekaarten.
# 2026-07-19 Nest and FitnessSyncer release 2.10.11

## 2026-07-21 3.0 Conservatory Path

- A field discovery has one durable purpose: it wakes a private biome, may reach a server-owned milestone, and enriches the visual museum.
- The 1/3/6 field milestones are fixed XP only. Claims use stable server-created documents so retries and concurrent requests cannot award twice.
- Museum wings are deliberately derived from existing BugDex collection facts; they add no second inventory, currency or client-side reward path.
- Museum rooms fill by first-discovery order: Vondstenhal contains discoveries 1–5, Wonderkas 6–9, Nachtkabinet 10–14 and Kroonzaal 15 onward. This keeps room ownership deterministic without inventing habitat metadata or storing a second classification.
- Animation is limited to native-driver light, mote, reveal and beacon motion so the mobile UI does not rely on timers, canvas or new dependencies.
- Conservatory Guardian is intentionally bounded at 100 aggregate verified observations. The server uses collection counts, never a client score, and a contributor can claim its fixed XP exactly once through a private server-written claim document.
- The boss status returns aggregate progress only; it has no participant list, location data, global write path or season-management UI in this local beta.

- Nest Defense makes the field itself the manual-attack responder so lower-path taps are not lost behind higher visual layers.
- FitnessSyncer stays hidden until its server reports complete OAuth configuration; incomplete production setup is never shown as connected.
- OAuth uses PKCE and read-only activity scopes. Tokens remain encrypted in a private server-only Firestore path.
- Manual and daily-summary activities are excluded; provider source plus activity ID forms the idempotency key.
# 2026-07-21 Team Hunt Weekend

- Team Hunt is a Friday-through-Monday social event, not a renamed daily mission: organizations compete only with species their own team has not recorded during that event.
- `claimTeamHuntContributions` re-derives contributions from server-written `verifiedObservations`; a retry cannot duplicate a species score.
- The server stores only organization totals and normalized species keys. No exact location, image, individual feed or public scan history is returned to clients.
- No event XP, currency or BugDex reward is awarded in this beta. A cosmetic reward remains intentionally deferred until a real event can be balanced.

# 2026-07-25 3.0 preview release boundary

- `bugbaasv3.vercel.app` is the user-acceptance preview and may read/write the existing `thomascimpro-6266f` data through backward-compatible rules and additive Functions.
- `bugbaas.vercel.app` remains the independent 2.10.20 production rollback path until the owner gives explicit approval.
- New 3.0 HTTP Functions use exact origin allowlists. No wildcard CORS is allowed.
- The existing FitnessSyncer Functions and OAuth return path remain unchanged during preview validation.

# 2026-07-26 visual and shared-backend boundary

- Main navigation destinations stay limited to World, Scan, Play and Collection; Profile and Settings remain drill-ins.
- A main route must fit the viewport. Long configuration and creation flows use a bounded sheet whose body may scroll.
- Roaming catch bugs may appear only on World, BugDex and ranking surfaces, never above forms or gameplay controls.
- July asset sheets contribute only visually distinct, confidently named species. Variants and uncertain duplicates are not separate BugDex entries.
- Fixed Buddy, upgrade and direct XP rewards skip casino presentation; only genuinely random species/rarity rolls may spin.
- Existing 2.10.20 collections and FitnessSyncer endpoints are preserved. New 3.0 rules and Functions stay additive, and production promotion waits for explicit owner approval.
- Firebase Auth preview access is managed additively: `bugbaasv3.vercel.app` is authorized alongside localhost, Firebase Hosting and `bugbaas.vercel.app`; no existing domain is replaced.

# 2026-07-29 Vlindervangst interaction and asset budget

- Vlindervangst heeft één ingang: de bestaande gedeelde Arcade-selector onder `Choose a game`.
- Een geldige vangst vereist een naderend insect, centreren, focus vasthouden en loslaten in de timingzone; korte tikken leveren geen vangst op.
- Om de app licht te houden gebruikt de wereld herbruikbare procedurele geometrie en textures. Alleen de navigatie-/start-keyart is een nieuw rasterbestand van 240 kB.
- De netslag volgt één continue Catmull-Rom-curve en de gevangen bug beweegt eerst zichtbaar het net in voordat deze respawnt.

# 2026-07-29 korte responsiveness-hotfix

- Realtime arcadegames gebruiken één gedeelde `requestAnimationFrame`-loop met begrensde delta; spelregels en scoremodellen blijven ongewijzigd.
- Museum-doelen verkiezen actuele Firestore-data boven de normale twee-minuten UI-cache.
- Daily XP blijft bij claim direct en veilig toegekend; de foreground bug is de herstelde presentatie en kan de reeds verdiende Daily XP niet verliezen.

# 2026-08-01 BugDex Nederland photo-candidate scope

- Use verifiable Dutch iNaturalist species observations as a photo-likelihood ranking signal, not as an unqualified abundance claim.
- Treat the 828-card result as a candidate work queue: validate Dutch naming, scientific identity, synonyms, identifiability and invasive/monitoring status before catalog integration.
- Keep insects, arachnids, molluscs and other arthropods explicitly typed; do not force every photographed animal into the generic bee, beetle or bug variant.
- Promote only semantically reviewed, background-free 768x768 RGBA assets to WebP quality 95/method 6 and then to `bugArt.ts`.
- Preserve generic fallback cards and existing reward/badge/Firebase paths. Large expansions proceed in small waves with a central duplicate, alpha, semantic and test gate.

# 2026-08-01 scan-, reward- en releasebesluiten

- GPT-5.6 Luna is het standaard beeldmodel: in de kleine live A/B-set was het goedkoper, ongeveer tweemaal zo snel en nauwkeuriger dan GPT-5 mini. Structured output en onafhankelijke taxonidentificatie blijven verplicht.
- Alleen een exacte genormaliseerde catalogusmatch telt als bestaande BugDex-soort. Een geloofwaardige identificatie vanaf 70% wordt wel als vondst verwerkt; ontbrekende soorten gaan naar de private developer-reviewqueue.
- Het antwoord op de quiz mag vóór beantwoorden nergens zichtbaar staan. De modelvraag gaat over voeding, habitat, levenscyclus, lichaam of gedrag van de gevonden soort, nooit over alleen de reeds getoonde naam.
- De verplichte veldnotitie wordt pas geschreven nadat habitat en gedrag zijn gekozen; locatie blijft exact alleen voor de eigenaar en serverpaden blijven idempotent.
- Casino-presentatie staat uit. Elke BugDex-beloning toont eerst de vangbare foreground bug en daarna ontdekt of +1, met de concrete bron van de beloning.
- Web houdt Vleugeljacht 3D ontgrendeld; Android gebruikt de bestaande webhandoff. De bestaande Android debug-signer blijft bewust behouden voor updatecompatibiliteit met reeds geïnstalleerde BugBaas 3.0-APK's.

# 2026-08-02 centrale belonings- en eventpresentatie

- Een BugDex-toekenning is pas visueel afgerond na de vaste reeks foreground-vangst, daarna ontdekt/+1 en bronuitleg; alleen punten mogen geen nepbug tonen.
- Meerdere beloningen blijven in volgorde staan en een gemiste foreground bug gaat achteraan terug in de wachtrij.
- Een gewone ranked overwinning heeft 0,1% kans op Mythisch; de gegarandeerde Mythische beloning voor seizoenplaats 1 blijft server-side toegekend.
- Actieve eventmeldingen worden eenmaal per speler en event bewaard, zodat openen of hervatten duidelijk is zonder dezelfde popup telkens opnieuw te tonen.

# 2026-08-02 BugDex- en rotatierelease

- Nieuwe BugDex-soorten veranderen bestaande badge-eisen niet: ze verschijnen wel in filters en drops, maar oude badgevoorwaarden blijven stabiel voor bestaande spelers.
- Visuele aantrekkelijkheid bepaalt alleen de bestaande tiers Gewoon, Zeldzaam, Episch en Legendarisch; Mythisch blijft voor de al bestaande eindtier en wordt niet automatisch uitgebreid.
- Webroutes en de Play-workspace krijgen een lokale herstelkopie van maximaal 30 minuten. Een actieve ranked run bewaart daarnaast score, timer, vangsten en hitcounts per gebruiker in AsyncStorage.
- iPhone Safari gebruikt korte WebAudio-tonen in plaats van de zwaardere assetpool. Android behoudt de legacy signer voor updatecompatibiliteit en de bestaande 3D-webhandoff.
