/* Hồ Trúc Giang — local-first mobile photo survey.
 * No server-side write on GitHub Pages. IndexedDB keeps original blobs on device.
 * The exported JSON bundle is imported into canonical SQLite using scripts/import_survey.py.
 */
(function(){
"use strict";
var S={mode:false,initialized:false,data:null,stage:null,camera:null,db:null,records:[],elements:new Map(),current:null,renderCounter:0};
var DB_NAME="bdx0-ben-tre-survey",STORE="photo_observations",DB_VERSION=1;
var MAX_PHOTO_SIZE=12*1024*1024,MAX_EXPORT_SIZE=70*1024*1024;
var ESP="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=106.37435%2C10.23461%2C106.38193%2C10.24261&bboxSR=4326&imageSR=4326&size=1000%2C1100&format=jpg&f=image";
var GOOGLE="https://www.google.com/maps/@10.23861,106.37814,19z/data=!3m1!1e3";
function $(id){return document.getElementById(id)}
function elt(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function msg(text){var m=$("surveyMessage");if(m)m.textContent=text}
function limit(v,a,b){return Math.max(a,Math.min(b,v))}
function coords(x,z){var o=S.data.origin;return {lat:o.lat+z/111320,lon:o.lon+x/(111320*Math.cos(o.lat*Math.PI/180))}}
function openDb(){return new Promise(function(resolve,reject){
if(!window.indexedDB)return reject(Error("Thiết bị không hỗ trợ IndexedDB"));
var req=indexedDB.open(DB_NAME,DB_VERSION);
req.onupgradeneeded=function(){var d=req.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:"id"})};
req.onsuccess=function(){resolve(req.result)};req.onerror=function(){reject(req.error||Error("Cannot open IndexedDB"))}
})}
function transact(mode,method,item){return new Promise(function(resolve,reject){
if(!S.db)return reject(Error("Không thể lưu dữ liệu cục bộ"));
var tx=S.db.transaction(STORE,mode),req=tx.objectStore(STORE)[method](item);
req.onsuccess=function(){resolve(req.result)};req.onerror=function(){reject(req.error)};
})}
function readAll(){return transact("readonly","getAll").then(function(rows){S.records=rows||[];updateFieldMarkers();refreshButtons()})}
function lakeRing(){var f=(S.data&&S.data.features||[]).find(function(f){return f.kind==="water"&&f.osm_id===217484891});
if(!f)return null;return f.geometry.coordinates[0].map(function(p){var o=S.data.origin;return {x:(p[0]-o.lon)*111320*Math.cos(o.lat*Math.PI/180),z:(p[1]-o.lat)*111320}})}
function shorelineDistance(x,z){var ring=lakeRing();if(!ring||ring.length<4)return Infinity;
var inside=false,best=Infinity;
for(var i=0;i<ring.length-1;i++){var a=ring[i],b=ring[i+1],dx=b.x-a.x,dz=b.z-a.z;
var t=limit(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);
best=Math.min(best,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));
if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside}
return inside?0:best;
}
function buildUI(){
if($("surveyToggle"))return;
var btns=elt("div","survey-actions");btns.id="surveyActions";
btns.innerHTML='<button type="button" id="surveyToggle">📍 Ghim ảnh</button>'+
'<button type="button" id="satelliteToggle">🛰 Vệ tinh</button>'+
'<button type="button" id="surveyExport">⇩ Xuất ảnh</button>';
$("hud").append(btns);
var hint=elt("div","", "Chạm một vị trí trong cảnh 3D để đặt ảnh chụp. Ảnh trước hết được lưu trên thiết bị.");hint.id="surveyHint";hint.hidden=true;$("hud").append(hint);
var layer=elt("div");layer.id="fieldPhotoLayer";layer.setAttribute("aria-label","Điểm ảnh khảo sát chưa đồng bộ");S.stage.append(layer);
var editor=elt("div","survey-overlay");editor.id="surveyOverlay";editor.hidden=true;
editor.innerHTML=
'<div class="survey-dialog" role="dialog" aria-modal="true" aria-labelledby="surveyHeading">'+
'<h2 id="surveyHeading">📍 Ghim ảnh thực địa</h2>'+
'<p>Chọn ảnh từ thư viện hoặc camera và gắn vào tọa độ bạn vừa chọn trong mô hình. Hướng chụp được nhập thủ công.</p>'+
'<div class="coordinates" id="surveyCoords"></div>'+
'<label for="surveyImage">Ảnh thực địa (JPG, PNG hoặc WebP; tối đa 12 MB)</label>'+
'<input id="surveyImage" type="file" accept="image/jpeg,image/png,image/webp">'+
'<img id="surveyPreview" class="survey-preview" alt="Ảnh chuẩn bị gắn" hidden>'+
'<label for="surveyTitle">Tên địa điểm / mô tả ngắn</label><input id="surveyTitle" maxlength="120" placeholder="VD: Bờ phía bắc, gần hàng ghế">'+
'<div class="two"><div><label for="surveyBearing">Hướng nhìn từ Bắc (0–359°)</label>'+
'<input type="number" id="surveyBearing" min="0" max="359" value="0" required></div>'+
'<div><label for="surveyDate">Ngày chụp</label><input id="surveyDate" type="date"></div></div>'+
'<label for="surveyNotes">Ghi chú / chi tiết cần sửa trong 3D</label>'+
'<textarea id="surveyNotes" maxlength="1200" placeholder="Ví dụ: Bờ kè thực tế cao hơn, cây to hơn..."></textarea>'+
'<div class="checkbox-line"><input type="checkbox" id="surveyRights"><label for="surveyRights">Tôi có quyền sử dụng và chia sẻ ảnh này trong repo công khai nếu quyết định xuất và nhập gói khảo sát.</label></div>'+
'<div class="message" id="surveyMessage" role="status"></div>'+
'<div class="controls"><button id="surveyCancel" type="button">Hủy</button><button id="surveySave" class="primary" type="button">Lưu trên thiết bị</button></div>'+
'</div>';
document.body.append(editor);
var viewer=elt("div","survey-overlay");viewer.id="surveyViewer";viewer.hidden=true;document.body.append(viewer);
var satellite=elt("div","survey-overlay");satellite.id="satelliteOverlay";satellite.hidden=true;
satellite.innerHTML='<div class="survey-dialog satellite-dialog" role="dialog" aria-modal="true" aria-labelledby="satHeading">'+
'<h2 id="satHeading">🛰 Ảnh vệ tinh — Hồ Trúc Giang</h2>'+
'<p>Phạm vi nhìn khoảng 800–900 m quanh hồ, bao phủ vùng khảo sát 300 m từ mép hồ. Ảnh vệ tinh nền do Esri World Imagery cung cấp, không phải ảnh flycam.</p>'+
'<img id="satImg" alt="Ảnh vệ tinh Hồ Trúc Giang từ Esri World Imagery" loading="lazy">'+
'<p class="satellite-alt" id="satMessage">Nguồn: Esri World Imagery và các nhà cung cấp dữ liệu vệ tinh. Ảnh có thể thuộc thời điểm khác với hiện trạng.</p>'+
'<p><a id="satMapLink" href="'+GOOGLE+'" rel="noopener noreferrer" target="_blank">Mở Google Maps vệ tinh tại hồ ↗</a>'+
' · <a id="satEsriLink" rel="noopener noreferrer" target="_blank">Mở ảnh vệ tinh Esri trực tiếp ↗</a></p>'+
'<div class="controls"><button id="satClose">Đóng</button></div></div>';
document.body.append(satellite);
$("surveyToggle").addEventListener("click",toggleMode);
$("satelliteToggle").addEventListener("click",showSatellite);
$("surveyExport").addEventListener("click",exportSurvey);
$("surveyImage").addEventListener("change",previewFile);
$("surveySave").addEventListener("click",saveObservation);
$("surveyCancel").addEventListener("click",function(){editor.hidden=true;clearPreview()});
$("satClose").addEventListener("click",function(){satellite.hidden=true});
$("surveyOverlay").addEventListener("click",function(e){if(e.target===editor){editor.hidden=true;clearPreview()}});
satellite.addEventListener("click",function(e){if(e.target===satellite)satellite.hidden=true});
viewer.addEventListener("click",function(e){if(e.target===viewer)viewer.hidden=true});
$("satEsriLink").href=ESP;
}
function refreshButtons(){
if(!$("surveyToggle"))return;
$("surveyToggle").classList.toggle("active",S.mode);
$("surveyToggle").textContent=S.mode?"✓ Đang chọn điểm":"📍 Ghim ảnh";
$("surveyHint").hidden=!S.mode;
$("surveyExport").textContent="⇩ Xuất ảnh ("+S.records.length+")";
}
function toggleMode(){
if(!S.db){alert("Chưa sẵn sàng lưu ảnh trên thiết bị. Hãy kiểm tra quyền lưu trữ của trình duyệt.");return}
S.mode=!S.mode;S.stage.classList.toggle("survey-picking",S.mode);refreshButtons();S.stage.style.cursor=S.mode?"crosshair":"grab";
}
function previewFile(){
clearPreview();
var input=$("surveyImage"),file=input.files&&input.files[0];
if(!file)return;
if(!["image/jpeg","image/png","image/webp"].includes(file.type)){msg("Chỉ hỗ trợ JPG, PNG hoặc WebP.");return}
if(file.size>MAX_PHOTO_SIZE){msg("Ảnh vượt quá 12 MB, vui lòng chọn ảnh nhỏ hơn.");return}
S.current.previewUrl=URL.createObjectURL(file);
$("surveyPreview").src=S.current.previewUrl;$("surveyPreview").hidden=false;
}
function clearPreview(){
if(S.current&&S.current.previewUrl){URL.revokeObjectURL(S.current.previewUrl);delete S.current.previewUrl}
if($("surveyPreview")){$("surveyPreview").removeAttribute("src");$("surveyPreview").hidden=true}
}
function openEditor(x,z){
if(!S.db)return;
var gps=coords(x,z);S.current={x:x,z:z,lon:gps.lon,lat:gps.lat,previewUrl:null};
$("surveyCoords").textContent="E: "+x.toFixed(1)+" m · N: "+z.toFixed(1)+" m | GPS "+gps.lat.toFixed(6)+", "+gps.lon.toFixed(6);
$("surveyImage").value="";$("surveyTitle").value="";$("surveyNotes").value="";$("surveyBearing").value="0";
$("surveyDate").value=new Date().toLocaleDateString("sv-SE");$("surveyRights").checked=false;msg("");
$("surveyOverlay").hidden=false;$("surveyTitle").focus();S.mode=false;S.stage.classList.remove("survey-picking");refreshButtons();S.stage.style.cursor="grab";
}
function idNew(){if(window.crypto&&crypto.randomUUID)return "SURV-"+crypto.randomUUID().replace(/-/g,"").slice(0,24).toUpperCase();
return "SURV-"+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,13).toUpperCase()}
async function saveObservation(){
var btn=$("surveySave"),file=$("surveyImage").files&&$("surveyImage").files[0];
var title=$("surveyTitle").value.trim(),direction=Number($("surveyBearing").value);
if(!S.current){msg("Chưa có tọa độ được chọn.");return}
if(!file||!["image/jpeg","image/png","image/webp"].includes(file.type)){msg("Hãy chọn JPG, PNG hoặc WebP.");return}
if(file.size>MAX_PHOTO_SIZE){msg("Ảnh lớn hơn 12 MB.");return}
if(!title){msg("Vui lòng nhập tên địa điểm.");return}
if(!Number.isInteger(direction)||direction<0||direction>359){msg("Hướng chụp phải từ 0 đến 359 độ.");return}
if(!$("surveyRights").checked){msg("Hãy xác nhận quyền sử dụng ảnh trước khi lưu để xuất vào repo.");return}
var photo={id:idNew(),x_m:S.current.x,y_m:1.5,z_m:S.current.z,
 lat:S.current.lat,lon:S.current.lon,heading_deg:direction,title:title,
 captured_on:$("surveyDate").value||"",notes:$("surveyNotes").value.trim(),
 rights_approved:true,recorded_on:new Date().toISOString(),
 image:{name:file.name,type:file.type,size:file.size,blob:file}};
btn.disabled=true;
try{await transact("readwrite","put",photo);await readAll();$("surveyOverlay").hidden=true;clearPreview()}
catch(e){msg("Lỗi lưu trên thiết bị: "+e.message)}
finally{btn.disabled=false}
}
function updateFieldMarkers(){
var layer=$("fieldPhotoLayer");if(!layer)return;
layer.textContent="";S.elements.clear();
S.records.forEach(function(item){
var b=elt("button","field-marker","📍");b.type="button";b.title=item.title+" ("+item.heading_deg+"°)";
b.dataset.surveyId=item.id;b.setAttribute("aria-label","Xem ảnh khảo sát: "+item.title);
b.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();showSaved(item.id)});
layer.append(b);S.elements.set(item.id,b)});
updateMarkers()
}
function updateMarkers(){
if(!S.camera||!S.stage)return;
var w=S.stage.clientWidth,h=S.stage.clientHeight;
var fw=new THREE.Vector3();S.camera.getWorldDirection(fw);
S.records.forEach(function(item){
var b=S.elements.get(item.id);if(!b)return;
var pos=new THREE.Vector3(item.x_m,1.7,-item.z_m);
var ahead=pos.clone().sub(S.camera.position).dot(fw)>0;pos.project(S.camera);
var x=(pos.x*.5+.5)*w,y=(-pos.y*.5+.5)*h;
var visible=ahead&&pos.z<1&&pos.z>-1&&x>=20&&x<w-20&&y>=25&&y<h-70;
b.classList.toggle("hidden",!visible);if(visible){b.style.left=x.toFixed(1)+"px";b.style.top=y.toFixed(1)+"px"}});
}
function showSaved(id){
var row=S.records.find(function(x){return x.id===id});if(!row)return;
var viewer=$("surveyViewer");viewer.textContent="";
var dialog=elt("div","survey-dialog");dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");
var title=elt("h2","",row.title);dialog.append(title);
var p=elt("p","",row.lat.toFixed(6)+", "+row.lon.toFixed(6)+" · hướng "+row.heading_deg+"° · ngày chụp "+(row.captured_on||"không xác định"));dialog.append(p);
var url=URL.createObjectURL(row.image.blob),img=elt("img","survey-preview");img.alt=row.title;img.src=url;img.hidden=false;
img.addEventListener("load",function(){URL.revokeObjectURL(url)},{once:true});
dialog.append(img);
dialog.append(elt("p","",row.notes||"Ảnh đang được lưu cục bộ trên thiết bị này. Chưa được đưa lên SQLite trên GitHub."));
var controls=elt("div","controls"),close=elt("button","","Đóng"),deleteButton=elt("button","","Xóa ảnh");
deleteButton.className="danger";close.onclick=function(){viewer.hidden=true;URL.revokeObjectURL(url)};
deleteButton.onclick=async function(){if(!confirm("Xóa ảnh khảo sát này trên thiết bị?"))return;
try{await transact("readwrite","delete",row.id);await readAll();viewer.hidden=true;URL.revokeObjectURL(url)}
catch(e){alert(e.message)}};
controls.append(deleteButton,close);dialog.append(controls);viewer.append(dialog);viewer.hidden=false;
}
function uint8ToBase64(bytes){var pieces=[];var n=32766;for(var i=0;i<bytes.length;i+=n){var part=bytes.subarray(i,i+n),chars="";for(var j=0;j<part.length;j++)chars+=String.fromCharCode(part[j]);pieces.push(btoa(chars))}return pieces.join("")}
async function exportSurvey(){
if(!S.db){alert("Không có quyền đọc IndexedDB.");return}
if(!S.records.length){alert("Chưa có ảnh khảo sát. Chọn 📍 Ghim ảnh trước.");return}
var bytesTotal=S.records.reduce(function(n,r){return n+(r.image&&r.image.size||0)},0);
if(bytesTotal>MAX_EXPORT_SIZE){alert("Gói ảnh vượt quá 70 MB. Hãy chia thành nhiều lần nhập.");return}
var btn=$("surveyExport");btn.disabled=true;btn.textContent="Đang đóng gói...";
try{var photos=[];
for(var r of S.records){var bytes=new Uint8Array(await r.image.blob.arrayBuffer());photos.push({
 id:r.id,title:r.title,lat:r.lat,lon:r.lon,x_m:r.x_m,y_m:r.y_m,z_m:r.z_m,
 heading_deg:r.heading_deg,captured_on:r.captured_on,recorded_on:r.recorded_on,
 rights_approved:r.rights_approved,notes:r.notes,
 image:{filename:r.image.name,mime:r.image.type,size:bytes.length,base64:uint8ToBase64(bytes)}
})}
var payload={schema:"ben-tre-field-survey-v1",project:"Ho Truc Giang",origin:S.data.origin,
 area_of_interest:"300m shoreline buffer OSM way 217484891",
 generated_at:new Date().toISOString(),photos:photos};
var blob=new Blob([JSON.stringify(payload)],{type:"application/json"}),url=URL.createObjectURL(blob);
var a=elt("a");a.href=url;a.download="ho-truc-giang-khao-sat-"+new Date().toISOString().slice(0,10)+".json";document.body.append(a);a.click();a.remove();
setTimeout(function(){URL.revokeObjectURL(url)},5000);
alert("Đã xuất "+photos.length+" ảnh cùng tọa độ/hướng chụp. Gửi gói JSON trong cuộc trò chuyện để nhập vào SQLite trên repo, hoặc chạy scripts/import_survey.py.")
}catch(e){alert("Lỗi xuất dữ liệu: "+e.message)}
finally{btn.disabled=false;refreshButtons()}
}
function showSatellite(){
var overlay=$("satelliteOverlay"),img=$("satImg"),p=$("satMessage");
overlay.hidden=false;
p.textContent="Nguồn: Esri World Imagery. Đang lấy lớp vệ tinh, bản đồ có thể khác thời điểm hiện tại.";
img.hidden=false;
img.onload=function(){p.textContent="Ảnh vệ tinh của khu vực Hồ Trúc Giang (Esri World Imagery). Thời điểm ảnh nền chưa xác minh. © Esri và các nhà cung cấp dữ liệu."};
img.onerror=function(){img.hidden=true;p.textContent="Máy chủ vệ tinh không cho phép nhúng ảnh trong trình duyệt này. Hãy mở liên kết Google Maps hoặc Esri bên dưới."};
img.src=ESP;
}
function onSceneTap(e,camera,stage){
if(!S.mode)return false;
if(!S.db){alert("Bộ nhớ cục bộ chưa sẵn sàng");return true}
var r=stage.getBoundingClientRect();
var ndc=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);
var cast=new THREE.Raycaster();cast.setFromCamera(ndc,camera);
var plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),point=new THREE.Vector3();
if(!cast.ray.intersectPlane(plane,point)){alert("Không chọn được mặt đất trong góc nhìn này.");return true}
// Camera rays return right-handed world z=South; GIS keeps z=North.
var gisNorth=-point.z;
if(shorelineDistance(point.x,gisNorth)>300){alert("Điểm nằm ngoài phạm vi 300 m tính từ mép hồ. Hãy chọn gần hồ hơn.");return true}
openEditor(point.x,gisNorth);return true;
}
function init(data,camera,stage){
S.data=data;S.camera=camera;S.stage=stage;
if(S.initialized){updateMarkers();return}
S.initialized=true;buildUI();
openDb().then(function(db){S.db=db;return readAll()}).catch(function(e){
S.mode=false;refreshButtons();
$("surveyHint").hidden=false;$("surveyHint").textContent="Không thể dùng bộ nhớ ảnh trên thiết bị: "+e.message;
});
}
window.BenTreSurvey={init:init,update:function(camera){if(camera)S.camera=camera;updateMarkers()},onSceneTap:onSceneTap};
})();
