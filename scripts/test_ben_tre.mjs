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
      if(!viewport.collapsed||viewport.drawer>110)errors.push(name+' default drawer obstructs scene '+viewport.drawer);
      await page.locator('#zoomIn').click();
      await page.locator('#zoomOut').click();
      await page.locator('[data-open-tab="cost"]').click();
      if(!(await page.locator('#inspector').evaluate(el=>el.classList.contains('expanded'))))
        errors.push(name+' quick cost button did not expand drawer');
      const price=await page.locator('#panel').innerText();
      if(!price.includes('Giá công trình')||!price.includes('1.698.502.090'))
        errors.push(name+' public price panel not accessible');
      await page.locator('#sheetToggle').click();
      if(await page.locator('#inspector').evaluate(el=>el.classList.contains('expanded')))
        errors.push(name+' sheet close button failed');
      await page.locator('[data-open-tab="data"]').click();
      if(!(await page.locator('#panel').innerText()).includes('Danh mục có ảnh'))
        errors.push(name+' catalog not accessible');
      await page.locator('#sheetToggle').click();
      await page.locator('[data-open-tab="images"]').click();
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
      await satelliteAction.click();
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
      await page.locator('#surveyToggle').click();
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
    const planButton=page.locator('[data-wb-mode="floor"]');
    await planButton.click();await page.waitForTimeout(150);
    if(!(await page.locator('#wbPlanDock').isVisible()))
      errors.push(name+' floorplan not visible');
    const planState=await page.evaluate(()=>({width:document.getElementById('wbPlanCanvas').width,height:document.getElementById('wbPlanCanvas').height}));
    if(!planState.width||!planState.height)
      errors.push(name+' floorplan canvas not rendered '+JSON.stringify(planState));
    if(name==='desktop'||name==='mobile-390')await page.screenshot({path:'ben-tre-floorplan-'+name+'.png'});
    await page.locator('[data-wb-mode="split"]').click();await page.waitForTimeout(120);
    const split=await page.evaluate(()=>({
      active:document.getElementById('stage').classList.contains('wb-split'),
      dock:document.getElementById('wbPlanDock').getBoundingClientRect().width,
      model:document.getElementById('webgl').getBoundingClientRect().width,
      stage:document.getElementById('stage').getBoundingClientRect().width
    }));
    if(!split.active||split.dock<=0||split.model>=split.stage*.9)
      errors.push(name+' split layout incorrect '+JSON.stringify(split));
    if(name==='desktop'||name==='mobile-390')await page.screenshot({path:'ben-tre-split-'+name+'.png'});
    await page.locator('[data-wb-view="top"]').click();
    if((await page.evaluate(()=>window.TrucGiangWorkbench.getInfo().view))!=='top')
      errors.push(name+' axis top view incorrect');
    await page.locator('[data-wb-view="iso"]').click();
    await page.locator('[data-wb-mode="3d"]').click();
    await page.waitForTimeout(180);
    await page.locator('#dbg').click();
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
    await explorer.locator('#dataGrid tbody tr').first().click();
    if(!(await explorer.locator('#recordBackdrop').evaluate(el=>el.classList.contains('open'))))
      errors.push(name+' row detail drawer did not open');
    const closeRect=await explorer.locator('#closeRecord').boundingBox();
    if(!closeRect)errors.push(name+' record-close button has no bounding box');
    else await explorer.mouse.click(closeRect.x+closeRect.width/2,closeRect.y+closeRect.height/2);
    if(await explorer.locator('#recordBackdrop').evaluate(el=>el.classList.contains('open')))
      errors.push(name+' tapping record-close position failed');
    if(name==='desktop'||name==='mobile-390')await explorer.screenshot({path:'ben-tre-sqlite-'+name+'.png'});
    await explorer.close();
    await ctx.close();
  }
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
fs.writeFileSync('ben-tre-smoke-report.json',JSON.stringify({report,errors,warnings},null,2));
console.log(JSON.stringify({report,errors,warnings},null,2));
if(errors.length)process.exit(1);
