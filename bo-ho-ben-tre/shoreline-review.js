/* Hồ Trúc Giang shoreline review workbench.
   Visual target indices are parts of existing OSM way 217484891 only.
   A signed slider gives an illustrative BEFORE/AFTER preview, never applied
   to SQLite, scene.json or GIS. Reviews are local and exportable on demand. */
(function(){
"use strict";
const KEY="bdx0:truc-giang:shoreline-review-v1",EARTH=111320;
let audit=null,ring=[],origin=null,items=[],byId={},selected="north_notch",onDraw=()=>{},onOpen=()=>{};
let reviews={};
try{const s=JSON.parse(localStorage.getItem(KEY)||"{}");if(s&&typeof s==="object"&&!Array.isArray(s))reviews=s}catch(e){}
const el=(tag,text,cls)=>{let n=document.createElement(tag);if(text!==undefined&&text!==null)n.textContent=String(text);if(cls)n.className=cls;return n};
const $=id=>document.getElementById(id);
function coords(p){return{x:(p[0]-origin.lon)*EARTH*Math.cos(origin.lat*Math.PI/180),z:(p[1]-origin.lat)*EARTH}}
function normal(i){
 let n=ring.length,a=ring[(i-1+n)%n],b=ring[(i+1)%n],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;
 let left={x:-dz/l,z:dx/l};
 return {x:left.x*orientation,z:left.z*orientation}
}
let orientation=1;
function init(modelData,draw,open){
 audit=modelData.lake_audit;origin=modelData.origin;onDraw=draw;onOpen=open;
 const water=modelData.nodes.find(n=>n.id==="osm-way-217484891");
 if(!water||!water.geometry||water.geometry.type!=="Polygon")return;
 const pts=water.geometry.coordinates[0];ring=pts.slice(0,-1).map(coords);
 let area2=ring.reduce((sum,p,i)=>{const q=ring[(i+1)%ring.length];return sum+(p.x*q.z-q.x*p.z)},0);
 orientation=area2>=0?1:-1;
 items=audit.unresolved.map((item,ind)=>{
  const indices=(item.ring_indices||[]).filter(i=>Number.isInteger(i)&&i>=0&&i<ring.length);
  let centroid=indices.reduce((sum,i)=>({x:sum.x+ring[i].x/indices.length,z:sum.z+ring[i].z/indices.length}),{x:0,z:0});
  return Object.assign({number:ind+1,ring_indices:indices,center:centroid},item);
 });
 byId=Object.fromEntries(items.map(t=>[t.id,t]));
 const incoming=new URLSearchParams(location.search).get("sector");
 selected=byId[incoming]?incoming:(items[0]?.id||null);
 addStyles();buildToolbar();
}
function safeReview(id){
 let r=reviews[id]||{};
 return {delta:Number.isFinite(r.delta)?Math.max(-25,Math.min(25,r.delta)):0,
  decision:["needs_change","looks_ok","unknown"].includes(r.decision)?r.decision:"unknown",
  note:typeof r.note==="string"?r.note.slice(0,800):"",
  reviewed_at:r.reviewed_at||null}
}
function changeIssue(id,open){
 if(!byId[id])return;
 selected=id;updateToolbar();onDraw();
 if(open)onOpen();
 let panel=$("shoreReviewEditor");
 if(panel&&panel.isConnected)renderEditor(panel)
}
function buildToolbar(){
 const host=document.querySelector(".map-region");
 if(!host)return;
 const bar=el("div",undefined,"shore-review-toolbar");bar.id="shoreReviewBar";
 const left=el("div",undefined,"shore-review-header");
 left.append(el("strong","KIỂM TRA ĐƯỜNG BỜ"));
 left.append(el("small","Chọn vùng ①–④ trên bản đồ"));
 bar.append(left);
 const steps=el("div",undefined,"shore-review-steps");
 items.forEach(issue=>{
  const b=el("button",String(issue.number));b.type="button";b.dataset.shore=issue.id;
  b.title=issue.title;b.setAttribute("aria-label","Kiểm tra vùng "+issue.number+" "+issue.title);
  b.onclick=()=>changeIssue(issue.id,false);steps.append(b)
 });
 bar.append(steps);
 const more=el("button","Duyệt sửa ↗","shore-review-open");more.type="button";
 more.onclick=()=>onOpen();bar.append(more);
 host.insertBefore(bar,$("map"));
 updateToolbar()
}
function updateToolbar(){
 const bar=$("shoreReviewBar");if(!bar)return;
 bar.querySelectorAll("[data-shore]").forEach(b=>{
  let is=b.dataset.shore===selected;
  b.classList.toggle("selected",is);b.setAttribute("aria-pressed",String(is));
  let saved=safeReview(b.dataset.shore);
  b.dataset.reviewed=saved.reviewed_at?"yes":"no"
 });
 const current=byId[selected];
 let header=bar.querySelector(".shore-review-header small");
 if(header&&current)header.textContent=current.number+". "+current.title+" · vị trí OSM cần kiểm tra";
}
function previewFor(issue,delta){
 if(!issue||!issue.ring_indices?.length)return [];
 const ix=issue.ring_indices,N=ix.length;
 return ix.map((i,j)=>{
  let taper=Math.sin(Math.PI*j/(N-1)); // zero at endpoints
  let n=normal(i);
  return{x:ring[i].x+n.x*delta*taper,z:ring[i].z+n.z*delta*taper}
 })
}
function mid(issue){
 let ix=issue.ring_indices,j=Math.floor(ix.length/2);
 return ring[ix[j]]
}
function draw(ctx,project,pxPerM){
 if(!ring.length||!items.length)return;
 ctx.save();ctx.lineCap="round";ctx.lineJoin="round";
 for(let issue of items){
  let active=issue.id===selected,pts=issue.ring_indices;
  if(pts.length<2)continue;
  ctx.beginPath();
  pts.forEach((i,j)=>{let p=projectLocal(ring[i],project);if(j)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y)});
  ctx.strokeStyle=active?"#f97316":"rgba(219,132,41,.70)";ctx.lineWidth=active?6:3.5;ctx.stroke();
  // Provisional signed delta, anchored at original first and last points.
  let delta=safeReview(issue.id).delta;
  if(delta!==0){
   let shifted=previewFor(issue,delta);
   ctx.beginPath();shifted.forEach((p,j)=>{let v=projectLocal(p,project);if(j)ctx.lineTo(v.x,v.y);else ctx.moveTo(v.x,v.y)});
   ctx.setLineDash([6,4]);ctx.strokeStyle=active?"#2563eb":"#81a7ee";ctx.lineWidth=active?3.5:2;ctx.stroke();ctx.setLineDash([]);
   if(active){
    let j=Math.floor(shifted.length/2),src=projectLocal(ring[pts[j]],project),end=projectLocal(shifted[j],project);
    ctx.strokeStyle="#1d5edb";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(src.x,src.y);ctx.lineTo(end.x,end.y);ctx.stroke();
   }
  }
 }
 for(let issue of items){
  let pts=issue.ring_indices,p=ring[pts[Math.floor(pts.length/2)]],v=projectLocal(p,project);
  // Badge itself sits just off the water-edge toward outside.
  let n=normal(pts[Math.floor(pts.length/2)]);
  // Keep numbered review badge on the same geographic side of the shoreline
  // after rotating the entire WGS84 Model View to E / S / W.
  let screenN=window.TrucGiangOrientation?TrucGiangOrientation.rotate(n.x,n.z):n;
  let b={x:v.x-screenN.x*12,y:v.y+screenN.z*12};
  let active=issue.id===selected;
  ctx.beginPath();ctx.arc(b.x,b.y,active?14:11,0,Math.PI*2);
  ctx.fillStyle=active?"#f97316":"#fff";ctx.fill();
  ctx.lineWidth=active?2.4:1.6;ctx.strokeStyle="#e18e32";ctx.stroke();
  ctx.fillStyle=active?"#fff":"#a45510";ctx.font="800 12px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(issue.number,b.x,b.y);
 }
 ctx.restore()
}
function projectLocal(p,project){return project([origin.lon+p.x/(EARTH*Math.cos(origin.lat*Math.PI/180)),origin.lat+p.z/EARTH])}
function hitTest(local,pxPerM){
 if(!items.length||!pxPerM)return null;
 let best=null,dist=Infinity;
 for(let issue of items){
  let arr=issue.ring_indices;
  let p=ring[arr[Math.floor(arr.length/2)]],n=normal(arr[Math.floor(arr.length/2)]);
  let px=p.x-n.x*12/pxPerM,pz=p.z-n.z*12/pxPerM;
  let d=Math.hypot(local.x-px,local.z-pz)*pxPerM;
  if(d<dist){dist=d;best=issue.id}
 }
 if(dist<=19)return best;
 let segmentMin=13;
 best=null;
 for(let issue of items){
  let arr=issue.ring_indices;
  for(let j=1;j<arr.length;j++){
   const a=ring[arr[j-1]],b=ring[arr[j]],dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz;
   let t=l?Math.max(0,Math.min(1,((local.x-a.x)*dx+(local.z-a.z)*dz)/l)):0;
   let d=Math.hypot(local.x-a.x-dx*t,local.z-a.z-dz*t)*pxPerM;
   if(d<segmentMin){segmentMin=d;best=issue.id}
  }
 }
 return best
}
function renderEditor(host){
 if(!host)return;
 host.textContent="";
 let issue=byId[selected];if(!issue)return;
 let r=safeReview(issue.id);
 host.append(el("div","ĐOẠN "+issue.number+" · "+issue.title.toUpperCase(),"eyebrow"));
 let explain=el("p",issue.question,"description");explain.style.fontWeight="700";host.append(explain);
 host.append(el("p","Nếu cần sửa: "+issue.possible_edit,"note"));
 host.append(el("p","Phần tô CAM là đường OSM hiện tại. Đường XANH nét đứt chỉ xuất hiện khi bạn dịch thử ranh. Đây là minh họa, chưa phải đề xuất hình học có tọa độ chính xác.","note"));
 const form=el("div",undefined,"shore-review-form");
 let decision=el("label",undefined,"shore-review-field");decision.append(el("span","Bạn nhận xét đoạn này thế nào?"));
 let sel=el("select");sel.id="shoreReviewDecision";
 [["unknown","Chưa rõ / cần kiểm tra"],["needs_change","Cần sửa đường bờ"],["looks_ok","Đường OSM có vẻ đúng"]].forEach(([v,label])=>{
  let op=el("option",label);op.value=v;sel.append(op)});
 sel.value=r.decision;decision.append(sel);form.append(decision);
 let offset=el("label",undefined,"shore-review-field");offset.append(el("span","Xem thử nếu mép nước dịch vào hoặc ra"));
 let range=el("input");range.type="range";range.min="-25";range.max="25";range.step="1";
 range.id="shoreReviewDelta";range.value=r.delta;
 let deltaLabel=el("output",undefined,"shore-review-delta");deltaLabel.id="shoreReviewDeltaLabel";offset.append(range,deltaLabel);
 let hint=el("small","Âm: nước rộng hơn · Dương: nước hẹp lại. Chỉ xem thử độ dịch, chưa đổi góc bờ/độ cong.");offset.append(hint);form.append(offset);
 const notes=el("label",undefined,"shore-review-field");notes.append(el("span","Bạn thấy thực tế khác thế nào?"));
 const text=el("textarea");text.id="shoreReviewNote";text.rows=3;text.maxLength=800;
 text.placeholder="Ví dụ: ở giữa bờ bắc, đất còn nhô sâu xuống hồ; sau đó bờ cong ngược về phía đông…";
 text.value=r.note;notes.append(text);form.append(notes);
 const actions=el("div",undefined,"shore-review-actions");
 const save=el("button","Lưu nhận xét trên máy","primary");
 save.id="shoreSaveReview";const exp=el("button","⇩ Xuất bản đánh giá");
 exp.id="shoreExportReviews";actions.append(save,exp);form.append(actions);
 const status=el("p","Chưa xác minh GPS. Đây là đánh giá trực quan của người dùng.","note");
 status.id="shoreReviewStatus";form.append(status);
 host.append(form);
 function sync(){
  let delta=Number(range.value);
  let v=delta===0?"0 m · như OSM":delta>0?"+"+delta+" m · thu hẹp mặt nước":delta+" m · mở rộng mặt nước";
  deltaLabel.textContent=v;
  reviews[issue.id]=Object.assign({},reviews[issue.id],{delta,decision:sel.value,note:text.value});
  onDraw()
 }
 range.oninput=sync;sel.onchange=sync;text.oninput=()=>{reviews[issue.id]=Object.assign({},reviews[issue.id],{delta:Number(range.value),decision:sel.value,note:text.value})};
 sync();
 save.onclick=()=>{
  sync();reviews[issue.id].reviewed_at=new Date().toISOString();
  reviews[issue.id].verification_status="visual_review_only_not_georeferenced";
  try{localStorage.setItem(KEY,JSON.stringify(reviews));status.textContent="Đã lưu nhận xét tại trình duyệt này. Chưa cập nhật dữ liệu SQLite/OSM."}
  catch(e){status.textContent="Không lưu được: "+e.message}
  updateToolbar()
 };
 exp.onclick=exportReviews;
}
function exportReviews(){
 const rows=items.map(issue=>Object.assign({
  sector_id:issue.id,number:issue.number,title:issue.title,reference_ring_indices:issue.ring_indices,
  reference_osm_way:217484891},safeReview(issue.id)))
 .filter(r=>r.reviewed_at||r.delta!==0||r.decision!=="unknown"||r.note);
 if(!rows.length){alert("Chưa có nhận xét để xuất.");return}
 const payload={schema:"truc-giang-shore-review-v1",source:"OSM way 217484891",
  status:"USER_VISUAL_REVIEW_NOT_SURVEYED",crs:"Local meter preview is not surveyed geometry",
  warning:"DO NOT automatically apply preview offsets to GIS/SQLite; require independent points and verification.",
  created_at:new Date().toISOString(),reviews:rows};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));
 const a=el("a");a.href=url;a.download="truc-giang-shore-review-"+new Date().toISOString().slice(0,10)+".json";
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500)
}
function addStyles(){
 if($("shoreReviewCss"))return;
 const style=el("style");style.id="shoreReviewCss";style.textContent=[
 ".shore-review-toolbar{flex:0 0 auto;min-height:53px;display:flex;gap:9px;align-items:center;background:#fff8ed;border-bottom:1px solid #f0dcc5;padding:8px 11px;z-index:2;min-width:0}",
 ".shore-review-header{flex:1;min-width:0}.shore-review-header strong{display:block;font-size:10px;color:#8d501b;letter-spacing:.08em;font-weight:900}",
 ".shore-review-header small{font-size:10px;color:#966b44;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}",
 ".shore-review-steps{display:flex;gap:5px;flex-shrink:0}",
 ".shore-review-steps button{width:30px;height:30px;display:grid;place-items:center;border-radius:50%;font-size:12px;font-weight:900;border:1px solid #e5b985;background:#fff;color:#a4662a;padding:0}",
 ".shore-review-steps button.selected{background:#f97316;border-color:#eb6f16;color:#fff;box-shadow:0 0 0 3px #f9731626}",
 ".shore-review-steps button[data-reviewed=yes]::after{content:'•';position:absolute;transform:translate(12px,-11px);color:#2466c2;font-size:17px}",
 ".shore-review-steps button{position:relative}",
 ".shore-review-open{background:#fff;border:1px solid #efc69c;border-radius:8px;padding:8px 9px;min-height:34px;white-space:nowrap;color:#975518;font-size:10px;font-weight:850}",
 ".shore-review-focus{border:1px solid #f2d4ab;background:#fffaf5;border-radius:9px;margin:10px 0;padding:11px}",
 ".shore-review-focus .eyebrow{color:#a3652b}.shore-review-form{display:grid;gap:11px}",
 ".shore-review-field{display:grid;gap:5px;font-size:11px;color:#657e9d;font-weight:800}",
 ".shore-review-field select,.shore-review-field textarea{color:#213b62;background:#fff;border:1px solid #d1dfef;border-radius:8px;padding:10px;width:100%;max-width:100%;font:12px system-ui}",
 ".shore-review-field input[type=range]{accent-color:#f97316;width:100%}",
 ".shore-review-field small{font-weight:450;color:#8091a8;font-size:10px}",
 ".shore-review-delta{font-size:11px;font-weight:850;color:#245bc1}",
 ".shore-review-actions{display:flex;flex-wrap:wrap;gap:7px}",
 ".shore-review-actions button{flex:1;min-width:125px;border-radius:8px;background:#e9f1ff;border:1px solid #cadcf7;color:#2861b9;padding:9px;font-weight:800;font-size:10px}",
 ".shore-review-actions button.primary{background:#286aff;color:#fff;border-color:#286aff}",
 ".shore-review-issue-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin-top:10px}",
 ".shore-review-issue-buttons button{border:1px solid #e7ddcf;background:#fff;border-radius:8px;text-align:left;padding:9px;font-size:10px;color:#775938}",
 ".shore-review-issue-buttons button.selected{border-color:#e99746;background:#fff0db;color:#a65c13;font-weight:850}",
 ".shore-review-toolbar[hidden]{display:none!important}",
 "@media(max-width:760px){.shore-review-toolbar{padding:5px 6px;min-height:43px;gap:4px}.shore-review-header{display:none}.shore-review-steps{gap:4px;flex:1}.shore-review-steps button{width:31px;height:31px}.shore-review-open{padding:6px 8px;min-height:31px;font-size:10px}.details.review-open{height:min(53dvh,495px)}}"
 ].join("\n");document.head.append(style);
}
function issueList(host,draw){
 let nav=el("div",undefined,"shore-review-issue-buttons");nav.id="shoreIssueList";
 items.forEach(i=>{let b=el("button",i.number+" · "+i.title);b.classList.toggle("selected",i.id===selected);
 b.type="button";b.onclick=()=>{changeIssue(i.id,false);issueListRefresh();draw()};
 b.dataset.issue=i.id;nav.append(b)});
 host.append(nav)
}
function issueListRefresh(){document.querySelectorAll("[data-issue]").forEach(b=>b.classList.toggle("selected",b.dataset.issue===selected))}
function mount(host,draw){
 const section=el("section",undefined,"shore-review-focus");section.id="shoreReviewSection";
 section.append(el("div","TRÊN BẢN ĐỒ · 4 VÙNG CẦN DUYỆT","eyebrow"));
 section.append(el("p","Các số ①–④ nằm đúng trên từng đoạn đường bao OSM cần bạn kiểm tra. Màu cam = hiện trạng OSM; màu xanh nét đứt = phương án dịch thử bằng thanh kéo. Không có nét sửa tự động.","note"));
 issueList(section,draw);
 let editor=el("div");editor.id="shoreReviewEditor";section.append(editor);host.append(section);
 renderEditor(editor)
}
function toolbarVisible(v){let bar=$("shoreReviewBar");if(bar)bar.hidden=!v}
function state(){return{selected,items:items.map(x=>({id:x.id,number:x.number,ring_indices:x.ring_indices.slice()})),
  review:safeReview(selected),source:"OSM way 217484891",applied_to_database:false}}
window.TrucGiangReview={init,draw,hitTest,changeIssue,mount,toolbarVisible,state};
})();