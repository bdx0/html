import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{stdio:'ignore'});
const errors=[],warnings=[],report=[];
await new Promise(resolve=>setTimeout(resolve,1200));
const configs=[
  {name:'desktop',width:1400,height:900,mobile:false},
  {name:'mobile-320',width:320,height:720,mobile:true},
  {name:'mobile-390',width:390,height:844,mobile:true},
  {name:'mobile-landscape',width:844,height:390,mobile:true}
];
let browser;
try {
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
  for(const config of configs){
    const {name,width,height,mobile}=config;
    const ctx=await browser.newContext({
      viewport:{width,height},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile
    });
    const page=await ctx.newPage();
    page.on('pageerror',e=>errors.push(name+' JS '+e.message));
    page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push(name+' console '+m.text())});
    page.on('response',response=>{
      if(response.status()<400)return;
      const msg=name+' HTTP '+response.status()+' '+response.url();
      if(response.url().startsWith('http://127.0.0.1:8765/'))errors.push(msg);else warnings.push(msg);
    });
    // Test client-side georegistration with a synthetic fixture only.
    // This image is never committed as a real satellite source or displayed in production.
    if(name==='desktop'){
      await page.route('**/data/imagery/manifest.json',route=>route.fulfill({
        status:200,contentType:'application/json',body:JSON.stringify({
          status:'ready',image:'qa-fixture.png',bbox:[106.3722,10.23277,106.38408,10.24445],
          source:'QA fixture (not an aerial image)',acquired:'2026-10-14',
          native_resolution_m:1000,attribution:'Synthetic test fixture',license:'QA-only',
          source_url:'https://example.org/fixture'
        })}));
      await page.route('**/data/imagery/qa-fixture.png',route=>route.fulfill({
        status:200,contentType:'image/png',body:Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGM0qohiYGBgYmBgYGBgAAAMMgEIge0dgQAAAABJRU5ErkJggg==','base64')
      }));
    }
    await page.goto('http://127.0.0.1:8765/bo-ho-ben-tre/',{waitUntil:'load',timeout:45000});
    await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('300 m'),{timeout:30000});
    await page.waitForTimeout(1500);
    const viewport=await page.evaluate(()=>({
      innerWidth:window.innerWidth,innerHeight:window.innerHeight,
      scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,
      stage:[document.getElementById('stage').clientWidth,document.getElementById('stage').clientHeight],
      drawer:Math.round(document.getElementById('inspector').getBoundingClientRect().height),
      collapsed:!document.getElementById('inspector').classList.contains('expanded'),
      sceneScope:document.getElementById('status').textContent
    }));
    if(viewport.stage[0]<200||viewport.stage[1]<170)errors.push(name+' stage too small '+viewport.stage);
    if(viewport.scrollWidth>viewport.innerWidth+1||viewport.scrollHeight>viewport.innerHeight+1)
      errors.push(name+' global viewport overflow '+JSON.stringify(viewport));
    const sceneData=await page.evaluate(async()=>await (await fetch('data/scene.json')).json());
    if(sceneData.photo_hotspots?.length!==8)errors.push(name+' expected eight DB hotspots');
    if(sceneData.photo_hotspots?.some(h=>h.is_camera_location!==false))
      errors.push(name+' image anchors must not pretend camera EXIF position');
    await page.waitForFunction(()=>document.querySelectorAll('.photo-hotspot').length===8,{timeout:10000});
    const markerState=await page.locator('.photo-hotspot').evaluateAll(elements=>elements.map(el=>({
      id:el.dataset.hotspotId,visible:!el.classList.contains('hidden'),
      bound:el.getBoundingClientRect().width>0
    })));
    if(markerState.filter(x=>x.visible&&x.bound).length<1)
      errors.push(name+' no photo hotspot is projected in camera viewport '+JSON.stringify(markerState));
    let clicked=false;
    for(const choice of ['HS-FOUNTAIN','HS-LAKE-OVERVIEW','HS-NORTH-WALK']){
      const marker=page.locator('[data-hotspot-id="'+choice+'"]');
      if(await marker.isVisible() && !(await marker.evaluate(el=>el.classList.contains('hidden')))){
        try {await marker.click({timeout:2200});clicked=true;break} catch {}
      }
    }
    if(!clicked)errors.push(name+' cannot tap an interactive photo hotspot');
    else {
      const heading=await page.locator('#panel').innerText();
      if(!heading.includes('Điểm ghim')||!heading.includes('Xem nguồn ảnh'))
        errors.push(name+' hotspot did not show photo provenance and source');
      const links=await page.locator('#panel .image-row').count();
      if(links<1)errors.push(name+' hotspot returned no image reference');
      if(mobile){
        const isExpanded=await page.locator('#inspector').evaluate(el=>el.classList.contains('expanded'));
        if(!isExpanded)errors.push(name+' photo hotspot failed to expand bottom sheet');
        await page.locator('#sheetToggle').click();await page.waitForTimeout(260);
      }
    }
    if(mobile){
      if(!(await page.locator('#mobileMenuToggle').isVisible()))errors.push(name+' unified mobile menu missing');
      await page.locator('#mobileMenuToggle').click();
      if(!(await page.locator('#mobileTools').isVisible()))errors.push(name+' mobile tools panel did not open');
      await page.locator('#mobileToolsClose').click();
      if(await page.locator('#wbAxis').isVisible())errors.push(name+' XYZ axis should be collapsed by default');
      if(!viewport.collapsed||viewport.drawer>110)errors.push(name+' default drawer obstructs scene '+viewport.drawer);
      await page.locator('#zoomIn').click();
      await page.locator('#zoomOut').click();
      await page.locator('#sheetToggle').click();
      await page.locator('[data-tab="cost"]').click();
      if(!(await page.locator('#inspector').evaluate(el=>el.classList.contains('expanded'))))
        errors.push(name+' cost tab did not keep drawer expanded');
      const price=await page.locator('#panel').innerText();
      if(!price.includes('Giá công trình')||!price.includes('1.698.502.090'))
        errors.push(name+' public price panel not accessible');
      await page.locator('#sheetToggle').click();
      if(await page.locator('#inspector').evaluate(el=>el.classList.contains('expanded')))
        errors.push(name+' sheet close button failed');
      await page.locator('#sheetToggle').click();
      await page.locator('[data-tab="data"]').click();
      if(!(await page.locator('#panel').innerText()).includes('Danh mục có ảnh'))
        errors.push(name+' catalog not accessible');
      await page.locator('#sheetToggle').click();
      await page.locator('#sheetToggle').click();
      await page.locator('[data-tab="images"]').click();
      if(!(await page.locator('#panel').innerText()).includes('16 nhóm'))
        errors.push(name+' image panel not accessible');
      await page.locator('#sheetToggle').click();
    }else{
      await page.locator('[data-tab="cost"]').click();
      const price=await page.locator('#panel').innerText();
      if(!price.includes('1.698.502.090'))errors.push(name+' public price panel missing');
    }
    // Satellite is a real imagery service, not a fake aerial screenshot.
    const satelliteAction=page.locator('#satelliteToggle');
    if(!(await satelliteAction.count()))errors.push(name+' satellite imagery control absent');
    else{
      if(mobile){await page.locator('#mobileMenuToggle').click();await page.locator('[data-mobile-action="satelliteToggle"]').click()}
      else await satelliteAction.click();
      if(!(await page.locator('#satelliteOverlay').isVisible()))
        errors.push(name+' satellite viewer did not open');
      const esriSrc=await page.locator('#satImg').getAttribute('src');
      if(!esriSrc||!esriSrc.includes('World_Imagery/MapServer'))
        errors.push(name+' no Esri World Imagery URL');
      if(name==='desktop'||name==='mobile-390')
        await page.screenshot({path:'ben-tre-satellite-'+name+'.png'});
      await page.locator('#satClose').click();
    }
    // One opt-in field-photo roundtrip in a real browser. User GPS point is a manual pin.
    if(name==='desktop'||name==='mobile-390'){
      if(mobile){await page.locator('#mobileMenuToggle').click();await page.locator('[data-mobile-action="surveyToggle"]').click()}
      else await page.locator('#surveyToggle').click();
      if(!(await page.locator('#surveyToggle').innerText()).includes('Đang chọn điểm'))
        errors.push(name+' field survey selection not enabled');
      const stageBox=await page.locator('#stage').boundingBox();
      let editorOpen=false;
      for(const [x,y] of [[.50,.50],[.49,.57],[.51,.42]]){
        await page.mouse.click(stageBox.x+stageBox.width*x,stageBox.y+stageBox.height*y);
        await page.waitForTimeout(180);
        if(await page.locator('#surveyOverlay').isVisible()){editorOpen=true;break}
      }
      if(!editorOpen)errors.push(name+' cannot pin ground point within 300m shoreline');
      else{
        const fixture=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
        await page.locator('#surveyImage').setInputFiles({name:'test-ben-tre.png',mimeType:'image/png',buffer:fixture});
        await page.locator('#surveyTitle').fill('Test khảo sát bờ hồ');
        await page.locator('#surveyBearing').fill('90');
        await page.locator('#surveyRights').check();
        await page.locator('#surveySave').click();
        await page.waitForFunction(()=>document.querySelectorAll('.field-marker').length>=1,{timeout:10000});
        const exported=page.waitForEvent('download',{timeout:15000});
        await page.locator('#surveyExport').click();
        const dl=await exported;
        const json=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));
        if(json.schema!=='ben-tre-field-survey-v1'||json.photos.length!==1||
           json.photos[0].heading_deg!==90||!json.photos[0].rights_approved||
           !json.photos[0].image.base64)
          errors.push(name+' exported survey missing bearings, image, or rights');
      }
    }
    // Rejected shape must NOT be shown; OSM geometry is the only active source.
    const state=await page.evaluate(()=>window.TrucGiangWorkbench?.getInfo());
    if(state?.shape!=="raw"||state?.mode!=="3d")
      errors.push(name+' Workbench did not start in source-only mode: '+JSON.stringify(state));
    if(!(await page.locator('[data-wb-shape="candidate"]').isDisabled()))
      errors.push(name+' rejected shoreline must be disabled');
    await page.waitForFunction(()=>window.TrucGiangWorkbench?.getInfo().reviewLoaded===true,{timeout:15000});
    const shoreLinks=await page.locator('#wbReviewPins a[data-issue]').count();
    if(shoreLinks!==4)errors.push(name+' 3D numbered shoreline correction markers missing: '+shoreLinks);
    const sectors=await page.locator('#wbReviewPins a[data-issue]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.issue,href:n.getAttribute('href')})));
    if(!sectors.some(n=>n.id==='north_notch'&&n.href.includes('sector=north_notch'))||
       !sectors.some(n=>n.id==='south_slope'))
      errors.push(name+' 3D marker deep links do not resolve disputed bờ bắc/nam '+JSON.stringify(sectors));
    const openImagery=await page.evaluate(()=>window.BoHoOpenImagery?.status());
    if(!openImagery||!(await page.locator('#open3DToggle').count()))
      errors.push(name+' self-hosted open imagery controller missing');
    if(name==='desktop'){
      await page.waitForFunction(()=>window.BoHoOpenImagery?.status().ready===true,{timeout:12000});
      const openMesh=await page.evaluate(()=>({
        active:BoHoOpenImagery.status().model,
        mesh:!!window.THREE&&!!document.getElementById('webgl'),
        credit:document.getElementById('openImageryCredit')?.textContent.includes('Synthetic test fixture')
      }));
      if(!openMesh.active||!openMesh.mesh||!openMesh.credit)
        errors.push(name+' open 3D georeferenced image/attribution did not activate '+JSON.stringify(openMesh));
      await page.locator('#open3DToggle').click();
      if((await page.evaluate(()=>BoHoOpenImagery.status().model))!==false)
        errors.push(name+' open 3D layer cannot be toggled off');
      await page.locator('#open3DToggle').click();
    }else if(openImagery.ready){
      errors.push(name+' repo must not contain a fabricated real imagery asset');
    }
    const planButton=page.locator('[data-wb-mode="floor"]');
    await planButton.click();await page.waitForTimeout(150);
    if(!(await page.locator('#wbPlanDock').isVisible()))
      errors.push(name+' floorplan not visible');
    const planState=await page.evaluate(()=>({width:document.getElementById('wbPlanCanvas').width,height:document.getElementById('wbPlanCanvas').height}));
    if(!planState.width||!planState.height)
      errors.push(name+' floorplan canvas not rendered '+JSON.stringify(planState));
    if(name==='desktop'||name==='mobile-390')await page.screenshot({path:'ben-tre-floorplan-'+name+'.png'});
    if(!(await page.locator('#wbOpenToggle').count()))errors.push(name+' open imagery Floor Plan toggle missing');
    if(name==='desktop'){
      const planOpen=await page.evaluate(()=>({
        enabled:BoHoOpenImagery.status().plan,
        credit:!document.getElementById('openImageryCredit').hidden,
        width:document.getElementById('wbPlanCanvas').width
      }));
      if(!planOpen.enabled||!planOpen.credit||!planOpen.width)
        errors.push(name+' open imagery geo Plan overlay not active '+JSON.stringify(planOpen));
      await page.locator('#wbOpenToggle').click();
      if((await page.evaluate(()=>BoHoOpenImagery.status().plan))!==false)
        errors.push(name+' open PLAN raster cannot be toggled off');
    }
    // Google Satellite stays opt-in; no API request or key is shipped by default.
    const googleButton=page.locator('#wbGoogleToggle');
    if(!(await googleButton.count()))errors.push(name+' Google Satellite Floor Plan toggle missing');
    else{
      await googleButton.click();
      if(!(await page.locator('#wbGoogleConfig').isVisible()))errors.push(name+' Google setup dialog did not open without key');
      if(await page.locator('script[src^="https://maps.googleapis.com/maps/api/js"]').count())
        errors.push(name+' Google Maps API loaded before user supplied a key');
      await page.locator('#wbGoogleCancel').click();
      if(await page.locator('#wbGoogleConfig').isVisible())errors.push(name+' Google setup dialog cannot close');
      if((await page.evaluate(()=>window.BoHoGoogleSatellite?.getInfo().enabled))!==false)
        errors.push(name+' native Google satellite must stay disabled without key');
    }
    // User-authored Floor Plan error pins are local feedback, not GIS edits.
    if(name==='desktop'||name==='mobile-390'){
      if(!(await page.locator('#wbAnnotationToggle').isVisible()))
        errors.push(name+' annotation button not reachable');
      await page.locator('#wbAnnotationToggle').click();
      if(!(await page.evaluate(()=>window.TrucGiangAnnotations?.getInfo().placing)))
        errors.push(name+' annotation placement mode not enabled');
      const planBox=await page.locator('#wbPlanCanvas').boundingBox();
      await page.mouse.click(planBox.x+planBox.width*.5,planBox.y+planBox.height*.5);
      if(!(await page.locator('#wbAnnFormPage').isVisible()))
        errors.push(name+' tapping Floor Plan did not open annotation editor');
      else{
        await page.locator('#wbAnnType').selectOption('shore');
        await page.locator('#wbAnnTitle').fill('Bờ hồ bị lệch góc');
        await page.locator('#wbAnnDescription').fill('Bờ nam trong hình bị ngang; thực tế nghiêng và có điểm lõm cần kiểm chứng.');
        await page.locator('#wbAnnSave').click();
        if((await page.evaluate(()=>window.TrucGiangAnnotations.getInfo().count))!==1)
          errors.push(name+' annotation not saved locally');
        const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('bdx0:truc-giang:visual-annotations-v1')||'[]'));
        if(saved.length!==1||saved[0].title!=='Bờ hồ bị lệch góc')
          errors.push(name+' annotation localStorage missing user report');
        await page.locator('#wbAnnotationList').click();
        if(!(await page.locator('#wbAnnItems').innerText()).includes('Bờ hồ bị lệch góc'))
          errors.push(name+' annotation list cannot show saved location');
        const exported=page.waitForEvent('download',{timeout:15000});
        await page.locator('#wbAnnExportJSON').click();
        const download=await exported;
        const json=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
        if(json.schema!=='truc-giang-visual-annotations-v1'||
           json.status!=='USER_VISUAL_FEEDBACK_NOT_VERIFIED'||
           json.annotations.length!==1||
           json.annotations[0].verification_status!=='user_visual_observation_not_surveyed'||
           !Number.isFinite(json.annotations[0].x)||
           !Number.isFinite(json.annotations[0].z))
          errors.push(name+' annotation JSON missing coordinates or unverified provenance');
        const snapshot=page.waitForEvent('download',{timeout:15000});
        await page.locator('#wbAnnExportPNG').click();
        const png=await snapshot;
        const magic=fs.readFileSync(await png.path()).subarray(0,8).toString('hex');
        if(magic!=='89504e470d0a1a0a')
          errors.push(name+' annotation PNG export invalid');
        await page.locator('#wbAnnClose').click();
        const sceneAfter=await page.evaluate(async()=>await (await fetch('data/scene.json')).json());
        if(JSON.stringify(sceneAfter.features.find(f=>f.osm_id===217484891)?.geometry)!==
           JSON.stringify(sceneData.features.find(f=>f.osm_id===217484891)?.geometry))
          errors.push(name+' user annotations changed OSM source geometry');
      }
    }
    await page.locator('[data-wb-mode="split"]').click();await page.waitForTimeout(120);
    const split=await page.evaluate(()=>({
      active:document.getElementById('stage').classList.contains('wb-split'),
      dock:document.getElementById('wbPlanDock').getBoundingClientRect().width,
      model:document.getElementById('webgl').getBoundingClientRect().width,
      stage:document.getElementById('stage').getBoundingClientRect().width,
      modelH:document.getElementById('webgl').getBoundingClientRect().height,
      planH:document.getElementById('wbPlanDock').getBoundingClientRect().height,
      stageH:document.getElementById('stage').getBoundingClientRect().height
    }));
    if(!split.active||split.dock<=0||(mobile&&width<=height ? (split.model<split.stage*.95||split.planH<45||Math.abs(split.modelH-split.stageH*.5)>3) : (split.model>=split.stage*.9||split.planH<45)))
      errors.push(name+' split layout incorrect '+JSON.stringify(split));
    if(name==='desktop'||name==='mobile-390')await page.screenshot({path:'ben-tre-split-'+name+'.png'});
    if(mobile)await page.locator('#wbAxisToggle').click();
    await page.locator('[data-wb-view="top"]').click();
    if((await page.evaluate(()=>window.TrucGiangWorkbench.getInfo().view))!=='top')
      errors.push(name+' axis top view incorrect');
    const orientation=await page.evaluate(()=>window.TrucGiangWorkbench.getAlignment());
    if(!orientation||orientation.sceneMirrorZ!==-1||!orientation.topNorthUpEastRight||
       orientation.eastScreenDx<=0.01||orientation.northScreenDy<=0.01||
       Math.abs(orientation.eastScreenDy)>0.005||Math.abs(orientation.northScreenDx)>0.005||
       Math.abs(orientation.compassNorthScreenDeg)>0.5)
      errors.push(name+' true north top view mirrored, rotated or camera/OSM mismatched '+JSON.stringify(orientation));
    if(!(await page.locator('#wbTrueCompass').isVisible()))
      errors.push(name+' True North compass not visible in split mode');
    await page.locator('[data-wb-view="iso"]').click();
    await page.locator('[data-wb-mode="3d"]').click();
    await page.waitForTimeout(180);
    const northControl=page.locator('#wbTrueCompass');
    await northControl.click();
    const tapAlignment=await page.evaluate(()=>window.TrucGiangWorkbench.getAlignment());
    if(!tapAlignment?.topNorthUpEastRight||!tapAlignment?.topMode)
      errors.push(name+' tapping True North compass did not restore georeferenced TOP '+JSON.stringify(tapAlignment));
    await page.locator('[data-wb-view="iso"]').first().evaluate(el=>el.click());
    if(mobile){await page.locator('#mobileMenuToggle').click();await page.locator('[data-mobile-action="dbg"]').click()}
    else await page.locator('#dbg').click();
    const diagnosis=await page.locator('#report').innerText();
    let diag={};
    try{diag=JSON.parse(diagnosis)}catch{}
    const modeOk=diag.webgl===true&&Number(diag.frame)>=3
      &&Number(diag.renderTriangles)>0&&(await page.locator('#webgl').count())===1;
    if(!modeOk)errors.push(name+' WebGL not active: '+diagnosis);
    if(!diag.lakeGeometry||diag.lakeGeometry.shapeMode!=="raw"||diag.lakeGeometry.originalAreaM2<12000||diag.lakeGeometry.visualVertices!==24||Math.abs(diag.lakeGeometry.visualAreaM2-diag.lakeGeometry.originalAreaM2)>1)
      errors.push(name+' source OSM lake geometry not restored: '+JSON.stringify(diag.lakeGeometry));
    const snapshot={name,modeOk,viewport,drawCalls:diag.drawCalls,triangles:diag.renderTriangles,frames:diag.frame,errorLog:diag.errors};
    report.push(snapshot);
    await page.locator('#dbg').click();
    await page.screenshot({path:'ben-tre-'+name+'.png',fullPage:true});
    // Visual CAD/GIS digitization is a separate review layer; source SQLite stays immutable.
    const cad=await ctx.newPage();
    cad.on('pageerror',e=>{console.error('CAD/GIS pageerror '+name+' '+e.message);errors.push(name+' CAD/GIS JS '+e.message)});
    cad.on('console',m=>{if(m.type()==='error')errors.push(name+' CAD/GIS console '+m.text())});
    await cad.goto('http://127.0.0.1:8765/bo-ho-ben-tre/cad-gis.html',{waitUntil:'load',timeout:30000});
    await cad.waitForFunction(()=>window.TrucGiangCadGis?.getInfo().count===311,{timeout:30000});
    const cadState=await cad.evaluate(()=>window.TrucGiangCadGis.getInfo());
    if(cadState.sourceChanged||cadState.shoreVertices<70||cadState.count!==311)
      errors.push(name+' CAD/GIS digitization missing or marked authoritative '+JSON.stringify(cadState));
    if(await cad.locator('#layerList input[type=checkbox]').count()!==11)
      errors.push(name+' CAD/GIS must have 11 toggleable layers');
    await cad.locator('#edit').click();
    if((await cad.locator('#handles circle').count())<70)
      errors.push(name+' CAD/GIS editable shoreline vertices missing');
    if(name==='desktop'||name==='mobile-390'){
      if(mobile)await cad.locator('#openInfo').click();
      console.log('CAD debug pre-export',name,await cad.evaluate(()=>({handler:typeof document.getElementById('candidate').onclick,URL:typeof URL.createObjectURL,points:window.TrucGiangCadGis.candidateRing().length})));
      const candidateWait=cad.waitForEvent('download',{timeout:12000});
      await cad.locator('#candidate').click();
      console.log('CAD clicked export',name);
      const exported=JSON.parse(fs.readFileSync(await (await candidateWait).path(),'utf8'));
      if(exported.schema!=='truc-giang-cad-gis-candidate-v1'||exported.verified!==false||
         exported.ring_image_pixels.length<70)
        errors.push(name+' CAD/GIS export must be unverified valid shoreline candidate');
      const geoWait=cad.waitForEvent('download',{timeout:12000});
      await cad.locator('#geojson').click();
      const geo=JSON.parse(fs.readFileSync(await (await geoWait).path(),'utf8'));
      if(geo.type!=='FeatureCollection'||geo.features.length!==311)
        errors.push(name+' GIS export has lost source visual features');
      const cadWait=cad.waitForEvent('download',{timeout:12000});
      await cad.locator('#dxf').click();
      const dxf=fs.readFileSync(await (await cadWait).path(),'utf8');
      if(!dxf.includes('LWPOLYLINE')||!dxf.includes('SHORELINE')||!dxf.includes('EOF'))
        errors.push(name+' CAD DXF export missing expected vectors');
      await cad.screenshot({path:'ben-tre-cad-gis-'+name+'.png'});
    }
    await cad.close();
    // Open independent SQL browser and validate the snapshot against the real DB counts.
    const explorer=await ctx.newPage();
    explorer.on('pageerror',e=>errors.push(name+' SQLite JS '+e.message));
    await explorer.goto('http://127.0.0.1:8765/bo-ho-ben-tre/sqlite.html',{waitUntil:'load',timeout:30000});
    await explorer.waitForFunction(()=>document.getElementById('loading').classList.contains('hidden'),{timeout:30000});
    const database=await explorer.evaluate(async()=>await (await fetch('data/sqlite-explorer.json')).json());
    const dbTables=database.tables||[];
    if(database.format!=='bdx0-sqlite-inspector-v1'||dbTables.length<14||
       dbTables.find(t=>t.name==='requirements')?.count!==305||
       dbTables.find(t=>t.name==='osm_features')?.count!==sceneData.stats.osm_features)
      errors.push(name+' SQLite explorer source mismatch or incomplete');
    if(!(await explorer.locator('#currentTable').innerText()).includes('osm_features'))
      errors.push(name+' initial osm_features table missing');
    await explorer.locator('#search').fill('217484891');
    if(!(await explorer.locator('#pageMeta').innerText()).includes('/'))
      errors.push(name+' search failed to show filtered count');
    await explorer.locator('#search').fill('');
    if(mobile)await explorer.locator('#mobileSelect').selectOption('requirements');
    else await explorer.locator('#tableNav button').filter({hasText:'requirements'}).click();
    if((await explorer.locator('#recordsBadge').innerText()).includes('305')===false)
      errors.push(name+' requirements row count not visible in SQLite explorer');
    await explorer.locator('#schemaTab').click();
    if(!(await explorer.locator('#schemaView').innerText()).includes('CREATE TABLE'))
      errors.push(name+' DDL/schema not exposed');
    await explorer.locator('#rowsTab').click();
    const tableScroll=explorer.locator('#gridScroll');
    await tableScroll.evaluate(el=>{el.scrollTop=0;el.scrollLeft=0});
    // Keyboard row activation stays reliable on 320px / landscape, where the sticky
    // table header overlaps some scroll-into-view click targets.
    await explorer.locator('#dataGrid tbody tr').first().focus();
    await explorer.keyboard.press('Enter');
    if(!(await explorer.locator('#recordBackdrop').evaluate(el=>el.classList.contains('open'))))
      errors.push(name+' row detail drawer did not open');
    const closeRect=await explorer.locator('#closeRecord').boundingBox();
    if(!closeRect)errors.push(name+' record-close button has no bounding box');
    else await explorer.mouse.click(closeRect.x+closeRect.width/2,closeRect.y+closeRect.height/2);
    if(await explorer.locator('#recordBackdrop').evaluate(el=>el.classList.contains('open')))
      errors.push(name+' tapping record-close position failed');
    if(name==='desktop'||name==='mobile-390')await explorer.screenshot({path:'ben-tre-sqlite-'+name+'.png'});
    await explorer.close();
    // Domain-oriented human-readable model (not a raw SQL table browser).
    const model=await ctx.newPage();
    model.on('pageerror',e=>errors.push(name+' Model JS '+e.message));
    model.on('console',e=>{if(e.type()==='error')errors.push(name+' Model console '+e.text())});
    await model.goto('http://127.0.0.1:8765/bo-ho-ben-tre/model.html',{waitUntil:'load',timeout:30000});
    await model.waitForFunction(()=>document.getElementById('loading').hidden,{timeout:30000});
    if(!(await model.locator('#detailContent').textContent()).includes('Hồ Trúc Giang'))
      errors.push(name+' semantic lake entity not displayed');
    if(!(await model.locator('#detailContent').textContent()).includes('Đường bao chưa đạt xác minh'))
      errors.push(name+' disputed shoreline verification warning hidden');
    if((await model.locator('#nRoad').innerText())!=='159'||
       (await model.locator('#nRequirement').innerText())!=='305')
      errors.push(name+' incorrect semantic category counts');
    let modelMap=await model.locator('#map').evaluate(e=>({width:e.width,height:e.height,cssWidth:e.getBoundingClientRect().width,viewport:window.innerWidth}));
    if(modelMap.width<100||modelMap.height<80||modelMap.cssWidth>modelMap.viewport+1)
      errors.push(name+' model floorplan not rendered '+JSON.stringify(modelMap));
    const reviewState=await model.evaluate(()=>window.TrucGiangReview?.state());
    if(!reviewState||reviewState.items.length!==4||reviewState.source!=="OSM way 217484891"||
       reviewState.applied_to_database!==false||
       reviewState.items.some(x=>!x.ring_indices||x.ring_indices.length<5))
      errors.push(name+' review overlay missing exact OSM ring sector boundaries '+JSON.stringify(reviewState));
    if(await model.locator('#shoreReviewBar [data-shore]').count()!==4)
      errors.push(name+' visible four sector tabs missing');
    const reviewPage=await ctx.newPage();
    await reviewPage.goto('http://127.0.0.1:8765/bo-ho-ben-tre/model.html?sector=east_curve#osm-way-217484891',{waitUntil:'load'});
    await reviewPage.waitForFunction(()=>document.getElementById('loading').hidden,{timeout:30000});
    if((await reviewPage.evaluate(()=>window.TrucGiangReview?.state().selected))!=="east_curve")
      errors.push(name+' deep-linked 3D marker did not select the corresponding east shoreline section');
    await reviewPage.close();
    if(name==='desktop'||name==='mobile-390')
      await model.screenshot({path:'ben-tre-shoreline-outline-'+name+'.png'});
    await model.locator('#shoreReviewBar [data-shore="south_slope"]').click();
    if((await model.evaluate(()=>TrucGiangReview.state().selected))!=="south_slope")
      errors.push(name+' shoreline sector selection failed');
    if(name==='desktop'||name==='mobile-390'){
      await model.locator('#shoreReviewBar .shore-review-open').click();
      await model.locator('#shoreReviewDecision').selectOption('needs_change');
      await model.locator('#shoreReviewDelta').evaluate(el=>{
         el.value="12";el.dispatchEvent(new Event('input',{bubbles:true}))
      });
      await model.locator('#shoreReviewNote').fill('Bờ nam có góc chuyển hướng; đánh dấu trực quan, chưa đo GPS.');
      await model.locator('#shoreSaveReview').click();
      const output=await model.locator('#shoreReviewDeltaLabel').innerText();
      if(!output.includes('+12 m'))
        errors.push(name+' preview shift not shown');
      const exp=model.waitForEvent('download',{timeout:10000});
      await model.locator('#shoreExportReviews').click();
      const reviewFile=await exp;
      const json=JSON.parse(fs.readFileSync(await reviewFile.path(),'utf8'));
      if(json.schema!=='truc-giang-shore-review-v1'||
         json.status!=='USER_VISUAL_REVIEW_NOT_SURVEYED'||
         json.reviews.find(x=>x.sector_id==='south_slope')?.delta!==12)
        errors.push(name+' exported preview improperly labeled or not persisted');
      // Closing review is only a visual annotation, never changes the model's OSM geometry.
      const after=await model.evaluate(async()=>await (await fetch('data/model-view.json')).json());
      if(after.lake_audit.verified_corrections!==0||after.lake_audit.status!=='conflict_unresolved')
        errors.push(name+' changed authoritative lake geometry without verification');
      if(width<=760)await model.locator('#detailClose').click();
    }
    await model.locator('#shoreReviewBar [data-shore="north_notch"]').click();
    if((await model.evaluate(()=>TrucGiangReview.state().selected))!=="north_notch")
      errors.push(name+' returning to north bank review failed');
    const firstRelation=model.locator('#detailContent .related button').first();
    if(await firstRelation.count()){
      await firstRelation.focus();
      await model.keyboard.press('Enter');
      if(!(await model.locator('#detailContent').textContent()).includes('Hồ Trúc Giang'))
        warnings.push(name+' relation resolved to unexpected object');
    }else errors.push(name+' domain entity relationship not displayed');
    await model.locator('#search').fill('Bến Tre');
    if((await model.locator('#listCount').innerText()).includes('đối tượng')===false)
      errors.push(name+' modeled entities search not responding');
    await model.locator('#search').fill('');
    await model.locator('#kinds button').filter({hasText:'Nhà'}).click();
    if(!(await model.locator('#listCount').innerText()).includes('16 đối tượng'))
      errors.push(name+' modeled building object group not readable');
    await model.locator('#kinds button').filter({hasText:'Hồ nước'}).click();
    if(!(await model.locator('#listCount').innerText()).includes('1 đối tượng'))
      errors.push(name+' lake filtered map item not visible');
    const stats=await model.evaluate(()=>({
      scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth,
      screenHeight:document.documentElement.scrollHeight,innerHeight:window.innerHeight
    }));
    if(stats.scrollWidth>stats.innerWidth+1||stats.screenHeight>stats.innerHeight+1)
      errors.push(name+' semantic model viewport overflow '+JSON.stringify(stats));
    if(name==='desktop'||name==='mobile-390'){
      await model.goto('http://127.0.0.1:8765/bo-ho-ben-tre/model.html?survey-check=1#osm-way-217484891',{waitUntil:'load'});
      await model.waitForFunction(()=>document.getElementById('loading').hidden);
      await model.locator('#kinds button').filter({hasText:'Hồ nước'}).click();
      await model.locator('#list .node-item').first().click();
      const add= model.locator('.shore-actions button').filter({hasText:'Nhập mốc tọa độ'}).first();
      await add.click();
      await model.locator('.shore-form input[name="lat"]').fill('10.23861');
      await model.locator('.shore-form input[name="lon"]').fill('106.37814');
      await model.locator('.shore-form textarea[name="notes"]').fill('Mốc thử nghiệm từ máy GPS, chưa xác minh');
      await model.locator('.shore-form button[type="submit"]').click();
      if(!(await model.locator('.shore-results').innerText()).includes('1 điểm tọa độ'))
        errors.push(name+' independent shoreline control not retained locally');
      const exportWait=model.waitForEvent('download',{timeout:10000});
      await model.locator('.shore-actions button').filter({hasText:'Xuất mốc JSON'}).first().click();
      const file=await exportWait;
      const points=JSON.parse(fs.readFileSync(await file.path(),'utf8'));
      if(points.schema!=='truc-giang-shoreline-ground-controls-v1'||points.points[0].verification_status!=='self_reported_unreviewed')
        errors.push(name+' shoreline ground control JSON mislabels verification status');
    }
    if(width<=760){
      const visible=await model.locator('#details').evaluate(el=>el.classList.contains('open'));
      if(!visible)await model.locator('#list .node-item').first().click();
      if(!(await model.locator('#details').evaluate(el=>el.classList.contains('open'))))
        errors.push(name+' tap modeled object did not open narrow-screen details');
    }
    if(name==='desktop'||name==='mobile-390')
      await model.screenshot({path:'ben-tre-model-'+name+'.png'});
    await model.close();
    await ctx.close();
  }
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
fs.writeFileSync('ben-tre-smoke-report.json',JSON.stringify({report,errors,warnings},null,2));
console.log(JSON.stringify({report,errors,warnings},null,2));
if(errors.length)process.exit(1);
