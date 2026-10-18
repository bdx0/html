#!/usr/bin/env python3
"""Non-destructive object review baseline for Hồ Trúc Giang.

Reads the existing CAD illustration vectors and OSM scene; creates its OWN
SQLite + JSON catalog for the review UI. Does not write catalog.sqlite,
scene.json, cad-gis-vector-data.js, or any GIS source.

User decisions stay out of this seed: only explicitly imported review bundles
can create approved rows in a later, audited step.
"""
import argparse
import base64
import json
import hashlib
import re
import sqlite3
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLASSES = {
 "water": "lake_surface", "shoreline": "lake_edge",
 "waterfront_walk": "sidewalk", "trees": "tree",
 "roads": "road_surface", "parks": "park_area", "buildings": "building",
 "plazas": "plaza", "fountain": "fountain", "review_points": "review_point",
 "osm_reference": "osm_reference",
}
OSM_CLASSES = {"water": "lake_surface", "road": "road_surface", "park": "park_area",
               "building": "building"}
TEMPLATES = {
 "lake_surface": [
  ("water_depth_m","Độ sâu nước","m",0,15,.1),
  ("water_level_m","Cao độ mặt nước","m",-10,20,.1),
  ("water_tint","Màu nước mô phỏng","color",None,None,None)],
 "lake_edge": [
  ("shoreline_offset_m","Dịch mép nước (xem thử)","m",-20,20,.25),
  ("curb_height_m","Cao kè so với lối dạo","m",0,3,.05)],
 "lake_wall": [
  ("wall_height_m","Chiều cao kè","m",0,4,.05),
  ("wall_thickness_m","Bề dày thành kè","m",0,2,.05)],
 "railing": [
  ("height_m","Chiều cao lan can","m",0,2.5,.05),
  ("post_spacing_m","Khoảng cách cột","m",.3,5,.1),
  ("coverage","Có lan can tại đoạn này?","choice",None,None,None)],
 "tree": [
  ("tree_height_m","Chiều cao cây","m",1,35,.5),
  ("canopy_diameter_m","Đường kính tán","m",.5,25,.5),
  ("trunk_diameter_m","Đường kính thân","m",.05,3,.05),
  ("species","Loài cây","text",None,None,None)],
 "road_surface": [
  ("road_width_m","Bề rộng mặt đường","m",2,35,.5),
  ("lanes","Số làn xe","integer",1,8,1)],
 "sidewalk": [
  ("walkway_width_m","Bề rộng lối đi","m",.5,20,.25),
  ("pavement","Vật liệu lát","text",None,None,None)],
 "ground": [("elevation_m","Cao độ nền","m",-10,20,.1),
            ("surface_material","Chất liệu nền","text",None,None,None)],
 "building": [("height_m","Chiều cao nhà","m",2,50,.5),
              ("levels","Số tầng","integer",1,15,1),
              ("roof_type","Kiểu mái","text",None,None,None)],
 "school": [("height_m","Chiều cao trường","m",2,35,.5),
            ("levels","Số tầng","integer",1,12,1)],
 "cafe": [("height_m","Chiều cao quán","m",2,25,.5),
          ("levels","Số tầng","integer",1,8,1)],
 "vacant_lot": [("ground_elevation_m","Cao độ nền đất","m",-10,20,.1)],
 "park_area": [("ground_elevation_m","Cao độ nền công viên","m",-10,20,.1)],
 "fountain": [("jet_height_m","Độ cao tia nước","m",0,15,.25)],
 "plaza": [("pavement","Vật liệu lát","text",None,None,None)],
}
def load_cad():
    text = (ROOT/"cad-gis-vector-data.js").read_text(encoding="utf-8")
    match = re.search(r'TrucGiangCadGisPacked\s*=\s*"([A-Za-z0-9+/=]+)"', text)
    if not match:
        raise ValueError("CAD packed vector not found; refuse to silently fabricate data")
    decoded = json.loads(zlib.decompress(base64.b64decode(match.group(1))))
    features = decoded.get("features")
    if not isinstance(features,list) or len(features)<20:
        raise ValueError("Missing CAD illustration features")
    return features

def make():
    cad=load_cad()
    scene=json.loads((ROOT/"data/scene.json").read_text(encoding="utf-8"))
    items=[]
    for i,f in enumerate(cad):
        layer,geom_type,coords,desc=f
        if layer not in CLASSES:
            continue
        items.append({
            "id":f"cad:{layer}:{i:04d}","name":desc or f"{CLASSES[layer]} #{i+1}",
            "category":CLASSES[layer],"source":"cad_illustration",
            "source_reference":"cad-gis-vector-data.js",
            "geometry":{"type":geom_type,"coordinates":coords,"crs":"CAD illustration pixels, not EPSG:4326"},
            "verification":"illustrative_unverified","kind":"cad","cad_index":i,
        })
    for feat in scene["features"]:
        if feat["kind"] not in OSM_CLASSES: continue
        items.append({
            "id":feat["id"],"name":feat.get("properties",{}).get("name") or feat["id"],
            "category":OSM_CLASSES[feat["kind"]],"source":"osm_crowdsourced",
            "source_reference":f"https://www.openstreetmap.org/way/{feat['osm_id']}",
            "geometry":feat["geometry"],"verification":"community_unverified",
            "kind":"osm",
        })
    manual=[
        ("review:lake_wall","Thành kè hồ","lake_wall","cad_illustration"),
        ("review:railing","Lan can ven hồ (chưa rõ đoạn)","railing","user_review_pending"),
        ("review:ground","Mặt đất nền","ground","user_review_pending"),
        ("review:school","Trường mẫu giáo góc đông-bắc","school","user_visual_note"),
        ("review:cafe","Quán cà phê phía đông","cafe","user_visual_note"),
        ("review:vacant_north_1","Đất trống phía bắc 1","vacant_lot","user_visual_note"),
        ("review:vacant_north_2","Đất trống phía bắc 2","vacant_lot","user_visual_note"),
    ]
    for ident,name,category,source in manual:
        items.append({"id":ident,"name":name,"category":category,"source":source,
                      "source_reference":"User-reviewed conversation / location not surveyed",
                      "geometry":None,"verification":"visual_note_unverified",
                      "kind":"annotation"})
    return {
        "schema":"truc-giang-object-review-base-v1",
        "origin":scene["origin"],"scene_snapshot":scene.get("snapshot"),
        "cad_note":"Vector traced from an illustrative image; NOT surveyed CAD; orientation/georeference unresolved.",
        "osm_note":"OSM community geometry is distinct from CAD illustrative pixels: NOT directly overlaid.",
        "readonly_baseline":True,
        "templates":{k:[{"key":a,"label":b,"unit":u,"min":mn,"max":mx,"step":st}
                        for a,b,u,mn,mx,st in v] for k,v in TEMPLATES.items()},
        "objects":items,
        "stats":{"cad_objects":sum(x["kind"]=="cad" for x in items),
                 "osm_objects":sum(x["kind"]=="osm" for x in items),
                 "review_placeholders":len(manual)}
    }


def import_archived_reviews(db, data):
    """Replay committed, immutable review bundles. Never promote visual approval
    to measured verification and never mutate the source catalog.
    """
    archive=ROOT/"data/object-review/reviews"
    specs=data["templates"]
    known={o["id"]:o for o in data["objects"]}
    seen={}
    events=[]
    if not archive.exists():
        return 0
    for path in sorted(archive.glob("*.json")):
        raw=path.read_bytes()
        if len(raw)>12_000_000:
            raise ValueError("Review archive too large: "+str(path))
        bundle=json.loads(raw)
        if bundle.get("schema")!="truc-giang-review-bundle-v1":
            raise ValueError("Invalid review bundle: "+str(path))
        sha=hashlib.sha256(raw).hexdigest()
        for ev in bundle.get("events",[]):
            if not isinstance(ev,dict) or ev.get("action")!="visual_approve":
                continue
            ident=ev.get("eventId");oid=ev.get("objectId")
            if oid not in known or not isinstance(ident,str) or not ident.startswith("evt:"):
                raise ValueError("Unknown review object/event in "+str(path))
            payload=ev.get("payload") or {}
            values=payload.get("parameters") or {}
            template={s["key"]:s for s in specs.get(known[oid]["category"],[])}
            if not isinstance(values,dict) or any(k not in template for k in values):
                raise ValueError("Unknown parameter in "+str(path))
            for key,value in values.items():
                if value is None or value=="": continue
                s=template[key]
                if s["unit"] in ("m","integer"):
                    if (not isinstance(value,(float,int)) or isinstance(value,bool)
                        or not s["min"]<=value<=s["max"]
                        or s["unit"]=="integer" and int(value)!=value):
                        raise ValueError("Invalid measurement in "+str(path))
                elif not isinstance(value,str) or len(value)>150:
                    raise ValueError("Invalid text parameter in "+str(path))
            ring=payload.get("ring")
            if ring is not None:
                if (known[oid]["category"]!="lake_surface" or
                    known[oid]["source"]!="cad_illustration" or
                    not isinstance(ring,list) or not 5<=len(ring)<=600 or
                    not all(isinstance(p,list) and len(p)==2 and
                    all(isinstance(v,(int,float)) and not isinstance(v,bool) and -600<=v<=2300
                        for v in p) for p in ring)):
                    raise ValueError("Invalid visual-only candidate ring in "+str(path))
            recorded=(
                ident,oid,ev.get("timestamp") or "",
                "visual_approve",json.dumps(payload,ensure_ascii=False),
                "visual_review_only_not_surveyed",sha
            )
            if ident in seen:
                if seen[ident][:6]!=recorded[:6]:
                    raise ValueError("Conflicting duplicated review event: "+ident)
                continue
            seen[ident]=recorded
            events.append(recorded)
    for event in sorted(events,key=lambda x:(x[2],x[0])):
        db.execute("INSERT INTO review_events VALUES (?,?,?,?,?,?,?)",event)
        values=json.loads(event[4]).get("parameters") or {}
        for key,value in values.items():
            db.execute("""INSERT INTO approved_parameters VALUES (?,?,?,?,?)
              ON CONFLICT(object_id,parameter_key) DO UPDATE SET
              value_json=excluded.value_json, review_level=excluded.review_level,
              event_id=excluded.event_id""",
              (event[1],key,json.dumps(value,ensure_ascii=False),event[5],event[0]))
    return len(events)

def publish(outdir):
    outdir.mkdir(parents=True,exist_ok=True)
    data=make()
    json_path=outdir/"object-review-base.json"
    json_path.write_text(json.dumps(data,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    db_path=outdir/"object-review.sqlite"
    if db_path.exists(): db_path.unlink()
    db=sqlite3.connect(db_path)
    try:
        db.executescript("""
          PRAGMA foreign_keys=ON;
          CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
          CREATE TABLE sources (id TEXT PRIMARY KEY, type TEXT NOT NULL, verified INTEGER NOT NULL DEFAULT 0);
          CREATE TABLE object_types (id TEXT PRIMARY KEY, display_name TEXT NOT NULL);
          CREATE TABLE objects (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, type_id TEXT NOT NULL REFERENCES object_types(id),
            source_id TEXT NOT NULL REFERENCES sources(id), source_reference TEXT,
            verification TEXT NOT NULL, geometry_json TEXT, geometry_crs TEXT, asset_kind TEXT NOT NULL
          );
          CREATE TABLE parameter_specs (
            type_id TEXT NOT NULL REFERENCES object_types(id), key TEXT NOT NULL,
            label TEXT NOT NULL, unit TEXT NOT NULL, minimum REAL, maximum REAL, step REAL,
            PRIMARY KEY(type_id,key)
          );
          CREATE TABLE review_events (
            event_id TEXT PRIMARY KEY, object_id TEXT NOT NULL REFERENCES objects(id),
            event_time TEXT NOT NULL, action TEXT NOT NULL, payload_json TEXT NOT NULL,
            review_level TEXT NOT NULL, source_bundle_sha256 TEXT NOT NULL
          );
          CREATE TABLE approved_parameters (
            object_id TEXT NOT NULL REFERENCES objects(id), parameter_key TEXT NOT NULL,
            value_json TEXT, review_level TEXT NOT NULL, event_id TEXT REFERENCES review_events(event_id),
            PRIMARY KEY(object_id,parameter_key)
          );
          CREATE INDEX idx_object_type ON objects(type_id);
          CREATE INDEX idx_review_object ON review_events(object_id,event_time);
        """)
        db.executemany("INSERT INTO metadata VALUES (?,?)", [
            ("schema",data["schema"]),("scene_snapshot",str(data["scene_snapshot"])),
            ("cad_warning",data["cad_note"]),("readonly_baseline","true")])
        sources={x["source"] for x in data["objects"]}
        db.executemany("INSERT INTO sources VALUES (?,?,0)",[(s,s) for s in sorted(sources)])
        types={x["category"] for x in data["objects"]}|set(TEMPLATES)
        db.executemany("INSERT INTO object_types VALUES (?,?)",[(t,t) for t in sorted(types)])
        for kind,specs in data["templates"].items():
            db.executemany("INSERT INTO parameter_specs VALUES (?,?,?,?,?,?,?)",[
                (kind,s["key"],s["label"],s["unit"],s["min"],s["max"],s["step"]) for s in specs])
        db.executemany("INSERT INTO objects VALUES (?,?,?,?,?,?,?,?)",[
            (x["id"],x["name"],x["category"],x["source"],x["source_reference"],
             x["verification"],json.dumps(x["geometry"],ensure_ascii=False) if x["geometry"] else None,
             x["geometry"]["crs"] if x["geometry"] and "crs" in x["geometry"]
             else ("EPSG:4326" if x["source"]=="osm_crowdsourced" else None),x["kind"])
            for x in data["objects"]])
        event_count=import_archived_reviews(db,data)
        db.commit()
        assert db.execute("PRAGMA integrity_check").fetchone()[0]=="ok"
        assert db.execute("SELECT COUNT(*) FROM objects").fetchone()[0]==len(data["objects"])
        assert db.execute("SELECT COUNT(*) FROM review_events").fetchone()[0]==event_count
        print(json.dumps({"objects":len(data["objects"]),"stats":data["stats"],
                          "sqlite":str(db_path),"json":str(json_path),"archived_events":event_count},ensure_ascii=False))
    finally: db.close()

if __name__=="__main__":
    a=argparse.ArgumentParser()
    a.add_argument("--output",type=Path,default=ROOT/"data")
    publish(a.parse_args().output)
