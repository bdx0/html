/* Trúc Giang — landmark-preserving SHAPE PROPOSAL.
 * Provisional manual shape from the user's descriptions:
 * north bank land promontory, diagonal southern bank, eastern convex arc.
 * This is NOT Google Maps extracted geometry, NOT surveyed GPS, NOT authoritative OSM.
 * Coordinates are local east(X) / north(Z) metres around existing OSM origin.
 * Raw OSM way 217484891 remains unchanged in SQLite/scene.json and can be restored.
 */
(function(){
"use strict";
var anchors=[
 [-93,35],[-88,44],[-80,50],[-65,53],[-45,52],[-27,49],[-12,46],
 [-2,42],[4,36],[10,30],[16,31],[22,36],[30,43],[42,47],
 [57,50],[73,48],[87,41],[95,32],[100,20],[102,4],
 [101,-13],[98,-29],[93,-41],[85,-51],[75,-55],
 [62,-54],[46,-49],[30,-46],[11,-41],[-12,-35],
 [-31,-31],[-49,-25],[-67,-20],[-80,-12],[-90,-1],
 [-96,12],[-97,24]
];
var named=[
 {id:"B01",index:2,label:"Vai tây-bắc",type:"north"},
 {id:"B02",index:5,label:"Vai bắc — phía tây",type:"north"},
 {id:"B03",index:9,label:"Mũi đất phía bắc / mặt nước lõm",type:"notch"},
 {id:"B04",index:12,label:"Vai bắc — phía đông",type:"north"},
 {id:"B05",index:16,label:"Cung đông-bắc",type:"east"},
 {id:"B06",index:19,label:"Cung bờ đông",type:"east"},
 {id:"B07",index:21,label:"Cung đông-nam",type:"east"},
 {id:"B08",index:24,label:"Góc bo đông-nam",type:"south"},
 {id:"B09",index:27,label:"Khúc ngoặt bờ nam-đông",type:"south"},
 {id:"B10",index:30,label:"Bờ nam chạy chéo",type:"south"},
 {id:"B11",index:33,label:"Tây-nam không đối xứng",type:"west"},
 {id:"B12",index:35,label:"Bờ tây gồ không đều",type:"west"}
];
function clone(points){return points.map(function(p){return{x:p[0],z:p[1]}})}
var proposal=clone(anchors);
function area(r){var a=0;for(var i=0;i<r.length;i++){var p=r[i],q=r[(i+1)%r.length];a+=p.x*q.z-q.x*p.z}return Math.abs(a*.5)}
function bounds(r){return r.reduce(function(b,p){b.minX=Math.min(b.minX,p.x);b.maxX=Math.max(b.maxX,p.x);b.minZ=Math.min(b.minZ,p.z);b.maxZ=Math.max(b.maxZ,p.z);return b},{minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity})}
function ring(source,mode){if(mode==="raw")return source.map(function(p){return{x:p.x,z:p.z}});var dense=[];for(var i=0;i<proposal.length;i++){var p=proposal[i],q=proposal[(i+1)%proposal.length];for(var t=0;t<6;t++){var u=t/6;dense.push({x:p.x+(q.x-p.x)*u,z:p.z+(q.z-p.z)*u})}}return dense}
function points(){return named.map(function(p){return {id:p.id,label:p.label,type:p.type,index:p.index,x:proposal[p.index].x,z:proposal[p.index].z}})}
window.TrucGiangLake={
 proposal:ring,
 points:points,
 area:area,
 bounds:bounds,
 meta:{
   id:"TRUC_GIANG_SHAPE_CANDIDATE_V1",
   basis:"verbal shoreline characteristics + OSM local size",
   confidence:"illustrative_unverified",
   license:"original schematic work; not map tile/vector extraction",
   notSurveyed:true,
   northPromontory:true,
   southernDiagonal:true,
   easternConvexArc:true
 }
};
})();