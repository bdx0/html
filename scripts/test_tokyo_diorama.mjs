import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
const server=spawn('python3',['-m','http.server','8766','--bind','127.0.0.1'],{stdio:'ignore'});
const checks=[];let browser;
try{
 await new Promise(r=>setTimeout(r,1200));
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 for(const mode of [{name:'desktop',viewport:{width:1440,height:900},isMobile:false},{name:'mobile',viewport:{width:390,height:844},isMobile:true}]){
  const ctx=await browser.newContext({viewport:mode.viewport,isMobile:mode.isMobile,hasTouch:mode.isMobile,deviceScaleFactor:1});const page=await ctx.newPage();const errors=[];
  page.on('pageerror',e=>errors.push('PAGE ERROR '+String(e)));
  page.on('console',e=>{if(e.type()==='error')errors.push('CONSOLE '+e.text());});
  page.on('requestfailed',r=>errors.push('NETWORK '+r.url()+' '+r.failure()?.errorText));
  let response;
  try{response=await page.goto('http://127.0.0.1:8766/little-tokyo-rare3d-inspired.html',{timeout:30000});await page.waitForFunction(()=>window.__tokyoDiorama?.stats()?.triangles>3000,null,{timeout:45000});await page.waitForTimeout(1200);}catch(e){errors.push('LOAD '+String(e));}
  const before=await page.evaluate(()=>{
    const d=window.__tokyoDiorama,c=document.querySelector('#stage > canvas');
    let unique=0,coverage=0;
    if(c){const t=document.createElement('canvas');t.width=t.height=64;const ctx=t.getContext('2d');ctx.drawImage(c,0,0,64,64);
      const raw=ctx.getImageData(0,0,64,64).data,u=new Set();
      for(let i=0;i<raw.length;i+=4){if(raw[i+3]>50)coverage++;if(i%48===0)u.add([raw[i],raw[i+1],raw[i+2],raw[i+3]].join(':'));}
      unique=u.size;
    }
    return {canvas:!!c,stats:d?.stats()||null,unique,coverage,error:document.getElementById('error').textContent,scrollWidth:document.body.scrollWidth,viewport:innerWidth};
  });
  if(before.stats){
    await page.locator('#dayNight').click();await page.locator('#orbit').click();await page.locator('#front').click();
    await page.locator('#zoomIn').click();await page.locator('#zoomOut').click();await page.locator('#debugButton').click();
  }
  const after=await page.evaluate(()=>({night:document.body.classList.contains('night'),spin:window.__tokyoDiorama?.stats()?.spin,debugShown:!document.getElementById('debug').hidden}));
  await page.screenshot({path:'tokyo-diorama-'+mode.name+'.png'}).catch(e=>errors.push('SCREENSHOT '+e));
  const pass=response?.status()===200&&before.stats?.triangles>3000&&before.stats?.drawCalls>100&&before.unique>25&&before.coverage>150&&before.scrollWidth<=mode.viewport.width+2&&!before.error&&after.night&&!after.spin&&after.debugShown&&!errors.some(x=>x.startsWith('PAGE ERROR')||x.startsWith('LOAD'));
  const result={mode:mode.name,pass,http:response?.status(),before,after,errors};checks.push(result);console.log(JSON.stringify(result));await ctx.close();
 }
}catch(e){console.error(e);checks.push({fatal:String(e.stack||e),pass:false});}
finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');await fs.writeFile('tokyo-diorama-smoke.json',JSON.stringify(checks,null,2));console.log('Diorama test:',checks.length===2&&checks.every(x=>x.pass)?'PASS':'FAIL');if(checks.length!==2||checks.some(x=>!x.pass))process.exitCode=1;}
