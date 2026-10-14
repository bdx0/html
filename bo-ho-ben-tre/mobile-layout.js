/* Bờ Hồ 3D: unified touch-friendly mobile tools, no scene/data modifications. */
(function(){
"use strict";
var $=function(id){return document.getElementById(id)};
var menu=$("mobileTools"),backdrop=$("mobileToolsBackdrop"),trigger=$("mobileMenuToggle");
if(!menu||!backdrop||!trigger)return;
function setMenu(open){
  menu.hidden=!open;backdrop.hidden=!open;trigger.setAttribute("aria-expanded",String(open));
  if(open){var close=$("mobileToolsClose");if(close)close.focus()}
  else trigger.focus();
}
trigger.addEventListener("click",function(){setMenu(menu.hidden)});
$("mobileToolsClose").addEventListener("click",function(){setMenu(false)});
backdrop.addEventListener("click",function(){setMenu(false)});
menu.querySelectorAll("[data-mobile-action]").forEach(function(b){
 b.addEventListener("click",function(){
  var a=b.dataset.mobileAction;
  if(a==="minimap"){document.body.classList.toggle("show-minimap")}
  else{var target=$(a);if(target)target.click()}
  setMenu(false);
 });
});
menu.querySelectorAll("[data-mobile-view]").forEach(function(b){
 b.addEventListener("click",function(){
   var view=b.dataset.mobileView,button=document.querySelector('[data-wb-view="'+view+'"]');
   if(button)button.click();
   setMenu(false);
 });
});
menu.querySelectorAll("a").forEach(function(a){a.addEventListener("click",function(){setMenu(false)})});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!menu.hidden)setMenu(false)});
window.addEventListener("resize",function(){if(window.innerWidth>860&&!menu.hidden)setMenu(false)});
})();
