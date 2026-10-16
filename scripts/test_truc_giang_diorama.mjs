import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','8778','--bind','127.0.0.1'],{stdio:'ignore'});
const rows=[];
let browser;
try {
  await new Promise(r=>setTimeout(r,1200));
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  for(const mode of [
    {name:'desktop',viewport:{width:1440,height:900},mobile:false},
    {name:'mobile',viewport:{width:390,height:844},mobile:true},
    {name:'small',viewport:{width:320,height:690},mobile:true}
  ]) {
    const ctx=await browser.newContext({viewport:mode.viewport,isMobile:mode.mobile,hasTouch:mode.mobile,deviceScaleFactor:1});
    const page=await ctx.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push('JS: '+String(e)));
    page.on('requestfailed',r=>errors.push('NETWORK: '+r.url()+' '+(r.failure()?.errorText||'')));
    page.on('console',e=>{if(e.type()==='error')errors.push('CONSOLE: '+e.text());});
    let response;
    try {
      response=await page.goto('http://127.0.0.1:8778/ho-truc-giang-diorama.html',{waitUntil:'load',timeout:30000});
      await page.waitForFunction(()=>window.__trucGiangDiorama?.stats()?.triangles>3000,null,{timeout:30000});
      await page.waitForTimeout(800);
    }catch(e){errors.push('LOAD: '+String(e));}
    const before=await page.evaluate(()=>{
      const m=window.__trucGiangDiorama,s=m?.stats();
      const c=document.querySelector('#stage>canvas');
      let coverage=0,unique=0;
      if(c){
        const t=document.createElement('canvas');t.width=t.height=64;
        const cx=t.getContext('2d');cx.drawImage(c,0,0,64,64);
        const data=cx.getImageData(0,0,64,64).data,colors=new Set();
        for(let i=0;i<data.length;i+=4){
          if(data[i+3]>50&&data[i]+data[i+1]+data[i+2]>35)coverage++;
          if(i%80===0)colors.add(data.slice(i,i+4).join(':'));
        }
        unique=colors.size;
      }
      return {stats:s,canvas:!!c,coverage,unique,overflow:document.documentElement.scrollWidth-innerWidth,
        fault:document.getElementById('fault').textContent,
        missingImages:document.querySelectorAll('img:not([src])').length};
    });
    if(before.stats) {
      await page.locator('#night').click();
      await page.locator('#orbit').click();
      await page.locator('#top').click();
      await page.locator('#zoomIn').click();
      await page.locator('#zoomOut').click();
      await page.locator('#helpBtn').click();
      await page.waitForTimeout(700);
    }
    const after=await page.evaluate(()=>({
      night:document.body.classList.contains('night'),
      orbit:window.__trucGiangDiorama?.stats()?.spin,
      infoOpen:!document.getElementById('info').hidden,
      pitch:window.__trucGiangDiorama?.stats()?.pitch
    }));
    await page.screenshot({path:'truc-giang-diorama-'+mode.name+'.png'}).catch(e=>errors.push('SCREENSHOT: '+e));
    const pass=response?.status()===200&&before.canvas&&before.stats?.triangles>3000&&
      before.stats?.drawCalls>150&&before.stats?.trees>=55&&before.stats?.buildings>=18&&
      before.unique>20&&before.coverage>200&&before.overflow<=2&&
      !before.fault&&after.night&&after.orbit&&after.infoOpen&&after.pitch>1.3&&
      !errors.some(e=>/^JS:|^NETWORK:|^LOAD:/.test(e));
    rows.push({mode:mode.name,pass,http:response?.status(),before,after,errors});
    console.log(JSON.stringify(rows.at(-1)));
    await ctx.close();
  }
} catch(e) {
  console.error(e);rows.push({pass:false,error:String(e.stack||e)});
} finally {
  if(browser)await browser.close().catch(()=>{});
  server.kill('SIGTERM');
  await fs.writeFile('truc-giang-diorama-smoke.json',JSON.stringify(rows,null,2));
  if(rows.length!==3||rows.some(r=>!r.pass))process.exitCode=1;
  console.log('TRUC GIANG DIORAMA',rows.length===3&&rows.every(r=>r.pass)?'PASS':'FAIL');
}