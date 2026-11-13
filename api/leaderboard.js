import {createLeaderboardStore} from '../server/leaderboard-store.mjs';
import {createLeaderboardHandler} from '../server/leaderboard-handler.mjs';
let store,connection;
export default createLeaderboardHandler({getStore(){
  const url=process.env.DATABASE_URL;
  if(!url)return null;
  if(!store||connection!==url){store=createLeaderboardStore(url);connection=url;}
  return store;
}});
