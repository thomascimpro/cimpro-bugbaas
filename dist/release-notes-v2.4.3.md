# BugBaas 2.4.3

![BugBaas 2.4 update](https://github.com/thomascimpro/cimpro-bugbaas/releases/download/v2.4.3/bugbaas-2.4.0-release-card.png)

## Grootste wijzigingen sinds 2.3
- Random Duel (beta): speel direct je score open. Als er nog geen open random duel is, zet de app een random duel-record in Firebase zodat een collega later dezelfde seed kan oppakken.
- BugDex sets: collectie-filters, voortgang per set en nieuwe setbadges.
- Reward claims: foreground BugDex unlocks, radar, daily login, duel en weekly reward claims zijn robuuster gemaakt.
- Weekly missions: oude report/fix-missies zijn opgeschoond; nieuwe doelen focussen op 15/30/45/60 km, duels en Solo Campaign waves.
- Solo Campaign: weekly reset naar wave 1 is expliciet gemaakt en lives/progress worden consistenter opgeslagen.
- Health Connect: opnieuw permissies checken staat nu bij settings.

## 2.4.3 hotfix
- Handmatig ingevoerde Google Fit/Health Connect stappen tellen niet meer mee voor movement rewards.
- Echte telefoon/watch-stappen blijven meetellen via automatisch of actief gemeten Health Connect records.

## Installatie
- Package blijft `nl.cimpro.bugbaas`.
- APK blijft legacy/debug signed voor compatibiliteit met bestaande 1.x/2.x installs.
