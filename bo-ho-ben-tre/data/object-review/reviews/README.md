# Visual review archive (append-only)

This directory stores **user-approved review bundles** as distinct JSON files, committed after human review. The browser widget at \`/bo-ho-ben-tre/object-review.html\` exports \`truc-giang-review-YYYY-MM-DD-###.json\`.

## Import protocol
1. User visually reviews/edit an object and clicks **Duyệt trực quan**. The browser stores the audit record in IndexedDB and exports the full JSON history.
2. User shares the JSON with the assistant/maintainer. After checking the \`schema\`, source snapshot, values, geometry validity, provenance, and duplicates, the maintainer saves it to this folder under a unique review-bundle filename (never overwrite earlier files).
3. \`python3 bo-ho-ben-tre/scripts/build_object_review.py\` replays **all** bundles into a separate \`data/object-review.sqlite\` + \`data/object-review-base.json\` as an auditable SQLite database. History entries are immutable; conflicting event IDs fail the build.
4. \`visual_review_only_not_surveyed\` is **NOT** a geodetic survey or approval to update canonical OSM/CAD. The original \`catalog.sqlite\`, \`scene.json\`, and CAD source are never mutated.

Do not use a browser-only IndexedDB entry as a guaranteed server backup. Users should retain downloaded exports until the bundle has been committed and built successfully. Never commit secret, private geolocation or unlicensed images.
