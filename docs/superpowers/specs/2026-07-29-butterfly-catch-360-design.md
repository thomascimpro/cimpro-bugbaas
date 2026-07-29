# BugBaas 360° Vlindervangst Prototype Design

## Doel

Bouw een losstaand browserprototype waarin de speler midden in een volledige 3D-bosweide staat, 360 graden kan rondkijken met telefoonoriëntatie en vlinders kan vangen met een vloeiend geanimeerd 3D-net.

Het prototype bewijst eerst de spelbeleving en prestaties. Het wordt nog niet gekoppeld aan Expo, Firebase, rewards of bestaande BugBaas-schermen.

## Productbesluit

Gebruik één lokale Three.js-scène die vanuit `prototypes/butterfly-catch-3d` wordt geserveerd.

- Telefoon draaien bestuurt kijkrichting via `deviceorientation`.
- De speler kan de huidige richting opnieuw als voorwaarts kalibreren.
- Slepen blijft beschikbaar als desktop- en permissiefallback.
- Tikken of klikken activeert één vloeiende netzwaai.
- Het vangpunt ligt in het midden van het beeld; het net is een zichtbare first-person animatie.
- De wereld is volledig 3D en bevat objecten dichtbij, op middenafstand en ver weg.
- Vlinders zijn procedureel opgebouwde 3D-modellen met meerdere vleugeldelen, patronen, lichaam en voelsprieten.
- Alle gameplay blijft lokaal. Er is geen multiplayer of opslag.

## Wereldopbouw

De speler staat stil in het midden van een cirkelvormige bosweide. Diepte ontstaat door verschillende ruimtelijke lagen:

1. Dichtbij: gras, bloemen, varens, stenen en kleine planten.
2. Middenafstand: struiken, boomstammen en lage begroeiing.
3. Ver weg: hogere bomen, heuvelvormen, een sky dome en atmosferische mist.

De grond gebruikt een licht vervormd heightfield. Objecten staan rondom de speler en niet alleen voor de startcamera. Zachte schaduwen, tone mapping en afstandsmist ondersteunen het 3D-gevoel zonder zware postprocessing.

## Vlinders

Iedere vlinder bestaat uit:

- twee voorvleugels en twee achtervleugels;
- procedurele vleugeltextuur met kleurverloop, aders en vlekpatroon;
- kop, borststuk en achterlijf;
- ogen en twee gebogen voelsprieten;
- onafhankelijke vleugelscharnieren voor een natuurlijke slag.

Vlinders vliegen over gesloten driedimensionale Catmull-Rom-routes. Snelheid, hoogte, grootte, kleur en route verschillen per vlinder. Na een vangst verdwijnt de vlinder kort en verschijnt daarna op een nieuwe routepositie zodat het prototype speelbaar blijft.

## Besturing

### Telefoonoriëntatie

- De knop `Start 360°` vraagt waar nodig sensorpermissie.
- Alpha, beta en gamma worden omgerekend naar een cameraquaternion.
- De eerste geldige meting vormt het kalibratiepunt.
- `Herkalibreer` gebruikt de actuele houding opnieuw als neutrale richting.
- Camerabeweging wordt met quaternion-slerp afgevlakt.
- Roll wordt beperkt zodat de horizon niet onrustig kantelt.

### Touch en muis

- Slepen verandert yaw en pitch.
- Een korte tik zonder sleep activeert het net.
- UI-knoppen mogen geen vangactie starten.
- De pitch wordt begrensd om omklappen te voorkomen.

## Vangnetje

Het net is een first-person 3D-object dat aan de camera hangt en bevat:

- houten steel met metaalverbinding;
- gedetailleerde torusrand;
- transparante draadmand met meerdere segmenten;
- zachte rustbeweging;
- een driedelige zwaai: optillen, snelle slag, gedempte terugkeer;
- motion trail via transparante randkopieën tijdens de snelle slag;
- korte impactreactie bij een vangst.

Tijdens het actieve slagvenster test een ray vanuit het schermmidden de hoek en afstand tot vangbare vlinders. Per zwaai kan maximaal één vlinder worden gevangen. Dit voorkomt dubbele scores en houdt de actie leesbaar.

## UI

- Compacte score linksboven.
- Status voor besturingsmodus en sensorpermissie.
- Knoppen voor `Start 360°`, `Herkalibreer` en `Volledig scherm`.
- Richtkruis in het midden.
- Korte besturingshint onderaan.
- Kleine FPS-indicator om prestaties op telefoon te controleren.

## Prestaties

- Three.js `0.180.0` via een vaste jsDelivr ESM-import.
- Pixelratio maximaal 2 en automatisch terug naar 1.25 wanneer de gemeten framerate langdurig laag is.
- Instanced meshes voor grote aantallen gras en bloemen.
- Geen externe GLB- of texturebestanden; alle modellen en patronen worden procedureel opgebouwd.
- Belangrijke objecten werpen schaduw; kleine begroeiing niet.
- Richtdoel: 30-60 FPS op een moderne Android-telefoon.

## Foutafhandeling

- Bij geweigerde sensorpermissie blijft drag-besturing actief.
- Bij ontbrekende `DeviceOrientationEvent` wordt de 360°-knop uitgeschakeld en geeft de status uitleg.
- Wanneer fullscreen niet beschikbaar is blijft de game speelbaar.
- Bij WebGL-initialisatiefout wordt een duidelijke melding getoond in plaats van een leeg scherm.

## Test en acceptatie

Statische Node-tests controleren minimaal:

- vaste Three.js-versie;
- sensorpermissie en `deviceorientation`-listener;
- kalibratie- en quaternioncode;
- volledige wereldbouwers voor terrein, vegetatie en sky dome;
- geavanceerde vlinderbouw met voor- en achtervleugels;
- vloeiende netanimatie en één-vangst-per-zwaai;
- touchfallback, richtkruis en fullscreenknop.

Handmatige acceptatie:

1. Desktop: volledig 360 graden rondkijken door te slepen.
2. Telefoon: `Start 360°` activeert rondkijken door de telefoon te draaien.
3. `Herkalibreer` maakt de actuele richting neutraal.
4. Objecten zijn zichtbaar rondom en op meerdere afstanden.
5. Vlinders tonen duidelijke vleugelpatronen en vloeiende 3D-routes.
6. Een tik toont een vloeiende HD-netzwaai en vangt hoogstens één vlinder.
7. De bestaande BugBaas-app en Firebase blijven onaangeraakt.
