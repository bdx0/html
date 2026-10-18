/* Preview-only CAD-to-north alignment. OSM/SQLite/physical surveys are not modified.
 * Two named east-west road axes (Hai Ba Trung, Le Quy Don) suggest about -11.3°
 * of image rotation relative to OSM true-north display. Approximation, not a surveyed azimuth.
 * Geometry is transformed in local metres before converting back to image pixels;
 * anisotropic CAD pixel scales otherwise bias the apparent heading.
 */
(function(root){
"use strict";
const KEY="bdx0:truc-giang:cad-north-preview-deg-v1";
const DEFAULT_DEG=-11.3;
const ANCHOR_X=795,ANCHOR_Y=542;
const METRES_PER_PIXEL_X=200/968,METRES_PER_PIXEL_NORTH=107/574;
function normalize(value){
 const v=Number(value);
 return Number.isFinite(v)&&v>=-45&&v<=45?Math.round(v*10)/10:DEFAULT_DEG;
}
function point(p,deg){
 const a=normalize(deg)*Math.PI/180,co=Math.cos(a),si=Math.sin(a);
 const east=(p[0]-ANCHOR_X)*METRES_PER_PIXEL_X;
 const north=(ANCHOR_Y-p[1])*METRES_PER_PIXEL_NORTH;
 const E=co*east+si*north,N=-si*east+co*north;
 return [ANCHOR_X+E/METRES_PER_PIXEL_X,ANCHOR_Y-N/METRES_PER_PIXEL_NORTH];
}
function inverse(p,deg){return point(p,-normalize(deg))}
function svgMatrix(deg){
 const a=normalize(deg)*Math.PI/180,co=Math.cos(a),si=Math.sin(a);
 const aa=co,bb=(METRES_PER_PIXEL_X/METRES_PER_PIXEL_NORTH)*si;
 const cc=-(METRES_PER_PIXEL_NORTH/METRES_PER_PIXEL_X)*si,dd=co;
 const ee=ANCHOR_X-aa*ANCHOR_X-cc*ANCHOR_Y;
 const ff=ANCHOR_Y-bb*ANCHOR_X-dd*ANCHOR_Y;
 return "matrix("+[aa,bb,cc,dd,ee,ff].map(v=>Number(v.toFixed(10))).join(" ")+")";
}
function get(){
 try{const s=root.localStorage.getItem(KEY);if(s!==null&&s.trim()!=="")return normalize(s)}catch(_){}
 return DEFAULT_DEG;
}
function save(deg){const v=normalize(deg);try{root.localStorage.setItem(KEY,String(v))}catch(_){}return v}
function localMetres(p,deg){const q=point(p,deg);return [(q[0]-ANCHOR_X)*METRES_PER_PIXEL_X,(ANCHOR_Y-q[1])*METRES_PER_PIXEL_NORTH]}
root.TrucGiangCadGeoref={get,save,normalize,point,inverse,svgMatrix,localMetres,DEFAULT_DEG,KEY};
})(window);
