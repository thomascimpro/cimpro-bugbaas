# Test Results

## 2026-08-10 - BugBaas 3.0.10 productie-release

- `npm run typecheck`: passed. Gerichte collectie-, duel-overlay- en rewardflowtests: **37/37**; Firebase Functions: **79/79**; BugDex-artvalidatie: **3/3**; scanclient/servercontract: **75/75**.
- Live Firebase: vier weekstemmingfuncties succesvol bijgewerkt. Geauthenticeerde statuscontrole: `voting`, **3** nominees, **3** unieke foto's en **0** zichtbare nominee-namen.
- Live Vercel: beide productiehosts en `/butterfly-catch-3d/` HTTP 200; BugScan-CORS HTTP 204. De scan-API bereikte voor `test2` correct de serverquota (HTTP 429 omdat 3/3 scans al gebruikt waren).
- Mobiele browsercheck op 390x844: testlogin, collectie `9/1000` + `1%`, drie stemkaarten en eventstartmelding zichtbaar. Na rotatie naar 844x390 bleef de Scan-route actief met drie stemknoppen; **0** consolefouten.
- APK: package `nl.cimpro.bugbaas`, versionCode 319/versionName 3.0.10, arm64-v8a, 105.516.049 bytes, SHA-256 `1166709DD40FF5A073B156934836F622253FE639BF3CF57F24B6F723B57EF755`, signer SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- APK-config bevat geldige Google OAuth-clients, Firebase `thomascimpro-6266f`, scan-URL `https://bugbaas.vercel.app`, Android-3D-slot/link en vereiste camera/locatiepermissies; geen microfoon-, opslag- of overlaypermissie. Geen ADB-device aangesloten.

## 2026-08-10 - BugBaas 3.0.9 productie-release

- Typecheck en alle gerichte catalogus-, BugScan-, camera-, classificatie-, receipt-, reward-, radar-, ranked-, event-, platform-, audio-, rotatie- en 3D-tests zijn groen. Firebase Functions: **78/78**; BugDex-validatie: **3/3**; Nederlandse pilottest: **4/4**.
- Catalogus/art-integriteit: exact **1000/1000/1000** unieke catalogusentries, `bugArt`-mappings en WebP-runtimebestanden. De lokale Expo-webexport slaagde met 1.858 modules en 1.159 assets.
- Vercel `dpl_3msAij2mJpy48RhAZxnyzdvMFSZA`: READY. Live root en `/butterfly-catch-3d/`: HTTP 200; kaartservice: HTTP 200/JSON; BugScan-CORS voor `bugbaas.vercel.app` en `bugbaasv3.vercel.app`: HTTP 204 met exact de aangevraagde origin.
- Firebase-productie: Firestore rules succesvol uitgebracht; **31/31** Functions ACTIVE in `us-central1`.
- APK: package `nl.cimpro.bugbaas`, versionCode 318/versionName 3.0.9, arm64-v8a, 105.515.637 bytes, SHA-256 `2B268F9104ECE50297919141B99A958FDC8913C87650DBB645DA9BD1ACF47BC4`, v2-signed met signer SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- Android-permissies gecontroleerd: internet, grove/precieze locatie, activity recognition en camera aanwezig; geen microfoon-, externe opslag- of overlaypermissie. Er was geen ADB-device aangesloten, dus installatie en fysieke camerakwaliteit zijn niet geclaimd.

## 2026-08-10 - Fullscreen BugScan-camera (bron-only)

- `npm run typecheck`: passed.
- Volledige gerichte BugScan-clientset: 48/48 passed; server-, classificatie-, API- en receiptset: 47/47 passed.
- Centrale rewardflow en Android-radarclaimmodel: 14/14 passed, inclusief FIFO-stapeling, opnieuw aanbieden na missen, bronlabels, geen casino-spin, Mythisch in ranked en exacte widget-IDs/aantallen.
- Bronanalyse bevestigt dat FIFO alleen binnen de lopende appsessie duurzaam is; afsluiten/crashen tussen widgetclaim en foregroundvangst is niet crash-safe en is niet aangepast.
- Lokale Expo-webexport: passed, 1.787 modules en 1.090 assets. Dit was een lokale compilecontrole en geen Vercel-deployment.
- Niet geclaimd: fysieke iPhone-/Android-camera, echte OpenAI-fotobeoordeling en end-to-end devicegedrag. Er is geen APK gebouwd en niets gepubliceerd.

## 2026-08-10 - BugBaas 3.0.8 productiehotfix

- `npm run typecheck`: passed. Gerichte radarclaim-, iPhone-audio-, rewardflow-, Android-3D-slot-, rotatie- en Vleugeljachttests: 44/44 passed.
- Real Bug Scan client via `tsx`: 30/30 passed; server: 43/43 passed; receipt-integratie: 4/4 passed. De bestaande kale npm-shortcut startte onder Node 24 met een ongeschikte TypeScript-runner, daarom is de volledige clientset rechtstreeks met `tsx` uitgevoerd.
- BugDex-validatie: 3/3 passed; 907 catalogus-, registry- en WebP-bestanden zijn één-op-één, maximaal 512 px, echte alpha en samen 42,0 MiB binnen het 55 MiB-budget.
- Vercel-webexport: passed, 1.771 modules en 1.074 assets. Live root, AppEntry en `/butterfly-catch-3d/` geven HTTP 200; BugScan CORS-preflight geeft 204.
- Live geauthenticeerde veldnotitiesmoke: scan HTTP 200, Zevenstippelig lieveheersbeestje met 94%, receipt aanwezig; opslaan HTTP 200 met `Park`, `Vloog` en privé-locatie.
- Firebase: alleen `recordVerifiedObservation` succesvol bijgewerkt. Vercel `dpl_EvdCQCvnJvgQSjSABbuBYyiXuAdf` is READY en `bugbaas.vercel.app` wijst ernaar.
- APK-build: successful; package `nl.cimpro.bugbaas`, versionCode 317/versionName 3.0.8, 96.896.646 bytes, SHA-256 `E49B65CB099A0E8B27DB63F2329865A596C40B5E61A61B00A31A708BCA2329F1`, signer SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- Emulatorinstallatie is niet geclaimd: Small Phone was ADB-unauthorized, Pixel 8 bevatte een anders gesigneerde bestaande app en Codex Smooth verscheen niet in ADB. Er is niets gewist of verwijderd van die AVD's.

## Actueel BugDex-checkpoint 2026-08-10

- Queue: **483/610 in-app**; catalogus: **1000 unieke entries**.
- Wave 479-486: vijf actieve nieuwe soorten (Schildstipspanner, Voorjaarskortvleugelmot, Wormkruidhaantje, Zuidelijke groene schildwants en Zwarte heidelibel) zijn afzonderlijk PASS voor soort, anatomie, stijl, alpha/transparantie, afmetingen en dubbele-soortcontrole. Drie extra PASS-renders zijn buiten runtime gehouden om exact op 1000 te eindigen.
- Wave 471-478: Vroege granietmot, Muisbeertje, *Phasia aurigera*, Zwarte speerkniptor, Zwartvlekgrasmot, Schijn-vierbandspanner, Noordse witsnuitlibel en Maanschietmot zijn afzonderlijk PASS voor soort, anatomie, stijl, alpha/transparantie, afmetingen en dubbele-soortcontrole.
- Wave 463-470: Micaplatvoetje, Witkopmot, Ruitijger, Slanke kogelspin, Langspriet-langsprietje, *Phaonia signata*, Ringspikkelspanner en Stompvleugelgrasuil zijn afzonderlijk PASS voor soort, anatomie, stijl, alpha/transparantie, afmetingen en dubbele-soortcontrole; beide mogelijke naamdubbelen zijn vóór imagegen overgeslagen.
- Wave 455-462: acht nieuwe soorten afzonderlijk PASS voor soort, anatomie, stijl, alpha/transparantie, afmetingen en dubbele-soortcontrole; alle acht hebben geldige 768x768 RGBA PNG/WebP-assets.
- Wave 447-454: acht nieuwe soorten afzonderlijk PASS voor soort, anatomie, stijl, alpha/transparantie, afmetingen en dubbele-soortcontrole; alle acht hebben geldige 768x768 RGBA PNG/WebP-assets.
- Wave 439-446: acht nieuwe soorten afzonderlijk PASS voor soort, anatomie, stijl, alpha/transparantie, afmetingen en dubbele-soortcontrole; alle acht hebben geldige 768x768 RGBA PNG/WebP-assets.
- Wave 431-438: acht nieuwe soorten afzonderlijk PASS voor soort, anatomie, stijl, alpha/transparantie, afmetingen en dubbele-soortcontrole; alle acht hebben geldige 768x768 RGBA PNG/WebP-assets.
- `validate:bug-art`: 3/3 passed; `typecheck`: passed; BugDex-pilottest: 4/4 passed.
- De acht nieuwe soorten zijn vóór promotie gecontroleerd tegen bestaande Nederlandse en wetenschappelijke naamtokens; `gewone-krabspin-misumena-vatia` is als dubbel overgeslagen.

## 2026-08-01 Nederlandse BugDex-soortenwaves

- Catalogus/art-integriteit: **599/599** unieke catalogusentries, **599** actieve `bugArt.ts`-mappings en **602** fysieke PNG/WebP-bestanden.
- Nederlandse soortenwave: **82/82** in-app; Wave 2: **0/1** geaccepteerd (Schorsmarpissa stijl-afgekeurd) plus twee `out-of-scope-non-bug`; Wave 3: **0/3** geaccepteerd wegens foto-cut-outstijl. Geen van deze afgekeurde of uitgesloten records staat in catalogus/art.
- Asset-QA: alle 82 afzonderlijke reviews zijn **PASS** voor soort, anatomie, stijl, alpha/transparantie, afmetingen en dubbele-soortcontrole; alle productie-assets zijn **768×768 RGBA** met alpha-extrema `(0, 255)`. `gewone-langpootmug` is opnieuw gekaderd als poging 2 en opnieuw bekeken. Afgekeurde foto-cut-outs blijven buiten productie.
- Kandidaat-datagate: **928** bronkandidaten, **610** productie-kandidaten (225 P0, 242 P1, 128 P2, 13 handmatig), **194** niet-bugs uitgesloten.
- Voortgang: **82/610 klaar**; vier P0-soorten blijven `style FAIL` na fotografische cut-outreview, twee soorten blijven `alias-review` en zijn niet dubbel toegevoegd.
- Groen: `npm run validate:bug-art` **1/1**, `npm run typecheck`, wave-test **3/3**, BugScan-classificatie **19/19**, Expo web-export (**1.404 modules, 712 assets**) en `git diff --check` zonder whitespacefouten. Geen APK/device/deployment-check uitgevoerd.

## 2026-07-31 BugBaas 3.0.6 releasecandidate

- Releasepreflight: versie `3.0.6` is gelijk in `package.json`, `package-lock.json`, `app.json` en Android; `versionCode 315`; web- en Android-tools aanwezig.
- `npm run typecheck`: **passed**.
- Complete BugScan-client/server-suite: **73/73 passed**, inclusief 70%-matches, `poor`/`uncertain`, ontbrekende soorten, catalogusaliassen, quota, CORS en OpenAI structured-output retry.
- Gerichte reward-, Museum-, kaart-, onderzoek-, audio- en gameketen: **133/133 passed**.
- Brede UI-/screen-/componentregressie: **166/166 passed**.
- Brede service-run: **224 gestarte assertions passed**. Twee bestaande Daily/Weekly-testprocessen starten onder kale Node 24 niet door een extensieloze Firebase-import; hun betrokken 3.0.6-logica is via typecheck, schermtests en afzonderlijke mission-/Functions-tests gedekt.
- Firebase Functions-package: **74/74 passed**; `node --check firebase/functions/index.js`: **passed**.
- Museum reward-model afzonderlijk: **4/4 passed** nadat de testimport expliciet TypeScript-resolveerbaar is gemaakt.
- BugDex WebP-validatie: **1/1 passed**; alle actieve artverwijzingen bestaan en zijn geldige WebP-bestanden. De vijf nieuwe soorten zijn opgenomen.
- `node --check public/butterfly-catch-3d/prototype.js`: **passed**. `git diff --check`: geen whitespacefouten, alleen bestaande LF/CRLF-waarschuwingen.
- Firebase-review-dry-run bevestigt acht beoordeelde records, zes reeds toegekende unieke beloningen en twee overgeslagen duplicaten.
- Firestore-rules en alleen `functions:claimMuseumRewards`: **Firebase dry-run passed**. Werkelijke deployment, Vercel-build, browserruntime, APK-build, signing en hash volgen in de releasefase.

## 2026-07-29 Vercel iPhone- en BugScan-hotfix

- `npm run typecheck`: **passed**.
- `npm run test:real-bug-scan`: **72/72 passed**, inclusief de gemelde `groene vleesvlieg` op 85%, `uncertain`/`poor`, exacte catalogusresolutie en developer-routing voor een ontbrekende soort.
- Gerichte webaudio-, iPhone-timing-, unlock- en Vleugeljacht-structuurtests: **17/17 passed**; `node --check` voor het productieprototype: **passed**.
- Lokale Expo-webexport: **passed**, 1.370 modules, AppEntry circa 3,13 MB; app en Vleugeljacht-bestanden staan in de output.
- Vercel `dpl_5umNvb7VYihAyNK45eNUxTzVF1we`: **READY** en expliciet gekoppeld aan `https://bugbaas.vercel.app`.
- Productiecontrole: app, Vleugeljacht-HTML en prototype HTTP 200; BugScan-CORS HTTP 204 en zonder Firebase-token HTTP 401; de bundle bevat Firebase-project `thomascimpro-6266f`.
- Production-envcontrole bevestigt versleutelde OpenAI-, Firebase-, Google-, origin- en receipt-configuratie zonder geheime waarden te tonen.
- Echte headless WebKit met iPhone 13-profiel: testaccountlogin, Play, ontgrendelde Wing Hunt en start van de 3D-run slagen; **0** consolefouten, **0** paginafouten en **0** `HTMLAudioElement.play()`-aanroepen tijdens de gecontroleerde app-taps.
- Vercel-runtimecontrole na de smoke: geen errorlogs en geen HTTP 5xx. Een fysieke iPhone-FPS- en luidsprekercontrole blijft buiten deze Windows-omgeving.

## 2026-07-29 BugBaas 3.0.5 Android-release

- `npm run typecheck`: **passed**.
- TypeScript-tests die in de bestaande Node-runner passen: **408/408 passed**; Museum reward-model afzonderlijk: **4/4 passed**.
- JavaScript/MJS-tests buiten dependency-mappen: **136/136 passed**; gerichte BugScan-, deployment- en source-scopecontroles: **22/22 passed**.
- `npm run apk:release -- --no-daemon` met verplichte productie-envcontrole: **BUILD SUCCESSFUL**; de ingebouwde BugDex-artvalidatie is geslaagd.
- APK-badging: package `nl.cimpro.bugbaas`, `versionCode 314`, `versionName 3.0.5`, minSdk 26, targetSdk 36, alleen ARM64.
- `apksigner verify`: **passed**, APK Signature Scheme v2; certificaat SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, gelijk aan de openbare 3.0.4-APK.
- APK: `dist/BugBaas-3.0.5.apk`, 111.939.274 bytes, SHA-256 `29B570E08FAA9917043AA0A6E0482FFF9174DCB53D7C5B1F752081B257946BFF`.
- Pakketanalyse bevestigt de productie-URL, Firebase-project en Functions-route; geen van de lokaal aanwezige serversecrets is in de APK gevonden.
- Er was geen ADB-device of emulator aangesloten; installatie en fysieke camera-/gameplaycontrole konden daarom niet worden uitgevoerd.
- De losse Daily-/Weekly-runners blijven onder kale Node geblokkeerd door React Native/Firebase-module-resolutie; typecheck, de overige suites en de productiebuild zijn wel groen.

## 2026-07-29 BugBaas 3.0.4 productiecorrecties

- `npx tsc --noEmit`: **passed**.
- Expo web-export: **passed**, 1.370 modules en een AppEntry-bundle van circa 3,12 MB.
- Zoekzone-API plus Vleugeljacht-prototypetests: **12/12 passed**; unlock-, Safari-timing- en structuurtests: **11/11 passed**.
- Gerichte BugScan-classificatie- en prompttests: **passed**. De volledige classificatiesuite eindigt nog rood op de al bestaande 500/249-catalogussynchronisatiecontrole.
- Localhost met het opgegeven testaccount op 390x844 en iPhone-Safari user-agent: login, camerainput met `capture=environment`, trading, ontgrendelde Vleugeljacht en route/workspacebehoud na 390x844 -> 844x390 zijn gecontroleerd; 0 browserconsolefouten.
- Een echte WebKit-/fysieke-iPhone-run was niet beschikbaar; de browsertest gebruikte Chrome met mobiele touch- en Safari-user-agentemulatie.
- Vercel remote build `dpl_Ayvp4aHox6r2bNxEcBL4cKXFHe1E`: **READY**. `https://bugbaas.vercel.app` geeft HTTP 200 voor app en Vleugeljacht; de nieuwe vangzone, verborgen knop, tik-op-speelveld en netslag staan aantoonbaar in de productie-assets.
- Productie-API: zoekzones HTTP 200 met 24 resultaten rond Utrecht; BugScan zonder login HTTP 401; CORS-preflight HTTP 204 voor `https://bugbaas.vercel.app`; AppEntry bevat Firebase-project `thomascimpro-6266f`.
- Vercel-runtimecontrole na de smoke toont 200/204/401 en geen 5xx. Alleen een Node `url.parse()`-deprecationwaarschuwing vanuit de zoekzone-afhankelijkheid is zichtbaar.
- De losse weekly-unitrunner start onder Node 24 niet door bestaande extensionless TypeScript-module-resolutie; typecheck en productie-export zijn wel groen.

## 2026-07-29 Vleugeljacht 3D exact in-app Android-integratie

- `npm run typecheck`: **passed**.
- Gerichte structuur- en prototype-tests: **passed**.
- Android `:app:syncButterflyCatchAssets`: **passed**.
- Gegenereerde APK-assets bevatten `index.html`, key-art, `prototype.js` en Three.js `0.180.0`; er staan geen HTTP(S)-URL's in deze gamebundle.
- Na normalisatie van regeleinden en herstel van uitsluitend de lokale importregel is de gegenereerde `prototype.js` gelijk aan de Vercel-bron: **sameGameLogic=true**.
- Geen APK-build, emulatorinstallatie of fysieke Android-test uitgevoerd, conform het verzoek van de gebruiker.

## 2026-07-29 officiële release 3.0.1

- `npm run typecheck`: **passed**.
- `npm run validate:bug-art`: **1/1 passed**.
- Gerichte Vlindervangst-, arcade-, Museum-, Daily- en foregroundtests: **32/32 passed**.
- `git diff --check`: **passed**; alleen bestaande LF/CRLF-waarschuwingen.
- Android `assembleRelease` met `bugbaasLegacyDebugSigning=false`: nieuwe APK aangemaakt op 29-07-2026 13:06:03.
- APK-badging: package `nl.cimpro.bugbaas`, versionCode `309`, versionName `3.0.1`, minSdk 26, targetSdk 36.
- `apksigner verify`: **passed**, één signer, APK Signature Scheme v2, CimPro-uploadcertificaat SHA-256 `c83a95d344b2068c09fd1e9d921b102b248857dbeca330122f2c9e756dacceff`.
- APK: `dist/BugBaas-3.0.1.apk`, 113.944.518 bytes, SHA-256 `A548081F0266A053A047C87DA6A64CCF45C6D0A4DC750EFB596D08E332797D13`.
- Vercel `dpl_F6TftPPj35JeQyEs8dAySD5sEoSF`: **READY**, productionalias `https://bugbaasv3.vercel.app`.
- Aliascontrole: root, 3D-game en actuele AppEntry-bundle geven HTTP 200; bundle bevat zowel Vlindervangst als versie 3.0.1. Vercel rapporteert geen runtimefouten in het gecontroleerde halfuur.
- Geen fysieke Android-installatie uitgevoerd; signing, metadata en bestand zijn wel rechtstreeks op de gebouwde APK gevalideerd.

## 2026-07-29 360° HD-vlindervangst prototype

- TDD-redfase: **0/4 passed** omdat de nieuwe `prototype.js`, sensorbesturing, wereldbouwers en HD-netcontracten nog ontbraken.
- `node --check prototypes/butterfly-catch-3d/prototype.js`: **passed**.
- `node --test prototypes/butterfly-catch-3d/prototype.test.mjs`: **4/4 passed**.
- Headless Chrome met Three.js r180, WebGL en SwiftShader heeft `index.html` rechtstreeks geladen; de module initialiseerde en het canvas rapporteerde `data-engine="three.js r180"`.
- Gecontroleerd: 360°-UI, Device Orientation-permissiepad, herkalibratie, dragfallback, volledige wereldbouwers, instanced begroeiing, geavanceerde vlinderdelen, fullscreen, staged netanimatie en maximaal één vangst per slag.
- Niet bewezen in deze omgeving: echte gyroscoopwaarden, haptiek, telefoon-FPS en visuele kwaliteit op fysiek Android-apparaat.
- Geen Expo-build, APK-build, Firebase-test of deployment uitgevoerd; de bestaande app is niet gewijzigd.

## 2026-07-28 Bug Brain vragenbank-audit

- Voor de wijziging gedetecteerd: **20** NL-, **19** EN- en **6** FR-expertvragen met taxonomisch woordstam-verraad; **393** Nederlandse vragen met foutieve werkwoordvolgorde; **1000** uitlegteksten per taal met een kleine letter na de eerste punt.
- Na de wijziging: **1000/1000 unieke vragen per taal**, 0 exacte antwoordlekken, 0 gedetecteerde kromme Nederlandse bijzinnen en 0 uitlegteksten met kleine-letterstart.
- De voorbeeldvraag over de bidsprinkhaan geeft nu `Mantodea` als antwoord en formuleert de aanwijzing als een aparte correcte zin.
- `node --experimental-strip-types --test src/services/bugQuizService.test.ts`: **11/11 passed**.
- Geen APK-, emulator- of deploymenttest uitgevoerd; alleen de vragenbank en bijbehorende services zijn gewijzigd.

## 2026-07-28 3.0.0-beta.8 Journaal-scroll en Weekvondst

- TDD-redfase bevestigde de volledige `Animated.View` rond het Veldjournaal, ontbrekende overscrollbeveiliging en de nog ontbrekende wekelijkse soortselectie/reward-core.
- `npm run typecheck`: **passed**. Hiervoor zijn vijf dubbele, al bestaande BugArt-objectregels verwijderd; de eerste mappings en assets zijn ongewijzigd gebleven.
- Gerichte scherm-, collectie- en weekrotatietests: **32/32 passed**.
- Gerichte Firebase reward-, milestone- en researchtests: **10/10 passed**; `node --check firebase/functions/index.js`: **passed**.
- Android releasebuild: **BUILD SUCCESSFUL in 4m 43s**. APK `3.0.0-beta.8`, versionCode `307`, ABI `x86_64`, SHA-256 `DD04EE59C713B945EF2886A9DE7651EB9362DBC1A13B161ACE3072F3B107D464`.
- Small Phone 720×1280: APK-installatie geslaagd; Wereld toont Weekvondst met Oorworm, Meikever en Bladluis, `+50 XP + Episch`, en `Maak een foto` opent BugScan zonder een scan te verbruiken.
- Journaaltestaccount had geen veldnotities. Zes opeenvolgende neerwaartse scroll/overscrollframes zijn vastgelegd; in ieder inhoudsvlak was de puur-witte pixelratio **0%** en bleef circa **57,5%** de ingestelde papierkleur.
- Screenshots lokaal: `%TEMP%\bugbaas-beta8-world-weekvondst-full.png`, `%TEMP%\bugbaas-beta8-journal-top.png` en `%TEMP%\bugbaas-beta8-journal-scroll\frame-00.png` t/m `frame-06.png`.
- Geen Firebase Functions-deployment of APK-publicatie uitgevoerd. De UI en pure/idempotente serverlogica zijn getest; een echte reward-uitbetaling is nog niet live of end-to-end uitgevoerd.

## 2026-07-28 BugDex 500 en Crown-rangen

- Runtime/cataloguspariteit: **500/500 entries**, 500 unieke IDs; rarity-verdeling is gelijk in app en shared catalogus.
- Assetaudit: **269 PNG’s**, 0 WebP’s en 0 dubbele stems in `assets/bugdex`; `aardhommel.png` en `weidehommel.png` zijn 768×768 RGBA met volledig transparante hoeken.
- `node --no-warnings --experimental-strip-types --test src/services/bugCrownService.test.ts src/screens/BugSmashDuelScreen.structure.test.ts`: **16/16 passed**.
- `node --no-warnings --experimental-strip-types --test src/services/bugDexCatalog.test.ts src/services/generatedBugArt.test.ts`: **14/14 passed**.
- Geselecteerde progression-tests: **6/6 passed**; Firebase deployment-package tests: **5/5 passed**.
- `npm run typecheck`: **passed**. `git diff --check`: **passed** met alleen bestaande LF/CRLF-waarschuwingen.
- Volledige `bugProgressionCatalog.test.ts` blijft **1 test rood** omdat de al aanwezige `bug_brain_daily`-unionwaarde ontbreekt in `legacyRewardSourcePolicies`; dit is niet door deze wijziging geïntroduceerd.
- Geen browser/device/deployment-validatie uitgevoerd.

## 2026-07-27 Arcade fullscreen launch

- Browser-redfase op 390×844: Tap Duel Practice sloot de game-modal direct en keerde terug naar de Play-hub zodra `onFullscreenChange(true)` werd uitgevoerd.
- Root cause test: `App.tsx` wisselde de app-shell van `SafeAreaView` naar `View`, waardoor React de volledige Play-subtree remountte.
- `node --experimental-strip-types --test src/screens/AppDuelFullscreen.structure.test.ts src/screens/PlayScreen.test.ts src/screens/BugSmashDuelScreen.structure.test.ts`: **18/18 passed**.
- `npm run typecheck`: passed.
- `git diff --check -- App.tsx src/screens/AppDuelFullscreen.structure.test.ts`: passed; alleen de bestaande LF/CRLF-waarschuwing werd gemeld.
- Mobiele Playwright-groenfase: Practice bleef open met Training-HUD en timer; Ranked bleef open met Random-HUD, timer en speelbare targets.
- Browserconsole: 0 errors. Alleen de bekende React Native Web `useNativeDriver` fallback-waarschuwing.
- Nog niet naar Vercel gedeployed.

## 2026-07-27 Field-note receipt verification

- Red phase: the cross-runtime test reproduced the defect; a v2 receipt signed from the configured secret was rejected by both verifier paths because verification used only a stale hardcoded public key.
- `node --test scripts/realBugScanReceiptIntegration.test.mjs`: **4/4 passed** after the fix.
- Coverage confirms same-secret acceptance, different-secret rejection, UID binding and ten-minute expiry in both shared/Vercel and Firebase receipt modules.
- `npm --prefix firebase/functions test`: **63/63 passed**.
- `npm run typecheck`: passed.
- `git diff --check`: passed; only existing LF/CRLF warnings were reported.
- No authenticated production field-note save has been executed because production secret rotation and deployment require explicit release approval.


## 2026-07-27 BugDex unlock popup rarity styling

- TDD-redfase bevestigde dat de 3.0-popup nog archive-components en vaste paarse/beige accenten gebruikte.
- `node --experimental-strip-types --test src/components/BugDexUnlockModal.structure.test.ts`: **3/3 passed**.
- `npm run typecheck`: passed.
- `git diff --check`: passed; alleen bestaande LF/CRLF-waarschuwingen werden gemeld.
- De tests bewaken rarity-kleuren, de ronde achtergrond en het verwijderen van `JournalStamp`, `SpecimenFrame`, `RarityMarks` en plinth-elementen.
- Nog geen fysieke mobiele browsertest uitgevoerd.


## 2026-07-27 Arcade ranked/practice launch

- Added regression coverage proving Ranked and Practice clear stale duel state before launch.
- Verified the new Practice launcher is wired for Web Runner and Bubble Swarm; the remaining non-tap modes use the same function.
- `node --experimental-strip-types --test src/screens/BugSmashDuelScreen.structure.test.ts src/screens/PlayScreen.test.ts`: **17/17 passed**.
- `npm run typecheck`: passed.
- `git diff --check`: passed; only existing LF/CRLF warnings were reported.
- No authenticated physical-mobile browser run was performed.


## 2026-07-27 Zwermbeleg boss-art mobile

- Regressietest eerst rood gemaakt voor expliciete afbeeldingsafmetingen en grotere compacte hero.
- `node --experimental-strip-types --test src/screens/WorldScreen.structure.test.ts`: **14/14 passed**.
- `npm run typecheck`: passed.
- `git diff --check`: passed; alleen bestaande LF/CRLF-waarschuwingen.
- Nog niet gedeployed; releasegrens vereist expliciete toestemming.


## 2026-07-27 Persistent mobile Play workspace

- TDD-redfase bevestigde dat Play geen ingeklapte activiteitensecties had en `PLAY NOW` geen schone Arcade-workspace afdwong.
- `node --experimental-strip-types --test src/screens/PlayScreen.test.ts src/screens/BugSmashDuelScreen.structure.test.ts`: **16/16 passed**.
- `npm run typecheck`: passed.
- `git diff --check`: passed; alleen bestaande LF/CRLF-waarschuwingen werden gemeld.
- De fix ontkoppelt de modale workspace bij sluiten en wist het duel-ID wanneer `PLAY NOW` wordt gebruikt.
- Nog geen fysieke mobiele browsertest uitgevoerd.


## 2026-07-27 Foreground rewards and field-note authentication

- Focused foreground and field-journal tests: **4/4 passed**.
- Firebase Functions package tests: **63/63 passed**.
- `npm run typecheck`: passed.
- `node --check firebase/functions/index.js`: passed.
- `git diff --check`: passed with only existing LF/CRLF notices.
- Expo web export completed with 405 assets.
- Firebase deployment succeeded for `recordVerifiedObservation` and `listVerifiedObservations`.
- Vercel deployment `dpl_5db4npGo9MYbTpj6Nm2JGbtwFerU` is Ready; production `/` and `AppEntry-2af6a32affb92ea52ba65823707b79b7.js` return HTTP 200.
- Authenticated field-note saving and an actual foreground spawn on every route remain unverified manually.

## 2026-07-26 Museum mobile scrolling

- `node --experimental-strip-types --test src/screens/MuseumStageRail.structure.test.ts src/screens/MuseumScreenLayoutModel.test.ts`: **8/8 passed**.
- Nieuwe structuurtest bevestigt één verticale Museum-paginascroll, geen opgesloten panelscroll en BottomNav/safe-area onderruimte.
- Eerste testpoging met `--import tsx` faalde omdat `tsx` niet als dependency is geïnstalleerd; opnieuw uitgevoerd met de bestaande Node type-strip workflow.
- Volledige `npm run typecheck` overschreed de tool-time-out en is daarom niet als geslaagd gelabeld.
- Geen deployment of fysieke telefoontest uitgevoerd.

## 2026-07-26 Duel navigation consolidation

- TDD red phase confirmed the old three-tab model and missing BugDex helper detail.
- `node --experimental-strip-types --test src/screens/PlayScreen.test.ts src/screens/BugDexScreen.structure.test.ts src/screens/BugSmashDuelScreen.structure.test.ts`: **13/13 passed**.
- `npm run typecheck`: passed.
- Targeted `git diff --check`: passed; only the existing LF/CRLF notice for `App.tsx` was reported.
- No deployment or authenticated device/browser gameplay test was performed.

## 2026-07-26 Mobile arcade grid

- TDD red phase: existing horizontal arcade rail failed the new six-game grid and compact Solo Campaign assertions.
- `node --experimental-strip-types --test src/screens/BugSmashDuelScreen.structure.test.ts`: **6/6 passed**.
- `npm run typecheck`: passed.
- `npx expo export --platform web --output-dir dist-arcade-grid-check --clear`: passed with 405 assets.
- Authenticated Playwright QA on localhost: all six game titles, locked states and Solo Campaign rendered at 360x800, 412x915 and 800x1280.
- Measured document widths matched every viewport exactly: 360/360, 412/412 and 800/800; no horizontal overflow.
- At 360x800 the last game row starts at y=556, Solo Campaign at y=656.5 and Active Bug Squad at y=754. This keeps all game choices visible while allowing later content to scroll.
- Existing localhost CORS failures for remote status functions and Firestore 403 writes remained visible; they were unrelated to this layout change. No deployment performed.

## 2026-07-26 Draggable Bug World map

- TDD red phase confirmed missing map-movement helpers, independent viewport state, debounce/reload behavior and insufficient two-decimal zone-cache precision.
- Targeted projection, map structure and OSM search-zone regressions: **19/19 passed**.
- `npm run typecheck`: passed.
- `npx expo export --platform web --output-dir %TEMP%\bugbaas-map-drag-check --clear`: passed with 405 assets.
- Authenticated headless Chrome check: the map loaded with its responder attached; a 240 px drag shifted tile positions and requested `/api/nearby-search-zones` for the new viewed center; zoom changed OSM tiles from level 13 to 14; the zone legend hid and restored; no runtime exception occurred.
- The browser test account had zero stored findings, so selectable finding-marker preservation is covered by source regression rather than a live marker click. No physical Android test or deployment was performed.

## 2026-07-26 BugScan unlock confirmation

- TDD red phase confirmed failures for missing immediate scan presentation, missing granted-drop handoff and missing screen callback.
- Focused reward/presentation/screen regressions: **12/12 passed**.
- `npm run test:real-bug-scan`: **70/70 passed**.
- `npm run typecheck`: passed.
- `npx expo export --platform web --output-dir dist-scan-unlock-check --clear`: passed with 405 assets.
- `http://localhost:8085` was not running, so no authenticated browser screenshot or real camera/API scan was performed. No deployment was performed.

## 2026-07-26 BugDex checkerboard asset cleanup

- Pixel audit: **249/249 active BugDex mappings inspected**, **0 checkerboard suspects remain** after replacing 11 mappings.
- `node --experimental-strip-types --test src/services/bugDexCatalog.test.ts`: **10/10 passed**, including the checkerboard-path regression.
- `npm run typecheck`: passed.
- Expo web export: passed and resolved the replacement artwork files.
- The clean Mosquito asset was visually inspected directly. No physical Android or deployed Vercel rendering was performed.

## 2026-07-26 Museum rewards and endgame

- Museum reward/model and existing Museum regressions: **17/17 passed**.
- Firebase Museum reward core and deployment-package regressions: **11/11 passed**, including duplicate-observation and Water-habitat checks.
- `node --check firebase/functions/index.js`: passed.
- `npm run typecheck`: passed.
- `npx expo export --platform web --output-dir dist-museum-rewards-check --clear`: passed with 408 bundled assets.
- No authenticated Firebase transaction, browser screenshot, physical device or deployed-function result is claimed.

## 2026-07-26 Duel launch and Play hero framing

- Targeted Duel/Play regressions: **6/6 passed**, including the visible Duel launch actions and landscape-friendly Duel/Ranking hero frame.
- `npm run typecheck`: passed.
- `npx expo export --platform web --output-dir dist-duel-check --clear`: passed with the V3 bundle and 407 assets.
- No device, Vercel or Firebase result is claimed; physical Android rendering still needs a phone/emulator retest.

## 2026-07-26 BugDex ranking and back navigation

- Targeted ranking/Play regressions: **7/7 passed**, including the unlocked-bugs mode, `bugDexCount` metric and Ranking back action.
- `npm run typecheck`: passed.
- `npx expo export --platform web --output-dir dist-ranking-check`: passed with the V3 bundle and 407 assets.
- No device, Vercel or Firebase result is claimed; physical Android rendering still needs a phone/emulator retest.

## 2026-07-26 BugScan review safe area

- Targeted review/layout regressions: **6/6 passed**, including explicit review-stage scrolling and compact phone action styles.
- `npm run typecheck`: passed.
- `npm run test:real-bug-scan`: **69/69 passed**.
- `npx expo export --platform web --output-dir dist-review-check`: passed with the V3 bundle and 407 assets.
- No device, Vercel or Firebase result is claimed; physical Android rendering still needs a phone/emulator retest.

## 2026-07-26 2.10.20 mission parity

- Mission regression tests: **4/4 passed** (daily/weekly template contents, progress values, completion rules and absence of tier fields). The tests were run with a temporary Node shim for the app's React Native Firebase imports.
- `npm run typecheck`: passed.
- `npx expo export --platform web --output-dir dist-missions-check`: passed with the V3 bundle and 407 assets.
- No physical device, Firebase write, Vercel deployment or production mission-flow result is claimed.

## 2026-07-26 Vercel v3 audio parity

- `node --experimental-strip-types --test src/services/webSoundProfile.test.ts`: **4/4 passed**, including byte-for-byte Android/web asset comparison.
- `npm run typecheck`: passed.
- `npx expo export --platform web`: passed; Expo included all 12 WAV files as hashed web assets.
- Production deployment `dpl_5XnpKCQkSdtxVuPVdFPadEYw2Wbm` is READY at `https://bugbaasv3.vercel.app`.
- Live verification: all 12 hashed WAV URLs returned HTTP 200 and matched the exported file hashes.

## 2026-07-26 Mobile viewport corrections

- Added structural regressions for BugScan camera width/gallery reachability, Swarm boss bounds, Play Arcade art and the Museum editor overlay; targeted UI suite: **22/22 passed**.
- `npm run typecheck`: passed.
- `npm run test:real-bug-scan`: **69/69 passed**.
- `npx expo export --platform web --output-dir %TEMP%/bugbaas-3-layout-check`: passed with 1069 modules and 395 assets.
- No device, Vercel or Firebase result is claimed; physical rendering still needs a phone/emulator retest.

## 2026-07-26 V3 compact Android beta APK

- `npm run typecheck`: passed.
- Complete project-owned source suite: **265/265 passed**.
- `:app:assembleRelease`: passed after a clean release build.
- APK metadata: package `nl.cimpro.bugbaas`, version code `300`, version `3.0.0-beta.1`, minimum SDK 26, target SDK 36 and ABI `arm64-v8a`.
- APK signing: v2 verified; certificate SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- Artifact: `dist/BugBaas-3.0.0-beta.1.apk`, 78,846,105 bytes / 75.19 MiB, SHA-256 `80BDDC938F15F871F2985A58AE83D2F53C676251FD1B5AA93143701186BC4248`.
- Size comparison: 28.84 MiB / 27.7% smaller than the previous 104.04 MiB release APK.
- `adb devices -l`: no connected device or emulator. Installation, camera, Google Sign-In and physical image rendering were not run.
- Firebase and Vercel were not changed.

## 2026-07-25 Commercial game refactor slice 1

- `npm run typecheck`: passed.
- Targeted shell, World, survival-game, quiz and Firestore checks: **43/43 passed**.
- `npm run test:real-bug-scan`: **65/65 passed**.
- `node --test firebase/functions/*.test.js api/nearby-search-zones.test.js`: **55/55 passed**.
- `npx expo export --platform web --output-dir output/web-export-redesign-v3 --clear`: passed with 1042 modules and 371 assets.
- Authenticated localhost browser: World rendered at 390x844, 768x1024 and 1440x900 with no horizontal overflow at 390 px.
- Popup coverage: all five onboarding steps and the auto-opened Museum editor were opened and captured.
- Bubble Swarm practice opened, started and rendered its live playfield. Bug Tower runtime remains progression-locked for this account; its endless contract is covered by source and balance tests.
- Browser exposed CORS failures from currently deployed Functions for `127.0.0.1`. The source allowlist fix and regression test pass, but the deployed behavior remains unchanged because no deployment was authorized.
- Screenshots: `screenshots/redesign-v3/`.
- Physical Android camera, touch, Back, text scaling and launcher-icon rendering remain unverified.

## 2026-07-25 V3 World biome visual implementation

- `node --experimental-strip-types --test --test-force-exit src/screens/WorldScreen.test.ts src/screens/WorldScreen.structure.test.ts src/screens/world/WorldTodayModel.test.ts src/screens/world/WorldBiomeHero.structure.test.ts`: **22/22 passed**.
- The new regression proves World marker visuals no longer use the `⌖`, `⌁`, `◎` or `?` placeholder text symbols.
- Targeted TypeScript program check for `WorldScreen.tsx`, `WorldBiomeHero.tsx` and `ResearchProgressCard.tsx`: **0 diagnostics**.
- Full `npm run typecheck` and direct `npx tsc --noEmit` each exceeded the DevSpace command window without producing diagnostics; this is not recorded as a passing full-project typecheck.
- Two fresh Expo web-export attempts timed out through DevSpace before creating the temporary output directory, so no new browser screenshot is claimed for this pass.
- Physical Android small-screen, large-text, touch and Back QA remains open. No deployment was performed.

## 2026-07-24 V3 authenticated production corrections (local source)

- `node --test api/nearby-search-zones.test.js`: **3/3 passed**, including verification that the Overpass request receives an abort signal.
- Complete project-owned source suite: **231/231 passed**.
- New regressions cover stalled client requests, retryable map failure, permanent Daily/Weekly access, Profile Settings navigation, Swarm preview state and localized Map/Journal/Museum copy.
- `npm run typecheck`: passed.
- No deployment or authenticated production retest was performed after these source changes.

## 2026-07-24 V3 authenticated full production test

- Email login with the supplied synthetic QA account: passed; credentials were not stored in repository files.
- Mobile production viewport: 390x844 with no horizontal overflow.
- World Today: Next Action, Research and movement loaded without runtime errors.
- Daily/Weekly missions: failed discoverability; both were absent because movement won the contextual module priority and no permanent Missions entry exists.
- Events: Swarm Siege opened and preview detail loaded. Events card incorrectly showed `UPCOMING` and said preview opens Friday at 12:00 after that time had already passed.
- Map: base map, synthetic browser geolocation and recenter passed. Nearby search zones remained on `Zoekzones laden…` after more than 20 seconds.
- Direct production search-zone request: timed out after 35 seconds with 0 bytes received. `api/nearby-search-zones.js` currently has no upstream abort timeout.
- BugScan: gallery upload, image review, production AI request and result passed. Composite multi-bug illustration was correctly rejected as `NO BUG IDENTIFIED`; allowance remained 3/3 and no reward was created.
- Play: Tap Duel Training and Bubble Swarm Training launched; both showed no-reward/training behavior. Duel and Ranking were correctly locked for an account with 4/10 species; Web Runner and Solo Campaign remained locked by progression.
- Collection: BugDex, Museum, Journal, squad editor, Trade and Upgrades opened without runtime or HTTP errors. No trade or upgrade transaction was confirmed.
- Profile: profile and complete badge overview opened. Settings has no normal in-app entry; the existing Settings route is only reached from the FitnessSyncer callback path.
- Language: selected English still contains Dutch Map, Expedition, Journal and Museum/editor copy.
- Browser diagnostics: no app console errors, page errors or HTTP 4xx/5xx responses during tested flows. Chrome emitted one semantic warning because the password field is not inside an HTML form.
- Not executed: Google login, logout/session restore, successful legitimate single-bug reward, physical Android camera/location/touch/Back, tablet, multi-user trade/duel/event, and locked modes after unlock.
- Detailed review: `docs/reviews/2026-07-24-bugbaas-v3-authenticated-production-test.md`.
- Updated correction plan: `docs/plans/2026-07-24-bugbaas-v3-production-qa-plan.md`.

## 2026-07-24 V3 live functional review

- Production root `https://bugbaasv3.vercel.app/`: HTTP 200.
- Fresh 390x844 browser context: login shell rendered without horizontal overflow, console errors, page errors, failed requests or HTTP errors.
- Email login panel opened and exposed two inputs; full email and Google authentication were not completed.
- Production-origin CORS preflights for `swarmSiegeStatus`, `researchTargetStatus` and `teamHuntStatus`: HTTP 204 with the expected origin.
- Unauthenticated `POST /api/real-bug-identify`: HTTP 401 with a clear re-login response.
- Project-owned automated suite: **317/317 passed** across 93 test files. Dependency tests under `firebase/functions/node_modules` were explicitly excluded.
- Direct TypeScript check: passed with exit code 0.
- Current Expo web export attempt remained at Metro 0%; no local-versus-production bundle comparison was produced in this review.
- Authenticated production, Google OAuth completion, physical Android camera/location/touch and multi-user event flows remain unverified.
- Review: `docs/reviews/2026-07-24-bugbaas-v3-live-functional-review.md`.
- Plan: `docs/plans/2026-07-24-bugbaas-v3-production-qa-plan.md`.

## 2026-07-24 Hybrid progression master production release

- Complete TypeScript suite: **228/228 passed** across services, screens, components, navigation, responsive layout and five progression personas.
- Complete Firebase Functions suite: **51/51 passed**, including deploy-package integrity, Research retry/idempotency, Momentum verification, fixed Solo Campaign milestones, monthly Team Hunt categories, eight-week seasons, Swarm target scaling for 1/5/25/100 active players and boss-run reconnect.
- `npm run typecheck`: passed.
- `node --check firebase/functions/index.js`: passed.
- `git diff --check`: passed; only existing CRLF normalization warnings were emitted.
- `npx expo export --platform web --output-dir tmp/progression-master-production`: passed with 1026 modules and 359 assets.
- `./gradlew :app:processDebugResources`: `BUILD SUCCESSFUL`.
- `NODE_ENV=production ./gradlew :app:assembleDebug --console=plain`: `BUILD SUCCESSFUL`; APK `android/app/build/outputs/apk/debug/app-debug.apk`, SHA-256 `5d66c1bca900b18561a9c0331c0bbe2a6ec1fff723bfc825418454552ad473db`.
- Firestore Rules deployed successfully to `bugbaas-3`.
- All Functions deployed successfully to `thomascimpro-6266f`; the new `claimSoloCampaignBossMilestone` endpoint returns HTTP 401 without authentication, proving it is live and protected.
- Vercel production deployment `dpl_DerYgX6Np594ZVYP94XumQnb5g4L` is `READY`; `https://bugbaasv3.vercel.app` returns HTTP 200 and serves `AppEntry-56b852cb319589ec4e6044fbc6b2d7ab.js`.
- Physical Android camera, touch, text-scaling and tablet checks remain unverified because `adb devices` returned no connected target.

## 2026-07-24 Hybrid progression catalog Phase 0

- `node --experimental-strip-types --test src/services/bugProgressionCatalog.test.ts`: 6/6 passed.
- Coverage proves all 231 current BugDex IDs appear exactly once and no definition uses the legacy parking profile.
- Tests validate starter IDs, Dutch field routes, all Mythic routes, campaign milestones, Swarm Siege/Team Hunt/season pools, habitats, Museum wings and exact verified-scan eligibility.
- The legacy reward policy is checked against every current `BugDexDropSource` literal in `bugDexService.ts`.
- `npx tsc --noEmit --pretty false`: passed after aligning the Node URL type in the structural test.
- No gameplay screen, Firebase data, Function, rule, deployment, APK or production behavior was changed or tested in this phase.

## 2026-07-23 Swarm Siege (localhost only)

- `npm --prefix firebase/functions test`: 28/28 passed.
- `node --test firebase/functions/swarmSiegeCore.test.js`: 9/9 passed, including the hard event-end run expiry.
- `node --experimental-strip-types --test src/screens/WorldScreen.test.ts src/services/swarmSiegeGameBalance.test.ts`: 6/6 passed.
- `node --test scripts/tsconfigSourceScope.test.mjs`: 1/1 passed.
- `npm run typecheck`: passed.
- `npx expo export --platform web --output-dir tmp/swarm-siege-web`: passed with 974 modules and 359 assets.
- Headless Chromium at 412x915 rendered the exported BugBaas login shell with zero console errors and zero page errors.
- No authenticated event run, Firebase deployment, Android resource build, APK or physical-device test was performed.

## 2026-07-22 Private sightings map foundation (localhost only)

- `node --test firebase/functions/privateSightingMapCore.test.js`: 2/2 passed (rounding and malformed-location rejection).
- `node --experimental-strip-types --test src/services/privateSightingLocation.test.ts`: 1/1 passed (safe opt-out without browser geolocation).
- Targeted TypeScript transpile for Field Journal, Scan and the location service: 0 errors; `git diff --check` passed.
- No Firebase deployment, map provider, public map, APK validation or authenticated location permission test was performed.

## 2026-07-22 Discovery UX pass

- `HomeScreen.tsx`, `ExpeditionWorldScreen.tsx` and `App.tsx` transpile cleanly with TypeScript `transpileModule`.
- `git diff --check` passes for the working tree.
- Full `npx tsc --noEmit` did not complete inside the 64-second local command limit; this is not a passing full-project typecheck.
- Local `http://localhost:8085/` did not respond within the 10-second smoke-check limit, so this pass has no new browser screenshot evidence.

## 2026-07-22 Core-loop rework

- `HomeScreen.tsx`, `MuseumScreen.tsx`, `RealBugScanScreen.tsx` and `App.tsx` transpile cleanly with TypeScript `transpileModule`.
- `git diff --check` passes. No Firebase, Android, Vercel or 2.10.19 files were changed for this slice.

## 2026-07-22 Catalog readiness

- `node --experimental-strip-types --test src/services/bugDexCatalog.test.ts src/services/generatedBugArt.test.ts`: 9/9 passed.
- Existing BugDex fact coverage gaps were filled. The first generated batch asset was chroma-keyed, resized to 512x512 and validated with an RGBA transparent corner.

## 2026-07-21 3.0 Team Hunt Weekend (localhost only)

- `firebase/functions/npm test`: 16/16 passed, including Team Hunt's Friday–Monday boundary, unsafe-observation rejection and unique-species identity normalization.
- `node --check firebase/functions/index.js`: passed.
- `git diff --check`: passed.
- The Team Hunt endpoints and additive Firestore rules are source-validated only in this slice; no 3.0 Function/rules deploy, authenticated team event or production UI test was performed.

## 2026-07-21 BugBaas 3.0 verified observations

- Local receipt signer/verifier smoke passed; `npm run test:real-bug-scan` passed 65/65.
- `http://localhost:8085` returns HTTP 200; the local scan API preflight and Firebase journal preflight both return 204 for this origin.
- Firestore rules compiled and were released; `recordVerifiedObservation` is ACTIVE with its receipt secret attached.
- An invalid Firebase token is rejected with HTTP 401; no unauthenticated client can create a field note.
- New 3.0 pure-service tests passed 4/4: Bug Professor and recognition-confidence medals. Daily Spotlight was intentionally removed because it duplicated the existing daily mission loop.
- Metro bundled the current web beta successfully (977 modules); no Metro errors were emitted. Authenticated UI interaction remains open because no test-account credentials were used.
- The authenticated scan-to-field-note flow and Museum/expedition clicks still require a logged-in test account; no user photo or account data was used.
- Conservatory Guardian pure backend tests passed 3/3. They cover capped aggregate progress, contributor eligibility and malformed counters; Functions syntax and `git diff --check` passed. Full TypeScript checking exceeded the 60-second local validation budget without diagnostics, so an authenticated screen flow remains open.

## 2026-07-21 BugScan recognition release 2.10.19

- `npm run test:real-bug-scan`: 65/65 passed, including the 0.70 acceptance boundary, exact-name protection, 2048 px primary input and two payload fallbacks.
- `npm run typecheck`: passed.
- `npx expo install --check`: dependencies are up to date; production Expo webexport passed with 365 assets.
- Vercel deployment `dpl_C5RcSw2H1YctAE5xzJC1oFhYQkjw`: `READY`; `https://bugbaas.vercel.app` serves `AppEntry-fcdb748e30f50dc01ebd72c98e268ef3.js`, containing version 2.10.19 and the 2048/1600 image policy. The API route returns the expected HTTP 405 for GET.
- Android `assembleRelease`: `BUILD SUCCESSFUL`; package `nl.cimpro.bugbaas`, versionCode 199, versionName 2.10.19, minSdk 26, targetSdk 36 and APK Signature Scheme v2 verified.
- APK `dist/BugBaas-2.10.19.apk`: 109,089,194 bytes; SHA-256 `02616E5892830133809D126E608EEC094164CF206F2F8746183A4C5B156AA82E`.
- `adb devices -l` returned no connected device, so physical installation and an authenticated camera-to-result smoke remain unverified.

## 2026-07-21 BugScan analysis hotfix 2.10.18

- `npm run test:real-bug-scan`: 62/62 passed, including incomplete response, truncated JSON, single retry limit and no retry on HTTP 429.
- `npm run typecheck`: passed; production Expo webexport passed with 365 assets.
- Vercel production deployment `dpl_89VffjN5sPH1twe4egfGqfcc9SRT`: `READY`; `https://bugbaas.vercel.app` returns HTTP 200 and `/api/real-bug-identify` returns the expected HTTP 405 for GET.
- A direct local request with `4-oak-treehopper-1.webp` could not authenticate because Vercel downloads the protected OpenAI production value as a placeholder; no secret or production auth setting was changed. The authenticated end-to-end photo result still needs one live logged-in scan.
- Android `assembleRelease`: `BUILD SUCCESSFUL`; package `nl.cimpro.bugbaas`, versionCode 198, versionName 2.10.18, targetSdk 36 and APK Signature Scheme v2 verified.
- Rebuilt APK `dist/BugBaas-2.10.18.apk`: 109,088,862 bytes; SHA-256 `8F47355E41DAF5678F12AE60DCF5C772A4ED0DFF2C5B4F35AB7C5966819A676B` (unchanged because the fix is server-only).

## 2026-07-21 release 2.10.18

- `npm run test:real-bug-scan`: 59/59 passed; `npm run typecheck` and `npx expo install --check`: passed.
- Direct Expo production webexport: passed with 365 assets; remote Vercel build is `READY` as deployment `dpl_2gwHfcpXmMgytVoMuSPsEhAJszGk`.
- `https://bugbaas.vercel.app` serves bundle `AppEntry-2bdeb6a2572a9bb17aae412c175d82d1.js`; bundle checks confirm version 2.10.18, 1536/1280 image policy and `pendingBugDexDiscoveries`.
- Production `/api/real-bug-identify` GET returns HTTP 405 as expected; a real authenticated OpenAI photo scan was not performed.
- Firebase Rules deployed successfully to project `thomascimpro-6266f` after compilation.
- Android `assembleRelease`: `BUILD SUCCESSFUL`; APK package `nl.cimpro.bugbaas`, versionCode 198, versionName 2.10.18, minSdk 26, targetSdk 36, native ABI `arm64-v8a`.
- APK `dist/BugBaas-2.10.18.apk`: 109,088,862 bytes; SHA-256 `8F47355E41DAF5678F12AE60DCF5C772A4ED0DFF2C5B4F35AB7C5966819A676B`.
- APK Signature Scheme v2 passed; certificate SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- `adb devices -l` returned no connected device, so physical install/camera quality and control-feel remain unverified.
- Local `vercel build --prod` failed with Windows CLI error `spawn cmd.exe ENOENT`; direct Expo export and Vercel's remote production build both passed.
- Release commit `d479d4f` and tag `v2.10.18` are present on GitHub.
- History-preserving merge `2d87f0e` promoted the 2.10.18 tree to `origin/master` without force-push; both the former remote master and release tag are verified ancestors.
- GitHub CLI authentication is absent, so no GitHub Release page or APK asset upload was performed.

## 2026-07-21 BugScan missing-species correction

- `npm run typecheck`: passed.
- BugScan client/server tests: 59/59 passed, including forced-nearest-match rejection and localized developer records.
- Image-policy tests confirm 1536 px/0.90 primary input, 1280 px/0.80 fallback and the 4 MB fallback boundary.
- Translation audit: 52 BugScan keys are present in Dutch, English, and French.
- Firestore rules dry run: compiled successfully for project `thomascimpro-6266f`.
- Live cleanup verification: 37 hidden Auth accounts and 477 related Firestore documents deleted; query for `testAccount: true` returns 0.
- No production deployment or live OpenAI photo scan was performed in this change set.

## 2026-07-21 release 2.10.17

- `npm run typecheck`: geslaagd.
- BugScan: 58/58 gerichte client- en servertests geslaagd; FitnessSyncer Functions: 8/8 geslaagd.
- `npx expo install --check`: alle dependencies actueel; productie-webexport geslaagd met 365 assets.
- Android `assembleRelease`: `BUILD SUCCESSFUL`; package `nl.cimpro.bugbaas`, versionCode `197`, versionName `2.10.17`.
- APK: `dist/BugBaas-2.10.17.apk`, 109.079.794 bytes, APK Signature Scheme v2 geldig.
- APK SHA-256: `D9B7981B62DEA05D9B458A12058EEFF55FDBBF6F7FF17EA0991B32033C002C9E`.
- Lokale browsercontrole bevestigde de nieuwe afbeeldingen, Google-weblogin en dat openen van de camera geen poging van 3/3 aftrekt. Een echte providerconsent en fysieke Android-installatie zijn niet uitgevoerd.

## 2026-07-21 FitnessSyncer OAuth connect hotfix

- Gerichte clienttests: 3/3 geslaagd voor actieve connect-policy en platformgerichte FitnessSyncer-uitleg.
- `npm run typecheck`: geslaagd op actuele web/appbron 2.10.15.
- FitnessSyncer Functions-tests: 7/7 geslaagd.
- Verse lokale Expo-webexport: geslaagd.
- Eerste Vercel-preview faalde terecht omdat `.vercelignore` het inmiddels gebruikte `assets/new bugs/cropped/bed-bug.png` uitsloot; de foutieve ignore-regel is verwijderd.
- Vercel-productie `dpl_Gz5vb23fJx1rCCv6Uz2dELP8TqKo`: `READY`; vaste alias `https://bugbaas.vercel.app` wijst naar deze deployment.
- `https://bugbaas.vercel.app/`: HTTP 200; bundle `AppEntry-149da9e01d13fbc13eb1ecbf9e3fcd45.js`: HTTP 200.
- TypeScript-scope is hersteld: gegenereerde `dist*`-bundles worden niet meer als broncode meegenomen; regressietest geslaagd en `npm run typecheck` voltooit weer normaal.
- `/api/real-bug-identify`: GET geeft correct HTTP 405, waarmee de serverless route actief blijft en niet naar `index.html` wordt herschreven.
- Alle vijf FitnessSyncer Functions zijn succesvol gedeployed. `fitnessSyncerStart` CORS-preflight geeft HTTP 204; start en sync geven zonder Firebase-login HTTP 401; callback zonder geldige state geeft HTTP 302 naar `https://bugbaas.vercel.app/?fitnessSyncer=error`.
- Productie-smoke op 390x844: pagina en login-UI laden met 0 console-errors. Een ingelogde Settings/FitnessSyncer-smoke is niet uitgevoerd omdat Google accountkeuze vereiste en geen testcredentials in de repo staan.
- Volledige providerconsent en tokenexchange zijn niet uitgevoerd; geldige FitnessSyncer Client ID en Client Secret ontbreken nog.

## 2026-07-20 BugScan reward release 2.10.15

- `npm.cmd run test:real-bug-scan`: 51/51 tests geslaagd.
- `npm.cmd run typecheck`: geslaagd.
- Regressietest bevestigt dat elke unieke scan één extra owned kopie vereist en dat een herhaald event niet dubbel verwerkt wordt.
- Fast Android releasebuild: `BUILD SUCCESSFUL in 1m 10s`.
- APK: `dist/BugBaas-2.10.15.apk`, 100.060.605 bytes, package `nl.cimpro.bugbaas`, versionCode `195`, versionName `2.10.15`.
- APK SHA-256: `00E0355F8A2F8FDF68A9A536FE5888069435A853F6CD7598B16F9FC9B009A8FF`.
- APK-certificaat SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, gelijk aan de vastgelegde 2.10.14 release.
- Vercel productie: deployment `dpl_69KTPZko2Eyx1fsFLuwCUD9vquPv`, status `READY`.
- `https://bugbaas.vercel.app/`: HTTP 200; bundle `AppEntry-167d3edc9a0761bf18ba854c17f600d5.js`: HTTP 200, 2.590.880 bytes.
- `/api/real-bug-identify` CORS preflight: HTTP 204; serverless route actief.
- Geen fysieke Android-installatietest uitgevoerd. GitHub CLI was niet ingelogd; geen nieuwe GitHub Release gepubliceerd.

## 2026-07-20 BugScan release 2.10.14

- `npx tsc --noEmit --pretty false`: geslaagd.
- `npm run test:real-bug-scan`: 50/50 tests geslaagd.
- Regressies afgedekt: oude API-response zonder `remainingScans`, `scientificName: null`, bestaande BugDex-unlock met `count: 0`, serverquota, duplicate scan-ID, cameraresultaat en structured OpenAI-output.
- OpenAI `max_output_tokens` teruggezet van 300 naar 1200; 300 veroorzaakte productie-502's en onvolledige structured output.
- Vercel productie `dpl_CwA5yrGgdPqZ4k2J5Ca3XT89ivwQ`: `READY`; vaste alias `https://bugbaas.vercel.app` wijst naar de deployment.
- Productiebundle: `AppEntry-a08d0f5d881a01555d031e0f68c8d4a8.js`; root HTTP 200.
- `/api/real-bug-identify` geeft zonder Firebase-login correct HTTP 401 met de BugBaas JSON-fout, dus de serverless route is actief en niet naar `index.html` herschreven.
- Firestore rules voor serverquota en daily progress zijn succesvol gepubliceerd naar `thomascimpro-6266f`.
- Volledige Android releasebuild: `BUILD SUCCESSFUL in 2m 31s`.
- APK: `android/app/build/outputs/apk/release/app-release.apk`, circa 84 MB, package `nl.cimpro.bugbaas`, versionCode `194`, versionName `2.10.14`.
- APK SHA-256: `572f062adc9df8cda12ddeeabe89635009d96fbf856f015434e1f2803f5a0f79`.
- `apksigner verify --verbose --print-certs`: APK Signature Scheme v2 geslaagd; bestaand Android debugcertificaat SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- Echte OpenAI-smoketest via lokale secretfile is niet uitgevoerd omdat de tool veiligheidscontrole secret-injectie blokkeerde. Geen fysieke Android-installatietest uitgevoerd.

## 2026-07-20 daily rewards, buddy persistence and Tower jump hotfix

- `npm run typecheck`: geslaagd.
- Gerichte app-tests: 12/12 geslaagd voor directe daily rewardpresentatie, Buddy-savevolgorde, hidden/normal-rankscheiding en Tower-pressure/jumhoogte/MEGA-boost.
- FitnessSyncer Functions-tests: 7/7 geslaagd, inclusief exacte veilige melding van ontbrekende configuratievelden.
- Alle vijf FitnessSyncer Functions zijn succesvol bijgewerkt op Firebase-project `thomascimpro-6266f`.
- Expo web export naar `dist-vercel-release`: geslaagd; bundle `AppEntry-a309d12e23b3a0b702e78ca3bf1dc4e3.js`, 2.532.601 bytes, SHA-256 `51a9d4cc41c866cec94f3aa69d5cb3f55e511ad7eb28511380446ff4cae1c934`.
- Vercel preview `dpl_2UbsWGRioqLGM7jPpu7Kxq1RDgvj`: `READY`; previewbundle was byte- en hash-identiek aan de lokale export.
- Vercel productie `dpl_HcJSahLW4Fg4cxBLfQx14mZ6JAtS`: `READY`; `bugbaas.vercel.app` serveert dezelfde bundle en SHA-256.
- Een per ongeluk aangemaakt tijdelijk Vercel-project `dist-vercel-release` is volledig verwijderd; productie blijft gekoppeld aan project `bugbaas`.
- Remote Functions missen nog `FITNESSSYNCER_CLIENT_ID`, `FITNESSSYNCER_CLIENT_SECRET` en `FITNESSSYNCER_TOKEN_KEY`; echte providerlogin kon daarom niet end-to-end worden uitgevoerd.
- Geen APK-build of APK-publicatie uitgevoerd; bestaande tracked APK-binaries tonen geen worktree-wijzigingen.

## 2026-07-20 Vercel ranks, sounds, ranked permissions and Tower balance

- `npm run typecheck`: geslaagd.
- Gerichte Node-tests: 10/10 geslaagd voor volledige ranked-mode rulesdekking, actuele eigen ranks, Tower-zijwaartse spreiding/missing-step-gaps en websound-profielen/Pressable-detectie.
- FitnessSyncer Functions-tests: 6/6 geslaagd voor afstandsfiltering, stappen-samenvattingen, bron-deduplicatie, stabiele import-id's en token-expiry.
- Firestore rules compileerden en zijn gedeployed naar `thomascimpro-6266f`; `bubble_swarm` staat in zowel `validDuelMode` als `validArcadeMode`.
- Functions-deploy analyseerde de huidige bron en sloeg alle vijf FitnessSyncer Functions over als identiek aan de al gedeployde versie.
- Remote Functions bevatten geen `FITNESSSYNCER_CLIENT_ID`, `FITNESSSYNCER_CLIENT_SECRET` of `FITNESSSYNCER_TOKEN_KEY`; echte providerlogin is daarom nog niet uitvoerbaar.
- Expo web export naar `dist-vercel-release`: geslaagd; bundle `AppEntry-0bea8ee78d9ca4fe36230482d686fcf9.js`, 2.531.787 bytes, SHA-256 `a1a26a548b1f9171bde5cc9ff55de3ec42400bb6099cd732a76405b5e1457c7b`.
- Vercel preview `dpl_Cu5zXPMWMdVAVMch8VTCfFEcUhGM`: `READY`; previewbundle is byte- en hash-identiek aan de lokale export.
- Vercel productie `dpl_HeJ27nWsLoiAHKxsNXTyk9omozXM`: `READY`; `bugbaas.vercel.app` serveert dezelfde bundle en SHA-256.
- Windows Chrome-headless startte wel, maar gaf binnen DevSpace geen capturebare DOM terug; ingelogde visuele ranked/FitnessSyncer-smoke is daarom niet als uitgevoerd gemarkeerd.
- `android/gradlew.bat :app:processDebugResources --console=plain`: `BUILD SUCCESSFUL`; versie 2.10.12 en de `bugbaas://settings` deep link verwerken correct als Android resources.
- Geen APK-build of APK-publicatie uitgevoerd; bestaande tracked APK-bestanden tonen geen worktree-wijzigingen.

## 2026-07-19 web auth, rewards and Tower hold hotfix

- `npm run typecheck`: passed.
- Isolated Expo web export from commit `92281d5`: passed; bundle `AppEntry-6a276fec375b9198824d7e903353bd97.js`.
- Firestore rules compiled and deployed successfully to `thomascimpro-6266f`.
- Vercel production `dpl_AgBRAgZyq9ysDpj7osQEEDs9KWZF`: `READY`; `https://bugbaas.vercel.app` points to this artifact.
- In-app Browser with hidden account `Luna Review`: right Tower control is 230 x 614 px with `touch-action: none` and `user-select: none`.
- Raw pointer test: after 4.2 seconds held, run remained active at `SPIN READY` / 100% and no Copy UI appeared; after `pointerup`, charge reset to 0% and jump state resumed.
- Google popup code path is typechecked and present in the deployed bundle; full Google account selection was not completed because the Browser profile was already authenticated as the hidden test account.

## 2026-07-19 web arcade interaction hotfix

- `npx tsc --noEmit`: geslaagd.
- Expo web export: geslaagd; bundle `AppEntry-797c3719c1e537f1fe3ebe583e0450f4.js`.
- Vercel productie `dpl_9pKLUM1DmuaC1oF9HodtUdekqtRW`: `READY`, alias actief en root HTTP 200.
- Lokale en productie-bundle hebben dezelfde SHA-256 `3F2DAF60EA624BE68CCD0FA56C93E3EB69A3E6A3FDC5CA1E1D1F1600DEA2E153`.
- Chrome mobiele viewport 460x844 met hidden testaccount: Tower toont vrij zwevende pickups; fullscreen `user-select` is `none`; Train-X keert direct terug naar Arena.
- Bubble Swarm toont zichtbare B/F-powerups in het grid. Na twee drukstappen kwamen alle acht vastgelegde bestaande kleurvolgordes exact en ongewijzigd twee rijen lager terug.
- Web Runner swipe omhoog activeerde direct `Jump` en `JUMP`; Train-X werkte tijdens de actieve run.
- Nest Defense toont veld en drie controlrijen zonder overlap; screenshotcontrole bevestigde dat het control deck volledig onder het speelveld staat.
- Geen app-consolefouten gezien; alleen bestaande Chrome-extensionmeldingen buiten `https://bugbaas.vercel.app`.
- Android/APK niet gebouwd of fysiek getest omdat deze hotfix uitsluitend webinteractie en layout wijzigt.

## 2026-07-19 regression repair release 2.10.10

- `npx tsc --noEmit`: geslaagd.
- Broninvarianten: alle vier categorieen permanent aanwezig; historische unlockstatistieken gebruikt; alle vijf ranked minigames blokkeren voortijdig afsluiten.
- Expo web export: geslaagd; definitieve bundle `AppEntry-65440d3d21c2f7ce965bce03065e4fe5.js`.
- Vercel productie `dpl_DQfZuBFLVCeVwbHicBKEXaaVCFRp`: `READY`; root HTTP 200 en alias `https://bugbaas.vercel.app` actief.
- Lokale en productie-bundle hebben dezelfde SHA-256 `14138FC36D7B8360130FB304D7AAB9364B2950EBC86342D269A90E3D97001D19`.
- In-app Browser met hidden account `Luna Review`: 2.10.10-changelog zichtbaar; Bug, Tip, Trick en Idee gelijktijdig zichtbaar; Trick-selectie past formulierlabels en urgentieveld correct aan.
- Browser Nest Defense: oefenen toont afsluiten; taplaag is exact 460 x 618,8 px en vult het speelveld; handmatige vijandtap activeert aanvalscooldown en `HIT`-feedback. Productieconsole: nul errors.
- `NODE_ENV=production npm run apk:release`: geslaagd na het stoppen van twee achtergebleven Gradle-daemons; eerste resource-cleanup-poging was daardoor geblokkeerd.
- APK: `dist/BugBaas-2.10.10.apk`, 83.883.289 bytes, package `nl.cimpro.bugbaas`, versionCode `190`, versionName `2.10.10`, ABI arm64-v8a.
- `apksigner verify --verbose --print-certs`: APK Signature Scheme v2 geslaagd; bestaand Android debugcertificaat SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- APK SHA-256: `E0640C65811A59462BB83D7EF9E660C16817ADC8EB05878D494CF513BB272A56`.
- GitHub latest-release API: `v2.10.10`, naam `BugBaas 2.10.10`, APK-asset aanwezig met exact 83.883.289 bytes.
- `adb devices`: geen aangesloten toestel; fysieke install-, performance- en touch-feeltest niet uitgevoerd.

## 2026-07-19 arcade survival release 2.10.9

- `npx tsc --noEmit`: geslaagd.
- `git diff --check`: geslaagd; alleen bestaande LF/CRLF-waarschuwingen.
- Expo web export: geslaagd; definitieve bundle `AppEntry-17609851333759e41258b7620158b6cf.js`.
- Vercel productie `dpl_FJntL59LsTuVeQK5nJ91SDsWG94p`: `READY` en gekoppeld aan `https://bugbaas.vercel.app`.
- Productie-root en lokale export hebben dezelfde SHA-256 `1F70B10CE139E0CA7E93E6470D5D6C5CF1C082200F6AEFEFD89DE2D8D032ECAA`; productie- en lokale JS-bundle zijn beide 2.512.954 bytes met SHA-256 `18C353FB2A17DDDC08A47F9230FC9F430D7E20E3B75E948F0344475132E1335D`.
- In-app Browser met hidden account `Luna Review`: Bug Glide accepteert taps links van de lijn terwijl het karakter rechts van de lijn stopt.
- Browser Bug Tower: vaste salto-uitleg, coin op floor 3 en eerste zeldzame boost rond floor 8 zichtbaar; idle run eindigde live na circa 50 seconden.
- Browser Bubble Swarm: bubbles sluiten zonder lege gridruimte aan; projectile is halverwege het veld zichtbaar en landt daarna in het grid; idle run eindigde live na circa 55 seconden.
- Deterministische powerupchecks: Bubble Swarm-intervallen 7-10 schoten; Bug Tower-boostintervallen 8-14 floors.
- `NODE_ENV=production npm run apk:release`: geslaagd na het stoppen van een achtergebleven Gradle-daemon die de eerste Windows-resource-optimalisatie lockte.
- APK: `dist/BugBaas-2.10.9.apk`, 83.882.237 bytes, package `nl.cimpro.bugbaas`, versionCode `189`, versionName `2.10.9`, ABI arm64-v8a.
- `apksigner verify --verbose --print-certs`: APK Signature Scheme v2 geslaagd; certificaat SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c` (bestaand Android debugcertificaat).
- APK SHA-256: `91DB42ABE5C39F601BE5E61EA103C6A5E79806BE698A358B37A175392923E54D`.
- GitHub latest-release API: `v2.10.9`, naam `BugBaas 2.10.9`, APK-asset aanwezig met exact 83.882.237 bytes en download-URL voor `BugBaas-2.10.9.apk`.
- `adb devices -l`: geen aangesloten toestel; fysieke install-, performance- en touch-feeltest niet uitgevoerd.
- De circa 90-secondenervaring voor een goede speler is als balance-doel gekalibreerd, maar vereist spelers-telemetrie of een fysieke playtest om statistisch te bevestigen.

## 2026-07-19 arcade repair release 2.10.8

- `npm.cmd run typecheck`: geslaagd na alle gameplay- en practice-wijzigingen.
- `npx.cmd expo export --platform web`: geslaagd; definitieve bundle `AppEntry-6ace068ca0fd86bc2d369230b456105e.js`.
- Vercel preview `dpl_96ZF2PCNxesvAmLGaHqGC2AssDpT`: root en exacte bundle HTTP 200; bundlelengte 2.507.091 bytes en ETag komt overeen met de exporthash.
- Vercel productie `dpl_2Zz1LbmkbBig1V5piHiVR2ocrzvj`: `READY`; `bugbaas.vercel.app` serveert de definitieve bundle met HTTP 200.
- Chrome hidden-account smoke: Arena toont Start en Train voor alle zes modes; Bug Tower toont twee volledige touchzones, trede-pickups en fullscreen mobiele shell.
- Chrome Bubble Swarm smoke: Luna-stretchbug gereproduceerd, hersteld, herdeployd en opnieuw getest; ronde bubbles, volledige richtlijn, zichtbaar tussenpunt en aansluitende gridlanding bevestigd.
- In-app Browser smoke op 390x844 met hidden account `Luna Review`: 2.10.8-changelogpopup, mobiele shell en Start/Train voor alle modes bevestigd.
- `./android/gradlew.bat -p android :app:assembleRelease`: geslaagd na de definitieve Bubble Swarm-fix.
- APK: `dist/BugBaas-2.10.8.apk`, 83.876.785 bytes, package `nl.cimpro.bugbaas`, versionCode `188`, versionName `2.10.8`, targetSdk 36, ABI arm64-v8a.
- APK-certificaat SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`; gelijk aan de bestaande install-base.
- APK SHA-256: `D4D73C51F02E487BFDB59C1C7D744025897592ED4E6743D581ED51C66156D14A`.
- GitHub latest-release API: `v2.10.8`, naam `BugBaas 2.10.8`, APK-asset aanwezig met exact 83.876.785 bytes.
- `adb devices`: geen aangesloten toestel; fysieke install- en touch-feeltest niet uitgevoerd.

## 2026-07-18 web shell and arcade release candidate

- `npm.cmd run typecheck`: geslaagd.
- `npx expo export --platform web`: geslaagd; 317 assets en webbundle gegenereerd in `dist`.
- `git diff --check`: geslaagd.
- Vercel preview `dpl_7NTp9fwjhzvDN6mMP7fsg4betyiC`: `READY`; root en de exacte hashed webbundle zijn via de protection-bypass gecontroleerd met HTTP 200.
- Vercel productie `dpl_2xQH3VU5RYbdncywnQEM6LeN53jH`: `READY` op `https://bugbaas.vercel.app`; root en `AppEntry-33a36722fe5e807a104036435bda6d87.js` geven HTTP 200 en de bundle-ETag komt overeen met de exporthash.
- Browser visual smoke: niet uitgevoerd; Browser/Chrome-plugin en lokale Chrome/Edge executable waren niet beschikbaar.
- Android device-smoke: nog niet uitgevoerd; pas na APK-build opnieuw gecontroleerd met `adb devices -l`.
- `npm.cmd run apk:fast`: geslaagd (exit 0).
- APK: `android/app/build/outputs/apk/release/app-release.apk`, 95.034.823 bytes, package `nl.cimpro.bugbaas`, versionCode `187`, versionName `2.10.7`.
- Kopie voor release: `dist/BugBaas-2.10.7.apk`.
- `apksigner verify --verbose --print-certs`: v2 geslaagd; certificaat SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- APK SHA-256: `324D5633E398AF57059FC623AB875176C33D766ED0CC34B28B6375EF7DF45F78`.
- `adb devices -l`: geen aangesloten apparaat; install/control-smoke blijft open.
- GitHub Release `v2.10.7` en APK-downloadasset: geslaagd.

## 2026-07-18 scheduled ranked rating decay

- Decaybodem verlaagd van 1000 naar de bestaande absolute Duel-ratingbodem van 100; startrating blijft 1000.
- Zes gerichte checks geslaagd: gisteren gespeeld, een gemiste dag, bestaand checkpoint, gedeeltelijke floor-cap, rating op de floor en Nederlandse zomertijdovergang.
- `node --check scripts/apply_ranked_decay.mjs`: geslaagd.
- YAML-parse van de nieuwe en bestaande scheduled workflow: geslaagd.
- `git diff --check` op script en workflow: geslaagd.
- Live Firestore dry-run: 31 gebruikers gelezen, 1 gebruiker geraakt, 5 totale rating-decay; geen writes uitgevoerd.
- De workflow gebruikt de bestaande `FIREBASE_SERVICE_ACCOUNT` secret en schrijft alleen na de dry-run.
- GitHub Actions push-dry-run op `master`: geslaagd in 33 seconden; service-accountauth en live Firestore-read werken.
- GitHub meldde alleen dat de gebruikte action-versies intern van Node.js 20 naar Node.js 24 worden geforceerd; dit blokkeerde de run niet.
- Zes sub-1000-grenschecks geslaagd: 1000 daalt, een rating onder 1000 daalt verder en de absolute bodem 100 wordt niet doorbroken.
- `npm.cmd run typecheck`: geslaagd na verlaging van de decaybodem.
- Actuele `master`-rules compileerden en zijn succesvol naar `thomascimpro-6266f` gedeployed.
- Live inhaalrun: 5 gebruikers bijgewerkt, 495 totale rating verwijderd; aansluitende dry-run vond 0 openstaande gevallen.
- Live verificatie: Niva-cross 880, Biertje 885, test2 895, Favo B 905 en Thomas Test 926; checkpoint voor alle vijf staat op `2026-07-17`.

## 2026-07-17 Bug Tower hold-release controls

- `npm run typecheck`: geslaagd.
- `git diff --check` voor `BugTowerGame.tsx`: geslaagd; alleen bestaande LF/CRLF-waarschuwing.
- Tilt-import, sensorstate en tap-to-jump handler zijn volledig uit Bug Tower verwijderd.
- Berekende spronggrenzen: korte druk 12,6%, medium 19,1%, spin-threshold 21,9% en maximale aanloop 28,9% schermhoogte.
- Spin vereist minimaal 72% snelheid en 58% jump charge.
- Berekende floor pressure zonder extra tijdstap: floor 8 = 0,36%, floor 100 = 1,30%, floor 200 = 2,30%, floor 300 = 3,30% en floor 400 = 4,30% schermhoogte per seconde.
- Platformrange schaalt van 56-62% breed / 9,8-12,2% gap bij de start naar 28-34% breed / 14,2-16,6% gap rond floor 400.
- Vier nieuwe imagegen-achtergronden visueel gecontroleerd: jungle/hive, magma/forge, sky temple en cosmic void hebben elk een vrije verticale gameplaybaan.
- `npm run apk:fast` met `NODE_ENV=production`: geslaagd (`BUILD SUCCESSFUL` in 59 seconden; 317 assets gebundeld).
- Fast-build APK: `android/app/build/outputs/apk/release/app-release.apk`, 95.124.931 bytes, package `nl.cimpro.bugbaas`, versionCode `180`, versionName `2.10.0`.
- APK v2-signing: geslaagd; certificaat SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- APK SHA-256: `601CDD975B07E2F241A0192969E6AB804D9755967EB338321C65D341C4BC4F0C`.
- Metro-generated Android resources bevatten alle vier nieuwe Bug Tower-zoneachtergronden.
- Device-smoke voor knoprelease, coyote jump, landing, spin en zonewissel is niet uitgevoerd; `adb devices -l` vond geen aangesloten apparaat.

## 2026-07-17 Bubble Swarm

- `npm run typecheck`: geslaagd.
- `git diff --check` op de Bubble Swarm-code, integratie, vertalingen en Firestore rules: geslaagd; alleen bestaande LF/CRLF-waarschuwingen.
- Firestore Emulator rules-compile op geisoleerde poort 8183: geslaagd; live Firebase is niet gewijzigd.
- Imagegen-assets visueel gecontroleerd: verticale vrije gameplaybaan en zes goed onderscheidbare insect-bubbles; de afzonderlijke ronde sprites behouden hun originele kleurdetails.
- `npm run apk:fast` met `NODE_ENV=production`: geslaagd in 152 seconden.
- Fast-build APK: `android/app/build/outputs/apk/release/app-release.apk`, 86.681.853 bytes, package `nl.cimpro.bugbaas`, versionCode `180`, versionName `2.10.0`, minSdk `26`, targetSdk `36`.
- APK v2-signing: geslaagd; certificaat SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- APK SHA-256: `9792FCEF716F567E80AA42992B81239A2F64BD8C80043244AAEDE5A9ECD84018`.
- Metro-generated Android resources bevatten de Bubble Swarm-achtergrond en alle zes gebruikte bubble-sprites.
- Device-smoke voor aimgevoel, collisionkeuze, pressure pacing en Firebase-write is niet uitgevoerd; `adb devices -l` vond geen aangesloten apparaat.
- De eerste emulatorpoging op standaardpoort 8080 werd geblokkeerd door een bestaand proces; de herhaling op 8183 compileerde succesvol.

## 2026-07-17 release 2.10.0

- Versiebronnen: package/Expo `2.10.0`, Android versionName `2.10.0`, versionCode `180`.
- `npm run typecheck`: geslaagd.
- `BUGBAAS_REQUIRE_ENV=1` en `NODE_ENV=production` normale `apk:release`: geslaagd (`BUILD SUCCESSFUL`, R8/minify en resource-optimalisatie actief).
- APK: `dist/BugBaas-2.10.0.apk`, 72.010.767 bytes.
- Metadata: package `nl.cimpro.bugbaas`, versionCode `180`, versionName `2.10.0`, minSdk `26`, targetSdk `36`.
- Signing: APK Signature Scheme v2 geldig, 1 signer, certificaat SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- APK SHA-256: `0473F1B67E305B41C959B14B491949DD6F574E6A607B8EAA4336FC4267829CFE`.
- Device-smoke: niet uitgevoerd.

## 2026-07-17 score tier expansion

- Vier nieuwe scoretiers toegevoegd boven de bestaande grens van 2.400 punten.
- Tien gerichte grenscontroles van 2.399 tot en met 40.000 punten: geslaagd.
- `npm.cmd run typecheck`: geslaagd.
- `git diff --check` op de tierbestanden: geslaagd; alleen bestaande LF/CRLF-waarschuwingen.

## 2026-07-17 Nest Defense tap coordinates

- Touches gebruiken nu `pageX/pageY` minus de via `measure` bepaalde speelveldoorsprong; geneste vijandcoördinaten worden niet meer als veldcoördinaten gelezen.
- Hitselectie en de visuele impact gebruiken hetzelfde gemeten veldformaat en dezelfde tappositie.
- Vijand-views hebben `pointerEvents="none"` en onderscheppen de bovenliggende speelveld-`Pressable` niet.
- `npm run typecheck`: geslaagd.
- Device-smoke is niet uitgevoerd.

## 2026-07-17 Bug Glide left control strip

- De blokkerende early return voor taps binnen de eerste 32 pixels is verwijderd; de bestaande links-van-de-bug physics geeft daar nu een impuls naar rechts.
- De visuele strook gebruikt `pointerEvents="none"`, waardoor de bovenliggende speelveld-`Pressable` de tap ontvangt.
- `npm run typecheck`: geslaagd.
- Device-smoke is niet uitgevoerd.

## 2026-07-17 ranked inactivity decay

- Zes gerichte berekeningen geslaagd: gisteren gespeeld, een gemiste dag, vier gemiste dagen, bestaand checkpoint, gedeeltelijke floor-cap en rating onder de floor.
- `npm run typecheck`: geslaagd.
- `git diff --check` op de vier featurebestanden: geslaagd; alleen bestaande LF/CRLF-waarschuwingen.
- Firestore rule toegevoegd die de eigen rating alleen laat dalen, nooit onder 1000, en alleen samen met een geldig dagcheckpoint.
- Firestore rules geladen door de lokale Firebase Emulator op poort 8181: geslaagd; er is niets gedeployed.
- Device-smoke is niet uitgevoerd.

## 2026-07-17 Bug Tower

- `npm.cmd run typecheck`: geslaagd na de definitieve sprite-schaalaanpassing.
- `git diff --check` op alle Bug Tower-code, Android-module, vertalingen en rules: geslaagd; alleen bestaande LF/CRLF-waarschuwingen.
- Imagegen-assets visueel gecontroleerd: spritesheet `1254x1254` met zes volledige poses en transparante achtergrond; torenachtergrond `1024x1536` met vrije centrale gameplaybaan.
- Chroma-key conversie: 1.185.974 volledig transparante en 10.269 gedeeltelijk transparante pixels; randen visueel schoon.
- React Native codegen voor AsyncStorage en Google Sign-In opnieuw gegenereerd: geslaagd.
- `npm.cmd run apk:fast` met `NODE_ENV=production`: geslaagd. De Kotlin-daemon meldde een bestaande incrementele Google Sign-In-cachefout en compileerde daarna succesvol via fallback.
- Fast-build APK: `android/app/build/outputs/apk/release/app-release.apk`, 76.117.648 bytes, opnieuw gebouwd op `2026-07-17 22:24:57` met ranked Firebase-context.
- `aapt2 dump badging`: package `nl.cimpro.bugbaas`, versionCode `179`, versionName `2.9.4`, minSdk `26`, targetSdk `36`.
- `aapt2 dump resources`: beide nieuwe resources aanwezig: `assets_minigames_bugtower_bugtowerbackground` en `assets_minigames_bugtower_bugtowerbeetle`.
- `apksigner verify --print-certs`: geslaagd; SHA-256 certificaat `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- Fast-build APK SHA-256: `0336D45D136B79D055E040FCB57BADF343BB5E0B709076B4F1513251C6C0AFBC`.
- Definitieve normale `assembleRelease --no-daemon`: geslaagd in 2m 7s, inclusief lint, R8/minify en resource-optimalisatie.
- Definitieve APK: `dist/BugBaas-2.9.4.apk`, 64.953.831 bytes.
- Definitieve APK metadata: package `nl.cimpro.bugbaas`, versionCode `179`, versionName `2.9.4`, minSdk `26`, targetSdk `36`.
- Definitieve APK signing: v2-verified, 1 signer, certificaat SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- Definitieve APK SHA-256: `9163ADF4CAC05E8D1C8BAA0FF4411E355B34E7EBC65BEBC625DBA74E6128A985`.
- Device-smoke voor kantelhoek, animatie, platformcollision en zichtbare Arena-flow: nog niet uitgevoerd; `adb devices` gaf geen aangesloten apparaat.
- Firestore rules bevatten lokaal `bug_tower`; deployment naar Firebase is niet uitgevoerd.
- Ranked recordcontrole: alleen de `bug_tower`-route stuurt `{ ranked: true, duelId }`; bestaande game-aanroepen blijven zonder context.
- Ranked rules-validatie vereist een bestaand Bug Tower-duel, de ingelogde gebruiker als deelnemer en een exact overeenkomende duelscore.
- Firestore Emulator rules-compile op een geisoleerde lokale poort: geslaagd; live Firebase is niet gewijzigd.
- De bestaande geminificeerde `dist/BugBaas-2.9.4.apk` dateert van voor deze ranked-recordwijziging en is in deze stap niet overschreven.

## 2026-07-17 local gameplay/reward changes

- `npm run typecheck`: geslaagd.
- Android manifest, buddywidget-layout en alle gebruikte buddy-state drawables: XML-parse geslaagd.
- Unlockhistorie: statberekening, setmedailles en badge-characters gebruiken dezelfde `bugdexUnlocks`-bron; legacy inventorydocs met count 0 worden naar unlockhistorie teruggevuld.
- Ranked guard: sluitknop verborgen en Android hardware-back geblokkeerd in alle drie ranked minigames tot de result-state.
- Android `assembleDebug`: niet afgerond; Gradle bleef tijdens bestaande React Native C++-codegen hangen met een padlengtewaarschuwing onder de workspace met spaties.
- Gerichte Kotlin/resourcebuild: gestart maar binnen de commandotime-out niet voorbij Expo-projectconfiguratie gekomen; native build is daarom nog niet als geslaagd aangemerkt.
- Device-smoke voor tabletoriëntatie, Nest Defense-taps en widgetafbeeldingen: nog niet uitgevoerd; geen device in deze taak gebruikt.

## 2.2.28 release

- `npm.cmd run typecheck`: geslaagd.
- `:app:assembleRelease`: geslaagd.
- APK gekopieerd naar `dist/CimPro-BugBaas-2.2.28.apk`.
- `aapt2 dump badging`: package `nl.cimpro.bugbaas`, versionCode `123`, versionName `2.2.28`, native-code `arm64-v8a`.
- `apksigner verify --print-certs`: geslaagd.
- Signing blijft legacy/debug SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- APK SHA256: `3378445bde042e2c13e4f28ae3161c12e43f2be6b8e93f7198d14dfdffa5ba2e`.

## 2.2.27 release

- `npm.cmd run typecheck`: geslaagd.
- `:app:assembleRelease`: geslaagd.
- APK gekopieerd naar `dist/CimPro-BugBaas-2.2.27.apk`.
- `aapt2 dump badging`: package `nl.cimpro.bugbaas`, versionCode `122`, versionName `2.2.27`, native-code `arm64-v8a`.
- `apksigner verify --print-certs`: geslaagd.
- Signing blijft legacy/debug SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- APK SHA256: `3152267b4da06e4df17ab9d402b3f8285b5153fe69040ba8c32bc00b10837c56`.

## 2.2.18 release

- `npm.cmd run typecheck`: geslaagd.
- `npx.cmd expo config --type public`: geslaagd; versie `2.2.18`, package `nl.cimpro.bugbaas`.
- `npx.cmd expo install --check`: geslaagd.
- Logic smoke-check: actieve duelkaart toont score in plaats van gevangen bugs, `score: 0` wordt hersteld vanuit gevangen bugs, dubbele passieve duelhelpers zijn verborgen, en app/rules gebruiken 56 duelbugs per gedeelde seed.
- `firebase.cmd deploy --only firestore:rules --project <firebase-project-id>`: geslaagd.
- `.\android\gradlew.bat -p android assembleRelease -PbugbaasLegacyDebugSigning=true`: geslaagd.
- APK gekopieerd naar `dist/CimPro-BugBaas-2.2.18.apk`.
- APK grootte: `44,651,178` bytes.
- `aapt2 dump badging`: package `nl.cimpro.bugbaas`, versionCode `113`, versionName `2.2.18`.
- `apksigner verify --print-certs`: geslaagd.
- Signing cert SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- APK SHA256: `FB112B971C4D9E5EB3B44A4584EC2B4680B27B0AB1AE8FA3F492FAB165A2955C`.
- `adb devices`: geen device aangesloten; install-smoke niet uitgevoerd.

## 2.2.17 release

- `npm.cmd run typecheck`: geslaagd.
- `npx.cmd expo config --type public`: geslaagd; versie `2.2.17`, package `nl.cimpro.bugbaas`.
- `npx.cmd expo install --check`: geslaagd.
- Logic smoke-check: 0-bugs duel retry conditie aanwezig en `actief duel loopt al` kaart opent het bestaande duel.
- `.\android\gradlew.bat -p android assembleRelease -PbugbaasLegacyDebugSigning=true`: geslaagd.
- APK gekopieerd naar `dist/CimPro-BugBaas-2.2.17.apk`.
- APK grootte: `44,650,170` bytes.
- `aapt2 dump badging`: package `nl.cimpro.bugbaas`, versionCode `112`, versionName `2.2.17`.
- `apksigner verify --print-certs`: geslaagd.
- Signing cert SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- APK SHA256: `95B03270C29AF85D2782EFC7C52EF96EC43A4758EEB95C3CE65515F546CFA386`.
- `adb devices`: geen device aangesloten; install-smoke niet uitgevoerd.

## 2.2.16 release

- `npm.cmd run typecheck`: geslaagd.
- `npx.cmd expo config --type public`: geslaagd; versie `2.2.16`, package `nl.cimpro.bugbaas`.
- `npx.cmd expo install --check`: geslaagd.
- Logic smoke-check: helper attack labels in Duel/BugDex, waiting-result ack met Arena-overview, trade/upgrade workshopkaart als enige toggle, weekly 7.5 km en geen screenshot weekly template aanwezig.
- `.\android\gradlew.bat -p android assembleRelease -PbugbaasLegacyDebugSigning=true`: geslaagd.
- APK gekopieerd naar `dist/CimPro-BugBaas-2.2.16.apk`.
- APK grootte: `44,650,094` bytes.
- `aapt2 dump badging`: package `nl.cimpro.bugbaas`, versionCode `111`, versionName `2.2.16`.
- `apksigner verify --print-certs`: geslaagd.
- Signing cert SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- APK SHA256: `D34BDD811EEF27C2655F2DE357FC398868C4607AD3A2E6830CF108D12DF697D5`.
- `adb devices`: geen device aangesloten; install-smoke niet uitgevoerd.

## 2.2.15 release

- `npm.cmd run typecheck`: geslaagd.
- `npx.cmd expo config --type public`: geslaagd; versie `2.2.15`, package `nl.cimpro.bugbaas`.
- `npx.cmd expo install --check`: geslaagd.
- Logic smoke-check: 48 duel bugs in rules, pending preplay submit, duelRewardEvents, solo progress Firestore rules, retry UI, auto-resubmit en legacy wave migratie aanwezig.
- `firebase.cmd deploy --only firestore:rules --project <firebase-project-id>`: geslaagd.
- `.\android\gradlew.bat -p android :app:clean :app:assembleRelease --no-daemon --console=plain`: geslaagd.
- APK gekopieerd naar `dist/CimPro-BugBaas-2.2.15.apk`.
- APK grootte: `44,647,974` bytes.
- `aapt2 dump badging`: package `nl.cimpro.bugbaas`, versionCode `110`, versionName `2.2.15`.
- `apksigner verify --print-certs`: geslaagd.
- Signing cert SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- APK SHA256: `6DF6B09AACEDC72156EE3D2E152905B709D7EA6B6A3134E3E4BEF931DE4769B4`.
- `adb devices`: geen device aangesloten; install-smoke niet uitgevoerd.

## 2.2.14 release

- `npm.cmd run typecheck`: geslaagd.
- `npx.cmd expo config --type public`: geslaagd; versie `2.2.14`, package `nl.cimpro.bugbaas`.
- `npx.cmd expo install --check`: geslaagd.
- Logic smoke-check: duel XP constants, daily pair cap en solo powerup hooks aanwezig.
- `.\android\gradlew.bat -p android :app:clean :app:assembleRelease --no-daemon --console=plain`: geslaagd.
- APK gekopieerd naar `dist/CimPro-BugBaas-2.2.14.apk`.
- APK grootte: `44,644,930` bytes.
- `aapt2 dump badging`: package `nl.cimpro.bugbaas`, versionCode `109`, versionName `2.2.14`.
- `apksigner verify --print-certs`: geslaagd.
- Signing cert SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, gelijk aan `2.2.13`.
- APK SHA256: `DE3A475FDB2DFD7F7B9F12AB6AC9084D87576B114B70D7EEEB83A63373F4EB09`.
- `adb devices`: geen device aangesloten; install-smoke niet uitgevoerd.

## 2.2.4 release

- `npm.cmd run typecheck`: geslaagd.
- `.\android\gradlew.bat -p android :app:clean :app:assembleRelease --no-daemon --console=plain`: geslaagd.
- APK gekopieerd naar `dist/CimPro-BugBaas-2.2.4.apk`.
- APK grootte: `44,422,018` bytes.
- `aapt2 dump badging`: package `nl.cimpro.bugbaas`, versionCode `99`, versionName `2.2.4`.
- `apksigner verify --print-certs`: geslaagd.
- Signing cert SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- APK SHA256: `0623B590AB30DEFD947A9573ED0270E7FB75F798617DF540948BA5AE3D345BA8`.
- `adb devices`: geen device aangesloten; OnePlus-install niet uitgevoerd.

## 2.2.3 release

- `npm.cmd run typecheck`: geslaagd.
- `.\android\gradlew.bat -p android :app:clean :app:assembleRelease --no-daemon --console=plain`: geslaagd.
- APK gekopieerd naar `dist/CimPro-BugBaas-2.2.3.apk`.
- APK grootte: `44,419,406` bytes.
- `aapt2 dump badging`: package `nl.cimpro.bugbaas`, versionCode `98`, versionName `2.2.3`.
- `apksigner verify --print-certs`: geslaagd.
- Signing cert SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- APK SHA256: `3C87BB04B1E3D3F010067478940EE24971D2F82B7A5C3F8057B76CF53B0155B4`.
- `adb devices`: geen device aangesloten; OnePlus-install niet uitgevoerd.

## 2.2.2 release

- `npm.cmd run typecheck`: geslaagd.
- `.\android\gradlew.bat -p android :app:assembleRelease --no-daemon --console=plain`: geslaagd.
- APK gekopieerd naar `dist/CimPro-BugBaas-2.2.2.apk`.
- APK grootte: `40,233,921` bytes.
- `aapt2 dump badging`: package `nl.cimpro.bugbaas`, versionCode `97`, versionName `2.2.2`.
- `apksigner verify --print-certs`: geslaagd.
- Signing cert SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- APK SHA256: `A76817577E7EACDCB3543ABDE545150D539858B7A370DA56A2C5A8E45A24E78A`.
- Geen ADB-device aangesloten; OnePlus-install niet uitgevoerd.

## 2.2.1 APK optimization test

- `npm.cmd run typecheck`: geslaagd.
- `.\android\gradlew.bat -p android :app:clean :app:assembleRelease --no-daemon --console=plain`: geslaagd.
- APK voor optimalisatietest: `dist/CimPro-BugBaas-2.2.1-optimized-test.apk`.
- Grootte bestaande `2.2.1` APK: `54,923,077` bytes.
- Grootte geoptimaliseerde test-APK: `40,179,645` bytes.
- Besparing: `14,743,432` bytes, ongeveer `26.8%`.
- `aapt2 dump badging`: package `nl.cimpro.bugbaas`, versionCode `96`, versionName `2.2.1`.
- `apksigner verify --print-certs`: geslaagd.
- Signing cert SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- APK SHA256: `BE62088700DE015EFAA25271F32DF1B436976F3F1DDD972FDB79B678A65C65AD`.
- OnePlus-install niet uitgevoerd in deze optimalisatierun.

## 2.2.1 release

- `npm.cmd run typecheck`: geslaagd.
- `.\android\gradlew.bat -p android :app:assembleRelease --no-daemon --console=plain`: geslaagd.
- APK gekopieerd naar `dist/CimPro-BugBaas-2.2.1.apk`.
- `aapt2 dump badging`: package `nl.cimpro.bugbaas`, versionCode `96`, versionName `2.2.1`.
- `apksigner verify --print-certs`: geslaagd.
- Signing cert SHA-256 is gelijk aan `2.2.0`: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- APK SHA256: `90A32935737EE76AC36576C24C224744BEA593830AB54895383EF5472937B2B1`.
- Geen toestelinstall uitgevoerd in deze release-run.

Datum: 2026-06-02

## Gepland

- TypeScript-check.
- Expo start-check.
- Pixel 8 emulator smoke-test wanneer Android tooling beschikbaar is.
- Spark-plan dependency check.

## Resultaat

- `npm run typecheck`: geslaagd.
- `npx expo config --type public`: geslaagd.
- `npx expo install --check`: geslaagd.
- Pixel 8 AVD (`emulator-5554`, 1080x2400): geslaagd via Expo Go.
- Smoke-flow getest:
  - Login in demo-modus.
  - Nieuwe bug aangemaakt.
  - Home ververst punten na nieuwe bug.
  - Buglijst toont bug en filterstatussen.
  - Bugdetail toont beschrijving en reproduceerstappen.
  - Status naar `Gefixt` gezet; punten gingen van 10 naar 25.

## Opmerkingen

- Firebase zelf is niet live getest omdat config placeholders leeg zijn.
- Screenshotopslag gebruikt geen Storage; screenshot-thumbnail wordt in Firestore als data-URL opgeslagen.
- `npm install` meldt 11 moderate dependency vulnerabilities in transitive packages. Niet automatisch gefixt om breaking updates te vermijden.

## Spark-plan update

- Screenshotcompressie toegevoegd: max 640 px, JPEG `0.35`.
- Geen Cloud Functions, Cloud Storage of Blaze-only features toegevoegd.
- Firebase Spark-limieten gedocumenteerd in `FIREBASE_SPARK_PLAN.md`.
- Pixel 8 render-check na Spark-update: geslaagd.
- Gefilterde logcat-check op `FATAL`, `AndroidRuntime`, `ReactNativeJS.*Error`, `TransformError`: geen app-crash gevonden.
- HMR `app/duplicate-app` fout opgelost door bestaande Firebase app te hergebruiken met `getApps()`/`getApp()`.

## Insect UI update

- `npm run typecheck`: geslaagd na insect UI update.
- `npx expo install --check`: geslaagd na insect UI update.
- Pixel 8 render-check: geslaagd.
- Screenshotbewijs: `pixel8-insect-final.png`.
- Gefilterde logcat-check: geen app-crash gevonden.

## Tier update

- `npm run typecheck`: geslaagd na tier-implementatie.
- `npx expo install --check`: geslaagd na tier-implementatie.
- Pixel 8 render-check: geslaagd voor Home, Ranglijst en Profiel.
- Screenshotbewijs: `pixel8-tier-home-final.png`, `pixel8-tier-leaderboard-final.png`, `pixel8-tier-profile-final.png`.
- Gefilterde logcat-check: geen app-crash of React Native JS-fout gevonden.
- UI-fix na test: hero-insect volgt de huidige tier; lopende insecten blijven achter de content.

## Modern UI update

- `npm run typecheck`: geslaagd na modern UI update.
- `npx expo install --check`: geslaagd na modern UI update.
- Pixel 8 render-check: geslaagd voor Login, Home, Ranglijst en Profiel.
- Screenshotbewijs: `pixel8-modern-login.png`, `pixel8-modern-home.png`, `pixel8-modern-leaderboard.png`, `pixel8-modern-profile.png`.
- Gefilterde logcat-check: geen app-crash of React Native JS-fout gevonden.
- Demo-ranking gevuld met lokale voorbeeldspelers; Firebase-data wordt niet aangepast.

## Walking bugs update

- `npm run typecheck`: geslaagd na walking bug update.
- `npx expo install --check`: geslaagd na walking bug update.
- Pixel 8 render-check: geslaagd voor Home en Profiel.
- Screenshotbewijs: `pixel8-walking-bugs-home.png`, `pixel8-walking-bugs.png`.
- Gefilterde logcat-check na schone reproduce: geen app-crash of React Native JS-fout gevonden.
- UI-fix: bewegende bugs gebruiken nu zijaanzicht, lineaire horizontale beweging en poot-stapanimatie in plaats van schuine wobble-rotatie.

## Bottom navigation update

- `npm run typecheck`: geslaagd na bottom navigation update.
- `npx expo install --check`: geslaagd na bottom navigation update.
- Pixel 8 render-check: geslaagd voor Home, Bug melden en Ranglijst.
- Screenshotbewijs: `pixel8-bottomnav-home.png`, `pixel8-bottomnav-newbug.png`, `pixel8-bottomnav-leaderboard.png`.
- Gefilterde logcat-check na schone reproduce: geen app-crash of React Native JS-fout gevonden.
- UI-fix: vaste ondernavigatie toegevoegd voor Home, Bug melden en Ranglijst; Home heeft nu nieuws; Ranglijst toont status en badgechips per speler.

## Clean UI update

- `npm run typecheck`: geslaagd na clean UI update.
- `npx expo install --check`: geslaagd na clean UI update.
- Pixel 8 render-check: geslaagd voor Login, Home, Bug melden en Ranglijst.
- Screenshotbewijs: `pixel8-clean-login.png`, `pixel8-clean-home.png`, `pixel8-clean-newbug.png`, `pixel8-clean-leaderboard.png`.
- Gefilterde logcat-check: geen app-crash of React Native JS-fout gevonden.
- UI-fix: zichtbare demo/uitlegtekst verwijderd; schermen gebruiken kortere labels, plaatjes en functionele knoppen.

## Online-inspired modern UI update

- `npm run typecheck`: geslaagd na online-inspired modern UI update.
- `npx expo install --check`: geslaagd na online-inspired modern UI update.
- Pixel 8 render-check: geslaagd voor Login.
- Screenshotbewijs: `pixel8-modern2-login.png`, `pixel8-modern2-after-login.png`.
- Gefilterde logcat-check na schone check: geen app-crash of React Native JS-fout gevonden.
- Eerdere post-login blokkade was `Firebase: Error (auth/configuration-not-found)`; dit is opgelost in de Firebase live connection update hieronder.
- UI-fix: onderste navigatie heeft een prominente centrale meldknop; Home heeft compacte dashboardtegels, top-ranking preview en moderne donkere header; Ranglijstheader is visueel sterker.

## Firebase live connection update

- Firebase CLI: ingelogd als `thomascimpro@gmail.com`.
- Firebase project: `<firebase-project-id>` actief in `.firebaserc`.
- Firebase Android app: `<firebase-app-id>` gevonden via CLI.
- Firestore database: `(default)` bestaat als `STANDARD` / `FIRESTORE_NATIVE`.
- `firebase deploy --only firestore:rules --project <firebase-project-id>`: geslaagd.
- Auth REST signup met project API key: geslaagd.
- Firebase JS Auth signup: geslaagd.
- Firestore REST met Firebase ID-token:
  - `users` document create/read: HTTP 200.
  - `bugs` document create/update: HTTP 200.
- Live smoke-testdocumenten en Auth-testaccounts zijn na verificatie opgeruimd.
- `npm run typecheck`: geslaagd.
- `npx expo install --check`: geslaagd.
- App-fix: hardcoded loginwaarden verwijderd uit `LoginScreen`.
- Pixel 8: login-scherm rendert met lege velden; ADB-invoer was onbetrouwbaar door Expo Go/back-key gedrag, daarom is de live Firebase-koppeling via SDK/REST geverifieerd.

## Upvote update

- `npm run typecheck`: geslaagd na upvote update.
- `npx expo install --check`: geslaagd na upvote update.
- `firebase deploy --only firestore:rules --project <firebase-project-id>`: geslaagd; rules compileerden en zijn live.
- Firebase rules smoke-test met live Auth tokens:
  - bug create: HTTP 200.
  - upvote toevoegen door andere gebruiker: HTTP 200.
  - upvote verwijderen door dezelfde gebruiker: HTTP 200.
  - statusupdate door reporter: HTTP 200.
- Live smoke-testbug en Auth-testaccounts zijn na verificatie opgeruimd.
- UI-fix: bugkaart toont upvote-teller; bugdetail heeft een `Upvote` knop met toggle-status.
- Pixel 8 render-check na upvote update: geslaagd op schone Login na Expo Go reset.
- Screenshotbewijs: `pixel8-upvote-clean-login.png`.
- Gefilterde logcat-check: geen app-crash of React Native JS-fout gevonden; alleen `uiautomator` runtime-regels door de testtool.

## Walking bug splat update

- `npm run typecheck`: geslaagd na splat update.
- `npx expo install --check`: geslaagd na splat update.
- Pixel 8 render-check: geslaagd op Login.
- Screenshotbewijs: `pixel8-splat-render.png`.
- Gefilterde logcat-check: geen app-crash of React Native JS-fout gevonden.
- UI-fix: bewegende bugs hebben nu een eigen hitbox; tikken toont kort een splat-vlek en laat de bug daarna opnieuw lopen.

## Tier insect upgrade update

- Online asset check gedaan:
  - Kenney All-in-1 heeft veel CC0 assets, maar geen direct passende moderne insect-tier set gevonden.
  - Pixel Gnome Bugs Pack heeft insecticons, maar 16x16 pixel-art past minder goed bij de huidige moderne appstijl.
- Keuze: lokale schaalbare React Native insect-assets verbeterd in bestaande appstijl.
- Elke hogere tier gebruikt nu grotere `bugSize` en hogere `evolutionLevel`.
- Visuals: extra shell-details, aura, vleugels en kroon voor hogere tiers.
- `npm run typecheck`: geslaagd na tier insect upgrade.
- `npx expo install --check`: geslaagd na tier insect upgrade.
- Pixel 8 max-tier render-check: geslaagd op Home.
- Screenshotbewijs: `pixel8-tier-upgrade-home-final.png`.
- Gefilterde logcat-check: geen app-crash of React Native JS-fout gevonden.
- Tijdelijke max-tier testgebruiker is opgeruimd uit Firestore en Auth.

## Firebase final CLI setup

- Firebase CLI versie: `15.19.0`.
- Actief project: `<firebase-project-id>`.
- Android app aanwezig: `<firebase-app-id>`.
- Firestore database aanwezig: `(default)`, `STANDARD`, `FIRESTORE_NATIVE`.
- `firestore.indexes.json` toegevoegd en gekoppeld in `firebase.json`.
- `firebase deploy --only firestore --project <firebase-project-id>`: geslaagd.
- Live Firebase smoke-test met echte Auth tokens:
  - `users` create/read: HTTP 200.
  - `bugs` create/read: HTTP 200.
  - upvote update: HTTP 200.
  - reporter statusupdate: HTTP 200.
- Client-side delete werd terecht door rules geweigerd; cleanup is daarna met Firebase CLI gedaan.
- Smoke-test Auth accounts zijn verwijderd.
- `npm run typecheck`: geslaagd.
- `npx expo install --check`: geslaagd.
- Pixel 8 login-poging is niet representatief afgerond: Expo Go werd door Android low-memory killer gestopt, zonder React Native/Firebase stacktrace.

## Profile access update

- `npm run typecheck`: geslaagd na profieltoegang update.
- `npx expo install --check`: geslaagd na profieltoegang update.
- Home hero heeft nu een `Profiel` knop; profiel, logout, badges en tierdetail zijn bereikbaar.
- Pixel 8 render-check: geslaagd op Login.
- Screenshotbewijs: `pixel8-profile-access-login.png`.
- Gefilterde logcat-check: geen app-crash, React Native JS-fout, FirebaseError of `permission-denied` gevonden; emulator had wel algemene geheugenpressure voor andere apps.

## Pixel 8 memory restart and profile UI update

- Pixel 8 AVD koud herstart.
- 2048 MB AVD-RAM bleef te krap voor Expo Go met Play Store-image; `host.exp.exponent` werd door low-memory killer gestopt.
- Pixel 8 opnieuw gestart met `-memory 4096`; Expo Go bleef daarna actief.
- `npm run typecheck`: geslaagd na profiel UI update.
- `npx expo install --check`: geslaagd na profiel UI update.
- Profielscherm gemoderniseerd met hero, tier-insect, statistieken, statuskaart, badgechips en tierstage.
- Pixel 8 render-check: geslaagd op Login na RAM-herstart.
- Screenshotbewijs: `pixel8-after-ram-restart-profile-update.png`.
- Schone gefilterde logcat-check na herladen: geen app-crash, React Native JS-fout, FirebaseError, `permission-denied` of low-memory kill gevonden.

## Google login update

- `expo-auth-session` en `expo-web-browser` toegevoegd.
- Firebase Google Auth gekoppeld via `GoogleAuthProvider.credential()`.
- Firebase Android app `nl.cimpro.bugbaas` heeft lokale debug SHA-1:
  - `2F:2C:57:B3:01:24:97:19:79:AA:B3:A9:79:2B:92:C2:35:4C:90:37`.
- Android OAuth client toegevoegd:
  - `<google-oauth-client-id>`.
- Expo Go Firebase app `host.exp.exponent` is aangemaakt voor diagnosecontext, maar wordt niet gebruikt door de appconfig. SHA toevoegen faalde terecht met HTTP 409 omdat Expo Go package+cert al in een ander OAuth project bestaat.
- Pixel 8 Expo Go: Google-knop zichtbaar en opent `accounts.google.com`.
- Pixel 8 Expo Go volledige OAuth-login: geblokkeerd door Google `Error 400: invalid_request`; verwacht voor Expo Go. Test volledige login met dev/standalone Android build.
- `npm run typecheck`: geslaagd na Google-login update.
- `npx expo install --check`: geslaagd na Google-login update.
- Pixel 8 render-check: geslaagd op Login.
- Screenshotbewijs: `pixel8-google-login-final.png`.
- Gefilterde logcat-check: geen app-crash, TransformError, FirebaseError, `permission-denied` of low-memory kill gevonden.

## First APK release update

- Native Android project gegenereerd met `npx expo prebuild --platform android`.
- `assembleDebug`: geslaagd.
- APK signing SHA-1 van `android/app/debug.keystore` toegevoegd aan Firebase:
  - `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
- Android OAuth client voor deze APK:
  - `<google-android-client-id>`.
- `assembleRelease`: geslaagd met ingebakken JS bundle.
- APK gekopieerd naar `release/CimPro-BugBaas-0.1.0.apk`.
- GitHub Release aangemaakt:
  - `https://github.com/thomascimpro/cimpro-bugbaas/releases/tag/v0.1.0`.
- APK-grootte: circa 58 MB.
- `apksigner verify --print-certs`: geslaagd; SHA-1 matcht Firebase.
- Pixel 8 APK install: geslaagd.
- Pixel 8 standalone launch: geslaagd voor package `nl.cimpro.bugbaas`.
- Pixel 8 e-mail accountcreate via APK: geslaagd; Home laadde gedeelde Firebase-ranking.
- Screenshotbewijs:
  - `pixel8-apk-release-login.png`.
  - `pixel8-apk-release-home.png`.
- Gefilterde logcat-check: geen app-crash, React Native JS-fout, FirebaseError, `permission-denied` of low-memory kill gevonden.

## Bug form draft and screenshot update

- `npm run typecheck`: geslaagd.
- `npx expo install --check`: geslaagd.
- `Opslaan` blijft zichtbaar op `Bug melden` door extra scroll-bottom padding.
- Screenshotpreview heeft nu een `X` knop om de afbeelding te verwijderen.
- Bugmeldingsconcept wordt lokaal opgeslagen bij ingevulde velden of screenshot.
- Bij terugkomen op `Bug melden` verschijnt `Concept gevonden` met `Verder` en `Nieuw`.
- Pixel 8 standalone APK-check:
  - `release/CimPro-BugBaas-0.1.1.apk` geinstalleerd.
  - Standalone launch voor package `nl.cimpro.bugbaas`: geslaagd.
  - Concept met titel gemaakt.
  - Naar Home genavigeerd.
  - Terug naar `Meld` genavigeerd.
  - Prompt `Concept gevonden` verscheen.
  - `Verder` herstelde titel `DraftBug`.
- Screenshotbewijs:
  - `pixel8-v011-launch.png`.
  - `pixel8-v011-newbug.png`.
  - `pixel8-newbug-draft-restore.png`.
  - `pixel8-newbug-draft-applied.png`.
- Gefilterde logcat-check: geen app-crash, React Native JS-fout, FirebaseError, `permission-denied` of low-memory kill gevonden.

## Native Google login and app icon update

- Google-login omgezet van Expo AuthSession browserflow naar native `@react-native-google-signin/google-signin`.
- Oude `expo-auth-session` en `expo-web-browser` dependencies verwijderd.
- Nieuw app-icon gegenereerd met `imagegen` en gekoppeld aan Expo/Android launcher assets.
- `npm run typecheck`: geslaagd.
- `npx expo install --check`: geslaagd.
- `assembleRelease`: geslaagd.
- Pixel 8 APK install: geslaagd.
- Pixel 8 native Google-login: geslaagd; login kwam uit op Home.
- Gefilterde logcat-check: geen `invalid_request`, `DEVELOPER_ERROR`, app-crash, React Native JS-fout, FirebaseError of `permission-denied` gevonden.
- Screenshotbewijs:
  - `pixel8-google-native-final.png`.
  - `pixel8-app-icon-launch.png`.

## Bug save, shared upvote and comments update

- Firestore bug create gefixt: `screenshotDataUrl` wordt niet meer meegeschreven als die `undefined` is.
- Firestore rules gedeployed voor `bugs/{bugId}/comments`.
- Comments/reacties toegevoegd met bug-emoticons.
- Upvote-bonus toegevoegd aan ranglijstscore: `+3 pt` per upvote, afgeleid uit Firestore bugs.
- `npm run typecheck`: geslaagd.
- `npx expo install --check`: geslaagd.
- `firebase deploy --only firestore:rules`: geslaagd.
- `assembleRelease`: geslaagd.
- Pixel 8 twee-account flow:
  - Account A maakte bug zonder screenshot.
  - Account B zag de bug in de buglijst.
  - Account B upvotete de bug.
  - Account B plaatste commentaar met bug-emoticon.
  - Ranglijstscore van account A ging van `45` naar `48`.
- Gefilterde logcat-check: geen `Function setDoc`, `Unsupported field value`, FirebaseError, `permission-denied`, app-crash of React Native JS-fout gevonden.
- Screenshotbewijs:
  - `pixel8-bug-created-noscreenshot-2.png`.
  - `pixel8-account-b-buglist.png`.
  - `pixel8-account-b-upvote-comment.png`.
  - `pixel8-upvote-leaderboard.png`.

## BugDex source-sheet import - 2026-07-17

- Bronselectie: 45 duidelijke, unieke insecten uit `assets/bugdex/new17-17-2026`; een onduidelijk exemplaar is afgekeurd.
- Asset-audit: 45/45 bestanden zijn 512x512 RGBA, niet leeg of dubbel, hebben transparante hoeken en een geldige catalogus- en artwork-koppeling.
- `npm run typecheck`: geslaagd.
- `npm run apk:fast`: geslaagd (`BUILD SUCCESSFUL`, 274 taken).
- Release-APK: `android/app/build/outputs/apk/release/app-release.apk` (83.173.820 bytes).
- Device-smoke: niet uitgevoerd.
# 2026-07-19 Nest and FitnessSyncer release 2.10.11

- `npm run typecheck`: passed before release packaging.
- FitnessSyncer parser tests: 4 passed for accepted activities, rejected summary/manual data, idempotency IDs, and token expiry formats.
- Firebase Functions: all five endpoints active; unauthenticated status request returns HTTP 401.
- Runtime configuration is intentionally incomplete because no FitnessSyncer Client ID, Client Secret, or token encryption key is present.
- Vercel production `dpl_BMZtL6j5ZmsjkrZ5C4Gn7heqUSrL`: `READY`; alias `https://bugbaas.vercel.app` active.
- Production Browser with hidden account: 2.10.11 changelog visible; a real enemy at 64% field height produced immediate `HIT` feedback and the run stayed active; zero app console errors.
- `NODE_ENV=production npm run apk:release`: passed.
- APK: `dist/BugBaas-2.10.11.apk`, 83,890,957 bytes, package `nl.cimpro.bugbaas`, versionCode `191`, versionName `2.10.11`, minSdk 26, targetSdk 36.
- APK Signature Scheme v2 passed; existing debug certificate SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- APK SHA-256: `73201DD771063C62127F9ED284889DA18159DC82697D16C25E0624C965828DB3`.
- Local and production web bundle SHA-256 match: `0467CFA717D7F3154DDF2FDD347294DBA5E4E409B66860A59CD90EA809D32A62`.
- GitHub latest release: `v2.10.11`; APK asset present with exact size 83,890,957 bytes.
- `adb devices -l`: no connected device; physical install and native touch-feel remain unverified.

## 2026-07-21 BugBaas 3.0 visual world slice (localhost only)

- Removed the duplicate Daily Spotlight card; it added no distinct gameplay beyond existing daily missions.
- Generated and bundled two text-free BugBaas visual assets: Museum Gallery v2 and Expedition World v2.
- `node --experimental-strip-types --test src/services/bugProfessorService.test.ts src/services/photoQualityService.test.ts`: 4/4 passed.
- `npm run test:real-bug-scan`: 65/65 passed.
- `git diff --check`: passed.
- Expo web bundle request on `http://localhost:8085`: HTTP 200, 6,987,890 bytes; it includes the current Museum v2 and Expedition World screens.
- Authenticated browser/device interaction was not run in this slice; this is source/bundle proof only, not APK or production proof.

## 2026-07-21 3.0 Conservatory Path (localhost only)

- `firebase/functions/npm test`: 10/10 passed, including fixed field-milestone thresholds and malformed-count rejection.
- `node --experimental-strip-types --test src/services/bugProfessorService.test.ts src/services/photoQualityService.test.ts src/services/expeditionWorldProgress.test.ts`: 6/6 passed.
- `npm run test:real-bug-scan`: 65/65 passed.
- `git diff --check`: passed.
- Expo web bundle request on `http://localhost:8085`: HTTP 200, 7,004,748 bytes after the Museum, Expedition and milestone-reveal changes.
- No Vercel deployment, APK build or authenticated device test was performed. The 3.0 UI remains localhost-only.
- Firebase beta backend rollout was requested for only `recordVerifiedObservation`, `claimFieldMilestones` and Firestore rules. The CLI did not return a final summary before the local timeout, but the new `claimFieldMilestones` endpoint subsequently returned HTTP 401 without a token, proving that it is active and authentication-protected. An authenticated milestone claim still requires a test-account observation.

## 2026-07-21 Field Photo Stamps (localhost only)

- `node --experimental-strip-types --test src/services/bugProfessorService.test.ts src/services/fieldPhotoStampService.test.ts src/services/expeditionWorldProgress.test.ts`: 6/6 passed.
- `npm run test:real-bug-scan`: 65/65 passed.
- The two touched TSX screens transpiled successfully with the installed TypeScript compiler; `git diff --check` passed.
- The reveal is source-validated only. It still needs an authenticated field-note save on a device or browser to prove the live animation and private journal persistence.

## 2026-07-21 3.0 event completion (localhost UI)

- Functions unit suite: 16/16 passed, covering milestones, Team Hunt weekend/species safety and Release Boss eligibility.
- 3.0 service tests: 6/6 passed; BugScan regression suite: 65/65 passed.
- Expo web bundle on `http://localhost:8085`: HTTP 200, 7,068,514 bytes after all event routes and visuals were added.
- Firestore rules compiled and deployed. `recordVerifiedObservation` and `claimFieldMilestones` were updated; Team Hunt and Release Boss endpoints were created successfully.
- Unauthenticated endpoint checks: `teamHuntStatus`, `releaseBossStatus` and `claimReleaseBossReward` each returned HTTP 401, proving authentication is required.
- An authenticated end-to-end event contribution, reward claim and mobile animation remain the final manual beta checks. No Vercel or APK deployment was made.

## 2026-07-21 Conservatory visual refresh (localhost only)

- `git diff --check`: passed.
- Expo web bundle on `http://localhost:8085`: HTTP 200, 7,075,878 bytes after the shared-shell and all-screen visual refresh.
- Browser smoke before the refresh: login page rendered at 390x844 without visible overflow and with no console errors. Authenticated screen rendering remains a manual test-account check.
- No Vercel deployment, APK build, gameplay change or Firebase schema/rule change was made for this visual slice.

## 2026-07-21 3.0 browser regression pass (localhost only)

- Mobile browser test at 390x844 with the authenticated `test2` account: Expedition World, Conservatory Guardian status, BugDex, Museum and BugScan each rendered and navigated without console errors.
- Guardian status was read-only tested at 0/100 verified observations. No reward claim, Team Hunt contribution, photo upload or other Firebase write was submitted.
- Corrected the local beta identity from `2.10.19` to `3.0.0-beta.1` in `package.json` and `app.json`; the live bundle contains `BugBaas 3.0 beta`.
- Corrected startup resilience: if Firebase auth does not settle within eight seconds, the user is shown the normal login screen with an actionable message instead of an infinite loading spinner. Browser verification reached that login state with zero console errors.
- `git diff --check`: passed. Expo bundle: HTTP 200, 7,075,872 bytes.
- This remains a localhost beta result; no APK/Vercel release was made and a full authenticated photo-to-Firebase persistence test remains manual.

## 2026-07-22 v3 visual screen pass (localhost only)

- Audited all 16 screen modules. The discovery, collection, event and arena screens already use generated visual assets and/or native animation; reports and new-report now use the shared Field Operations hero.
- `HomeScreen.tsx`, `BugListScreen.tsx` and `NewBugScreen.tsx` transpile with 0 diagnostics; `git diff --check` passed.
- The browser tool could not attach to the ambient local tab in this session, so no new authenticated screenshots were captured. No claim, upload or Firebase write was submitted.

## 2026-07-22 Buddy and minigame visual polish (localhost only)

- `HomeScreen.tsx` and shared `ArcadeSquadAssist.tsx` transpile with 0 diagnostics; `git diff --check` passed.
- Buddy status and minigame squad jars receive native animated visual layers only. Input handlers, score/timer code, rewards, Firestore and game results were not changed.

## 2026-07-22 Daily Field Signal (localhost only)

- `dailyFieldSignalService.test.ts`: 2/2 passed for stable local-day selection and same-day matching verified notes.
- `HomeScreen.tsx` transpiles with 0 diagnostics; `git diff --check` passed.
- The Signal reads existing private observations only, adds no Firebase write, GPS, AI call, daily-mission reward or extra XP.

## 2026-07-23 Museum redesign (localhost only)

- `node --experimental-strip-types --test src/screens/MuseumScreenModel.test.ts`: 5/5 passed.
- `npm run typecheck`: passed.
- `git diff --check`: passed; only existing Windows LF/CRLF conversion warnings were printed.
- `npx expo export --platform web --output-dir .chatgpt/museum-preview`: passed; web bundle exported with the redesigned Museum and existing local artwork.
- `MuseumScreen.tsx` contains no `activeBugSquad`, `BugJarArt`, `Arena-reservaat` or old `slice(-3)` recent-selection path.
- Authenticated viewport screenshots at 360x800 and 412x915 remain manual visual checks.

## 2026-07-24 V3 World home and Buddy expeditions (localhost only)

- World/Buddy model and structure tests: 20/20 passed after final responsive cleanup.
- `npm run typecheck`: passed.
- `npx expo export --platform web --output-dir dist-world-home-check --clear`: passed; 992 modules bundled.
- Authenticated Playwright check with the existing `test2` session passed at 390x844 and 920x1180. At phone size the primary scan action ends at y=716 and the bottom navigation starts at y=756; the Today view no longer scrolls or overlaps the navigation.
- Daily and Weekly buttons opened the correct mission tab with the real 0/6 totals. Events and Map remained separate working tabs. The compact active-event card no longer repeats `Team Hunt` as kicker, title and status.
- The Buddy reward-ready sheet fitted within 438 px at phone size. Source/model tests verify that all five expeditions remain visible when selectable, while one active task blocks starting another.
- No reward was claimed and no scan, movement sync, Team Hunt contribution, location write or other Firebase write was submitted during browser QA.
- Localhost still logs the known `swarmSiegeStatus` CORS failure against the deployed Cloud Function; the screen handles it and this is separate from the World layout work.
- No Android device was connected, so native Buddy notification delivery remains unverified. No Vercel deployment, APK build or Firebase schema change was made.

## 2026-07-25 BugBaas 3.0 preview release

- `npm run typecheck`: passed.
- Expo web export to `output/visual-validation/dist`: passed.
- Firebase Functions `npm test`: 52/52 passed.
- Real Bug Scan client/server contract suites: 65/65 passed.
- Targeted Firestore ranked and movement rules: 3/3 passed.
- Firebase rules/index dry run: passed.
- All 15 selected BugBaas 3.0 Functions deployed successfully; the seven existing FitnessSyncer Functions were excluded.
- Exact-origin CORS preflights for `researchTargetStatus`, `swarmSiegeStatus`, `releaseBossStatus` and `recordVerifiedObservation`: 204 for both staged and fixed preview origins.
- Vercel deployment `dpl_3jp51KsDYq9aioxtWBQdrSw26C3q`: READY and promoted to `https://bugbaasv3.vercel.app`.
- Existing `test2` account login passed on the fixed preview. World, Scan, Play and Collection opened successfully.
- Authenticated status requests for Research, Swarm Siege and Release Boss returned 200 with zero browser console errors.
- Main document dimensions matched the viewport at 390x844 and 1280x720; no page-level scrolling or horizontal overflow was present.
- The preview bundle contains `thomascimpro-6266f` and does not contain the old `bugbaas-3` project ID.
- Vercel reported no preview runtime errors in the final 30-minute validation window.
- `bugbaas.vercel.app` still resolves to separate READY deployment `dpl_2Fw7GBpvw16jqyL9j3HNuzSdQVfC`; its HTML does not reference the 3.0 preview bundle.

## 2026-07-26 local premium and gameplay pass

- `npm.cmd run typecheck`: passed after the final report-sheet and World-scene changes.
- Firebase Functions `npm.cmd test`: 52/52 passed.
- Targeted navigation, endless arcade, BugDex catalog, duel season, reward presentation and Web Runner tests: 20/20 passed.
- Real Bug Scan client/server suites: 69/69 passed in this source pass.
- Expo web export to `dist-v3-current`: passed with 242 unique BugDex entries.
- Authenticated browser checks passed at 390x844, 768x1024 and 1440x900; document dimensions matched every viewport with no page-level overflow.
- The report sheet, Settings/FitnessSyncer dialog, Museum dialog, help tour, game picker and Bubble Swarm ready/running states were opened during browser QA.
- The five new BugDex species are source/catalog validated. They were not granted to `test2`, so locked-card art was not exposed by mutating user data.
- Localhost still receives CORS failures from the currently deployed older Research, Swarm and Release Boss Functions. The current source tests accept the intended preview origins; deployment remains deliberately pending.
- No Firebase rules, Functions, Vercel project, APK or live 2.10.20 deployment was changed.

## 2026-07-26 Google login repair

- Reproduced `Firebase: Error (auth/unauthorized-domain)` on `https://bugbaasv3.vercel.app`.
- Added only `bugbaasv3.vercel.app` to the existing Firebase Auth authorized-domain list.
- Browser retest reached the official Google account chooser using the existing OAuth client and Firebase handler.
- Existing `test2` email login passed on the same preview after the configuration change.

## 2026-07-26 responsive game and World correction

- `npm run typecheck`: passed.
- Targeted Play, World, duel workspace and endless-arcade tests: 26/26 passed.
- Expo web export to `dist-v3-current`: passed.
- Authenticated Chrome checks passed at 390x844, 768x1024 and 1440x900.
- Play, World, the game picker and Bubble Swarm ready/running states stayed within the viewport with no document overflow.
- Vercel deployment `dpl_FUJ4RbRBe8V8zL1Hi5sm8HUJaXsS`: READY and aliased to `https://bugbaasv3.vercel.app`.
- Authenticated alias recheck passed for World, Play and Bubble Swarm at 390x844; no full-page white World block was detected.

## 2026-07-26 complete local QA and European BugDex pass

- `npm run typecheck`: passed.
- All source, screen, navigation, progression, reward, scan and game tests: 265/265 passed.
- All Real Bug Scan server, API and Firebase Function tests: 95/95 passed.
- Final catalog, generated-art and localization subset: 14/14 passed.
- `npx expo export --platform web --output-dir dist-v3-current`: passed with 395 bundled assets.
- Authenticated browser dimensions for World, Scan, Play and Collection exactly matched 390x844, 768x1024 and 1440x900; no horizontal or document overflow was found.
- Browser console and page-error checks across all four main destinations returned zero errors.
- Collection rendered `5/249`; the seven European bumblebees resolve to localized catalog entries and transparent raster art.
- Bubble Swarm accepted a real drag shot and changed its safe-shot state. Web Runner started, scored, took damage and rendered the new three-lane tunnel. Tap Duel and its moving targets were opened in the same browser QA cycle; source tests cover the complete scoring path.
- Reproduced Firebase `auth/unauthorized-domain` for Google login on localhost. The login screen now shows a child-friendly explanation; authorized-domain configuration remains an external release step.
- No scan reward, mission reward, trade, Firebase deployment, Vercel deployment, APK publish or 2.10.20 live change was performed.

## 2026-07-26 BugBaas 3.0 production-alias QA

- Vercel deployment `dpl_AGrnxuJ1B2r9aosBUG7tYDixK3zk`: READY.
- `https://bugbaasv3.vercel.app`: HTTP 200 and assigned to the new deployment.
- Existing `test2` email login: passed.
- Google login button: opened the official Firebase/Google authentication popup without `auth/unauthorized-domain`.
- Authenticated World, Scan, Play and Collection navigation: passed at 390x844 and 1440x900.
- Collection rendered `6/249`; no document overflow was found on any main destination.
- Bubble Swarm production run started and a drag-to-shoot action changed safe shots from 5 to 4.
- `releaseBossStatus`, `swarmSiegeStatus` and `researchTargetStatus`: HTTP 200.
- Browser console errors: 0. Page errors: 0. Vercel runtime errors in the release window: 0.
- Firebase long-poll requests aborted during deliberate route changes only; no user-visible or console error resulted.
- No Firebase rule/Function deployment, APK publish or `bugbaas.vercel.app` change was made.

## 2026-07-28 FitnessSyncer repair

- `node --test firebase/functions/fitnessSyncerCore.test.js`: 10/10 passed.
- Regression tests confirm BugBaas 3.0 OAuth return URLs remain on approved v3 hosts.
- Regression tests confirm Activity type and kilometer field casing variants are parsed.
- Live OAuth/token exchange was not executed because that requires a configured personal FitnessSyncer account and deployed Function revision.

## 2026-07-29 Vlindervangst gameplay rework

- `npm run typecheck`: passed.
- Targeted game model, Arcade navigation, ranked wiring and unlock tests: 26/26 passed.
- 3D prototype structure and mechanic tests: 7/7 passed; `node --check` passed.
- Production web export to `dist-butterfly-catch-local`: passed and includes the 240,264-byte WebP key art.
- Localhost root, game HTML, game script and key art: HTTP 200.
- Headless Chrome at 390x844 completed a real focus-release capture: Atlasmot at 74% focus, `PERFECT`, +248 points; browser and page errors: 0.
- Physical-device gyroscope, haptics and native rendering remain for owner testing; no device claim is made from the localhost check.

## 2026-07-29 arcade-, Museum- en Daily-hotfix

- Gerichte arcade-, Museum-, Daily- en foreground-regressietests: 28/28 passed.
- `npm run typecheck`: passed.
- Productie-webexport naar `dist-butterfly-catch-local`: passed.
- Localhost root: HTTP 200.
- Gevoel van native controls en frame pacing blijft een fysieke-devicecontrole; er is geen APK of productiebackend gewijzigd.

## 2026-08-01 Dutch BugDex photo-candidate audit

- `node scripts/build_bugdex_nederland_photo_candidates.mjs`: passed; fetched six Dutch taxon groups and wrote 928 deduplicated candidates.
- Candidate diff: 828 missing specific cards, 97 exact catalog matches and 3 known alias reviews.
- Pilot PNG alpha/dimension check: 28/28 processed assets are 768x768 RGBA with alpha extrema `(0,255)`.
- Contact-sheet review: 28/28 pilot assets visually inspected; this is semantic pre-review evidence, not yet a production integration pass.
- Full typecheck, art-registry and runtime integration were intentionally not claimed because this turn created the inventory and plan only; no new catalog mappings were promoted.
- Operational asset-to-app plan file exists and its key gates, wave counts, checkpoints and Definition of Done were reviewed; no image was promoted by the plan-only change.

## 2026-08-01 BugBaas 3.0.6 production release

- `npm run typecheck`: passed.
- Real Bug Scan client/server suites: 30/30 + 43/43 passed; Bug Professor/reward subset: 7/7 passed.
- Source/structure suite: 122/122 passed; Firebase Functions: 74/74 passed; BugDex art validation: 1/1 passed.
- GPT-5 mini versus GPT-5.6 Luna benchmark on four previously reviewed player thumbnails: mini 0/4 exact at 17.7 s average; Luna 2/4 exact at 8.3 s average.
- Firestore rules compiled and deployed. `recordVerifiedObservation`, `listVerifiedObservations`, `claimMuseumRewards`, `researchTargetStatus`, `startResearchTarget`, `claimResearchEncounter`, `syncResearchProgress` and `claimSwarmSiegeReward` deployed successfully.
- Vercel deployment `6fVm7RyUihtJ1XwyCYcxBtQLAf8K`: READY and aliased to `https://bugbaas.vercel.app`; root and 3D route return 200, API preflight 204 and unauthenticated identify 401.
- WebKit mobile 390x844 loaded production with zero console errors. Vleugeljacht 3D started, rendered one canvas and showed the 100%-then-screen-tap net instruction without an app lock.
- Android `:app:assembleRelease`: successful. `dist/BugBaas-3.0.6.apk` is versionCode 315/versionName 3.0.6, SHA-256 `351DD7E0A66CBFC8E0DC563E9818CE989D9C61ADEAAFC7D43A8DE2EE0474BBB2` and signer SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- APK manifest contains Internet, camera, fine/coarse location, activity-recognition and notification permissions; the bundled Android code contains the production scan API/web-game URL.
- No Android device was connected, so camera/location permissions and real touch/audio performance still require a physical-device smoke test. The authenticated browser profile had expired; claim mutations were therefore verified through the server/core tests rather than by changing the test account in production.

## 2026-08-02 BugDex reward flow en eventstart

- `npm run typecheck`: passed.
- `node --test src/services/rewardFlow.structure.test.mjs firebase/functions/swarmSiegeCore.test.js`: 22/22 passed.
- Expo production web export: passed; 1,499 modules bundled successfully.
- `git diff --check`: passed; only existing line-ending conversion warnings were reported.
- No authenticated live claim, physical-device check, Vercel deploy or APK build was performed for this source-only change.

## 2026-08-02 BugBaas 3.0.7 production release

- TypeScript: passed. BugDex art/catalog/registry/category/tier suites: 11/11 passed voor 883 gekoppelde soorten en 366 nieuwe kaarten. Alle WebP-assets zijn RGBA met echte alpha en zonder randcontact.
- iPhone-audio, Android-3D-slot en route/ranked-rotatieherstel: 31/31 tests passed. Real Bug Scan client/server: 30/30 + 43/43 passed; Firebase-projectconfig: passed.
- Lokale en remote Expo-webexport: passed. Productiebundle `AppEntry-37da2aadce3be500f62c35d91469be8a.js`; de live bundle bevat iPhone WebAudio, routeherstel, ranked-duelherstel en de nieuwste soort `grijze-huisspin`.
- Vercel deployment `dpl_7Zh4YHVqtK94qTz8ArmtWG8xKsiG` is READY en gealiast naar `https://bugbaas.vercel.app`; root/3D geven 200 en unauthenticated BugScan geeft de verwachte 401-authguard.
- Firestore rules compileerden en zijn op project `thomascimpro-6266f` released; Firebase meldde dat de actuele 70%-ruleset al up-to-date was.
- Android assembleRelease: successful. `dist/BugBaas-3.0.7.apk` is versionCode 316/versionName 3.0.7, arm64-v8a, 157293992 bytes, SHA-256 `CF3F6CC8E6C56D5F168CFC9B1CD692151D8A3E541C1E86B7354CB61D433C211A` en legacy signer SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- De APK installeerde en startte op de Small Phone-emulator met het bestaande testaccount. PID en MainActivity bleven gelijk na rotatie en het crashbuffer bleef leeg. Camera-, locatie- en echte iPhone-geluidsperformance blijven fysieke-devicecontroles.
