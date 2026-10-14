/* Open imagery georeferenced local background: self-hosted raster, no API key.
 * Source metadata/license must be in data/imagery/manifest.json.
 */
(function(){
"use strict";
var I={manifest:null,img:null,loaded:false,ready:false,plan:false,model:false,mesh:null,scene:null,origin:null,reason:"Đang đọc nguồn ảnh mở…",redraw:null,mode:"3d",credit:null};
var $=function(id){return document.getElementById(id)};
function local(lon,lat){var o=I.origin;return{x:(lon-o.lon)*111320*Math.cos(o.lat*Math.PI/180),z:(lat-o.lat)*111320}}
function updateCredit(){
 if(!I.credit)return;
 var active=I.ready&&(I.model&&I.mode!=="floor"||I.plan&&I.mode==="floor");
 I.credit.hidden=!active;
 if(!active)return;
 I.credit.textContent="";
 var label=document.createElement("span");
 label.textContent=I.manifest.attribution+" · "+(I.manifest.native_resolution_m||"?")+" m/pixel native · không dùng để xác minh bờ";
 I.credit.appendChild(label);
 var url=I.manifest.source_url;
 if(typeof url==="string"&&url.startsWith("https://")){
  var link=document.createElement("a");
  link.href=url;link.rel="noopener noreferrer";link.target="_blank";link.textContent="Nguồn ↗";I.credit.appendChild(link);
 }
}
function notify(){
 updateCredit();
 var status=$("wbOpenStatus");if(status)status.textContent=I.reason;
 ["wbOpenToggle","open3DToggle"].forEach(function(id){var e=$(id);if(!e)return;
  e.classList.toggle("selected",id==="wbOpenToggle"?I.plan:I.model);
  e.setAttribute("aria-pressed",String(id==="wbOpenToggle"?I.plan:I.model));
  e.setAttribute("aria-disabled",String(!I.ready));
  e.title=I.reason;
 });
 if(I.mesh)I.mesh.visible=I.ready&&I.model;
 if(I.redraw)I.redraw();
}
function fit(data){
 return !!(data&&data.status==="ready"&&typeof data.image==="string"&&/^[\w.-]+\.(?:png|jpe?g|webp)$/.test(data.image)&&
  Array.isArray(data.bbox)&&data.bbox.length===4&&data.bbox.every(Number.isFinite)&&data.bbox[0]<data.bbox[2]&&data.bbox[1]<data.bbox[3]&&
  typeof data.attribution==="string"&&data.attribution.trim());
}
function makeMesh(){
 if(!I.scene||!I.loaded||!I.ready||I.mesh||!window.THREE)return;
 var box=I.manifest.bbox,sw=local(box[0],box[1]),ne=local(box[2],box[3]);
 var geometry=new THREE.PlaneGeometry(ne.x-sw.x,ne.z-sw.z);
 var texture=new THREE.Texture(I.img);texture.needsUpdate=true;
 if(THREE.sRGBEncoding)texture.encoding=THREE.sRGBEncoding;
 texture.minFilter=THREE.LinearFilter;
 // +pi/2 maps image top to geographic North (+local z); double-sided material.
 var material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,depthWrite:true});
 I.mesh=new THREE.Mesh(geometry,material);
 I.mesh.name="OPEN_IMAGERY_GEOREFERENCED_UNDERLAY";
 I.mesh.rotation.x=Math.PI/2;
 I.mesh.position.set((sw.x+ne.x)/2,-.103,(sw.z+ne.z)/2);
 I.mesh.visible=I.model;
 I.mesh.renderOrder=0;
 I.scene.add(I.mesh);
}
function load(){
 fetch("data/imagery/manifest.json",{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(function(d){
 I.manifest=d;
 if(!fit(d)){I.reason=d.status==="unavailable"?"Chưa có ảnh mở phù hợp · "+(d.reason||"kiểm tra nguồn ảnh"):"Chưa có ảnh được tự host · cần chạy workflow Build Open Imagery";notify();return}
 I.reason="Đang tải ảnh "+(d.source||"mở")+"…";notify();
 var img=new Image();img.onload=function(){I.img=img;I.loaded=I.ready=true;
 I.reason=(d.source||"Open imagery")+" · "+(d.acquired||"không rõ ngày")+" · "+(d.native_resolution_m||"?")+" m/pixel thực · "+d.attribution;
 makeMesh();notify()};
 img.onerror=function(){I.reason="Lỗi tải ảnh đã xuất bản: "+d.image;notify()};
 img.src="data/imagery/"+d.image;
 }).catch(function(e){I.reason="Chưa thể đọc metadata ảnh mở: "+e.message;notify()})
}
function togglePlan(){if(!I.ready){notify();return false}I.plan=!I.plan;
 if(I.plan&&window.BoHoGoogleSatellite&&BoHoGoogleSatellite.isVisible())BoHoGoogleSatellite.toggle();
 notify();return I.plan}
function toggle3D(){if(!I.ready){notify();return false}I.model=!I.model;makeMesh();notify();return I.model}
function drawPlan(ctx,screen){
 if(!I.ready||!I.plan||!I.img||!I.origin)return false;
 var b=I.manifest.bbox,a=local(b[0],b[3]),z=local(b[2],b[1]);
 var p=screen(a),q=screen(z),w=q.x-p.x,h=q.y-p.y;
 if(w>0&&h>0){ctx.drawImage(I.img,p.x,p.y,w,h);return true}return false
}
function init(origin,redraw){I.origin=origin;I.redraw=redraw;
 if(!I.credit){I.credit=document.createElement("div");I.credit.id="openImageryCredit";I.credit.hidden=true;I.credit.setAttribute("role","note");
 var stage=$("stage");if(stage)stage.appendChild(I.credit)}
 var plan=$("wbOpenToggle"),model=$("open3DToggle");
 if(plan)plan.addEventListener("click",function(e){e.stopPropagation();togglePlan()});
 if(model)model.addEventListener("click",function(e){e.stopPropagation();toggle3D()});
 notify();load()
}
window.BoHoOpenImagery={init:init,setScene:function(scene){if(I.scene!==scene){if(I.mesh&&I.scene)I.scene.remove(I.mesh);I.mesh=null}I.scene=scene;makeMesh();notify()},
 setMode:function(mode){I.mode=mode;notify()},togglePlan:togglePlan,toggle3D:toggle3D,
 isPlanActive:function(){return I.ready&&I.plan},
 isModelActive:function(){return I.ready&&I.model},drawPlan:drawPlan,
 status:function(){return {ready:I.ready,plan:I.plan,model:I.model,source:I.manifest&&I.manifest.source,reason:I.reason}}};
})();