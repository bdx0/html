#!/usr/bin/env python3
"""Build a human-readable spatial/domain/relationship read model from canonical SQLite.

No guessed lake outlines or Google-derived vector data. Explicit provenance and
missing-data flags are preserved. The SQLite database is always the source.
"""
import json
import math
from collections import defaultdict

ORIGIN_LON=106.37814
ORIGIN_LAT=10.23861
M_LAT=111320.0
M_LON=M_LAT*math.cos(math.radians(ORIGIN_LAT))
LABELS={"water":"Mặt nước", "road":"Đường giao thông", "building":"Công trình", "park":"Công viên",
        "monument":"Tượng đài","fountain":"Đài phun nước",
        "photos":"Ảnh tư liệu","requirements":"Hạng mục cần thu thập",
        "survey":"Ảnh khảo sát","planning":"Chi phí dự kiến"}
def fetch(conn, table):
    cur=conn.execute('SELECT * FROM "'+table+'"')
    fields=[x[0] for x in cur.description]
    return [dict(zip(fields,row)) for row in cur]
def nfloat(v,precision=2):
    return round(float(v),precision) if v is not None else None
def measure_ring(ring):
    # Local tangent plane is sufficient for relative QA within ~300m.
    ps=[((p[0]-ORIGIN_LON)*M_LON,(p[1]-ORIGIN_LAT)*M_LAT) for p in ring]
    perimeter=sum(math.hypot(b[0]-a[0],b[1]-a[1]) for a,b in zip(ps,ps[1:]))
    area=abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(ps,ps[1:])))*.5
    return {"area_m2":round(area), "perimeter_m":round(perimeter),
            "size_east_west_m":round(max(p[0] for p in ps)-min(p[0] for p in ps)),
            "size_north_south_m":round(max(p[1] for p in ps)-min(p[1] for p in ps)),
            "vertices":len(ring)-1}
def build(conn, target):
    source=fetch(conn,"sources")
    zones=fetch(conn,"zones")
    requirements=fetch(conn,"requirements")
    shots=fetch(conn,"survey_shots")
    photos=fetch(conn,"photos")
    hotspots=fetch(conn,"photo_hotspots")
    hotspot_items=fetch(conn,"photo_hotspot_items")
    object_photos=fetch(conn,"object_photos")
    objects=fetch(conn,"objects")
    features=fetch(conn,"osm_features")
    photo_links=fetch(conn,"photo_links")
    prices=fetch(conn,"reference_prices")
    cost=fetch(conn,"cost_items")
    surveys=fetch(conn,"field_surveys")
    tablecounts={x[0]:x[1] for x in conn.execute(
        "SELECT name, 0 FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
    for t in tablecounts:
        tablecounts[t]=conn.execute('SELECT COUNT(*) FROM "'+t+'"').fetchone()[0]
    source_by_id={s["id"]:s for s in source}
    photos_by_id={p["id"]:p for p in photos}
    linked_photos=defaultdict(list)
    linked_requirements=defaultdict(list)
    for item in object_photos:linked_photos[item["object_id"]].append(item["photo_id"])
    for item in photo_links:
        linked_photos[item["requirement_id"]].append(item["photo_id"])
        linked_requirements[item["photo_id"]].append(item["requirement_id"])
    hotspot_refs=defaultdict(list)
    for item in hotspot_items:hotspot_refs[item["hotspot_id"]].append(item["photo_id"])
    nodes=[]
    def add(node):
        nodes.append(node)
        return node
    def basic(node_id,category,title,subtitle,status,description=None,**kw):
        base={"id":node_id,"kind":category,"title":title,"subtitle":subtitle,
              "status":status,"description":description or "",
              "source":None,"geometry":None,"facts":[],"links":[],"relations":[]}
        base.update(kw)
        return add(base)
    def fact(k,v,unit=None,note=None):
        if v is None:return None
        return {"label":k,"value":v,"unit":unit,"note":note}
    def relation(k,id,label=None):
        return {"type":k,"target":id,"label":label}
    by_obj={p["object_id"]:[] for p in prices}
    for price in prices:by_obj.setdefault(price["object_id"],[]).append(price)
    for o in objects:
        status="unverified" if not o["verified"] else "verified"
        fs=[fact("Loại đối tượng",LABELS.get(o["kind"],o["kind"])),
            fact("Độ chính xác",o["geometry_accuracy"]),
            fact("Vĩ độ",o["lat"],"°"),fact("Kinh độ",o["lon"],"°"),
            fact("Chiều cao",o["height_m"],"m")]
        basic(o["id"],"landmark",o["name"],LABELS.get(o["kind"],"Mốc đô thị"),status,
            description=o["notes"],source=o["source_url"],facts=[f for f in fs if f],
            geometry={"type":"Point","coordinates":[o["lon"],o["lat"]]} if o["lon"] is not None and o["lat"] is not None else None,
            relations=([relation("geometry","osm-way-217484891","Đường bao OSM, chưa xác minh") ] if o["id"]=="OBJ-LAKE" else [])+
                 [relation("photo",p) for p in linked_photos[o["id"]]]+
                 [relation("price",p["id"]) for p in by_obj.get(o["id"],[])])
    road_groups=defaultdict(list)
    lake_shape=None
    for f in features:
        geom=json.loads(f["geojson"]);props=json.loads(f["properties_json"])
        if f["kind"]=="road":
            label=props.get("name") or "Đường chưa có tên trên OSM"
            road_groups[(label,props.get("highway",""))].append((f,geom))
            continue
        attrs=props.get("osm_tags") or {}
        known=bool(props.get("name"))
        title=props.get("name") or ("Công trình chưa có tên" if f["kind"]=="building" else "Mảng xanh chưa có tên")
        subtitle=LABELS.get(f["kind"],f["kind"])+" · OpenStreetMap"
        status="community"
        fs=[fact("OSM way",f["osm_id"]),fact("Nguồn",f["accuracy"]),
            fact("Tên trên bản đồ",props.get("name") if known else "Chưa có"),
            fact("Số tầng",attrs.get("building:levels"),note="Dữ liệu cộng đồng, chưa được đo"),
            fact("Chiều cao thực đo",attrs.get("height"),"m")]
        if f["kind"]=="water":
            try:
                lake_shape=measure_ring(geom["coordinates"][0])
                fs.extend([
                    fact("Diện tích OSM (ước lượng)",lake_shape["area_m2"],"m²","Chưa được kiểm chứng bằng ranh nước thực địa"),
                    fact("Chu vi OSM (ước lượng)",lake_shape["perimeter_m"],"m"),
                    fact("Chiều Đông–Tây (bbox)",lake_shape["size_east_west_m"],"m"),
                    fact("Chiều Bắc–Nam (bbox)",lake_shape["size_north_south_m"],"m"),
                    fact("Đỉnh gốc của polygon",lake_shape["vertices"],"đỉnh")
                ])
            except (KeyError,ValueError):lake_shape=None
        basic(f["id"],f["kind"],title,subtitle,status,
            description=("Đường bao nước hiện là bản đồ cộng đồng; ảnh người dùng chỉ ra nhiều sai khác. KHÔNG xem là mặt hồ được đo thật." if f["kind"]=="water"
                         else "Ranh đối tượng do OpenStreetMap cung cấp. Hình thức và chiều cao thực địa có thể khác."),
            source="https://www.openstreetmap.org/way/"+str(f["osm_id"]),
            geometry=geom,facts=[x for x in fs if x],
            relations=[relation("domain","OBJ-LAKE","Hồ Trúc Giang")] if f["kind"]=="water" else [])
    for (label,highway),group in road_groups.items():
        ids=[x[0]["id"] for x in group]
        nid="ROAD-GROUP-"+min(str(x[0]["osm_id"]) for x in group)
        fs=[fact("Đoạn đường OSM",len(group)),fact("Loại đường OSM",highway or "Chưa rõ"),
            fact("Nguồn","OpenStreetMap")]
        basic(nid,"road",label,"Tuyến đường · gộp các đoạn OSM","community",
            description="Các đoạn chung tên được nhóm để dễ đọc, KHÔNG khẳng định đây là một tuyến đường đã khảo sát đầy đủ.",
            source="https://www.openstreetmap.org/#map=18/10.23861/106.37814",
            geometry={"type":"MultiLineString","coordinates":[g["coordinates"] for f,g in group if g["type"]=="LineString"]},
            facts=[x for x in fs if x],relations=[],osm_ids=[x[0]["osm_id"] for x in group])
    zone_names={z["id"]:z["name"] for z in zones}
    for z in zones:
        basic(z["id"],"zone",z["name"],"Phân khu khảo sát","planned",
            description=z["notes"],facts=[fact("Ưu tiên",z["priority"]),fact("Mức chi tiết dự kiến",z["lod"])],
            relations=[relation("requirement",x["id"]) for x in requirements if x["zone"] in [z["name"],z["id"]]][:32])
    for req in requirements:
        sour=source_by_id.get(req["source_id"])
        basic(req["id"],"requirement",req["description"],req["category"]+" · "+(req["zone"] or "Toàn dự án"),
            "planned" if "chưa" in (req["status"] or "").lower() else "reference",
            description=req["acceptance"],
            source=sour["url"] if sour else None,
            facts=[x for x in [
                fact("Trạng thái thu thập",req["status"]),fact("Ưu tiên",req["priority"]),
                fact("Độ tin cậy",req["confidence"]),fact("Dữ liệu yêu cầu",req["fields"]),
                fact("Phương pháp",req["method"]),fact("Mức chi tiết",req["lod"])] if x],
            relations=([relation("source",req["source_id"])] if req["source_id"] else [])+
            [relation("photo",p) for p in linked_photos[req["id"]]][:6])
    for p in photos:
        basic(p["id"],"photo",p["title"],p["author"]+" · "+(p["year"] or "Chưa xác định năm"),"reference" if p["license_status"]=="reference_only" else "user_photo",
            description=("Ảnh ngoài chỉ liên kết nguồn; không có quyền tái phân phối." if p["license_status"]=="reference_only" else "Ảnh khảo sát có xác nhận quyền chia sẻ."),
            source=p["source_url"],facts=[fact("Nhóm ảnh",p["category"]),fact("Quyền ảnh",p["license_status"])],
            relations=[relation("requirement",q) for q in linked_requirements[p["id"]]][:5],
            photo_url=p["image_url"])
    for spot in hotspots:
        relations=[relation("photo",p) for p in hotspot_refs[spot["id"]]]
        if spot["object_id"]:relations.insert(0,relation("landmark",spot["object_id"]))
        lon=ORIGIN_LON+spot["x_m"]/M_LON
        lat=ORIGIN_LAT+spot["z_m"]/M_LAT
        basic(spot["id"],"hotspot",spot["label"],"Ghim ảnh · tọa độ trong mô hình","unverified",
            description=spot["notes"],geometry={"type":"Point","coordinates":[lon,lat]},
            facts=[fact("Cách đặt điểm",spot["position_accuracy"]),
                   fact("Kinh độ suy ra",nfloat(lon,6),"°","Ghim mô phỏng, không phải GPS máy chụp"),
                   fact("Vĩ độ suy ra",nfloat(lat,6),"°","Ghim mô phỏng, không phải GPS máy chụp")],
            relations=relations)
    for shot in shots:
        basic(shot["id"],"shot",shot["subject"],"Kế hoạch ảnh thực địa","planned",
            description=shot["goal"],facts=[fact("Trạng thái",shot["status"]),fact("Ưu tiên",shot["priority"]),
            fact("Hướng chụp",shot["azimuth"]),fact("Dữ liệu cần lưu",shot["metadata"])],
            relations=[relation("zone",shot["zone"])] if shot["zone"] in zone_names else [])
    for price in prices:
        basic(price["id"],"price",price["description"],"Thông tin công khai · "+price["price_date"],"public_reference",
            description=price["notes"],source=price["source_url"],
            facts=[fact("Số tiền",price["price_vnd"],"VND"),
            fact("Ý nghĩa",price["price_label"]),fact("Ngày nguồn",price["price_date"])],
            relations=[relation("landmark",price["object_id"])])
    for c in cost:
        basic(c["id"],"cost",c["description"],"Dự toán triển khai digital twin","planned",
            description=c["notes"],facts=[fact("Đơn vị",c["unit"]),fact("Định mức thấp",c["amount_low_vnd"],"VND"),
            fact("Định mức cao",c["amount_high_vnd"],"VND"),
            fact("Loại dữ liệu giá",c["price_type"])],relations=[])
    for src in source:
        basic(src["id"],"source",src["name"],src["kind"],"reference",
            description=src["notes"],source=src["url"],
            facts=[fact("Giấy phép",src["license"]),fact("Thời điểm",src["period"])],relations=[])
    for sv in surveys:
        # The canonical SQLite survey table currently contains only these fields;
        # do not invent coordinates from an external photo.
        basic(sv["id"],"survey",sv["id"],"Ảnh thực địa có người cung cấp","user_photo",
            description=sv["user_notes"],facts=[
                fact("Vĩ độ",sv["lat"],"°"),fact("Kinh độ",sv["lon"],"°"),
                fact("Hướng nhìn",sv["heading_deg"],"°"),
                fact("Độ chính xác",sv["location_accuracy"])],
            relations=[relation("photo",sv["photo_id"]),relation("hotspot",sv["hotspot_id"])])
    mapping={n["id"]:n for n in nodes}
    for n in nodes:
        n["relations"]=[r for r in n["relations"] if r["target"] in mapping and r["target"]!=n["id"]]
    assert lake_shape is not None or not features,"OSM snapshot missing source lake outline"
    audit={
        "status":"conflict_unresolved",
        "source_geometry":"osm-way-217484891",
        "source_license":"OpenStreetMap ODbL",
        "source_url":"https://www.openstreetmap.org/way/217484891",
        "analysis_basis":"Ảnh do người dùng cung cấp để đánh giá trực quan; không trích xuất tọa độ từ Google Maps",
        "verified_corrections":0,
        "metrics":lake_shape,
        "unresolved":[
            {"id":"north_notch","number":1,"title":"Mũi đất bờ bắc","description":"Ảnh người dùng cho thấy một mũi đất nhô xuống nước. Cần xem đường OSM ở đây đã khoét đủ sâu vào mặt hồ chưa.","direction":"Bắc",
             "ring_indices":[15,16,17,18,19,20,21,22],
             "question":"Mũi đất ở bờ Bắc nhô xuống mặt hồ thực tế sâu hơn hay ít hơn nét đang thấy?",
             "possible_edit":"Nếu đất nhô sâu hơn: làm mặt nước lõm sâu vào phía giữa hồ. Nếu đất không nhô nhiều: mở rộng nước trở lại.",
             "guide":"Đoạn màu cam chỉ là khu vực trên OSM cần đối chiếu; chưa khẳng định mọi đỉnh trong đoạn đều sai."},
            {"id":"south_slope","number":2,"title":"Bờ nam chéo","description":"Ảnh người dùng cho thấy bờ phía Nam có độ nghiêng khác nét OSM. Cần xác định từng khúc nước sát Đường Lê Quí Đôn.","direction":"Nam",
             "ring_indices":[3,4,5,6,7,8,9,10],
             "question":"Bờ Nam trên thực địa chạy chéo tới mức nào, và đoạn nào đang thiếu góc gấp?",
             "possible_edit":"Sửa góc và vị trí các đỉnh bờ Nam; không kéo tịnh tiến toàn bộ một cạnh chỉ để đổi diện tích.",
             "guide":"Thanh xem trước chỉ dịch bờ vào/ra, không thể tự tái tạo độ nghiêng; cần thêm điểm đo."},
            {"id":"east_curve","number":3,"title":"Cung bờ đông","description":"Cần kiểm tra độ cong phía Đông và đoạn bo xuống góc Đông–Nam; đây không phải một đường thẳng đứng.","direction":"Đông",
             "ring_indices":[10,11,12,13,14,15],
             "question":"Cung bờ Đông phình ra mặt nước hay bị khoét sâu vào hơn so với nét OSM?",
             "possible_edit":"Điều chỉnh các điểm điều khiển dọc cung bờ, đặc biệt chỗ chuyển sang góc Đông–Nam.",
             "guide":"Khoanh vùng tương ứng OSM, không phải ranh sai đã được đo."},
            {"id":"west_bank","number":4,"title":"Các khúc bờ tây","description":"Cây che một phần mép nước phía Tây; có thể thiếu các góc lồi/lõm nhỏ.","direction":"Tây",
             "ring_indices":[22,23,0,1,2,3],
             "question":"Bờ Tây có bao nhiêu chỗ lồi/lõm, và nét OSM đang bỏ sót vị trí nào?",
             "possible_edit":"Bổ sung hoặc chỉnh các đỉnh gấp từ điểm đo; tránh làm mượt tròn hóa toàn bộ bờ.",
             "guide":"Khu vực bị cây che trên ảnh; cần ảnh góc khác hoặc mốc thực địa."}
        ],
        "comparison_links":[
            {"title":"OSM gốc","url":"https://www.openstreetmap.org/way/217484891"},
            {"title":"Copernicus Browser (ảnh công khai, cần kiểm tra thời điểm và độ phân giải)","url":"https://browser.dataspace.copernicus.eu/"},
            {"title":"Tài liệu QA đường bờ","url":"SHORELINE_IMAGE_ANALYSIS.md"}
        ],
        "source_coordinates_are_not_surveyed":True,
        "review_overlay":{"basis":"indices on unmodified OSM way 217484891 ring, 0-based; highlight only, not a proposed correction",
                          "preview_disclaimer":"User-controlled water-edge movement is purely a local demonstration, not a georeferenced fix",
                          "verification_requirement":"Visual annotations are review notes; polygon acceptance requires independent surveyed or licensed control geometry"}
    }
    payload={
        "schema":"ben-tre-semantic-model-v1",
        "title":"Mô hình dữ liệu Hồ Trúc Giang",
        "origin":{"lon":ORIGIN_LON,"lat":ORIGIN_LAT,"crs":"EPSG:4326"},
        "read_only":True,
        "database":"data/catalog.sqlite",
        "table_counts":tablecounts,
        "nodes":nodes,
        "lake_audit":audit,
        "source_note":"Từ SQLite; vật thể, tọa độ, ảnh và ước lượng chưa xác minh được gắn nhãn riêng. Không có biên hồ suy đoán."
    }
    target.write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    return payload
