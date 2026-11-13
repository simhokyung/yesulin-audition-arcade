/** Server-confirmed leaderboard. Local records are never imported into it. */
import {createEntry,getIndividualBoard,getPersonalStanding,normalizeIdentity} from './ranking.js';
export const PENDING_KEY='yesulin-ranking-pending-v18';
const eligible=e=>e.mode==='challenge'&&e.difficulty==='standard'&&e.duration===0&&['clear','defeat','domain'].includes(e.endReason);
const storageOrNull=()=>{try{return globalThis.localStorage||null}catch{return null}};
const validNonce=n=>typeof n==='string'&&/^[A-Za-z0-9-]{32,128}$/.test(n);
export function newSessionNonce(){return globalThis.crypto?.randomUUID?.()||Array.from({length:64},()=>Math.floor(Math.random()*16).toString(16)).join('');}
function sessionOf(run){const identity=normalizeIdentity({name:run.name});if(!run.runId||!validNonce(run.clientNonce)||!['actor','director'].includes(run.character))throw new Error('시작 정보를 확인할 수 없습니다.');return{runId:run.runId,name:identity.name,character:run.character,clientNonce:run.clientNonce};}
function publicEntries(rows){if(!Array.isArray(rows))throw new Error('순위 응답을 확인할 수 없습니다.');return getIndividualBoard(rows.map(row=>{const e=createEntry(row);if(!eligible(e)||e.crew)throw new Error('공용 순위 형식이 올바르지 않습니다.');return e;}));}
class RequestError extends Error{constructor(message,status=0){super(message);this.status=status;this.retryable=!status||status===408||status===429||status>=500;}}
export class SharedRanking{
 constructor({fetchImpl=globalThis.fetch?.bind(globalThis),storage=storageOrNull(),timeoutMs=5000,retryDelayMs=250,endpoint='/api/leaderboard'}={}){
  this.fetch=fetchImpl;this.storage=storage;this.timeoutMs=timeoutMs;this.retryDelayMs=retryDelayMs;this.endpoint=endpoint;this.entries=[];this.status='loading';this.error='';this.updatedAt=null;this.listeners=new Set();this.sessions=new Map();this.starting=new Map();this.finishing=new Map();this.results=new Map();this.pending=[];this.persistent=!!storage;this.revision=0;this.refreshing=null;this.retrying=null;
  try{const value=JSON.parse(storage?.getItem(PENDING_KEY)||'[]');if(Array.isArray(value))for(const row of value.slice(0,100)){try{const session=sessionOf(row.session),entry=createEntry(row.entry);if(eligible(entry)&&entry.runId===session.runId&&entry.name===session.name&&entry.character===session.character&&!entry.crew&&(!row.token||typeof row.token==='string'))this.pending.push({session,entry,token:row.token||null});}catch{}}}catch{this.persistent=false;}
 }
 subscribe(listener){this.listeners.add(listener);return()=>this.listeners.delete(listener)}
 emit(result){for(const listener of this.listeners){try{listener({entries:this.entries,status:this.status,error:this.error,pendingCount:this.pending.length,persistent:this.persistent,updatedAt:this.updatedAt,result});}catch{}}}
 persist(){try{if(!this.storage)throw new Error();this.storage.setItem(PENDING_KEY,JSON.stringify(this.pending));this.persistent=true;}catch{this.persistent=false;}}
 async request(body,{retries=1}={}){
  for(let attempt=0;;attempt++){
   const controller=new AbortController();let timer;
   try{
    if(!this.fetch)throw new RequestError('네트워크 연결을 확인해 주세요.');
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new RequestError('서버 응답이 늦어 다시 연결하고 있어요.'));},this.timeoutMs)});
    const task=(async()=>{const response=await this.fetch(this.endpoint,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,cache:'no-store',signal:controller.signal});let data;try{data=await response.json()}catch{throw new RequestError('서버 응답을 확인할 수 없습니다.',response.status>=500?response.status:502)}if(!response.ok||!data?.ok)throw new RequestError(data?.error||'서버에 연결하지 못했어요.',response.status||502);return data})();
    return await Promise.race([task,timeout]);
   }catch(error){const e=error instanceof RequestError?error:new RequestError('네트워크 연결을 확인해 주세요.');if(!e.retryable||attempt>=retries)throw e;await new Promise(resolve=>setTimeout(resolve,this.retryDelayMs));}
   finally{clearTimeout(timer)}
  }
 }
 async refresh(){
  if(this.refreshing)return this.refreshing;const revision=this.revision;
  this.refreshing=(async()=>{try{const data=await this.request();const rows=publicEntries(data.entries);if(this.revision===revision){this.entries=rows;this.status='ready';this.error='';this.updatedAt=Date.now();this.emit();}return{ok:true,entries:this.entries};}catch(error){if(this.revision===revision){this.status='offline';this.error=error.message;this.emit();}return{ok:false,error:error.message,entries:this.entries};}finally{this.refreshing=null}})();return this.refreshing;
 }
 startRun(run){let session;try{session=sessionOf(run)}catch(error){return Promise.resolve({ok:false,error:error.message})}const id=session.runId,known=this.sessions.get(id);if(known?.token)return Promise.resolve({ok:true,token:known.token});if(this.starting.has(id))return this.starting.get(id);
  const promise=(async()=>{try{const data=await this.request({action:'start',session});if(typeof data.token!=='string'||!data.token)throw new RequestError('시작 연결을 확인할 수 없습니다.',502);this.sessions.set(id,{session,token:data.token});return{ok:true,token:data.token};}catch(error){this.sessions.set(id,{session,token:null,error:error.message});return{ok:false,error:error.message,retryable:error.retryable!==false};}finally{this.starting.delete(id)}})();this.starting.set(id,promise);return promise;
 }
 finishRun(run,input){
  let session,entry;try{session=sessionOf(run);entry=createEntry({...input,runId:session.runId,name:session.name,character:session.character,crew:''});if(!eligible(entry))throw new Error('연습 또는 중도 종료 기록은 전체 순위에 등록되지 않습니다.');}catch(error){return Promise.resolve({ok:false,pending:false,rank:null,copy:error.message})}
  const id=session.runId;if(this.results.has(id))return Promise.resolve(this.results.get(id));if(this.finishing.has(id))return this.finishing.get(id);
  let job=this.pending.find(row=>row.entry.runId===id);if(!job){if(this.pending.length>=100)return Promise.resolve({ok:false,pending:false,rank:null,copy:'전송 대기 기록이 많아요. 연결 후 다시 확인해 주세요.'});job={session,entry,token:this.sessions.get(id)?.token||null};this.pending.push(job);this.persist();this.emit();}
  return this.sendJob(job);
 }
 sendJob(job){const id=job.entry.runId;if(this.finishing.has(id))return this.finishing.get(id);
  const promise=(async()=>{
   try{
    if(!job.token){const started=await(this.starting.get(id)||this.startRun(job.session));if(!started.ok){if(started.retryable===false)throw new RequestError(started.error,409);throw new RequestError(started.error)}job.token=started.token;this.persist();}
    const data=await this.request({action:'finish',token:job.token,entry:job.entry});const rows=publicEntries(data.entries),confirmed=createEntry(data.entry);if(confirmed.runId!==id||confirmed.name!==job.session.name||confirmed.character!==job.session.character||!eligible(confirmed)||confirmed.crew)throw new RequestError('저장 응답을 확인할 수 없습니다.',502);
    this.revision++;this.entries=getIndividualBoard([...this.entries,...rows]);this.status='ready';this.error='';this.updatedAt=Date.now();this.pending=this.pending.filter(row=>row.entry.runId!==id);this.persist();const standing=getPersonalStanding(this.entries,{name:confirmed.name});const result={ok:true,pending:false,runId:id,rank:standing.rank,entry:confirmed,title:standing.rank?'전체 '+standing.rank+'위':'기록 저장 완료',copy:'서버에 저장했어요.',comparison:standing.best?.runId===id?'내 최고 기록이에요.':'기존 최고 기록을 유지해요.'};this.results.set(id,result);this.emit(result);return result;
   }catch(error){
    const pending=error.retryable!==false;if(!pending){this.pending=this.pending.filter(row=>row.entry.runId!==id);this.persist();}this.status=pending?'offline':this.status;this.error=error.message;const result={ok:false,pending,runId:id,rank:null,title:pending?'기록 전송 대기':'순위 미등록',copy:pending?(this.persistent?job.token?'전송 대기 중 · 연결되면 다시 시도해요.':'시작 연결 확인 대기 · 서버 확인 후 등록돼요.':'이 탭에서 전송 대기 중이에요. 창을 닫지 말아 주세요.'):error.message};if(!pending)this.results.set(id,result);this.emit(result);return result;
   }finally{this.finishing.delete(id)}
  })();this.finishing.set(id,promise);return promise;
 }
 async retryPending(){if(this.retrying)return this.retrying;this.retrying=(async()=>{const results=[];for(const job of [...this.pending])results.push(await this.sendJob(job));return results})().finally(()=>{this.retrying=null});return this.retrying;}
}
