# Next fix: town space and building placement

Status: planned, not implemented. Tracking: #25 (town), #26 (touch/save safety).

## What is wrong now

The map is 38 by 23 tiles, but construction is limited to the town west of the
x=24 boundary. Buildings need a one-tile clearance ring. Large footprints plus
that spacing use up usable lots quickly.

The renderer only highlights the whole town during building mode. It does not
show the selected footprint, its entrance, required clearance or blocked cells.
Failures go to the log rather than appearing beside the attempted placement.
The floating instruction is hidden on narrow screens. Separate click/touchend
handlers offer no preview/confirm flow.

## Delivery order

### 1. Make placement understandable

- Share one placement evaluator between preview and final placement. Return the
  footprint, clearance cells and a specific reason for rejection.
- Show a snapped ghost, tile grid and entrance marker. Use green/red plus text
  and symbols, not color alone.
- Explain "overlaps Inn", "leave one tile clear", "outside town", insufficient
  gold and research lock next to visible Place/Cancel controls.
- Mouse/pen previews follow movement; touch taps select a persistent preview.
  Touch placement requires confirmation. Escape/Cancel exits without spending.
- Use a single pointer event path; dragging or pointer cancellation must never
  construct accidentally. Keep construction controls visible on small screens.
- Entering build mode switches to town view and exits Explore mode.
- Keep the clearance rule initially; do not hide navigation problems by simply
  removing spacing.

### 2. Add usable land without moving existing towns

Proposed first expansion: six rows to the south (23 -> 29). Keep width 38 and
the town/frontier boundary at x=24. Existing buildings, pawns and monsters keep
their coordinates. This adds six rows of town lots, not merely a larger canvas.

Add a vertically pannable viewport at the existing tile scale rather than
shrinking the whole town to fit. Ensure both draw and pointer-to-tile conversion
use the same camera transform. Clamp camera bounds and distinguish pan from
placement gestures. Desktop and touch must both reach the new lots.

Introduce a v4 -> v5 save migration with the map change. Preserve old fog cells
and entity identities, append new town cells revealed and new frontier cells
fogged. Repeated migration must be harmless. Check all row-based generation,
frontier targeting, pathing, terrain, boundaries and percentage calculations;
do not assume changing ROWS alone is safe.

### 3. Prove it works

- Exact footprint/clearance edge cases for Houses and 4x3 facilities.
- Preview/cancel never change gold or buildings. Confirmation charges once.
- One touch cannot create two structures; cancelled drag creates none.
- Invalid placements show a visible, specific explanation.
- Old-save fixtures retain all entity positions and old fog cells after migration.
- Pawns can reach new building entrances and return home from the frontier.
- Preview aligns with the final building after panning/resizing.
- Desktop and iPad-sized browser checks include all four edges and the new band.

## Scope and gates

No building relocation, demolition, rotation, procedural world rewrite or new
research costs in this slice. First prove the proposed southern expansion solves
usable-lot pressure; consider larger expansion separately if needed.

This is a source-grounded implementation plan, not a rendered UX audit.
Placement UI must receive real browser verification before publication. The
current local-browser URL policy has blocked that verification so far.
