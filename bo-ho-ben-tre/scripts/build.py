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
import hashlib
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
 ('IMG-01','Flycam toàn cảnh mặt hồ và các dãy nhà','water','https://addflag.com/images/user/6484f710-1dc1-4786-880b-9e042c478b9b/anh1.jpg','https://addflag.com/ho_truc_giang__4361','Addflag / contributor','unknown','reference_only'),
 ('IMG-02','Bờ kè uốn cong, lát gạch và cây','promenade','https://addflag.com/images/user/3eeca968-685a-401f-9677-1654372df800/25454507.jpg','https://addflag.com/ho_truc_giang__4361','Addflag / contributor','unknown','reference_only'),
 ('IMG-03','Toàn cảnh Hồ Trúc Giang về đêm năm 2019','night','https://dongkhoi.baovinhlong.vn/image/fckeditor/upload/2019/20190423/images/ho-truc-giang.jpg','https://baodongkhoi.vn/phong-su-anh-tp-ben-tre-hom-nay-a59368.html','Báo Đồng Khởi','2019','reference_only'),
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

# Hotspots are anchors for browsing reference photos, NOT geotagged camera positions.
# Coordinates in local east/north meters, origin 106.37814E, 10.23861N.
# Sources describe the depicted subject/category, NOT the exact shooting position.
HOTSPOTS = [
  # id, label, related object id, east x, height y, north z, kind, geometry provenance, description
  ("HS-LAKE-OVERVIEW","Toàn cảnh Hồ Trúc Giang","OBJ-LAKE",-40,2,4,"lake","OSM lake polygon / approximate anchor","Ảnh toàn cảnh; góc máy gốc chưa xác minh."),
  ("HS-FOUNTAIN","Đài phun nước","OBJ-FOUNTAIN",0,4,0,"fountain","approximate center / model proxy","Ảnh công trình đài phun; vị trí phao thực tế và góc chụp cần khảo sát."),
  ("HS-STATUE","Tượng Trần Văn Ơn","OBJ-STATUE",-155,7,-14,"monument","OSM nearby monument / model proxy","Ảnh tượng liên quan trực tiếp; chưa có vị trí camera nguồn."),
  ("HS-NORTH-WALK","Lối dạo bờ bắc","OBJ-LAKE",0,2,60,"promenade","OSM shoreline approximate","Ảnh đường dạo/lan can chỉ là tham chiếu chung, chưa chứng minh góc phía bắc."),
  ("HS-SOUTH-WALK","Lối dạo bờ nam","OBJ-LAKE",0,2,-69,"promenade","OSM shoreline approximate","Ảnh mặt đường và cây ven hồ mang tính minh họa, chưa xác minh là bờ nam."),
  ("HS-WEST-PARK","Công viên Trần Văn Ơn","OBJ-PARK",-177,2,-12,"park","OSM park nearby / approximate center","Tư liệu tượng đài và công viên lân cận; cần ảnh công viên trực tiếp."),
  ("HS-EAST-FRONTAGE","Dãy phố phía đông",None,143,9,-16,"facades","OSM nearby / illustrative facade","Ảnh đường phố tham chiếu bối cảnh, không xác minh mặt tiền nhà cụ thể."),
  ("HS-CIVIC","Khu UBND Bến Tre","OBJ-CIVIC",-195,9,78,"civic","OSM named footprint approximate","Chưa có ảnh mặt đứng UBND được xác minh. Ảnh flycam chỉ mang tính bối cảnh.")
]
# id → photo id, relation, caption. Distinguish subject-specific vs generic reference.
HOTSPOT_PHOTOS = [
  ("HS-LAKE-OVERVIEW","IMG-01","overview","Toàn cảnh hồ — đối chiếu đường bao",1),
  ("HS-LAKE-OVERVIEW","IMG-08","overview","Flycam lịch sử toàn vùng",2),
  ("HS-LAKE-OVERVIEW","IMG-03","historical_context","Khung cảnh hồ năm 2019",3),
  ("HS-FOUNTAIN","IMG-07","depicts_subject","Đài phun nước tại Hồ Trúc Giang năm 2025",1),
  ("HS-FOUNTAIN","IMG-03","historical_context","Cảnh hồ trước khi cải tạo",2),
  ("HS-STATUE","IMG-04","depicts_subject","Ảnh tượng đài Trần Văn Ơn, năm 2023",1),
  ("HS-NORTH-WALK","IMG-02","general_context","Tham chiếu lối dạo quanh hồ; chưa định vị phía bắc",1),
  ("HS-NORTH-WALK","IMG-06","general_context","Lan can và vật dụng ven hồ; góc chụp chưa xác minh",2),
  ("HS-SOUTH-WALK","IMG-02","general_context","Tham chiếu bờ kè, không xác nhận góc phía nam",1),
  ("HS-SOUTH-WALK","IMG-01","overview","Ảnh toàn cảnh để định hướng",2),
  ("HS-WEST-PARK","IMG-04","nearby_subject","Tượng Trần Văn Ơn cạnh công viên",1),
  ("HS-WEST-PARK","IMG-06","general_context","Cảnh quan công viên/chỗ tập; vị trí chưa xác minh",2),
  ("HS-EAST-FRONTAGE","IMG-05","general_context","Đường phố Bến Tre, không phải mặt tiền được xác minh",1),
  ("HS-EAST-FRONTAGE","IMG-08","overview","Flycam khu trung tâm, không phải ảnh từng căn",2),
  ("HS-CIVIC","IMG-08","overview","Flycam chung; chưa có ảnh mặt đứng UBND",1)
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
    CREATE TABLE photo_hotspots(
      id TEXT PRIMARY KEY, label TEXT NOT NULL, object_id TEXT,
      x_m REAL NOT NULL, y_m REAL NOT NULL, z_m REAL NOT NULL,
      kind TEXT NOT NULL, position_accuracy TEXT NOT NULL, notes TEXT NOT NULL,
      is_camera_location INTEGER NOT NULL DEFAULT 0 CHECK(is_camera_location=0),
      FOREIGN KEY(object_id) REFERENCES objects(id)
    );
    CREATE TABLE photo_hotspot_items(
      hotspot_id TEXT NOT NULL, photo_id TEXT NOT NULL,
      relation TEXT NOT NULL CHECK(relation IN ('depicts_subject','nearby_subject','overview','general_context','historical_context','field_observation')),
      caption TEXT NOT NULL, sort_order INTEGER NOT NULL,
      PRIMARY KEY(hotspot_id,photo_id),
      FOREIGN KEY(hotspot_id) REFERENCES photo_hotspots(id),
      FOREIGN KEY(photo_id) REFERENCES photos(id)
    );
    CREATE INDEX hotspot_item_photo ON photo_hotspot_items(photo_id);
    CREATE TABLE field_surveys(
      id TEXT PRIMARY KEY, photo_id TEXT NOT NULL UNIQUE, hotspot_id TEXT NOT NULL UNIQUE,
      lat REAL NOT NULL, lon REAL NOT NULL, heading_deg INTEGER NOT NULL,
      captured_on TEXT, recorded_on TEXT, photo_sha256 TEXT NOT NULL,
      location_accuracy TEXT NOT NULL, user_notes TEXT NOT NULL,
      FOREIGN KEY(photo_id) REFERENCES photos(id),
      FOREIGN KEY(hotspot_id) REFERENCES photo_hotspots(id)
    );
    CREATE TABLE cost_items(id TEXT PRIMARY KEY,description TEXT NOT NULL,unit TEXT,amount_low_vnd INTEGER,amount_high_vnd INTEGER,quantity REAL,priority TEXT,price_type TEXT NOT NULL,notes TEXT,checked_on TEXT);
    CREATE TABLE cost_quotes(id TEXT PRIMARY KEY,cost_id TEXT NOT NULL,quote_source TEXT NOT NULL,amount_vnd INTEGER NOT NULL,currency TEXT NOT NULL DEFAULT 'VND',valid_on TEXT NOT NULL,evidence_url TEXT,source_type TEXT NOT NULL,FOREIGN KEY(cost_id) REFERENCES cost_items(id));
    CREATE TABLE reference_prices(id TEXT PRIMARY KEY,object_id TEXT,description TEXT NOT NULL,price_vnd INTEGER NOT NULL,price_label TEXT NOT NULL,price_date TEXT,source_url TEXT NOT NULL,source_kind TEXT NOT NULL,notes TEXT,FOREIGN KEY(object_id) REFERENCES objects(id));
    CREATE TABLE osm_features(id TEXT PRIMARY KEY,kind TEXT NOT NULL,osm_type TEXT,osm_id INTEGER,geojson TEXT NOT NULL,properties_json TEXT,imported_at TEXT NOT NULL,accuracy TEXT NOT NULL);
    CREATE INDEX osm_kind ON osm_features(kind);
    """)
    return db

def lonlat_m(lon,lat):
    return ((lon-ORIGIN[0])*111320*math.cos(math.radians(ORIGIN[1])),(lat-ORIGIN[1])*111320)


SHORE_BUFFER_M = 300.0

def distance_to_shore(point, ring):
    """Shortest planar distance in meters from point to OSM shoreline; 0 inside lake."""
    x,y=lonlat_m(*point)
    pts=[lonlat_m(*p) for p in ring]
    inside=False
    d2=float("inf")
    for (ax,ay),(bx,by) in zip(pts,pts[1:]):
        dx,dy=bx-ax,by-ay
        v=(x-ax)*dx+(y-ay)*dy
        t=max(0.0,min(1.0,v/(dx*dx+dy*dy))) if dx*dx+dy*dy else 0.0
        d2=min(d2,(x-ax-dx*t)**2+(y-ay-dy*t)**2)
        if (ay>y)!=(by>y) and x<(bx-ax)*(y-ay)/(by-ay)+ax:
            inside=not inside
    return 0.0 if inside else math.sqrt(d2)

def clipped_road(parts, lake):
    """Clip OSM road polyline to <= 300m from shoreline, interpolating segment edges."""
    result=[]
    current=[]
    def point_at(a,b,t):return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
    def cross(a,b,lo,hi,lo_inside):
        for _ in range(19):
            mid=(lo+hi)/2
            if (distance_to_shore(point_at(a,b,mid),lake)<=SHORE_BUFFER_M)==lo_inside:lo=mid
            else:hi=mid
        return point_at(a,b,(lo+hi)/2)
    for a,b in zip(parts,parts[1:]):
        x0,y0=lonlat_m(*a);x1,y1=lonlat_m(*b)
        steps=max(1,int(math.ceil(math.hypot(x1-x0,y1-y0)/12)))
        flags=[distance_to_shore(point_at(a,b,k/steps),lake)<=SHORE_BUFFER_M for k in range(steps+1)]
        for k in range(steps):
            p=point_at(a,b,k/steps);q=point_at(a,b,(k+1)/steps)
            left,right=flags[k:k+2]
            if left and right:
                if not current:current=[p]
                current.append(q)
            elif left:
                boundary=cross(p,q,0.0,1.0,True)
                if not current:current=[p]
                current.append(boundary)
                if len(current)>1:result.append(current)
                current=[]
            elif right:
                boundary=cross(p,q,0.0,1.0,False)
                current=[boundary,q]
    if len(current)>1:result.append(current)
    return result

def fetch_osm():
    # AOI is exactly 300 meters from the shoreline (not 300m from the lake centre).
    # Bounding download may be wider to avoid cutting through the 300m shoreline buffer.
    bbox=(ORIGIN[0]-.0065,ORIGIN[1]-.0065,ORIGIN[0]+.0065,ORIGIN[1]+.0065)
    url="https://api.openstreetmap.org/api/0.6/map?bbox="+",".join(str(x) for x in bbox)
    req=urllib.request.Request(url,headers={"User-Agent":"TrucGiangDigitalTwin/0.2 (GitHub bdx0/html; attribution OpenStreetMap)"})
    with urllib.request.urlopen(req,timeout=26) as f:data=f.read(15_000_000)
    root=ET.fromstring(data)
    nodes={e.get("id"):[float(e.get("lon")),float(e.get("lat"))] for e in root.findall("node")}
    ways=root.findall("way")
    lake_way=next((w for w in ways if w.get("id")=="217484891"),None)
    if lake_way is None:
        raise RuntimeError("OSM lake way 217484891 not present: refusing arbitrary 300m geometry")
    lake=[nodes[r.get("ref")] for r in lake_way.findall("nd") if r.get("ref") in nodes]
    if len(lake)<4 or lake[0]!=lake[-1]:
        raise RuntimeError("OSM lake polygon missing or not closed")
    features=[]
    for way in ways:
        tags={t.get("k"):t.get("v") for t in way.findall("tag")}
        ids=[n.get("ref") for n in way.findall("nd")]
        coords=[nodes[i] for i in ids if i in nodes]
        if len(coords)<2:continue
        wid=way.get("id")
        closed=(len(coords)>3 and coords[0]==coords[-1])
        kind=None
        if wid=="217484891":kind="water"
        elif tags.get("natural")=="water" and closed:kind="water"
        elif tags.get("building") and closed:kind="building"
        elif tags.get("leisure")=="park" and closed:kind="park"
        elif tags.get("highway") and tags.get("area")!="yes":kind="road"
        if not kind:continue
        if kind in ("water","park","building") and not closed:continue
        if kind=="road":
            geometries=[{"type":"LineString","coordinates":g} for g in clipped_road(coords,lake)]
        elif wid=="217484891" or all(distance_to_shore(p,lake)<=SHORE_BUFFER_M for p in coords):
            # Require full polygon to be within 300m; partial polygons are excluded,
            # not silently rendered beyond the requested buffer.
            geometries=[{"type":"Polygon","coordinates":[coords]}]
        else:continue
        lvl=tags.get("building:levels")
        try:height=float(tags.get("height","").replace("m","").strip())
        except (ValueError,TypeError):height=float(lvl)*3.1 if lvl and lvl.replace(".","",1).isdigit() else 7.5
        properties={"name":tags.get("name",""),"highway":tags.get("highway",""),"height_m":height,
                    "height_estimated":not bool(tags.get("height")),
                    "aoi":"shoreline_buffer_300m",
                    "osm_tags":{k:tags[k] for k in ("building","building:levels","height","natural","leisure","highway") if k in tags}}
        for i,shape in enumerate(geometries):
            features.append({"id":"osm-way-"+wid+("-seg-"+str(i) if len(geometries)>1 else ""),
                             "kind":kind,"osm_id":int(wid),"geometry":shape,
                             "properties":properties,"accuracy":"osm_crowdsourced"})
    return url,features

def export_sqlite_inspector(db, filename):
    """Portable read-only SQLite mirror for static GitHub Pages, generated from DB.

    Only built tables are exported, never inferred from the browser scene.
    This is not a live SQL connection and can't write back to catalog.sqlite.
    """
    import base64
    tables = []
    for name, ddl in db.execute(
        "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).fetchall():
        safe_name = '"' + name.replace('"', '""') + '"'
        cols = [
            {"name": c[1], "type": c[2], "not_null": bool(c[3]),
             "default": c[4], "pk": bool(c[5])}
            for c in db.execute("PRAGMA table_info(" + safe_name + ")").fetchall()
        ]
        fk = [
            {"from": c[3], "table": c[2], "to": c[4]}
            for c in db.execute("PRAGMA foreign_key_list(" + safe_name + ")").fetchall()
        ]
        raw = db.execute("SELECT * FROM " + safe_name).fetchall()
        def json_value(v):
            if isinstance(v, bytes):
                return {"_type": "blob", "base64": base64.b64encode(v).decode("ascii")}
            return v
        tables.append({
            "name": name, "sql": ddl, "columns": cols, "foreign_keys": fk,
            "count": len(raw),
            "rows": [[json_value(v) for v in row] for row in raw]
        })
    payload = {
        "format": "bdx0-sqlite-inspector-v1",
        "source": "data/catalog.sqlite",
        "generated_on": TODAY,
        "read_only": True,
        "tables": tables
    }
    filename.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return {t["name"]: t["count"] for t in tables}


def build(outdir, use_osm=False):
    d=json.loads(BLUEPRINT.read_text(encoding="utf-8"))
    assert len(d["requirements"])==305 and len(d["proposed_photo_shots"])==90,"Baseline catalog integrity failure"
    outdir.mkdir(parents=True,exist_ok=True)
    db=open_db(outdir/"catalog.sqlite")
    db.executemany("INSERT INTO project_meta VALUES(?,?)",[
        ("name","Hồ Trúc Giang — Bờ Hồ Bến Tre Digital Twin"),("catalog_version",d["catalog_version"]),
        ("origin_lon",str(ORIGIN[0])),("origin_lat",str(ORIGIN[1])),("crs","EPSG:4326"),("catalog_date",d["catalog_date"]),
        ("asset_geometry_stage","OSM optional; verified field survey pending"),("focus_rule","OSM shoreline way 217484891 + 300m; roads clipped, whole polygons required")])
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
    db.executemany(
      "INSERT INTO photo_hotspots(id,label,object_id,x_m,y_m,z_m,kind,position_accuracy,notes) VALUES(?,?,?,?,?,?,?,?,?)",
      HOTSPOTS
    )
    db.executemany(
      "INSERT INTO photo_hotspot_items(hotspot_id,photo_id,relation,caption,sort_order) VALUES(?,?,?,?,?)",
      HOTSPOT_PHOTOS
    )
    # Import curated, permission-approved field observations. The browser never edits SQLite directly.
    manifest=BASE/"data"/"surveys"/"manifest.json"
    if manifest.exists():
        payload=json.loads(manifest.read_text(encoding="utf-8"))
        if payload.get("schema")!="ben-tre-curated-surveys-v1":
            raise ValueError("Unsupported curated field manifest schema")
        for entry in payload.get("photos",[]):
            path=entry["image_path"]
            asset=BASE/path
            if not path.startswith("assets/surveys/") or not asset.is_file():
                raise ValueError("Survey asset missing or unsafe path "+str(path))
            if hashlib.sha256(asset.read_bytes()).hexdigest()!=entry["image_sha256"]:
                raise ValueError("Survey image checksum mismatch "+entry["id"])
            if entry.get("rights_approved") is not True:
                raise ValueError("Field observation missing publishing consent: "+entry["id"])
            pid=entry["id"]
            hid="HS-"+pid
            db.execute(
              "INSERT INTO photos(id,title,category,image_url,source_url,author,year,license_status,local_asset_path,rights_approved) VALUES(?,?,?,?,?,?,?,?,?,?)",
              (pid,entry["title"],"field_survey",path,path,"Người đóng góp ảnh khảo sát",
                (entry.get("captured_on") or "")[:4] or "unknown","user_supplied_permission_to_publish",path,1)
            )
            db.execute(
              "INSERT INTO photo_hotspots(id,label,object_id,x_m,y_m,z_m,kind,position_accuracy,notes) VALUES(?,?,?,?,?,?,?,?,?)",
              (hid,entry["title"],None,entry["x_m"],entry.get("y_m",1.7),entry["z_m"],
                "field_photo",entry.get("location_quality","manually_pinned_3d_not_surveyed_gps"),
                "Ảnh khảo sát do người dùng chọn điểm trên mô hình. Hướng nhìn nhập tay. "+entry.get("notes",""))
            )
            db.execute(
              "INSERT INTO photo_hotspot_items(hotspot_id,photo_id,relation,caption,sort_order) VALUES(?,?,?,?,?)",
              (hid,pid,"field_observation","Ảnh hiện trường được ghim thủ công tại đây.",1)
            )
            db.execute(
              "INSERT INTO field_surveys VALUES(?,?,?,?,?,?,?,?,?,?,?)",
              (pid,pid,hid,entry["lat"],entry["lon"],entry["heading_deg"],
                entry.get("captured_on",""),entry.get("recorded_on",""),
                entry["image_sha256"],entry.get("location_quality","manually_pinned_3d_not_surveyed_gps"),
                entry.get("notes",""))
            )
    for c in COSTS: db.execute("INSERT INTO cost_items VALUES(?,?,?,?,?,?,?,?,?,?)",(c[0],c[1],c[2],c[3],c[4],c[5],c[6],"planning_assumption" if c[3] is not None else "unknown",c[7],TODAY))
    db.execute("INSERT INTO reference_prices VALUES(?,?,?,?,?,?,?,?,?)",("REF-PRICE-001","OBJ-FOUNTAIN","Gói thầu sửa chữa đài phun nước nghệ thuật Hồ Trúc Giang",1698502090,"Giá gói thầu được công bố","2025-05-27","https://dauthau.asia/ketqua/luachon-nhathau/thi-cong-sua-chua-dai-phun-nuoc-nghe-thuat-ho-truc-giang-2230530.html","public_procurement_listing","Không phải báo giá dựng 3D, cũng không khẳng định là giá trúng thầu hay quyết toán."))
    db.execute("INSERT INTO reference_prices VALUES(?,?,?,?,?,?,?,?,?)",("REF-PRICE-002","OBJ-FOUNTAIN","Gói thầu sửa chữa đài phun nước Hồ Trúc Giang — kết quả lựa chọn",1664590330,"Giá trúng thầu được công bố","2025-05-27","https://dauthau.asia/ketqua/luachon-nhathau/thi-cong-sua-chua-dai-phun-nuoc-nghe-thuat-ho-truc-giang-2230530.html","public_procurement_award","Vilight là đơn vị trúng thầu theo nguồn công khai; không phải quyết toán thực tế hay chi phí dựng 3D."))
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
            ("requirements","survey_shots","sources","zones","objects","photos","photo_links","photo_hotspots","photo_hotspot_items","field_surveys","cost_items","cost_quotes","reference_prices","osm_features")}
    assert counts["requirements"]==305 and counts["survey_shots"]==90
    assert counts["photo_hotspots"]==8+counts["field_surveys"] and counts["photo_hotspot_items"]==len(HOTSPOT_PHOTOS)+counts["field_surveys"]
    db.commit();db.execute("PRAGMA integrity_check");db.execute("VACUUM")
    # Export complete photo catalog from SQLite, including locally curated field captures.
    all_photo_rows=db.execute("SELECT id,title,category,image_url,source_url,author,year,license_status FROM photos ORDER BY rowid").fetchall()
    # Export the exact photo-to-requirement mapping for catalog navigation.
    catalog_groups=[]
    for cat,num in db.execute("SELECT category,COUNT(*) FROM requirements GROUP BY category ORDER BY category").fetchall():
        item_list=[]
        thumbnail_ids=[]
        reqs=db.execute("SELECT id,description,priority,status FROM requirements WHERE category=? ORDER BY id",(cat,)).fetchall()
        for rid,title,priority,status in reqs:
            photo_ids=[row[0] for row in db.execute("SELECT photo_id FROM photo_links WHERE requirement_id=? ORDER BY photo_id",(rid,))]
            thumbnail_ids.extend(photo_ids)
            item_list.append({"id":rid,"title":title,"priority":priority,"status":status,"photo_ids":photo_ids})
        catalog_groups.append({"category":cat,"count":num,"image_ids":list(dict.fromkeys(thumbnail_ids))[:4],"items":item_list})
    # Export generated hotspot links from SQLite; browser never needs hardcoded photo mappings.
    photo_hotspots=[]
    for id,label,object_id,x,y,z,kind,position_accuracy,notes in db.execute(
      "SELECT id,label,object_id,x_m,y_m,z_m,kind,position_accuracy,notes FROM photo_hotspots ORDER BY rowid"
    ).fetchall():
        photo_rows=db.execute(
          "SELECT photo_id,relation,caption FROM photo_hotspot_items WHERE hotspot_id=? ORDER BY sort_order",
          (id,)
        ).fetchall()
        photo_hotspots.append({
          "id":id,"label":label,"object_id":object_id,"position":{"x":x,"y":y,"z":z},
          "kind":kind,"position_accuracy":position_accuracy,"notes":notes,
          "is_camera_location":False,
          "photos":[{"photo_id":row[0],"relation":row[1],"caption":row[2]} for row in photo_rows]
        })
    from model_export import build as export_semantic_model
    semantic = export_semantic_model(db, outdir/"model-view.json")
    assert semantic["lake_audit"]["verified_corrections"] == 0
    assert semantic["table_counts"]["requirements"] == counts["requirements"]
    inspector_counts = export_sqlite_inspector(db, outdir/"sqlite-explorer.json")
    assert inspector_counts["requirements"] == counts["requirements"]
    assert inspector_counts["osm_features"] == counts["osm_features"]
    db.close()
    scene={
      "schemaVersion":4,"title":"Hồ Trúc Giang — Bờ Hồ Bến Tre","origin":{"lon":ORIGIN[0],"lat":ORIGIN[1],"crs":"EPSG:4326"},
      "area_of_interest":{"basis":"OSM shoreline 217484891","buffer_m":SHORE_BUFFER_M,"rule":"Distance to lakeshore; clip roads; retain only fully contained polygons","units":"meters"},"mode":"osm_snapshot" if features else "illustrative_no_osm","snapshot":TODAY,"osm_url":osm_url,"osm_error":error,
      "warning":"Chỉ đối tượng OSM có source được xem là hình học bản đồ cộng đồng. Mọi geometry fallback là minh họa.",
      "stats":counts,
      "objects":[{"id":o[0],"kind":o[1],"name":o[2],"lon":o[3],"lat":o[4],"verified":False} for o in objs],
      "images":[{"id":x[0],"title":x[1],"category":x[2],"image_url":x[3],"source_url":x[4],"author":x[5],"year":x[6],"license":x[7]} for x in all_photo_rows],
      "costs":[{"id":x[0],"name":x[1],"unit":x[2],"amount_low_vnd":x[3],"amount_high_vnd":x[4],"quantity":x[5],"price_type":"unknown" if x[3] is None else "planning_assumption"} for x in COSTS],
      "reference_prices":[{"id":"REF-PRICE-001","object_id":"OBJ-FOUNTAIN","description":"Giá gói thầu sửa chữa đài phun nước Hồ Trúc Giang","amount_vnd":1698502090,"year":2025,"price_label":"Giá gói thầu, không phải chi phí dự án 3D","source_url":"https://dauthau.asia/ketqua/luachon-nhathau/thi-cong-sua-chua-dai-phun-nuoc-nghe-thuat-ho-truc-giang-2230530.html"},{"id":"REF-PRICE-002","object_id":"OBJ-FOUNTAIN","description":"Giá trúng thầu sửa chữa đài phun nước Hồ Trúc Giang","amount_vnd":1664590330,"year":2025,"price_label":"Giá trúng thầu, không phải quyết toán hoặc chi phí dự án 3D","source_url":"https://dauthau.asia/ketqua/luachon-nhathau/thi-cong-sua-chua-dai-phun-nuoc-nghe-thuat-ho-truc-giang-2230530.html"}],
      "features":features,
      "catalog_groups":catalog_groups,
      "photo_hotspots":photo_hotspots,
      "provenance":{"baseline":"catalog-blueprint-v1.json","map":"© OpenStreetMap contributors, ODbL; https://www.openstreetmap.org/copyright","photos":"external reference only, no redistribution permissions asserted"}
    }
    (outdir/"scene.json").write_text(json.dumps(scene,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    print(json.dumps({"database":str(outdir/"catalog.sqlite"),"scene":str(outdir/"scene.json"),"stats":counts,"mode":scene["mode"]},ensure_ascii=False))
    return scene

if __name__=="__main__":
    a=argparse.ArgumentParser();a.add_argument("--osm",action="store_true");a.add_argument("--output",type=pathlib.Path,default=DATA)
    o=a.parse_args();build(o.output,o.osm)
