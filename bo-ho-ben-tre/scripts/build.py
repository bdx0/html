#!/usr/bin/env python3
"""Build self-contained SQLite catalog and static scene export (stdlib only).

Usage:
 python3 bo-ho-ben-tre/scripts/build.py
 python3 bo-ho-ben-tre/scripts/build.py --osm

The optional live OSM download uses the OSM API and requires network. Failed
downloads produce an explicitly illustrative scene rather than invented GIS.
"""
import argparse
import datetime
import json
import math
import pathlib
import sqlite3
import sys
import urllib.request
import xml.etree.ElementTree as ET

BASE = pathlib.Path(__file__).resolve().parents[1]
DATA = BASE / "data"
BLUEPRINT = DATA / "catalog-blueprint-v1.json"
ORIGIN = (106.37814, 10.23861)
TODAY = datetime.date.today().isoformat()

IMAGES = [
 ('IMG-01','Hồ nước và công trình ven hồ','water','https://triphunter.vn/media/W1siZiIsIjIwMTYvMDgvMDIvNWZjMzZoa3lkMF9fbmhfUEEuanBnIl1d/%E1%BA%A3nh%20PA.jpg?sha=f24114c271a0314a','https://triphunter.vn/places/ben-tre/items/ho-truc-giang','TripHunter / PA','2016','reference_only'),
 ('IMG-02','Bờ kè uốn cong, lát gạch và cây','promenade','https://addflag.com/images/user/3eeca968-685a-401f-9677-1654372df800/25454507.jpg','https://addflag.com/ho_truc_giang__4361','Addflag / contributor','unknown','reference_only'),
 ('IMG-03','Toàn cảnh hồ về đêm, đài phun cũ','night','https://triphunter.vn/media/W1siZiIsIjIwMTYvMDgvMDIvNHBranFwcmNmYl9fbmhfSHV5bmhfVGhhbmguanBnIl0sWyJwIiwidGh1bWIiLCI2NDB4NDgwXHUwMDNlIl1d/%E1%BA%A3nh%20Huynh%20Thanh.jpg?sha=363f03a993696393','https://triphunter.vn/places/ben-tre/items/ho-truc-giang','TripHunter / Huynh Thanh','2016','reference_only'),
 ('IMG-04','Tượng Trần Văn Ơn năm 2023','monument','https://dongkhoi.baovinhlong.vn/image/fckeditor/upload/2023/20230109/images/tranvanon1.jpg','https://dongkhoi.baovinhlong.vn/le-an-vi-tuong-anh-hung-liet-si-tran-van-on-09012023-a109942.html','Báo Đồng Khởi','2023','reference_only'),
 ('IMG-05','Đường ven hồ, đèn và vòng giao thông','roads','https://dongkhoi.baovinhlong.vn/image/fckeditor/upload/2019/20190423/images/ho-truc-giang.jpg','https://baodongkhoi.vn/phong-su-anh-tp-ben-tre-hom-nay-a59368.html','Báo Đồng Khởi','2019','reference_only'),
 ('IMG-06','Lan can xanh, thiết bị tập thể dục','amenities','https://ik.imagekit.io/tvlk/blog/2025/05/canh-dep-ben-tre-2-1024x768.jpg?tr=q-70%2Cc-at_max%2Cw-1000%2Ch-600','https://www.traveloka.com/vi-vn/explore/destination/canh-dep-ben-tre/581647','Traveloka','2025','reference_only'),
 ('IMG-07','Đài phun nước nghệ thuật nâng cấp','fountain','https://vilight.vn/website/wp-content/uploads/2025/08/Dai-phun-nuoc-ho-truc-giang.jpg','https://vilight.vn/website/thi-cong-dai-phun-nuoc-ho-truc-giang-ben-tre/','Vilight','2025','reference_only'),
 ('IMG-08','Tư liệu flycam toàn khu','aerial','https://img.youtube.com/vi/oE0IASydz38/hqdefault.jpg','https://www.youtube.com/watch?v=oE0IASydz38','OziTraveler / YouTube','2019','reference_only')
]
COSTS = [
 ('C01','Khảo sát ảnh hiện trường','chuyến',None,None,1,'P0','Chưa nhận báo giá; cần khối lượng, quyền ảnh, GPS'),
 ('C02','Khảo sát đo kích thước đối chiếu','ngày',None,None,1,'P0','Chưa báo giá; thiết bị và phương pháp đo cần xác nhận'),
 ('C03','Dựng khối 3D LOD0 từ OSM','khu',None,None,1,'P0','Chi phí nội bộ hoặc thuê ngoài chưa xác định'),
 ('C04','Dựng lại mặt đứng công trình LOD1','căn',None,None,None,'P1','Phụ thuộc số lượng, ảnh phủ và mặt bằng'),
 ('C05','Mô hình chi tiết landmark LOD2','công trình',None,None,None,'P1','Cần danh mục vị trí và ảnh đủ góc'),
 ('C06','Đài phun nước 3D + animation','hạng mục',None,None,1,'P1','Thiết kế tham chiếu không đồng nghĩa bản vẽ hoàn công'),
 ('C07','Hạ tầng hosting GitHub Pages','tháng',0,0,1,'P0','Giả định trang public nằm trong hạn mức GitHub Pages, không phải báo giá dịch vụ'),
 ('C08','Tối ưu WebGL mobile & kiểm thử','đợt',None,None,1,'P0','Chi phí nhân công chưa báo giá'),
 ('C09','Ảnh texture có quyền dùng công khai','bộ',None,None,None,'P1','Chưa có giấy phép rõ ràng'),
 ('C10','Bảo trì ảnh/POI theo thay đổi thực tế','đợt',None,None,None,'P2','Chưa có phương án bảo trì')
]
SOURCE_EXTRA = [
 ('PHOTO-01','Ảnh bờ hồ TripHunter','https://triphunter.vn/places/ben-tre/items/ho-truc-giang','online_image','reference_only'),
 ('PHOTO-02','Ảnh đài phun Vilight','https://vilight.vn/website/thi-cong-dai-phun-nuoc-ho-truc-giang-ben-tre/','online_image','reference_only')
]

def open_db(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists(): path.unlink()
    db = sqlite3.connect(path)
    db.execute("PRAGMA foreign_keys=ON")
    db.executescript("""
    PRAGMA journal_mode=DELETE;
    CREATE TABLE project_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE sources(id TEXT PRIMARY KEY,name TEXT NOT NULL,kind TEXT,url TEXT NOT NULL,license TEXT,period TEXT,notes TEXT);
    CREATE TABLE zones(id TEXT PRIMARY KEY,name TEXT NOT NULL,priority TEXT,lod TEXT,notes TEXT);
    CREATE TABLE requirements(id TEXT PRIMARY KEY,category TEXT NOT NULL,zone TEXT,description TEXT NOT NULL,fields TEXT,format TEXT,source_id TEXT,priority TEXT,lod TEXT,status TEXT,confidence TEXT,acceptance TEXT,method TEXT,FOREIGN KEY(source_id) REFERENCES sources(id));
    CREATE INDEX req_category ON requirements(category,priority);
    CREATE TABLE survey_shots(id TEXT PRIMARY KEY,zone TEXT,subject TEXT,azimuth TEXT,goal TEXT,priority TEXT,status TEXT,metadata TEXT);
    CREATE TABLE objects(id TEXT PRIMARY KEY,kind TEXT NOT NULL,name TEXT NOT NULL,lon REAL,lat REAL,height_m REAL,geometry_accuracy TEXT NOT NULL,verified INTEGER NOT NULL DEFAULT 0,source_url TEXT,notes TEXT);
    CREATE TABLE photos(id TEXT PRIMARY KEY,title TEXT NOT NULL,category TEXT,image_url TEXT,source_url TEXT NOT NULL,author TEXT,year TEXT,license_status TEXT NOT NULL,local_asset_path TEXT,rights_approved INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE photo_links(photo_id TEXT NOT NULL,requirement_id TEXT NOT NULL,relation TEXT NOT NULL DEFAULT 'reference',PRIMARY KEY(photo_id,requirement_id),FOREIGN KEY(photo_id) REFERENCES photos(id),FOREIGN KEY(requirement_id) REFERENCES requirements(id));
    CREATE TABLE object_photos(photo_id TEXT NOT NULL,object_id TEXT NOT NULL,relation TEXT NOT NULL DEFAULT 'reference',PRIMARY KEY(photo_id,object_id),FOREIGN KEY(photo_id) REFERENCES photos(id),FOREIGN KEY(object_id) REFERENCES objects(id));
    CREATE TABLE cost_items(id TEXT PRIMARY KEY,description TEXT NOT NULL,unit TEXT,amount_low_vnd INTEGER,amount_high_vnd INTEGER,quantity REAL,priority TEXT,price_type TEXT NOT NULL,notes TEXT,checked_on TEXT);
    CREATE TABLE cost_quotes(id TEXT PRIMARY KEY,cost_id TEXT NOT NULL,quote_source TEXT NOT NULL,amount_vnd INTEGER NOT NULL,currency TEXT NOT NULL DEFAULT 'VND',valid_on TEXT NOT NULL,evidence_url TEXT,source_type TEXT NOT NULL,FOREIGN KEY(cost_id) REFERENCES cost_items(id));
    CREATE TABLE osm_features(id TEXT PRIMARY KEY,kind TEXT NOT NULL,osm_type TEXT,osm_id INTEGER,geojson TEXT NOT NULL,properties_json TEXT,imported_at TEXT NOT NULL,accuracy TEXT NOT NULL);
    CREATE INDEX osm_kind ON osm_features(kind);
    """)
    return db

def lonlat_m(lon,lat):
    return ((lon-ORIGIN[0])*111320*math.cos(math.radians(ORIGIN[1])),(lat-ORIGIN[1])*111320)

def fetch_osm():
    # A small bounded AOI snapshot. OSM API does not provide survey-grade accuracy.
    bbox=(ORIGIN[0]-.0068,ORIGIN[1]-.0068,ORIGIN[0]+.0068,ORIGIN[1]+.0068)
    url="https://api.openstreetmap.org/api/0.6/map?bbox="+",".join(str(x) for x in bbox)
    req=urllib.request.Request(url,headers={"User-Agent":"TrucGiangDigitalTwin/0.1 (GitHub project bdx0/html; OSM attribution)"})
    with urllib.request.urlopen(req,timeout=26) as f: data=f.read(12_000_000)
    root=ET.fromstring(data)
    nodes={e.get("id"):[float(e.get("lon")),float(e.get("lat"))] for e in root.findall("node")}
    features=[]
    for way in root.findall("way"):
        tags={t.get("k"):t.get("v") for t in way.findall("tag")}
        ids=[n.get("ref") for n in way.findall("nd")]
        coords=[nodes[i] for i in ids if i in nodes]
        if len(coords)<2:continue
        wid=way.get("id"); kind=None; closed=(len(coords)>3 and coords[0]==coords[-1])
        if wid=="217484891" or tags.get("natural")=="water" and closed:kind="water"
        elif tags.get("building") and closed:kind="building"
        elif tags.get("leisure")=="park" and closed:kind="park"
        elif tags.get("highway") and not tags.get("area")=="yes":kind="road"
        if not kind:continue
        if kind in ("water","park","building") and not closed:continue
        # Bound excessive remote geometries and outliers.
        if any(abs(lonlat_m(*p)[0])>1300 or abs(lonlat_m(*p)[1])>1300 for p in coords):continue
        shape={"type":"Polygon" if kind in ("water","park","building") else "LineString",
               "coordinates":[coords] if kind in ("water","park","building") else coords}
        lvl=tags.get("building:levels")
        try:height=float(tags.get("height","").replace("m","").strip())
        except (ValueError,TypeError):height=(float(lvl)*3.1 if lvl and lvl.replace(".","",1).isdigit() else 7.5)
        features.append({"id":"osm-way-"+wid,"kind":kind,"osm_id":int(wid),
                         "geometry":shape,"properties":{"name":tags.get("name",""),"highway":tags.get("highway",""),"height_m":height,
                         "height_estimated":not bool(tags.get("height")),"osm_tags":{k:tags[k] for k in ("building","building:levels","height","natural","leisure","highway") if k in tags}},
                         "accuracy":"osm_crowdsourced"})
    return url,features

def build(outdir, use_osm=False):
    d=json.loads(BLUEPRINT.read_text(encoding="utf-8"))
    assert len(d["requirements"])==305 and len(d["proposed_photo_shots"])==90,"Baseline catalog integrity failure"
    outdir.mkdir(parents=True,exist_ok=True)
    db=open_db(outdir/"catalog.sqlite")
    db.executemany("INSERT INTO project_meta VALUES(?,?)",[
        ("name","Hồ Trúc Giang — Bờ Hồ Bến Tre Digital Twin"),("catalog_version",d["catalog_version"]),
        ("origin_lon",str(ORIGIN[0])),("origin_lat",str(ORIGIN[1])),("crs","EPSG:4326"),("catalog_date",d["catalog_date"]),
        ("asset_geometry_stage","OSM optional; verified field survey pending")])
    for s in d["source_registry"]:
        db.execute("INSERT INTO sources VALUES(?,?,?,?,?,?,?)",(s["id"],s.get("name",""),s.get("kind",""),s.get("url",""),s.get("license",""),s.get("data_period",""),s.get("notes","")))
    for i,name,url,kind,lic in SOURCE_EXTRA:
        db.execute("INSERT INTO sources VALUES(?,?,?,?,?,?,?)",(i,name,kind,url,lic,"unverified","For external reference only"))
    for z in d["proposed_world"]["zones"]:
        db.execute("INSERT INTO zones VALUES(?,?,?,?,?)",(z["id"],z.get("label",""),z.get("priority"),z.get("lod"),z.get("notes")))
    for r in d["requirements"]:
        db.execute("INSERT INTO requirements VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",(
            r["id"],r.get("group",""),r.get("zone",""),r.get("item",""),r.get("required_fields"),
            r.get("format"),r["source_id"] if r.get("source_id") in [s["id"] for s in d["source_registry"]] else None,
            r.get("priority"),r.get("lod"),r.get("collection_status"),r.get("confidence"),r.get("acceptance"),r.get("method")))
    for p in d["proposed_photo_shots"]:
        db.execute("INSERT INTO survey_shots VALUES(?,?,?,?,?,?,?,?)",(
            p["id"],p.get("zone"),p.get("subject"),p.get("azimuth_guidance"),p.get("goal"),p.get("priority"),p.get("status"),p.get("metadata")))
    for a in IMAGES:
        db.execute("INSERT INTO photos(id,title,category,image_url,source_url,author,year,license_status) VALUES(?,?,?,?,?,?,?,?)",a)
    # Match concrete image(s) to every relevant requirement category; preserve remaining as photo_missing.
    cats={
      "IMG-01":["hồ","mặt nước","thủy","lake","water","không gian"],
      "IMG-02":["kè","vỉa","lát","đường dạo","gạch","bồn"],
      "IMG-03":["đêm","đèn","chiếu sáng","môi trường","phản xạ"],
      "IMG-04":["tượng","trần văn ơn","công viên"],
      "IMG-05":["giao thông","đường","đô thị","nhà","kiến trúc"],
      "IMG-06":["thể dục","lan can","thiết bị","ghế","cây"],
      "IMG-07":["phun","vòi","âm nước","rgb"],
      "IMG-08":["địa lý","bản đồ","gis","flycam","tổng thể"]
    }
    for r in d["requirements"]:
        combined=(r.get("group","")+" "+r.get("item","")+" "+r.get("method","")).casefold()
        matches=[iid for iid,keywords in cats.items() if any(k in combined for k in keywords)]
        if not matches:matches=["IMG-08"] # broad contextual reference, not evidence of the item itself
        for iid in matches[:3]:
            relation="reference" if iid!="IMG-08" else "context_only"
            db.execute("INSERT OR IGNORE INTO photo_links VALUES(?,?,?)",(iid,r["id"],relation))
    objs=[
      ("OBJ-LAKE","water","Hồ Trúc Giang",ORIGIN[0],ORIGIN[1],None,"center_reference",0,"https://www.openstreetmap.org/way/217484891","Tâm tham khảo; ranh geometry cần import"),
      ("OBJ-PARK","park","Công viên Trần Văn Ơn",None,None,None,"osm_nearby_reference",0,"https://mapcarta.com/W217484891","Cần lấy tâm/biên thực"),
      ("OBJ-STATUE","monument","Tượng đài Trần Văn Ơn",None,None,None,"unknown",0,"https://dongkhoi.baovinhlong.vn/le-an-vi-tuong-anh-hung-liet-si-tran-van-on-09012023-a109942.html","Ảnh năm 2023, vị trí cần đối chiếu"),
      ("OBJ-FOUNTAIN","fountain","Đài phun nước Hồ Trúc Giang",None,None,None,"unmeasured",0,"https://vilight.vn/website/thi-cong-dai-phun-nuoc-ho-truc-giang-ben-tre/","Thiết kế vòng 5m/10m, không khẳng định as-built"),
      ("OBJ-CIVIC","building","UBND TP Bến Tre (mốc lịch sử)",None,None,None,"unknown",0,"https://mapcarta.com/W217484891","Tình trạng công năng 2026 cần kiểm tra")
    ]
    db.executemany("INSERT INTO objects VALUES(?,?,?,?,?,?,?,?,?,?)",objs)
    for id1,id2 in [("IMG-01","OBJ-LAKE"),("IMG-02","OBJ-LAKE"),("IMG-03","OBJ-LAKE"),("IMG-07","OBJ-FOUNTAIN"),("IMG-04","OBJ-STATUE"),("IMG-05","OBJ-CIVIC"),("IMG-06","OBJ-PARK")]:
        db.execute("INSERT INTO object_photos(photo_id,object_id) VALUES(?,?)",(id1,id2))
    for c in COSTS: db.execute("INSERT INTO cost_items VALUES(?,?,?,?,?,?,?,?,?,?)",(c[0],c[1],c[2],c[3],c[4],c[5],c[6],"planning_assumption" if c[3] is not None else "unknown",c[7],TODAY))
    # True formal quote amount is never populated without a source. The 0 cost is a scoped free-tier assumption only.
    osm_url=None;features=[];error=None
    if use_osm:
        try: osm_url,features=fetch_osm()
        except Exception as e:error=str(e);print("WARN: OSM fetch failed; scene remains illustrative: "+error,file=sys.stderr)
    for f in features:
        db.execute("INSERT INTO osm_features VALUES(?,?,?,?,?,?,?,?)",(f["id"],f["kind"],"way",f["osm_id"],
                   json.dumps(f["geometry"],ensure_ascii=False,separators=(",",":")),
                   json.dumps(f["properties"],ensure_ascii=False,separators=(",",":")),TODAY,f["accuracy"]))
    counts={k:db.execute("SELECT COUNT(*) FROM "+k).fetchone()[0] for k in
            ("requirements","survey_shots","sources","zones","objects","photos","photo_links","cost_items","cost_quotes","osm_features")}
    assert counts["requirements"]==305 and counts["survey_shots"]==90
    db.commit();db.execute("PRAGMA integrity_check");db.execute("VACUUM");db.close()
    scene={
      "schemaVersion":1,"title":"Hồ Trúc Giang — Bờ Hồ Bến Tre","origin":{"lon":ORIGIN[0],"lat":ORIGIN[1],"crs":"EPSG:4326"},
      "mode":"osm_snapshot" if features else "illustrative_no_osm","snapshot":TODAY,"osm_url":osm_url,"osm_error":error,
      "warning":"Chỉ đối tượng OSM có source được xem là hình học bản đồ cộng đồng. Mọi geometry fallback là minh họa.",
      "stats":counts,
      "objects":[{"id":o[0],"kind":o[1],"name":o[2],"lon":o[3],"lat":o[4],"verified":False} for o in objs],
      "images":[{"id":x[0],"title":x[1],"category":x[2],"image_url":x[3],"source_url":x[4],"author":x[5],"year":x[6],"license":"reference_only"} for x in IMAGES],
      "costs":[{"id":x[0],"name":x[1],"unit":x[2],"amount_low_vnd":x[3],"amount_high_vnd":x[4],"quantity":x[5],"price_type":"unknown" if x[3] is None else "planning_assumption"} for x in COSTS],
      "features":features,
      "provenance":{"baseline":"catalog-blueprint-v1.json","map":"© OpenStreetMap contributors, ODbL; https://www.openstreetmap.org/copyright","photos":"external reference only, no redistribution permissions asserted"}
    }
    (outdir/"scene.json").write_text(json.dumps(scene,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    print(json.dumps({"database":str(outdir/"catalog.sqlite"),"scene":str(outdir/"scene.json"),"stats":counts,"mode":scene["mode"]},ensure_ascii=False))
    return scene

if __name__=="__main__":
    a=argparse.ArgumentParser();a.add_argument("--osm",action="store_true");a.add_argument("--output",type=pathlib.Path,default=DATA)
    o=a.parse_args();build(o.output,o.osm)
