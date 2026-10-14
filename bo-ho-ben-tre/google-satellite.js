/* Hồ Trúc Giang · optional native Google Maps satellite under Floor Plan.
 * Uses Maps JavaScript API and its projection. Never downloads tiles as
 * Three.js textures, caches Google imagery or modifies authoritative GIS.
 * No API key is shipped; user supplies referrer-restricted key at runtime.
 */
(function(){
"use strict";
var G={origin:null,base:null,dock:null,onDraw:null,setFloor:null,enabled:false,mode:"3d",
 key:"",map:null,overlay:null,projection:null,loading:false,scheduled:false,setup:null,getView:null};
try{G.key=sessionStorage.getItem("bdx0:google-maps-js-key")||""}catch(e){}
function $(id){return document.getElementById(id)}
function redraw(){
 if(G.scheduled)return;
 G.scheduled=true;requestAnimationFrame(function(){G.scheduled=false;if(G.onDraw)G.onDraw()})
}
function showMessage(message){
 var status=$("wbGoogleStatus");if(status)status.textContent=message;
}
function setButton(){
 var button=$("wbGoogleToggle");if(!button)return;
 button.classList.toggle("selected",G.enabled);
 button.setAttribute("aria-pressed",String(G.enabled));
 button.textContent=G.enabled?"🛰 Tắt vệ tinh":"🛰 Google Satellite";
}
function visible(){
 return G.enabled&&G.mode==="floor"&&!!G.projection&&!!G.map;
}
function updateSurface(){
 if(!G.dock)return;
 G.dock.classList.toggle("wb-google-active",G.enabled&&G.mode==="floor");
 setButton();redraw();
 if(visible())requestAnimationFrame(function(){redraw()});
}
function geo(local){
 var rad=G.origin.lat*Math.PI/180;
 return {lat:G.origin.lat+local.z/111320,lng:G.origin.lon+local.x/(111320*Math.cos(rad))};
}
function local(latlng){
 var rad=G.origin.lat*Math.PI/180;
 return {x:(latlng.lng()-G.origin.lon)*111320*Math.cos(rad),z:(latlng.lat()-G.origin.lat)*111320};
}
function project(pt){
 if(!visible())return null;
 try{var xy=G.projection.fromLatLngToContainerPixel(geo(pt));
 return xy&&Number.isFinite(xy.x)&&Number.isFinite(xy.y)?{x:xy.x,y:xy.y}:null}catch(e){return null}
}
function unproject(x,y){
 if(!visible())return null;
 try{var latlng=G.projection.fromContainerPixelToLatLng(new google.maps.Point(x,y));
 return latlng?local(latlng):null}catch(e){return null}
}
function scale(){
 if(!visible())return null;
 var a=project({x:0,z:0}),b=project({x:50,z:0});
 return a&&b?Math.hypot(b.x-a.x,b.y-a.y)/50:null
}
function zoom(delta){if(visible())G.map.setZoom(Math.min(22,Math.max(13,G.map.getZoom()+delta)))}
function panBy(dx,dy){if(visible())G.map.panBy(-dx,-dy)}
function openSetup(){
 if(!G.setup)return;
 G.setup.hidden=false;
 $("wbGoogleApiKey").value=G.key;
 $("wbGoogleApiKey").focus();
}
function closeSetup(){if(G.setup){G.setup.hidden=true;$("wbGoogleApiKey").value=""}}
function googleError(message){
 G.loading=false;G.enabled=false;G.projection=null;updateSurface();
 showMessage(message||"Google Maps không khả dụng. Đang dùng mặt bằng OSM.");
}
function loadAPI(key){
 if(window.google&&window.google.maps&&window.google.maps.Map)return Promise.resolve();
 if(G.scriptPromise)return G.scriptPromise;
 G.scriptPromise=new Promise(function(resolve,reject){
  var completed=false,timeout=setTimeout(function(){finish(Error("Hết thời gian tải Google Maps API"))},20000);
  function finish(error){if(completed)return;completed=true;clearTimeout(timeout);
   delete window.__boHoGoogleReady;
   if(error)reject(error);else resolve();
  }
  window.__boHoGoogleReady=function(){
   if(window.google&&window.google.maps&&window.google.maps.Map)finish();
   else finish(Error("Google Maps API chưa sẵn sàng"));
  };
  window.gm_authFailure=function(){finish(Error("API key bị Google từ chối: kiểm tra Billing, Maps JavaScript API và HTTP referrers"))};
  var script=document.createElement("script");
  script.src="https://maps.googleapis.com/maps/api/js?key="+encodeURIComponent(key)+"&v=weekly&loading=async&callback=__boHoGoogleReady";
  script.async=true;script.defer=true;script.referrerPolicy="strict-origin-when-cross-origin";
  script.onerror=function(){finish(Error("Không tải được thư viện Google Maps"))};
  document.head.appendChild(script);
 }).catch(function(e){G.scriptPromise=null;throw e});
 return G.scriptPromise;
}
function fitZoom(){
 var rect=$("wbPlanCanvas").getBoundingClientRect();
 var k=(G.getView&&G.getView().scale)||Math.min(rect.width/450,rect.height/390)||.5;
 return Math.min(21,Math.max(14,Math.log2(k*(2*Math.PI*6378137*Math.cos(G.origin.lat*Math.PI/180))/256)));
}
function makeMap(){
 var center=geo(G.lastPan||{x:0,z:0});
 G.map=new google.maps.Map(G.base,{
  center:center,zoom:fitZoom(),mapTypeId:"satellite",disableDefaultUI:true,
  gestureHandling:"none",keyboardShortcuts:false,clickableIcons:false,heading:0,tilt:0,
  isFractionalZoomEnabled:true,backgroundColor:"#e6ebef",minZoom:13,maxZoom:22
 });
 G.overlay=new google.maps.OverlayView();
 G.overlay.onAdd=function(){};
 G.overlay.draw=function(){
  G.projection=G.overlay.getProjection()||null;
  updateSurface()
 };
 G.overlay.onRemove=function(){G.projection=null;updateSurface()};
 G.overlay.setMap(G.map);
 G.map.addListener("center_changed",redraw);
 G.map.addListener("zoom_changed",redraw);
 G.map.addListener("idle",redraw);
}
function enable(){
 if(G.loading||G.enabled)return;
 if(!G.key){openSetup();return}
 if(window.BoHoOpenImagery&&BoHoOpenImagery.isPlanActive())BoHoOpenImagery.togglePlan();
 if(G.getView&&!G.map)G.lastPan=G.getView().pan;
 if(G.setFloor&&G.mode!=="floor")G.setFloor();
 G.loading=true;showMessage("Đang kết nối Google Maps Satellite…");
 loadAPI(G.key).then(function(){
  G.enabled=true;updateSurface();
  if(!G.map)makeMap();
  G.loading=false;updateSurface();
  showMessage("Google Satellite · lớp OSM chỉ tham chiếu, chưa khảo sát");
  redraw();
 }).catch(function(e){googleError(e.message)});
}
function disable(){
 G.enabled=false;updateSurface();
 showMessage("Mặt bằng kỹ thuật OSM · chưa kiểm chứng");
}
function toggle(){if(G.enabled)disable();else enable()}
function init(options){
 G.origin=options.origin;G.base=$("wbGoogleBase");G.dock=$("wbPlanDock");
 G.onDraw=options.redraw;G.setFloor=options.setFloor;G.getView=options.getView;G.lastPan={x:0,z:0};
 var button=$("wbGoogleToggle");
 if(button)button.addEventListener("click",function(e){e.stopPropagation();toggle()});
 var dialog=document.createElement("section");dialog.id="wbGoogleConfig";dialog.className="wb-google-config";
 dialog.hidden=true;dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");
 dialog.setAttribute("aria-label","Thiết lập Google Satellite");
 dialog.innerHTML='<form id="wbGoogleForm" class="wb-google-card">'+
  '<h2>🛰 Nền Google Satellite</h2>'+
  '<p>Google Maps dùng bản đồ chính thức bên dưới Floor Plan, căn theo GPS. Không chép ảnh vệ tinh vào mô hình 3D hay cơ sở dữ liệu.</p>'+
  '<label for="wbGoogleApiKey">Google Maps JavaScript API key</label>'+
  '<input id="wbGoogleApiKey" type="text" autocomplete="off" spellcheck="false" placeholder="AIza…" required maxlength="200">'+
  '<p class="wb-google-caution">Cần bật Maps JavaScript API và Billing trên Google Cloud. Hãy giới hạn key theo HTTP referrer của trang. Khóa chỉ được giữ trong sessionStorage của tab này, không ghi vào GitHub.</p>'+
  '<div class="wb-google-actions"><button type="button" id="wbGoogleCancel">Hủy</button>'+
  '<button type="submit" class="primary">Bật vệ tinh</button></div>'+
  '<p><a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/@10.23861,106.37814,19z/data=!3m1!1e3">Xem vệ tinh Google Maps trực tiếp ↗</a></p>'+
  '</form>';
 document.body.appendChild(dialog);G.setup=dialog;
 dialog.addEventListener("click",function(e){if(e.target===dialog)closeSetup()});
 $("wbGoogleCancel").addEventListener("click",closeSetup);
 $("wbGoogleForm").addEventListener("submit",function(e){
  e.preventDefault();
  var key=$("wbGoogleApiKey").value.trim();
  if(!/^[A-Za-z0-9_-]{15,200}$/.test(key)){showMessage("Google Maps API key không đúng định dạng.");return}
  G.key=key;try{sessionStorage.setItem("bdx0:google-maps-js-key",G.key)}catch(err){}
  closeSetup();enable();
 });
 document.addEventListener("keydown",function(e){if(e.key==="Escape"&&G.setup&&!G.setup.hidden)closeSetup()});
 setButton();showMessage("Mặt bằng kỹ thuật OSM · chưa kiểm chứng");
}
window.BoHoGoogleSatellite={
 init:init,toggle:toggle,project:project,unproject:unproject,scale:scale,zoom:zoom,panBy:panBy,
 isVisible:visible,
 setMode:function(mode){G.mode=mode;updateSurface()},
 snapshotPan:function(x,z){G.lastPan={x:x,z:z}},
 getInfo:function(){return {enabled:G.enabled,visible:visible(),hasKey:!!G.key,mapReady:!!G.map,projectionReady:!!G.projection}}
};
})();