# Status

## 2026-08-11 - BugBaas 3.0.13 BugScan-correctie uitgebracht

- De zoom/crop-analyse bewaart nu de originele fotoafmetingen en stuurt de volledige foto als afzonderlijke context mee. Oude clients zonder overzichtsfoto blijven ondersteund.
- Productie staat op Vercel-deployment `dpl_8TtZMv4PWtUfh2CZ9ESTJbFpkwBg` via `https://bugbaas.vercel.app` en `https://bugbaasv3.vercel.app`.
- Android 3.0.13 (`versionCode 322`) staat in `dist/BugBaas-3.0.13.apk`: 105.517.753 bytes, SHA-256 `90087B86E518323E5B8E48A1E9E13A520FCF535367E0A3724F337E76B5432F03`, met dezelfde v2-signer als eerdere releases.

## 2026-08-11 - BugBaas 3.0.12 netwerkhotfix uitgebracht

- Oorzaak van Android `Network request failed`: 3.0.11 bevatte door een redacted lokaal env-bestand letterlijk `[SENSITIVE]` als `realBugScanApiBaseUrl`.
- Productie staat na de scan-nauwkeurigheidshotfix op Vercel-deployment `dpl_3UcR73U5511T6z6TbayNNr4GUP66` via `https://bugbaas.vercel.app` en `https://bugbaasv3.vercel.app`.
- Een lage of onzekere eerste herkenning onder 80% wordt nu met high reasoning en een expliciete anatomiecheck verdiept voordat het resultaat naar de speler gaat.
- Android 3.0.12 (`versionCode 321`) bevat aantoonbaar `https://bugbaas.vercel.app`, Firebase `thomascimpro-6266f` en de vereiste Google-clients. APK: 105.517.109 bytes, SHA-256 `B5F9B41B6DF3CA71B7E364709524B4ED29D4D33EA0EB3D7AAD2F92A1D226D9DA`.
- GitHub-release: `https://github.com/thomascimpro/BugBaas/releases/tag/v3.0.12`.

## 2026-08-11 - BugBaas 3.0.11 uitgebracht

- BugScan-productie staat op Vercel-deployment `dpl_EKhEjX6xY848vDbijy7hEikFkCi1` via zowel `https://bugbaas.vercel.app` als `https://bugbaasv3.vercel.app`; de bestaande OpenAI-, receipt- en Firebase-envkoppelingen zijn behouden.
- Firebase Function `recordVerifiedObservation` is bijgewerkt op project `thomascimpro-6266f`, zodat gecontroleerde veldnotitietags server-side worden gevalideerd en opgeslagen.
- De dagelijkse ranked-decay en maandelijkse duelafsluiting draaien vanuit de actuele releasebranch. Nieuwe accounts en bestaande actieve accounts zonder eerdere decaydatum worden meegenomen.
- Android 3.0.11 (`versionCode 320`) staat in `dist/BugBaas-3.0.11.apk`: 105.517.113 bytes, SHA-256 `10204CE2DD48FE97FF91042AAB503D6ED09BD5B6F413EA902EA92B2CBA7B2DA8`, met dezelfde signer. Er was geen ADB-device voor een fysieke installatie.
- GitHub-release: `https://github.com/thomascimpro/BugBaas/releases/tag/v3.0.11`.

## 2026-08-10 - BugBaas 3.0.10 uitgebracht

- Verdiende BugDex-beloningen uit duel en daily blijven als afzonderlijke FIFO-items bestaan en verschijnen boven het afgeronde duelscherm: eerst vangen, daarna het bron-gelabelde `ontdekt`/`+1`-scherm.
- Scan van de week staat live op `voting` met exact drie echte foto's van drie verschillende spelers. Bij te weinig inzendingen wordt tot 52 weken en daarna in bestaande echte developer-reviewfoto's teruggekeken; namen blijven verborgen tot de winnaar bekend is.
- Collectie toont rechtsboven ontdekt/totaal en het percentage; historisch ontdekte soorten blijven meetellen nadat een exemplaar is gebruikt.
- Vercel-productie `dpl_2BKbmQbqnSprdvrLCAV9c5ooVpXh` staat READY op zowel `https://bugbaas.vercel.app` als `https://bugbaasv3.vercel.app`; OpenAI, scanreceipt en Firebase zijn als productie-env gekoppeld.
- Android 3.0.10 (`versionCode 319`) staat in `dist/BugBaas-3.0.10.apk`: 105.516.049 bytes, SHA-256 `1166709DD40FF5A073B156934836F622253FE639BF3CF57F24B6F723B57EF755`, met de bestaande signer. Er was geen ADB-device voor een fysieke installatie.
- GitHub-release `v3.0.10` is gepubliceerd op `https://github.com/thomascimpro/BugBaas/releases/tag/v3.0.10`; assetgrootte en SHA-256 zijn gelijk aan de lokaal gecontroleerde APK.

## 2026-08-10 - BugBaas 3.0.9 uitgebracht

- De actieve BugDex-release bevat exact **1000** unieke catalogusentries, **1000** WebP-runtimebestanden en **1000** artmappings. De ruwe generatie-PNG's worden niet meer naar Vercel gestuurd.
- Vercel-productie staat READY op `https://bugbaasv3.vercel.app`, deployment `dpl_3msAij2mJpy48RhAZxnyzdvMFSZA`. Hoofdapp, Vleugeljacht 3D, kaartservice en BugScan-CORS zijn live gecontroleerd.
- Firestore rules zijn uitgebracht op `thomascimpro-6266f`; alle **31/31** Firebase Functions staan ACTIVE. De vereiste OpenAI-, scanreceipt-, Firebase- en Google-envnamen zijn aanwezig zonder secrets in bron of releasebestanden.
- Android 3.0.9 (`versionCode 318`) staat in `dist/BugBaas-3.0.9.apk`: 105.515.637 bytes, SHA-256 `2B268F9104ECE50297919141B99A958FDC8913C87650DBB645DA9BD1ACF47BC4`, met dezelfde legacy signer.
- Web behoudt de lichte iPhone-Safari-geluidsroute en vrije Vleugeljacht 3D. Android behoudt het slot en opent `https://bugbaas.vercel.app`.
- Er was geen aangesloten ADB-apparaat; fysieke camera-, Health Connect- en installatiecontrole op een telefoon is daarom niet geclaimd.

## 2026-08-10 - Fullscreen BugScan-camera en nauwkeuriger beeldanalyse (niet uitgebracht)

- De native scan-camera opent schermvullend en biedt automatische/aan/uit-flits, continu scherpstellen, lamp, knijp- en knopzoom, een maximale 4:3-fotostand en op iPhone een lenswisselaar. Web blijft de volledige systeemcamera van de telefoon gebruiken.
- De originele foto blijft behouden tot de definitieve uitsnede. Alleen die uitsnede wordt eenmaal naar maximaal 2560 px verwerkt; payloadfallbacks worden opnieuw vanaf de originele foto gemaakt en de developer-thumbnail is verhoogd naar 640 px.
- BugScan gebruikt in bron `gpt-5.6-luna` met `max` reasoning en `detail: original`. De prompt mag een soort alleen noemen bij minimaal twee zichtbare diagnostische kenmerken en mag confidence niet kunstmatig boven de 70%-grens tillen.
- De BugDex-rewardketen is alleen-lezen gecontroleerd: bugrewards gaan eerst via foregroundvangst en daarna naar het bron-gelabelde ontdekt/+1-scherm; meerdere rewards en Android-widgetbugs blijven in volgorde gestapeld.
- Bekende analysegrens: die presentatiewachtrij leeft alleen in het appgeheugen. Geforceerd afsluiten midden in een reeks kan resterende schermen verbergen; een al uit de Android-widget gehaalde radarbug kan vóór de foregroundvangst zelfs nog zonder BugDex-toekenning verloren gaan. Dit is conform verzoek nog niet gewijzigd.
- Er is bewust nog geen Vercel- of APK-release uitgevoerd.

## 2026-08-10 - BugBaas 3.0.8 productiehotfix

- `https://bugbaas.vercel.app` staat op Vercel-deployment `dpl_EvdCQCvnJvgQSjSABbuBYyiXuAdf`; de vereiste OpenAI/Firebase-envnamen zijn aanwezig en het gedeelde scanreceipt-secret is veilig opnieuw gesynchroniseerd.
- Firebase Function `recordVerifiedObservation` is selectief bijgewerkt op project `thomascimpro-6266f`. Een geauthenticeerde productiescan is daarna met habitat, gedrag en privé-locatie als veldnotitie opgeslagen.
- Movement Radar telt zichtbare widgetbugs en nieuw verdiende loopbugs nu op en claimt beide groepen in één actie met exact dezelfde bug-IDs en aantallen.
- De 907 gekoppelde BugDex-WebP's blijven één-op-één aanwezig en zijn zonder achtergrondverlies geoptimaliseerd van ruim 100 MiB naar 42,0 MiB.
- Android 3.0.8 (`versionCode 317`) staat in `dist/BugBaas-3.0.8.apk`: 96.896.646 bytes, ruim 38% kleiner dan 3.0.7, met dezelfde legacy signer.

## Actueel BugDex-checkpoint 2026-08-10

- Nederlandse productiequeue: **483/610 klaar**; de actieve catalogus staat exact op **1000 unieke soortentries**.
- Laatste actieve toevoeging uit wave 479-486: Schildstipspanner, Voorjaarskortvleugelmot, Wormkruidhaantje, Zuidelijke groene schildwants en Zwarte heidelibel; alle vijf hebben afzonderlijk PASS. Roodpoothalmkruiper, Maskerspinnetje en poging 2 van Tengere grasjuffer zijn eveneens gegenereerd en gecontroleerd, maar recoverable buiten runtime gehouden om de catalogus exact op 1000 te stoppen.
- Wave 471-478: Vroege granietmot, Muisbeertje, *Phasia aurigera*, Zwarte speerkniptor, Zwartvlekgrasmot, Schijn-vierbandspanner, Noordse witsnuitlibel en Maanschietmot; alle acht hebben afzonderlijk PASS.
- Nieuwe laatste wave (463-470): Micaplatvoetje, Witkopmot, Ruitijger, Slanke kogelspin, Langspriet-langsprietje, *Phaonia signata*, Ringspikkelspanner en Stompvleugelgrasuil; alle acht hebben afzonderlijk PASS. Twee mogelijke dubbelen (`gewone-krabspin-misumena-vatia` en `gewone-doodgraver-nicrophorus-vespillo`) zijn vóór imagegen overgeslagen.
- Nieuwe laatste wave (455-462): Oranje maanmug, Slakrups, Muurzesoog, Variabele dwergschaduwwants, Weidevlekoog, Peper-en-zoutvlinder, Tweekleurige smalboktor en V-dwergspanner; alle acht hebben afzonderlijk PASS.
- De mogelijke alias `gewone-krabspin-misumena-vatia` is vóór imagegen overgeslagen omdat de bestaande Gewone krabspin al dezelfde genormaliseerde soortnaam heeft.
- De actieve catalogus staat na deze wave op 1000 unieke soortentries; de nieuwe kaarten zijn additief gekoppeld aan facts, sets, `bugArt`, transparante PNG en WebP.
- Nieuwe laatste wave (447-454): Loofboombladroller, Streepkokerbeertje, Zilveren groenuil, Plaatjesgalwesp, Variabele vierbandspanner, Viervlekbrandnetelsnuitkever, Paardenbloembladroller en Rode knopbladroller; alle acht hebben afzonderlijk PASS.
- Nieuwe laatste wave (439-446): Waterleliemot, Zwart soldaatje, Nunvlinder, Roodbaardroofvlieg, Sneeuwwitte vedermot, Schedeldrager, Zandroofvlieg en *Mimela junii*; alle acht hebben afzonderlijk PASS.
- Nieuwe laatste wave (431-438): Reebruine bladsnuitkever, Ringelrups, Witte grijsbandspanner, Zuringspanner, Tuinwolfspin, Zesvlekkige groefbij, Wollig Gitje en Rood weeskind; alle acht hebben afzonderlijk PASS. De Zesvlekkige groefbij en het Wollig Gitje gebruiken een tweede imagegen-poging met blauwe chroma voor schone transparante vleugels.
- Nieuwe laatste wave (423–430): Zwervende Pantserjuffer, Zigzagtijger, Kustsprinkhaan, Oranje kruidenmot, Vaal kokerbeertje, Witte halvemaanzwever, Zomersmaragd en Meidoornstippelmot; alle acht hebben afzonderlijk PASS. Zwervende Pantserjuffer, Zigzagtijger en Witte halvemaanzwever zijn op blauwe chroma opnieuw gegenereerd voor schone transparante vleugels.
- Vorige wave (415–422): Muurrouwzwever, Parelmoermot, Paardenkastanjemineermot, Viervlekglansmug, Moerassprinkhaan, Meidoornkielwants, Leverkleurige bladroller en Vloeivleklieveheersbeestje; alle acht hebben afzonderlijk PASS. Vier assets zijn op blauwe chroma opnieuw gegenereerd en met een strengere matte gecontroleerd om kleurfranje te verwijderen.
- Vorige wave (407–414): Sint-jacobsvlinder, Pendelzweefvlieg, Zuringrandwants, Zilverstreepgrasmot, Populierenpijlstaart, Variabel elfje, Roodvlekweekkever en Rotsheidenetwants; alle acht hebben afzonderlijk PASS. Zilverstreepgrasmot en Rotsheidenetwants zijn op een contrasterende blauwe chroma opnieuw gegenereerd om kleurfranje en gevulde lace-wingcellen te voorkomen.
- Vorige wave (399–406): Kleine heidehangmatspin, Kleine rouwvlieg, Kleine voorjaarsuil, Kleine zomervlinder, Koffieboonspin, Koolbladroller, Koperuil en Koraaljuffer; alle acht hebben afzonderlijk PASS. De eerste koraaljuffer-render is wegens een onduidelijke vleugelweergave afgekeurd; poging 2 met magenta chroma is gebruikt.
- Vorige wave (391–398): Kempense heidelibel, Kerkzesoog, Kervelgitje, Klaverspanner, Klein vliegend hert, Kleine boskogelspin, Kleine broeikasspin en Kleine dikkaak; alle acht hebben afzonderlijk PASS. De Kempense heidelibel is op magenta chroma opnieuw gegenereerd om de vier transparante vleugels te behouden.
- Vorige wave: Indische meelmot, Ingekeepte smalboktor, Julikever, Kaneelglasvleugelwants, Kaskaardespin, Kasspringspin, Kegelbijvlieg en Kegelspin; alle acht hebben afzonderlijk PASS. Een tijdelijke bronverwisseling tussen kaskaardespin en julikever is vóór promotie gecorrigeerd.
- Vorige wave: Gewone velduil, Gewone viltvlieg, Gewone vliegendoder, Gewone witvlakbladroller, Gewone zandwolfspin, Goudoogje, Graphomya maculata en Grijze huisspin; alle acht hebben afzonderlijk PASS.
- Vorige wave daarvoor: Gewone regendaas, Gewone renspin, gewone rietkever, Gewone schubsnipvlieg, Gewone snuitvlieg, Gewone spiegelmot, Gewone staartspin en gewone tandkaak; alle acht hebben afzonderlijk PASS.
- Deze waves voegden Platte wielwebspin, Weideschorpioenvlieg, Bruin blauwtje, Gewone stofuil, Volgeling, Groen zuringhaantje, Bruine huismot, Sint-jansvlinder, Smalle randwants, Puntbijvlieg, Wapendrager, Hulstvlieg, Gewone huisspin, Grote beer, Gewone tweevleugel, Zuringuil, Strekpoot, Brandnetelprachtwants, Bruine korenbout, Bosbijvlieg, Stro-uiltje, Mediterrane prachtblindwants, Berkensmalsnuit, Gewone spikkelspanner, Groene eikenbladroller, Gewone prachtwapenvlieg, Vroege glazenmaker, Kroosvlindertje, Menuetzweefvlieg, Rode smalbok, Meeldauwlieveheersbeestje, Vlekstipspanner, Knikkergalwesp, Gewone rookwants, Zwartkopvuurkever, Rozemarijngoudhaantje, Maartse vlieg, Zandhalmuiltje, Oranje wortelboorder en Kardinaalsmutsstippelmot toe.
- Nieuwe soorten zijn additief gekoppeld aan catalogus, facts, sets, `bugArt`, transparante PNG en WebP.
- Laatste afgeronde wave daarvoor: Lieveling, Bruine grijsbandspanner, Schorsvlieg en Tuinbladroller; alle vier hebben afzonderlijk PASS.
- Laatste afgeronde wave daarvoor: Miersikkelwants, Oedemera lurida, Bruine Snuituil en Bonte brandnetelmot; alle vier hebben afzonderlijk PASS.
- `npm.cmd run validate:bug-art`, `npm.cmd run typecheck` en `node --test scripts/bugDexNederlandPilot.test.mjs` zijn groen (3/3, typecheck, 4/4).

## 2026-08-01 Nederlandse BugDex-soortenwaves

- De actieve catalogus staat op 599 unieke entries, met 599 art-registry-mappings en 602 fysieke PNG/WebP-bestanden; alle nieuwe pilot-assets zijn 768×768 RGBA met alpha-extrema `(0, 255)`.
- De Nederlandse soortenwave bevat nu 82 geaccepteerde soortkaarten. Schorsmarpissa en drie foto-cut-outs uit Wave 3 zijn stijl-afgekeurd; Grove tuinslak en Ruwe pissebed zijn bewust buiten scope gehouden omdat het geen insecten/gevraagde spinachtigen zijn.
- De kandidaten-datagate is aangescherpt naar insecten plus spinachtigen: 610 productie-kandidaten (225 P0, 242 P1, 128 P2 en 13 handmatig) en 194 `out-of-scope-non-bug` records.
- Voortgang productiequeue: **82/610 klaar**; **4 style FAIL** wachten op een echte BugDex-3D-regeneratie, **2 alias-dubbelen** zijn overgeslagen en **528** productiekaarten zijn nog niet geaccepteerd/in-app.
- De afgeronde P0/P1-batches zijn met imagegen, chroma-key-alpha, soortreview, WebP-conversie en runtimekoppeling afgerond: `Asbij`, `Grijze zandbij`, `Gewone zijdebij`, `Gewone maskerbij`, `Glanzende houtmier`, `Franse veldwesp`, `Middelste wesp`, `Viervleklieveheersbeestje`, `Gewone doodgraver`, `Gewone kortschildkever`, `Bruine meelkever`, `Groene snuitkever`, `Gewone wespenboktor`, `Groene appelwants`, `Gewone daas`, `Oranje zandoogje`, `Kleine wintervlinder`, `Grote wintervlinder`, `Huiskrekel`, `Herfstspin`, `Herfsthangmatspin`, `Huiskogelspin`, `Gewone krabspin`, `Oosterse kakkerlak`, `Geelgerande waterroofkever`, `Doodskopzweefvlieg`, `Schaakbordlieveheersbeestje`, `Grauwe schildwants`, `Strontvlieg`, `Rode hooiwagen`, `Gewone meikever`, `Watersnuffel`, `Wespenspin`, `Roodpootschildwants`, `Blauwooggrasmot`, `Plakker`, `Bosmestkever`, `Citroenlieveheersbeestje`, `Grijze stipspanner`, `Paardenbloemspanner`, `Bladpootrandwants`, `Bessenschildwants`, `Gewone grasmot`, `Blauwe breedscheenjuffer` en `Zijdeglansbladsnuitkever` plus de eerdere soorten. De volgende records blijven `planned` tot hun eigen gates groen zijn.
- Gewone langpootmug is als nieuwe poging 2 opnieuw gekaderd; de eerste te kleine poging staat recoverable onder de wave-review. `npm run validate:bug-art`, `npm run typecheck`, de wave-regressietest, de BugScan-classificatiesuite, Expo web-export en `git diff --check` zijn groen. Er is geen APK gebouwd of deployment uitgevoerd.

## 2026-07-31 BugBaas 3.0.6 releasecandidate

- Versies zijn uitgelijnd op `3.0.6`; Android gebruikt `versionCode 315`.
- De volledige gevraagde keten staat in bron: ranked fullscreen, Bug Defence-pariteit, onderzoekstouch, automatische locatie-veldnotitie, bron-gelabelde rewards, Weekvondst, onafhankelijke BugScan, Museum-claims/endgame, wereldzoom en vijf nieuwe soorten.
- De acht bestaande Firebase-reviewrecords zijn teruggelezen als beoordeeld. Zes unieke speler/soort-beloningen zijn toegekend; twee dubbele inzendingen zijn bewust zonder tweede exemplaar verwerkt.
- Firestore-rules en alleen Function `claimMuseumRewards` zijn lokaal en via Firebase-dry-run gevalideerd. Productiedeployment volgt na de selectieve releasecommit.
- Vercel-project `thomas-cim-pro/bugbaas` bevat alle vereiste productie-envnamen. OpenAI- en receipt-secrets zijn als afgeschermde `Sensitive`-waarden aanwezig; model, Firebase-project en productie-API-basis kloppen.
- De bronmap blijft bewust vuil met losse niet-releaseassets. Alleen runtimebestanden, tests, documentatie en vijf nieuwe WebP-assets worden in 3.0.6 opgenomen; webrelease en eindcontroles draaien vanuit een geïsoleerde worktree.

## 2026-07-29 Vercel iPhone- en BugScan-hotfix

- Vercel-deployment `dpl_5umNvb7VYihAyNK45eNUxTzVF1we` is `READY`; `https://bugbaas.vercel.app` wijst expliciet naar deze productiebuild.
- iPhone Safari gebruikt voor app- en spelgeluiden nu korte speelse WebAudio-tonen zonder WAV-playerpool. Andere webbrowsers houden de bestaande APK-WAV-geluiden.
- Een live bug met minimaal 70% zekerheid wordt bij een exacte catalogusnaam herkend, ook wanneer het model `uncertain` of `poor` terugstuurt. Een concrete ontbrekende soort vanaf 70% gaat naar de bestaande developer-wachtrij.
- Vleugeljacht 3D is op web vrij, houdt de tik-met-net-vangst bij 100% en gebruikt op iPhone een lichter renderprofiel zonder shadows/antialiasing en met minder gelijktijdige 3D-objecten.
- De production-env bevat de bestaande versleutelde OpenAI-, Firebase-, Google- en BugScan-configuratie; geheime waarden zijn niet naar bron of logs gekopieerd.

## 2026-07-29 BugBaas 3.0.5 Android-releasecandidate

- Release-APK: `dist/BugBaas-3.0.5.apk`, package `nl.cimpro.bugbaas`, `versionCode 314`, `versionName 3.0.5`.
- APK-grootte: 111.939.274 bytes; SHA-256 `29B570E08FAA9917043AA0A6E0482FFF9174DCB53D7C5B1F752081B257946BFF`.
- De productieclient gebruikt Firebase-project `thomascimpro-6266f`, de bestaande Functions en de BugScan-route op `https://bugbaas.vercel.app`.
- Android Vleugeljacht 3D opent `https://bugbaas.vercel.app`; de oude lokale WebView-beslissing geldt niet voor deze release.
- Camera, locatie en bewegings-/staprechten zijn aanwezig. Microfoon- en verouderde opslagrechten ontbreken.
- De release is met dezelfde certificaatvingerafdruk als de openbare 3.0.4-APK ondertekend voor updatecompatibiliteit.

## 2026-07-29 BugBaas 3.0.4 productiecorrecties

- Vercel-deployment `dpl_Ayvp4aHox6r2bNxEcBL4cKXFHe1E` is `READY` en de expliciet vrijgegeven hoofdalias `https://bugbaas.vercel.app` wijst naar deze release.
- Productie gebruikt Firebase-project `thomascimpro-6266f`; de benodigde BugScan-, Firebase- en Google-envvariabelen staan op Vercel zonder dat geheime waarden in bron of logs zijn vastgelegd. De lokale Vercel-koppeling staat weer op `bugbaasv3`.
- iPhone-webcorrecties omvatten de camera-picker, lichtere tradingweergave, route/workspacebehoud bij rotatie en een 30-fps Safari-profiel voor arcade en Vleugeljacht.
- BugScan accepteert exacte catalogusmatches vanaf 70% en gebruikt een anatomische tweede beoordelingsstap; de foreground-popup toont alleen de gevangen bug en geen extra XP-banner.
- Bug Tower beweegt rustiger, zoekzones gebruiken een betrouwbaardere API-timeout/fallback, duels tonen spel en score, en de weekly vereist nu het laatste Solo Campaign-level met een Epische bugbeloning.
- Vleugeljacht 3D is ontgrendeld op web, toont een vaste vangzone en vereist bij 100% een tik ergens op het speelveld; die tik zwaait het zichtbare net en voert de vangst uit.

## 2026-07-29 Vleugeljacht 3D exact in-app Android-integratie

- Android opent nu lokaal exact dezelfde `index.html` en `prototype.js` als de Vercel-game, binnen een interne WebView.
- Alleen de Three.js-import is voor de APK omgezet van CDN naar een lokaal gebundelde, vastgezette Three.js `0.180.0`; de gamelogica is inhoudelijk gelijk.
- De game gebruikt geen Chrome, Vercel of internet en stuurt de bestaande ranked/training-resultaten via de appbridge naar BugBaas.
- Telefoonbeweging wordt via dezelfde `deviceorientation`-besturing aan de game doorgegeven.
- Bron-, type- en lokale Android-assetsynchronisatie zijn gecontroleerd. Er is op verzoek nog geen APK gebouwd en geen Android-runtime- of devicecontrole uitgevoerd.

## 2026-07-29 officiële release 3.0.1

- De canonieke BugBaas 3.x-bron is voortaan `C:\Users\thoma.THOMAS\Documents\Codex\CimPro BugBaas-3.0`.
- Officiële APK: `dist/BugBaas-3.0.1.apk`, package `nl.cimpro.bugbaas`, versionCode `309`, versionName `3.0.1`.
- APK-grootte: 113.944.518 bytes; SHA-256 `A548081F0266A053A047C87DA6A64CCF45C6D0A4DC750EFB596D08E332797D13`.
- De APK gebruikt de CimPro-uploadcertificaatketen en slaagt voor APK Signature Scheme v2.
- Vercel-deployment `dpl_F6TftPPj35JeQyEs8dAySD5sEoSF` is `READY` en actief op `https://bugbaasv3.vercel.app`.
- `bugbaas.vercel.app` en de bestaande Firebase-backend zijn niet gewijzigd.

## 2026-07-29 360° HD-vlindervangst prototype

- Het losstaande Three.js-prototype bevat nu een volledige 360° bosweide met hoogteverschillen, bomen, heuvels, gras, bloemen, stenen, mist, sky dome en objecten op meerdere afstanden.
- Telefoonoriëntatie is opt-in via `Start 360°`, met kalibratie, afgevlakte camerabeweging en sleepbesturing als desktop- of permissiefallback.
- Twaalf procedurele 3D-vlinders gebruiken vier vleugeldelen, 512×512 gegenereerde vleugelpatronen, lichaam, ogen, voelsprieten en gesloten 3D-vliegroutes.
- Het first-person vlindernet heeft gedetailleerde geometrie, een driedelige vloeiende zwaai, motion trails, haptische feedback en maximaal één vangst per slag.
- Prototype blijft geïsoleerd onder `prototypes/butterfly-catch-3d`; Expo, Firebase, rewards en bestaande BugBaas-schermen zijn niet aangepast.
- Brontests en headless Chrome-initialisatie slagen. Echte gyroscoop- en FPS-validatie op een Android-telefoon moet nog handmatig gebeuren.

## 2026-07-28 BugDex 500 en Mythische kroonrangen

- De runtime-BugDex bevat nu 500 unieke entries: 137 Gewoon, 156 Zeldzaam, 138 Episch, 55 Legendarisch en 14 Mythisch. De gedeelde catalogus en Firebase research-whitelist zijn hiermee gelijkgetrokken.
- De BugDex gebruikt één canonieke transparante PNG per bestaand assettype: 269 unieke PNG’s, geen actieve WebP-duplicaten. 42 dubbele WebP-bestanden zijn recoverable buiten de workspace gearchiveerd.
- `aardhommel.png` en `weidehommel.png` zijn met imagegen opnieuw gegenereerd, chroma-key verwijderd en gevalideerd als 768×768 RGBA zonder checkerboard-achtergrond.
- `BugMastery.battleWins` normaliseert oude documenten naar 0. Bestaande `bugMasteryEvents` leveren idempotente battle-winregistratie voor Arcade-PvE, Solo Campaign/solo boss en Zwermbeleg; ranked Duel/PvP blijft uitgesloten.
- Mythische bugs tonen Kroonrangen, voortgang naar de volgende eis, PvE-bonus, CrownGlow en een upgrade-popup. De bonus is centraal begrensd op +10% en wordt niet in PvP toegepast.
- Typecheck en gerichte crown/BugDex/PvE-tests zijn groen; één bestaande progression-test blijft rood door de al aanwezige `bug_brain_daily`-bron zonder bijbehorend legacy-beleid.
- Geen deploy, APK-build of device-validatie uitgevoerd.

## 2026-07-27 Arcade fullscreen remount fix

- Mobiele browserreproductie bevestigde dat zowel Practice als Ranked direct terugvielen naar de Play-hub zodra een game fullscreen werd.
- Oorzaak: `App.tsx` wisselde bij `duelFullscreen` het wrapper-component van `SafeAreaView` naar `View`. React ontkoppelde daardoor de volledige Play-subtree en maakte een nieuwe `PlayScreen` met een gesloten workspace en lege game-state.
- De app gebruikt nu één stabiele `SafeAreaView`; alleen de styles veranderen tijdens fullscreen.
- Practice en Ranked blijven na de fullscreen-overgang geopend en speelbaar.
- Gerichte tests slagen 18/18, TypeScript slaagt en beide flows zijn in een mobiele Playwright-browser uitgevoerd zonder JavaScript-fouten.
- Nog niet naar Vercel gedeployed.

## 2026-07-27 Field-note receipt verification

- Root cause confirmed: Vercel signed v2 scan receipts with a key derived from its production secret, while `recordVerifiedObservation` verified only against an unrelated hardcoded public key. Firebase and Vercel also held different legacy secret values, so every new field-note proof was rejected immediately as "invalid or expired".
- Both receipt implementations now derive the v2 verification key from the configured shared secret, while retaining the old public key as a short migration fallback.
- UID binding, claim validation and the ten-minute expiry remain unchanged.
- Deterministic integration coverage now checks same-secret acceptance, wrong-secret rejection, UID rejection and expiry behavior across both Vercel and Firebase implementations.
- Local verification passes. Production still requires an explicitly approved synchronized secret rotation plus Firebase Functions and Vercel deployment.


## 2026-07-27 BugDex unlock popup restored

- De unlock-popup gebruikt opnieuw de rustige 2.10.20-opbouw met een witte kaart en een groot rond kleurvlak achter de bug.
- Rand, titel, sterren, streaktekst en knop volgen nu de rarity-kleur van de bug.
- Het beige specimen-frame, de meetkaders, stempel en sokkel zijn verwijderd.
- Premium aura-effecten, mythic-frame, animatie en compacte mobiele hoogte blijven behouden.
- Gerichte structuurtests slagen 3/3, TypeScript slaagt en `git diff --check` meldt geen fouten.


## 2026-07-27 Arcade ranked/practice launch fix

- Ranked and Practice now clear stale duel state before starting a selected game.
- All non-tap Practice buttons route through one launch function that resets active duel, training, solo, errors and run state before switching game mode.
- Ranked matchmaking also clears stale duel state before creating or claiming a duel.
- Play/Arcade regression tests pass 17/17; TypeScript and `git diff --check` pass.


## 2026-07-27 Zwermbeleg boss-art mobile

- Boss-afbeelding gebruikt op web/mobile nu expliciet `height: 100%` en `width: 100%` in plaats van alleen absolute offsets.
- Compacte boss-card verhoogd van 188 naar 240 px zodat de volledige vierkante boss-art zichtbaar blijft en niet als ingezoomde vleugel/romp wordt afgesneden.
- Structuurtest en TypeScript-controle slagen.


## 2026-07-27 Persistent mobile Play workspace

- `PLAY NOW` opent voortaan altijd een nieuwe Arcade-workspace zonder een eerder bekeken duel-ID.
- De gesloten modal ontkoppelt de Arcade-workspace nu volledig, zodat interne duelstatus niet bij de volgende opening terugkomt en het spelkeuzeraster niet na ongeveer één seconde verdwijnt.
- Open duels en Recente duels op het hoofdscherm van Play zijn afzonderlijke dropdowns en starten beide ingeklapt.
- Gerichte Play/Duel-tests slagen 16/16, TypeScript slaagt en `git diff --check` meldt geen fouten.


## 2026-07-27 Foreground rewards and field-note authentication

- Foreground bug rewards are no longer restricted to World; they can appear over every signed-in route when no blocking reward or system overlay is active.
- Field-note Cloud Functions now verify ID tokens against the two trusted BugBaas Firebase audiences instead of assuming the function runtime project matches the client-auth project.
- `recordVerifiedObservation` and `listVerifiedObservations` were deployed to `thomascimpro-6266f`.
- Vercel production deployment `dpl_5db4npGo9MYbTpj6Nm2JGbtwFerU` is Ready and aliased to `https://bugbaasv3.vercel.app`; live bundle is `AppEntry-2af6a32affb92ea52ba65823707b79b7.js`.
- Authenticated field-note save and cross-screen foreground spawning were not manually exercised with a production user during this release.

## 2026-07-26 Duel navigation consolidation

- De aparte Duel-tab is verwijderd; Play bevat alleen Arcade en Ranking.
- Duel starten blijft beschikbaar via Tap Duel in Arcade. Duel-deeplinks en notificaties openen dezelfde bestaande duelworkspace direct via Arcade.
- Open duels en recente duels staan onderaan Arcade, met open duels eerst.
- BugDex Active Squad toont nu per actieve bug het helpertype, cooldown, hits, AOE-targets en eventuele mythische special.
- Dueldata, rewards, matchmaking en Firebase-logica zijn niet gewijzigd.

## 2026-07-26 Mobile arcade grid

- Arcade toont alle zes games tegelijk: 2 kolommen x 3 rijen onder 700 px en 3 kolommen x 2 rijen vanaf 700 px.
- Vergrendelde games blijven zichtbaar met hun bestaande species-eis; ranked-, practice- en featured-gedrag is behouden.
- Solo Campaign staat als compacte brede rij onder het raster. Active Bug Squad blijft daaronder.
- Browsermeting bevestigt geen horizontale overflow op 360x800, 412x915 en 800x1280. Op 360x800 zijn alle zes games en Solo Campaign zichtbaar; Bug Squad begint onderaan het scherm.
- Gefocuste structuurtests, TypeScript-check en Expo web-export slagen. Geen deployment uitgevoerd.

## 2026-07-26 Draggable Bug World map

- The existing OSM Bug World map now has an independent viewed center and can be dragged with mouse or touch without moving or replacing stored sightings.
- Search zones reload automatically 600 ms after panning around the viewed field. Radius follows viewport/zoom and stays within 250-3000 metres; cache precision now distinguishes movements of a few hundred metres.
- Existing finding markers, biome overlays, player marker, location recentering, zoom, zone toggle and scan action remain on the original projection/rendering path.
- Focused map and zone regressions pass, `npm run typecheck` passes, Expo web export passes and an authenticated headless-browser drag produced shifted tiles plus a new viewed-centre zone request with no runtime exception. No physical Android test or deployment was performed.

## 2026-07-26 BugScan unlock confirmation

- A matched real-bug scan still writes one owned BugDex copy and the BugDex unlock record in the existing idempotent transaction.
- The scan service now returns that exact granted drop to the screen, which forwards it to the shared BugDex unlock modal immediately.
- New species show the unlock presentation; already-owned species show the extra-copy presentation. Rejected, pending and out-of-catalog results do not show a false unlock.
- Focused regressions pass 12/12, the complete real-bug scan suite passes 70/70, `npm run typecheck` passes and the Expo web export passes. No authenticated live scan, device rendering or deployment was performed.

## 2026-07-26 BugDex checkerboard asset cleanup

- All 249 active BugDex artwork mappings were inspected with a pixel audit; 11 mappings contained a baked white/grey transparency grid.
- The affected mappings now use existing transparent artwork. Aardhommel and Weidehommel use close clean bumblebee fallbacks until exact transparent versions exist.
- The focused BugDex catalog suite and full TypeScript check pass locally. No deployment or physical Android rendering was performed.

## 2026-07-26 Museum rewards and endgame

- Museum galleries now expose a single next-reward panel with plain-language Open, Curated, Master and Prestige goals. The panel reuses existing BugDex art, badge art and Museum styling.
- `claimMuseumRewards` independently evaluates BugDex inventory, mastery, verified field observations, exhibit placements and season trophies. Permanent receipts prevent repeat XP or reward bugs after replacing exhibits, reinstalling or retrying.
- Existing players are evaluated retroactively on Museum load. Endgame continues through five gallery Prestige goals and Crown Hall Bronze, Silver, Gold and Museum Legend tiers.
- Focused Museum/client tests pass 17/17, function/package tests pass 11/11, function syntax check, `npm run typecheck` and the Expo web export pass. No Firebase deployment, authenticated live claim or device/browser visual QA was performed.

## 2026-07-26 Duel launch and Play hero framing

- The Play Duel workspace now exposes an explicit random-duel start action and a player picker with a direct challenge action; the existing duel service flow is used for both actions.
- Duel and Ranking Play heroes use a shorter landscape-friendly phone frame, keeping the central content of `bug-smash-duel-concept.jpg` and `arena-training-mode-hd.jpg` visible while preserving the existing art treatment.
- Targeted Duel/Play regressions pass 6/6, `npm run typecheck` passes and `npx expo export --platform web --output-dir dist-duel-check --clear` passes locally. No Vercel deployment or physical Android rendering was performed.

## 2026-07-26 Bug ranking and back navigation

- Ranking now has three modes: Duel rating, Score and Bugs vrijgespeeld. The third mode sorts players by the existing public `bugDexCount` projection of their unlocked BugDex species.
- Added a visible back-arrow action to the Ranking workspace; it closes the Play modal through the existing `onBack` callback.
- Targeted ranking/Play tests pass 7/7, `npm run typecheck` passes and `npx expo export --platform web --output-dir dist-ranking-check` passes locally. No Vercel deployment or physical Android rendering was performed.

## 2026-07-26 BugScan review safe area

- The photo-review stage now explicitly allows page scrolling when its crop controls and actions extend below the viewport.
- Compact phone styles reduce the review frame and control heights while retaining the existing visual treatment; the Analyze and New photo actions now have dedicated phone spacing above the fixed bottom navigation.
- Review layout regressions pass 6/6, `npm run typecheck`, `npm run test:real-bug-scan` (69/69) and `npx expo export --platform web --output-dir dist-review-check` pass locally. No Vercel deployment or physical Android rendering was performed.

## 2026-07-26 2.10.20 mission parity in V3

- Restored the concrete 2.10.20 daily set: 1 duel, 1 real-bug scan, 4 different games, 5 total duels, 3 km and 1 Solo Campaign boss.
- Restored the concrete weekly set: 15/30/45/60 km, 50 duels and 10 Solo Campaign bosses, with the original XP rewards and `daily-v1`/`weekly-v3` claim IDs.
- Removed the vague V3 Explorer/Trainer/Team Bronze/Silver/Gold mission tracks and their Daily Route presentation; completion bonuses now require all six visible missions.
- Mission-specific tests pass 4/4, `npm run typecheck` passes and the Expo web export passes locally. No Vercel, Firebase or device release was performed for this change.

## 2026-07-26 Vercel v3 audio parity

- Published the 12 Android APK WAV effects to the `bugbaasv3` Vercel production project and switched web playback from synthetic tones to the byte-identical WAV assets.
- Production deployment is READY at https://bugbaasv3.vercel.app; all 12 hashed audio URLs returned HTTP 200 and matched the local export hashes.
- Browser autoplay restrictions are handled by the existing user-gesture flow; browsers that reject file playback retain the short WebAudio fallback.

## 2026-07-26 Mobile viewport corrections

- BugScan live camera now fills the phone-width capture card; the capture stage remains vertically scrollable before the camera opens so `Choose from gallery` stays above the fixed bottom navigation.
- Swarm Siege keeps the complete boss illustration inside its hero, Play Arcade uses a full single-scene game image, and the Museum exhibit editor opens in a scrollable modal above navigation.
- Source regression checks and typecheck are recorded in `TESTRESULTS.md`; physical Android rendering and deployment remain unverified.

## 2026-07-26 V3 compact Android beta APK

- Built the minified BugBaas `3.0.0-beta.1` release APK with Android `versionCode 300`, Hermes, R8 resource shrinking and `arm64-v8a` only.
- Converted 19 opaque runtime backgrounds to optimized JPEG and 68 large referenced transparent raster assets to WebP while retaining their original source PNGs.
- APK size is 75.19 MiB, down from 104.04 MiB: 28.84 MiB / 27.7% smaller.
- Test artifact: `dist/BugBaas-3.0.0-beta.1.apk`, SHA-256 `80BDDC938F15F871F2985A58AE83D2F53C676251FD1B5AA93143701186BC4248`.
- Package metadata, Android 8+ minimum, target SDK 36, arm64 ABI and APK Signature Scheme v2 were verified.
- This internal beta APK uses the established Android debug certificate. A Play Store upload artifact must use the production upload key.
- No device or emulator was connected, so installation, camera, Google Sign-In and physical rendering remain unverified.
- No Firebase or Vercel deployment was changed.

## 2026-07-25 Commercial game refactor slice 1 implemented locally

- Replaced the programmer-style brand mark with a reviewed beetle expedition emblem, an opaque launcher icon and a separate jumping-spider Scan medallion.
- Login is now a compact game-intro on desktop and a focused single-column entry on mobile.
- The shared background uses a finite entrance animation; the central Scan navigation action uses the new medallion.
- World Today now exposes one contextual primary action with reason, reward and progress. Movement sync remains in the dedicated movement card.
- Bug Tower and Bubble Swarm are survival games: neither ends on a timer or score cap. Tower ends on a fall; Bubble Swarm ends at the danger row and keeps increasing pressure.
- Cloud Functions source now explicitly accepts both `localhost` and `127.0.0.1` for the supported development ports. The deployed endpoints still require a later approved deployment before localhost CORS changes live.
- Local screenshots cover login, World on phone/tablet/desktop, all five onboarding popups, the Museum editor popup and Bubble Swarm ready/running states.
- TypeScript, targeted UI/gameplay tests, scan tests, Functions tests and a clean Expo web export pass. No deployment, Firebase write or release was performed.

## 2026-07-25 V3 World and biome plan implemented locally

- World Today now uses one active biome hero with six atlas biomes, route progress, search and finding markers, movement, one next-action strip and one primary BugScan action.
- Research is presented directly below the hero as a visual bug encounter; adaptive event, Buddy and mission modules remain functional underneath.
- Location, search-zone, scan and locked states use scalable React Native glyphs instead of placeholder text symbols.
- The implementation was checked against `docs/visual/bugbaas-asset-style-guide.md`; the chosen direction remains Field Expedition Atlas.
- Open work: optimize the opaque PNG sources to runtime WebP/JPEG budgets, migrate final assets to `assets/v3/world/`, and perform physical Android QA for small screens, large text, Back and touch behavior.
- No deployment, Firebase change or release was performed.

## 2026-07-25 V3 World and biome plan implemented locally

- World Today now uses one active biome hero with six atlas biomes, route progress, search and finding markers, movement, one next-action strip and one primary BugScan action.
- Research is presented directly below the hero as a visual bug encounter; adaptive event, Buddy and mission modules remain functional underneath.
- Location, search-zone, scan and locked states use scalable React Native glyphs instead of placeholder text symbols.
- The implementation was checked against `docs/visual/bugbaas-asset-style-guide.md`; the chosen direction remains Field Expedition Atlas.
- Open work: optimize the opaque PNG sources to runtime WebP/JPEG budgets, migrate final assets to `assets/v3/world/`, and perform physical Android QA for small screens, large text, Back and touch behavior.
- No deployment, Firebase change or release was performed.

## 2026-07-24 V3 authenticated production corrections implemented locally

- Nearby map search zones now have a 9-second server abort and 12-second client timeout. Failure falls back to a retryable map state without blocking tiles, location or private sightings.
- Daily and Weekly missions remain permanently reachable from World Today, independent of adaptive module priority.
- Settings is reachable from the user's own Profile and returns to Profile.
- Swarm Siege distinguishes Friday preview from upcoming, live and result states.
- Proven mixed Dutch/English copy in Map, Field Journal and Museum Exhibit Editor now uses Dutch, English and French translation keys.
- Local verification passed: API tests 3/3, complete source suite 231/231 and `npm run typecheck`.
- These source corrections are not deployed yet; production behavior remains unchanged until explicit release approval.

## 2026-07-24 BugBaas hybrid progression master implementation en productie-release

- De vier hoofdbestemmingen hebben vaste eigenaars: World regisseert, Scan verifieert, Play traint en Collection beheert BugDex, Museum en Journaal.
- Alle 231 BugDex-soorten hebben één vaste verkrijgingsroute: starter, field, research, campaign, event of mythic. Eventsoorten tonen hun exacte terugkeerplanning.
- Research Targets bieden een gerichte route zonder random microdrops. Verified scans, geldige interne bijdragen, completed games, Daily Routes en vijfdaagse Momentum-cycles worden server-gevalideerd en idempotent verwerkt.
- World Today toont één primaire actie, actieve research en maximaal één contextueel extra signaal. BugScan gebruikt capture, review, identification, result en impact.
- Collection bevat BugDex, Museum en Veldjournaal. Museum-opstellingen zijn handmatig, starten met een begeleid eerste podium, schalen via cataloguspercentages en ondersteunen curated Research-focus.
- Crown Hall toont season-finale trophies. Mastery Team Challenges ontgrendelen afgeleide bronze, gold en prismatic squadframes.
- Expedition World is vervangen door zes regio's met ieder vijf tiers in World Map.
- Play-modes openen op collectieomvang; Duel en Solo Campaign openen bij tien soorten. De vijf campaignbosses hebben vaste, vooraf zichtbare en server-authoritative soortenbeloningen; wekelijkse resets verwijderen geen waveprogressie.
- Swarm Siege is een live zaterdag-event van 12:00 tot 18:00 Europe/Amsterdam met charges om 12:00, 14:00 en 16:00, vier phases, reconnectbare tickets, partial rewards en een bij eventstart gelockte target op basis van recent actieve spelers.
- Team Hunt is een maandelijkse unieke-soortenrace met ontbrekende teamcategorieën. De Conservatoriumwachter verschijnt alleen tijdens de finaleweek van een achtweeks seizoen en verwerkt rewards automatisch.
- Dailies zijn Discover, Train en Contribute; twee van drie volstaat. Weeklies zijn Explorer, Trainer en Team met Bronze, Silver en Gold. Claimzoektochten zijn uit de hoofdflows verwijderd.
- Firestore Rules staan live op `bugbaas-3`. Cloud Functions staan live op `thomascimpro-6266f`.
- Vercel production deployment `dpl_DerYgX6Np594ZVYP94XumQnb5g4L` is `READY` en gealiasd naar `https://bugbaasv3.vercel.app`; live bundle: `AppEntry-56b852cb319589ec4e6044fbc6b2d7ab.js`.
- Android `:app:processDebugResources` en `:app:assembleDebug` zijn succesvol. Debug-APK: `android/app/build/outputs/apk/debug/app-debug.apk`, SHA-256 `5d66c1bca900b18561a9c0331c0bbe2a6ec1fff723bfc825418454552ad473db`.
- Handmatig open: fysieke Android camera-, touch-, tekstschaling- en tablet-QA; `adb devices` toont geen verbonden toestel of emulator.

## 2026-07-24 BugBaas V3 hybrid progression Phase 0

- The hybrid collector direction is fixed: real discoveries open species, habitats and Museum progress; Play trains and uses the same collection.
- A central progression catalog now classifies all 231 current BugDex entries exactly once as starter, field, research, campaign, event or mythic.
- Every definition includes habitats, Museum wings and a guaranteed exact verified-scan route; research, campaign, event and mythic entries also carry their required route metadata.
- Existing inventory, unlock history, mastery, active squads, trades and field notes remain unchanged. This phase adds no visible gameplay or reward behavior.
- Current distribution: 3 starter, 121 field, 84 research, 5 campaign, 9 event and 9 mythic species.

## 2026-07-21 BugScan recognition release 2.10.19

- Version metadata is aligned at 2.10.19 / Android versionCode 199.
- Primary AI input is increased to 2048 px JPEG quality 0.95, with 1600/0.90 and 1280/0.82 fallbacks for oversized payloads.
- Exact BugDex matches and specific missing species are accepted from 0.70 confidence; generic, invented and forced-nearest matches remain review-only.
- The vision prompt treats confidence as graded uncertainty instead of defaulting to `uncertain`, and only marks image quality poor when anatomical assessment is genuinely blocked.
- Vercel deployment `dpl_C5RcSw2H1YctAE5xzJC1oFhYQkjw` is `READY` and aliased to `https://bugbaas.vercel.app`.
- Signed APK `dist/BugBaas-2.10.19.apk` is built and verified; physical-device testing remains unavailable because ADB reports no connected device.

## 2026-07-21 BugScan analysis hotfix 2.10.18

- Production failures were caused by the 1200-token response limit truncating the expanded 15-field multilingual JSON result, not by image quality.
- The first request now uses 3200 output tokens with low reasoning effort and concise fields; incomplete, missing or truncated JSON receives exactly one 5000-token retry.
- Vercel deployment `dpl_89VffjN5sPH1twe4egfGqfcc9SRT` is `READY` and `https://bugbaas.vercel.app` points to it.
- The signed APK was rebuilt and replaced at `dist/BugBaas-2.10.18.apk`; it is byte-identical because this hotfix changes only server-side Vercel code.

## 2026-07-21 release 2.10.18

- Release scope: sharper BugScan input, honest subject-first identification, localized missing-species developer records and hidden test-account cleanup.
- Version metadata is aligned at 2.10.18 / Android versionCode 198.
- Firebase Rules are live on `thomascimpro-6266f` and Vercel production deployment `dpl_2gwHfcpXmMgytVoMuSPsEhAJszGk` is `READY` on `https://bugbaas.vercel.app`.
- Signed APK `dist/BugBaas-2.10.18.apk` is built and verified; physical-device smoke testing was not possible because ADB reported no connected device.
- Release commit `d479d4f` is pushed to `origin/codex/BugBaas` and tag `v2.10.18` is published; GitHub Release asset upload is blocked because GitHub CLI is not logged in.
- `origin/master` now points to history-preserving merge `2d87f0e`, with the 2.10.18 release tree authoritative and the former remote master retained as its second parent.
- The working branch is `master`; the former local master tip remains recoverable as `codex/backup-master-before-2.10.18`.

## 2026-07-21 BugScan missing-species correction

- BugScan sends a 1536 px JPEG at quality 0.90 to AI, with a 1280 px/0.80 fallback only above 4 MB, instead of the former 768 px/0.60 input.
- BugScan identifies the photographed taxon before comparing it with BugDex and rejects a forced nearest catalog match server-side.
- The result always displays the AI's honest name for the visible subject, including unclear and rejected photos.
- A confidently identified species outside BugDex now shows and stores localized names, facts, and explanations in Dutch, English, and French under `pendingBugDexDiscoveries`.
- Developer/admin Firebase claims can review and resolve discovery records; existing 2.10.17 clients remain compatible with the updated rules.
- All 37 live users marked `testAccount: true` and their 477 Firestore documents were removed from Firebase; no marked accounts remain.
- The complete BugScan page is translated in Dutch, English, and French. Deployment is still pending release approval.

## 2026-07-21 release 2.10.17

- Alle 48 ontbrekende BugDex-afbeeldingen zijn toegevoegd, transparant gemaakt, geoptimaliseerd en gekoppeld aan de catalogus.
- BugScan verbruikt alleen een dagpoging bij een geldige herkenning; een zekere soort buiten de catalogus wordt als developersuggestie vastgelegd en afwijzingen of onzekere scans kosten geen poging.
- FitnessSyncer ondersteunt persoonlijke OAuth-appgegevens, PKCE, versleutelde opslag, tokenrefresh en detailimport; providerconsent blijft afhankelijk van een door FitnessSyncer geregistreerde productiecallback.
- Webexport en de getekende Android APK 2.10.17 zijn lokaal succesvol gebouwd. Productiepublicatie volgt vanuit deze releasecommit.

## 2026-07-21 FitnessSyncer OAuth connect hotfix

- `Koppel FitnessSyncer` blijft op web actief en wordt alleen tijdens een lopende request geblokkeerd; ontbrekende backendconfiguratie verschijnt als duidelijke melding in plaats van een niet-werkende grijze knop.
- Alle vijf FitnessSyncer HTTPS Functions zijn expliciet publiek invokeerbaar gemaakt. Status, start, sync en disconnect blijven daarna beschermd door Firebase ID-tokencontrole; de callback blijft beschermd door OAuth-state en PKCE.
- De Functions zijn succesvol bijgewerkt op Firebase-project `thomascimpro-6266f`; CORS-preflight op `fitnessSyncerStart` geeft HTTP 204 en start/sync geven zonder login correct HTTP 401.
- Vercel-productie is `READY` op deployment `dpl_Gz5vb23fJx1rCCv6Uz2dELP8TqKo`; `bugbaas.vercel.app` serveert bundle `AppEntry-149da9e01d13fbc13eb1ecbf9e3fcd45.js`.
- Echte FitnessSyncer-toestemming en tokenuitwisseling blijven extern geblokkeerd totdat FitnessSyncer een geldige BugBaas Client ID en Client Secret heeft uitgegeven en deze server-side zijn ingesteld.

## 2026-07-20 BugScan reward release 2.10.15

- Elke geldige unieke echte bugscan geeft voortaan altijd `+1` van de herkende BugDex-bug, ook wanneer de bestaande voorraad `count: 0` was.
- De reward-event-ID gebruikt de unieke scan-ID; dubbele verwerking van exact hetzelfde event blijft idempotent geblokkeerd.
- Vercel-productie is `READY` op deployment `dpl_69KTPZko2Eyx1fsFLuwCUD9vquPv`; `bugbaas.vercel.app` serveert bundle `AppEntry-167d3edc9a0761bf18ba854c17f600d5.js` en de BugScan API-route antwoordt op CORS preflight.
- Android APK 2.10.15 is gebouwd als `dist/BugBaas-2.10.15.apk`, package `nl.cimpro.bugbaas`, versionCode `195`.
- GitHub Release is niet gemaakt; GitHub CLI is lokaal niet ingelogd.

## 2026-07-20 daily rewards, buddy persistence and Tower jump hotfix

- Geclaimde daily mission-bugs openen direct als BugDex-rewardpopup in plaats van als mogelijk gemiste rondlopende vangbug.
- Buddy-taken worden vóór optionele notificatieplanning in Firebase opgeslagen en gebruiken absolute start/eindtijden; de timer loopt dus door wanneer Vercel gesloten is.
- Hidden/testaccounts en normale accounts blijven strikt gescheiden in zowel Score- als Duel-ranking; Home en het volledige leaderboard gebruiken een verse complete lijst.
- Bug Tower-pressure start direct, een volle balk haalt circa 5-6 normale treden en de groene `MEGA` geeft +100 punten plus een sterkere volgende sprong.
- FitnessSyncer Functions tonen nu exact welke veilige configuratievelden ontbreken. De providerlogin blijft uitgeschakeld zolang Client ID, Client Secret en Token key niet zijn ingesteld.
- Vercel-productie is `READY` op deployment `dpl_HcJSahLW4Fg4cxBLfQx14mZ6JAtS`; `bugbaas.vercel.app` serveert bundle `AppEntry-a309d12e23b3a0b702e78ca3bf1dc4e3.js`.
- Geen APK gebouwd of gepubliceerd; bestaande APK-binaries zijn niet gewijzigd.

## 2026-07-20 Vercel ranks, sounds, ranked permissions and Tower balance

- Vercel gebruikt browserbrede WebAudio-feedback voor bestaande game-events en alle actieve React Native Web `Pressable`-acties; Android-geluid blijft ongewijzigd.
- Home berekent Score- en Duel-rank uit een verse volledige actieve gebruikerslijst en vervangt een verouderde eigen leaderboard-snapshot door de actuele gebruiker.
- Firestore accepteert nu alle zes Arena-ranked modes, inclusief `bubble_swarm`; de rules zijn gecompileerd en live op `thomascimpro-6266f`.
- Bug Tower spreidt opeenvolgende treden sterker links/rechts en gebruikt vanaf hogere floors oplopend grotere missing-step-gaps; deze gameplaybron wordt gedeeld door web en een toekomstige APK-build.
- FitnessSyncer OAuth-return, stappenimport en dag/week-deduplicatie staan in de gedeployde Functions-code. De runtime blijft bewust uitgeschakeld zolang `FITNESSSYNCER_CLIENT_ID`, `FITNESSSYNCER_CLIENT_SECRET` en `FITNESSSYNCER_TOKEN_KEY` ontbreken.
- Vercel-productie is `READY` op deployment `dpl_HeJ27nWsLoiAHKxsNXTyk9omozXM`; `bugbaas.vercel.app` serveert bundle `AppEntry-0bea8ee78d9ca4fe36230482d686fcf9.js`.
- Geen APK gebouwd of gepubliceerd; bestaande APK-bestanden zijn niet gewijzigd.

## 2026-07-19 web auth, rewards and Tower hold hotfix

- Web Google-login uses Firebase's browser popup instead of the unsupported native RN Google Sign-In method; Android keeps the native flow.
- Bug Tower web hold ignores React Native Web press cancellation and releases only on a real global pointer-up or window blur.
- Buddy, BugDex and mastery reward writes remain restricted to the signed-in owner's subcollections; the compiled rules are live on Firebase project `thomascimpro-6266f`.
- Production is live at `https://bugbaas.vercel.app`, deployment `dpl_AgBRAgZyq9ysDpj7osQEEDs9KWZF` (`READY`).

## 2026-07-19 web arcade interaction hotfix

- Bug Tower web-hold toont geen copy/selectiemenu meer; pickups staan los van treden en rockets vliegen langer en verder.
- Bubble Swarm gebruikt Bomb/Freeze-gridbubbels en vloeiende, positievaste drukrijen; Web Runner ondersteunt swipe-up jump.
- Train-X sluit direct en Nest Defense-controls staan buiten het speelveld zonder de mobiele overlay uit de aangeleverde screenshot.
- Web-hotfix staat productie op `https://bugbaas.vercel.app`, deployment `dpl_9pKLUM1DmuaC1oF9HodtUdekqtRW` (`READY`).
- Android/APK is niet gewijzigd of opnieuw uitgebracht voor deze webgerichte hotfix.

## 2026-07-19 regression repair release 2.10.10

- Het nieuwe-meldingsformulier toont Bug, Tip, Trick en Idee altijd direct; de gekozen categorie blijft bepalend voor de velden.
- Nest Defense gebruikt een volledige, voorgrondvrije taplaag en vertaalt web- en native taps naar het gemeten speelveld.
- Medaillecriteria voor BugDex-aantallen en zeldzaamheden worden rechtstreeks uit historische unlocks berekend, inclusief niet-meer-bezette bugs.
- Alleen oefenruns tonen en accepteren voortijdig afsluiten; actieve ranked minigames blokkeren de UI- en Android-terugroute tot het resultaat.
- Webversie 2.10.10 staat productie op `https://bugbaas.vercel.app`, deployment `dpl_DQfZuBFLVCeVwbHicBKEXaaVCFRp` (`READY`).
- Android 2.10.10 is gebouwd en gecontroleerd als `dist/BugBaas-2.10.10.apk`; GitHub Release `v2.10.10` is gepubliceerd en als latest gemarkeerd.
- Geen Android-toestel aangesloten; fysieke installatie en native touch-feel blijven open.

## 2026-07-19 arcade survival release 2.10.9

- Bug Glide ontvangt taps over het volledige speelveld, inclusief links van de stuurgrens; de sprite stopt volledig rechts van de lijn.
- Bug Tower toont een vaste salto-chain uitleg en een actieve `TAP NOW`-timingbalk; coins, rockets en springs verschijnen op onregelmatige seeded intervallen.
- Bug Tower eindigt zonder input live rond 50 seconden en heeft een harde bovengrens van 120 seconden.
- Bubble Swarm gebruikt aaneengesloten staggered bubbles en een zichtbaar vloeiend projectieltraject; Bomb, Freeze en Rainbow verschijnen onregelmatig iedere 7-10 schoten.
- Bubble Swarm eindigt zonder input live rond 55 seconden en heeft een harde bovengrens van 120 seconden.
- Webversie 2.10.9 staat productie op `https://bugbaas.vercel.app`, deployment `dpl_FJntL59LsTuVeQK5nJ91SDsWG94p` (`READY`).
- Android 2.10.9 is gebouwd als `dist/BugBaas-2.10.9.apk`; metadata, ARM64-inhoud, v2-signing en SHA-256 zijn gecontroleerd.
- GitHub Release `v2.10.9` is gepubliceerd met de geverifieerde APK en expliciet als latest gemarkeerd, zodat de native updatechecker 2.10.9 ziet.
- Geen Android-toestel aangesloten; fysieke install-, performance- en touch-feeltest blijft open.

## 2026-07-19 arcade repair release 2.10.8

- Bug Tower gebruikt twee volledige touchhelften, snellere floor pressure, exact 1/2-, 1/3- en 1/4-brede mijlpalen, eerdere moving platforms en betrouwbare coin/rocket-pickups.
- Bubble Swarm gebruikt een vloeiend Animated-pad met exact grid-eindpunt; de live gevonden web-stretchbug in bubble-afmetingen is hersteld en opnieuw visueel getest.
- Train staat bij alle arcadegames, inclusief Bubble Swarm. Practice schrijft geen ranked run, Firestore-resultaat of lokaal highscore-record.
- Herculeskever is vervangen door een transparante 1254x1254 HD-versie waarin hoorn, lijf en poten volledig zichtbaar zijn; Hooiwagen en Buddy-assets zijn gecontroleerd en bleken al correct.
- Webversie 2.10.8 staat productie op `https://bugbaas.vercel.app`, deployment `dpl_2Zz1LbmkbBig1V5piHiVR2ocrzvj` (`READY`).
- Android 2.10.8 is gebouwd en gecontroleerd als `dist/BugBaas-2.10.8.apk`; GitHub Release `v2.10.8` is gepubliceerd met de geverifieerde APK-asset.
- Geen Android-toestel aangesloten; de fysieke install- en touch-feeltest blijft daarom expliciet open.

## 2026-07-18 web shell, arcade scaling and release candidate

- De Expo-webshell is op web gecentreerd met een maximale breedte van 460px; html/body/root zijn viewport-locked en scroll blijft binnen de schermcontent.
- Duel-arcadegames schakelen naar een eigen fullscreen game-shell; BottomNav, WalkingBugs en foreground overlays worden tijdens actieve games niet gerenderd.
- Bug Tower heeft smallere hoge-floor platforms, oplopende moving-platform-kans, chain taps, coins en tijdelijke rocket flight; Bubble Swarm gebruikt RAF/transform-projectielen, wall-bounce aim paths, bomb en freeze shots.
- BuddyCareIcon gebruikt transparante state/action PNG-assets; Hooiwagen is opnieuw met volledige poten gecropt.
- Daily duelmission gebruikt target 7 en behoudt id `duel-play-5` voor bestaande claims.
- Web export en Vercel production deployment zijn geslaagd op het bestaande project `bugbaas`; productie-deployment `dpl_2xQH3VU5RYbdncywnQEM6LeN53jH` is `READY` op `https://bugbaas.vercel.app`.
- Browser-plugin en fysieke device-smoke waren in deze run niet beschikbaar; die visuele/control-flow checks blijven expliciet open.
- Android fast release-build 2.10.7 is geslaagd; APK staat op `dist/BugBaas-2.10.7.apk`, metadata/signing/hash zijn gecontroleerd.
- GitHub Release `v2.10.7` is gepubliceerd met APK-asset.

- Ranked-inactiviteitsdecay loopt nu door onder 1000 tot de absolute Duel-ratingbodem van 100.
- Dagelijkse ranked rating-decay is als GitHub Actions-scheduler voorbereid: ook afwezige spelers worden server-side verwerkt zonder app-login; live dry-run tegen Firestore is geslaagd.
- Bug Tower gebruikt nu uitsluitend touchbesturing: links/rechts vasthouden bouwt loopsnelheid en sprongkracht op, loslaten springt; snelle geladen sprongen laten het karakter ronddraaien.
- Alle treden tonen hun floornummer en de achtergrond wisselt iedere 100 floors tussen Ice Citadel, Hive Jungle, Ember Forge, Sky Temple en Cosmic Void.
- De neerwaartse torendruk begint rustig na floor 8 en schaalt samen met smallere treden, grotere gaten en meer bewegende platforms door tot een onhoudbare late game.
- Bubble Swarm is lokaal als zesde Arena-game geimplementeerd: solo richten/schieten, match-3, vallende clusters, kettingcombo's, lokale highscore en afzonderlijke Firebase-runrecords.
- Bubble Swarm wordt door snellere automatische zwermdruk, minder toegestane missers en zes oplopende bubblekleuren uiteindelijk onhoudbaar; elke run eindigt uiterlijk na 90 seconden.
- Android fast release-build 2.10.0 met Bubble Swarm en alle zeven nieuwe assets is geslaagd; device-smoke en deployment van de gewijzigde Firestore rules staan nog open.
- Release 2.10.0 is lokaal geminificeerd en gesigneerd gebouwd; metadata, v2-signing en SHA-256 zijn geverifieerd, publicatie op GitHub volgt.
- BugDex bevat 45 nieuwe, transparant gecropte bugs uit `new17-17-2026`; catalogus-, asset- en Android-releasecontrole zijn geslaagd.
- De scoreladder loopt nu door tot 40.000 punten met vier nieuwe stretch-tiers boven Goliath BugBaas.
- Nest Defense zet taps en hitdetectie nu in dezelfde gemeten speelveldcoördinaten; taps op bugs springen niet meer naar linksboven.
- De linker Bug Glide-stuurstrook is klikbaar en duwt de bug naar rechts, zodat hij niet aan de linkerrand blijft hangen.
- Ranked Duel rating krijgt bij het openen van Arena eenmalig 5 punten decay per volledig gemiste dag, met een bodem van 1000.
- Bug Tower is lokaal als vijfde Arcade-game geimplementeerd met animated beetle, tilt/tap-besturing, fallbackknoppen, combo's, highscores, training en ranked; release-APK build is geslaagd, device-smoke staat nog open.
- Ranked Bug Tower-resultaten krijgen lokaal een afzonderlijk herkenbare Firebase-context met `ranked: true` en de bijbehorende `duelId`.
- De 2.10.0-release bevat de ranked Bug Tower-context en de uitgebreide BugDex.
- Bug Tower-moeilijkheid schaalt door smallere/grotere platformgaten, bewegende platforms vanaf floor 40 en steeds snellere neerwaartse scroll.
- Release-APK `dist/BugBaas-2.10.0.apk` is normaal geminificeerd en op metadata en signing gecontroleerd; device-smoke staat nog open.
- Lokale gameplay/reward-verbeteringen zijn opgenomen in 2.10.0; device-smoke op tablet en telefoon staat nog open.
- BugDex-medailles en set-characters gebruiken nu de blijvende unlockhistorie in plaats van alleen huidig bezit.
- Ranked Web Runner, Nest Defense en Bug Glide blokkeren annuleren/teruggaan tot het resultaat.
- Buddywidget toont status met hunt-, reward-, beschikbaar- en rustafbeeldingen.
- Projectbasis: klaar.
- Auth-flow: klaar met Firebase integratie en demo-fallback.
- Google-login werkt via native Google Sign-In in standalone APK.
- Eerste standalone APK gebouwd en getest op Pixel 8.
- GitHub Release `v0.1.0` met APK: klaar.
- GitHub Release `v2.2.1`: voorbereid met embedded release image bovenaan de release notes en APK `BugBaas-2.2.1.apk`.
- GitHub Release `v2.2.2`: klaar te publiceren met BugDex-revert, rustig squad-potje, betere Solo Campaign targets en kleinere APK.
- GitHub Release `v2.2.3`: klaar met boss HD-art, campaign-clear reward, weekly-claim fix, BugDex periodefilter en radar-widget request badges.
- GitHub Release `v2.2.4`: klaar met squad-potjes zichtbaar in fullscreen 1v1 duel.
- Bug melden concept/herstel en screenshot verwijderen: klaar.
- Bug CRUD V1: aanmaken, tonen en status wijzigen klaar.
- Upvotes op bugmeldingen: klaar.
- Screenshot V1: client-side resize/compressie klaar; opgeslagen als Firestore data-URL voor Spark-only gebruik.
- Puntenlogica: klaar.
- Leaderboard/profiel: klaar.
- Modern profielscherm met tier, badges en status: klaar.
- Tier-systeem met insectbeelden: klaar.
- Tier-upgrades tonen grotere, betere insect-assets per niveau: klaar.
- Modern UI met achtergrond, betere knoppen, insect-stage en ranking-preview: klaar.
- Walking bug animaties: klaar met vooruit lopend zijaanzicht.
- Walking bugs zijn klikbaar en tonen splat-effect: klaar.
- Bottom navigation met Home, Bug melden en Ranglijst: klaar.
- Profielroute bereikbaar vanaf Home: klaar.
- Home nieuws en Ranglijst status/badgechips: klaar.
- Clean UI zonder zichtbare demo/uitlegtekst: klaar.
- Online-inspired modern UI met prominente meldknop, dashboardtegels en sterkere ranglijstheader: klaar.
- Firebase echte projectconfig, Auth persistence en Firestore rules: klaar.
- Firebase live koppeling met Auth, Firestore users en bugs: klaar.
- Firebase CLI beheert Firestore rules en indexes: klaar.
- Spark-plan documentatie: klaar in `FIREBASE_SPARK_PLAN.md`.
- Android test: zie `TESTRESULTS.md`.
# 2026-07-19 Nest and FitnessSyncer release 2.10.11

- Nest Defense lower-field tapping is repaired and verified on production with a hidden test account.
- Five FitnessSyncer Firebase Functions are active and protected by Firebase authentication; container cleanup is set to seven days.
- FitnessSyncer Client ID, Client Secret, and token encryption key are not configured yet; the production UI therefore remains hidden by design.
- Web 2.10.11 is live on `https://bugbaas.vercel.app`, deployment `dpl_BMZtL6j5ZmsjkrZ5C4Gn7heqUSrL` (`READY`).
- Android 2.10.11 is published as `dist/BugBaas-2.10.11.apk`; GitHub Release `v2.10.11` is latest.

# 2026-07-25 BugBaas 3.0 preview

- Full responsive visual pass completed for the shared shell, World, Scan, Play, Collection, Profile, social, Museum, Journal, trade, upgrades, events, games, dialogs and reward overlays.
- The preview is live at `https://bugbaasv3.vercel.app` on Vercel project `bugbaasv3`.
- The preview uses the existing `thomascimpro-6266f` Firebase project and existing user accounts.
- Additive Firestore rules and 15 BugBaas 3.0 Functions are deployed; the seven existing FitnessSyncer Functions were not redeployed.
- `https://bugbaas.vercel.app` remains on its separate 2.10.20 deployment and must not be promoted until explicit approval.

# 2026-07-26 BugBaas 3.0 local premium pass

- World, Scan, Play, Collection, Museum, Profile, Settings, reports, games and their main dialogs were reviewed with the authenticated `test2` account at phone, tablet and desktop sizes.
- Main routes remain viewport-locked. Settings and New Report now use fixed screens with scroll only inside their detail sheets.
- World uses a texture-led expedition scene, equal four-button navigation and a walking bug moving toward the 1.5 km marker.
- Five distinct July assets are connected to the 242-entry BugDex: Spaanse vlag, Weidebeekjuffer, Steenhommel, Muskusboktor and Eikenpage.
- Bug Tower and Bubble Swarm are survival games until game over. Monthly duel rewards now descend from Mythic at rank 1 to Rare at rank 5.
- Live camera authenticity signals can reject reproduced screens and route uncertain scans to review without changing existing confirmed scan records.
- This source is newer than the current `bugbaasv3.vercel.app` deployment. No Firebase, Vercel, APK or `bugbaas.vercel.app` release was changed in this pass.

# 2026-07-26 Google login repair

- `bugbaasv3.vercel.app` is now an authorized Firebase Authentication domain.
- The preview Google button reaches the official Google account chooser without `auth/unauthorized-domain`.
- Existing email authentication remains operational. No Firestore rules, Functions or 2.10.20 deployment changed.

# 2026-07-26 responsive game and World correction

- Play hero art now uses bounded phone/tablet heights instead of consuming the full viewport.
- Bubble Swarm uses a centered responsive game canvas on tablet and desktop while retaining the full phone playfield.
- World no longer stretches its Today layout into an empty white action area; quick actions use dark expedition cards.
- Phone, tablet and desktop browser checks passed without document overflow.
- V3 preview deployment `dpl_FUJ4RbRBe8V8zL1Hi5sm8HUJaXsS` is READY and aliased to `https://bugbaasv3.vercel.app`.
- Firebase configuration, Functions, rules and the live `bugbaas.vercel.app` deployment were not changed.

# 2026-07-26 complete local QA and European BugDex pass

- World, Scan, Play and Collection are viewport-locked at 390x844, 768x1024 and 1440x900 with no document overflow.
- Main dialogs, Buddy, missions, map, profile/settings and the available arcade flows were opened with the authenticated `test2` account.
- Web Runner now uses a dedicated scalable tunnel scene; Bubble Swarm and unavailable event states keep their artwork inside bounded containers.
- BugDex contains 249 entries, including 66 validated drop-only scan species. The latest seven are recognizable European bumblebees with localized names, facts and transparent art.
- Source/UI tests pass 265/265; server, API and Firebase Function tests pass 95/95; TypeScript and the Expo web export pass.
- Google login on localhost is still blocked by Firebase `auth/unauthorized-domain`; the UI now explains this without exposing the raw Firebase error. No Firebase setting was changed.
- This source is newer than the current preview. No Vercel, Firebase, APK or live 2.10.20 release was changed in this pass.

# 2026-07-26 BugBaas 3.0 QA release

- Deployment `dpl_AGrnxuJ1B2r9aosBUG7tYDixK3zk` is READY and aliased to `https://bugbaasv3.vercel.app`.
- Authenticated production checks passed for World, Scan, Play and Collection with the existing `test2` account.
- Collection renders 249 BugDex entries. Bubble Swarm starts and accepts real drag-to-shoot input.
- Research, Swarm Siege and Release Boss status Functions returned HTTP 200.
- Phone and desktop document dimensions match their viewports; browser, page and Vercel runtime error scans are clean.
- `bugbaas.vercel.app`, Firebase rules, Firebase Functions and the 2.10.20 deployment were not changed.

# 2026-07-28 FitnessSyncer source repair

- OAuth return validation now accepts `bugbaasv3.vercel.app` and the approved BugBaas 3.0 preview host.
- FitnessSyncer Activity parsing accepts case-insensitive type values and `distanceKM`, `distanceKm` or `distance_km`.
- Source changes are complete and locally tested. Firebase Functions are not deployed by this change.

# 2026-07-29 Vlindervangst gameplay and visual rework

- Vlindervangst staat alleen nog als zevende kaart in de gedeelde `Choose a game`-selector; de dubbele losse Play-kaart is verwijderd.
- Web en native gebruiken nu volgen, focus vasthouden en getimed loslaten in plaats van willekeurig tikken.
- De 3D-wereld, insectvluchten, geweven net, continue zwaaicurve en vanganimatie zijn vernieuwd met procedurele lichte materialen.
- Nieuwe imagegen-keyart is als 240 kB WebP toegevoegd voor de gamekaart en het startscherm.
- De actuele localhost-export draait op `http://localhost:8088`; er is in deze pass geen Vercel- of APK-release uitgevoerd.

# 2026-07-29 arcade-, Museum- en Daily-hotfix

- Bug Glide en Bug Tower reageren ongeveer 20% sneller; Glide, Tower, Web Runner en Nest Defense lopen nu via schermgesynchroniseerde animation frames.
- Museum haalt inventory en mastery bij openen geforceerd actueel op, zodat doelen niet meer tot twee minuten achterlopen.
- Iedere geclaimde Daily-puntenbeloning wordt weer als tappable foreground bug aangeboden.
- De vernieuwde localhost-export draait op `http://localhost:8088`; backend en productie zijn niet gewijzigd.

# 2026-08-01 BugBaas 3.0.6 production release

- BugBaas 3.0.6 is live op `https://bugbaas.vercel.app`; de productie-3D-game is op web ontgrendeld en gebruikt de lichte iPhone-audio/renderroute.
- BugScan gebruikt standaard GPT-5.6 Luna, accepteert een bruikbare onafhankelijke identificatie vanaf 70%, bewaart soorten buiten de BugDex voor developer-review en stelt daarna een weetjesvraag over de gevonden soort.
- Een geslaagde fotoscan vereist locatie, habitat en gedrag en slaat daarna de veldnotitie automatisch op. Weekly-, Research-, Event- en Museum-rewards gebruiken serverclaims en de vaste volgorde foreground-vangst gevolgd door ontdekt/+1 met bron.
- De benodigde Firestore-rules en zeven relevante Functions zijn gedeployed naar `thomascimpro-6266f`.
- Android 3.0.6 staat in `dist/BugBaas-3.0.6.apk`; Vleugeljacht 3D blijft daar vergrendeld met een link naar `https://bugbaas.vercel.app`.

# 2026-08-01 BugDex Nederland photo-candidate audit

- The catalog was compared with 928 verifiable Dutch iNaturalist species candidates across insects, arachnids, snails, pissebed/crustacean groups, centipedes and millipedes.
- The data-driven diff contains 828 missing specific cards after exact-name and known-alias checks: 273 P0, 305 P1 and 226 P2.
- The candidate data is stored in `docs/bugdex-nederland-photo-candidates.json`; the execution and review gates are in `docs/bugdex-nederland-honderden-plan.md`.
- The concrete asset-to-app checklist is in `docs/bugdex-nederland-asset-to-app-plan.md`, including batch checkpoints, subagent boundaries and the `in-app` Definition of Done.
- The current visual pilot has 28 processed 768x768 RGBA PNGs with alpha extrema `(0,255)` and contact-sheet review. They are not yet promoted to production catalog/art mappings.
- No deployment, APK, Firebase collection, badge path or existing reward path was changed by this audit.

# 2026-08-02 Eenduidige BugDex-beloningen en eventstart

- Iedere echte BugDex-beloning gebruikt nu dezelfde volgorde: eerst de vangbare foreground bug, daarna een scherm met `ontdekt` of `+1` en de concrete reden.
- Ook Buddy, weekmissies, combineren, punten-/rank-unlocks, radar en duel-seizoensbeloningen lopen door deze centrale wachtrij; gemiste vangsten worden opnieuw aangeboden.
- Ranked duels kunnen een Mythische bug geven en plaats 1 van het maandseizoen blijft een gegarandeerde echte Mythische beloning.
- Een actieve Swarm, Team Hunt of Release Boss-finale wordt per speler en event eenmaal duidelijk gemeld bij openen of terugkeren naar de app.
- Bron-, type- en webexportcontroles zijn geslaagd. Deze wijziging is niet gedeployed en niet op een fysiek toestel getest.

# 2026-08-02 BugBaas 3.0.7 production release

- BugBaas 3.0.7 staat live op `https://bugbaas.vercel.app`; root en `/butterfly-catch-3d/` geven HTTP 200 en de scanroute bewaakt requests met Firebase Auth.
- De runtime bevat 883 BugDex-soorten, waaronder 366 nieuwe gecontroleerde Nederlandse kaarten met transparante WebP-art en volledige appkoppeling.
- Vercel gebruikt de lichte iPhone-Safari-audio/renderroute. Android houdt Vleugeljacht 3D op slot en verwijst naar de live webversie.
- Firestore rules compileerden en zijn live op `thomascimpro-6266f`; de 70%-grens bleek al gelijk aan productie.
- Vercel deployment `dpl_7Zh4YHVqtK94qTz8ArmtWG8xKsiG` is `READY`; live bundle `AppEntry-37da2aadce3be500f62c35d91469be8a.js` bevat de nieuwste soort en het iPhone-tonepad.
- De installeerbare APK staat in `dist/BugBaas-3.0.7.apk` en is als versie 316/3.0.7 op de Small Phone-emulator gestart en geroteerd zonder crash.
