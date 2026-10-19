import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const port=8792;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
const report=[];let browser;
try{
  await new Promise(r=>setTimeout(r,1100));
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  for(const mode of [
    {name:'desktop',viewport:{width:1366,height:900},mobile:false},
    {name:'mobile',viewport:{width:390,height:844},mobile:true},
    {name:'small',viewport:{width:320,height:690},mobile:true}
  ]){
    const context=await browser.newContext({viewport:mode.viewport,isMobile:mode.mobile,hasTouch:mode.mobile,acceptDownloads:true});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push('pageerror: '+String(e)));
    page.on('console',e=>{if(e.type()==='error')errors.push('console: '+e.text())});
    page.on('requestfailed',r=>errors.push('network: '+r.url()));
    let status;
    try{
      const response=await page.goto('http://127.0.0.1:'+port+'/bo-ho-ben-tre/object-review.html',{timeout:30000});
      status=response?.status();
      await page.waitForFunction(()=>window.__TrucGiangObjectReview?.getStats()?.objects>=400,{timeout:30000});
    }catch(e){errors.push('load: '+String(e));}
    let before=await page.evaluate(()=>({
      stat:window.__TrucGiangObjectReview?.getStats(),
      candrawn:document.querySelectorAll('#cadShapes .feature').length,
      osmdrawn:document.querySelectorAll('#osmShapes .feature').length,
      horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2,
      dataError:document.getElementById('status').textContent,
    }));
    await page.screenshot({path:'object-review-initial-'+mode.name+'.png'}).catch(e=>errors.push('shot: '+e));
    if(before.stat){
      await page.locator('#compareMode').click();
      await page.locator('#editGeometry').click();
      const handles=await page.locator('#cadHandles .vertex').count();
      if(handles<12)errors.push('no editable lake handles: '+handles);
      if(mode.mobile){
        await page.locator('#mobileObjects').click();
        const sheet=await page.evaluate(()=>document.getElementById('catalog').classList.contains('mobileOpen'));
        if(!sheet)errors.push('Mobile object sheet failed to open');
        await page.locator('#mobileFields').click();
        const fields=await page.evaluate(()=>document.getElementById('inspector').classList.contains('mobileOpen'));
        if(!fields)errors.push('Mobile parameter sheet failed to open');
      }
      const num=page.locator('#parameterFields input[type=number]').first();
      await num.fill('3.2');
      const downloadPromise=page.waitForEvent('download',{timeout:16000});
      await page.locator('#approve').click();
      let downloaded;try{downloaded=await downloadPromise;}catch(e){errors.push('no review JSON export: '+String(e));}
      const approveState=await page.evaluate(()=>window.__TrucGiangObjectReview?.getStats());
      await page.reload();
      await page.waitForFunction(()=>window.__TrucGiangObjectReview?.getStats()?.objects>=400);
      const after=await page.evaluate(()=>({stat:window.__TrucGiangObjectReview?.getStats(),history:document.querySelectorAll('#history .log').length,overflow:document.documentElement.scrollWidth-innerWidth, status:document.getElementById('status').textContent,heading:window.TrucGiangCadNorth?.get()}));
      await page.screenshot({path:'object-review-after-'+mode.name+'.png'}).catch(e=>errors.push('shot2: '+e));
      const passed=status===200&&before.stat.objects>400&&before.candrawn>=250&&before.osmdrawn>150
        &&handles>=12&&approveState.events>=1&&after.stat.events>=1&&after.history>=1
        &&after.overflow<=2&&!errors.length;
      report.push({mode:mode.name,pass:passed,http:status,before,handles,approveState,download:downloaded?.suggestedFilename(),after,errors});
    }else report.push({mode:mode.name,pass:false,http:status,before,errors});
    console.log(JSON.stringify(report.at(-1)));
    await context.close();
  }
}catch(e){report.push({fatal:String(e.stack||e),pass:false});console.error(e);}
finally{
  if(browser)await browser.close().catch(()=>{});
  server.kill('SIGTERM');
  await fs.writeFile('object-review-smoke.json',JSON.stringify(report,null,2));
  const pass=report.length===3&&report.every(x=>x.pass);
  console.log('OBJECT REVIEW SMOKE:',pass?'PASS':'FAIL');
  if(!pass)process.exitCode=1;
}
