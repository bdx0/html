/* Local-only, human-reviewed shoreline GPS controls. No derived Google geometry. */
(function(){
"use strict";
const KEY="bdx0:ho-truc-giang:shoreline-controls-v1";
let records=[];
try{let v=JSON.parse(localStorage.getItem(KEY)||"[]");if(Array.isArray(v))records=v.filter(v=>v&&typeof v.lat==="number"&&typeof v.lon==="number")}catch(e){}
const e=(tag,text,cls)=>{let x=document.createElement(tag);if(text!=null)x.textContent=text;if(cls)x.className=cls;return x};
function persist(){try{localStorage.setItem(KEY,JSON.stringify(records))}catch(err){alert("Không lưu được trên thiết bị: "+err.message)}}
function attach(container,draw){
 const sec=e("section",null,"sec shore-controls");sec.append(e("h3","MỐC KIỂM CHỨNG BỜ HỒ"));
 sec.append(e("p","Nhập tọa độ GPS hoặc GIS độc lập, không lấy tọa độ từ ảnh Google. Điểm mới lưu trên máy và chưa được xác minh.","note"));
 const actions=e("div",null,"shore-actions"),start=e("button","＋ Nhập mốc tọa độ"),exp=e("button","⇩ Xuất mốc JSON");
 start.type=exp.type="button";actions.append(start,exp);sec.append(actions);
 const results=e("div");sec.append(results);
 const form=e("form",null,"shore-form");form.hidden=true;form.innerHTML=
 '<label>Vĩ độ WGS84 (lat)<input name="lat" type="number" step="any" required placeholder="10.238…" inputmode="decimal"></label>'+
 '<label>Kinh độ WGS84 (lon)<input name="lon" type="number" step="any" required placeholder="106.378…" inputmode="decimal"></label>'+
 '<label>Nguồn tọa độ<select name="source"><option value="gps_device">GPS / đo thực địa</option><option value="licensed_gis">GIS độc lập có giấy phép</option><option value="other">Nguồn khác (ghi chú)</option></select></label>'+
 '<label>Sai số ước tính (m)<input name="accuracy" type="number" step="any" min="0.01" max="100" required value="5"></label>'+
 '<label>Ngày đo<input name="date" type="date" required></label>'+
 '<label>Đoạn bờ<select name="bank"><option value="north">Bắc · mũi đất</option><option value="south">Nam · bờ chéo</option><option value="east">Đông · cung cong</option><option value="west">Tây</option></select></label>'+
 '<label>Ghi chú / tên nguồn / tài liệu xác minh<textarea name="notes" maxlength="700" required placeholder="Nguồn tọa độ, cách đo và chỗ lồi/lõm cần sửa…"></textarea></label>'+
 '<p class="note">Nhập tay · CHƯA XÁC MINH · không tự cập nhật polygon hoặc SQLite công khai.</p>'+
 '<div class="shore-actions"><button type="submit">Lưu trên máy</button><button class="cancel" type="button">Hủy</button></div>';
 sec.append(form);form.elements.date.value=new Date().toISOString().slice(0,10);
 start.onclick=()=>{form.hidden=!form.hidden;if(!form.hidden)form.elements.lat.focus()};
 form.querySelector(".cancel").onclick=()=>form.hidden=true;
 function render(){
  results.textContent="";results.append(e("p",records.length+" điểm tọa độ tự nhập · chưa xác minh","note"));
  records.forEach((p,i)=>{let item=e("div",null,"shore-record");item.append(e("strong",(i+1)+". "+p.bank+" · "+p.lat.toFixed(6)+", "+p.lon.toFixed(6)));
    item.append(e("small","Nguồn "+p.source+" · sai số khai báo "+p.accuracy+"m · "+p.date));
    let rm=e("button","Xóa");rm.type="button";rm.onclick=()=>{if(!confirm("Xóa điểm này khỏi thiết bị?"))return;records.splice(i,1);persist();render();draw()};
    item.append(rm);results.append(item)});
 }
 form.onsubmit=ev=>{
  ev.preventDefault();let v=new FormData(form),lat=Number(v.get("lat")),lon=Number(v.get("lon")),accuracy=Number(v.get("accuracy")),notes=String(v.get("notes")||"").trim();
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<10.233||lat>10.244||lon<106.373||lon>106.384){alert("Điểm nằm ngoài vùng kiểm chứng Hồ Trúc Giang");return}
  if(!Number.isFinite(accuracy)||accuracy<=0||accuracy>100||!notes){alert("Cần sai số và ghi chú nguồn đo");return}
  records.push({id:"CTRL-"+Date.now().toString(36)+Math.random().toString(36).slice(2,8),lat,lon,accuracy,
    source:String(v.get("source")),bank:String(v.get("bank")),date:String(v.get("date")),notes,entered_at:new Date().toISOString(),
    verification_status:"self_reported_unreviewed"});
  persist();render();draw();form.hidden=true;
 };
 exp.onclick=()=>{
  if(!records.length){alert("Chưa có điểm nào để xuất");return}
  let payload={schema:"truc-giang-shoreline-ground-controls-v1",crs:"EPSG:4326",project:"Ho Truc Giang",
    warning:"Self reported: independent review required before updating official geometry",generated_at:new Date().toISOString(),points:records};
  let url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"})),a=e("a");
  a.href=url;a.download="truc-giang-shoreline-controls-"+new Date().toISOString().slice(0,10)+".json";
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);
 };
 render();container.append(sec);
}
const css=[
 ".shore-actions{display:flex;flex-wrap:wrap;gap:7px}",
 ".shore-actions button,.shore-form button{border:1px solid #c9dafa;background:#ebf2ff;color:#285db6;border-radius:8px;padding:9px;font-size:11px;font-weight:700}",
 ".shore-form{display:grid;gap:9px;background:#f8fbff;padding:11px;border:1px solid #e1e9f6;border-radius:10px;margin-top:9px}",
 ".shore-form[hidden]{display:none}.shore-form label{font-size:10px;color:#60728e;display:grid;gap:4px}",
 ".shore-form input,.shore-form select,.shore-form textarea{width:100%;min-width:0;min-height:34px;padding:7px;border-radius:7px;border:1px solid #cbdaf0;background:#fff;color:#264668}",
 ".shore-form textarea{min-height:58px;resize:vertical}.shore-record{display:grid;gap:4px;position:relative;padding:9px 70px 9px 0;border-bottom:1px solid #e5edf7}",
 ".shore-record strong{font-size:10px}.shore-record small{font-size:10px;color:#8c9fb8}",
 ".shore-record button{position:absolute;right:0;top:12px;color:#9b5067;background:#fff;border:1px solid #edd5dc;border-radius:6px;padding:6px}"
].join("\n");let style=e("style");style.textContent=css;document.head.append(style);
window.TrucGiangShoreControls={attach:attach,points:()=>records.slice()};
})();