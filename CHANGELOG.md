# Changelog

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
