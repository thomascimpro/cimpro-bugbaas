# Tiers

CimPro BugBaas gebruikt eigen insect-tiers. Punten komen uit bugmeldingen en statuswijzigingen.

## Tiers

- `Larve` vanaf 0 punten: startniveau.
- `Keverscout` vanaf 25 punten: eerste echte bugvinder.
- `Sprinkhaan Specialist` vanaf 75 punten: snelle reproduceerbare meldingen.
- `Libelle Leider` vanaf 150 punten: overzicht en statusdiscipline.
- `Opperbugmeister` vanaf 300 punten: hoogste tier.

## Werking

- Nieuwe bug krijgt punten op basis van urgentie.
- `Bevestigd` en `In behandeling` geven extra punten.
- `Gefixt` geeft hoogste bonus.
- `Afgekeurd` en `Dubbel` zetten bugpunten op 0.
- Profiel, Home en Ranglijst tonen tier, insectbeeld en voortgang.
- Nummer 1 in de ranglijst toont altijd `Opperbugmeister` als leaderboard-label.

## Visuals

- Elke tier heeft eigen insectvariant en kleur.
- Elke hogere tier toont een grotere bug met meer details:
  - grotere body en hit area;
  - extra shell-details vanaf `Keverscout`;
  - aura vanaf `Sprinkhaan Specialist`;
  - vleugels vanaf `Libelle Leider`;
  - kroon bij `Opperbugmeister`.
- Insecten zijn lokaal opgebouwd met React Native views.
- Bewegende bugs lopen subtiel over het scherm zonder knoppen te blokkeren.
