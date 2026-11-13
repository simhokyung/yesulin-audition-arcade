import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {resolve, extname, sep} from 'node:path';

const root=fileURLToPath(new URL('.',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
const RANKING_URL='https://yesulin-arcade.vercel.app/api/leaderboard';

export function createLocalServer({fetchImpl=globalThis.fetch,apiHandler=null}={}){
 return http.createServer(async(req,res)=>{
  try{
   const requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(requested==='/api/leaderboard'){
    // The local game uses the same public board unless a development DB is configured.
    if(apiHandler)return await apiHandler(req,res);
    if(process.env.DATABASE_URL){const {default:handler}=await import('./api/leaderboard.js');return await handler(req,res);}
    if(!['GET','POST'].includes(req.method)){res.writeHead(405,{Allow:'GET, POST'}).end();return;}
    let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192){res.writeHead(413).end();return;}}
    const query=new URL(req.url,'http://localhost').search;
    const remote=await fetchImpl(RANKING_URL+query,{method:req.method,headers:{'Content-Type':'application/json','Origin':new URL(RANKING_URL).origin},body:req.method==='POST'?body:undefined,signal:AbortSignal.timeout(12000)});
    res.writeHead(remote.status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(await remote.text());return;
   }
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
   // Never serve source tooling, environment files, Git metadata, or API credentials.
   const publicPath=requested==='/'?'/index.html':requested;
   if(!(/^\/(?:index\.html|[a-z0-9-]+\.(?:js|css))$/i.test(publicPath)||/^\/assets\/(?!.*(?:^|\/)\.)[a-z0-9_./-]+\.(?:png|jpe?g|webp|svg|wav|mp3|ogg)$/i.test(publicPath))){res.writeHead(404).end('Not found');return;}
   const path=resolve(root,'.'+publicPath);
   if(!path.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403).end();return;}
   if(!(await stat(path)).isFile()){res.writeHead(404).end();return;}
   const data=await readFile(path);
   res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(req.method==='HEAD'?undefined:data);
  }catch(error){
   if(req.url.startsWith('/api/leaderboard'))res.writeHead(503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}).end(JSON.stringify({ok:false,error:'전체 순위 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',entries:[]}));
   else res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('Not found');
  }
 });
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{process.loadEnvFile?.(resolve(root,'.env.local'));}catch{}
 const port=Number(process.env.PORT||4173);
 createLocalServer().listen(port,'127.0.0.1',()=>console.log(`예술in — 최종 오디션 · http://127.0.0.1:${port}`));
}
