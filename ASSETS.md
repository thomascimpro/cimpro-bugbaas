# Assets

## Current V1

- Insect visuals are local React Native vector-style components made with `View` and `Animated`.
- Background bands, ranking cards, button states and tier cards are local React Native views.
- No external image files are bundled yet.
- Walking insects are procedural animations, so no GIF/APNG/WebP runtime support is needed.
- Moving background insects use a separate local side-view component with animated legs.
- Tier visuals use local insect variants: larva, beetle, grasshopper, dragonfly, ladybug.

## External Asset Option

Kenney assets are a good source for CC0 game-style assets:

- https://kenney.nl/assets
- https://kenney.nl/assets/animal-pack
- https://kenney.nl/assets/animal-pack-remastered

Kenney assets are CC0 on the asset pages. Do not use the Kenney logo.

## If Custom Assets Are Sent

Preferred:

- Transparent PNG or WebP.
- 512x512 px for main insect art.
- 128x128 px for small icons.
- 3 to 6 frame PNG/WebP sequence for walking animation.
- File names in English, for example `beetle_walk_01.png`.

Avoid GIF for V1. It is larger, harder to control on Android, and less flexible than PNG/WebP frame animation.
