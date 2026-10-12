import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{stdio:'ignore'});
const errors=[];
const report=[];
await new Promise(r=>setTimeout(r,1500));
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-web-security']});
 for(const mode of ['desktop','mobile']){
  const mobile=mode==='mobile';
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1400,height:900},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(mode+' JS '+e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(mode+' console '+m.text())});
  await page.goto('http://127.0.0.1:8765/bo-ho-ben-tre/',{waitUntil:'load',timeout:45000});
  await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('305'),{timeout:30000});
  await page.waitForTimeout(4000);
  await page.locator('#dbg').click();
  const diagnostic=await page.locator('#report').innerText();
  let values={};try{values=JSON.parse(diagnostic)}catch{}
  const status=await page.locator('#status').innerText();
  const modeOk=(await page.locator('#webgl').count())===1 && values.webgl===true && Number(values.frame)>=3;
  const content=await page.locator('#stage').evaluate(el=>[el.clientWidth,el.clientHeight]);
  report.push({mode,modeOk,status,viewport:content,values,errors:errors.slice()});
  await page.screenshot({path:'ben-tre-'+mode+'.png',fullPage:true});
  await page.locator('#dbg').click();
  await page.locator('[data-tab="cost"]').click();
  const price=await page.locator('#panel').innerText();
  if(!price.includes('Giá / chi phí'))errors.push(mode+' Price panel is missing');
  if(!modeOk)errors.push(mode+' WebGL canvas missing or not rendering '+diagnostic);
  await context.close();
 }
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
fs.writeFileSync('ben-tre-smoke-report.json',JSON.stringify({report,errors},null,2));
console.log(JSON.stringify({report:report.map(x=>({mode:x.mode,modeOk:x.modeOk,status:x.status,viewport:x.viewport,frames:x.values.frame,triangles:x.values.renderTriangles})),errors},null,2));
if(errors.length)process.exit(1);
