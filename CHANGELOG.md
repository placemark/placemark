# @placemarkio/play

## 0.3.0

### Minor Changes

- fd0355a: Add support for h3 columns in CSVs

  Thanks [Jt Miclat](https://github.com/jtmiclat) for the contribution!

- f283237: Support dark mode again with an option in the File menu

## 0.2.0

### Minor Changes

- ffb0aca: Routing as a new drawing mode

  This lets you draw waypoints on the map and Placemark will use
  a routing API to connected the points with roads and paths.

- 1fe889c: Make the feature table sortable

  Click a table header to sort features by it in ascending or descending order. Click
  the same order to bring the table back to showing items in default sort order. Note
  that the currently uses simple sorting `>` and `<`, which should work well for
  well-formatted data but if you have stringified numbers it will give surprising
  results.

### Patch Changes

- ad6d328: Fix symbolization syncing

  Previously, when you edited a category, ramp, or uniform
  symbolization, the changes didn't propagate to the map. This
  should fix that and you'll see the updated ramp.

  The issue was in doing non-reactive saves to the Jotai
  store - the other components weren't able to know that
  values were updated. It was also that the hook that's
  supposed to auto-submit forms wasn't working.

- adb9690: Fix mistakes in readme, rewrite for current state of the project
- 4d5dcd8: Fix resizing table columns
- 30a9cf8: Replace deck.gl-powered lasso with Mapbox GL layer
- 9aca73c: Fix link to documentation site
- 13e3d6b: History is no longer spammed with undo actions

  Dragging and drawing features was incorrectly adding lots of history
  entries. This removes them which makes history clean.
