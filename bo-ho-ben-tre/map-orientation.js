/* Hồ Trúc Giang / shared four-direction viewport orientation.
 * Display-only orientation. Source OSM WGS84, CAD vertices, SQLite, exports stay unchanged.
 * 0 = North up; 90 = East up; 180 = South up; 270 = West up.
 */
(function(root){
"use strict";
var KEY="bdx0:truc-giang:view-direction-v1";
var DIR={north:0,east:90,south:180,west:270};
var ORDER=["north","east","south","west"];
var LABEL={north:"Bắc",east:"Đông",south:"Nam",west:"Tây"};
function normalize(value){
 var v=String(value==null?"":value).trim().toLowerCase();
 if(Object.prototype.hasOwnProperty.call(DIR,v))return v;
 return ({n:"north",e:"east",s:"south",w:"west", "0":"north","90":"east","180":"south","270":"west"})[v]||null
}
var initial=null;
try{initial=normalize(new URLSearchParams(root.location.search).get("dir"))}catch(e){}
if(!initial){try{initial=normalize(root.localStorage.getItem(KEY))}catch(e){}}
var current=initial||"north",listeners=[];
function get(){return current}
function degree(){return DIR[current]}
function rotate(x,z,dir){var d=DIR[normalize(dir)||current]*Math.PI/180,c=Math.cos(d),s=Math.sin(d);return {x:c*x-s*z,z:s*x+c*z}}
function unrotate(x,z,dir){var d=DIR[normalize(dir)||current]*Math.PI/180,c=Math.cos(d),s=Math.sin(d);return {x:c*x+s*z,z:-s*x+c*z}}
function inform(){listeners.slice().forEach(function(fn){try{fn(current,degree())}catch(e){root.console.error("Direction listener",e)}})}
function set(value,opts){
 var next=normalize(value);
 if(!next)return false;
 var changed=next!==current;current=next;
 if(!opts||opts.persist!==false){try{root.localStorage.setItem(KEY,next)}catch(e){}}
 if(changed||opts&&opts.force)inform();
 return true
}
function onChange(fn){listeners.push(fn);return function(){listeners=listeners.filter(function(cb){return cb!==fn})}}
function bindControls(container){
 if(!container)return;
 container.querySelectorAll("[data-map-direction]").forEach(function(button){
  button.addEventListener("click",function(){set(button.dataset.mapDirection)})
 });
 onChange(function(dir){container.querySelectorAll("[data-map-direction]").forEach(function(b){
  var active=b.dataset.mapDirection===dir;b.classList.toggle("selected",active);
  b.setAttribute("aria-pressed",String(active))
 })});
 container.querySelectorAll("[data-map-direction]").forEach(function(b){
  var active=b.dataset.mapDirection===current;b.classList.toggle("selected",active);
  b.setAttribute("aria-pressed",String(active))
 });
}
root.addEventListener("storage",function(e){if(e.key===KEY){var v=normalize(e.newValue)||"north";set(v,{persist:false})}});
root.TrucGiangOrientation={get:get,set:set,degree:degree,rotate:rotate,unrotate:unrotate,
 bindControls:bindControls,onChange:onChange,label:function(){return LABEL[current]},
 list:ORDER.slice(),storageKey:KEY};
})(window);
