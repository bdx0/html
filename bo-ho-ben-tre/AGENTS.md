# AGENTS.md — Hồ Trúc Giang / Bờ Hồ Bến Tre Digital Twin

## Ảnh nền OPEN DATA tự host · PLAN + Three.js (2026-10-14)

- **Khi có raster hợp lệ, nền ảnh mở tự bật trong PLAN và 3D**; bấm **🌍 Ảnh mở** trên Floor Plan hoặc **🌍 Nền 3D** ở thanh công cụ (hoặc vào **☰ Công cụ** trên điện thoại) để bật/tắt. Đây là ảnh nền thật có tọa độ, không phải ảnh tạo sinh hay dữ liệu GIS được "verified". Các đối tượng và đoạn bờ OSM không đổi.
- Nguồn ưu tiên **OpenAerialMap v2 STAC** (\`https://api.imagery.hotosm.org/stac/search\`): xét ảnh bao đủ ô địa lý, asset RGB thực, chỉ nhận giấy phép **CC-BY-4.0 / CC-BY-SA-4.0 / CC0**, yêu cầu ít nhất 95% pixel hợp lệ. Chưa có chứng cứ một ảnh như vậy tồn tại tại Hồ Trúc Giang cho đến khi pipeline chạy; trường \`oam_intersecting\` và metadata ghi kết quả truy vấn.
- Nếu không tìm được ảnh OAM phù hợp, lấy **Copernicus Sentinel-2 L2A** từ Earth Search STAC, chọn granule mây thấp và ba dải red/green/blue, hiệu chỉnh biểu diễn RGB. **Độ phân giải Sentinel-2 thực 10m**, dù raster web 1024×1024; không suy luận bờ lồi/lõm centimet từ ảnh này. Ghi nguyên văn \`Contains modified Copernicus Sentinel data [year]\`, ngày chụp và giấy phép.
- \`bo-ho-ben-tre/scripts/build_open_imagery.py\` tạo \`data/imagery/basemap.webp\` và \`manifest.json\` (bbox \`[west,south,east,north]\`, source, acquired, native_resolution_m, license, source_url, attribution). **GitHub Pages deploy workflow** tạo **file ảnh trong \`_site\`**; ảnh được **host trên chính GitHub Pages**, không gọi tile Google/Esri khi xem, không chứa API key. Binary không được commit trong Git: file trong repository \`data/imagery/manifest.json\` chỉ là placeholder pending; bản triển khai là sản phẩm pipeline. Có thể chạy script tại máy của bạn với \`pip install rasterio numpy pillow requests\` rồi \`python3 bo-ho-ben-tre/scripts/build_open_imagery.py\`.
- Nếu API ảnh bị chặn hoặc không tìm được scene đủ hợp lệ, hiển thị trạng thái \`unavailable\` và giữ nền mô hình kỹ thuật OSM. Không lấy ảnh từ nguồn thương mại đóng hoặc giả lập ảnh vệ tinh. Trạng thái thực tế chỉ có thể xác nhận sau khi kiểm tra manifest tại URL GitHub Pages và ảnh đã tải.
- Hai tọa độ phải thống nhất: WGS84 geobounds → hệ XYZ local của dự án; North-up khi xem PLAN và Three.js (mặt phẳng x/+z). Luôn hiện ghi nguồn + độ phân giải thật khi bật ảnh. Ảnh không xác minh đường bờ OSM way 217484891 hoặc thay đổi dữ liệu SQLite.
- QA: smoke script có bộ ảnh **synthetic fixture chỉ trong Playwright** để thử zoom/pan/raster trong 3D và PLAN; fixture không được đưa vào dữ liệu thực. Thử trên màn hình 320, 390 và landscape.


## Ảnh vệ tinh Google Maps trong Floor Plan (tùy chọn · 2026-10-14)

- Trên trang 3D, chuyển sang **PLAN** rồi chọn **🛰 Google Satellite**. Trên điện thoại có thêm lối tắt trong **☰ Công cụ**.
- Lần bật đầu tiên, nhập **Google Maps JavaScript API key** của bạn. Bật **Maps JavaScript API** và **Billing** trên Google Cloud; giới hạn API key bằng HTTP referrer `https://bdx0.github.io/html/*` (và các môi trường dev cho phép). Không đưa API key thực vào GitHub. Trong trình duyệt, key được giữ tại `sessionStorage` của tab hiện tại.
- Ảnh Google hiển thị bằng `google.maps.Map({mapTypeId:'satellite'})` chính thức, **không** tải tile về, không ghép Google imagery thành texture Three.js. Lớp `wbPlanCanvas` vẽ dữ liệu OSM độc lập theo GPS nhờ `OverlayView.getProjection().fromLatLngToContainerPixel`, và đồng bộ zoom/kéo. Giữ nguyên Google copyright/branding và vùng bấm ở cuối khung.
- **Chỉ ở chế độ PLAN**: khi 3D hoặc SPLIT, hiển thị bản kỹ thuật OSM hiện có, tránh việc dùng ảnh Google như một non-Google-map texture/sai góc phối cảnh. Bật/tắt trở lại không thay đổi file SQLite, scene.json hay annotation.
- Khi chưa có key, khi Google API bị lỗi hoặc khi không có kết nối, Floor Plan vẫn hoạt động bình thường. Nút **🛰 Vệ tinh** cũ dùng Esri World Imagery trong hộp tham chiếu độc lập vẫn giữ nguyên. Đây không phải ảnh vệ tinh trực tiếp theo thời gian thực.
- Chưa kiểm chứng màu/tile Google trên tài khoản có key thực: test browser mặc định xác nhận UI opt-in, không tải Maps API trước khi người dùng đồng ý; QA cần thử key hợp lệ với giới hạn HTTP referrer rồi xem trực quan độ khớp lớp OSM và các ghim ở nhiều mức zoom.

## Mobile-first interface · 2026-10-14
- Main page `index.html` loads `mobile-layout.css` and `mobile-layout.js`: a compact header, one accessible menu for survey/satellite/scene controls/model/CAD/SQLite, and an opt-in inspector sheet. These files are **UI only**, not GIS source data.
- Mobile default: full 3D scene, bottom sheet collapsed, minimap hidden, axis gizmo collapsed. The three visible mode buttons remain 3D / PLAN / SPLIT; tapping `⌖ Góc nhìn` reveals the XYZ gizmo and TOP/N/E/ISO presets. Survey/satellite entry points remain accessible in the menu, even when their older HUD buttons are hidden.
- Mobile portrait SPLIT stacks WebGL on top and Floor Plan below; mobile landscape SPLIT places them side-by-side to keep the plan usable. Resize the Three.js drawing buffer **and the camera aspect** to match the displayed WebGL pane; CSS-only cropping makes the model seem to vanish.
- PLAN keeps annotations, existing raw OSM geometry and CAD/GIS links working. Neither local annotations nor shoreline previews mutate authoritative SQLite/scene data. Desktop panels and `warestack-3d.html` remain untouched.
- Mobile regression test `scripts/test_ben_tre.mjs` covers 320 px, 390 px and 844×390 landscape, responsive menu, collapsed XYZ, drawers and adaptive split. Changes to navigation/controls must update this test. Inspect screenshots before declaring visual QA complete.

## Four interactive visual shoreline sectors — verified UX contract (2026-10-13)
- \`scripts/model_export.py\` exports \`lake_audit.unresolved\` with 4 segments identified by actual **zero-based OSM water ring vertex indices**: north 15..22, south 3..10, east 10..15, west 22,23,0..3 (wraps at west). These segments mark **where the user should look**, *not* precisely proven incorrect coordinates. Keep the canonical water polygon unmodified.
- \`shoreline-review.js\` draws 4 thick orange highlighted OSM segments, numbered clickable badges on North-up \`model.html\`, per-sector readable question, existing vs signed preview offset dashed-blue, local review notes/status and opt-in JSON export. It must never be treated as survey-level geometry or written to GIS; offset is tapered to zero at interval endpoints and only demonstrates possible shoreline inward/outward movement. True bends require new surveyed vertices.
- \`shoreReviewDelta\`: signed metres, positive decreases water area (land advances), negative increases water area. Output schema \`truc-giang-shore-review-v1\`, \`status=USER_VISUAL_REVIEW_NOT_SURVEYED\`; per-sector \`verification_status=visual_review_only_not_georeferenced\`. Saved in \`localStorage\` only on explicit Save. Do not call a visual label 'verified'.
- Visual review panel appears **before raw geometry metrics** in the lake inspector, 4 steps near the map header even on mobile. On mobile, clicking a step highlights geometry without hiding the plan. Only pressing "Duyệt sửa" opens a reduced bottom sheet while leaving the map visible.
- QA should click every region, test signed +12/-12 preview and JSON without database mutation; test desktop/320/390/landscape, including absence of page scroll and reachable mobile controls. The relationship viewer and raw SQLite Explorer remain distinct.
- If user does not supply measured geo-coordinates or sufficiently licensed high-res GIS geometry, do not auto-solve shoreline accuracy by reconstructing shapes from a Google screenshot or claiming OSM matches.

## Current modeled-data and shoreline QA workflow — 2026-10-13
- The user wants **interpreted, modeled, human-readable, selectable entity data** rather than SQL rows. Primary navigation must open \`model.html\`. Keep \`sqlite.html\` as the advanced raw table/schema viewer. Generate the semantic model **directly from \`catalog.sqlite\`** with \`scripts/model_export.py\`, output \`data/model-view.json\`. Do not manually duplicate source-of-truth records in the view.
- The semantic graph includes geometry nodes (water, park, building and grouped road segments), logical landmarks/objects, zones, requirements, planned shots, photos, hotspot pins, reference prices, cost planning and source references. Metadata must explicitly differentiate OSM community geometry, approximate/unknown and verified survey. Never assert \`height_m\` default on non-building objects as measured, nor confuse project price with 2025 repair tender prices. Relationships must always reference existing node ids.
- Model map is North-up local tangent-plane projection centered (106.37814,10.23861), with mobile <=390px viewport checks; **validate that the lake stays visible at phone width**. User may select objects on map or list and inspect facts/evidence and linked objects.
- Lake geometry rejection remains: water OSM 217484891 is current *source*, not the same as GPS verified shoreline. The original user screenshot has key disputed sectors north promontory, diagonal south, east lobe and irregular west. \`model-view.json.lake_audit\` marks \`status=conflict_unresolved\`, \`verified_corrections=0\`, 24 OSM ring vertices and OSM estimates. Don't overwrite it with guessed GPS.
- \`shoreline-controls.js\` permits local-only user entry of independent WGS84 GPS/GIS shoreline control coordinates, dates, claimed accuracy and notes, followed by explicit JSON export. Store \`verification_status=self_reported_unreviewed\`; **never auto-apply these points to the public SQLite** or treat the Google Maps screenshot pixel geometry as a licensed source.
- An actual polygon correction requires sufficient independent control points around all turns/bays, measured accuracies, provenance and licensed source rights; run topology checks (no self intersection, correct ring, length/dimensions and characteristic bends). Inspect model map and 3D together. Photograph reference timestamps and photo pin positions remain uncertain.
- CI build and Pages deployment publish \`model-view.json\` together with \`scene.json\`, \`catalog.sqlite\` and \`sqlite-explorer.json\`. CI validates database table counts, all node/edge references, verified_corrections=0, and Playwright desktop/mobile geometry, entity details and local survey export.
- Copernicus Sentinel-2 10-m water masks cannot resolve fine shoreline promontories at this scale; Overture Base water is mostly sourced from OpenStreetMap. Treat those as contextual/crosschecks, not independent survey-precision corrections.

## Current correction (2026-10-13): rejected shoreline + SQLite Explorer
- The user's assessment is that the **candidate shoreline shape is severely wrong**. Never enable it by default or present it as an accurate alternative. The viewer loads with \`lakeShapeMode="raw"\` and Workbench \`shape="raw"\`, and the candidate control is **disabled**. This is not a claim that raw OSM is correct; it remains explicitly unverified.
- Remove any UI assertion or acceptance test claiming B01–B12 are actual observed lake shoreline control points. The previous hand-authored local-meter candidate was not georeferenced. Preserve original \`scene.json\` and SQLite \`osm_features\` provenance.
- SQLite Explorer is at \`bo-ho-ben-tre/sqlite.html\` and is linked from main desktop top bar, mobile sheet and SQLite inspector tab. It loads \`data/sqlite-explorer.json\`, built using Python sqlite3 by \`scripts/build.py\` alongside \`data/catalog.sqlite\`; it is a **read-only serialized mirror** of every table, not an in-browser database engine or SQL write interface.
- Changes to SQLite viewer data must be reflected by rebuilding/exporting from the same DB. It shows all columns, rows, CREATE TABLE, FK definitions, filter/sort/pagination, detail drawer and CSV export. CI must validate table counts against actual sqlite3 and check browser interaction on desktop/mobile.
- Update both \`deploy-pages.yml\` and \`build-ben-tre-data.yml\` to publish the explorer JSON on any relevant change. For GitHub Pages use the local generated SQLite and viewer exported together in the same site build.

## Goal
Build a progressively verifiable geographically anchored 3D Digital Twin of Hồ Trúc Giang and the surrounding streets, park, civic buildings and urban fabric. Reference UI patterns from `../warestack-3d.html`. Prioritize actual positioning and traceability over imaginary details.

## Geographic scope — fixed until user changes it
- **Only the region within 300 metres of the actual Hồ Trúc Giang OSM shoreline** is in scope, not a 300m circle around the lake center; use OSM water way `217484891` as the reference ring.
- Clip road segments at the 300m lakeshore buffer; import polygon features only when fully contained. Do not publish out-of-scope road/building geometry. Record the source, import timestamp and buffer rule in SQLite and `scene.json`.
- Keep the full 305-item catalog for traceability, but prioritize photographs and LOD in this 300m zone. Never use the legacy 750m context design for rendering without an explicit scope change.

## Map comparison policy — Google Terrain and raised buildings
- Google Maps Terrain map type is a physical relief basemap, *not* a raw DEM nor the source of 3D building mesh. Google vector basemaps at close zoom may display raised/extruded building forms; photorealistic 3D has separate, location-dependent coverage.
- As of 2026-10-13 scene contains 159 OSM road segments, 8 park polygons, one lakeshore water polygon (OSM way 217484891), 16 building-tag polygons with *zero independently verified OSM heights*, and **42 synthetic frontage buildings** produced by `populateFrontages` (14 north, 14 south, 8 east, 6 west). Never identify these 42 as actual surveyed real estate.
- Highest priority fidelity correction is replacing 42 synthetic facades with real verifiable building footprints / measured heights. Preserve missing data as NULL, label estimated heights. Maintain illustrative/verified layer toggle.
- Background plane is a flat 990 m x 990 m mesh, not terrain data. Do not misrepresent that as Google Terrain or surveyed elevation. Terrain elevation work only from independent, licensed DEM or authorized local survey.
- Google Maps Platform Terms restrict scraping and creating 3D building, road, terrain or other derivative datasets from Google Maps imagery/tiles. **Do not extract or trace Google's raised buildings into repo SQLite or mesh**. The Google map UI can be opened as an interactive visual reference; use OSM, independently licensed imagery and permitted field photographs for actual source material.
- Do not claim that photorealistic 3D or even vector raised-building coverage has been verified at Hồ Trúc Giang unless a location-specific check was actually performed. Google Maps 3D coverage changes over time.
- Full audit, stage counts, and prioritized gap table: read `COMPARISON.md` subsection "Đối chiếu bổ sung — Google Maps Terrain / Raised Buildings".
- When users provide screenshots, compare **same heading, pitch, center, visible area**. Flag Google imagery acquisition dates when unknown; never treat recent changes as historically verified.

## Hồ Trúc Giang water visual fidelity — water V3
- Source lake footprint must remain OSM way 217484891. The source geometry is an approx. **16,840 m²** surface with a perimeter about **553m** and 24 unique OSM points (at the checked snapshot). Not survey-grade; don't falsely assert water outline equals a recent Google satellite image.
- Smooth geometry only for **visual presentation** using bounded centripetal Catmull-Rom interpolation; max displacement 1.7 m from original segment, fallback to raw boundary if area differs by more than 3.5%. **Never edit SQLite/scene.json source ring to reflect a visual smoothing operation**.
- Water shader uses calm dark jade, view-angle-dependent broad sky tint, very mild ripples, and soft procedural vegetation reflections anchored near shoreline. It does **not implement physically accurate mirror reflections**. Avoid exaggerated electric cyan opaque water and thick concentric beige promenades.
- Concrete curb remains narrow; approximate paved path, hedge strip and outer pavement together are about 9m. Trees are a visual sample near shore and need actual surveyed position later.
- Compare at least two real Trúc Giang photos with different sky conditions: Addflag flycam view and TripHunter daytime eye-level. Reflection/color varies greatly with weather; no single opaque color can match every time of day.
- QA must check the screenshot **visually**, verify WebGL shader compile on desktop/320/390px mobile and lakeGeometry originalArea/visualDeviationPct in debug. Never treat WebGL frame count as proof of source geometry accuracy.

## Implemented Warestack-style floor-plan and axis workbench (2026-10-13)
- Source code: \`index.html\` renderer (Three.js), \`lake-shape.js\` standalone proposed shoreline, \`workbench.js\` plan/axis/split overlay, and \`workbench.css\` white/blue styling based on the actual \`../warestack-3d.html\` repo style (not a guessed dark theme).
- Full 3D/PLAN/SPLIT mode buttons are functional; PLAN is a top-down North-up 2D canvas showing street/park/building OSM features, source vs proposed water polygon, scale bar, north arrow, 12 feature anchors and camera position. Tapping plan sets camera target and opens SPLIT. Drag to pan and wheel/+/− to zoom plan.
- 3-axis interactive compass: X=East, Y=Up, Z=North, axis click selects East/Top/North. TOP/N/E/ISO accessible presets. Camera physical Y is vertical, X is local east, Z local north, always preserve normal orbit gestures and split WebGL resolution.
- Shape presets: \`candidate\` is default, contains an original hand-authored schematic of north promontory/water notch, diagonal south and east convex bank in approximate *local XY metres*. **Not digitized Google Maps data, NOT verified GPS**. \`raw\` is the unmodified OSM water way 217484891. Toggle must rebuild water + promenade + trees + fountain together and remain reversible, preserving SQLite and source \`scene.json\`.
- For the corrected illustration, fountain is an east-half visual proxy at x≈54 m / z≈−1 m. This does not modify stored geotagged real-world object position or infer EXIF/camera pose. When displaying fountain photo hotspot, project to its temporary scene proxy.
- Do not use area-only QA to suppress intentional geometry correction. Acceptance is preservation of B01–B12 including B03 northern notch, diagonal B10 lower shore and E curvature. Compare raw/candidate north-up in floorplan; keep permanent 'unverified' label.
- Interface layout must remain mobile-first 320px, 390px, landscape with working and non-captured pointer controls (exclude workbench controls from stage pointer capture).
- CI: node scripts/test_ben_tre.mjs screenshots modes on desktop/mobile and validates switch OSM→candidate, floorplan canvas, split width, TOP axis and 12 shape anchors. Verify successful webgl triangles too.

## Mandatory lake shape evidence from user screenshot (2026-10-13)
- The user's 1536×1073 screenshot of Google Maps at Hồ Trúc Giang is the new **visual counterexample** to blindly trusting shape smoothing. Read \`SHORELINE_IMAGE_ANALYSIS.md\` before altering water, promenade, camera, fountain or park.
- The lake is an asymmetric elongated bean-shaped surface: north bank has a **land promontory projecting south into water at approximately pixel (877,370)**, visibly leaving a concave notch in the WATER boundary; the south bank is **diagonal from west-upper to east-lower**, with another smaller inward bend near (967,785); east edge is a long convex curve; southeast round lobe; west side irregular.
- Current OSM way 217484891 has a north indentation but its bottom edge stays almost east-west rather than the strong diagonal shown in the screenshot. Hence geometry itself—not only material, camera or CatmullRom smoothing—is potentially incorrect. Original area ~16,840m² is not a silhouette acceptance criterion.
- **Do not assert the photo screenshot has survey-grade lat/lon**: screen coordinates are independent of GPS until georegistered against legally sourced control points. The fountain in the screenshot is in the lake's eastern section; the previous mesh at (0,0) is an unverified placeholder.
- The 68-point hand-traced pixel outline and original Google/Airbus screenshot are **for user-private visual annotation only**; do not commit copyrighted image, vectorized Google imagery, or derived shape to the public GIS/model database. To correct geometry, require independent GPS/OSM/licensed imagery; store source/date/uncertainty.
- Lake shape acceptance is segment-based: north #02–03–04 notch, southern #11–10–09–08 slope and land protrusions, east #05–06–07 curve. Show water-only north-up silhouette overlay **before** decorating shore. Verify annotations/images on desktop AND mobile.

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
