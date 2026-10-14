/* MiniWorld Lab - original procedural WebGL scenes. Uses the local Three.js runtime. */
(function () {
  "use strict";
  var T = window.THREE;
  var M = {};
  var mats = new Map();
  var boxes = new Map();
  var spheres = new Map();
  var cylinders = new Map();
  var pointerThreshold = 7;
  M.mat = function (color, opts) {
    var key = String(color) + "|" + (opts && opts.metalness || 0) + "|" + (opts && opts.emissive || "");
    if (!mats.has(key)) mats.set(key, new T.MeshStandardMaterial(Object.assign({color: color, roughness: .85, metalness: 0}, opts || {})));
    return mats.get(key);
  };
  function boxGeo(w,h,d) {
    var k = [w,h,d].join(":");
    if (!boxes.has(k)) boxes.set(k, new T.BoxGeometry(w,h,d));
    return boxes.get(k);
  }
  M.box = function (p, w,h,d, x,y,z, color) {
    var o = new T.Mesh(boxGeo(w,h,d), typeof color === "string" || typeof color === "number" ? M.mat(color) : color);
    o.position.set(x,y,z); o.receiveShadow = true; o.castShadow = h > .65 && w > 1 && d > 1; p.add(o); return o;
  };
  M.sphere = function (p, rad,x,y,z,color, scale) {
    var k = rad;
    if (!spheres.has(k)) spheres.set(k, new T.IcosahedronGeometry(rad,1));
    var o = new T.Mesh(spheres.get(k), M.mat(color));
    o.position.set(x,y,z); o.castShadow = true;
    if(scale) o.scale.set(scale[0],scale[1],scale[2]);
    p.add(o); return o;
  };
  M.cyl = function (p,r1,r2,h,x,y,z,color,sides) {
    sides = sides || 9;
    var key = [r1,r2,h,sides].join(":");
    if (!cylinders.has(key)) cylinders.set(key,new T.CylinderGeometry(r1,r2,h,sides));
    var o = new T.Mesh(cylinders.get(key),M.mat(color));
    o.position.set(x,y,z); o.receiveShadow=true; o.castShadow=h>1; p.add(o); return o;
  };
  M.text = function(p,str,x,y,z,w,h,rot,fg,bg) {
    var canvas=document.createElement("canvas"); canvas.width=512; canvas.height=128;
    var g=canvas.getContext("2d"); g.fillStyle=bg || "#29334f"; g.fillRect(0,0,512,128);
    g.strokeStyle="rgba(255,255,255,.19)"; g.lineWidth=7; g.strokeRect(5,5,502,118);
    g.fillStyle=fg||"#ffffff"; g.textAlign="center";g.textBaseline="middle";
    var len=[...String(str)].length;
    g.font="bold "+(len>14?31:len>8?43:len>4?57:69)+"px sans-serif";
    g.fillText(str,256,67,470);
    var tex=new T.CanvasTexture(canvas); tex.anisotropy=2; tex.colorSpace=T.SRGBColorSpace || "";
    var mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:false,side:T.DoubleSide}));
    mesh.position.set(x,y,z); mesh.rotation.y=rot || 0; mesh.userData.disposeGeo=true; mesh.userData.disposeMat=true; p.add(mesh); return mesh;
  };
  M.roof = function (p,w,d,x,y,z,color, slope) {
    var g=new T.Group(); g.position.set(x,y,z); p.add(g);
    var ridge=slope || .9;
    var shape=new T.Shape(); shape.moveTo(-w/2,0); shape.lineTo(0,ridge); shape.lineTo(w/2,0); shape.lineTo(-w/2,0);
    var geo=new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false});
    geo.translate(0,0,-d/2);
    var roof=new T.Mesh(geo,M.mat(color)); roof.receiveShadow=true; roof.castShadow=true;roof.userData.disposeGeo=true; g.add(roof);
    M.box(g,w+.42,.16,d+.42,0,-.04,0,color);
    return g;
  };
  M.tree = function(p,x,z,kind,scale) {
    kind=kind||"green";scale=scale||1;
    var g=new T.Group(); g.position.set(x,0,z);g.scale.setScalar(scale);p.add(g);
    M.cyl(g,.12,.19,1.55,0,.77,0,"#866e56");
    var palette={green:["#4f9462","#78b17b","#3f7e5a"],cherry:["#f1a6bf","#ffc9d8","#de83ad"],maple:["#d86b4f","#f7a463","#b84a46"]}[kind] || ["#5b9863","#81b880","#397752"];
    for(var i=0;i<5;i++){
      var a=i*2.4,r=i===0?0:.58;
      M.sphere(g,i===0?.88:.62,Math.cos(a)*r,1.95+(i%2)*.35,Math.sin(a)*r,palette[i%3],[1.13,.85,1.06]);
    }
    return g;
  };
  M.lamp = function(p,x,z,color) {
    M.cyl(p,.07,.11,2.5,x,1.25,z,"#25354b");
    M.box(p,.44,.14,.44,x,2.57,z,"#2b394a");
    M.box(p,.35,.43,.35,x,2.28,z,color || "#ffe5a6");
    M.box(p,.57,.12,.57,x,2.02,z,"#2b394a");
  };
  M.bench=function(p,x,z) {
    M.box(p,1.35,.11,.45,x,.57,z,"#aa7055");
    M.box(p,1.35,.52,.1,x,.92,z-.21,"#aa7055");
    for(var i=-1;i<=1;i+=2) M.box(p,.11,.5,.13,x+i*.48,.30,z,"#263b41");
  };
  M.car = function(p,x,z,color,dir) {
    var g=new T.Group();g.position.set(x,.16,z);g.rotation.y=dir || 0;p.add(g);
    M.box(g,1.34,.37,2.12,0,.24,0,color);
    M.box(g,1.18,.48,1.07,0,.61,-.12,color);
    M.box(g,1.04,.32,.16,0,.64,.51,"#a4d0e5");
    M.box(g,1.04,.32,.16,0,.64,-.75,"#a4d0e5");
    for(var i=-1;i<=1;i+=2)for(var j=-1;j<=1;j+=2){
      var wheel=M.cyl(g,.24,.24,.15,i*.7,.25,j*.69,"#222b37",12);
      wheel.rotation.z=Math.PI/2;
    }
    M.box(g,.25,.12,.08,-.4,.3,1.08,"#fff3c0");
    M.box(g,.25,.12,.08,.4,.3,1.08,"#fff3c0");
    M.box(g,.25,.12,.08,-.4,.3,-1.08,"#e05b59");
    M.box(g,.25,.12,.08,.4,.3,-1.08,"#e05b59");
    return g;
  };
  M.person=function(p,x,z,shirt) {
    var g=new T.Group();g.position.set(x,0,z);p.add(g);
    M.cyl(g,.12,.12,.64,0,.81,0,shirt||"#4b87b5",7);
    M.sphere(g,.18,0,1.28,0,"#eac4a6");
    M.box(g,.11,.5,.13,-.105,.24,0,"#36445b");
    M.box(g,.11,.5,.13,.105,.24,0,"#36445b");
    return g;
  };
  M.rand=function(seed) {
    var x=(seed|0)||1;
    return function(){x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};
  };
  M.init=function(opts) {
    var el=document.getElementById("viewport");
    var status=document.getElementById("status");
    var fault=document.getElementById("fault");
    if(!T){ if(fault)fault.textContent="Không tải được Three.js cục bộ (assets/three.min.js).";return null; }
    var renderer,scene,camera,sun,fill,world,raycaster,clock;
    var anims=[], selectable=[], selected=null, api, disposed=false;
    var angle=-.68,elevation=.85,distance=opts.distance||65, baseDistance=distance, viewportScale=1, target=new T.Vector3(0,2,0);
    var initial={angle:angle,elevation:elevation,distance:distance};
    var pointers=new Map(),startX=0,startY=0,gesture=false, pinchStart=0;
    var moving=true, night=false, labels=true, fpsCounter=0,lastFPS=performance.now(),lastFrame=performance.now();
    function setStatus(msg){if(status)status.textContent=msg;}
    function fail(error){console.error("[MiniWorld]",error);if(fault){fault.textContent=String(error.stack||error);fault.hidden=false;}setStatus("Lỗi render");}
    try {
      renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:"high-performance",preserveDrawingBuffer:true});
      renderer.setClearColor(0x000000,0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,window.innerWidth<700?1.45:1.8));
      renderer.shadowMap.enabled=window.innerWidth>850;
      renderer.shadowMap.type=T.PCFSoftShadowMap;
      if("outputColorSpace" in renderer)renderer.outputColorSpace=T.SRGBColorSpace;
      else renderer.outputEncoding=T.sRGBEncoding;
      renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=1.35;
      el.appendChild(renderer.domElement);
      scene=new T.Scene();
      camera=new T.PerspectiveCamera(39,1,.1,350);
      sun=new T.DirectionalLight(0xffe2bb,2.35);sun.position.set(-20,48,30);sun.castShadow=renderer.shadowMap.enabled;
      sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-58;sun.shadow.camera.right=58;
      sun.shadow.camera.top=58;sun.shadow.camera.bottom=-58;sun.shadow.normalBias=.022;
      scene.add(sun);
      fill=new T.HemisphereLight(0xd4eaff,0xb1af9c,2.1);scene.add(fill);
      var ambient=new T.AmbientLight(0xffffff,.18);scene.add(ambient);
      world=new T.Group();scene.add(world);
      raycaster=new T.Raycaster();clock=new T.Clock();
    }catch(e){fail(e);return null;}
    function cameraUpdate(){
      elevation=Math.min(1.43,Math.max(.16,elevation));
      distance=Math.min(240,Math.max(17,distance));
      camera.position.set(target.x+distance*Math.cos(elevation)*Math.sin(angle),target.y+distance*Math.sin(elevation),target.z+distance*Math.cos(elevation)*Math.cos(angle));
      camera.lookAt(target);
    }
    function resize(){
      var w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight),a=w/h;
      var scale=a<.7?1.7:a<1?1.28:1;
      distance=distance*scale/viewportScale; viewportScale=scale; initial.distance=baseDistance*scale;
      renderer.setSize(w,h,false);camera.aspect=a;camera.fov=a<.7?57:a<1?48:39;camera.updateProjectionMatrix();
    }
    function move(e){
      if(!pointers.has(e.pointerId))return;
      var p=pointers.get(e.pointerId),dx=e.clientX-p.x,dy=e.clientY-p.y;
      p.x=e.clientX;p.y=e.clientY;
      if(Math.abs(e.clientX-startX)+Math.abs(e.clientY-startY)>pointerThreshold)gesture=true;
      if(pointers.size===1){
        angle-=dx*.009;elevation+=dy*.008;
      }else if(pointers.size>=2){
        var arr=Array.from(pointers.values()),dist=Math.hypot(arr[0].x-arr[1].x,arr[0].y-arr[1].y);
        if(pinchStart>0){distance*=pinchStart/Math.max(20,dist);}
        pinchStart=dist; gesture=true;
      }
    }
    function onDown(e){
      if(e.button!==0&&e.pointerType!=="touch")return;
      e.preventDefault();
      if(!pointers.size){startX=e.clientX;startY=e.clientY;gesture=false;}
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pointers.size===2){var a=Array.from(pointers.values());pinchStart=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);}
      try{renderer.domElement.setPointerCapture(e.pointerId);}catch(_){}
    }
    function onUp(e){
      if(!pointers.has(e.pointerId))return;
      var click=pointers.size===1&&!gesture&&e.type!=="pointercancel";
      pointers.delete(e.pointerId);pinchStart=0;
      if(click){
        var r=renderer.domElement.getBoundingClientRect();
        var ndc=new T.Vector2((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));
        raycaster.setFromCamera(ndc,camera);
        var hits=raycaster.intersectObjects(selectable,true);
        var item=hits.length?hits[0].object:null;
        while(item&&!item.userData.info)item=item.parent;
        selected=item;
        if(opts.select)opts.select(item?item.userData.info:null);
      }
    }
    renderer.domElement.style.touchAction="none";
    renderer.domElement.addEventListener("pointerdown",onDown);
    renderer.domElement.addEventListener("pointermove",move);
    ["pointerup","pointercancel","lostpointercapture"].forEach(function(x){renderer.domElement.addEventListener(x,onUp);});
    renderer.domElement.addEventListener("wheel",function(e){e.preventDefault();distance*=Math.exp(e.deltaY*.0011);},{passive:false});
    renderer.domElement.addEventListener("contextmenu",function(e){e.preventDefault();});
    renderer.domElement.addEventListener("webglcontextlost",function(e){e.preventDefault();fail("WebGL context bị mất. Hãy tải lại trang.");});
    window.addEventListener("resize",resize);
    document.addEventListener("visibilitychange",function(){lastFrame=performance.now();});
    function screenshot(){
      try{
        renderFrame();
        var link=document.createElement("a");
        link.href=renderer.domElement.toDataURL("image/png");
        link.download=(opts.slug||"mini-world")+".png";link.click();
      }catch(e){fail(e);}
    }
    function setNight(v){
      night=!!v;
      sun.intensity=night?.22:2.35;fill.intensity=night?.62:2.1;
      sun.color.set(night?0x889fda:0xffe2bb);
      renderer.toneMappingExposure=night?1.48:1.35;
      document.documentElement.classList.toggle("night",night);
      if(opts.lighting)opts.lighting(night);
    }
    function clear(){
      anims.length=0;selectable.length=0;selected=null;
      world.traverse(function(o){if(o.userData.disposeGeo&&o.geometry)o.geometry.dispose(); if(o.userData.disposeMat&&o.material){if(o.material.map)o.material.map.dispose();o.material.dispose();}});
      world.clear();
      if(opts.select)opts.select(null);
    }
    api={
      scene:scene,group:world,renderer:renderer,camera:camera,sun:sun,
      T:T, M:M,
      addAnimation:function(fn){anims.push(fn);},
      register:function(mesh,info){mesh.userData.info=info;selectable.push(mesh);return mesh;},
      clear:clear,
      reset:function(){angle=initial.angle;elevation=initial.elevation;distance=initial.distance;target.set(0,2,0);cameraUpdate();},
      zoom:function(scale){distance*=scale;cameraUpdate();},
      toggleMotion:function(){moving=!moving;return moving;},
      toggleNight:function(){setNight(!night);return night;},
      setNight:setNight,
      toggleLabels:function(){labels=!labels;if(opts.labels)opts.labels(labels);return labels;},
      screenshot:screenshot,
      build:function(){clear();opts.build(api);setStatus("WebGL 3D • hoạt động");},
      getStats:function(){return {fps:fpsCounter,objects:world.children.length,night:night,moving:moving};}
    };
    function renderFrame(){cameraUpdate();renderer.render(scene,camera);}
    try{resize();api.build();renderFrame();}catch(e){fail(e);}
    function loop(now){
      if(disposed)return;
      requestAnimationFrame(loop);
      if(document.hidden)return;
      var dt=Math.min(.05,(now-lastFrame)/1000||.016);lastFrame=now;
      if(moving)for(var i=0;i<anims.length;i++)try{anims[i](dt,now*.001);}catch(e){fail(e);anims.splice(i--,1);}
      renderFrame();
      fpsCounter++;
      if(now-lastFPS>1500){
        var fps=Math.round(fpsCounter*1000/(now-lastFPS));
        var elfps=document.getElementById("fps");
        if(elfps)elfps.textContent=fps+" FPS";
        lastFPS=now;fpsCounter=0;
      }
    }
    requestAnimationFrame(loop);
    window.__MiniWorldInstance=api;
    return api;
  };
  window.MiniWorld=M;
})();
