# BugBaas 3.0 World Home Visual Simplification

Date: 2026-07-27
Status: Approved design

## Goal

Make the World `Vandaag` screen calmer, more useful, and reliable on small phones. Decorative elements must not compete with progress information or push actions behind the fixed bottom navigation.

## Scope

This change affects the `Vandaag` tab of `WorldScreen` and its `WorldBiomeHero` component. Events and Map keep their existing behavior, apart from shared overflow or spacing corrections discovered during validation.

## Remove

- Remove the complete `Volgende actie` card and its interaction from the World home.
- Remove the top-right location/radar button from the biome hero.
- Remove the floating radar/search-zone artwork and its pulse animation.
- Remove associated unused artwork imports, state, calculations, helper components, and styles.

## Keep

The World home keeps only information and actions with a clear purpose:

- Current biome and field status.
- Biome tier and verified-find count.
- Route progression and movement progression.
- Today and weekly distance information.
- Six biome selectors.
- Movement/reward action.
- Buddy action.
- Research action.
- Missions action.
- `Vandaag`, `Events`, and `Kaart` tabs.

Map access remains available through the `Kaart` tab. Scan, Play, and Collection remain available through the fixed bottom navigation.

## Layout

### Phone

- `Vandaag` becomes a vertical `ScrollView` when its content is taller than the available viewport.
- The first viewport should prioritize: tabs, biome status/progress, biome selector, and the first action row.
- Content receives bottom padding greater than the fixed bottom navigation height.
- No action, label, or scroll endpoint may sit under the bottom navigation.
- Interactive targets must be at least 48 dp where practical.
- Decorative empty height in the biome hero is reduced after removing the floating artwork and action card.

### Tablet and desktop

- Preserve the existing two-column World layout where available.
- Keep the compact visual hierarchy and avoid stretching empty decorative space.
- Scrolling is allowed when content cannot fit without clipping.

## Component changes

### `WorldBiomeHero`

- Remove `nextAction`, `onNextAction`, and `onOpenMap` props.
- Remove search-zone animation and associated `Animated` state.
- Remove location and search-zone glyph components.
- Remove the `Volgende actie` card.
- Recalculate hero minimum height around actual remaining content.
- Keep route and movement visuals readable without overlapping.

### `WorldScreen`

- Stop deriving `nextAction` solely for the removed World-home card.
- Render Today content in a phone-safe scroll container.
- Preserve action callbacks for movement, Buddy, Research, and Missions.
- Preserve Events and Map behavior.

## Validation

Automated checks:

- Structure tests prove the removed visuals and props no longer exist.
- Structure tests prove Today has a scrollable phone layout and bottom-navigation clearance.
- Existing World, navigation, and responsive tests remain green.
- TypeScript passes.
- `git diff --check` passes.

Visual checks:

- Playwright screenshots at 390x844, 720x1280, 768x1024, and 1440x900.
- Android Small Phone emulator screenshot and UI hierarchy inspection.
- Verify all visible buttons, tabs, overlays, scrolling endpoints, text wrapping, and bottom-navigation clearance.
- Review browser console and Android logcat for regressions.

## Acceptance criteria

- `Volgende actie` is absent.
- The top-right location/radar button is absent.
- The floating radar image is absent.
- The World home is visibly calmer and contains no large purposeless empty area.
- All retained actions are reachable and tappable on Small Phone.
- The final content can scroll above the bottom navigation.
- No regression appears in Events, Map, or main navigation.
