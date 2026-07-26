# BugBaas Mobile Arcade Grid Design

**Date:** 2026-07-26

## Goal

Show every arcade game immediately on mobile without horizontal scrolling, while keeping Solo Campaign visible in the same first-screen game area.

## Scope

- Replace the current horizontal arcade card rail inside `BugSmashDuelScreen` with a responsive grid.
- Mobile: two columns and three rows for the six arcade games.
- Tablet and wide layouts may use three columns and two rows when space allows.
- Keep the existing game ordering, ranked launch behavior, practice behavior, unlock progression, featured state, and game art.
- Show locked games in the grid with a lock treatment and the existing unlock requirement.
- Place Solo Campaign below the six-game grid as one compact full-width row.
- Keep Active Bug Squad below the game selection area. The rest of the screen may scroll normally.

## Mobile layout

### Header

Keep the existing `ARCADE`, `Arcade games`, and `Duel` header, but reduce excess vertical spacing where needed.

### Six-game grid

Each tile contains:

- cropped game artwork;
- short game title, maximum two lines;
- primary ranked `Play` action;
- secondary `Practice` action where supported;
- featured indication when applicable;
- lock overlay plus unlock requirement when unavailable.

Tiles must remain usable at 360 x 800 and 412 x 915. Touch targets stay at least approximately 44 px high. Titles and buttons may become more compact, but must not clip.

### Solo Campaign

Render one compact horizontal card below the grid:

- short landscape thumbnail on the left;
- `Solo Campaign` title;
- current unlock or progress text;
- one clear start or continue action;
- lower height than the current large campaign card.

### Scrolling

No horizontal game scrolling. Vertical page scrolling remains allowed for Bug Squad and later content. On a typical 412 x 915 mobile viewport, the header, six games, and Solo Campaign should all be visible without scrolling or with only negligible browser chrome variance. On 360 x 800, prioritize complete visibility of all game choices; Bug Squad may start below the fold.

## Responsive behavior

- Use current responsive utilities and `useWindowDimensions` patterns already present in the app.
- Do not add dependencies.
- Avoid fixed card widths that overflow narrow screens.
- Preserve tablet presentation with larger tiles and more breathing room.

## Behavior preservation

- Ranked games still pass through `confirmRankedStart`.
- Practice buttons keep their current training routes.
- Locked games remain disabled for ranked and practice actions.
- Existing unlock targets from `arcadeModeUnlockTarget` remain the source of truth.
- Existing featured-mode logic remains unchanged.
- Solo Campaign unlock and start behavior remain unchanged.

## Testing

Automated structure or model tests should verify:

- six game entries render in the arcade selector;
- the selector no longer uses a horizontal `ScrollView`;
- locked entries remain present;
- Solo Campaign remains directly below the arcade grid;
- ranked and practice callbacks remain connected.

Manual visual checks:

- 360 x 800 mobile;
- 412 x 915 mobile;
- approximately 800 x 1280 tablet;
- unlocked and locked progression states;
- English, Dutch, and French long titles;
- no clipped buttons, horizontal overflow, or unreadable lock text.

## Non-goals

- No gameplay changes.
- No unlock rebalance.
- No new game art.
- No redesign of Active Bug Squad.
- No changes to Duel or Ranking tabs beyond shared layout safety.
