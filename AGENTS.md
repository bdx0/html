# AGENTS.md — bdx0/html
## Scope and routing
- This repo is a collection of independent HTML demos. Preserve all existing pages and the root index. The Bến Tre digital twin lives in `bo-ho-ben-tre/`.
- Read `bo-ho-ben-tre/AGENTS.md` before changing its source, database, visuals, surveys or budgets.
- Never call an illustrative building, unmeasured height, placeholder tree or outdated photo a verified 2026 observation.
- Keep `warestack-3d.html` unchanged. It is a UX and diagnostics reference (WebGL + fallback + camera + minimap), not a source of geographical truth.
- For this subproject the source of truth is the SQLite database generated from the catalog blueprint and survey observations. Do not edit browser JSON in isolation.
- New work follows: collect evidence → update data source → regenerate SQLite/scene → validate checks → update the HTML viewer → publish. Keep provenance and licensing metadata.
- GitHub Pages cannot process SQLite SQL queries dynamically. Build static `data/scene.json` for the browser and publish the SQLite file for download/auditing.
