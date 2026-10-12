#!/usr/bin/env python3
"""Import a user-exported, opt-in Bến Tre field-photo bundle.

This is a local maintainer command, not an HTTP upload endpoint.
Writes curated metadata + image assets into git-tracked source folders.
CI / GitHub Pages builds then read the manifest to export SQLite + scene.json.

Usage:
  python3 bo-ho-ben-tre/scripts/import_survey.py /path/to/ho-truc-giang-khao-sat-2026-10-13.json
  python3 bo-ho-ben-tre/scripts/build.py --osm

Security/privacy:
  - Human review before committing; image geotags may reveal sensitive data.
  - Refuses missing consent, out-of-AOI coordinates, unsupported or very large blobs.
  - GPS is a manually placed model pin; not EXIF survey-grade camera position.
"""
import argparse
import base64
import binascii
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import tempfile

BASE=Path(__file__).resolve().parents[1]
SURVEY=BASE/"data"/"surveys"
ASSETS=BASE/"assets"/"surveys"
MANIFEST=SURVEY/"manifest.json"
SCENE=BASE/"data"/"scene.json"
MAX_FILE=12*1024*1024
MAX_BUNDLE=110*1024*1024
MAX_ITEMS=60
ORIGIN_LON=106.37814
ORIGIN_LAT=10.23861
MIME={"image/jpeg":("jpg",b"\xff\xd8\xff"),"image/png":("png",b"\x89PNG\r\n\x1a\n"),"image/webp":("webp",b"RIFF")}
IDENT=re.compile(r"^SURV-[A-Z0-9]{12,40}$")
DATE=re.compile(r"^20\d\d-\d\d-\d\d$")
VALID_SCHEMAS={"ben-tre-field-survey-v1"}

def fail(message):
    raise ValueError(message)

def get_lake_ring():
    if not SCENE.exists():fail("Generate scene.json with --osm before importing photos")
    d=json.loads(SCENE.read_text(encoding="utf-8"))
    lake=next((f for f in d.get("features",[]) if f.get("osm_id")==217484891 and f.get("kind")=="water"),None)
    if not lake:fail("OSM shoreline 217484891 is missing; cannot validate 300m scope")
    return lake["geometry"]["coordinates"][0]

def distance_to_shore(lon,lat,ring):
    cos=math.cos(math.radians(ORIGIN_LAT))
    x=(lon-ORIGIN_LON)*111320*cos
    y=(lat-ORIGIN_LAT)*111320
    coords=[((p[0]-ORIGIN_LON)*111320*cos,(p[1]-ORIGIN_LAT)*111320) for p in ring]
    inside=False;minimum=float("inf")
    for (ax,ay),(bx,by) in zip(coords,coords[1:]):
        dx=bx-ax;dy=by-ay
        t=max(0,min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy or 1)))
        minimum=min(minimum,math.hypot(x-ax-dx*t,y-ay-dy*t))
        if ((ay>y)!=(by>y)) and x<(bx-ax)*(y-ay)/(by-ay)+ax:
            inside=not inside
    return 0 if inside else minimum

def validate_photo(obj,ring):
    if not isinstance(obj,dict):fail("Photo object must be JSON map")
    pid=obj.get("id","")
    if not isinstance(pid,str) or not IDENT.fullmatch(pid):fail("Invalid survey photo ID")
    if obj.get("rights_approved") is not True:fail(pid+" lacks public rights approval")
    title=obj.get("title","")
    if not isinstance(title,str) or not title.strip() or len(title)>120:fail(pid+" invalid title")
    heading=obj.get("heading_deg")
    if not isinstance(heading,int) or not 0<=heading<360:fail(pid+" invalid compass bearing")
    lat,lon=obj.get("lat"),obj.get("lon")
    if not isinstance(lat,(int,float)) or not isinstance(lon,(int,float)) or not math.isfinite(lat) or not math.isfinite(lon):
        fail(pid+" invalid point coordinates")
    local_x=(lon-ORIGIN_LON)*111320*math.cos(math.radians(ORIGIN_LAT))
    local_z=(lat-ORIGIN_LAT)*111320
    if any(not isinstance(obj.get(k),(int,float)) or not math.isfinite(obj[k]) for k in ("x_m","z_m")):
        fail(pid+" missing local coordinates")
    if abs(local_x-obj["x_m"])>5 or abs(local_z-obj["z_m"])>5:fail(pid+" GPS and model point differ >5m")
    d=distance_to_shore(lon,lat,ring)
    if d>300.5:fail(pid+" is outside 300m lakeshore area: "+str(round(d,1))+"m")
    date=obj.get("captured_on") or ""
    if date and (not isinstance(date,str) or not DATE.fullmatch(date)):fail(pid+" invalid captured_on date")
    image=obj.get("image")
    if not isinstance(image,dict):fail(pid+" has no image object")
    mime=image.get("mime")
    if mime not in MIME:fail(pid+" mime type not permitted")
    encoded=image.get("base64","")
    if not isinstance(encoded,str) or len(encoded)>MAX_FILE*4//3+12:fail(pid+" image too large")
    try:bits=base64.b64decode(encoded,validate=True)
    except (ValueError,binascii.Error):fail(pid+" bad image encoding")
    if not 32<=len(bits)<=MAX_FILE:fail(pid+" bad image byte length")
    ext,signature=MIME[mime]
    if not bits.startswith(signature):fail(pid+" MIME content mismatch")
    if mime=="image/webp" and bits[8:12]!=b"WEBP":fail(pid+" malformed WebP")
    if mime=="image/jpeg" and bits[-2:]!=b"\xff\xd9":fail(pid+" incomplete JPEG")
    if image.get("size")!=len(bits):fail(pid+" image size mismatch")
    digest=hashlib.sha256(bits).hexdigest()
    safe_filename=pid.lower()+"-"+digest[:12]+"."+ext
    notes=obj.get("notes") or ""
    if not isinstance(notes,str):fail(pid+" notes must be text")
    return ({
        "id":pid,"title":title.strip(),"lat":lat,"lon":lon,
        "x_m":round(float(obj["x_m"]),3),"y_m":1.7,"z_m":round(float(obj["z_m"]),3),
        "heading_deg":heading,"captured_on":date,"recorded_on":str(obj.get("recorded_on") or "")[:50],
        "notes":notes[:1200],"rights_approved":True,"image_path":"assets/surveys/"+safe_filename,
        "image_sha256":digest,"mime":mime,"byte_size":len(bits),
        "location_quality":"manually_pinned_3d_not_surveyed_gps",
        "photo_license":"user_supplied_permission_to_publish",
        "origin":"user_opt_in_field_survey"
    },bits,safe_filename)

def import_bundle(path):
    if path.stat().st_size>MAX_BUNDLE:fail("Survey bundle too large; use smaller batches")
    bundle=json.loads(path.read_text(encoding="utf-8"))
    if bundle.get("schema") not in VALID_SCHEMAS:fail("Unsupported survey schema")
    items=bundle.get("photos")
    if not isinstance(items,list) or not 1<=len(items)<=MAX_ITEMS:fail("Expected 1–60 images")
    origin=bundle.get("origin",{})
    if abs(origin.get("lon",0)-ORIGIN_LON)>0.00001 or abs(origin.get("lat",0)-ORIGIN_LAT)>0.00001:
        fail("Wrong project origin")
    ring=get_lake_ring()
    existing=json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {"schema":"ben-tre-curated-surveys-v1","photos":[]}
    ids={p["id"]:p for p in existing["photos"]}
    prepared=[]
    for item in items:
        p,blob,name=validate_photo(item,ring)
        if p["id"] in ids:
            if ids[p["id"]]["image_sha256"]!=p["image_sha256"]:fail("Duplicate ID with different image: "+p["id"])
            continue
        if any(p["id"]==old["id"] for old,_,_ in prepared):fail("Duplicate ID inside bundle")
        prepared.append((p,blob,name))
    ASSETS.mkdir(parents=True,exist_ok=True)
    SURVEY.mkdir(parents=True,exist_ok=True)
    for entry,blob,name in prepared:
        f=ASSETS/name
        if f.exists() and hashlib.sha256(f.read_bytes()).hexdigest()!=entry["image_sha256"]:
            fail("Asset conflict: "+name)
        if not f.exists():f.write_bytes(blob)
        existing["photos"].append(entry)
    existing["photos"].sort(key=lambda p:p["id"])
    with tempfile.NamedTemporaryFile("w",encoding="utf-8",delete=False,dir=SURVEY,suffix=".tmp") as f:
        json.dump(existing,f,ensure_ascii=False,indent=2)
        tmp=f.name
    os.replace(tmp,MANIFEST)
    print(json.dumps({"imported":len(prepared),"total":len(existing["photos"]),"manifest":str(MANIFEST),
          "note":"Review all photo metadata and precise coordinates before publishing to public GitHub."},ensure_ascii=False))

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("bundle",type=Path,help="Exported photo survey JSON bundle")
    args=parser.parse_args()
    try:import_bundle(args.bundle)
    except (ValueError,KeyError,OSError,json.JSONDecodeError) as e:
        print("IMPORT ERROR: "+str(e),file=sys.stderr);sys.exit(1)
