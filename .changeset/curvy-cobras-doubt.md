---
"@placemarkio/play": patch
---

Fix symbolization syncing

Previously, when you edited a category, ramp, or uniform
symbolization, the changes didn't propagate to the map. This
should fix that and you'll see the updated ramp.

The issue was in doing non-reactive saves to the Jotai
store - the other components weren't able to know that
values were updated. It was also that the hook that's
supposed to auto-submit forms wasn't working.
