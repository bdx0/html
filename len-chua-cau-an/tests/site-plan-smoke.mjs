#!/usr/bin/env node
/**
 * Static temple-regression checks. Run from repo root:
 *   node len-chua-cau-an/tests/site-plan-smoke.mjs
 * Does NOT test a real WebGL renderer or physical Safari controller.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const dir=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(resolve(dir,'index.html'),'utf8');
const between=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i);assert(i>=0&&j>i,`Missing section ${a}`);return html.slice(i,j)};
assert.match(html,/len-chua-cau-an-v1/,'Existing localStorage schema must stay stable');
for(const id of ['stick','look-stick','padA','designLayer','world'])assert(html.includes(`id="${id}"`),`Missing UI ${id}`);
assert.match(html,/navigator.getGamepads/);
assert.match(html,/https:\/\/cdn.jsdelivr.net\/npm\/three@/);
const script=between('<script type="module">','</script>').replace(/^\s*import \* as THREE from 'three';/m,'');
new Function(script); // Syntax only; does not execute WebGL.
const siteBlock=between('const SITE_PLAN=Object.freeze(','const P=SITE_PLAN');
const collisionBlock=between('const obstacles=[','// ===== Khách AI:');
const qa=runInNewContext(siteBlock+'\nconst P=SITE_PLAN;\n'+collisionBlock+'\n({P,canMove,findPath,navOpen})');
assert.equal(qa.P.boundary.w,64);assert.equal(qa.P.boundary.d,56);
const targets={
 incense:{x:0,z:0},bell:{x:-20,z:7},mok:{x:-8.5,z:-4.7},
 wish:{x:-17,z:-9},fortune:{x:-11.5,z:16.7}
};
for(const [name,p] of Object.entries(targets)){
 assert(qa.canMove(p.x,p.z),`Unwalkable interaction waypoint: ${name}`);
 const nodes=qa.findPath(0,21,p.x,p.z);
 assert(nodes.length>0,`No accessible path to ${name}`);
 console.log(`✓ ${name}: ${nodes.length} nodes`);
}
assert(!qa.canMove(0,-3),'Incense burner should have collision');
assert(!qa.canMove(20,5),'Lotus pond must have collision');
assert(!qa.canMove(-20,-12),'Bodhi trunk must have collision');
assert(!qa.canMove(0,-19.2),'Buddha base must have collision');
assert(!qa.canMove(31.5,0),'Outer wall must have collision');
console.log('✓ HTML syntax, controls, legacy storage, layout, boundaries and five activities');
