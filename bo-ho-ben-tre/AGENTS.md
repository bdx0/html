# AGENTS.md — Hồ Trúc Giang / Bờ Hồ Bến Tre Digital Twin
## Goal
Build a progressively verifiable geographically anchored 3D Digital Twin of Hồ Trúc Giang and the surrounding streets, park, civic buildings and urban fabric. Reference UI patterns from `../warestack-3d.html`. Prioritize actual positioning and traceability over imaginary details.

## Work order — mandatory roadmap
1. **B0 Data foundation:** choose EPSG:4326 and local tangent XY in metres with origin (lon 106.37814, lat 10.23861); establish SQLite, schema migrations and IDs; import all 305 catalog requirements and 90 planned survey shots. Capture 2026-vs-historical evidence, photo licensing and cost assumptions.
2. **B1 GIS geometry:** import OSM live geometry where available (water way 217484891, roads, actual building footprints, parks), snapshot and timestamp it. Check ring closure and coordinate order [lon,lat]. Never infer real geometry from a photograph or raster pixel size.
3. **B2 WebGL base:** build scene using real geodata only when status indicates OSM. Clearly mark fallback procedural visualization as illustrative. Add mouse orbit, drag, pinch, reset, miniview, object selection and CPU-safe render mode.
4. **B3 Reality capture:** user photo survey in `survey_shots`. For each approved photo capture date, rough GPS, camera azimuth, source, author, license and which asset/detail it proves. Import no user photo without permission.
5. **B4 Detailed objects:** refine shoreline, ramps, promenade paving, Trần Văn Ơn statue and park, central fountain, roofs/facades, signs, benches and lighting. Keep documented specifications separate from as-built verification.
6. **B5 Environmental realism:** materials, shadow, water movement, vegetation species, lighting, day/night, vehicle/person optional simulated layers.
7. **B6 QA:** validate geometry/georeferencing, metadata, no missing selected assets, WebGL1 context and loss behavior, mobile pinch, zoom under/overflow, resize, Github Pages relative paths. Keep a diagnostic panel and clear errors.
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
