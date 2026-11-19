'use strict';
const CACHE='vuon-chu-cai-exploration-v7';
const url=p=>new URL(p,self.location.href).href;
const GAME=url('./vuon-chu-cai.html');
const ASSETS=[GAME,url('./assets/three.min.js'),url('./vuon-chu-cai.webmanifest'),url('./assets/vuon-chu-cai-192.png'),url('./assets/vuon-chu-cai-512.png')];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(ASSETS.map(u=>new Request(u,{cache:'reload'})));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const k of await caches.keys())if(k.startsWith('vuon-chu-cai-exploration-')&&k!==CACHE)await caches.delete(k);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const r=event.request;if(r.method!=='GET')return;
 const u=new URL(r.url);if(u.origin!==self.location.origin)return;
 const canonical=u.origin+u.pathname;
 if(r.mode==='navigate'&&canonical!==GAME)return;
 if(!ASSETS.includes(canonical))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(canonical===GAME||canonical.endsWith('.webmanifest')){
   try{const response=await fetch(r);if(response.ok){await cache.put(canonical,response.clone());return response;}return (await cache.match(canonical))||response;}
   catch(error){const saved=await cache.match(canonical);if(saved)return saved;throw error;}
  }
  const cached=await cache.match(canonical);if(cached)return cached;
  const response=await fetch(r);if(response.ok)await cache.put(canonical,response.clone());return response;
 })());
});