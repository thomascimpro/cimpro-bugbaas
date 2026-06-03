# Decisions

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
