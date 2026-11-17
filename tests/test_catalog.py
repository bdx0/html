"""Catalog invariants; run with python3 -m unittest discover -s tests -p test_catalog.py."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build_catalog import build, CATEGORIES

class CatalogTests(unittest.TestCase):
    def test_repository_catalog(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "catalog.json"
            snapshot = Path(tmp) / "catalog.js"
            build(ROOT, output, snapshot)
            pages = json.loads(output.read_text())["pages"]
            by_path = {p["path"]: p for p in pages}
            self.assertEqual(len(pages), len(by_path))
            self.assertEqual(snapshot.read_bytes(), (ROOT / "catalog.js").read_bytes())
            for page in pages:
                self.assertTrue((ROOT / page["path"]).is_file())
                self.assertIn(page["category"], CATEGORIES)
                if page["parent"]:
                    parent = by_path[page["parent"]]
                    self.assertFalse(parent["parent"])
                    self.assertEqual(parent["category"], page["category"])
            self.assertEqual(sum(p["parent"] == "bo-ho-ben-tre/index.html" for p in pages), 5)

    def test_new_pages_and_aliases(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "index.html").write_text("<title>Home</title>")
            (root / "new.html").write_text('<title>New</title><meta name="catalog:category" content="AI &amp; Software Architecture">')
            (root / "unknown.html").write_text("<title>Unknown</title>")
            (root / "child.html").write_text('<title>Child</title><meta name="catalog:category" content="AI &amp; Phần mềm"><meta name="catalog:parent" content="new.html">')
            (root / "orphan.html").write_text('<title>Orphan</title><meta name="catalog:parent" content="missing.html">')
            build(root, root / "catalog.json")
            by_path = {p["path"]: p for p in json.loads((root / "catalog.json").read_text())["pages"]}
            self.assertEqual(set(by_path), {"new.html","unknown.html","child.html","orphan.html"})
            self.assertEqual(by_path["new.html"]["category"], "AI & Phần mềm")
            self.assertEqual(by_path["unknown.html"]["category"], "Khác")
            self.assertEqual(by_path["child.html"]["parent"], "new.html")
            self.assertEqual(by_path["orphan.html"]["parent"], "")
