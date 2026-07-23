# BugBaas Museum Redesign Design

**Status:** Proposed for implementation

**Goal:** Replace the current card-heavy Museum screen with a compact, room-based collection experience where discovered insects are the visual focus.

## Problem

The current Museum looks like another dashboard instead of a museum. `museum-gallery-v2.png` is cropped into a short hero, specimen art is too small, wing progression resembles form controls, and three dark exhibit cards repeat the same jar layout. The `Arena-reservaat` also duplicates active squad information that belongs under Play.

The recent-find selection is incorrect because inventory is sorted newest-first while the screen uses `owned.slice(-3).reverse()`, which selects the oldest items.

## Product boundaries

- Museum remains read-only over existing BugDex inventory.
- Do not add Firestore collections, writes, rewards or claim actions.
- Do not show or edit active squad, trading or upgrades in Museum.
- BugDex remains the functional collection owner; Museum is the visual presentation layer.
- Reuse existing insect art and rarity metadata.
- New generated art must be text-free and bundled locally.
- Android-first at `360x800`; also verify `412x915` and web.
- No new UI or animation dependency.

## Recommended direction

Build one selected museum room at a time instead of stacking generic exhibit cards. The screen has four layers:

1. compact collection header and next-wing progress;
2. horizontally scrollable wing selector;
3. large selected room scene with two or three responsive specimen displays;
4. compact collection wall for the remaining discovered species.

The selected room is the visual hero. Bugs use `BugArtImage` directly and are displayed at an effective size of at least 90 px on a 360 px viewport.

## Information architecture

### Header

Show:

- back action;
- `Mijn Museum`;
- discovered-species count;
- next wing name;
- one progress bar with remaining species count.

Target height: 110-140 px. Remove the large animated light beam and long welcome block.

### Wing selector

Four horizontally scrollable wing tiles:

- Ontdekkershal: unlock at 1 species;
- Glazen kas: unlock at 6 species;
- Nachtkabinet: unlock at 10 species;
- Grote galerij: unlock at 15 species.

Each tile shows a text-free wing icon, name and one state label: `OPEN`, `<N> NODIG` or `VOLTOOID`. Selected state uses the shared gold accent and a subtle scale or border change. Do not use placeholder characters such as `*` or `o`.

### Selected room

The room uses a full-width background image with intentional empty zones for dynamic specimen displays. React Native renders room objects, insect art, labels and locked states as separate layers.

Room identities:

- Ontdekkershal: warm wood, morning light, approachable first discoveries;
- Glazen kas: glass, plants, dew and bright emerald tones;
- Nachtkabinet: dark blue and violet moonlight;
- Grote galerij: deep green, gold and restrained premium presentation.

The room scene may contain two displays at 360 px and three at larger widths. Displays use a room-specific case, frame or pedestal rather than putting every species in the existing squad jar.

### Recent discovery

Show one prominent latest discovery near the room entrance. Use the newest inventory item based on `lastUnlockedAt`. Optional secondary items may appear only when space allows.

Correct selection:

```ts
const recentFinds = owned.slice(0, 3);
```

### Collection wall

Below the room, show a two-column grid of discovered species. Each item contains:

- insect art;
- species name;
- rarity signal through border or glow;
- compact duplicate count when count is greater than one.

Tapping an item should use the existing BugDex detail flow when a suitable callback is available. The first release may remain read-only if adding navigation would expand scope.

### Locked and empty displays

Locked slots use a quiet recessed niche, silhouette and lock state. Use `Nog niet ontdekt` once per display; avoid dominant question marks.

## Component boundaries

### `src/screens/MuseumScreen.tsx`

Owns inventory loading, selected-wing state and screen composition. It should not contain inventory sorting rules or large repeated display markup.

### `src/screens/MuseumScreenModel.ts`

Pure functions and types:

```ts
export type MuseumWingId = "discovery" | "greenhouse" | "night" | "grand";

export type MuseumWing = {
  id: MuseumWingId;
  title: string;
  requiredSpecies: number;
  unlocked: boolean;
  completed: boolean;
  remainingSpecies: number;
};

export function buildMuseumWings(speciesCount: number): MuseumWing[];
export function getRecentMuseumFinds(items: BugDexInventoryItem[], limit?: number): BugDexInventoryItem[];
export function getMuseumWingItems(items: BugDexInventoryItem[], wingId: MuseumWingId): BugDexInventoryItem[];
export function getNextMuseumWing(wings: MuseumWing[]): MuseumWing | undefined;
```

Wing assignment should first use existing BugDex metadata. When no stable habitat or category field exists, use a small deterministic local mapping or rarity-based fallback. Do not write the assignment to Firebase.

### `src/components/museum/MuseumWingRail.tsx`

Renders wing selection only. Inputs are wings, selected id and selection callback.

### `src/components/museum/MuseumRoom.tsx`

Renders selected background and responsive display positions. It consumes prepared specimen items and does not query inventory.

### `src/components/museum/MuseumSpecimenDisplay.tsx`

Renders one unlocked or locked specimen. It uses `BugArtImage`, not `BugJarArt`, to avoid changing Duel, BugDex and Arcade visuals.

### `src/components/museum/MuseumCollectionWall.tsx`

Renders the compact discovered-species grid.

## Assets

### Room backgrounds

Create:

- `assets/generated/museum-room-discovery-v1.jpg`
- `assets/generated/museum-room-greenhouse-v1.jpg`
- `assets/generated/museum-room-night-v1.jpg`
- `assets/generated/museum-room-grand-v1.jpg`

Requirements:

- source composition approximately `1080x1350`;
- portrait mobile layout;
- no text, insects or UI controls;
- calm center area for dynamic content;
- compressed target around 500-700 KB per background when visual quality permits.

### Transparent object layers

Create only the objects needed by the final room layout:

- `assets/generated/museum-case-classic-v1.png`
- `assets/generated/museum-case-greenhouse-v1.png`
- `assets/generated/museum-frame-night-v1.png`
- `assets/generated/museum-pedestal-grand-v1.png`
- `assets/generated/museum-locked-door-v1.png`

Requirements:

- approximately `512x512` RGBA;
- transparent specimen area;
- object centered and readable when rendered around 120-180 px;
- no embedded text.

### Wing icons

Create:

- `assets/generated/museum-wing-discovery-v1.png`
- `assets/generated/museum-wing-greenhouse-v1.png`
- `assets/generated/museum-wing-night-v1.png`
- `assets/generated/museum-wing-grand-v1.png`

Requirements:

- `256x256` RGBA;
- recognisable at 38-52 px;
- simple silhouette and no text.

`museum-gallery-v2.png` may remain as an entrance thumbnail in BugDex, but should no longer be stretched into the complete Museum experience. `bug-squad-empty-jar-hd.png` is not used by the redesigned Museum.

## Data and sorting

`listBugDexInventory` already returns items sorted newest-first. Museum model functions must not rely blindly on caller order; `getRecentMuseumFinds` sorts by `lastUnlockedAt` descending to make the contract explicit and testable.

Duplicates remain one species display. Counts appear as `xN` only when `count > 1`.

No active squad data is consumed.

## States

### Loading

Render the selected room shell immediately with two or three soft specimen skeletons. Avoid a blank page with only an activity indicator.

### Empty collection

Render one illuminated empty display with:

- title: `Je eerste vitrine wacht`;
- body: `Scan een echt insect om het museum te openen.`;
- primary action only when an existing scan callback is available.

### Error

Catch inventory load errors and render:

- `Collectie kon niet worden geladen.`;
- retry action that calls the same load function.

### Locked wing

Show the room preview darkened with its unlock progress and no fake interaction. Example: `2 / 6 soorten · nog 4 ontdekkingen`.

### Completed wing

Show a small `VLEUGEL COMPLEET` badge. Do not add a claim action or reward.

## Motion

- room transition: 180-240 ms fade or horizontal slide;
- subtle spotlight or dust movement;
- selected specimen may move 2-3 px slowly;
- no simultaneous bobbing on every specimen;
- use the native driver where supported;
- respect existing reduced-motion behavior if available.

## Internationalisation and accessibility

Move all visible Museum copy to `src/services/i18n.tsx` for supported languages. Add accessibility labels for back, wing selection, locked states and specimen names.

Minimum interactive target: 44 px. Avoid important text below 12 px. Verify Android font scaling does not truncate wing names or progress labels.

## Testing

Add model tests covering:

- four wing thresholds at 0, 1, 5, 6, 9, 10, 14 and 15 species;
- recent discoveries sorted by `lastUnlockedAt` descending;
- recent discovery limit;
- duplicate counts do not increase unique species progress;
- no active squad input or output;
- deterministic wing assignment.

Visual checks:

- 360x800 and 412x915;
- empty, 1 species, 5 species, 6 species and 15+ species;
- long translated wing names;
- fixed bottom navigation does not cover the collection wall;
- web width up to the existing 620 px content maximum.

Run:

```text
node --experimental-strip-types --test src/screens/MuseumScreenModel.test.ts
npm run typecheck
git diff --check
```

## Acceptance criteria

- The screen is recognisable as a museum room within two seconds.
- Bugs, not cards and labels, are the visual focus.
- At least one visible specimen is effectively 90 px or larger at 360 px width.
- Recent discoveries are actually the newest inventory items.
- Active squad is absent from Museum.
- Wing progress and next unlock are understandable without opening another screen.
- Empty, loading, locked, completed and error states are present.
- Bottom navigation does not cover Museum content.
- No new Firebase data, reward logic or dependency is introduced.
- Existing Duel, BugDex and Arcade jar presentation remains unchanged.
