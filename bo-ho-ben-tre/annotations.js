/* Bờ Hồ Bến Tre · local-only visual error annotations.
 * No pin may alter GIS, SQLite or scene.json without independent review.
 */
(function(){
"use strict";
const KEY="bdx0:truc-giang:visual-annotations-v1",SCHEMA="truc-giang-visual-annotations-v1",LIMIT=150;
const TYPES={shore:"Đường bờ / mặt nước",road:"Đường / vỉa hè",building:"Công trình / nhà",tree:"Cây xanh / cảnh quan",fountain:"Đài phun / tượng",other:"Chi tiết khác"};
const $=id=>document.getElementById(id),finite=n=>typeof n==="number"&&Number.isFinite(n);
let records=[],placing=false,selected=null,host=null,origin=null,dialog=null,storageError="";
function valid(n){return n&&finite(n.x)&&finite(n.z)&&Math.abs(n.x)<=650&&Math.abs(n.z)<=650&&typeof n.title==="string"&&typeof n.description==="string"}
function normalize(n){
 const now=new Date().toISOString();
 return {id:String(n.id||"note-"+Date.now()+"-"+Math.random().toString(36).slice(2,8)).slice(0,90),
 x:Math.round(n.x*100)/100,z:Math.round(n.z*100)/100,
 type:Object.hasOwn(TYPES,n.type)?n.type:"other",
 title:n.title.slice(0,100),description:n.description.slice(0,1800),
 created_at:typeof n.created_at==="string"?n.created_at:now,
 updated_at:typeof n.updated_at==="string"?n.updated_at:now,
 verification_status:"user_visual_observation_not_surveyed"};
}
function load(){
 try{const data=JSON.parse(localStorage.getItem(KEY)||"[]");
  if(Array.isArray(data))records=data.filter(valid).slice(0,LIMIT).map(normalize);
 }catch(e){console.warn("Không thể đọc ghi chú trên thiết bị",e)}
}
function persist(){
 try{localStorage.setItem(KEY,JSON.stringify(records));storageError="";return true}
 catch(e){storageError="Không thể lưu trên máy (có thể đầy bộ nhớ hoặc chế độ riêng tư). Hãy xuất JSON.";alert(storageError);return false}
}
function gps(n){
 if(!origin||!finite(origin.lon)||!finite(origin.lat))return null;
 const lat=origin.lat+n.z/111320,lon=origin.lon+n.x/(111320*Math.cos(origin.lat*Math.PI/180));
 return {lat:Number(lat.toFixed(7)),lon:Number(lon.toFixed(7)),method:"local_approximation_not_surveyed"};
}
function payload(){
 return {schema:SCHEMA,project:"Ho Truc Giang / Bo Ho Ben Tre",exported_at:new Date().toISOString(),
 status:"USER_VISUAL_FEEDBACK_NOT_VERIFIED",coordinate_system:"local_meters_x_east_z_north",
 origin_wgs84:origin?{lat:origin.lat,lon:origin.lon}:null,
 basis:"OSM water way 217484891; OSM and illustrative scene are not verified surveys",
 instructions:"User visual reports only. Never modify canonical water polygon/SQLite without independent verification.",
 count:records.length,annotations:records.map((n,i)=>({...n,number:i+1,approx_wgs84:gps(n)}))};
}
function download(name,blob){
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)
}
function filename(ext){return "bo-ho-3d-annotations-"+new Date().toISOString().slice(0,10)+"."+ext}
function message(m){const el=$("wbAnnMessage");if(el)el.textContent=m}
function exportJSON(){
 if(!records.length){openList();message("Hãy tạo ít nhất một ghim trước khi xuất.");return}
 download(filename("json"),new Blob([JSON.stringify(payload(),null,2)],{type:"application/json;charset=utf-8"}));
 message("Đã xuất JSON. Đính kèm file này vào cuộc trò chuyện để mình đọc từng điểm sai.")
}
function exportPNG(){
 if(!host||!host.capturePlan)return;
 host.capturePlan(canvas=>{
  if(!canvas){message("Không thể chụp Floor Plan.");return}
  canvas.toBlob(blob=>{
   if(blob)download(filename("png"),blob);else message("Trình duyệt không hỗ trợ xuất PNG.")
  },"image/png")
 })
}
function setPlacing(flag){
 placing=!!flag;
 if(placing&&host&&host.setMode)host.setMode("floor");
 for(const b of [$("wbAnnotationToggle"),$("wbAnnotationShortcut")]){
  if(!b)continue;b.classList.toggle("active",placing);b.setAttribute("aria-pressed",String(placing))
 }
 if($("wbAnnotationToggle"))$("wbAnnotationToggle").textContent=placing?"✓ Đang ghim":"✎ Ghim lỗi";
 if($("wbAnnotationShortcut"))$("wbAnnotationShortcut").textContent=placing?"✓ Chạm mặt bằng để ghim":"✎ Ghim lỗi trên Floor Plan";
 if($("wbAnnHint"))$("wbAnnHint").hidden=!placing
}
function refresh(){if($("wbAnnotationCount"))$("wbAnnotationCount").textContent=String(records.length);host?.redraw?.()}
function show(){dialog.hidden=false;dialog.classList.add("open");document.body.classList.add("wb-ann-open")}
function close(){dialog.hidden=true;dialog.classList.remove("open");document.body.classList.remove("wb-ann-open")}
function openList(){show();renderList()}
function renderList(){
 selected=null;
 $("wbAnnFormPage").hidden=true;$("wbAnnListPage").hidden=false;
 $("wbAnnDialogTitle").textContent="Các vị trí cần sửa";
 message("Ghim chỉ lưu trên thiết bị. Xuất JSON hoặc ảnh PNG rồi gửi trong cuộc trò chuyện.");
 const list=$("wbAnnItems");list.textContent="";
 if(!records.length){const p=document.createElement("p");p.className="wb-ann-empty";p.textContent="Chưa có ghi chú. Bấm “Ghim lỗi” rồi chạm vào mặt bằng.";list.appendChild(p);return}
 records.forEach((n,i)=>{
  const row=document.createElement("button");row.type="button";row.className="wb-ann-list-item";
  const tag=document.createElement("b");tag.textContent="#"+(i+1);
  const label=document.createElement("span");label.className="wb-ann-list-copy";
  const title=document.createElement("strong");title.textContent=n.title||"Chưa đặt tên";
  const detail=document.createElement("small");detail.textContent=TYPES[n.type]+" · X "+n.x.toFixed(1)+" m / Z "+n.z.toFixed(1)+" m";
  label.append(title,detail);row.append(tag,label);row.addEventListener("click",()=>edit(n.id));list.appendChild(row)
 })
}
function openEditor(n){
 selected=n.id||null;
 $("wbAnnListPage").hidden=true;$("wbAnnFormPage").hidden=false;show();
 $("wbAnnDialogTitle").textContent=selected?"Sửa ghi chú":"Tạo ghim mới";
 $("wbAnnType").value=n.type||"shore";$("wbAnnTitle").value=n.title||"";
 $("wbAnnDescription").value=n.description||"";
 $("wbAnnPosition").textContent="X (Đông): "+n.x.toFixed(2)+" m · Z (Bắc): "+n.z.toFixed(2)+" m";
 const p=gps(n);$("wbAnnApprox").textContent=p?"GPS suy từ mô hình (KHÔNG đo thực địa): "+p.lat+", "+p.lon:"Không có tọa độ tham chiếu";
 $("wbAnnDelete").hidden=!selected;
 $("wbAnnFormPage").dataset.x=String(n.x);$("wbAnnFormPage").dataset.z=String(n.z);
 message("Mô tả điểm sai và hình dáng/chi tiết đúng bạn muốn thấy.");
 $("wbAnnTitle").focus()
}
function edit(id){const n=records.find(x=>x.id===id);if(n)openEditor(n)}
function create(point){
 if(records.length>=LIMIT){openList();message("Đã có "+LIMIT+" điểm; hãy xuất file trước.");return}
 setPlacing(false);openEditor({x:Math.round(point.x*100)/100,z:Math.round(point.z*100)/100,title:"",description:"",type:"shore"})
}
function save(e){
 e.preventDefault();
 const title=$("wbAnnTitle").value.trim(),description=$("wbAnnDescription").value.trim();
 if(!title||!description){message("Cần nhập tiêu đề và mô tả cụ thể.");return}
 const page=$("wbAnnFormPage"),x=Number(page.dataset.x),z=Number(page.dataset.z);
 if(!finite(x)||!finite(z))return;
 const old=selected?records.find(n=>n.id===selected):null,now=new Date().toISOString();
 const rec=normalize({id:old?.id||"note-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),
  x,z,type:$("wbAnnType").value,title,description,created_at:old?.created_at||now,updated_at:now});
 if(old)records[records.indexOf(old)]=rec;else records.push(rec);
 persist();refresh();close()
}
function remove(){
 if(!selected)return;
 const n=records.find(x=>x.id===selected);
 if(!n||!confirm("Xóa ghim “"+n.title+"” trên thiết bị này?"))return;
 records=records.filter(x=>x.id!==selected);persist();refresh();renderList()
}
async function importJSON(file){
 if(!file)return;
 try{
  if(file.size>2097152)throw Error("File vượt 2 MB.");
  const data=JSON.parse(await file.text());
  if(data.schema!==SCHEMA||!Array.isArray(data.annotations))throw Error("Không phải file Annotation Bờ Hồ 3D.");
  if(data.annotations.length>LIMIT||!data.annotations.every(valid))throw Error("Dữ liệu vị trí hoặc mô tả không hợp lệ.");
  const merged=new Map(records.map(x=>[x.id,x]));
  data.annotations.map(normalize).forEach(x=>merged.set(x.id,x));
  if(merged.size>LIMIT)throw Error("Tổng số ghim vượt "+LIMIT+".");
  records=[...merged.values()];persist();refresh();renderList();message("Đã nhập "+data.annotations.length+" ghi chú.");
 }catch(e){message("Không thể nhập: "+e.message)}
 finally{$("wbAnnImportFile").value=""}
}
function draw(ctx,project){
 ctx.save();ctx.textAlign="center";ctx.textBaseline="middle";
 records.forEach((n,i)=>{
  const p=project(n);if(!p||!finite(p.x)||!finite(p.y))return;
  ctx.beginPath();ctx.arc(p.x,p.y,12,0,Math.PI*2);ctx.fillStyle=n.id===selected?"#b93430":"#d63435";ctx.fill();
  ctx.lineWidth=3;ctx.strokeStyle="#fff";ctx.stroke();ctx.font="bold 11px system-ui";
  ctx.fillStyle="#fff";ctx.fillText(String(i+1),p.x,p.y+.5);
  ctx.beginPath();ctx.arc(p.x,p.y,17,0,Math.PI*2);ctx.strokeStyle="rgba(190,45,46,.27)";ctx.lineWidth=1;ctx.stroke()
 });
 ctx.restore()
}
function handleTap(point,project){
 if(!point||!finite(point.x)||!finite(point.z))return false;
 let closest=null,best=20;
 records.forEach(n=>{
  const a=project(n),b=project(point),d=Math.hypot(a.x-b.x,a.y-b.y);
  if(d<best){best=d;closest=n}
 });
 if(closest){setPlacing(false);edit(closest.id);return true}
 if(!placing)return false;
 create(point);return true
}
function init(options){
 if(host)return;host=options;origin=options.origin||null;load();
 const shape=$("wbShapes");
 if(shape){
  const b=document.createElement("button");b.id="wbAnnotationShortcut";b.type="button";b.className="wb-annotation-shortcut";
  b.textContent="✎ Ghim lỗi trên Floor Plan";b.addEventListener("click",()=>setPlacing(!placing));shape.appendChild(b)
 }
 const head=document.querySelector("#wbPlanDock .wb-plan-head");
 if(head){
  const bar=document.createElement("div");bar.id="wbAnnotationBar";bar.className="wb-annotation-bar";
  bar.innerHTML='<button type="button" id="wbAnnotationToggle" aria-pressed="false">✎ Ghim lỗi</button>'+
    '<button type="button" id="wbAnnotationList" title="Xem tất cả ghim">☷ <span id="wbAnnotationCount">0</span></button>'+
    '<button type="button" id="wbAnnotationExport" title="Tải JSON">⇩ JSON</button>';
  head.appendChild(bar);
  $("wbAnnotationToggle").addEventListener("click",()=>setPlacing(!placing));
  $("wbAnnotationList").addEventListener("click",openList);
  $("wbAnnotationExport").addEventListener("click",exportJSON)
 }
 const box=document.createElement("div");box.id="wbAnnotationOverlay";box.className="wb-annotation-overlay";box.hidden=true;
 box.innerHTML=[
 '<div id="wbAnnBackdrop" class="wb-ann-backdrop"></div>',
 '<section class="wb-ann-dialog" role="dialog" aria-modal="true" aria-labelledby="wbAnnDialogTitle">',
 '<header><strong id="wbAnnDialogTitle">Ghim lỗi Bờ Hồ 3D</strong><button id="wbAnnClose" type="button" aria-label="Đóng">×</button></header>',
 '<div class="wb-ann-content"><div id="wbAnnListPage"><div id="wbAnnItems"></div><div class="wb-ann-actions">',
 '<button type="button" id="wbAnnNew">✎ Ghim mới</button>',
 '<button type="button" id="wbAnnExportJSON">⇩ Xuất JSON</button>',
 '<button type="button" id="wbAnnExportPNG">▧ Xuất ảnh PLAN</button>',
 '<label class="wb-ann-import">↑ Nhập JSON <input type="file" id="wbAnnImportFile" accept=".json,application/json"></label>',
 '</div></div>',
 '<form id="wbAnnFormPage" hidden>',
 '<p id="wbAnnPosition" class="wb-ann-coords"></p><p id="wbAnnApprox" class="wb-ann-approx"></p>',
 '<label>Loại vấn đề<select id="wbAnnType">',
 Object.entries(TYPES).map(([v,t])=>'<option value="'+v+'">'+t+'</option>').join(""),
 '</select></label>',
 '<label>Vị trí này sai ở đâu?<input id="wbAnnTitle" required maxlength="100" placeholder="Ví dụ: Mũi đất nhô xuống hồ bị thiếu"></label>',
 '<label>Mô tả lỗi và mong muốn sửa<textarea id="wbAnnDescription" required maxlength="1800" rows="5" placeholder="Hiện mô hình đang... Trong thực tế... Hãy sửa..."></textarea></label>',
 '<p class="wb-ann-warning">Nhận xét trực quan, không phải GPS đo thực địa. Không tự sửa OSM/SQLite.</p>',
 '<div class="wb-ann-actions"><button id="wbAnnSave" type="submit" class="wb-ann-primary">✓ Lưu ghim</button>',
 '<button id="wbAnnBack" type="button">← Danh sách</button><button id="wbAnnDelete" type="button">Xóa</button></div>',
 '</form><p id="wbAnnMessage" role="status" aria-live="polite"></p></div></section>'
 ].join("");
 document.body.appendChild(box);dialog=box;
 $("wbAnnBackdrop").addEventListener("click",close);$("wbAnnClose").addEventListener("click",close);
 $("wbAnnBack").addEventListener("click",renderList);$("wbAnnDelete").addEventListener("click",remove);
 $("wbAnnNew").addEventListener("click",()=>{close();setPlacing(true)});
 $("wbAnnExportJSON").addEventListener("click",exportJSON);$("wbAnnExportPNG").addEventListener("click",exportPNG);
 $("wbAnnImportFile").addEventListener("change",e=>importJSON(e.target.files[0]));
 $("wbAnnFormPage").addEventListener("submit",save);
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!dialog.hidden)close()});
 const hint=document.createElement("div");hint.id="wbAnnHint";hint.className="wb-ann-hint";hint.hidden=true;
 hint.textContent="✎ Chạm điểm sai để ghim. Kéo để dịch bản đồ, +/− để phóng to."; $("wbPlanDock")?.appendChild(hint);
 refresh();setPlacing(false);
 if(new URLSearchParams(location.search).get("annotate")==="1")requestAnimationFrame(()=>setPlacing(true))
}
window.TrucGiangAnnotations={init,draw,handleTap,openList,setPlacing,onModeChanged:mode=>{if(mode==="3d"&&placing)setPlacing(false)},
 exportJSON,exportPNG,getInfo:()=>({schema:SCHEMA,count:records.length,placing,selected,storage_error:storageError,source_modified:false}),
 getNotes:()=>JSON.parse(JSON.stringify(records))};
})();