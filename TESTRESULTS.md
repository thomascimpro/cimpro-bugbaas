# Test Results

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
- Firebase project: `thomascimpro-6266f` actief in `.firebaserc`.
- Firebase Android app: `1:508370199825:android:469f30507a5623e281d8b0` gevonden via CLI.
- Firestore database: `(default)` bestaat als `STANDARD` / `FIRESTORE_NATIVE`.
- `firebase deploy --only firestore:rules --project thomascimpro-6266f`: geslaagd.
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
- `firebase deploy --only firestore:rules --project thomascimpro-6266f`: geslaagd; rules compileerden en zijn live.
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
- Actief project: `thomascimpro-6266f`.
- Android app aanwezig: `1:508370199825:android:469f30507a5623e281d8b0`.
- Firestore database aanwezig: `(default)`, `STANDARD`, `FIRESTORE_NATIVE`.
- `firestore.indexes.json` toegevoegd en gekoppeld in `firebase.json`.
- `firebase deploy --only firestore --project thomascimpro-6266f`: geslaagd.
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
  - `508370199825-tp4jcs7iacabpp45ulhfm44ef2mi0rkh.apps.googleusercontent.com`.
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
  - `508370199825-70k6pl884r7cei7tn27qrlda953794qa.apps.googleusercontent.com`.
- `assembleRelease`: geslaagd met ingebakken JS bundle.
- APK gekopieerd naar `release/CimPro-BugBaas-0.1.0.apk`.
- APK-grootte: circa 58 MB.
- `apksigner verify --print-certs`: geslaagd; SHA-1 matcht Firebase.
- Pixel 8 APK install: geslaagd.
- Pixel 8 standalone launch: geslaagd voor package `nl.cimpro.bugbaas`.
- Pixel 8 e-mail accountcreate via APK: geslaagd; Home laadde gedeelde Firebase-ranking.
- Screenshotbewijs:
  - `pixel8-apk-release-login.png`.
  - `pixel8-apk-release-home.png`.
- Gefilterde logcat-check: geen app-crash, React Native JS-fout, FirebaseError, `permission-denied` of low-memory kill gevonden.
