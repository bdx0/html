#!/usr/bin/env python3
"""Build a searchable static HTML catalog for GitHub Pages.

Pages are discovered automatically. Add optional metadata in _catalog.json
or in <meta name="description">, <meta name="catalog:category">,
<meta name="catalog:tags">, and <meta name="catalog:icon">.
"""
from __future__ import annotations

import argparse
import json
from html.parser import HTMLParser
from pathlib import Path


EXCLUDED_DIRS = {".git", ".github", "_site", "scripts", "node_modules", "vendor"}
EXCLUDED_FILES = {"index.html", "404.html"}


class PageInfo(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.title = ""
        self.heading = ""
        self._inside_title = False
        self._inside_h1 = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta":
            name = attrs.get("name", "").lower()
            if name:
                self.meta[name] = attrs.get("content", "").strip()
        if tag == "title":
            self._inside_title = True
        if tag == "h1" and not self.heading:
            self._inside_h1 = True

    def handle_endtag(self, tag):
        if tag == "title":
            self._inside_title = False
        elif tag == "h1":
            self._inside_h1 = False

    def handle_data(self, data):
        if self._inside_title:
            self.title += data
        if self._inside_h1:
            self.heading += data


def build(root: Path, output: Path):
    overrides_path = root / "_catalog.json"
    overrides = json.loads(overrides_path.read_text(encoding="utf-8")) if overrides_path.exists() else {}
    pages = []
    for path in sorted(root.rglob("*.html")):
        rel = path.relative_to(root)
        if path.name in EXCLUDED_FILES or any(part.startswith(".") or part in EXCLUDED_DIRS for part in rel.parts[:-1]):
            continue
        if any(part in EXCLUDED_DIRS for part in rel.parts):
            continue
        url = rel.as_posix()
        parser = PageInfo()
        parser.feed(path.read_text(encoding="utf-8"))
        custom = overrides.get(url, {})
        title = custom.get("title") or parser.title.strip() or parser.heading.strip() or path.stem.replace("-", " ").title()
        tags = custom.get("tags", parser.meta.get("catalog:tags", ""))
        if isinstance(tags, str):
            tags = [tag.strip() for tag in tags.split(",") if tag.strip()]
        if not isinstance(tags, list):
            tags = []
        row = {
            "path": url,
            "title": str(title),
            "description": str(custom.get("description") or parser.meta.get("description") or "Khám phá ứng dụng HTML tương tác này."),
            "category": str(custom.get("category") or parser.meta.get("catalog:category") or "Khác"),
            "tags": [str(t) for t in tags][:8],
            "icon": str(custom.get("icon") or parser.meta.get("catalog:icon") or "✦"),
            "theme": str(custom.get("theme", "cyan")),
            "featured": bool(custom.get("featured", False)),
            "order": int(custom.get("order", 999)),
        }
        pages.append(row)
    pages.sort(key=lambda p: (not p["featured"], p["order"], p["title"].casefold()))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({"version": 1, "pages": pages}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {output} with {len(pages)} page(s): " + ", ".join(p["path"] for p in pages))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--output", default="_site/catalog.json")
    args = ap.parse_args()
    build(Path(args.root), Path(args.output))
