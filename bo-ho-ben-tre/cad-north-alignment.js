/* Hồ Trúc Giang — provisional north-up alignment of the CAD ILLUSTRATION.
 * OSM Hai Ba Trung near lake trends about +9.6 degrees north of true east.
 * The drawing's upper road is treated as roughly horizontal; therefore this
 * -9.6° rotation is only a review candidate, NOT surveyed georeferencing.
 * No CAD vertices, OSM features or SQLite canonical geometries are touched.
 */
(function(root){
 "use strict";
 const key="bdx0:truc-giang:cad-north-v1";
 const BASE=-9.6;
 let offset=0;
 try{
  const stored=Number(root.localStorage.getItem(key));
  if(Number.isFinite(stored)&&stored>=-25&&stored<=25)offset=stored;
 }catch(e){}
 const listeners=[];
 function get(){return +(BASE+offset).toFixed(2);}
 function getOffset(){return +offset.toFixed(2);}
 function setOffset(val){
  const n=Number(val);
  if(!Number.isFinite(n)||n< -25||n>25)return false;
  offset=n;
  try{root.localStorage.setItem(key,String(n));}catch(e){}
  listeners.forEach(fn=>{try{fn(get(),getOffset())}catch(err){console.error(err)}});
  return true;
 }
 function onChange(fn){listeners.push(fn);return ()=>{const i=listeners.indexOf(fn);if(i>=0)listeners.splice(i,1);};}
 function bind(sliderId,readoutId,resetId){
  const slider=document.getElementById(sliderId),readout=document.getElementById(readoutId);
  function refresh(){
   if(slider)slider.value=String(getOffset());
   if(readout)readout.textContent="CAD "+get().toFixed(1)+"° · bù "+(getOffset()>=0?"+":"")+getOffset().toFixed(1)+"°";
  }
  if(slider)slider.addEventListener("input",e=>setOffset(e.target.value));
  const reset=document.getElementById(resetId);
  if(reset)reset.addEventListener("click",()=>setOffset(0));
  onChange(refresh);refresh();
 }
 root.TrucGiangCadNorth={baseDegrees:BASE,basis:"OSM Hai Ba Trung ~9.6° north of east; CAD road approx horizontal",status:"provisional_visual_alignment_not_surveyed",get,getOffset,setOffset,onChange,bind,storageKey:key};
})(window);
