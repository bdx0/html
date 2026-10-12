#!/usr/bin/env python3
"""Regression tests for Bến Tre survey roundtrip, entirely offline."""
import base64
import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[2]
SCRIPT=ROOT/"bo-ho-ben-tre"/"scripts"

def load(name):
    spec=importlib.util.spec_from_file_location(name,SCRIPT/(name+".py"))
    mod=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

# Small, known-good transparent PNG. In pipeline only source bytes are stored.
SMALL_PNG=base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==")

class SurveyPipelineTest(unittest.TestCase):
    def setUp(self):
        self.ctx=tempfile.TemporaryDirectory()
        self.addCleanup(self.ctx.cleanup)
        self.path=Path(self.ctx.name)
        self.impact=load("import_survey")
        self.impact.SURVEY=self.path/"data"/"surveys"
        self.impact.ASSETS=self.path/"assets"/"surveys"
        self.impact.MANIFEST=self.impact.SURVEY/"manifest.json"
        self.impact.SCENE=ROOT/"bo-ho-ben-tre"/"data"/"scene.json"
        self.photo={
          "id":"SURV-123456789ABCDEF01234","title":"Bờ kè trước hàng cây",
          "lat":10.23861,"lon":106.37814,"x_m":0.0,"y_m":1.5,"z_m":0.0,
          "heading_deg":90,"captured_on":"2026-10-13","rights_approved":True,
          "notes":"Điểm đặt ghim bằng tay, không phải dữ liệu GPS đo bằng máy",
          "image":{"filename":"test.png","mime":"image/png","size":len(SMALL_PNG),"base64":base64.b64encode(SMALL_PNG).decode()}
        }
    def bundle(self,p):
        b={"schema":"ben-tre-field-survey-v1","origin":{"lat":10.23861,"lon":106.37814},"photos":[p]}
        path=self.path/"import.json";path.write_text(json.dumps(b),encoding="utf-8");return path
    def test_roundtrip_into_db_and_scene(self):
        self.impact.import_bundle(self.bundle(self.photo))
        manifest=json.loads(self.impact.MANIFEST.read_text(encoding="utf-8"))
        self.assertEqual(len(manifest["photos"]),1)
        png=self.path/manifest["photos"][0]["image_path"]
        self.assertEqual(png.read_bytes(),SMALL_PNG)
        builder=load("build")
        builder.BASE=self.path
        builder.BLUEPRINT=ROOT/"bo-ho-ben-tre"/"data"/"catalog-blueprint-v1.json"
        out=self.path/"export"
        scene=builder.build(out)
        self.assertEqual(len(scene["photo_hotspots"]),9)
        self.assertEqual(scene["stats"]["field_surveys"],1)
        self.assertEqual(len([i for i in scene["images"] if i["category"]=="field_survey"]),1)
        db=sqlite3.connect(out/"catalog.sqlite")
        self.assertEqual(db.execute("PRAGMA integrity_check").fetchone()[0],"ok")
        self.assertEqual(db.execute("select count(*) from photo_hotspot_items").fetchone()[0],16)
        self.assertEqual(db.execute("select heading_deg from field_surveys").fetchone()[0],90)
        db.close()
    def test_refuse_unsupported_or_unapproved(self):
        p=dict(self.photo);p["rights_approved"]=False
        with self.assertRaises(ValueError):self.impact.import_bundle(self.bundle(p))
        p=dict(self.photo);p["lat"]=10.24861;p["z_m"]=1113.2
        with self.assertRaises(ValueError):self.impact.import_bundle(self.bundle(p))
        p=dict(self.photo);p["image"]=dict(self.photo["image"]);p["image"]["mime"]="image/jpeg"
        with self.assertRaises(ValueError):self.impact.import_bundle(self.bundle(p))
    def test_manifest_idempotency(self):
        path=self.bundle(self.photo)
        self.impact.import_bundle(path)
        self.impact.import_bundle(path)
        obj=json.loads(self.impact.MANIFEST.read_text(encoding="utf-8"))
        self.assertEqual(len(obj["photos"]),1)

if __name__=="__main__":unittest.main(verbosity=2)
