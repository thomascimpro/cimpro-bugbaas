# Bug Brain Ranked Duel — ontwerp

Datum: 2026-07-26
Status: klaar voor review

## Doel

Vervang de huidige dagelijkse Bug Brain-run door een echte ranked multiplayergame die dezelfde duel-, matchmaking-, rating- en resultaatflow gebruikt als de andere BugBaas-games.

De game bestaat uit vijf vragen. Beide spelers krijgen binnen hetzelfde duel exact dezelfde vraagset en antwoordvolgorde. Een goed antwoord levert punten op; sneller goed antwoorden levert extra punten op. Er is geen trainingsmodus en geen dagelijkse limiet.

## Gekozen aanpak

### Aanbevolen en gekozen: bestaande `bugSmashDuels` uitbreiden

Bug Brain wordt een extra ranked spelmodus binnen het bestaande asynchrone duelsysteem. De eerste speler speelt direct. De tegenstander kan later spelen en krijgt exact dezelfde vijf vragen. Zodra beide scores zijn opgeslagen, bepaalt de bestaande duelresultaatflow de winnaar, ratingwijziging en rewards.

Dit is beter dan een aparte quizcollectie omdat:

- matchmaking en random opponents al bestaan;
- pending, accepted en completed duels al bestaan;
- rating, winst/verlies, resultaatmeldingen en rewards al bestaan;
- Firestore-regels en schermnavigatie dezelfde patronen kunnen volgen;
- er geen tweede concurrerend multiplayerframework ontstaat.

Afgewezen alternatieven:

1. **Aparte `quizDuels`-collectie:** duidelijk gescheiden, maar dupliceert matchmaking, rating, notifications en claims.
2. **Live gelijktijdig duel:** spannender, maar vereist presence, reconnects, timersynchronisatie en veel extra foutafhandeling. Niet nodig voor de eerste goede versie.

## Spelregels

- Een ranked Bug Brain-duel bevat precies **5 vragen**.
- Elke vraag heeft **4 antwoordopties**.
- Per vraag geldt een limiet van **12 seconden**.
- Beide spelers krijgen dezelfde vragen, dezelfde volgorde en dezelfde antwoordvolgorde.
- Na een keuze wordt die vraag direct vastgezet; wijzigen is niet mogelijk.
- Na 12 seconden zonder antwoord telt de vraag als fout.
- Er zijn geen levens. Alle vijf vragen worden altijd gespeeld.
- Er is geen training, replay of dagelijkse variant.

### Score per vraag

- Fout of geen antwoord: **0 punten**.
- Goed antwoord: **1000 basispunten**.
- Snelheidsbonus: maximaal **500 punten**.
- Formule: `1000 + round(500 * resterendeTijdMs / 12000)`.
- Maximum per vraag: **1500 punten**.
- Maximum per duel: **7500 punten**.

De teller start pas nadat de vraag en alle antwoordknoppen zichtbaar zijn. Overgangen tussen vragen tellen niet mee.

### Winnaar en gelijkspel

1. Hoogste totaalscore wint.
2. Bij gelijke score wint de speler met de laagste totale antwoordtijd op correct beantwoorde vragen.
3. Zijn ook die tijden gelijk, dan is het duel een gelijkspel.

De inzendtijd van de gehele run is geen tiebreaker, zodat netwerkvertraging geen voordeel of nadeel geeft.

## Randomisatie en vraagset

- Elk duel krijgt een vaste `arcadeSeed` op basis van duel-ID en `arcadeVersion`.
- De vraagset wordt deterministisch uit de gevalideerde quizpool opgebouwd.
- Binnen één duel komen geen dubbele vragen voor.
- Een nieuw duel krijgt een nieuwe seed en daardoor normaal gesproken een andere set.
- De volledige vijf-vragenset wordt niet vooraf in de UI getoond.
- Beide spelers reconstrueren dezelfde set uit de opgeslagen seed en versie.
- `arcadeVersion` maakt toekomstige wijzigingen aan vragen of scoreformule mogelijk zonder oude duels te breken.

## Firebase-datamodel

Bug Brain wordt toegevoegd als nieuw arcade/ranked type:

```ts
ArcadeMode = ... | "bug_brain"
```

Bestaande `bugSmashDuels/{duelId}` blijft de bron van waarheid.

Aanvullende velden op het duel:

```ts
arcadeMode: "bug_brain"
arcadeSeed: string
arcadeVersion: 1
durationMs: 60000
```

Aanvullende optionele velden per spelerscore:

```ts
correctAnswers?: number
answerTimesMs?: number[]
questionResults?: Array<{
  questionId: string
  correct: boolean
  responseMs: number
  awardedScore: number
}>
```

De bestaande velden blijven behouden:

```ts
score
submittedAt
bonusScore
caughtBugIds
```

Voor Bug Brain is `caughtBugIds` leeg en is `bonusScore` de som van snelheidsbonussen. Hiermee blijven bestaande resultaat- en rewardcode compatibel.

## Integriteit en opslag

- De duel-seed en versie worden bij het aanmaken opgeslagen en mogen daarna niet veranderen.
- Een speler mag zijn score maar één keer indienen.
- Ingediende scores en vraagresultaten zijn daarna immutable.
- Alleen beide deelnemers mogen het duel lezen en hun eigen score schrijven.
- De score moet exact overeenkomen met de meegestuurde vijf vraagresultaten en de vaste scoreformule.
- Firestore-regels worden alleen additief aangepast voor `bug_brain`; bestaande write-rechten worden niet verruimd.
- Rating en rewards blijven idempotent via de bestaande dueltransactie en reward-eventstructuur.

De eerste implementatie gebruikt hetzelfde integriteitsniveau als de huidige ranked games: vaste seed, eenmalige score-inzending, restrictieve rules en transactionele winnaar/ratingverwerking. Er wordt geen claim gedaan dat client-tampering volledig onmogelijk is zonder aparte servervalidator.

## Navigatie en unlock

- De bestaande **Quiz-tab** onder Play blijft bestaan als visuele ingang.
- De dagelijkse teksten en dagelijkse poging verdwijnen volledig.
- De hoofdknop wordt **START RANKED QUIZ**.
- De knop start een random ranked duel met `arcadeMode: "bug_brain"`.
- Openstaande quizduels verschijnen in dezelfde duelacties, badges en resultaatflow als andere ranked duels.
- De game ontgrendelt tegelijk met ranked duels bij **10 unieke BugDex-soorten**.
- Voor unlock toont de Quiz-tab dezelfde duidelijke locked-status als Duel en Ranking.
- Tijdens een actieve run is sluiten of teruggaan geblokkeerd, net als bij andere ranked games.

## Game-view

De huidige Bug Brain-visuals blijven de basis, maar de inhoud wordt een echte wedstrijdinterface.

### Voor start

- Tegenstander of “random opponent zoeken”.
- Ranked-label en rating.
- Uitleg: 5 vragen, sneller goed = meer punten.
- Eén primaire knop: **START DUEL**.

### Tijdens het spel

- Bovenbalk: `Vraag 1/5`, totaalscore en resterende tijd.
- Grote, goed leesbare vraagkaart.
- Vier grote antwoordknoppen met minimaal 48 px touchhoogte.
- Na antwoord: correct/fout-kleur en behaalde punten kort tonen.
- Daarna automatisch door naar de volgende vraag; geen extra “volgende”-knop.
- Geen tegenstanderscore tijdens de run, zodat later spelende spelers geen tactisch voordeel krijgen.

### Na het spel

- Eigen score, correcte antwoorden en totale antwoordtijd.
- Status: wachten op tegenstander of definitieve uitslag.
- Bij complete uitslag: winst/verlies/gelijkspel, ratingdelta en reward.
- Geen replayknop voor hetzelfde duel.

## Verwijderen van de dagelijkse versie

De volgende onderdelen worden niet langer gebruikt:

- `bugBrainDailyAttempts`
- `bugBrainDailyClaims`
- daily start/claim-service
- daily intro- en closed-state
- dagelijkse XP-claim

Bestaande documenten blijven staan voor compatibiliteit en worden niet verwijderd. De app leest of schrijft deze paden niet meer.

## Foutafhandeling

- Geen tegenstander gevonden: duidelijke retry zonder duel te verliezen.
- Verbinding weg voor score-inzending: lokale runresultaten tijdelijk vasthouden en opnieuw indienen.
- Duel al ingevuld: bestaande score tonen, niet overschrijven.
- Oude of onbekende `arcadeVersion`: duel niet starten en veilige foutmelding tonen.
- Minder dan vijf geldige vragen beschikbaar: duelcreatie afbreken voordat een score kan worden gespeeld.
- Firestore permission error: concrete melding en geen lokale nepwinst of XP.

## Tests en acceptatiecriteria

### Unit-tests

- Exact vijf unieke vragen per seed.
- Zelfde seed geeft dezelfde vragen en opties.
- Andere duel-ID geeft een andere set.
- Scoreformule bij 0 ms, 6000 ms en 12000 ms resterend.
- Fout antwoord geeft nul punten.
- Tiebreaker gebruikt totale correcte antwoordtijd.
- Speler kan maar één score indienen.

### Structuur- en rule-tests

- `bug_brain` is een geldige ranked mode.
- Seed en versie zijn immutable.
- Alleen eigen score kan worden toegevoegd.
- Score kan niet worden overschreven.
- Resultaat, rating en reward worden maar één keer toegepast.

### Playwright op localhost:8083

- 360 × 800, 412 × 915 en 800 × 1280.
- Quiz-tab locked onder tien soorten en unlocked vanaf tien.
- Start random ranked quiz.
- Vijf vragen volledig spelen.
- Timer en snelheidsscore zichtbaar controleren.
- Terug/close tijdens run geblokkeerd.
- Pending-resultaat na eerste speler.
- Tweede testspeler krijgt dezelfde vragen.
- Definitieve winnaar en rating worden opgeslagen.
- Nieuw duel levert een andere vraagset.

## Buiten scope

- Live gelijktijdig spelen.
- Voice-over of gesproken vragen.
- Spectator mode.
- Eigen categorie kiezen.
- Trainingsmodus.
- Wereldwijde quizranglijst naast de bestaande ranked rating.
