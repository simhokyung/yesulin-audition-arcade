import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from './engine.js';
import {GameAudio} from './audio.js';

test('a real takeover damage milestone sounds once, independently of overlapping attack effects',()=>{
 const s=createGame({stage:2,skipIntro:true}),a=new GameAudio(),heard=[];
 a.cue=(name,meta={})=>heard.push({name,...meta});a.update(s,1/60);
 s.player.hp-=104;s.stats.damageTaken+=104;s.effects.push({id:++s.uid,type:'domainHit',damage:104,ratio:.4,x:s.player.x,y:s.player.y,life:.65,maxLife:.65});
 a.update(s,1/60);a.update(s,1/60);
 assert.equal(heard.filter(x=>x.name==='domain-hit').length,1);
 assert.equal(heard.filter(x=>x.name==='hit'||x.name==='fatal').length,0,'surviving a takeover is not a death or doubled damage sound');
 s.player.hp-=10;s.stats.damageTaken+=10;a.update(s,1/60);
 assert.equal(heard.filter(x=>x.name==='hit').length,1,'a later ordinary hit retains its own cue');a.destroy();
});

test('takeover feedback cannot replay when sound is enabled after a consumed milestone',()=>{
 const s=createGame({stage:3,skipIntro:true}),a=new GameAudio(),heard=[];
 a.cue=name=>{if(a.enabled)heard.push(name)};a.update(s,1/60);
 s.player.hp-=104;s.stats.damageTaken+=104;s.effects.push({id:++s.uid,type:'domainHit',damage:104,ratio:.4,life:.65,maxLife:.65});
 a.update(s,1/60);a.enabled=true;a.update(s,1/60);
 assert.equal(heard.filter(x=>x==='domain-hit'||x==='fatal').length,0);a.destroy();
});
