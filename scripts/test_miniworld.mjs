import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
const server=spawn("python3",["-m","http.server","8765","--bind","127.0.0.1"],{stdio:"ignore"});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const modes=[{name:"desktop",viewport:{width:1366,height:820},isMobile:false},{name:"mobile",viewport:{width:390,height:844},isMobile:true}];
const scenes=[{file:"little-tokyo.html",night:"#day",regen:null},{file:"tiny-town.html",night:"#night",regen:"#generate"}];
const reports=[];let browser;
try{
 await wait(1100);
 browser=await chromium.launch({headless:true,args:["--enable-webgl","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--disable-dev-shm-usage"]});
 for(const scene of scenes) for(const mode of modes){
   const context=await browser.newContext({viewport:mode.viewport,deviceScaleFactor:1,isMobile:mode.isMobile,hasTouch:mode.isMobile,acceptDownloads:true});
   const page=await context.newPage();
   const problems=[];
   page.on("pageerror",e=>problems.push("JS: "+String(e.stack||e)));
   page.on("console",e=>{if(e.type()==="error")problems.push("CONSOLE: "+e.text());});
   page.on("requestfailed",r=>problems.push("NETWORK: "+r.url()+" "+String(r.failure()?.errorText)));
   const url="http://127.0.0.1:8765/"+scene.file;
   let loaded=false;
   try{
     const response=await page.goto(url,{waitUntil:"load",timeout:45000});
     loaded=response.status()===200;
     await page.waitForFunction(()=>!!window.__MiniWorldInstance&&window.__MiniWorldInstance.renderer.info.render.triangles>50,null,{timeout:45000});
   }catch(e){problems.push("LOAD: "+String(e));}
   const state=await page.evaluate(()=>{
     const c=document.querySelector("#viewport canvas");
     const app=window.__MiniWorldInstance;
     let pixelVar=0;
     if(c){
       const test=document.createElement("canvas");test.width=64;test.height=64;
       const ctx=test.getContext("2d");ctx.drawImage(c,0,0,64,64);
       const colors=new Set(),data=ctx.getImageData(0,0,64,64).data;
       for(let i=0;i<data.length;i+=16){colors.add([data[i],data[i+1],data[i+2],data[i+3]].join(","));}
       pixelVar=colors.size;
     }
     return {canvas:!!c,size:c?[c.width,c.height]:[],three:!!window.THREE,version:window.THREE?.REVISION,triangles:app?.renderer.info.render.triangles||0,calls:app?.renderer.info.render.calls||0,pixelVar,fault:document.querySelector("#fault")?.textContent||"",bodyWidth:document.body.scrollWidth,viewportWidth:innerWidth};
   });
   if(loaded&&state.triangles>50){
     await page.locator(scene.night).click();
     await page.locator("#pause").click();
     await page.locator("#reset").click();
     await page.locator("#plus").click();
     await page.locator("#minus").click();
     if(scene.regen){
       await page.locator("#density").fill("92");
       await page.locator(scene.regen).click();
       await page.waitForTimeout(1500);
     }
   }
   await page.screenshot({path:"miniworld-"+scene.file.replace(".html","")+"-"+mode.name+".png"}).catch(e=>problems.push("SCREENSHOT: "+String(e)));
   const pass=loaded&&state.canvas&&state.three&&state.triangles>50&&state.calls>20&&state.pixelVar>10&&!state.fault&&state.bodyWidth<=mode.viewport.width+2&&!problems.some(p=>p.startsWith("JS:")||p.startsWith("LOAD:"));
   reports.push({scene:scene.file,mode:mode.name,pass,state,problems});
   console.log(JSON.stringify(reports.at(-1)));
   await context.close();
 }
}catch(e){reports.push({fatal:String(e.stack||e),pass:false});console.error(e);}
finally{
 if(browser)await browser.close().catch(()=>{});
 server.kill("SIGTERM");
 await fs.writeFile("miniworld-smoke.json",JSON.stringify(reports,null,2));
 console.log("MiniWorld result:",reports.length===4&&reports.every(x=>x.pass)?"PASS":"FAIL");
 if(reports.length!==4||reports.some(x=>!x.pass))process.exitCode=1;
}