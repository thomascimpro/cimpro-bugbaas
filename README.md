# BugBaas

Android-first Expo/React Native app voor interne bugmeldingen, statusopvolging, punten, ranglijst en BugDex.

## Officiële 3.x-bron

Vanaf release 3.0.1 is `C:\Users\thoma.THOMAS\Documents\Codex\CimPro BugBaas-3.0` de canonieke bronmap voor alle BugBaas 3.x APK-builds en deployments naar `bugbaasv3.vercel.app`.

Uitgangspunt: Firebase Spark/free plan. Zie `FIREBASE_SPARK_PLAN.md`.
Tierwerking staat in `TIERS.md`.

## Setup

1. Installeer dependencies:
   ```bash
   npm install
   ```
2. Maak lokale env-config:
   ```bash
   cp .env.example .env
   ```
   Vul daarna deze waarden in `.env`:
   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_ANDROID_CLIENT_ID`
3. Firebase staat gekoppeld via `FIREBASE_PROJECT_ID`.
   Controleer in Firebase Console:
   - Authentication > Sign-in method > Email/Password > Enabled
   - Authentication > Sign-in method > Google > Enabled
   - Firestore database `(default)` bestaat
4. Deploy Firestore security rules en indexes:
   ```bash
   firebase deploy --only firestore --project "$FIREBASE_PROJECT_ID"
   ```
   Optioneel voor lokale Firebase CLI aliases: kopieer `.firebaserc.example` naar `.firebaserc` en vul lokaal project-id in.
5. Start:
   ```bash
   npm run start
   ```

Gebruik geen Cloud Functions, Cloud Storage of Blaze-only features voor V1. Screenshots worden client-side verkleind en als kleine JPEG data-URL in Firestore opgeslagen.

## Meldingen op Firebase Spark

BugBaas gebruikt `expo-notifications` en Firestore-notificatiedocumenten. Dit blijft binnen Firebase Spark:

- App open: nieuwe notificaties verschijnen als ingame toast/banner.
- App op achtergrond: de app probeert direct een local Android notification te tonen met high-importance channel, geluid en vibratie.
- App volledig dicht: niet gegarandeerd en niet ondersteund zonder server push.

Waarom niet volledig dicht op Spark:

- Firestore listeners maken een gesloten Android-app niet wakker.
- Echte push naar gesloten apps vraagt FCM/server-triggering.
- Zonder Cloud Functions of eigen server is dat niet betrouwbaar te maken.

Conclusie: dit is de maximale Spark/free implementatie zonder Blaze, Cloud Functions, server-side push of extra dependencies.

## Runtime config

- Expo leest `app.config.js`.
- `app.config.js` vult `expo.extra` vanuit `.env`/environment variables.
- Runtime keys blijven gelijk: `firebaseApiKey`, `firebaseAuthDomain`, `firebaseProjectId`, `firebaseMessagingSenderId`, `firebaseAppId`, `googleClientId`, `googleAndroidClientId`.
- `.env` mag niet naar GitHub; `.env.example` bevat alleen lege placeholders.
- Zet `BUGBAAS_REQUIRE_ENV=1` bij release-builds zodat de build faalt als verplichte Firebase/Google env vars ontbreken.

## Google login

- `.env` bevat een web OAuth client en Android OAuth client.
- De Android client is gekoppeld aan package `nl.cimpro.bugbaas`.
- De eerste interne APK gebruikt debug signing met SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
- Volledige Google-login moet getest worden met een dev build of standalone Android build. Expo Go gebruikt package `host.exp.exponent`; Google blokkeert die OAuth-combinatie voor dit Firebase project.

## Interne APK

- Laatste BugBaas APK staat op GitHub Releases: https://github.com/thomascimpro/cimpro-bugbaas/releases
- Release-stappen staan in `ANDROID_RELEASE_RUNBOOK.md`.
- APK is bedoeld voor GitHub Releases en handmatige installatie door collega's.
- Android vraagt gebruikers om installatie uit onbekende bron toe te staan.
- Iedereen gebruikt het Firebase project uit `FIREBASE_PROJECT_ID`, dus gebruikers, bugs, upvotes en ranglijst zijn gedeeld.
- Build lokaal:
  ```powershell
  cd android
  $env:BUGBAAS_REQUIRE_ENV='1'
  .\gradlew.bat assembleRelease
  ```

## Scripts

- `npm run start`: Expo dev server
- `npm run android`: Expo op Android
- `npm run typecheck`: TypeScript check
