# BugBaas Real Bug Scan

Productieflow voor het fotograferen van een echte bug, herkenning via OpenAI en koppeling aan de bestaande BugDex.

## Gebruikersflow

1. Gebruiker opent de onderste tab `BugScan`.
2. Gebruiker maakt met de camera één foto van één echte bug.
3. De app verkleint de foto naar maximaal 768 px en JPEG-kwaliteit 0,60.
4. Foto's boven circa 750 kB krijgen een fallback van maximaal 640 px en kwaliteit 0,50.
5. De app blokkeert een lokaal identieke voorbereide foto die dezelfde dag al succesvol is verstuurd.
6. De Vercel API controleert het Firebase ID-token.
7. De API reserveert vóór OpenAI maximaal drie scans per gebruiker per dag in `Europe/Amsterdam`.
8. OpenAI ontvangt een compacte BugDex-catalogus, de foto met detail `high` en een strikt JSON-schema.
9. Alleen een bestaande BugDex-ID met minimaal 86% zekerheid wordt automatisch geaccepteerd.
10. Een geldige vondst telt voor daily mission `Spot 1 echte bug`.

De verborgen webroute `/?real-bug-scan=1` en `/real-bug-scan` blijft beschikbaar voor directe technische tests. De officiële app gebruikt de onderste `BugScan`-tab.

## Resultaten

- `matched`: soort is betrouwbaar aan de BugDex gekoppeld.
- `already_spotted`: gebruiker heeft deze echte soort al eerder gescand.
- `not_in_catalog`: specifieke soort is betrouwbaar herkend, maar ontbreekt nog in de BugDex.
- `pending_review`: er is waarschijnlijk een bug zichtbaar, maar automatische koppeling is niet betrouwbaar genoeg.
- `rejected_no_bug`: geen duidelijke bug zichtbaar.
- `rejected_quality`: foto is te onduidelijk.

De daily telt `matched`, `already_spotted`, `not_in_catalog` en `pending_review`. Afgekeurde foto's en API-fouten tellen niet voor de missie.

## Opslag en privacy

Normale succesvolle foto's worden niet opgeslagen. Bij een betrouwbaar herkende soort buiten de catalogus kan alleen een 320px review-thumbnail met JPEG-kwaliteit 0,35 worden opgeslagen in `pendingBugDexDiscoveries`.

Gebruikte Firestore-documenten:

```text
users/{uid}/realBugScanServerUsage/{YYYY-MM-DD}
users/{uid}/realBugScanProgress/{YYYY-MM-DD}
pendingBugDexDiscoveries/{scanId}
```

`realBugScanServerUsage` kan alleen oplopen van 1 naar maximaal 3. De client kan de teller niet verlagen. Een poging blijft verbruikt wanneer OpenAI of een volgende stap faalt; dit voorkomt dat een aangepaste client quota onbeperkt kan resetten.

## Benodigde environment variables

Lokaal in `.env.real-bug-scan.local`:

```dotenv
OPENAI_API_KEY=<server-only key>
OPENAI_BUG_SCAN_MODEL=gpt-5.6-luna
FIREBASE_API_KEY=<BugBaas Firebase web API key>
FIREBASE_PROJECT_ID=thomascimpro-6266f
BUG_SCAN_ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006
BUG_SCAN_API_PORT=8787
```

Vercel Production:

```text
OPENAI_API_KEY
OPENAI_BUG_SCAN_MODEL
FIREBASE_API_KEY
FIREBASE_PROJECT_ID
BUG_SCAN_ALLOWED_ORIGINS=https://bugbaas.vercel.app
```

De OpenAI-key hoort nooit in Expo `extra`, browsercode, Git of een APK.

## Lokaal starten

Terminal 1:

```powershell
npm.cmd run bug-scan:api
```

Terminal 2:

```powershell
npx.cmd expo start --web
```

De normale app gebruikt lokaal:

```dotenv
REAL_BUG_SCAN_API_BASE_URL=http://localhost:8787
```

## API-contract

Request:

```http
POST /api/real-bug-identify
Authorization: Bearer <Firebase ID token>
Content-Type: application/json
```

```json
{
  "scanId": "realbug_...",
  "imageDataUrl": "data:image/jpeg;base64,..."
}
```

Response:

```json
{
  "ok": true,
  "scanId": "realbug_...",
  "status": "matched",
  "remainingScans": 2,
  "identification": {
    "bugId": "lieveheersbeestje",
    "commonName": "Lieveheersbeestje",
    "scientificName": "Coccinellidae",
    "confidence": 0.93,
    "reason": "Rode dekschilden met zwarte stippen."
  }
}
```

HTTP `429` betekent daglimiet of dubbele scan-ID. OpenAI wordt dan niet aangeroepen.

## Belangrijkste bestanden

```text
src/screens/RealBugScanScreen.tsx
src/services/realBugScanService.ts
src/services/realBugScanContract.ts
src/services/realBugScanImagePolicy.ts
src/services/realBugScanFingerprint.ts
src/services/realBugScanProgress.ts
server/realBugScan/firebaseUsageStore.mjs
server/realBugScan/handler.mjs
server/realBugScan/openaiVision.mjs
api/real-bug-identify.js
shared/bugdex-catalog.json
```

## Tests

```powershell
npm.cmd run typecheck
npm.cmd run test:real-bug-scan
npx.cmd expo export --platform web --output-dir dist-vercel-release
android\gradlew.bat -p android :app:processDebugResources --console=plain
```

Een echte end-to-end herkenning vereist een geldige OpenAI-key, een ingelogde Firebase-gebruiker, gepubliceerde Firestore rules en de Vercel environment variables hierboven.
