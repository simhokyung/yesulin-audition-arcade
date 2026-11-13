import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {createEntry,getIndividualBoard,normalizeIdentity,RANKING_RULES_VERSION} from '../ranking.js';
import {BOSSES} from '../engine.js';

const MAX_BODY=8192,SESSION_SECONDS=6*60*60;
const LEGACY_RULES='challenge-v18';
function rulesOf(value,{legacyDefault=false}={}){if(value===undefined&&legacyDefault)return LEGACY_RULES;if(value===LEGACY_RULES||value===RANKING_RULES_VERSION)return value;fail(400,'지원하지 않는 순위 규칙입니다.');}
const seasonOf=rules=>rules===LEGACY_RULES?18:19;
const stagesOf=rules=>rules===LEGACY_RULES?4:BOSSES.length;
function seasonEntry(input,rules){if(input.version!==seasonOf(rules)||input.rulesVersion!==rules)throw new TypeError('기록 시즌이 올바르지 않습니다.');if(input.bosses>stagesOf(rules))throw new TypeError('통과한 오디션 수를 확인해 주세요.');const entry=createEntry({...input,version:19,rulesVersion:RANKING_RULES_VERSION});return{...entry,version:seasonOf(rules),rulesVersion:rules};}
function seasonBoard(rows,rules){const current=[];for(const row of rows){try{current.push({...seasonEntry(row,rules),version:19,rulesVersion:RANKING_RULES_VERSION});}catch{}}return getIndividualBoard(current).map(row=>({...row,version:seasonOf(rules),rulesVersion:rules}));}
const digest=value=>createHash('sha256').update(String(value)).digest('hex');
const record=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
class RequestError extends Error {constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new RequestError(status,message);};
function sameHash(a,b){return typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
function scopeOf(value){if(value===undefined||value==='public')return'public';if(value==='verification')return value;fail(400,'올바른 순위표를 선택하세요.');}
function validateOrigin(req){
  const origin=req.headers?.origin,site=req.headers?.['sec-fetch-site'];
  if(site==='cross-site')fail(403,'게임 화면에서 다시 시도해 주세요.');
  if(origin){let url;try{url=new URL(origin);}catch{fail(403,'요청 출처가 올바르지 않습니다.');}
    if(!['http:','https:'].includes(url.protocol)||url.host!==req.headers.host)fail(403,'게임 화면에서 다시 시도해 주세요.');
  } else if(req.method==='POST')fail(403,'게임 화면에서 다시 시도해 주세요.');
}
async function bodyOf(req){
  if(!/^application\/json(?:;|$)/i.test(req.headers?.['content-type']||''))fail(415,'JSON 형식으로 요청해 주세요.');
  const length=Number(req.headers?.['content-length']);if(Number.isFinite(length)&&length>MAX_BODY)fail(413,'요청이 너무 큽니다.');
  let body=req.body;
  if(body===undefined){let bytes=0;const chunks=[];for await(const chunk of req){const data=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);bytes+=data.length;if(bytes>MAX_BODY)fail(413,'요청이 너무 큽니다.');chunks.push(data);}body=Buffer.concat(chunks).toString('utf8');}
  if(Buffer.isBuffer(body))body=body.toString('utf8');
  if(typeof body==='string'){if(Buffer.byteLength(body)>MAX_BODY)fail(413,'요청이 너무 큽니다.');try{body=JSON.parse(body);}catch{fail(400,'요청 내용을 읽을 수 없습니다.');}}
  else{let encoded;try{encoded=JSON.stringify(body);}catch{fail(400,'요청 내용이 올바르지 않습니다.');}if(encoded&&Buffer.byteLength(encoded)>MAX_BODY)fail(413,'요청이 너무 큽니다.');}
  if(!record(body))fail(400,'요청 내용이 올바르지 않습니다.');return body;
}
function startIdentity(session){if(!record(session))fail(400,'참가 정보를 확인해 주세요.');const {runId,clientNonce,character}=session;
  if(typeof runId!=='string'||!/^[A-Za-z0-9_-]{8,80}$/.test(runId))fail(400,'플레이 ID가 올바르지 않습니다.');
  if(typeof clientNonce!=='string'||!/^[A-Za-z0-9_-]{20,128}$/.test(clientNonce))fail(400,'참가 인증 정보가 올바르지 않습니다.');
  if(character!=='actor'&&character!=='director')fail(400,'역할을 선택해 주세요.');
  if(typeof session.name!=='string'||!session.name.trim())fail(400,'닉네임을 입력해 주세요.');const identity=normalizeIdentity({name:session.name});
  if(Array.from(identity.name).length<2||identity.name==='이름없는 예술인')fail(400,'닉네임은 2~12자로 입력해 주세요.');
  return {runId,clientNonce,name:identity.name,character};
}
function canonicalFinish(input,session,now,rulesVersion){
  if(!record(input)||input.mode!=='challenge'||input.difficulty!=='standard'||input.duration!==0||input.rulesVersion!==rulesVersion)fail(400,'정식 시작하기 기록만 전체 순위에 등록할 수 있습니다.');
  if(!['clear','defeat','domain'].includes(input.endReason))fail(400,'연습·중도 종료 기록은 전체 순위에 등록되지 않습니다.');
  let entry;try{entry=seasonEntry({...input,name:session.name,crew:'',character:session.character,createdAt:new Date(now).toISOString()},rulesVersion);}catch(error){fail(400,error.message);}
  if(input.runId!==session.runId||normalizeIdentity({name:input.name}).name!==session.name||input.character!==session.character)fail(409,'시작한 참가 정보와 결과가 일치하지 않습니다.');
  if((entry.endReason==='clear')!==(entry.bosses===stagesOf(rulesVersion)))fail(400,'통과한 오디션 수를 확인해 주세요.');
  if(!Number.isSafeInteger(entry.score)||entry.score>2_000_000||entry.maxCombo>20_000||entry.runTime>SESSION_SECONDS||entry.runTime<.25)fail(400,'게임 기록이 허용 범위를 벗어났습니다.');
  const wallSeconds=(now-new Date(session.startedAt).getTime())/1000;
  if(!Number.isFinite(wallSeconds)||wallSeconds<0||wallSeconds>SESSION_SECONDS+300)fail(400,'참가 기록이 만료되었습니다. 다시 시작해 주세요.');
  if(entry.runTime>wallSeconds+5||entry.runTime<entry.bosses*2)fail(400,'게임 시작 때 서버에 연결되지 않아 이번 기록을 등록하지 못했어요. 연결 후 다시 도전해 주세요.');
  const totalHP=BOSSES.filter(b=>rulesVersion!==LEGACY_RULES||b.id!=='max').reduce((sum,b)=>sum+Math.round(b.hp*.55),0);
  if(entry.score>totalHP*3+entry.runTime*450+2000||entry.maxCombo>entry.runTime*70+30)fail(400,'게임 기록의 점수 또는 콤보를 확인해 주세요.');
  return entry;
}
function response(res,status,payload){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Vary','Origin');res.end(JSON.stringify(payload));}

/** Injectable store/clock make HTTP validation and concurrent retries independently testable. */
export function createLeaderboardHandler({getStore,now=()=>Date.now(),makeToken=()=>randomBytes(32).toString('hex')}={}){
  return async function leaderboard(req,res){
    try{
      if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');fail(405,'지원하지 않는 요청입니다.');}
      validateOrigin(req);
      const body=req.method==='POST'?await bodyOf(req):null,url=new URL(req.url||'/api/leaderboard','http://localhost'),scope=scopeOf(body?body.scope:url.searchParams.get('scope')??undefined);
      const action=body?.action;if(body&&!['start','finish'].includes(action))fail(400,'요청 종류를 확인해 주세요.');
      const store=await getStore?.();if(!store)fail(503,'전체 순위 서버가 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
      const time=now(),ip=String(req.headers?.['x-vercel-forwarded-for']||req.headers?.['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
      const minute=Math.floor(time/60000),rateKey=digest(`${Math.floor(time/86400000)}|${ip}|${action||'read'}|${minute}`),limit=action==='start'?180:action==='finish'?360:1200;
      if(!await store.rateLimit(rateKey,limit,new Date((minute+2)*60000).toISOString())){res.setHeader('Retry-After','60');fail(429,'요청이 많습니다. 잠시 후 다시 시도해 주세요.');}
      if(!body){const rulesVersion=rulesOf(url.searchParams.get('rulesVersion')??undefined,{legacyDefault:true}),entries=seasonBoard(await store.listEntries({scope,rulesVersion}),rulesVersion);return response(res,200,{ok:true,entries,error:null});}
      if(action==='start'){
        const identity=startIdentity(body.session),rulesVersion=rulesOf(body.session.rulesVersion,{legacyDefault:true}),token=makeToken(),nonceHash=digest(identity.clientNonce),session=await store.startSession({...identity,scope,rulesVersion,nonceHash,tokenHash:digest(token),token});
        if(session.name!==identity.name||session.character!==identity.character||!sameHash(session.nonceHash,nonceHash))fail(409,'이미 사용 중인 플레이 ID입니다. 새 게임으로 시작해 주세요.');
        if(time-new Date(session.startedAt).getTime()>(SESSION_SECONDS+300)*1000)fail(409,'참가 기록이 만료되었습니다. 새 게임으로 시작해 주세요.');
        return response(res,200,{ok:true,token:session.token,entries:[],error:null});
      }
      if(typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token)||!record(body.entry)||typeof body.entry.runId!=='string')fail(400,'참가 인증 정보가 올바르지 않습니다.');
      const rulesVersion=rulesOf(body.entry.rulesVersion),key={scope,rulesVersion,runId:body.entry.runId},session=await store.getSession(key),tokenHash=digest(body.token);
      if(!session||!sameHash(session.tokenHash,tokenHash))fail(409,'참가 정보를 확인할 수 없습니다. 이 게임에서 다시 시작해 주세요.');
      let entry=session.entry;
      if(!entry){const value=canonicalFinish(body.entry,session,time,rulesVersion);entry=await store.finishSession({...key,tokenHash,entry:value});if(!entry)fail(409,'참가 정보를 확인할 수 없습니다. 다시 시도해 주세요.');}
      const entries=seasonBoard(await store.listEntries({scope,rulesVersion}),rulesVersion);
      return response(res,200,{ok:true,entry,entries,error:null});
    }catch(error){const status=error instanceof RequestError?error.status:503;if(!(error instanceof RequestError)){const name=/^[A-Za-z][A-Za-z0-9]{0,40}$/.test(error?.name||'')?error.name:'Error',code=/^[A-Z0-9_]{1,32}$/.test(error?.code||'')?error.code:undefined;console.error(JSON.stringify({event:'leaderboard_store_error',name,...(code?{code}:{})}));}return response(res,status,{ok:false,entries:[],entry:null,error:status===503?'전체 순위 서버에 연결하지 못했습니다. 기록을 보관하고 다시 시도해 주세요.':error.message});}
  };
}
