/* Hồ Trúc Giang Object Review Studio — non-destructive visual audit.
 * CAD vectors: illustrative pixel geometry. OSM: WGS84 community geometry.
 * These coordinate systems are intentionally NOT aligned or merged.
 * Approval saves append-only review events, never writes catalog.sqlite/scene.json.
 */
(async function(){
"use strict";
const $=id=>document.getElementById(id),NS="http://www.w3.org/2000/svg";
const C={lake_surface:"#67c4d4",lake_edge:"#ef5c8a",lake_wall:"#ef9e75",
 railing:"#b982db",tree:"#54895c",road_surface:"#808b91",sidewalk:"#d7b88b",
 ground:"#b8b09a",building:"#d9a789",school:"#eba378",cafe:"#cc9465",
 vacant_lot:"#c9b27d",fountain:"#4a99cb",park_area:"#9dce93",
 plaza:"#c7bda3",review_point:"#d55d72",osm_reference:"#a078c4"};
const LABEL={lake_surface:"Mặt hồ",lake_edge:"Đường bờ",lake_wall:"Thành hồ",railing:"Lan can",
 tree:"Cây xanh",road_surface:"Mặt đường",sidewalk:"Vỉa hè / đường dạo",
 ground:"Mặt đất",building:"Nhà phố",school:"Trường mẫu giáo",cafe:"Quán cà phê",
 vacant_lot:"Đất trống",fountain:"Đài phun nước",park_area:"Công viên",
 plaza:"Quảng trường",review_point:"Điểm cần duyệt",osm_reference:"Đối chiếu OSM"};
const BASE_URL="./data/object-review-base.json",SCHEMA="truc-giang-review-bundle-v1";
const W={base:null,byId:new Map(),selectedId:null,filters:"all",query:"",
 drafts:new Map(),events:[],db:null,mode:"cad",editing:false,ring:null,ringUndo:[],
 cadWaterId:null,dirty:false,zoom:1,drag:null,saveTimer:null,storage:"loading",loadError:null};
function safeName(s){return String(s||"").slice(0,180);}
function fmt(n){return Number.isFinite(n)?Number(n).toLocaleString("vi-VN",{maximumFractionDigits:2}):"Chưa đo";}
function msg(s,kind){$("status").textContent=s;$("status").style.color=kind==="error"?"#ffb1bd":"#aef1db";}
function svgNode(tag,attrs,parent){
 const e=document.createElementNS(NS,tag);
 Object.entries(attrs||{}).forEach(([k,v])=>e.setAttribute(k,String(v)));
 if(parent)parent.appendChild(e);
 return e;
}
function clear(node){node.replaceChildren();}
function uid(){return "evt:"+((crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now().toString(36)+"-"+Math.random().toString(36).slice(2));}
function download(name,text){
 const u=URL.createObjectURL(new Blob([text],{type:"application/json;charset=utf-8"}));
 const a=document.createElement("a");a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);
}
function current(){return W.byId.get(W.selectedId)||null;}
function newDraft(id){return {objectId:id,parameters:{},note:"",ring:null,updated:null};}
function getDraft(id){return W.drafts.get(id)||newDraft(id);}
function clone(x){return JSON.parse(JSON.stringify(x));}
function storeOpen(){
 return new Promise((resolve,reject)=>{
  if(!("indexedDB" in window)){reject(Error("IndexedDB unavailable"));return;}
  const request=indexedDB.open("truc-giang-object-reviews-v1",1);
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains("drafts"))db.createObjectStore("drafts",{keyPath:"objectId"});if(!db.objectStoreNames.contains("events"))db.createObjectStore("events",{keyPath:"eventId"});};
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
}
function txPut(store,record){
 return new Promise((resolve,reject)=>{
  const t=W.db.transaction(store,"readwrite");
  t.objectStore(store).put(record);
  t.oncomplete=resolve;t.onerror=()=>reject(t.error);
 });
}
function txGetAll(store){
 return new Promise((resolve,reject)=>{
  const t=W.db.transaction(store,"readonly"),r=t.objectStore(store).getAll();
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
 });
}
function lsMirror(){
 try{
  localStorage.setItem("tg-review-drafts-v1",JSON.stringify([...W.drafts.values()]));
  localStorage.setItem("tg-review-events-v1",JSON.stringify(W.events));
 }catch(e){msg("Lưu dự phòng trình duyệt bị giới hạn; hãy xuất JSON","error");}
}
async function persistDraft(record){
 const copy=clone(record);W.drafts.set(copy.objectId,copy);lsMirror();
 if(W.db){try{await txPut("drafts",copy);}catch(e){msg("Lỗi IndexedDB, hãy xuất JSON ngay","error");}}
}
async function persistEvent(record){
 if(W.events.some(e=>e.eventId===record.eventId))return;
 const copy=clone(record);W.events.push(copy);lsMirror();
 if(W.db){try{await txPut("events",copy);}catch(e){msg("Không ghi được lịch sử IndexedDB, hãy xuất JSON","error");}}
}
async function loadStorage(){
 try{
  W.db=await storeOpen();W.storage="indexedDB + local backup";
  (await txGetAll("drafts")).forEach(d=>W.drafts.set(d.objectId,d));
  W.events=await txGetAll("events");
 }catch(e){W.storage="local backup only";msg("IndexedDB không khả dụng; cần xuất JSON thường xuyên","error");}
 try{
  const drafts=JSON.parse(localStorage.getItem("tg-review-drafts-v1")||"[]");
  const events=JSON.parse(localStorage.getItem("tg-review-events-v1")||"[]");
  if(Array.isArray(drafts))for(const d of drafts)if(d&&typeof d.objectId==="string"&&!W.drafts.has(d.objectId))W.drafts.set(d.objectId,d);
  if(Array.isArray(events))for(const e of events)if(e&&typeof e.eventId==="string"&&!W.events.some(x=>x.eventId===e.eventId))W.events.push(e);
 }catch(e){console.warn("Local backup parse failed",e);}
}
function sourceLabel(item){
 return item.source==="cad_illustration"?"CAD minh họa (chưa đo)":item.source==="osm_crowdsourced"?"OpenStreetMap":item.source==="user_visual_note"?"Ghi chú trực quan của bạn":"Chưa xác minh";
}
function selectedStatus(id){
 const entries=W.events.filter(e=>e.objectId===id&&e.action==="visual_approve");
 return entries.length?"✓ "+entries.length+" lần":W.drafts.has(id)?"● Nháp":"—";
}
function renderList(){
 const list=$("objectList");clear(list);
 const items=W.base.objects.filter(o=>(W.filters==="all"||o.category===W.filters)
   &&(!W.query||[o.name,o.id,LABEL[o.category]||o.category].join(" ").toLocaleLowerCase().includes(W.query)));
 const max=130;
 $("listCount").textContent=items.length+" đối tượng phù hợp"+(items.length>max?" · hiện "+max:"");
 const frag=document.createDocumentFragment();
 for(const item of items.slice(0,max)){
  const b=document.createElement("button");b.type="button";b.className="item";
  b.setAttribute("role","option");b.setAttribute("aria-current",String(item.id===W.selectedId));
  const txt=document.createElement("span"),name=document.createElement("b"),sub=document.createElement("small"),st=document.createElement("span");
  name.textContent=safeName(item.name);
  sub.textContent=(LABEL[item.category]||item.category)+" · "+(item.source==="osm_crowdsourced"?"OSM":"CAD / Review");
  st.className="state";st.textContent=selectedStatus(item.id);
  txt.append(name,sub);b.append(txt,st);b.onclick=()=>select(item.id);frag.appendChild(b);
 }
 list.appendChild(frag);
 $("count").textContent=String(W.base.objects.length);
}
function chips(){
 const wrap=$("typeChips");clear(wrap);
 const counts={};
 for(const item of W.base.objects)counts[item.category]=(counts[item.category]||0)+1;
 const all=[["all","Tất cả"],...Object.keys(counts).sort((a,b)=>(LABEL[a]||a).localeCompare(LABEL[b]||b,"vi")).map(k=>[k,LABEL[k]||k])];
 for(const [kind,label] of all){
  const b=document.createElement("button");b.textContent=label+(kind==="all"?"":" · "+counts[kind]);
  b.setAttribute("aria-pressed",String(W.filters===kind));
  b.onclick=()=>{W.filters=kind;chips();renderList();};wrap.appendChild(b);
 }
}
function specFor(item){return W.base.templates[item.category]||[];}
function validValues(item,values){
 const specs=specFor(item);
 if(!values||typeof values!=="object"||Array.isArray(values))return false;
 return Object.entries(values).every(([key,value])=>{
  const s=specs.find(s=>s.key===key);if(!s)return false;
  if(value===null||value==="")return true;
  if(s.unit==="m"||s.unit==="integer"){
   return typeof value==="number"&&Number.isFinite(value)&&value>=s.min&&value<=s.max&&(s.unit!=="integer"||Number.isInteger(value));
  }
  return typeof value==="string"&&value.length<=150;
 });
}
function ringValid(r){
 if(!Array.isArray(r)||r.length<5||r.length>600)return false;
 if(!r.every(p=>Array.isArray(p)&&p.length===2&&p.every(v=>Number.isFinite(v)&&v>=-600&&v<=2300)))return false;
 // Avoid self-intersections in the CAD *candidate* shoreline.
 function cross(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
 function hit(a,b,c,d){
  let p=cross(a,b,c),q=cross(a,b,d),r=cross(c,d,a),s=cross(c,d,b);
  return (p*q<0)&&(r*s<0);
 }
 for(let i=0;i<r.length;i++)for(let j=i+1;j<r.length;j++){
  if(Math.abs(i-j)<=1||(i===0&&j===r.length-1))continue;
  if(hit(r[i],r[(i+1)%r.length],r[j],r[(j+1)%r.length]))return false;
 }
 return true;
}
function eventLatest(id){
 return W.events.filter(e=>e.objectId===id&&e.action==="visual_approve").sort((a,b)=>a.timestamp.localeCompare(b.timestamp)).at(-1);
}
function select(id){
 const item=W.byId.get(id);if(!item)return;
 W.selectedId=id;W.dirty=false;
 const existing=W.drafts.get(id);
 if(!existing){
  const prev=eventLatest(id);
  if(prev&&prev.payload){
   W.drafts.set(id,{objectId:id,parameters:clone(prev.payload.parameters||{}),note:prev.payload.note||"",ring:prev.payload.ring||null});
  }
 }
 $("note").value=getDraft(id).note||"";
 $("selection").replaceChildren();
 const h=document.createElement("h3"),p=document.createElement("p"),meta=document.createElement("dl");
 h.textContent=item.name;
 p.textContent="ID: "+item.id;
 meta.className="kv";
 for(const [label,value] of [
  ["Nhóm",LABEL[item.category]||item.category],["Nguồn",sourceLabel(item)],
  ["Tình trạng",item.verification],["Hình học",item.geometry?.type||"Chưa có tọa độ"],
  ["Định danh",item.source_reference||"Chưa có"]]){
  const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=label;dd.textContent=String(value);meta.append(dt,dd);
 }
 $("selection").append(h,p,meta);
 const warn=$("sourceWarning");warn.textContent=item.source==="osm_crowdsourced"?
  "OSM có tọa độ WGS84 cộng đồng; vẫn chưa được đo khảo sát. Duyệt thông số không tự thay đường bao OSM.":
  "Hình học CAD là pixel ảnh minh họa, chưa canh GPS. Không suy ra kích thước mét hoặc cao độ đo thật từ hình này.";
 renderParams();renderHistory();renderCross();renderList();paint();
 if(item.kind==="osm"&&W.mode==="cad")setMode("compare");
 if(item.kind==="cad"&&W.mode==="osm")setMode("compare");
}
function setParam(key,value){
 const item=current();if(!item)return;
 const d=clone(getDraft(item.id));d.parameters[key]=value;d.note=$("note").value;d.updated=new Date().toISOString();
 W.drafts.set(item.id,d);W.dirty=true;queueDraft(item.id);
 renderCross();renderList();
}
function renderParams(){
 const item=current(),wrap=$("parameterFields");clear(wrap);if(!item)return;
 const specs=specFor(item),values=getDraft(item.id).parameters||{};
 if(!specs.length){const p=document.createElement("p");p.className="footerNote";p.textContent="Đối tượng này chưa có thông số đo được. Bạn có thể lưu ghi chú và duyệt hình học.";wrap.append(p);return;}
 for(const spec of specs){
  const box=document.createElement("section");box.className="field";
  const label=document.createElement("label");label.textContent=spec.label;
  const desc=document.createElement("div");desc.className="desc";
  desc.textContent=spec.unit==="m"||spec.unit==="integer"?"Chưa đo — nhập giá trị hoặc kéo thanh để thử nghiệm":"Không có dữ liệu — nhập để xem thử";
  const row=document.createElement("div");row.className="editRow";
  let input;
  if(spec.unit==="m"||spec.unit==="integer"){
   input=document.createElement("input");input.type="number";input.min=spec.min;input.max=spec.max;input.step=spec.step;
   input.placeholder="Chưa có số liệu";input.value=values[spec.key]??"";
   const range=document.createElement("input");range.type="range";range.min=spec.min;range.max=spec.max;range.step=spec.step;range.value=values[spec.key]??(spec.min+spec.max)/2;
   range.setAttribute("aria-label","Xem thử "+spec.label);
   range.oninput=()=>{
    const val=Number(range.value);input.value=String(val);setParam(spec.key,val);
   };
   input.oninput=()=>{
    if(input.value===""){setParam(spec.key,null);return;}
    const v=Number(input.value);
    if(Number.isFinite(v)&&v>=spec.min&&v<=spec.max&&(spec.unit!=="integer"||Number.isInteger(v))){
     range.value=String(v);setParam(spec.key,v);input.setCustomValidity("");
    }else input.setCustomValidity("Giá trị không hợp lệ");
   };
   row.append(input);const unit=document.createElement("span");unit.className="unit";unit.textContent=spec.unit==="m"?"m":"làn/tầng";row.append(unit);
   const reset=document.createElement("button");reset.textContent="Không rõ";reset.onclick=()=>{input.value="";setParam(spec.key,null);};row.append(reset);
   box.append(label,desc,row,range);
  }else{
   input=document.createElement("input");input.type="text";input.maxLength=150;
   input.placeholder="Chưa rõ";input.value=values[spec.key]??"";
   input.oninput=()=>setParam(spec.key,input.value||null);
   row.append(input);box.append(label,desc,row);
  }
  wrap.append(box);
 }
}
function queueDraft(id){
 clearTimeout(W.saveTimer);
 W.saveTimer=setTimeout(async()=>{const d=W.drafts.get(id);if(d){await persistDraft(d);msg("Nháp đã lưu trên trình duyệt");}},260);
}
async function saveDraft(exportOnSave=true){
 const item=current();if(!item){msg("Hãy chọn đối tượng","error");return;}
 const d=clone(getDraft(item.id));d.note=$("note").value.slice(0,2000);d.updated=new Date().toISOString();
 if(item.id===W.cadWaterId&&W.ring)d.ring=clone(W.ring);
 if(!validValues(item,d.parameters)){msg("Kiểm tra thông số bị sai giới hạn","error");return;}
 if(d.ring&&!ringValid(d.ring)){msg("Đường bao tự cắt hoặc tọa độ không hợp lệ","error");return;}
 await persistDraft(d);msg("Đã lưu nháp · "+W.storage);renderList();if(exportOnSave===true)exportBackup();
}
function getBundle(){
 return {schema:SCHEMA,exported_at:new Date().toISOString(),project:"Hồ Trúc Giang",
         base_schema:W.base.schema,source_scene_snapshot:W.base.scene_snapshot,
         note:"Review approvals are VISUAL_ONLY, not GPS/survey confirmation. No canonical OSM or CAD rewritten.",
         drafts:[...W.drafts.values()],events:W.events.slice()};
}
function exportBackup(){const b=getBundle();download("truc-giang-review-"+new Date().toISOString().slice(0,10)+"-"+String(W.events.length).padStart(3,"0")+".json",JSON.stringify(b,null,2));msg("Đã xuất bản sao · "+W.events.length+" sự kiện");}
async function approve(){
 const item=current();if(!item){msg("Chưa chọn đối tượng","error");return;}
 await saveDraft(false);
 const d=clone(getDraft(item.id));
 if(!validValues(item,d.parameters)||(d.ring&&!ringValid(d.ring)))return;
 const rec={eventId:uid(),objectId:item.id,action:"visual_approve",timestamp:new Date().toISOString(),
  reviewLevel:"visual_review_only_not_surveyed",source:item.source,
  sourceGeometryReference:item.source_reference,
  payload:{parameters:d.parameters,note:d.note,ring:d.ring??null}};
 await persistEvent(rec);renderHistory();renderList();exportBackup();
 msg("Đã lưu phiên bản duyệt trực quan · CHƯA xác minh đo đạc");
}
async function importBundle(file){
 if(!file||file.size>12000000){msg("File JSON quá lớn hoặc không hợp lệ","error");return;}
 try{
  const doc=JSON.parse(await file.text());
  if(doc.schema!==SCHEMA||!Array.isArray(doc.events)||!Array.isArray(doc.drafts)||doc.events.length>30000||doc.drafts.length>1500)throw Error("Sai định dạng gói");
  let added=0,ds=0;
  for(const e of doc.events){
   const o=W.byId.get(e.objectId);
   if(!o||typeof e.timestamp!=="string"||!Number.isFinite(Date.parse(e.timestamp))||typeof e.eventId!=="string"||e.eventId.length>140||!["visual_approve","restore"].includes(e.action)||!e.payload
      ||!validValues(o,e.payload.parameters||{})||(e.payload.ring&&!ringValid(e.payload.ring)))continue;
   if(!W.events.some(x=>x.eventId===e.eventId)){await persistEvent(e);added++;}
  }
  for(const d of doc.drafts){
   const o=W.byId.get(d.objectId);
   if(!o||!validValues(o,d.parameters||{})||(d.ring&&!ringValid(d.ring)))continue;
   if(!W.drafts.has(o.id)){await persistDraft(d);ds++;}
  }
  W.ring=loadRing();
  renderList();renderHistory();paint();if(W.selectedId)select(W.selectedId);
  msg("Khôi phục "+added+" sự kiện và "+ds+" bản nháp; không ghi đè lịch sử");
 }catch(e){msg("Không nhập được: "+e.message,"error");}
}
function renderHistory(){
 const w=$("history");clear(w);const id=W.selectedId;
 const events=W.events.filter(e=>e.objectId===id).sort((a,b)=>b.timestamp.localeCompare(a.timestamp));
 if(!events.length){const p=document.createElement("p");p.className="footerNote";p.textContent="Chưa có bản duyệt. Nháp chưa được coi là phê duyệt.";w.append(p);return;}
 for(const e of events.slice(0,20)){
  const d=document.createElement("div");d.className="log";
  const b=document.createElement("button");b.textContent="Khôi phục bản này";
  b.onclick=async()=>{const draft={objectId:id,parameters:clone(e.payload.parameters||{}),note:e.payload.note||"",ring:e.payload.ring||null,updated:new Date().toISOString()};await persistDraft(draft);if(id===W.cadWaterId&&draft.ring)W.ring=clone(draft.ring);select(id);msg("Đã phục hồi thành nháp; bản duyệt cũ vẫn nguyên vẹn");};
  const s=document.createElement("span");
  s.textContent="✓ "+new Date(e.timestamp).toLocaleString("vi-VN")+" · "+e.reviewLevel;
  d.append(b,s);w.append(d);
 }
}
function renderCross(){
 const svg=$("cross");clear(svg);const item=current();
 svgNode("rect",{width:300,height:100,fill:"#0b2235"},svg);
 svgNode("rect",{x:6,y:74,width:288,height:24,fill:"#73907b"},svg);
 svgNode("line",{x1:4,y1:74,x2:296,y2:74,stroke:"#e9cba2","stroke-width":2},svg);
 if(!item)return;
 const values=getDraft(item.id).parameters||{};
 let a=Object.entries(values).filter(([k,v])=>typeof v==="number"&&Number.isFinite(v)).slice(0,2);
 if(!a.length){
  const t=svgNode("text",{x:150,y:47,"font-size":12,"text-anchor":"middle",fill:"#b1c8d7"},svg);
  t.textContent="Chưa có thông số để xem thử";return;
 }
 a.forEach(([key,val],i)=>{
  const s=specFor(item).find(s=>s.key===key);const scale=(s?.max||20);const h=Math.min(54,Math.max(6,val/scale*54));
  svgNode("rect",{x:70+i*96,y:73-h,width:43,height:h,rx:3,fill:i?"#6fb2d8":"#f0b477"},svg);
  const t=svgNode("text",{x:91+i*96,y:64-h,"font-size":10,"text-anchor":"middle",fill:"#fff8e9"},svg);
  t.textContent=fmt(val)+" "+(s?.unit||"");
 });
 const t=svgNode("text",{x:150,y:12,"font-size":10,"text-anchor":"middle",fill:"#90bbc8"},svg);
 t.textContent="MẶT CẮT TƯỢNG TRƯNG · KHÔNG CÙNG TỶ LỆ";
}
function cadPath(f){
 const type=f.geometry.type,g=f.geometry.coordinates;
 const line=p=>Array.isArray(p)&&p.length?p.map((x,i)=>(i?"L":"M")+x[0]+","+x[1]).join(" "):"";
 if(type==="t")return "";
 if(type==="l")return line(g);
 if(type==="p")return g.map(p=>line(p)+" Z").join(" ");
 if(type==="m")return g.map(poly=>poly.map(p=>line(p)+" Z").join(" ")).join(" ");
 return "";
}
function projection(point){
 const lon=W.base.origin.lon,lat=W.base.origin.lat;
 const x=(point[0]-lon)*111320*Math.cos(lat*Math.PI/180);
 const z=(point[1]-lat)*111320;
 return [724+x*4.35,543-z*4.35];
}
function osmPath(o){
 const g=o.geometry;if(!g)return "";
 const line=p=>p.map((x,i)=>{const a=projection(x);return(i?"L":"M")+a[0].toFixed(1)+","+a[1].toFixed(1)}).join(" ");
 if(g.type==="LineString")return line(g.coordinates);
 if(g.type==="Polygon")return g.coordinates.map(p=>line(p)+" Z").join(" ");
 if(g.type==="MultiPolygon")return g.coordinates.map(poly=>poly.map(p=>line(p)+" Z").join(" ")).join(" ");
 return "";
}
function loadRing(){
 const d=W.drafts.get(W.cadWaterId);if(d&&ringValid(d.ring))return clone(d.ring);
 const latest=eventLatest(W.cadWaterId);if(latest&&ringValid(latest.payload?.ring))return clone(latest.payload.ring);
 const water=W.byId.get(W.cadWaterId);
 let p=water?.geometry?.coordinates?.[0]||[];
 if(p.length>1&&p[0][0]===p[p.length-1][0]&&p[0][1]===p[p.length-1][1])p=p.slice(0,-1);
 return clone(p);
}
function mkFeature(item,isCad){
 const geom=item.geometry;if(!geom)return null;
 const layer=item.category;
 let attrs={class:"feature",stroke:C[layer]||"#708ca0","stroke-width":layer==="lake_edge"?2.6:1.1,
  fill:(layer==="lake_surface"?"#64bfce":layer==="lake_edge"||layer==="road_surface"&&item.kind==="osm"?"none":C[layer]||"#afc3c4"),
  opacity:layer==="tree"?.82:.91,"fill-rule":"evenodd"};
 let el;
 if(isCad&&geom.type==="t"){
  const p=geom.coordinates;
  el=svgNode("circle",{...attrs,cx:p[0],cy:p[1],r:layer==="tree"?8:layer==="fountain"?17:6,stroke:"#4f7b6e"});
 }else if(isCad){
  let path=cadPath(item);
  if(item.id===W.cadWaterId)path="M"+W.ring.map(p=>p.join(",")).join(" L")+" Z";
  if(layer==="lake_edge"&&W.ring)path="M"+W.ring.map(p=>p.join(",")).join(" L")+" Z";
  el=svgNode("path",{...attrs,d:path});
 }else if(geom.type==="Point"){
  let p=projection(geom.coordinates);el=svgNode("circle",{...attrs,cx:p[0],cy:p[1],r:5});
 }else el=svgNode("path",{...attrs,d:osmPath(item)});
 if(item.id===W.selectedId)el.classList.add("selected");
 el.dataset.id=item.id;el.setAttribute("aria-label",item.name);
 el.addEventListener("click",e=>{e.stopPropagation();select(item.id);});
 return el;
}
function paint(){
 if(!W.base)return;
 const cad=$("cadShapes"),osm=$("osmShapes");clear(cad);clear(osm);
 for(const o of W.base.objects){
  if(o.kind==="cad"){
   if(o.category==="osm_reference"||o.category==="review_point")continue;
   const e=mkFeature(o,true);if(e)cad.append(e);
  }else if(o.kind==="osm"){
   const e=mkFeature(o,false);if(e)osm.append(e);
  }
 }
 // Ensure water selectable without small trees covering it.
 const water=cad.querySelector('[data-id="'+W.cadWaterId+'"]');
 if(water)cad.insertBefore(water,cad.firstChild);
 const handles=$("cadHandles");clear(handles);
 if(W.editing&&W.ring&&current()?.id===W.cadWaterId){
  W.ring.forEach((p,i)=>{
   const c=svgNode("circle",{class:"vertex",cx:p[0],cy:p[1],r:6,"data-point":i},handles);
   c.addEventListener("pointerdown",e=>{
    e.preventDefault();e.stopPropagation();W.ringUndo.push(clone(W.ring));if(W.ringUndo.length>80)W.ringUndo.shift();
    W.drag={index:i,pointer:e.pointerId};c.classList.add("active");try{c.setPointerCapture(e.pointerId);}catch(_){}
   });
   c.addEventListener("pointermove",e=>{
    if(!W.drag||W.drag.pointer!==e.pointerId)return;
    const svg=$("cadSvg"),point=svg.createSVGPoint();point.x=e.clientX;point.y=e.clientY;
    const m=point.matrixTransform(svg.getScreenCTM().inverse());
    W.ring[i]=[Math.max(-400,Math.min(1900,m.x)),Math.max(-400,Math.min(1600,m.y))];
    const path=cad.querySelector('[data-id="'+W.cadWaterId+'"]');
    if(path)path.setAttribute("d","M"+W.ring.map(p=>p.join(",")).join(" L")+" Z");
    c.setAttribute("cx",W.ring[i][0]);c.setAttribute("cy",W.ring[i][1]);
    W.dirty=true;
   });
   const done=e=>{
    if(!W.drag||W.drag.pointer!==e.pointerId)return;
    W.drag=null;
    if(!ringValid(W.ring)){
      W.ring=W.ringUndo.pop()||loadRing();msg("Đường bờ tự cắt, đã hoàn tác","error");
    }else{const d=clone(getDraft(W.cadWaterId));d.ring=clone(W.ring);W.drafts.set(d.objectId,d);queueDraft(d.objectId);msg("Đã cập nhật đỉnh CAD nháp, chưa duyệt");}
    paint();
   };
   c.addEventListener("pointerup",done);c.addEventListener("pointercancel",done);
  });
 }
}
function setMode(mode){
 W.mode=mode;
 $("maps").classList.toggle("compare",mode==="compare");
 $("cadSlot").classList.toggle("active",mode==="cad");
 $("osmSlot").classList.toggle("active",mode==="osm");
 $("cadSlot").hidden=mode==="osm";$("osmSlot").hidden=mode==="cad";
 if(mode==="compare"){$("cadSlot").hidden=false;$("osmSlot").hidden=false;}
 ["cad","osm","compare"].forEach(m=>$(m+"Mode").setAttribute("aria-pressed",String(m===mode)));
 $("mapHint").textContent=mode==="compare"?"Đặt cạnh nhau để nhận ra sự khác biệt; KHÔNG ghép hệ tọa độ.":mode==="osm"?"WGS84 North-up · xem OSM gốc · chưa khảo sát":"CAD minh họa · có thể kéo đỉnh bờ hồ · không phải tọa độ GPS";
}
function setup(){
 $("search").oninput=e=>{W.query=e.target.value.trim().toLocaleLowerCase();renderList();};
 $("cadMode").onclick=()=>setMode("cad");
 $("osmMode").onclick=()=>setMode("osm");
 $("compareMode").onclick=()=>setMode("compare");
 $("editGeometry").onclick=()=>{
  if(!W.cadWaterId)return;
  if(W.selectedId!==W.cadWaterId)select(W.cadWaterId);
  W.editing=!W.editing;$("editGeometry").setAttribute("aria-pressed",String(W.editing));
  if(W.editing)setMode("cad");
  paint();msg(W.editing?"Kéo điểm hồng của CAD nháp. Không sửa OSM/SQLite.":"Đã tắt chỉnh hình học");
 };
 $("undo").onclick=()=>{if(W.ringUndo.length){W.ring=W.ringUndo.pop();const d=clone(getDraft(W.cadWaterId));d.ring=clone(W.ring);W.drafts.set(d.objectId,d);queueDraft(d.objectId);paint();}};
 $("resetView").onclick=()=>{W.ring=W.ring||loadRing();$("cadSvg").setAttribute("viewBox","0 0 1448 1086");$("osmSvg").setAttribute("viewBox","0 0 1448 1086");W.zoom=1;$("mapZoom").textContent="100%";};
 $("note").oninput=()=>{const o=current();if(!o)return;const d=clone(getDraft(o.id));d.note=$("note").value.slice(0,2000);W.drafts.set(o.id,d);queueDraft(o.id);};
 $("saveDraft").onclick=()=>saveDraft(true);
 $("approve").onclick=approve;
 $("export").onclick=exportBackup;
 $("importBtn").onclick=()=>$("importFile").click();
 $("importFile").onchange=async e=>{if(e.target.files?.[0])await importBundle(e.target.files[0]);e.target.value="";};
 // Pinch/zoom and wheel: zoom the CAD and OSM viewBoxes *independently*, not their data coordinates.
 for(const id of ["cadSvg","osmSvg"]){
  const svg=$(id),orig=[0,0,1448,1086];let vb=orig.slice();
  svg.addEventListener("wheel",e=>{
   e.preventDefault();const point=svg.createSVGPoint();point.x=e.clientX;point.y=e.clientY;
   const p=point.matrixTransform(svg.getScreenCTM().inverse());
   let next=vb[2]*Math.exp(e.deltaY*.001),factor=Math.max(.15,Math.min(5,next/orig[2]));
   let width=orig[2]*factor,height=orig[3]*factor;
   vb=[p.x-(p.x-vb[0])*width/vb[2],p.y-(p.y-vb[1])*height/vb[3],width,height];
   svg.setAttribute("viewBox",vb.join(" "));$("mapZoom").textContent=Math.round(100/factor)+"%";
  },{passive:false});
  svg.addEventListener("dblclick",e=>{
   if(id!=="cadSvg"||!W.editing||W.selectedId!==W.cadWaterId)return;
   const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
   const loc=p.matrixTransform(svg.getScreenCTM().inverse());
   let best=Infinity,at=-1;
   for(let i=0;i<W.ring.length;i++){
    const a=W.ring[i],b=W.ring[(i+1)%W.ring.length],dx=b[0]-a[0],dy=b[1]-a[1];
    const u=Math.max(0,Math.min(1,((loc.x-a[0])*dx+(loc.y-a[1])*dy)/(dx*dx+dy*dy||1)));
    const dist=Math.hypot(loc.x-a[0]-dx*u,loc.y-a[1]-dy*u);
    if(dist<best){best=dist;at=i;}
   }
   if(best<30&&at>=0){
    const before=clone(W.ring);W.ringUndo.push(before);W.ring.splice(at+1,0,[loc.x,loc.y]);
    if(!ringValid(W.ring)){W.ring=before;W.ringUndo.pop();msg("Điểm mới tạo giao cắt, đã hoàn tác","error");return;}
    const d=clone(getDraft(W.cadWaterId));d.ring=clone(W.ring);W.drafts.set(d.objectId,d);paint();queueDraft(W.cadWaterId);msg("Đã thêm điểm CAD nháp");}
  });
 }
}
try{
 const resp=await fetch(BASE_URL,{cache:"no-store"});if(!resp.ok)throw Error("Không tải được "+BASE_URL+" ("+resp.status+")");
 const base=await resp.json();
 if(base.schema!=="truc-giang-object-review-base-v1"||!Array.isArray(base.objects)||!base.readonly_baseline||base.objects.length<200)throw Error("Invalid review baseline");
 W.base=base;W.byId=new Map(base.objects.map(o=>[o.id,o]));
 W.cadWaterId=base.objects.find(o=>o.category==="lake_surface"&&o.kind==="cad")?.id;
 if(!W.cadWaterId)throw Error("Không tìm thấy hồ CAD để đối chiếu");
 await loadStorage();W.ring=loadRing();
 setup();chips();renderList();paint();setMode("cad");
 $("badge").textContent=base.stats.cad_objects+" CAD nháp · "+base.stats.osm_objects+" OSM · "+base.stats.review_placeholders+" cần đo";
 msg("Sẵn sàng · "+W.storage);
 select(W.cadWaterId);
 window.__TrucGiangObjectReview={getStats:()=>({
  objects:W.base.objects.length,cad:base.stats.cad_objects,osm:base.stats.osm_objects,events:W.events.length,
  drafts:W.drafts.size,selected:W.selectedId,mode:W.mode,editable:W.editing,readonly:true,
  geometryOrigin:"CAD illustration pixels / OSM EPSG:4326 separate"})};
}catch(e){
 W.loadError=e;$("badge").textContent="Lỗi dữ liệu";msg("Lỗi: "+e.message,"error");
 $("selection").textContent="Không thể mở dữ liệu chuẩn bị duyệt. Các file SQLite/OSM gốc không bị thay đổi.";
 console.error("[Review Studio]",e);
}
})();