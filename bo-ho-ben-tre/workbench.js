/* Bờ Hồ Bến Tre × Warestack Workbench.
 * Floor plan, North-up QA, 3-axis gizmo, split 3D/2D and selectable source shape.
 * Geometry candidate is schematic, not surveyed GIS.
 */
(function(){
"use strict";
var $=function(id){return document.getElementById(id)};
var W={ready:false,mode:"3d",shape:"raw",view:"iso",data:null,host:null,
  planCanvas:null,axisCanvas:null,planZoom:1,panX:0,panZ:0,mouse:null,metrics:null,issues:[],reviewPins:[],reviewLoaded:false};
function local(p){var o=W.data.origin;return[(p[0]-o.lon)*111320*Math.cos(o.lat*Math.PI/180),(p[1]-o.lat)*111320]}
function rawPoints(){var f=(W.data.features||[]).find(function(q){return q.kind==="water"&&q.osm_id===217484891});
return f?f.geometry.coordinates[0].slice(0,-1).map(function(p){var a=local(p);return{x:a[0],z:a[1]}}):[]}
function activePoints(){return window.TrucGiangLake?TrucGiangLake.proposal(rawPoints(),W.shape):rawPoints()}
function el(t,klass,text){var n=document.createElement(t);n.className=klass||"";if(text!==undefined)n.textContent=text;return n}
function build(){
 var stage=$("stage");
 var modes=el("nav","wb-modes");modes.id="wbModes";modes.setAttribute("aria-label","Chế độ hiển thị");
 modes.innerHTML='<span class="wb-modes-title">VIEW</span>'+
 '<button type="button" data-wb-mode="3d" aria-label="Chế độ 3D" class="selected">◫ <span>3D</span></button>'+
 '<button type="button" data-wb-mode="floor" aria-label="Floor Plan">▤ <span>PLAN</span></button>'+
 '<button type="button" data-wb-mode="split" aria-label="Chia đôi 3D và Floor Plan">◧ <span>SPLIT</span></button>';
 stage.append(modes);
 var shapes=el("section","wb-shape-control");shapes.id="wbShapes";shapes.innerHTML=
 '<strong>LAKE SHORELINE</strong><div class="wb-shape-buttons">'+
 '<button type="button" data-wb-shape="candidate" disabled title="Hình đề xuất bị loại do sai hình học">Đề xuất sai · tắt</button>'+
 '<button type="button" data-wb-shape="raw" class="selected">◇ OSM gốc</button></div>'+
 '<small id="wbShapeStatus">Dữ liệu OSM gốc · chưa khảo sát thực tế</small>'+
 '<a class="wb-review-open" href="model.html?sector=north_notch#osm-way-217484891">🟠 Xem 4 đoạn bờ cần sửa ↗</a>'+
 '<a class="wb-review-open" href="cad-gis.html" style="border-color:#a6c9ef;background:#eef7ff;color:#1d5cba!important">▧ Mở CAD / GIS · sửa vector ↗</a>';
 stage.append(shapes);
 var pins=el("div","wb-review-pins");pins.id="wbReviewPins";
 pins.setAttribute("aria-label","Các vùng bờ hồ OSM đang cần đối chiếu");
 stage.append(pins);
 var dock=el("section","wb-plan-dock");dock.id="wbPlanDock";
 dock.setAttribute("aria-label","Floor plan mặt bằng Hồ Trúc Giang");
 dock.innerHTML='<div class="wb-plan-head"><span class="wb-plan-label">⌗ FLOOR PLAN <em>LOCAL XY · NORTH UP</em></span>'+
 '<div class="wb-plan-actions">'+
 '<label title="So sánh (khi có hình hợp lệ)" hidden><input id="wbCompare" type="checkbox"> Overlay</label>'+
 '<label title="Mốc đề xuất sai đã loại" hidden><input id="wbAnchors" type="checkbox"> MỐC</label>'+
 '<button type="button" id="wbGoogleToggle" aria-label="Google Maps Satellite trong Floor Plan" aria-pressed="false">🛰 Google Satellite</button>'+ '<button type="button" id="wbPlanMinus" aria-label="Thu nhỏ Floor Plan">−</button>'+
 '<button type="button" id="wbPlanPlus" aria-label="Phóng to Floor Plan">+</button></div></div>'+
 '<div class="wb-plan-surface"><div id="wbGoogleBase" class="wb-google-base" aria-label="Google Maps Satellite"></div>'+
 '<canvas id="wbPlanCanvas" aria-label="Bản vẽ mặt bằng nước hồ, đường, nhà và mốc đặc trưng"></canvas>'+
 '<div id="wbGoogleHitarea" class="wb-google-hitarea" aria-label="Di chuyển và chú thích bản đồ"></div></div>'+
 '<div class="wb-plan-footer"><span><i class="wb-dot proposed"></i> ĐƯỜNG BỜ OSM</span>'+
 '<span><i class="wb-dot raw"></i> CHƯA KIỂM CHỨNG</span><small id="wbGoogleStatus">Mặt bằng OSM · chưa kiểm chứng</small></div>';
 stage.append(dock);
 var axis=el("div","wb-axis");axis.id="wbAxis";axis.innerHTML=
 '<div class="wb-axis-title">AXIS · XYZ</div>'+
 '<canvas id="wbAxisCanvas" width="110" height="100" aria-label="Axis gizmo: X Đông, Y Cao, Z Bắc" title="Chạm đầu trục để chọn góc nhìn"></canvas>'+
 '<div class="wb-preset-row"><button data-wb-view="top" aria-label="Nhìn từ trên xuống">TOP</button>'+
 '<button data-wb-view="north" aria-label="Nhìn từ Bắc">N</button>'+
 '<button data-wb-view="east" aria-label="Nhìn từ Đông">E</button>'+
 '<button data-wb-view="iso" aria-label="Phối cảnh isometric" class="selected">ISO</button></div>';
 stage.append(axis);
 var axisToggle=el("button","wb-axis-toggle","⌖ Góc nhìn");
 axisToggle.id="wbAxisToggle";axisToggle.type="button";
 axisToggle.setAttribute("aria-controls","wbAxis");axisToggle.setAttribute("aria-expanded","false");
 axisToggle.setAttribute("aria-label","Mở hoặc đóng điều khiển trục XYZ và góc nhìn");
 stage.append(axisToggle);
 axisToggle.addEventListener("click",function(e){
   e.stopPropagation();
   var opened=stage.classList.toggle("axis-open");
   axisToggle.setAttribute("aria-expanded",String(opened));
 });
 var status=el("div","wb-status");status.id="wbStatus";status.textContent="OSM SOURCE · NOT VERIFIED · METERS";
 stage.append(status);
 W.planCanvas=$("wbPlanCanvas");W.axisCanvas=$("wbAxisCanvas");W.pinLayer=$("wbReviewPins");
 stage.querySelectorAll("[data-wb-mode]").forEach(function(b){b.addEventListener("click",function(e){e.stopPropagation();setMode(b.dataset.wbMode)})});
 stage.querySelectorAll("[data-wb-shape]").forEach(function(b){b.addEventListener("click",function(e){e.stopPropagation();setShape(b.dataset.wbShape)})});
 stage.querySelectorAll("[data-wb-view]").forEach(function(b){b.addEventListener("click",function(e){e.stopPropagation();setView(b.dataset.wbView)})});
 $("wbPlanPlus").addEventListener("click",function(){if(window.BoHoGoogleSatellite&&BoHoGoogleSatellite.isVisible())BoHoGoogleSatellite.zoom(1);else W.planZoom=Math.min(6,W.planZoom*1.28);drawPlan()});
 $("wbPlanMinus").addEventListener("click",function(){if(window.BoHoGoogleSatellite&&BoHoGoogleSatellite.isVisible())BoHoGoogleSatellite.zoom(-1);else W.planZoom=Math.max(.55,W.planZoom/1.28);drawPlan()});
 $("wbCompare").addEventListener("change",drawPlan);
 $("wbAnchors").addEventListener("change",drawPlan);
 attachPlanInteraction();
 W.axisCanvas.addEventListener("click",function(e){
   var r=W.axisCanvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
   if(W.metrics&&W.metrics.ends){var near=null,d=Infinity;
    W.metrics.ends.forEach(function(q){var dist=Math.hypot(x-q.x,y-q.y);if(dist<d){d=dist;near=q}});
    if(near&&d<24){setView(near.key);return}
   }
   setView("iso")
 });
 window.addEventListener("resize",resize);
}
function setMode(mode){
 if(!["3d","floor","split"].includes(mode))return;
 W.mode=mode;var stage=$("stage");stage.classList.remove("wb-3d","wb-floor","wb-split","axis-open");stage.classList.add("wb-"+mode);if(window.BoHoGoogleSatellite)BoHoGoogleSatellite.setMode(mode);
  var axisButton=$("wbAxisToggle");if(axisButton)axisButton.setAttribute("aria-expanded","false");
 stage.querySelectorAll("[data-wb-mode]").forEach(function(b){b.classList.toggle("selected",b.dataset.wbMode===mode);b.setAttribute("aria-pressed",String(b.dataset.wbMode===mode))});
 if(W.host&&W.host.resize3D)W.host.resize3D(mode);
 resize();updatePins();
 if(window.TrucGiangAnnotations)TrucGiangAnnotations.onModeChanged(mode);
}
function setShape(shape){
 if(shape!=="raw")return;
 W.shape=shape;
 document.querySelectorAll("[data-wb-shape]").forEach(function(b){b.classList.toggle("selected",b.dataset.wbShape===shape);b.setAttribute("aria-pressed",String(b.dataset.wbShape===shape))});
 $("wbShapeStatus").textContent=shape==="raw"?"OSM way 217484891 · cần đo kiểm chứng":"Hình dáng đề xuất · cần đo xác minh";
 if(W.host&&W.host.updateShape)W.host.updateShape(shape);
 W.planZoom=1;drawPlan();
}
function setView(view){
 if(!["top","north","south","east","west","iso"].includes(view))return;
 W.view=view;W.host.setView(view);
 document.querySelectorAll("[data-wb-view]").forEach(function(b){b.classList.toggle("selected",b.dataset.wbView===view)});
 drawAxis();
}
function resize(){if(!W.ready)return;drawPlan();drawAxis();updatePins()}
function setupCanvas(canvas){var rect=canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return null;
 var scale=Math.min(window.devicePixelRatio||1,2),w=rect.width,h=rect.height;
 var pxw=Math.round(w*scale),pxh=Math.round(h*scale);
 if(canvas.width!==pxw)canvas.width=pxw;if(canvas.height!==pxh)canvas.height=pxh;
 var c=canvas.getContext("2d");c.setTransform(scale,0,0,scale,0,0);return {ctx:c,w:w,h:h}}
function screen(point,w,h,scale){if(window.BoHoGoogleSatellite&&BoHoGoogleSatellite.isVisible()){var v=BoHoGoogleSatellite.project(point);if(v)return v}return {x:w/2+(point.x-W.panX)*scale,y:h/2-(point.z-W.panZ)*scale}}
function screenToLocal(x,y){if(window.BoHoGoogleSatellite&&BoHoGoogleSatellite.isVisible()){var v=BoHoGoogleSatellite.unproject(x,y);if(v)return v}var M=W.metrics;if(!M||!M.plan)return null;var a=M.plan;return{x:W.panX+(x-a.w/2)/a.scale,z:W.panZ-(y-a.h/2)/a.scale}}
function trace(c,pts,w,h,k){if(!pts||pts.length<2)return;c.beginPath();pts.forEach(function(p,i){
 var s=screen(p,w,h,k);if(!i)c.moveTo(s.x,s.y);else c.lineTo(s.x,s.y)
 });c.closePath()}

function reviewedRing(){
 return rawPoints()
}
function issuePoint(issue){
 var raw=reviewedRing(),points=(issue.ring_indices||[]).filter(function(i){return Number.isInteger(i)&&i>=0&&i<raw.length});
 if(!points.length)return null;
 var i=points[Math.floor(points.length/2)];
 return {x:raw[i].x,z:raw[i].z}
}
function reviewUrl(issue){return "model.html?sector="+encodeURIComponent(issue.id)+"#osm-way-217484891"}
function loadIssues(){
 fetch("data/model-view.json",{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(function(d){
  W.issues=(d.lake_audit&&Array.isArray(d.lake_audit.unresolved)?d.lake_audit.unresolved:[]).filter(function(x){return x.ring_indices&&x.ring_indices.length>=2}).slice(0,4);
  W.reviewLoaded=true;if(W.host&&W.host.setReviewSegments)W.host.setReviewSegments(W.issues);W.pinLayer.textContent="";
  W.issues.forEach(function(issue){
   var b=el("a","wb-review-pin",String(issue.number||"!") );
   b.href=reviewUrl(issue);b.title="Kiểm tra "+issue.title+": "+issue.question;
   b.setAttribute("aria-label", "Vùng "+issue.number+": "+issue.title+". Mở xem trước phần đường bờ cần chỉnh.");
   b.dataset.issue=issue.id;b.addEventListener("pointerdown",function(e){e.stopPropagation()});
   b.addEventListener("pointerup",function(e){e.stopPropagation()});
   W.pinLayer.appendChild(b);W.reviewPins.push({issue:issue,element:b})
  });
  drawPlan();updatePins();
 }).catch(function(e){console.warn("Không thể tải các vùng duyệt bờ:",e.message)})
}
function drawIssueSegments(c,w,h,k){
 if(!W.issues.length)return;
 var ring=reviewedRing();
 W.issues.forEach(function(issue){
  var pts=(issue.ring_indices||[]).map(function(i){return ring[i]}).filter(Boolean);
  if(pts.length<2)return;
  c.save();c.strokeStyle="#f07d2d";c.lineWidth=issue.id==="north_notch"?5:4;c.lineCap="round";c.lineJoin="round";
  c.beginPath();pts.forEach(function(p,i){var xy=screen(p,w,h,k);if(!i)c.moveTo(xy.x,xy.y);else c.lineTo(xy.x,xy.y)});c.stroke();c.restore();
  var pos=issuePoint(issue);if(!pos)return;
  var xy=screen(pos,w,h,k);c.beginPath();c.arc(xy.x,xy.y,12,0,Math.PI*2);
  c.fillStyle="#fff";c.fill();c.strokeStyle="#ed7f2d";c.lineWidth=2.5;c.stroke();
  c.font="bold 13px system-ui";c.textAlign="center";c.textBaseline="middle";
  c.fillStyle="#965019";c.fillText(String(issue.number),xy.x,xy.y);
 });
}
function updatePins(){
 if(!W.ready||!W.reviewPins.length||!W.host)return;
 var info=W.host.getCameraInfo();
 if(!info||!info.camera)return;
 var camera=info.camera,canvas=document.getElementById("webgl"),stage=$("stage");
 if(!canvas||!stage)return;
 var visibleW=canvas.getBoundingClientRect().width,visibleH=canvas.getBoundingClientRect().height;
 var hidden=W.mode==="floor";
 W.reviewPins.forEach(function(rec){
  var p=issuePoint(rec.issue),button=rec.element;if(hidden||!p){button.hidden=true;return}
  var vec=new THREE.Vector3(p.x,5.5,p.z).project(camera);
  var x=(vec.x*.5+.5)*visibleW,y=(1-(vec.y*.5+.5))*visibleH;
  var inside=vec.z>=-1&&vec.z<=1&&x>14&&y>30&&x<visibleW-14&&y<visibleH-45;
  button.hidden=!inside;
  if(inside){button.style.left=x+"px";button.style.top=y+"px"}
 });
}

function drawPlan(){
 if(!W.ready||W.mode==="3d")return;
 var obj=setupCanvas(W.planCanvas);if(!obj)return;
 var c=obj.ctx,w=obj.w,h=obj.h,k=Math.min(w/450,h/390)*W.planZoom;var satellite=window.BoHoGoogleSatellite&&BoHoGoogleSatellite.isVisible();if(satellite)k=BoHoGoogleSatellite.scale()||k;
 W.metrics=W.metrics||{};W.metrics.plan={w:w,h:h,scale:k};
 c.clearRect(0,0,w,h);if(!satellite){c.fillStyle="#f8fbff";c.fillRect(0,0,w,h)}
 var step=25;
 var halfX=w/k/2+step,halfZ=h/k/2+step;
 c.strokeStyle=satellite?"rgba(255,255,255,.07)":"#e6ecf6";c.lineWidth=1;
 for(var x=Math.floor((W.panX-halfX)/step)*step;x<=W.panX+halfX;x+=step){var xx=w/2+(x-W.panX)*k;c.beginPath();c.moveTo(xx,0);c.lineTo(xx,h);c.stroke()}
 for(var z=Math.floor((W.panZ-halfZ)/step)*step;z<=W.panZ+halfZ;z+=step){var yy=h/2-(z-W.panZ)*k;c.beginPath();c.moveTo(0,yy);c.lineTo(w,yy);c.stroke()}
 var features=W.data.features||[];
 features.filter(function(f){return f.kind==="park"||f.kind==="building"}).forEach(function(f){
  if(!f.geometry||f.geometry.type!=="Polygon")return;
  var pts=f.geometry.coordinates[0].map(function(p){var a=local(p);return{x:a[0],z:a[1]}});
  trace(c,pts,w,h,k);c.fillStyle=satellite?(f.kind==="park"?"rgba(65,205,120,.11)":"rgba(85,126,177,.09)"):(f.kind==="park"?"#d7f2e5":"#d5dde9");c.strokeStyle=f.kind==="park"?"#9acdb0":"#afbfd3";c.lineWidth=.8;c.fill();c.stroke()
 });
 c.strokeStyle=satellite?"rgba(255,255,255,.45)":"#afbecf";c.lineWidth=satellite?1.8:3.3;
 features.filter(function(f){return f.kind==="road"&&f.geometry.type==="LineString"}).forEach(function(f){
   var pts=f.geometry.coordinates.map(function(p){var a=local(p);return{x:a[0],z:a[1]}});
   if(pts.length<2)return;c.beginPath();pts.forEach(function(p,i){var v=screen(p,w,h,k);if(!i)c.moveTo(v.x,v.y);else c.lineTo(v.x,v.y)});c.stroke();
 });
 var raw=rawPoints(),candidate=raw;
 trace(c,candidate,w,h,k);c.fillStyle=satellite?"rgba(47,140,219,.07)":"rgba(47,140,219,.15)";c.fill();c.lineWidth=3.8;c.strokeStyle=W.shape==="candidate"?"#256dce":"#1685ca";c.stroke();
 drawIssueSegments(c,w,h,k);
 if($("wbCompare").checked&&W.shape!=="raw"&&raw.length>0){
   c.save();c.setLineDash([6,4]);c.strokeStyle="#fb9c48";c.lineWidth=2;trace(c,raw,w,h,k);c.stroke();c.restore()
 }
 var hotspots=W.data.photo_hotspots||[];
 hotspots.forEach(function(p){var pt=p.id==="HS-FOUNTAIN"&&W.shape==="candidate"?{x:54,z:-1}:p.position;var v=screen({x:pt.x,z:pt.z},w,h,k);
  if(v.x<0||v.x>w||v.y<0||v.y>h)return;
  c.fillStyle="#f3a846";c.beginPath();c.arc(v.x,v.y,3.2,0,7);c.fill()
 });
 if(false&&$("wbAnchors").checked&&window.TrucGiangLake&&W.shape==="candidate"){
  var pts=TrucGiangLake.points();
  pts.forEach(function(p){
   var xy=screen(p,w,h,k);
   c.fillStyle=p.type==="notch"?"#ed6252":"#286aff";c.strokeStyle="#fff";c.lineWidth=1.3;
   c.beginPath();c.arc(xy.x,xy.y,p.type==="notch"?6:4,0,7);c.fill();c.stroke();
   c.font="bold 10px system-ui";c.fillStyle="#192c4e";c.fillText(p.id,xy.x+7,xy.y-5)
  })
 }
 var view=W.host.getCameraInfo();
 if(view){var v=screen(view.target,w,h,k),sz=14,dx=Math.sin(view.az)*sz,dz=Math.cos(view.az)*sz;
  c.strokeStyle="#286aff";c.lineWidth=2;c.beginPath();c.arc(v.x,v.y,7,0,Math.PI*2);c.stroke();
  c.beginPath();c.moveTo(v.x,v.y);c.lineTo(v.x+dx,v.y-dz);c.stroke()
 }
 if(window.TrucGiangAnnotations)TrucGiangAnnotations.draw(c,function(p){return screen(p,w,h,k)});
 c.fillStyle="#2c4469";c.font="bold 11px system-ui";c.fillText("N ↑",14,19);
 // 50-metre scalable ruler
 var ruler=satellite?0:50*k;
 c.strokeStyle=satellite?"transparent":"#1e3860";c.lineWidth=2;c.beginPath();c.moveTo(17,h-21);c.lineTo(17+ruler,h-21);c.moveTo(17,h-26);c.lineTo(17,h-16);c.moveTo(17+ruler,h-26);c.lineTo(17+ruler,h-16);c.stroke();
 if(!satellite){c.font="10px system-ui";c.fillText("50 m",19,h-29)}
 $("wbStatus").textContent="OSM SOURCE / NOT VERIFIED"+
 " · "+(W.mode==="floor"?"FLOOR PLAN":"SPLIT VIEW")+" · "+Math.round(1/k*100)+" cm/pixel (visual)";
}
function drawAxis(){
 if(!W.ready)return;var obj=setupCanvas(W.axisCanvas);if(!obj)return;
 var c=obj.ctx,w=obj.w,h=obj.h;
 c.clearRect(0,0,w,h);
 var s=W.host.getCameraInfo();
 if(!s||!s.camera)return;
 s.camera.updateMatrixWorld();
 var q=s.camera.quaternion.clone().invert();
 var a=[{v:new THREE.Vector3(1,0,0),name:"X",key:"east",color:"#ec7064"},
        {v:new THREE.Vector3(0,1,0),name:"Y",key:"top",color:"#2ea979"},
        {v:new THREE.Vector3(0,0,1),name:"Z",key:"north",color:"#3579ee"}];
 var cx=w/2,cy=h/2+1,ends=[];
 a.forEach(function(x){var v=x.v.applyQuaternion(q),px=cx+v.x*34,py=cy-v.y*34;
 c.strokeStyle=x.color;c.lineWidth=3;c.beginPath();c.moveTo(cx,cy);c.lineTo(px,py);c.stroke();
 c.fillStyle=x.color;c.beginPath();c.arc(px,py,12,0,7);c.fill();
 c.fillStyle="#fff";c.font="bold 12px system-ui";c.textAlign="center";c.textBaseline="middle";c.fillText(x.name,px,py);
 ends.push({x:px,y:py,key:x.key})
 });
 W.metrics=W.metrics||{};W.metrics.ends=ends;
}
function attachPlanInteraction(){
 var canvas=W.planCanvas,hit=$("wbGoogleHitarea");
 function down(e){e.stopPropagation();e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);W.mouse={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false}}
 function move(e){if(!W.mouse)return;e.stopPropagation();var dx=e.clientX-W.mouse.x,dy=e.clientY-W.mouse.y;
  if(Math.hypot(e.clientX-W.mouse.startX,e.clientY-W.mouse.startY)>6)W.mouse.moved=true;
  if(W.mouse.moved&&W.metrics&&W.metrics.plan){if(window.BoHoGoogleSatellite&&BoHoGoogleSatellite.isVisible())BoHoGoogleSatellite.panBy(dx,dy);
   else{W.panX-=dx/W.metrics.plan.scale;W.panZ+=dy/W.metrics.plan.scale}drawPlan()}
  W.mouse.x=e.clientX;W.mouse.y=e.clientY}
 function up(e){e.stopPropagation();if(!W.mouse)return;var moved=W.mouse.moved;W.mouse=null;if(moved)return;
  var r=canvas.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top,notePoint=screenToLocal(px,py);
  if(notePoint&&window.TrucGiangAnnotations&&TrucGiangAnnotations.handleTap(notePoint,function(p){return screen(p,W.metrics.plan.w,W.metrics.plan.h,W.metrics.plan.scale)}))return;
  if(W.metrics&&W.metrics.plan&&W.issues.length){var m=W.metrics.plan;
   var clicked=W.issues.find(function(issue){var pos=issuePoint(issue);if(!pos)return false;var pt=screen(pos,m.w,m.h,m.scale);return Math.hypot(pt.x-px,pt.y-py)<=19});
   if(clicked){location.href=reviewUrl(clicked);return}}
  var loc=screenToLocal(px,py);
  if(loc){W.host.focus(loc.x,loc.z);if(W.mode==="floor"&&!(window.BoHoGoogleSatellite&&BoHoGoogleSatellite.isVisible()))setMode("split");drawPlan()}}
 function wheel(e){e.preventDefault();e.stopPropagation();if(window.BoHoGoogleSatellite&&BoHoGoogleSatellite.isVisible())BoHoGoogleSatellite.zoom(e.deltaY>0?-.5:.5);else W.planZoom=Math.max(.55,Math.min(6,W.planZoom*Math.exp(-e.deltaY*.0014)));drawPlan()}
 [canvas,hit].filter(Boolean).forEach(function(target){
  target.addEventListener("pointerdown",down);target.addEventListener("pointermove",move);
  target.addEventListener("pointerup",up);target.addEventListener("pointercancel",function(e){e.stopPropagation();W.mouse=null});
  target.addEventListener("wheel",wheel,{passive:false})})
}
function update(){
 if(!W.ready)return;
 if(W.mode!=="3d"&&W.metrics&&W.metrics.plan)drawPlan();
 drawAxis();updatePins();
}
function init(data,host){
 W.data=data;W.host=host;
 if(!W.ready){build();W.ready=true;if(window.BoHoGoogleSatellite)BoHoGoogleSatellite.init({origin:data.origin,redraw:drawPlan,setFloor:function(){setMode("floor")}})}
 if(window.TrucGiangAnnotations)TrucGiangAnnotations.init({origin:data.origin,setMode:setMode,redraw:drawPlan,
   capturePlan:function(done){setMode("floor");requestAnimationFrame(function(){drawPlan();done(W.planCanvas)})}});
 setMode(W.mode);setShape(W.shape);setView("iso");loadIssues();
}
window.TrucGiangWorkbench={init:init,update:update,setMode:setMode,setShape:setShape,setView:setView,
 getInfo:function(){return {mode:W.mode,shape:W.shape,view:W.view,planReady:!!W.planCanvas,shoreIssues:W.issues.length,reviewLoaded:W.reviewLoaded,annotations:window.TrucGiangAnnotations?TrucGiangAnnotations.getInfo().count:0}},
 refresh:resize};
})();