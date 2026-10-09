import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{stdio:['ignore','pipe','pipe']});
const report=['# NEXUS 3D — Playwright runtime report','', 'Commit: '+(process.env.GITHUB_SHA||'local'), ''];
const records=[];let browser;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 await sleep(1500);
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const mode of [{name:'desktop',viewport:{width:1366,height:850},isMobile:false},{name:'mobile',viewport:{width:390,height:844},isMobile:true}]){
  const context=await browser.newContext({viewport:mode.viewport,isMobile:mode.isMobile,hasTouch:mode.isMobile,deviceScaleFactor:1});
  const page=await context.newPage();const issues=[],network=[];let nav='';
  page.on('pageerror',e=>issues.push('PAGE ERROR: '+e.stack));
  page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')issues.push('CONSOLE '+m.type()+': '+m.text().slice(0,900));});
  page.on('requestfailed',r=>network.push(r.url()+' => '+r.failure()?.errorText));
  try{const response=await page.goto('http://127.0.0.1:8765/future-house-3d.html',{waitUntil:'load',timeout:20000});nav='HTTP '+response.status();}catch(e){issues.push('NAV '+String(e));}
  await sleep(3000);
  const before=await page.evaluate(()=>{
   const canvas=document.querySelector('#sceneHost canvas'),loader=document.querySelector('#loader'),status=document.querySelector('#loadStatus');
   const gl=canvas?.getContext('webgl2')||canvas?.getContext('webgl');
   return {title:document.title,hasThree:!!window.THREE,archvizAddon:typeof window.NEXUS_ARCHVIZ==='function',version:window.THREE?.REVISION,canvas:!!canvas,canvasSize:canvas?[canvas.width,canvas.height]:null,webgl:!!gl,loader:loader?.className,loaderMessage:status?.textContent,viewport:[innerWidth,innerHeight]};
  });
  try{await page.locator('#debugBtn').click();await page.waitForFunction(()=>document.querySelector('#debug')?.textContent.includes('Triangles:'),{timeout:20000});}catch(e){issues.push('DEBUG BTN: '+String(e));}
  const debug=await page.locator('#debug').textContent().catch(e=>'Could not read debug: '+String(e));
  try{await page.locator('#dayBtn').click();await page.locator('#explodeBtn').click();await page.locator('#xrayBtn').click();await sleep(500);}catch(e){issues.push('BUTTON: '+String(e));}
  const after=await page.evaluate(()=>({night:document.querySelector('#dayBtn')?.getAttribute('aria-pressed'),explode:document.querySelector('#explodeBtn')?.getAttribute('aria-pressed'),xray:document.querySelector('#xrayBtn')?.getAttribute('aria-pressed')}));
  await page.locator('#tourBtn').click();await sleep(300);
  const tour=await page.locator('#tourBtn').getAttribute('aria-pressed');
  await page.locator('#walkBtn').click();await sleep(300);
  const walk=await page.locator('#walkBtn').getAttribute('aria-pressed');
  const tourStopped=await page.locator('#tourBtn').getAttribute('aria-pressed');
  await page.keyboard.down('w');await sleep(200);await page.keyboard.up('w');
  await page.screenshot({path:'nexus-'+mode.name+'-walkthrough.png',fullPage:true});
  await page.locator('#walkBtn').click();await sleep(200);
  await page.screenshot({path:'nexus-'+mode.name+'.png',fullPage:true});
  const pass=before.hasThree&&before.archvizAddon&&before.canvas&&before.webgl&&before.loader==='hidden'&&/Triangles:\s*[1-9]/.test(debug||'')&&after.night==='true'&&after.explode==='true'&&after.xray==='true'&&tour==='true'&&walk==='true'&&tourStopped==='false'&&issues.filter(i=>i.startsWith('PAGE ERROR')).length===0;
  report.push('## '+mode.name+' — '+(pass?'PASS':'FAIL'),'','- Navigation: '+nav,'- Readiness: '+JSON.stringify(before),'- Controls: '+JSON.stringify(after),'- Tour: '+tour+'; Walk: '+walk+'; Tour stopped on walk: '+tourStopped,'- Debug:\n~~~text\n'+String(debug).slice(0,3000)+'\n~~~','- Browser errors:\n~~~text\n'+(issues.join('\n').slice(0,4000)||'none')+'\n~~~','- Network errors:\n~~~text\n'+(network.join('\n').slice(0,2000)||'none')+'\n~~~','');
  records.push({mode:mode.name,pass});await context.close();
 }
}catch(e){report.push('Fatal test harness error:\n~~~\n'+String(e.stack||e)+'\n~~~');records.push({mode:'fatal',pass:false});}
finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');report.push('RESULT: '+(records.length===2&&records.every(r=>r.pass)?'PASS':'FAIL'));await fs.writeFile('nexus-smoke-report.md',report.join('\n'));console.log(report.join('\n'));process.exitCode=records.length===2&&records.every(r=>r.pass)?0:1;}
