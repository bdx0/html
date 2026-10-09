/* NEXUS ARCHVIZ 2045 — local procedural materials and architecture, no remote assets.
 * Designed for Three.js r158 and progressive WebGL support.
 */
(function () {
"use strict";
window.NEXUS_ARCHVIZ = function (o) {
  var T=o.THREE,scene=o.scene,M=o.M,ui=o.ui,box=o.box,cyl=o.cyl,sphere=o.sphere,plane=o.plane;
  var mobile=o.mobile,animated=[],emissive=[],waterSurface=null,sky=null,skyMat=null;
  var golden=T.MathUtils;
  var randSeed=8491;
  function rnd(){randSeed=(1664525*randSeed+1013904223)>>>0;return randSeed/4294967296;}
  function m(hex,roughness,metalness){return new T.MeshStandardMaterial({color:hex,roughness:roughness===undefined?.7:roughness,metalness:metalness||0});}
  function texture(kind,size,repeatX,repeatY){
    var canvas=document.createElement('canvas');canvas.width=canvas.height=size||256;
    var g=canvas.getContext('2d',{alpha:false});if(!g)return null;
    var palette={
      concrete:['#e6e5df','#dbddd7','#b1b5ac'],
      timber:['#ad835a','#8d6549','#d4ae78'],
      travertine:['#cfcdc0','#e7e2d2','#9e9e93'],
      pavement:['#b4b6ae','#e1ded6','#9ca59b'],
      fabric:['#e4d9c7','#ccc4b4','#faf1dd'],
      grass:['#587a57','#789965','#365d47']
    }[kind]||['#aaa','#888','#ccc'];
    g.fillStyle=palette[0];g.fillRect(0,0,canvas.width,canvas.height);
    if(kind==='timber'){
      for(var i=0;i<70;i++){var yy=rnd()*canvas.height;g.fillStyle=i%3===0?palette[2]:palette[1];g.globalAlpha=.06+rnd()*.17;g.fillRect(0,yy,canvas.width,.4+rnd()*3.5);}
      for(var a=0;a<4;a++){var sy=a*(canvas.height/4);g.globalAlpha=.32;g.strokeStyle='#4e382b';g.lineWidth=1;g.beginPath();g.moveTo(0,sy);g.lineTo(canvas.width,sy);g.stroke();}
    }else if(kind==='travertine'){
      for(var j=0;j<75;j++){g.strokeStyle=palette[1];g.globalAlpha=.15+rnd()*.25;g.lineWidth=.5+rnd()*2;g.beginPath();var x=rnd()*canvas.width,y=rnd()*canvas.height;g.moveTo(x,y);g.bezierCurveTo(x+20+rnd()*80,y+3,x+70,y+1,x+190,y+9);g.stroke();}
    }else if(kind==='pavement'){
      g.strokeStyle='#8f988c';g.lineWidth=1.5;g.globalAlpha=.26;
      for(var x=0;x<=canvas.width;x+=64){g.beginPath();g.moveTo(x,0);g.lineTo(x,canvas.height);g.stroke();}
      for(var y=0;y<=canvas.height;y+=64){g.beginPath();g.moveTo(0,y);g.lineTo(canvas.width,y);g.stroke();}
    }
    g.globalAlpha=1;
    for(var n=0;n<(kind==='grass'?14000:4300);n++){
      var c=rnd(),xx=rnd()*canvas.width,yy=rnd()*canvas.height;
      g.globalAlpha=.018+rnd()*(kind==='grass'?.28:.07);
      g.fillStyle=c<.5?palette[1]:palette[2];
      g.fillRect(xx,yy,kind==='grass'?1+rnd()*3:.5+rnd()*1.4,kind==='grass'?1+rnd()*4:.5+rnd()*1.4);
    }
    g.globalAlpha=1;
    var tex=new T.CanvasTexture(canvas);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(repeatX||1,repeatY||1);
    tex.anisotropy=Math.min(8,o.renderer.capabilities.getMaxAnisotropy());tex.colorSpace=T.SRGBColorSpace;
    return tex;
  }
  function setMap(mat,tex){if(tex){mat.map=tex;mat.color.set(0xffffff);mat.needsUpdate=true;}}
  setMap(M.plaster,texture('concrete',256,1,1));
  setMap(M.cream,texture('concrete',256,1,1));
  setMap(M.stone,texture('travertine',256,2,2));
  setMap(M.wood,texture('timber',256,1,1));
  setMap(M.woodBright,texture('timber',256,1,1));
  setMap(M.deck,texture('timber',256,3,2));
  setMap(M.fabric,texture('fabric',256,1,1));
  setMap(M.outdoor,texture('pavement',256,3,3));
  setMap(M.grass,texture('grass',256,24,24));
  M.glass.roughness=.04;M.glass.metalness=.18;M.glass.opacity=.37;M.glass.color.set(0x9ccbd0);
  M.glassOpaque.roughness=.14;
  M.water.color.set(0x6cbdc0);M.water.roughness=.07;M.water.metalness=.22;
  var bronze=m(0x88715a,.29,.72),bronzeLight=m(0xc8a67a,.32,.5);
  var charcoal=m(0x25373a,.7,.1),deep=m(0x1b2627,.54,.33),ceramic=m(0xd8d3c7,.82);
  var sage=m(0x879680,.87),lightLinen=m(0xdbd6c9,.96),leather=m(0x86634e,.88);
  var amber=new T.MeshStandardMaterial({color:0xffd7a4,emissive:0xffa75a,emissiveIntensity:.10,roughness:.5});
  var bloom=new T.MeshBasicMaterial({color:0xffefc5,transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide});
  function line(parent,points,material,radius){
    var curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p[0],p[1],p[2])));
    var obj=new T.Mesh(new T.TubeGeometry(curve,Math.max(8,points.length*8),radius||.025,6,false),material);
    parent.add(obj);return obj;
  }
  function cylinderHorizontal(parent,x,y,z,r,width,material){
    var tube=cyl(parent,x,y,z,r,r,width,material,20);tube.rotation.x=Math.PI/2;return tube;
  }
  function cylinderVertical(parent,x,y,z,r,h,material,segments){return cyl(parent,x,y,z,r,r,h,material,segments||20);}
  function plant(parent,x,y,z,scale){
    var g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale||1);parent.add(g);
    cylinderVertical(g,0,.20,0,.19,.37,ceramic,14);
    cylinderVertical(g,0,.42,0,.14,.07,charcoal,14);
    for(var i=0;i<11;i++){
      var ang=(i/11)*Math.PI*2,rr=.22+rnd()*.28;
      var leaf=sphere(g,Math.sin(ang)*rr,.77+rnd()*.32,Math.cos(ang)*rr,.14+rnd()*.14,i%3===0?M.leaf2:M.plants,8);
      leaf.scale.set(.7,1.8,.75);leaf.rotation.z=(rnd()-.5)*.6;
    }
  }
  function foliage(parent,x,y,z,s,mat){
    var g=new T.Group();g.position.set(x,y,z);parent.add(g);
    var colors=[M.leaf,M.leaf2,M.plants,sage];
    for(var i=0;i<5;i++){
      var a=(i/5)*Math.PI*2;
      var v=sphere(g,Math.sin(a)*s*.38,(rnd()-.3)*s*.4,Math.cos(a)*s*.33,s*(.45+rnd()*.16),mat||colors[i%colors.length],10);
      v.scale.y=.85+rnd()*.4;
    }
  }
  function lowShrub(parent,x,y,z,r){foliage(parent,x,y,z,r,null);}
  function areaRug(parent,x,y,z,w,d){box(parent,x,y,z,w,.035,d,lightLinen,false);for(var i=0;i<5;i++){box(parent,x-w*.37+i*w*.17,y+.025,z,.018,.009,d*.87,ceramic,false);}}
  function soffit(parent,x,y,z,w,d){
    box(parent,x,y,z,w,.075,d,deep,false);
    box(parent,x,y-.047,z,w-.26,.014,d-.26,bronze,false);
    for(var i=0;i<Math.max(2,Math.floor(w/2));i++){var xx=x-w/2+(i+.6)*w/Math.max(2,Math.floor(w/2));cyl(parent,xx,y-.08,z,.075,.075,.014,amber,14);}
  }
  function bench(parent,x,y,z,w){
    box(parent,x,y,z,w,.14,.63,M.woodBright);
    for(var i=0;i<2;i++)box(parent,x+(i?1:-1)*(w/2-.17),y-.23,z,.08,.4,.58,bronze);
  }
  function modernTree(parent,x,z,scale){
    var g=new T.Group();g.position.set(x,.27,z);g.scale.setScalar(scale||1);parent.add(g);
    cylinderVertical(g,0,1.6,0,.19,3.2,M.wood,12);
    for(var i=0;i<4;i++){
      var yy=2.8+i*.6,sz=1.1-i*.16;
      var leaf=cyl(g,0,yy,0,.05,sz,.9,i%2?M.leaf:M.leaf2,11);leaf.castShadow=true;
    }
  }
  function createSky(){
    var material=new T.ShaderMaterial({
      uniforms:{uNight:{value:0},uTime:{value:0}},
      side:T.BackSide,depthWrite:false,lights:false,
      vertexShader:'varying vec3 vDir; void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'uniform float uNight;uniform float uTime;varying vec3 vDir;void main(){float t=clamp(normalize(vDir).y*.8+.28,0.,1.);vec3 low=mix(vec3(.88,.83,.70),vec3(.67,.79,.86),smoothstep(.0,.55,t));vec3 high=vec3(.25,.48,.69);vec3 day=mix(low,high,smoothstep(.15,.85,t));vec3 dusk=mix(vec3(.17,.19,.29),vec3(.018,.034,.077),smoothstep(.1,.84,t));float haze=pow(1.-t,4.);vec3 c=mix(day+vec3(.04,.025,0.)*haze,dusk,uNight);gl_FragColor=vec4(c,1.0);}'
    });
    skyMat=material;sky=new T.Mesh(new T.SphereGeometry(90,28,14),material);
    sky.frustumCulled=false;scene.add(sky);
    scene.fog.near=69;scene.fog.far=149;
    // Distant trees break the hard horizon on large screens.
    if(!mobile){var horizon=new T.Group();scene.add(horizon);for(var i=0;i<38;i++){var a=i/38*Math.PI*2,dist=45+rnd()*10;modernTree(horizon,Math.sin(a)*dist,Math.cos(a)*dist,.65+rnd()*.6);}}
  }
  function letterTexture(){
    var c=document.createElement('canvas');c.width=512;c.height=256;var ctx=c.getContext('2d');
    ctx.fillStyle='#172e31';ctx.fillRect(0,0,512,256);
    ctx.fillStyle='#d6b47d';ctx.font='600 68px Arial, sans-serif';ctx.fillText('NEXUS',28,102);
    ctx.fillStyle='#d4c6b2';ctx.font='24px Arial, sans-serif';ctx.fillText('RESIDENCE / 2045',30,154);
    ctx.fillStyle='#c5b59d';ctx.font='18px Arial, sans-serif';ctx.fillText('THE FUTURE IS HOME',30,195);
    var tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;
  }
  function buildOutdoor(){
    var g=ui.garden,ground=ui.ground,up=ui.upper,roof=ui.roof;
    // Exterior elevation: recessed joints and contrasting fascia.
    [-7.75,-6.0,-4.25,-2.5].forEach(x=>box(ground,x,1.75,-4.7,.027,2.35,.06,bronze,false));
    box(ground,-4.7,3.46,2.78,7.15,.07,.10,deep,false);
    box(ground,-4.7,.76,2.75,7.15,.10,.12,bronze,false);
    box(ground,-.95,2.18,2.63,.13,2.78,.2,bronze,false);
    box(ground,-1.55,1.82,3.25,.12,1.9,.10,bronze,false); // entry door pull
    box(ground,-1.9,.65,3.1,2.1,.14,1.25,M.stone);
    for(var i=0;i<3;i++)box(ground,-1.9,.40-i*.085,3.98+i*.42,2.25,.12,.65,M.outdoor);
    box(ground,-6.0,1.2,3.16,3.1,.09,.09,bronze,false);
    // Thin linear light under the cantilever and window mullions.
    for(var j=0;j<11;j++){box(up,-7.6+j*1.42,6.50,4.48,.035,.08,.2,bronze,false);}
    soffit(up,-.4,6.31,4.37,14.4,.65);
    // Front wall and garden gate sign.
    var sign=new T.Mesh(new T.PlaneGeometry(2.15,1.075),new T.MeshBasicMaterial({map:letterTexture(),side:T.DoubleSide}));
    sign.position.set(-13.2,1.16,14.98);g.add(sign);
    box(g,-13.2,1.16,15.05,2.3,1.25,.17,deep);
    // Landscape stepping stones and gravel lines.
    for(var k=0;k<13;k++){
      var zz=4.8+k*.64;
      box(g,-.95+(k%2)*.08,.26,zz,1.22,.055,.44,M.stone,false);
    }
    // Perimeter uplight boxes and bronze bollards.
    for(var i=0;i<10;i++){
      var x=-16+i*3.45;
      box(g,x,.46,-13.35,.12,.55,.12,deep,false);
      box(g,x,.76,-13.35,.16,.06,.16,amber,false);
    }
    // Reflective water surface with softly animated normal/ripples.
    var wave=new T.ShaderMaterial({
      uniforms:{uTime:{value:0},uNight:{value:0}},
      side:T.DoubleSide,transparent:true,depthWrite:false,
      vertexShader:'varying vec2 uvv;void main(){uvv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'uniform float uTime;uniform float uNight;varying vec2 uvv;void main(){vec2 p=uvv;float r=sin(p.x*92.+uTime*1.6)*sin(p.y*64.-uTime*.9);float r2=sin((p.x+p.y)*113.-uTime*2.1);float glint=pow(max(0.,r*.6+r2*.4),8.);vec3 blue=mix(vec3(.055,.36,.41),vec3(.20,.67,.69),uvv.y);vec3 water=blue+vec3(.22,.38,.38)*glint*.48;water=mix(water,vec3(.025,.12,.18)+glint*.09,uNight);gl_FragColor=vec4(water,.96);}'
    });
    waterSurface=wave;
    o.water.material=wave;
    // Pool interior tile grid (appears in shallow water).
    for(var s=0;s<10;s++)box(g,3.8+s*1.0,.511,8.0,.018,.008,4.8,M.poolRim,false);
    for(var z=0;z<5;z++)box(g,8.45,.511,5.9+z*1.0,9.1,.008,.018,M.poolRim,false);
    // River stones at planted borders.
    var pebbleMat=m(0x9c9d91,.95);
    var pebbles=new T.InstancedMesh(new T.DodecahedronGeometry(.10,0),pebbleMat,mobile?50:150);
    var dummy=new T.Object3D(),total=pebbles.count;
    for(var p=0;p<total;p++){var along=p/total;dummy.position.set(-10+along*20,.32,-7.0+(rnd()-.5)*1.1);dummy.scale.set(.55+rnd(),.5+rnd()*.4,.6+rnd());dummy.rotation.set(rnd(),rnd()*3,rnd());dummy.updateMatrix();pebbles.setMatrixAt(p,dummy.matrix);}g.add(pebbles);
    // Distinct conifer and small flowering accents.
    [[-17,9,.72],[-17,12,.88],[16,11,.65],[16,-9,1.15],[-14,-6,.85]].forEach(v=>modernTree(g,v[0],v[1],v[2]));
    for(var l=0;l<7;l++)plant(g,-8+l*2.1,.3,-8.1,.7);
    // Instanced ornamental grass — detailed, but only 1 draw call.
    var blade=new T.ConeGeometry(.062,.45,3);
    var meadow=new T.InstancedMesh(blade,new T.MeshStandardMaterial({color:0x84a079,side:T.DoubleSide,roughness:1}),mobile?250:900);
    var obj=new T.Object3D();
    for(var z=0;z<meadow.count;z++){
      var side=z%3,px,pz;
      if(side===0){px=-16+rnd()*32;pz=-12+rnd()*2.0;}
      else if(side===1){px=13.9+rnd()*3;pz=-9+rnd()*24;}
      else{px=-15+rnd()*4;pz=5+rnd()*8;}
      obj.position.set(px,.48,pz);obj.rotation.set((rnd()-.5)*.6,rnd()*6,(rnd()-.5)*.6);obj.scale.setScalar(.4+rnd()*.9);obj.updateMatrix();meadow.setMatrixAt(z,obj.matrix);
    }
    g.add(meadow);
    // Wall washers: emissive material responds at night.
    for(var w=0;w<6;w++)box(ground,-7.4+w*1.1,3.20,2.82,.045,.06,.06,amber,false);
    // Balcony lounge set.
    bench(up,2.6,4.15,4.6,2.6);
    plant(up,4.92,4.01,4.3,.72);
    // Rooftop garden planters and railing.
    box(roof,7.02,7.70,-.1,.10,.68,7.7,bronze,false);
    box(roof,-8.12,7.70,-.1,.10,.68,7.7,bronze,false);
    for(var c=0;c<6;c++){box(roof,-7.95+c*2.95,7.75,-6.18,.08,.88,.06,bronze,false);}
    box(roof,0,7.75,-6.2,15.8,.06,.06,bronze,false);
    for(var t=0;t<4;t++)plant(roof,5.0+t*.85,7.42,4.1,.72);
    // Facade accents through the windows.
    for(var f=0;f<4;f++)box(up,-.1+f*1.7,5.2,3.61,.025,2.25,.025,bronze,false);
    // Architectural watermark at main forecourt.
    box(g,-11,.46,13.7,6.6,.09,.08,bronze,false);
    // Decorative stone sculpture at pool edge.
    cylinderVertical(g,13.25,.85,8.1,.42,.70,ceramic,20);
    sphere(g,13.25,1.56,8.1,.48,bronze,24);
  }
  function buildInterior(){
    var g=ui.ground,up=ui.upper;
    // The furnished living room faces south toward the pool.
    areaRug(g,3.55,.933,.4,4.55,3.3);
    box(g,3.2,1.37,.42,2.35,.58,.82,lightLinen);
    box(g,3.2,1.58,.03,2.35,.46,.23,leather);
    box(g,2.03,1.40,.40,.25,.51,.87,lightLinen);
    box(g,4.37,1.40,.40,.25,.51,.87,lightLinen);
    for(var i=0;i<4;i++){var pillow=box(g,2.42+i*.52,1.70,.43,.35,.12,.30,i%2?leather:M.fabric,false);pillow.rotation.y=(i%2?.13:-.16);}
    cylinderVertical(g,3.35,1.10,1.63,.55,.12,bronzeLight,24);
    cylinderVertical(g,3.35,.99,1.63,.44,.14,deep,24);
    plant(g,2.95,1.22,1.72,.39);
    // Floating media console and a large television.
    box(g,1.65,1.37,-4.81,4.1,.36,.35,M.wood);
    box(g,1.65,2.24,-4.77,3.18,1.42,.035,deep,false);
    box(g,1.65,2.25,-4.74,2.9,1.24,.018,m(0x2e4a50,.2,.28),false);
    for(var a=0;a<5;a++)box(g,.30+a*.5,1.36,-4.58,.018,.26,.01,bronze,false);
    // Kitchen joinery and countertop.
    box(g,5.58,1.12,-3.72,2.25,.68,.93,M.wood);
    box(g,5.58,1.52,-3.72,2.37,.1,1.06,ceramic);
    box(g,5.58,2.12,-4.80,2.40,1.50,.36,M.wood);
    for(var kd=0;kd<4;kd++)box(g,4.68+kd*.59,1.05,-3.24,.03,.42,.035,bronze,false);
    // Island pendant lights.
    for(var lamp=0;lamp<3;lamp++){
      var lx=4.9+lamp*.69;
      cylinderVertical(g,lx,2.80,-2.85,.014,.70,bronze,10);
      var shade=cyl(g,lx,2.42,-2.85,.19,.09,.13,bronze,20);
      shade.rotation.z=.05;
      cylinderVertical(g,lx,2.34,-2.85,.07,.025,amber,14);
    }
    // Sculptural timber dining table.
    box(g,5.82,1.71,-.3,1.58,.11,1.04,M.woodBright);
    cylinderVertical(g,5.82,1.30,-.3,.31,.72,bronze,16);
    for(var d=0;d<2;d++){var gg=new T.Group();gg.position.set(5.82+(d?1.17:-1.17),.81,-.3);gg.rotation.y=d?Math.PI/2:-Math.PI/2;g.add(gg);box(gg,0,.48,0,.65,.13,.67,lightLinen);box(gg,0,.91,-.29,.65,.76,.14,lightLinen);}
    // Upstairs lounge / bedroom archviz styling.
    areaRug(up,.85,4.05,-1.3,4.05,3.65);
    box(up,.85,4.63,-1.1,2.75,.20,2.04,lightLinen);
    box(up,.85,4.78,-2.04,2.86,.60,.22,leather);
    box(up,.18,4.78,-1.74,1.11,.12,.35,M.fabric);
    box(up,1.50,4.78,-1.74,1.11,.12,.35,M.fabric);
    bench(up,-2.40,4.3,.56,1.45);
    cylinderVertical(up,3.45,4.33,1.50,.37,.06,bronzeLight,20);
    plant(up,4.30,4.05,-3.38,.8);
    // Ceiling perimeter and indirect lighting.
    soffit(up,1.20,6.30,-1.45,5.55,4.7);
    soffit(g,3.1,3.38,-1.30,6.5,4.2);
    // Large artwork for material contrast.
    box(g,-.96,2.21,-1.25,.045,1.7,2.4,deep,false);
    for(var ar=0;ar<9;ar++){var art=sphere(g,-.90,1.67+rnd()*1.0,-2.2+rnd()*2.1,.12+rnd()*.15,ar%2?bronzeLight:ceramic,10);art.scale.x=.38;}
  }
  createSky();
  buildOutdoor();
  buildInterior();
  function update(time,night){
    if(skyMat){skyMat.uniforms.uNight.value+=(Number(!!night)-skyMat.uniforms.uNight.value)*.04;skyMat.uniforms.uTime.value=time*.001;}
    if(waterSurface){waterSurface.uniforms.uTime.value=time*.001;waterSurface.uniforms.uNight.value+=(Number(!!night)-waterSurface.uniforms.uNight.value)*.04;}
    amber.emissiveIntensity+=( (night?2.1:.13)-amber.emissiveIntensity)*.05;
  }
  return {update:update, version:'archviz-2.0',materials:'local CanvasTexture PBR',drawCallsEstimate:'moderate'};
};
})();