import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createLeaderboardHandler} from './server/leaderboard-handler.mjs';
import {createLeaderboardStore} from './server/leaderboard-store.mjs';
import {LEADERBOARD_REMOVALS,excludedRunIdsFor,isExcludedRun} from './server/leaderboard-moderation.mjs';
import {createEntry,getIndividualBoard} from './ranking.js';

const target=LEADERBOARD_REMOVALS[0];
const token='1'.repeat(64),startedAt='2026-11-13T09:00:00.000Z';
const hash=value=>createHash('sha256').update(value).digest('hex');
const makeEntry=(i,patch={})=>createEntry({runId:'normal-run-'+i,name:'크루'+i,character:'actor',score:1000-i,bosses:2,maxCombo:20,runTime:40,lastClearTime:20+i/100,endReason:'defeat',createdAt:startedAt,...patch});
const removedEntry=()=>makeEntry(0,{runId:target.runId,name:target.name,bosses:5,score:22800,maxCombo:1,runTime:23.116666666666635,lastClearTime:23.116666666666635,endReason:'clear'});

function fixture(rows=[]){
  const sessions=new Map();let finishCalls=0,startCalls=0;
  const store={
    async rateLimit(){return true;},
    async listEntries(){return rows;},
    async getSession({scope,rulesVersion,runId}){return sessions.get([scope,rulesVersion,runId].join(':'));},
    async startSession(input){startCalls++;const value={...input,startedAt,token,tokenHash:hash(token),entry:null};sessions.set([input.scope,input.rulesVersion,input.runId].join(':'),value);return value;},
    async finishSession(input){finishCalls++;const session=await this.getSession(input);session.entry??=input.entry;rows.push(session.entry);return session.entry;},
  };
  const handler=createLeaderboardHandler({getStore:()=>store,now:()=>Date.parse(startedAt)+60000,makeToken:()=>token});
  return{handler,store,sessions,calls:()=>({finishCalls,startCalls})};
}
async function request(handler,body,{method=body?'POST':'GET',scope='public',rulesVersion='challenge-v22'}={}){
  const req={method,url:`/api/leaderboard?scope=${scope}&rulesVersion=${rulesVersion}`,headers:{host:'arcade.test',origin:'https://arcade.test','content-type':'application/json'},socket:{remoteAddress:'127.0.0.1'},...(body?{body:{scope,...body}}:{})};
  const res={setHeader(){},end(text){this.body=JSON.parse(text);}};
  await handler(req,res);return{status:res.statusCode,...res.body};
}

test('only the requested run in public season 22 is removed; twenty other ranks are unchanged',async()=>{
  const survivors=Array.from({length:20},(_,i)=>makeEntry(i));
  const f=fixture([removedEntry(),...survivors].reverse());
  const response=await request(f.handler);
  assert.equal(response.status,200);
  assert.deepEqual(response.entries,getIndividualBoard(survivors));
  assert.deepEqual(response.excludedRunIds,[target.runId]);
  assert.equal(response.entries.length,20);
  assert.deepEqual(f.calls(),{finishCalls:0,startCalls:0});
});

test('moderation is isolated by season, scope, and run ID rather than banning the nickname',async()=>{
  assert.equal(isExcludedRun(target),true);
  for(const patch of [{scope:'verification'},{rulesVersion:'challenge-v21'},{runId:'different-run'}])assert.equal(isExcludedRun({...target,...patch}),false);
  const verification=await request(fixture([removedEntry()]).handler,undefined,{scope:'verification'});
  assert.equal(verification.entries.length,1);assert.deepEqual(verification.excludedRunIds,[]);
  const old={...removedEntry(),version:21,rulesVersion:'challenge-v21'};
  const legacy=await request(fixture([old]).handler,undefined,{rulesVersion:'challenge-v21'});
  assert.equal(legacy.entries.length,1);assert.deepEqual(legacy.excludedRunIds,[]);
  assert.deepEqual(excludedRunIdsFor({}),[]);
});

test('a completed removed session cannot be replayed or resumed even with its correct token',async()=>{
  const f=fixture([removedEntry()]);
  const original={runId:target.runId,name:target.name,character:'actor',startedAt,tokenHash:hash(token),entry:removedEntry()};
  f.sessions.set([target.scope,target.rulesVersion,target.runId].join(':'),original);
  for(const entry of [removedEntry(),{...removedEntry(),score:1,name:'변경된이름'}]){
    const response=await request(f.handler,{action:'finish',token,entry});
    assert.equal(response.status,422);assert.equal(response.ok,false);assert.equal(response.entry,null);
    assert.deepEqual(response.excludedRunIds,[target.runId]);
  }
  const resumed=await request(f.handler,{action:'start',session:{runId:target.runId,name:target.name,character:'actor',clientNonce:'nonce-abcdefghijklmnopqrstuv',rulesVersion:target.rulesVersion}});
  assert.equal(resumed.status,422);
  assert.deepEqual(f.calls(),{finishCalls:0,startCalls:0});
  assert.deepEqual(original.entry,removedEntry());
});

test('the same nickname may submit a new normal slower run; all successful paths carry tombstones',async()=>{
  const f=fixture([removedEntry(),makeEntry(2)]);
  const session={runId:'new-normal-run',name:target.name,character:'actor',clientNonce:'nonce-abcdefghijklmnopqrstuv',rulesVersion:target.rulesVersion};
  const start=await request(f.handler,{action:'start',session});
  assert.equal(start.status,200);assert.deepEqual(start.excludedRunIds,[target.runId]);
  const entry=makeEntry(1,{...session,bosses:1,lastClearTime:35,runTime:40});
  const finish=await request(f.handler,{action:'finish',token,entry});
  assert.equal(finish.status,200);assert.deepEqual(finish.excludedRunIds,[target.runId]);
  assert.equal(finish.entries.filter(row=>row.name===target.name).length,1);
  assert.equal(finish.entries.find(row=>row.name===target.name).runId,session.runId);
  assert.equal(finish.entries.length,2);
});

test('error responses carry partition-aware exclusions, including unavailable storage',async()=>{
  const handler=createLeaderboardHandler({getStore:()=>null});
  const unavailable=await request(handler);
  assert.equal(unavailable.status,503);assert.deepEqual(unavailable.excludedRunIds,[target.runId]);
  const verification=await request(handler,undefined,{scope:'verification'});
  assert.deepEqual(verification.excludedRunIds,[]);
  const invalid=await request(fixture().handler,{action:'finish',token:'bad',entry:removedEntry()});
  assert.equal(invalid.status,400);assert.deepEqual(invalid.excludedRunIds,[target.runId]);
  const unsupported=await request(fixture().handler,undefined,{method:'DELETE'});
  assert.equal(unsupported.status,405);assert.ok(Array.isArray(unsupported.excludedRunIds));
});

test('the real store archives the complete entry before exact best-row removal in one transaction',async()=>{
  let transactionCalls=0;const calls=[],transactions=[];
  const sql={query(text,params){const query={text,params};calls.push(query);return query;},async transaction(queries){transactionCalls++;transactions.push(queries);return queries.map(()=>[]);}};
  const store=createLeaderboardStore(null,{sql});
  await Promise.all([store.ready(),store.ready()]);
  assert.equal(transactionCalls,1);
  const queries=transactions[0],archive=queries.findIndex(q=>q.text.startsWith('INSERT INTO yesulin_arcade_removed')),remove=queries.findIndex(q=>q.text.startsWith('DELETE FROM yesulin_arcade_best'));
  assert.ok(archive>0&&remove>archive);
  assert.match(queries[0].text,/pg_advisory_xact_lock/);
  assert.match(queries[archive].text,/SELECT scope,rules_version,run_id,name,entry,\$5 FROM yesulin_arcade_best/);
  assert.match(queries[archive].text,/scope=\$1 AND rules_version=\$2 AND run_id=\$3 AND name=\$4/);
  assert.match(queries[archive].text,/ON CONFLICT \(scope,rules_version,run_id\) DO NOTHING/);
  assert.deepEqual(queries[archive].params,[target.scope,target.rulesVersion,target.runId,target.name,target.reason]);
  assert.deepEqual(queries[remove].params,[target.scope,target.rulesVersion,target.runId,target.name]);
  assert.match(queries[remove].text,/best.scope=\$1 AND best.rules_version=\$2 AND best.run_id=\$3 AND best.name=\$4/);
  assert.match(queries[remove].text,/EXISTS \(SELECT 1 FROM yesulin_arcade_removed/);
  assert.match(queries[remove].text,/removed.run_id=best.run_id AND removed.name=best.name/);
  assert.ok(queries.filter(q=>q.text.startsWith('DELETE FROM yesulin_arcade_sessions')).every(q=>q.text.includes('entry IS NULL')),'completed session history is never deleted');
  const before=calls.length;
  assert.equal(await store.finishSession({...target,tokenHash:hash(token),entry:removedEntry()}),null);
  assert.equal(calls.length,before,'the store itself prevents a removed run from reappearing');
});

test('an archive transaction failure does not continue to remove records and can be retried',async()=>{
  let attempts=0;
  const sql={query(text,params){return{text,params};},async transaction(){if(++attempts===1)throw new Error('archive transaction failed');return[];}};
  const store=createLeaderboardStore(null,{sql});
  await assert.rejects(store.ready(),/archive transaction failed/);
  await store.ready();assert.equal(attempts,2);
});
