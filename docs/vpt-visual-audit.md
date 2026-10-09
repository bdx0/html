# Vua Pháp Thuật / Magic School — Visual & Technical Reconstruction Audit

> **Status:** 2026-10-09 — Visual research and reconstruction plan (not a claim to possess original source or assets).  
> **Scope:** VTC version at https://vuaphapthuat.go.vn/ and original Magic School / 魔力学堂 screenshots at https://mc.lezi.com/.  
> **Prototype baseline:** [vua-phap-thuat-webgl.html](../vua-phap-thuat-webgl.html).  
> **Legal scope:** original or appropriately licensed artwork only; original assets, logos, IP and game code are not granted for redistribution by the research references.

## A. Primary references

| Area | Reference | Observed evidence |
|---|---|---|
| Open world, trial plaza | https://mc.lezi.com/special/2014/02_brave/img/image001.jpg | Stone plaza depicted as continuous, detailed environment with circular motifs, shoreline, layered scenery, characters with large decorative wings, dense top/right/bottom UI |
| Open world, snowy town | https://mc.lezi.com/uploads.dir/images/articles/2024_03_12/58_240312150048_1.jpg | Oblique/top-down view, roads and stairs visually integrated with environment, small chibi actor scale, NPC quest marker, turquoise ornate UI |
| Open world, dungeon | https://mc.lezi.com/uploads.dir/images/articles/2024_08_16/58_240816165245_1.jpg | Illustrated rocky dungeon, scene occluders, torch light and shadows, floating FX, overlay UI |
| VTC battle | https://vuaphapthuat.go.vn/media/vuaphapthuat/2009/05/21/image1.jpg | Separate combat arena with rune-ring floor, monsters on left and player team on right, floating HP/name labels, chat at bottom |
| Alternate battle | https://p2.bahamut.com.tw/B/2KU/81/0000324481.JPG | Forest battle arena, multiple combatants, spell VFX |
| VTC Pet UI | https://vuaphapthuat.go.vn/media/vuaphapthuat/2010/05/05/VuaPhapThuat_KyNangPet.jpg | Teal ornamental frame, cream/pale green interior, dense numeric grids and slots, miniature pet portrait |
| VTC skill UI | https://vuaphapthuat.go.vn/media/vuaphapthuat/2010/04/18/VuaPhapThuat_KyNang.jpg | Ornamental teal title bar, dense skill ranks, beveled slots, bright ability icons |
| Character key art | https://vuaphapthuat.go.vn/media/vuaphapthuat/2013/06/27/2-dad76.jpg | Super-deformed / anime fantasy styling, outsized expressive hair, weapons, bright gradients |

Additional official documentation:
- https://vuaphapthuat.go.vn/bai-viet/ban-do-xuat-van-thon/3883.html
- https://vuaphapthuat.go.vn/bai-viet/tra-cuu-ban-do/4038.html
- https://vuaphapthuat.go.vn/bai-viet/huong-dan-nhiem-vu-tan-thu/3979.html
- https://vuaphapthuat.go.vn/bai-viet/menu-va-phim-tat/3965.html
- https://vuaphapthuat.go.vn/bai-viet/huong-dan-he-thong-chien-dau-va-tuong-khac/3929.html

**Evidence limits:** The images establish art direction and observable layout, not the internal engine implementation. Do not assert whether maps are internally Tiled TMX, one bitmap, SWF vector layers, 3D geometry, or 4-/8-way sprites without investigating authorized client data.

## B. Why prototype v1 looks unlike the original

| Dimension | Reference target | Prototype v1 | Required intervention |
|---|---|---|---|
| World projection | Painterly, 3/4 oblique overhead world with continuous ground | Strict 2:1 diamond tile lattice | Replace visible diamond grid with original-authored illustrated background; retain invisible navigation grid |
| World structure | Streets, plazas, stairs, cliff edges, shops, plants, signage, environmental story | Flat repeated green/brown tiles with sparse generic trees | Make authored village scene with differentiated districts, occluders, walkability and landmarks |
| Character silhouettes | Chibi anime, oversized heads / expressive hair, outfit, weapon, mounts, wings | Stiff vector magician with simplified shapes | Author style-consistent multi-frame directional sprite sheets with transparent pixels, equipment layering |
| Pet variety | Fantasy creature with species/quality/FX, visibly detailed | One basic turquoise shape | Species-specific sprites, evolution, idle and summon VFX |
| Scene lighting | Saturated bloom, soft shadows, rune glowing, local particles | Limited radial texture effect | Separate underlays, emissive overlays, soft alpha shadows, particle atlas, color grading |
| Game UI | Dense turquoise ornamental fantasy skin, gold outlines, detailed bevels | Modern dark glass dashboard | Legacy-inspired beveled windows, 9-slice frames, dense action icons, gold-turquoise accents |
| Info density | Quest names, health/status, coords, channels, action ribbons, chat | Minimal hud, three buttons | Recreate functional information hierarchy for 1024x768 reference canvas and responsive scaling |
| Combat presentation | Distinct battle scene, combat formations, HP rows, target selection and command strip | Generic burst effect on overworld | Separate battle screen FSM, combatant layout, effects, damage popup and phase/timer |
| Navigation | Click NPC/quest routing and map lookup | Straight-line click-to-move | Collision/navigation graph, A*, screen-to-world transforms, NPC interaction |
| Social richness | Characters, shops, quest markers, names and busy scene | Two static NPCs | Crowd/ambient sprites, nameplates, icons, animation cycles |
| Assets | Authored 2D art with painterly detail, complex sprites | Primitive geometries | Artist-produced or licensed sprites/backgrounds, packed into atlases |

## C. Correct reconstruction assumptions

**Do not confuse pseudo-3D aesthetic with mandatory diamond-isometric world.** The visible references suggest a painted 2D world from a fixed 3/4 camera with sprite-based characters. The correct render model is:

1. World coordinate plane (x,y) and separate collision/navigation data.
2. Illustrated base/ground artwork (map chunks / streaming tiles if desired, invisible seams).
3. Static props with independent depth anchors and masks (building facades, trees, bridges, lanterns).
4. Dynamic sprites (player, NPC, monster, Pet, mounts), render depth ordered by feet anchor / selected height offset.
5. Above-character pieces and foreground occlusion masks.
6. Screen-space labels and quest markers.
7. Spell, ring, glow, particles, screen shake, shadows.
8. HTML/CSS overlay controls and windows (not drawn into the world map).

Do not automatically use world-to-screen formula (x-y, x+y)/2 everywhere. In many screenshot locations the world reads as oblique overhead with roads integrated into one perspective illustration. Calibrate movement/collision in 2D world units independently.

## D. Three separate visual states

### 1. Overworld / Xuất Vân Thôn-inspired village (first benchmark)

- **Reference frame:** 1024x768 screenshot benchmark (game documentation lists XGA 1024x768; internal design resolution unconfirmed).
- Scene: bright fairytale village, painterly grass, winding stone path, detailed central plaza, houses, lush shrubs and magic lamps, quest NPC, portal.
- Anchors: center or slightly below center player; NPC/merchant around buildings; pet near player feet; crowd.
- Top: small ornate event/service icons, channel/coordinates and indicators.
- Right: dense vertical button bar and task context panel.
- Bottom: quick slots, inventory/pet/skill icons, chat lower-left.
- Interaction: click-to-walk with obstacle avoidance; click quest marker → dialog; pet follow; sprite animation, depth occlusion; minimap/quest.

### 2. Turn-based combat (second benchmark)

- **Separate scene** rather than in-world glow.
- Fixed/controlled camera, painterly thematic background and rune arena.
- Enemies left (up to five), party right; floating labels, HP bars and state icons.
- States: entering → command selection → target selection → resolution → opponent turn → outcome.
- Bottom/right compact command buttons: attack, guard, skill, capture, Pet, items, flee, auto.
- Combat outcome client demo only; production server must be authoritative.
- Hit shake, projectile and layered screen glow.

### 3. Pet / inventory / skills (third benchmark)

- Ornate teal/gold 9-slice framed windows with dense rows, tabs, icon slots, number field and tooltips.
- 2-panel master/detail for Pet list + portrait and skills/stats.
- Equipment slot colors, upgrade controls and hover descriptions.
- Functional overlays bound to mock JSON data; not just screenshots.

## E. Asset pipeline and renderer

- Keep **HTML5 + WebGL**: WebGL 2 via PixiJS or Phaser, or custom WebGL for prototype.
- **Art pipeline**: master layered illustrations (original) → sprite sheet/atlas → compressed texture or PNG/WebP → JSON atlas metadata → runtime scene.
- **Maps**: 2D art chunks and collision polygons / grid, hide navigation tile boundaries; separate walkable/nav and visual.
- **Sprite state**: idle, walking, skill, hit, death/capture (frame counts chosen after testing); camera directions specified by available art, not inferred from screenshot.
- **Depth sort**: y + custom anchor and occlusion layers; foreground masking for tree/building overlap.
- **Render**: layered alphas, additive glow pass, particles, anchored world labels, pixel-snapped text.
- **UI**: responsive but benchmark against fixed 1024x768 legacy composition; avoid redesigning as a modern SaaS dashboard.
- **Performance**: texture atlases, GPU draw batching, scene culling, frame time telemetry, avoid enormous per-frame buffer allocations.
- **Safety**: game logic/client cannot authorize items, currency, rewards or battle results; all sensitive decisions server-side.
- **Rights**: reference originals only for visual analysis; do not republish extracted proprietary art/code without license.

## F. Prototype acceptance criteria (not feature-complete MMORPG)

### Milestone P0 — visual proof (no backend)
- One *authored* illustrated village whose screenshot is visually consistent with the reference class: continuous ground, curved footpaths, recognizable architecture, plush nature and decorative props.
- Hero/Pet/NPC use consistent chibi/anime sprites with idle/walk animation.
- Overlap/occlusion correct at trees/building facades.
- UI includes top events, right actions, lower action/ability belt and chat, not minimalist modern design.
- One distinct battle composition populated with enemies/team and interaction.
- One Pet window matching dense ornate legacy information hierarchy.
- Works desktop and mobile without impossible click targets.

### Milestone P1 — interaction
- A* / collision navigation; NPC quest/dialog; action bar keyboard and tap.
- Battle finite-state machine, mock turn-based actions; tooltips; pet summon.

### Milestone P2 — integration / production architecture
- Asset atlases and metadata management, E2E tests, performance testing.
- Server-authoritative game backend and authentication; no real game login until properly scoped/authorized.

## G. Practical workflow and no-go rules

1. Gather at least 3 authorized *uncropped* 1024x768 or equivalent screenshots from **one specific version/time period**: town, overworld, battle; 1 Pet window.
2. Document crop/scale, view direction, feet anchor, UI zones and per-image occlusion manually. Avoid deriving exact projection geometry from one image.
3. Produce a single high-quality scene screenshot/mockup using original assets, review visually **before programming**.
4. Freeze 1 visual benchmark and implement the world renderer + UI layout; validate against reference screenshots.
5. Add animations, interactions, battle, Pet screen.
6. Only then consider full game feature reconstruction.

### Blockers / unknowns
- No original Flash SWF or authorized resource archive inspected; launcher MSI only provides Flash-enabled browser shell.
- Cannot promise pixel-perfect reproduction, character animation counts, exact projection or original navigation/pathfinding behavior.
- Using screenshots for reference ≠ permission to distribute original assets or code.

**Decision:** Keep v1 for technical proof, treat it as visual mismatch. Do not call it faithful remake. Implement v2 against the above art-direction acceptance gates.
