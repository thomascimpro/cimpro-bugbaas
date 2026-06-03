# CimPro BugBaas

Android-first Expo/React Native app voor interne bugmeldingen, statusopvolging, punten en ranglijst.

Uitgangspunt: Firebase Spark/free plan. Zie `FIREBASE_SPARK_PLAN.md`.
Tierwerking staat in `TIERS.md`.

## Setup

1. Installeer dependencies:
   ```bash
   npm install
   ```
2. Controleer Firebase waarden in `app.json` onder `expo.extra`.
   De app staat nu ingesteld op project `thomascimpro-6266f`.
3. Firebase staat gekoppeld aan project `thomascimpro-6266f`.
   Controleer in Firebase Console:
   - Authentication > Sign-in method > Email/Password > Enabled
   - Authentication > Sign-in method > Google > Enabled
   - Firestore database `(default)` bestaat
4. Deploy Firestore security rules en indexes:
   ```bash
   firebase deploy --only firestore
   ```
5. Start:
   ```bash
   npm run start
   ```

Gebruik geen Cloud Functions, Cloud Storage of Blaze-only features voor V1. Screenshots worden client-side verkleind en als kleine JPEG data-URL in Firestore opgeslagen.

## Google login

- `app.json` bevat een web OAuth client en Android OAuth client.
- De Android client is gekoppeld aan package `nl.cimpro.bugbaas`.
- De eerste interne APK gebruikt debug signing met SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
- Volledige Google-login moet getest worden met een dev build of standalone Android build. Expo Go gebruikt package `host.exp.exponent`; Google blokkeert die OAuth-combinatie voor dit Firebase project.

## Interne APK

- Eerste APK: `release/CimPro-BugBaas-0.1.0.apk`.
- APK is bedoeld voor GitHub Releases en handmatige installatie door collega's.
- Android vraagt gebruikers om installatie uit onbekende bron toe te staan.
- Iedereen gebruikt hetzelfde Firebase project `thomascimpro-6266f`, dus gebruikers, bugs, upvotes en ranglijst zijn gedeeld.
- Build lokaal:
  ```bash
  cd android
  .\gradlew.bat assembleRelease
  ```

## Scripts

- `npm run start`: Expo dev server
- `npm run android`: Expo op Android
- `npm run typecheck`: TypeScript check
