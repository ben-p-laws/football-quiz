# Protected files and areas

These are calibrated or score-critical. No agent changes them unless an **approved** issue names the exact file or symbol below. The Builder must quote that issue in the PR.

## Golf hole calibration
The hole images are calibrated to the course data. The hole area's size, position, aspect ratio and coordinate mapping must not change. Everything around it (HUD, scorecards, controls, panels, typography, colours) can be restyled, as long as the hole box doesn't move or resize.

- `components/FootballGolf.tsx`:
  - `CourseView` (the hole renderer) and its sizing logic (outer/inner box, `innerSize`, ResizeObserver)
  - `yardToSVG`, `holeXY`, `pathEndAngle`, `pathToD`, `fracToSVG` and the path/curve helpers they use
  - Course data: `AUGUSTA_HOLES`, `AUGUSTA_POSITIONS`, `AUGUSTA_YSCALE`, `AUGUSTA_HAZARDS`, `PEBBLE_BEACH`, `HOLE_POSITIONS`, `PEBBLE_YSCALE`, `PEBBLE_PHOTO_ROTATIONS`, `REAL_COURSE_HAZARDS`, all `WII_GOLF_*` constants, `getWiiEffectiveGeometry`, `getWiiPostForkFracs`
  - `BranchPickerModal`'s map (Wii hole 9 route picker)
  - The layout box the hole view sits in: any change to the container around `<CourseView>` that changes its size counts as touching the hole
- `app/golf-calibrate/page.tsx`
- `public/holes/**`
- `scripts/extract-augusta-images.mjs`, `scripts/recolor-augusta-bunkers.py`

Enforced by the calibration Playwright check (bounding box ±1px and a visual snapshot per hole, mobile and desktop). Until that check exists (see the bootstrap issues), the Builder must not touch anything listed here at all.

## Population Circle scoring
- `lib/geo/circle-puzzles.ts` (puzzle lat/lng/radius/population)
- `guessPct` and the scoring in `components/geo/PopulationCircle.tsx`
- `scripts/compute-circle-populations.ts`, `lib/geo/cities.json`, `lib/geo/city-data.ts`

Scoring is precomputed per puzzle and does not depend on the map, so a map redesign can only break the drawn circle. The regression test locks the puzzle table and scoring and checks the drawn circle's radius against `radiusKm`. The map redesign must keep scoring identical.

## Infrastructure
- `.github/workflows/**`, `agents/**` on `main`: changed only by Ben or Luke, or by an approved `type:tech` issue that names them.
