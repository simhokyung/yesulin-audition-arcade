/** v20: actual fixed-step movement policies, no teleports or stat overrides after fixture setup. */
import * as E from './engine.js';
import {runMaxRoute} from './max-balance.mjs';
import {runPersonalityRoute} from './personality-balance.mjs';
import {runVariantRoute,runBladeRoute,runPursuitRoute,runChallenge,runRankedDuel} from './simulate.mjs';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
const hash=()=>Object.fromEntries(['engine.js','max-patterns.js','simulate.mjs'].map(f=>[f,createHash('sha256').update(readFileSync(new URL(f,import.meta.url))).digest('hex')]));
const sourceSha256=hash(),runs=[],ordinary=[],seeds=+(process.argv.find(x=>x.startsWith('--seeds='))?.split('=')[1]||30),smoke=process.argv.includes('--smoke');
const starts=[[76,340],[76,624],[640,482],[1204,340],[1204,624]],summary=rows=>({cases:rows.length,clean:rows.filter(r=>(r.damageTaken??(260-r.hp))===0).length,survived:rows.filter(r=>r.survived).length,averageDamage:+(rows.reduce((n,r)=>n+(r.damageTaken??(260-r.hp)),0)/rows.length).toFixed(2)});
for(const character of ['director','actor'])for(const phase of [1,2])for(const[x,y]of starts)for(const reaction of [.15,.25]){
 for(const boss of ['ignis','mime','gojo'])for(const takeoverCount of [0,1]){const r=runVariantRoute({boss,character,phase,takeoverCount,x,y,reaction});runs.push({...r,type:boss,policy:'follow'});}
 runs.push({...runMaxRoute({pattern:3,character,phase,x,y,reaction}),type:'max'});
 for(const variant of [0,1,2])runs.push({...runBladeRoute({character,variant,mirror:phase===2,x,y,reaction}),type:'blade-waves'});
 runs.push({...runPursuitRoute({character,phase,x,y,reaction}),type:'chasing-slashes'});
}
for(const phase of [1,2])for(const[x,y]of starts)for(const policy of ['still','left','right','up','down','circle']){
 for(const boss of ['ignis','mime','gojo'])for(const takeoverCount of [0,1])runs.push({...runVariantRoute({boss,phase,takeoverCount,x,y,policy}),type:boss});
 runs.push({...runMaxRoute({pattern:3,phase,x,y,policy}),type:'max'});
 runs.push({...runBladeRoute({phase,mirror:phase===2,x,y,policy}),type:'blade-waves'});
 runs.push({...runPursuitRoute({phase,x,y,policy}),type:'chasing-slashes'});
 for(const boss of ['gojo','sukuna'])ordinary.push({...runPersonalityRoute({boss,phase,x,y,policy}),type:boss});
 for(const pattern of [0,1,2,4,5,6])ordinary.push({...runMaxRoute({pattern,phase,x,y,policy}),type:'max-'+pattern});
}
const full=[],duels=[];
for(const profile of ['beginner','regular','expert'])for(const loadout of ['director','actor'])for(let n=0;n<(smoke?3:seeds);n++){
 const seed=1009+n*7919,r=runChallenge({seed,loadout,profile});if(r.cleared!==r.stageClearTimes.length||r.lastClearTime!==(r.stageClearTimes.at(-1)??null)||r.lastClearTime>r.seconds||r.win&&r.lastClearTime!==r.seconds)throw new Error('Invalid actual passage ledger');full.push({seed,profile,loadout,...r});
 for(let stage=0;stage<5;stage++)duels.push({seed,...runRankedDuel({seed,profile,loadout,stage})});
}
const grouped=(rows,key)=>Object.fromEntries([...new Set(rows.map(r=>r[key]))].map(k=>[k,summary(rows.filter(r=>r[key]===k))]));
const report={version:20,generatedAt:new Date().toISOString(),sourceSha256,method:'Actual game engine at60Hz. Domain routes delay150/250ms at visible phase changes; Max includes actual fixed/return cue delay. Normal resource walks use no Space, E/R, attack, teleports, HP edits or hazard deletion. Simple policies are stationary, four fixed directions and a fixed circle. Full-run controllers retain530/290/140ms reactions and actual QWER. No game time limit; offline simulation limit reports stalls separately.',limitations:['Geometry-aware scripted policies, not human win rates.','Some imperfect policies intentionally take recoverable40-percent domain damage; clean traversal is distinguished from survival.'],domains:{walk:grouped(runs.filter(r=>r.policy==='follow'),'type'),simple:grouped(runs.filter(r=>r.policy!=='follow'),'type')},ordinarySimple:grouped(ordinary,'type'),full:{runs:full.length,wins:full.filter(r=>r.win).length,safetyStopped:full.filter(r=>r.safetyStopped).length,medianVictorySeconds:(()=>{const a=full.filter(r=>r.win).map(r=>r.seconds).sort((a,b)=>a-b);return a[Math.floor(a.length/2)]??null})(),profiles:Object.fromEntries(['beginner','regular','expert'].map(p=>[p,Object.fromEntries(['director','actor'].map(c=>{const a=full.filter(r=>r.profile===p&&r.loadout===c);return[c,{runs:a.length,wins:a.filter(r=>r.win).length,averageDamage:a.reduce((n,r)=>n+r.damage,0)/a.length}]}))]))},duels:Object.fromEntries(E.BOSSES.map(b=>{const a=duels.filter(r=>r.boss===b.id);return[b.id,{runs:a.length,wins:a.filter(r=>r.win).length,averageDamage:a.reduce((n,r)=>n+r.damageTaken,0)/a.length,safetyStopped:a.filter(r=>r.safetyStopped).length}]})),runs,ordinary,fullRuns:full,duelRuns:duels};
if(JSON.stringify(hash())!==JSON.stringify(sourceSha256))throw new Error('Source changed during balance run');
writeFileSync(new URL(smoke?'../../work/v20-balance-smoke.json':'./v20-balance-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,runs:runs.length,ordinary:ordinary.length,fullRuns:full.length,duelRuns:duels.length},null,2));
