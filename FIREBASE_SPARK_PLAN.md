# Firebase Spark Plan

Uitgangspunt: CimPro BugBaas moet werken op Firebase Spark/free plan.

## Toegestaan in V1

- Firebase Authentication met e-mail/wachtwoord.
- Firebase Authentication met Google provider.
- Cloud Firestore voor `users` en `bugs`.
- Auth session persistence via `@react-native-async-storage/async-storage`.
- Firestore security rules in `firestore.rules`.
- Firestore indexconfig in `firestore.indexes.json`.
- Gecomprimeerde screenshot-thumbnail als data-URL in Firestore.
- Client-side puntenberekening en statusupdates.

## Niet gebruiken

- Cloud Functions.
- Cloud Storage for Firebase.
- Firebase Extensions.
- Data Connect, Cloud Run, BigQuery streaming, Pub/Sub of andere betaalde Google Cloud features.
- Phone Auth/SMS flows.
- Firestore TTL deletes, PITR, backups, restores of clones.
- Server-side image processing.

## Spark-limieten om rekening mee te houden

Bronnen, geraadpleegd op 2026-06-02:

- https://firebase.google.com/pricing
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- https://firebase.google.com/docs/storage/web/start
- https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024

- Authentication: tot 50K MAU voor normale Auth-services; extra Identity Platform-limieten kunnen gelden.
- Firestore Standard:
  - 1 GiB opgeslagen data.
  - 50K document reads per dag.
  - 20K document writes per dag.
  - 20K document deletes per dag.
  - 10 GiB outbound data per maand.
- Cloud Storage for Firebase: Firebase docs geven aan dat nieuwe default buckets Blaze vereisen en dat legacy `*.appspot.com` buckets vanaf 2026 Blaze nodig hebben om toegang te houden. Daarom gebruikt V1 geen Storage onder Spark.
- Cloud Functions: niet beschikbaar op Spark.

## Screenshotbeleid

- Screenshots worden client-side verkleind naar maximaal 640 px aan de langste zijde.
- Screenshots worden als JPEG opgeslagen met compressie `0.35`.
- Originele screenshots worden niet apart bewaard.
- Per bug maximaal 1 screenshot.
- Screenshot data-URL mag maximaal 900K tekens zijn om onder de Firestore documentlimiet te blijven.

## Wanneer Blaze nodig wordt

- Als Firestore quota structureel worden overschreden.
- Als echte screenshotbestanden, meerdere screenshots of grotere afbeeldingen nodig zijn: gebruik Blaze + Cloud Storage.
- Als server-side taken nodig zijn, zoals automatische image processing, notificaties, scheduled cleanup of auditlog-verwerking.
- Als Cloud Functions, Extensions, Cloud Run, BigQuery streaming, Data Connect of betaalde Google Cloud features nodig worden.
- Als Firebase Console aangeeft dat billing nodig is voor gekozen regio, buckettype of feature.

## Productkeuzes voor Spark

- App config gebruikt project `thomascimpro-6266f`.
- Firebase Console Authentication > Sign-in method > Email/Password is nodig en is live getest via Auth signup.
- Firebase Console Authentication > Sign-in method > Google is nodig. Dit blijft binnen Spark; er zijn geen Cloud Functions nodig.
- Voor native Android Google-login is een OAuth client met package `nl.cimpro.bugbaas` en SHA-1 nodig. Expo Go kan de volledige Google OAuth-flow niet afronden voor dit project omdat `host.exp.exponent` + Expo Go SHA al in een ander OAuth project bestaat.
- Deploy Firestore config met `firebase deploy --only firestore`.
- Statusupdates zijn beperkt tot de reporter van de bug. Zonder Cloud Functions blijft volledige anti-cheat niet afdwingbaar.
- Houd data klein: geen grote logs, geen duplicaat screenshots, geen full-text history.
- Gebruik eenvoudige queries; vermijd dure live listeners voor V1.
- Voeg later paginering toe zodra buglijsten groot worden.
- Monitor Firebase usage tab wekelijks bij pilotgebruik.
- Verwijder of vervang screenshots als Firestore opslag richting 1 GiB gaat.

## Lokale CLI eisen

- Firebase CLI is aanwezig.
- Firestore emulator vereist Java 21 of hoger. Zonder Java 21 kan rules-emulatorvalidatie lokaal niet draaien.
