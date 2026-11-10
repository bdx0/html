# AGENTS.md — bdx0/html

## Evidence-first empirical reasoning (shared agent policy)

When investigating real-world phenomena, analyzing data, or making factual claims, prioritize **actual verified observations** over theoretical or fabricated examples.

- **Start with real evidence:** inspect available source files, records, measurements, logs, images, and user observations before selecting a model. Record source, timestamp, scope, sample size, and known limitations.
- **Never invent supporting data:** no fabricated measurements, counts, trends, model scores, outcomes, or environmental labels. Synthetic examples are acceptable only when clearly identified as illustrations or tests, never as empirical evidence.
- **Infer proactively, but qualify:** small observations may motivate meaningful hypotheses about larger hidden mechanisms. Explicitly separate *observation*, *inference*, *assumption*, and *unverified hypothesis*; do not require exhaustive observation before exploring plausible explanations.
- **Let reality constrain theory:** use physical, mathematical, or statistical theory to interpret observations and devise tests, not to overwrite inconvenient evidence. Prefer identifying a mechanism that could be checked.
- **Use only identifiable conditions:** when modeling changes by context and time, use recorded conditions and dates where available. Mark unobserved or confounded variables as unknown; never silently assign them.
- **Test predictive value:** propose falsifiable predictions and assess them on new or held-out observations, against simple baselines and with uncertainty. A historical anomaly alone is not proof of a systematic effect.
- **Stay constructive with sparse data:** give the strongest bounded inference supported by the observations and recommend the smallest next *real* observation that could discriminate between hypotheses, rather than stopping at “insufficient data.”
- **Apply this to repository work too:** inspect the actual code, configuration, and test output before claiming a behavior or a successful fix.

Working sequence: **real observation → context and anomaly → plausible mechanism → explicit hypothesis → testable prediction → verification and revision**.

## Scope and routing
- This repo is a collection of independent HTML demos. Preserve all existing pages and the root index. The Bến Tre digital twin lives in `bo-ho-ben-tre/`.
- Read `bo-ho-ben-tre/AGENTS.md` before changing its source, database, visuals, surveys or budgets.
- Never call an illustrative building, unmeasured height, placeholder tree or outdated photo a verified 2026 observation.
- Keep `warestack-3d.html` unchanged. It is a UX and diagnostics reference (WebGL + fallback + camera + minimap), not a source of geographical truth.
- For this subproject the source of truth is the SQLite database generated from the catalog blueprint and survey observations. Do not edit browser JSON in isolation.
- New work follows: collect evidence → update data source → regenerate SQLite/scene → validate checks → update the HTML viewer → publish. Keep provenance and licensing metadata.
- GitHub Pages cannot process SQLite SQL queries dynamically. Build static `data/scene.json` for the browser and publish the SQLite file for download/auditing.
