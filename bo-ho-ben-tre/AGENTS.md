# AGENTS.md — Hồ Trúc Giang / Bờ Hồ Bến Tre Digital Twin
## Goal
Build a progressively verifiable geographically anchored 3D Digital Twin of Hồ Trúc Giang and the surrounding streets, park, civic buildings and urban fabric. Reference UI patterns from `../warestack-3d.html`. Prioritize actual positioning and traceability over imaginary details.

## Geographic scope — fixed until user changes it
- **Only the region within 300 metres of the actual Hồ Trúc Giang OSM shoreline** is in scope, not a 300m circle around the lake center; use OSM water way `217484891` as the reference ring.
- Clip road segments at the 300m lakeshore buffer; import polygon features only when fully contained. Do not publish out-of-scope road/building geometry. Record the source, import timestamp and buffer rule in SQLite and `scene.json`.
- Keep the full 305-item catalog for traceability, but prioritize photographs and LOD in this 300m zone. Never use the legacy 750m context design for rendering without an explicit scope change.

## Visual fidelity and lake recognition (v2)
- **Never replace the verified lake outline with an ellipse** when OSM water way 217484891 is available. Center and bounds roughly 200m East-West and 105m North-South in local projected metres.
- The signature shape is a softly curved trapezoid with small concavities; visually validate the entire water polygon. Prevent green wedge overlap, triangulation artifacts and road geometry tilted off the ground.
- Essential recognition layer: continuous retaining wall, tan pedestrian promenade, planter/hedge border, low green rails, mature shade trees with broad crowns, fountain, adjacent streets and lowrise street-facing facades.
- Monument/fountain/adjacent facades modelled procedurally must be tagged *photo-inspired / illustrative* unless matched against verified dated site photos. Preserve original OSM building geometry and sources; missing footprints may be visual proxies.
- Before shipping, use automated Playwright screenshot artifacts (desktop, narrow mobile and landscape), **inspect the screenshots visually** against identifiable Trúc Giang photo sources (not merely count meshes or frames).
- The real field photos have priority over fabricated details; metadata may reference copyrighted sources but do not mirror those image binaries in public asset folders without permission.

## Photo-to-3D hotspot data contract (B2.1)
- SQLite owns all reference-to-location relationships: \`photo_hotspots\` (id, local XY position, related object, positional provenance, explicitly NOT camera position), \`photo_hotspot_items\` (photo foreign key, relation, caption, order). The deterministic scene export includes \`photo_hotspots\` with \`photos\`; never hand-edit the browser's embedded hotspot array.
- Initially seed 8 traceable scene anchors: lake overview, fountain, Trần Văn Ơn monument, north and south promenade, west park, east facades, historical city office. These are **approximated world anchors**, not actual photo GPS/camera pose.
- Relations are \`depicts_subject\` (actual specific landmark), \`nearby_subject\`, \`overview\`, \`general_context\`, \`historical_context\`. Display relations and original link/author/year on photo cards. Do not imply a landscape image is a photo of a specific unknown facade, or that a photo was taken from the anchor's location.
- The browser projects world coordinates into screen markers on orbit/zoom/resize. The stage's pointer-event handler must not steal clicks from photo markers. On mobile a marker opens the bottom sheet; selecting a mapped 3D mesh uses Raycaster and the same hotspot ID.
- Keep source images externally referenced, with source-link fallback for hotlink 403 failures; never download/copy copyrighted images without permission.
- Playwright QA checks DB/schema counts, projected visible markers, opens at least one photo with source/provenance on 320/390px phones and desktop, verifies drawer interaction and does not regress WebGL/camera.

## B3 mobile photo placement + satellite reference (implemented)
- Viewer loads `survey.css` and `survey.js`. The **📍 Ghim ảnh** action enables selecting a 3D ground-plane point, which is rejected when more than 300m from OSM shoreline. Existing photo markers must not intercept selection.
- Local IndexedDB (`bdx0-ben-tre-survey`) stores user-selected JPEG/PNG/WebP blobs, manual 0–359 degree bearing, capture date, notes and model-pinned lat/lon. Do not falsely claim EXIF camera pose or GPS survey accuracy.
- Selected photos stay on the device until user explicitly clicks **⇩ Xuất ảnh**. GitHub Pages is static and must never claim immediate SQL writes/uploads. Privacy: photo and approximate location are sensitive to publish; do not auto-export or auto-commit them.
- Human-reviewed exported JSON is imported with `python3 bo-ho-ben-tre/scripts/import_survey.py <file>.json`. Validation rejects missing rights, files over 12MB, unsupported bytes, bad coordinates, points outside lake's 300m buffer, mismatched origin; image is stored in `assets/surveys/` and metadata in `data/surveys/manifest.json`.
- `scripts/build.py --osm` reads that curated manifest as source input, writes `field_surveys`, `photos`, `photo_hotspots`, `photo_hotspot_items` SQLite rows and corresponding `scene.json` entries. No orphan assets or unlicensed photos.
- Satellite button opens Esri World Imagery *for geospatial context*, includes Esri attribution and links to Google satellite map. Do not imply a live image, specific acquisition date or reuse rights; compare with historical aerial photos separately. GIS comparison findings are in `COMPARISON.md`.
- QA: run `python3 bo-ho-ben-tre/scripts/test_survey.py`, `node --check bo-ho-ben-tre/survey.js`, existing Chromium browser smoke for desktop/phones including dialogs, no page scrolling, accurate marker anchoring.

## Mobile-first interface contract
- Landscape / portrait at 320px, 390px and tablet widths, incl. safe-area insets, must preserve a positive-height WebGL canvas, no horizontal/page scroll.
- Mobile entry state: fullscreen scene with **collapsed** bottom drawer. Quick tabs for Images / Catalog / Prices expand the drawer; drawer has an accessible open/close control and swiping. No permanently 41vh-obscured scene.
- 44px-ish touch targets, icon toolbar and zoom +/- controls. One-finger orbit, two-finger pinch+pan; prevent page zoom/scroll when interacting with scene.
- Never rely on JS/CSS hiding scene when drawer opens. Debug diagnostics, day/night and OSM provenance continue to work; fallback Canvas should be visible if GPU unavailable.
- Browser CI must test small phones and drawer/gesture interactions, not merely presence of a WebGL context.

## Work order — mandatory roadmap
1. **B0 Data foundation:** choose EPSG:4326 and local tangent XY in metres with origin (lon 106.37814, lat 10.23861); establish SQLite, schema migrations and IDs; import all 305 catalog requirements and 90 planned survey shots. Capture 2026-vs-historical evidence, photo licensing and cost assumptions.
2. **B1 GIS geometry:** import OSM live geometry where available (water way 217484891, roads, actual building footprints, parks), snapshot and timestamp it. Check ring closure and coordinate order [lon,lat]. Never infer real geometry from a photograph or raster pixel size.
3. **B2 WebGL base:** build scene using real geodata only when status indicates OSM. Clearly mark fallback procedural visualization as illustrative. Add mouse orbit, drag, pinch, reset, miniview, object selection and CPU-safe render mode.
4. **B3 Reality capture:** user photo survey in `survey_shots`. For each approved photo capture date, rough GPS, camera azimuth, source, author, license and which asset/detail it proves. Import no user photo without permission.
5. **B4 Detailed objects:** refine shoreline, ramps, promenade paving, Trần Văn Ơn statue and park, central fountain, roofs/facades, signs, benches and lighting. Keep documented specifications separate from as-built verification.
6. **B5 Environmental realism:** materials, shadow, water movement, vegetation species, lighting, day/night, vehicle/person optional simulated layers.
7. **B6 QA:** validate 300m buffer geometry/georeferencing, metadata, missing selected assets, WebGL context and loss behavior, 320/390px mobile, safe areas, pinch/pan, zoom bounds, drawer open/close, no page scroll, resize and Github Pages relative paths. Keep a diagnostic panel and clear errors.
8. **B7 Publish:** build SQLite and static scene from same source in CI, deploy on GitHub Pages, smoke test the hosted URL and log provenance snapshot. Do not overwrite WareStack.

## SQLite source and export policy
- `data/catalog-blueprint-v1.json` = archived full v1 catalog, never silently rewrite facts.
- `scripts/build.py` creates `data/catalog.sqlite` and `data/scene.json`. Browser consumes scene.json (static), which is derived from SQLite. Keep DB and viewer schema versioned.
- Tables: sources, requirements, zones, survey_shots, objects, photos, photo_links, cost_items, cost_quotes, osm_features, project_meta.
- Store image URL/metadata/links, not proprietary image binaries. Distinguish usage/license permissions (reference-only ≠ free to redistribute). Every category must have a concrete reference image or a `photo_missing` status.
- Cost data is VND; price entries must record timestamp, quantity, unit, quote_source, evidence URL and whether `quote` vs `planning_assumption` vs `unknown`. NULL is preferred over invented prices. Placeholder/model-generated objects and cost guesses carry an explicit `illustrative` flag.
- Geometry accuracy: OSM is crowdsourced, NOT survey grade; inferred heights are explicitly estimated. No bulk download or redistribution of Google satellite imagery.

## Completion gates
- Data update: schema build and integrity checks pass, full v1 requirement count remains 305, shots 90, linked images and budget tables populated.
- Scene update: avoid empty canvas, report data import status and object count, graceful fallback on WebGL loss.
- Publication: confirm GitHub commit, Pages workflow and app URL before declaring publicly online.

## Field photography needed
- 4 shoreline quadrants, each viewpoint 4 directions, 4 street intersections, building rows per street, Trần Văn Ơn monument, fountain day/night, close-up pavements/railings, tree trunks/canopies and POI.
- Upload photos with EXIF if willing. Identify date, angle, camera location, owner and permission. Never confuse a historical photo with current configuration.

## Commands
`python3 bo-ho-ben-tre/scripts/build.py` — deterministic offline build.
`python3 bo-ho-ben-tre/scripts/build.py --osm` — attempt live OSM; if fetch fails, explicitly keep illustrative stage and report why.
`python3 -m http.server 8000` — test `/bo-ho-ben-tre/` locally.
