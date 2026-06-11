# Test Results

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
- `firebase.cmd deploy --only firestore:rules --project thomascimpro-6266f`: geslaagd.
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
- `firebase.cmd deploy --only firestore:rules --project thomascimpro-6266f`: geslaagd.
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
