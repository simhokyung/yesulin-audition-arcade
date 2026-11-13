import test from 'node:test';
import assert from 'node:assert/strict';
import {createEntry, LocalRanking, getIndividualBoard, getCrewBoard, toCSV, RANKING_STORAGE_KEY, normalizeIdentity, getPersonalStanding,formatRunTime} from './ranking.js';

function entry(overrides = {}) {
  return createEntry({runId: 'run-1', name: '배우', crew: '예술팀', score: 100,
    duration: 0, difficulty: 'standard', character: 'actor', bosses: 1, maxCombo: 8,
    runTime: 90, lastClearTime:overrides.bosses===0?null:20, endReason: 'clear', createdAt: '2026-11-12T10:00:00.000Z', ...overrides});
}
function memoryStorage() {
  const data = new Map();
  return {getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value)};
}

test('entries normalize Korean-safe names, strip markup/control characters, and bound text', () => {
  const row = entry({name: '  Ａ배우<>\u0000  ', crew: '   예술   동아리   '});
  assert.equal(row.name, 'A배우');
  assert.equal(row.crew, '예술 동아리');
  assert.equal(row.version, 22); assert.equal(row.mode, 'challenge'); assert.equal(row.rulesVersion, 'challenge-v22');
  assert.equal(Array.from(entry({name: '한'.repeat(30), crew: '예'.repeat(30)}).name).length, 12);
  assert.equal(Array.from(entry({crew: '예'.repeat(30)}).crew).length, 16);
  assert.equal(entry({name: '   '}).name, '이름없는 예술인');
  assert.equal(entry({name: '12345678901 suffix'}).name, '12345678901');
});

test('invalid numeric values, durations, dates and partitions are rejected', () => {
  for (const score of [NaN, Infinity, -1, '100', null]) assert.throws(() => entry({score}), TypeError);
  for (const duration of [-1, 30, 60, 90, 120, '0', Infinity]) assert.throws(() => entry({duration}), TypeError);
  assert.equal(entry({duration: 0}).duration, 0);
  assert.throws(() => entry({bosses: 1.5}), TypeError);
  assert.throws(() => entry({maxCombo: -1}), TypeError);
  assert.throws(() => entry({runTime: Infinity}), TypeError);
  assert.throws(() => entry({createdAt: 'not a date'}), TypeError);
  assert.throws(() => entry({runId: '  '}), TypeError);
  assert.throws(() => entry({difficulty: 'unknown'}), TypeError);
});

test('saving the same runId is idempotent and preserves its first score and identity', () => {
  const ranking = new LocalRanking(memoryStorage());
  assert.deepEqual(ranking.load(), {ok: true, error: null, entries: []});
  assert.equal(ranking.save(entry()).ok, true);
  const duplicate = ranking.save(entry({name: '다른 배우', score: 999}));
  assert.equal(duplicate.ok, true); assert.equal(duplicate.entry.score, 100);
  assert.equal(duplicate.entries.length, 1); assert.equal(duplicate.entry.name, '배우');
});

test('leaderboards isolate duration, difficulty and rules version', () => {
  const rows = [entry(), {...entry({runId: '60', score: 900}), duration: 60},
    entry({runId: 'hard', difficulty: 'hard', score: 900}),
    {...entry({runId: 'legacy', score: 999}), rulesVersion: 'booth-v1'}];
  assert.deepEqual(getIndividualBoard(rows).map(row => row.runId), ['run-1']);
  assert.deepEqual(getIndividualBoard(rows, {duration: 60}).map(row => row.runId), []);
  assert.deepEqual(getIndividualBoard(rows, {difficulty: 'hard'}).map(row => row.runId), ['hard']);
  assert.deepEqual(getIndividualBoard(rows, {rulesVersion: 'booth-v1'}), []);
});

test('nickname and crew normalization deduplicates personal best while distinct crews remain separate', () => {
  const rows = [entry({runId: 'a', name: 'Ａ배우', crew: ' 예술팀 ', score: 90}),
    entry({runId: 'b', name: 'A배우', score: 150}),
    entry({runId: 'c', name: 'A배우', crew: '다른팀', score: 130})];
  const board = getIndividualBoard(rows);
  assert.deepEqual(board.map(row => row.runId), ['b', 'c']);
});

test('passed auditions rank first, then score, combo and earlier creation time', () => {
  const rows = [entry({runId: 'a', name: '가', bosses: 0, maxCombo: 99}),
    entry({runId: 'b', name: '나', bosses: 2, maxCombo: 9}),
    entry({runId: 'c', name: '다', bosses: 2, maxCombo: 10, createdAt: '2026-11-12T10:01:00Z'}),
    entry({runId: 'd', name: '라', bosses: 2, maxCombo: 10, createdAt: '2026-11-12T10:00:00Z'})];
  assert.deepEqual(getIndividualBoard(rows).map(row => row.runId), ['d', 'c', 'b', 'a']);
});

test('crew scores use top three personal bests and count all unique participants', () => {
  const rows = [100, 200, 300, 400].map((score, i) => entry({runId: `a${i}`, name: `배우${i}`, score}));
  rows.push(entry({runId: 'duplicate', name: '배우3', score: 399}),
    entry({runId: 'solo', name: '솔로', crew: '', score: 999}),
    entry({runId: 'unaffiliated', name: '솔로2', crew: ' 무소속 ', score: 999}),
    entry({runId: 'other', name: '감독', crew: '작은팀', score: 500}));
  const board = getCrewBoard(rows);
  assert.equal(board.length, 2); assert.equal(board[0].crew, '예술팀');
  assert.equal(board[0].score, 900); assert.equal(board[0].memberCount, 4);
  assert.deepEqual(board[0].members.map(row => row.score), [400, 300, 200]);
});

test('blocked or failed storage reports errors without throwing or falsely saving', () => {
  const missing = new LocalRanking(null);
  assert.equal(missing.load().ok, false); assert.equal(missing.save(entry()).ok, false);
  const blocked = new LocalRanking({getItem() {throw new Error('blocked');}, setItem() {}});
  assert.equal(blocked.load().ok, false); assert.equal(blocked.save(entry()).entry, null);
  const full = new LocalRanking({getItem: () => null, setItem() {throw new Error('quota');}});
  assert.equal(full.save(entry()).ok, false); assert.equal(full.save(entry()).entry, null);
  assert.equal(full.save({score: NaN}).ok, false);
});

test('malformed, wrong-version and invalid stored records are rejected without overwriting', () => {
  const storage = memoryStorage(), ranking = new LocalRanking(storage);
  const bad = ['{', '{}', JSON.stringify({version: 1, entries: []}),
    JSON.stringify({version: 22, rulesVersion: 'challenge-v22', entries: [{...entry(), score: '100'}]}),
    JSON.stringify({version: 22, rulesVersion: 'challenge-v22', entries: [entry(), entry()]})];
  for (const raw of bad) {
    storage.setItem(RANKING_STORAGE_KEY, raw);
    assert.equal(ranking.load().ok, false); assert.equal(ranking.save(entry()).ok, false);
    assert.equal(storage.getItem(RANKING_STORAGE_KEY), raw);
  }
});

test('storage retains at most the latest 500 runs', () => {
  const storage = memoryStorage(), ranking = new LocalRanking(storage);
  const rows = Array.from({length: 500}, (_, i) => entry({runId: `old-${i}`, createdAt: Date.UTC(2026, 0, 1, 0, 0, i)}));
  storage.setItem(RANKING_STORAGE_KEY, JSON.stringify({version: 22, rulesVersion: 'challenge-v22', entries: rows}));
  const saved = ranking.save(entry({runId: 'newest'}));
  assert.equal(saved.ok, true); assert.equal(saved.entries.length, 500);
  assert.equal(saved.entries[0].runId, 'newest');
  assert.equal(saved.entries.some(row => row.runId === 'old-0'), false);
  assert.equal(ranking.load().entries.length, 500);
});

test('CSV quotes delimiters and prefixes formula-leading values', () => {
  const rows = ['=SUM(1,2)', '+cmd', '-cmd', '@cmd'].map((name, i) => entry({runId: `csv-${i}`, name, crew: '팀,"A"'}));
  const csv = toCSV(rows);
  assert.equal(csv.startsWith('\ufeff'), true);
  for (const name of ['=SUM(1,2)', '+cmd', '-cmd', '@cmd']) assert.ok(csv.includes(`"'${name}"`));
  assert.ok(csv.includes('"팀,""A"""'));
  const sanitized = toCSV([entry({name: '\t=1+1', crew: '\r@cmd'})]);
  assert.ok(sanitized.includes('"\'=1+1"')); assert.ok(sanitized.includes('"\'@cmd"'));
  assert.equal(csv.split('\r\n').length, rows.length + 2);
});

test('v22 starts a separate board and preserves existing v2, v3, v4, v5 and v6 storage bytes', () => {
  const storage = memoryStorage(), previousPayloads = new Map();
  for (const version of [2, 3, 4, 5, 6]) {
    const key = `yesulin-ranking-v${version}`;
    const legacy = {...entry({runId: `v${version}-run`, score: 999999}), mode: 'booth', duration: 90, version, rulesVersion: `booth-v${version}`};
    const payload = JSON.stringify({version, rulesVersion: `booth-v${version}`, entries: [legacy]});
    previousPayloads.set(key, payload);
    storage.setItem(key, payload);
  }
  const ranking = new LocalRanking(storage);
  assert.equal(RANKING_STORAGE_KEY, 'yesulin-ranking-v22');
  assert.deepEqual(ranking.load(), {ok: true, error: null, entries: []});
  const saved = ranking.save(entry({runId: 'v22-run', score: 120}));
  assert.equal(saved.ok, true);
  assert.deepEqual(saved.entries.map(row => row.runId), ['v22-run']);
  for (const [key, payload] of previousPayloads) assert.equal(storage.getItem(key), payload);
  const current = JSON.parse(storage.getItem(RANKING_STORAGE_KEY));
  assert.equal(current.version, 22); assert.equal(current.rulesVersion, 'challenge-v22');
  assert.equal(current.entries[0].version, 22);
});

test('legacy v2, v3, v4, v5 and v6 rows cannot enter v22 personal, crew, CSV or save paths', () => {
  const current = entry({runId: 'v22-run', score: 120});
  for (const version of [2, 3, 4, 5, 6]) {
    const rulesVersion = `booth-v${version}`;
    const legacy = {...entry({runId: `v${version}-run`, name: '예전도전자', score: 999999}), mode: 'booth', duration: 90, version, rulesVersion};
    assert.deepEqual(getIndividualBoard([legacy, current]).map(row => row.runId), ['v22-run']);
    assert.equal(getCrewBoard([legacy, current])[0].score, 120);
    assert.equal(toCSV([legacy, current]).includes('예전도전자'), false);
    assert.equal(toCSV([legacy, current]).includes(rulesVersion), false);
    const storage = memoryStorage(), ranking = new LocalRanking(storage);
    assert.equal(ranking.save(legacy).ok, false);
    assert.deepEqual(ranking.load().entries, []);
    assert.throws(() => createEntry(legacy), TypeError);
    storage.setItem(RANKING_STORAGE_KEY, JSON.stringify({version, rulesVersion, entries: [legacy]}));
    assert.equal(ranking.load().ok, false);
  }
});

test('setup identity and saved entry use exactly the same normalization', () => {
  const raw = {name: '  Ａ배우<>\u0000  ', crew: '   예술   동아리\u200b   '};
  const normalized = normalizeIdentity(raw), saved = entry(raw);
  assert.deepEqual(normalized, {name: saved.name, crew: saved.crew});
  assert.deepEqual(normalizeIdentity(), {name: '이름없는 예술인', crew: ''});
  assert.equal(Array.from(normalizeIdentity({name:'한'.repeat(25),crew:'예'.repeat(25)}).name).length,12);
  assert.equal(Array.from(normalizeIdentity({name:'한'.repeat(25),crew:'예'.repeat(25)}).crew).length,16);
});

test('personal standing finds a normalized personal best outside the visible top ten', () => {
  const rows = Array.from({length: 12}, (_, i) => entry({runId:`leader-${i}`,name:`다른배우${i}`,score:1000-i}));
  rows.push(entry({runId:'mine-low',name:'A배우',score:90}),entry({runId:'mine-best',name:'A배우',score:100}));
  const result=getPersonalStanding(rows,{name:' Ａ배우 ',crew:' 예술팀 '});
  assert.equal(result.rank,13);assert.equal(result.total,13);assert.equal(result.best.runId,'mine-best');
  assert.deepEqual(result.identity,{name:'A배우',crew:'예술팀'});
});

test('personal standing isolates crew, duration, difficulty and rules version', () => {
  const rows=[entry(),{...entry({runId:'short',score:500}),duration:60},entry({runId:'other',crew:'다른팀',score:600}),entry({runId:'hard',difficulty:'hard',score:700}),{...entry({runId:'legacy',score:999}),version:5,rulesVersion:'booth-v5'}];
  assert.equal(getPersonalStanding(rows,{name:'배우',crew:'예술팀'}).best.runId,'run-1');
  assert.equal(getPersonalStanding(rows,{name:'배우',crew:'예술팀'},{duration:60}).best,null);
  assert.equal(getPersonalStanding(rows,{name:'배우',crew:'다른팀'}).best.runId,'other');
  assert.equal(getPersonalStanding(rows,{name:'배우',crew:'예술팀'},{difficulty:'hard'}).best.runId,'hard');
  const absent=getPersonalStanding(rows,{name:'아직없음',crew:''});
  assert.equal(absent.best,null);assert.equal(absent.rank,null);assert.equal(absent.total,2);
  assert.equal(getPersonalStanding(rows,{name:'배우',crew:'예술팀'},{rulesVersion:'booth-v5'}).total,0);
});

test('unlimited challenge uses duration zero by default and exports its label without time bonuses', () => {
  const fast = createEntry({runId:'fast',name:'빠른배우',score:123,runTime:20});
  const slow = createEntry({runId:'slow',name:'느린배우',score:123,runTime:7200,createdAt:'2026-01-01'});
  assert.equal(fast.duration,0);assert.equal(fast.mode,'challenge');
  assert.equal(slow.score,123);assert.equal(slow.runTime,7200);
  assert.equal(getIndividualBoard([fast,slow])[0].runId,'slow','elapsed time is not a tiebreaker');
  assert.equal(getPersonalStanding([fast,slow],{name:'느린배우'}).rank,1);
  const csv=toCSV([fast,slow]);assert.equal(csv.match(/"무제한"/g).length,2);
});

test('timed booth records cannot be reclassified or saved in the unlimited v22 board', () => {
  for(const duration of [60,90,120]){
    const legacy={...entry({runId:`timed-${duration}`,score:999999}),duration};
    assert.throws(()=>createEntry(legacy),TypeError);
    assert.equal(new LocalRanking(memoryStorage()).save(legacy).ok,false);
    assert.deepEqual(getIndividualBoard([legacy]),[]);assert.equal(toCSV([legacy]).includes('999999'),false);
  }
  assert.throws(()=>entry({mode:'booth',duration:0}),TypeError);
  assert.throws(()=>entry({rulesVersion:'booth-v22',duration:0}),TypeError);
});

test('real v7 untimed two-boss records remain byte-identical and outside the v22 five-boss season', () => {
  const storage=memoryStorage(), legacy={...entry({runId:'actual-v7',name:'이전도전자',crew:'',score:5676,bosses:2}),version:7,rulesVersion:'challenge-v7'};
  const raw=JSON.stringify({version:7,rulesVersion:'challenge-v7',entries:[legacy]});
  storage.setItem('yesulin-ranking-v7',raw);
  const ranking=new LocalRanking(storage);assert.deepEqual(ranking.load().entries,[]);
  const current=entry({runId:'four-boss-clear',crew:'',bosses:4,score:12000});
  assert.equal(ranking.save(current).ok,true);
  assert.equal(storage.getItem('yesulin-ranking-v7'),raw);
  assert.equal(ranking.save(legacy).ok,false);
  assert.deepEqual(getIndividualBoard([legacy,current]).map(r=>r.runId),['four-boss-clear']);
  assert.equal(getPersonalStanding([legacy,current],{name:'이전도전자'}).best,null);
  assert.equal(toCSV([legacy,current]).includes('이전도전자'),false);
});

test('v8 four-boss records are preserved and excluded from the strengthened v22 combat season', () => {
  const storage=memoryStorage(), legacy={...entry({runId:'actual-v8',name:'네무대도전자',crew:'',score:19870,bosses:4}),version:8,rulesVersion:'challenge-v8'};
  const raw=JSON.stringify({version:8,rulesVersion:'challenge-v8',entries:[legacy]});storage.setItem('yesulin-ranking-v8',raw);
  const ranking=new LocalRanking(storage);assert.deepEqual(ranking.load().entries,[]);
  const current=entry({runId:'v22-new-combat',name:'새도전자',crew:'',bosses:4,score:25000});
  assert.equal(ranking.save(current).ok,true);assert.equal(storage.getItem('yesulin-ranking-v8'),raw);
  assert.equal(ranking.save(legacy).ok,false);
  assert.deepEqual(getIndividualBoard([legacy,current]).map(r=>r.runId),['v22-new-combat']);
  assert.equal(getPersonalStanding([legacy,current],{name:'네무대도전자'}).best,null);
  assert.equal(toCSV([legacy,current]).includes('challenge-v8'),false);
});

test('v9 records remain byte-identical and cannot enter the v22 enhanced-kit season', () => {
  const storage=memoryStorage(),legacy={...entry({runId:'real-v9',name:'이전참가자',crew:'',score:31415,bosses:4}),version:9,rulesVersion:'challenge-v9'};
  const raw=JSON.stringify({version:9,rulesVersion:'challenge-v9',entries:[legacy]});storage.setItem('yesulin-ranking-v9',raw);
  const ranking=new LocalRanking(storage),current=entry({runId:'v22-enhanced',name:'신규참가자',crew:'',score:25000});
  assert.deepEqual(ranking.load().entries,[]);assert.equal(ranking.save(current).ok,true);
  assert.equal(storage.getItem('yesulin-ranking-v9'),raw);assert.equal(ranking.save(legacy).ok,false);
  assert.deepEqual(getIndividualBoard([legacy,current]).map(r=>r.runId),['v22-enhanced']);
  assert.equal(getPersonalStanding([legacy,current],{name:'이전참가자'}).best,null);
  assert.equal(toCSV([legacy,current]).includes('challenge-v9'),false);
});

test('practice, duel and pattern runs cannot be saved or appear in a ranked board', () => {
  const storage=memoryStorage(),ranking=new LocalRanking(storage),current=entry();
  for(const mode of ['practice','duel','pattern']){
    const drill={...current,runId:mode,mode,score:999999};
    assert.throws(()=>createEntry(drill),TypeError);assert.equal(ranking.save(drill).ok,false);
    assert.deepEqual(getIndividualBoard([drill,current]),[current]);assert.equal(toCSV([drill]).split('\r\n').length,2);
  }
  assert.equal(storage.getItem(RANKING_STORAGE_KEY),null);
});

test('v10 challenge records stay byte-identical and cannot enter the v22 blade-wave season', () => {
  const storage=memoryStorage(),old={...entry({runId:'actual-v10',name:'열번째무대',crew:'',score:30150,bosses:4}),version:10,rulesVersion:'challenge-v10'};
  const bytes=JSON.stringify({version:10,rulesVersion:'challenge-v10',entries:[old]});storage.setItem('yesulin-ranking-v10',bytes);
  const ranking=new LocalRanking(storage),current=entry({runId:'v22-wave',name:'새참가자',crew:'',score:27000});
  assert.deepEqual(ranking.load().entries,[]);assert.equal(ranking.save(current).ok,true);
  assert.equal(storage.getItem('yesulin-ranking-v10'),bytes);assert.equal(ranking.save(old).ok,false);
  assert.deepEqual(getIndividualBoard([old,current]).map(r=>r.runId),['v22-wave']);
  assert.equal(getPersonalStanding([old,current],{name:'열번째무대'}).best,null);
  assert.equal(toCSV([old,current]).includes('challenge-v10'),false);
});


test('v11 blade-wave records remain byte-identical and outside the alternating v22 takeover season', () => {
  const storage=memoryStorage(),legacy={...entry({runId:'real-v11',name:'파도생존자',crew:'',score:31700,bosses:4}),version:11,rulesVersion:'challenge-v11'};
  const bytes=JSON.stringify({version:11,rulesVersion:'challenge-v11',entries:[legacy]});storage.setItem('yesulin-ranking-v11',bytes);
  const ranking=new LocalRanking(storage),current=entry({runId:'v22-pursuit',name:'추격도전자',crew:'',score:27500});
  assert.deepEqual(ranking.load().entries,[]);assert.equal(ranking.save(current).ok,true);
  assert.equal(storage.getItem('yesulin-ranking-v11'),bytes);assert.equal(ranking.save(legacy).ok,false);
  assert.deepEqual(getIndividualBoard([legacy,current]).map(row=>row.runId),['v22-pursuit']);
  assert.equal(getPersonalStanding([legacy,current],{name:'파도생존자'}).best,null);
  assert.equal(toCSV([legacy,current]).includes('challenge-v11'),false);
});

test('v12 pursuit records stay untouched and cannot enter the v22 barrage season', () => {
  const storage=memoryStorage(),legacy={...entry({runId:'real-v12',name:'추격생존자',crew:'',score:31800,bosses:4}),version:12,rulesVersion:'challenge-v12'};
  const bytes=JSON.stringify({version:12,rulesVersion:'challenge-v12',entries:[legacy]});storage.setItem('yesulin-ranking-v12',bytes);
  const ranking=new LocalRanking(storage),current=entry({runId:'v22-barrage',name:'연속회피자',crew:'',score:28100});
  assert.deepEqual(ranking.load().entries,[]);assert.equal(ranking.save(current).ok,true);
  assert.equal(storage.getItem('yesulin-ranking-v12'),bytes);assert.equal(ranking.save(legacy).ok,false);
  assert.deepEqual(getIndividualBoard([legacy,current]).map(row=>row.runId),['v22-barrage']);
  assert.equal(getPersonalStanding([legacy,current],{name:'추격생존자'}).best,null);
  assert.equal(toCSV([legacy,current]).includes('challenge-v12'),false);
});


test('more passed auditions beats arbitrarily higher score, including personal best selection', () => {
  const rows=[entry({runId:'farm',name:'같은참가자',bosses:1,score:999999}),entry({runId:'progress',name:'같은참가자',bosses:2,score:10}),entry({runId:'clear',name:'완주자',bosses:5,score:1}),entry({runId:'three',name:'진출자',bosses:3,score:80000})];
  assert.deepEqual(getIndividualBoard(rows).map(r=>r.runId),['clear','three','progress']);
  assert.equal(getPersonalStanding(rows,{name:'같은참가자',crew:'예술팀'}).best.runId,'progress');
  assert.throws(()=>entry({bosses:6}),TypeError);
  const tied=[entry({runId:'a',name:'가',bosses:2,score:50,maxCombo:100}),entry({runId:'b',name:'나',bosses:2,score:60,maxCombo:1})];
  assert.equal(getIndividualBoard(tied)[0].runId,'b');
});

test('v13 records remain untouched and isolated from v22 progress-first ranking', () => {
  const storage=memoryStorage(),old={...entry({runId:'old-v13',score:999999,bosses:4}),version:13,rulesVersion:'challenge-v13'};
  const bytes=JSON.stringify({version:13,rulesVersion:'challenge-v13',entries:[old]});storage.setItem('yesulin-ranking-v13',bytes);
  const ranking=new LocalRanking(storage),current=entry({runId:'v22-progress',score:100,bosses:1});
  assert.deepEqual(ranking.load().entries,[]);assert.equal(ranking.save(current).ok,true);
  assert.equal(storage.getItem('yesulin-ranking-v13'),bytes);assert.equal(ranking.save(old).ok,false);
  assert.deepEqual(getIndividualBoard([old,current]).map(r=>r.runId),['v22-progress']);
});


test('v14 records are preserved outside the v22 rapid-barrage season', () => {
  const storage=memoryStorage(),old={...entry({runId:'old-v14',bosses:4}),version:14,rulesVersion:'challenge-v14'};
  const bytes=JSON.stringify({version:14,rulesVersion:'challenge-v14',entries:[old]});storage.setItem('yesulin-ranking-v14',bytes);
  const ranking=new LocalRanking(storage),current=entry({runId:'new-v22'});
  assert.deepEqual(ranking.load().entries,[]);assert.equal(ranking.save(current).ok,true);
  assert.equal(storage.getItem('yesulin-ranking-v14'),bytes);assert.equal(ranking.save(old).ok,false);
  assert.deepEqual(getIndividualBoard([old,current]).map(r=>r.runId),['new-v22']);
});


test('v15 records remain byte-identical and separate from the v22 movement-pattern season', () => {
  const storage=memoryStorage(),old={...entry({runId:'old-v15',name:'기존참가자',bosses:4,score:99999}),version:15,rulesVersion:'challenge-v15'};
  const bytes=JSON.stringify({version:15,rulesVersion:'challenge-v15',entries:[old]});storage.setItem('yesulin-ranking-v15',bytes);
  const ranking=new LocalRanking(storage),current=entry({runId:'new-v22',name:'새도전자',bosses:1,score:100});
  assert.deepEqual(ranking.load().entries,[]);assert.equal(ranking.save(current).ok,true);
  assert.equal(storage.getItem('yesulin-ranking-v15'),bytes);assert.equal(ranking.save(old).ok,false);
  assert.deepEqual(getIndividualBoard([old,current]).map(row=>row.runId),['new-v22']);
  assert.equal(getPersonalStanding([old,current],{name:'기존참가자'}).best,null);
  assert.equal(toCSV([old,current]).includes('challenge-v15'),false);
});


test('v17 photo-season records remain byte-identical and outside the harder v22 personality season', () => {
  const storage=memoryStorage(),old={...entry({runId:'old-v17',name:'이전도전자',bosses:4,score:50000}),version:17,rulesVersion:'challenge-v17'};
  const raw=JSON.stringify({version:17,rulesVersion:'challenge-v17',entries:[old]});storage.setItem('yesulin-ranking-v17',raw);
  const ranking=new LocalRanking(storage),current=entry({runId:'new-v22-personality',name:'새도전자',bosses:1,score:100});
  assert.deepEqual(ranking.load().entries,[]);assert.equal(ranking.save(current).ok,true);
  assert.equal(storage.getItem('yesulin-ranking-v17'),raw);
  assert.deepEqual(getIndividualBoard([old,current]).map(r=>r.runId),['new-v22-personality']);
  assert.equal(ranking.save(old).ok,false);assert.throws(()=>entry(old),TypeError);
});


test('v18 four-boss records stay byte-identical and cannot enter the v22 five-boss season',()=>{
 const storage=memoryStorage(),old={...entry({runId:'old-v18',name:'이전완주자',bosses:4,score:50000}),version:18,rulesVersion:'challenge-v18'};
 const raw=JSON.stringify({version:18,rulesVersion:'challenge-v18',entries:[old]});storage.setItem('yesulin-ranking-v18',raw);
 const ranking=new LocalRanking(storage),current=entry({runId:'new-v22-five',name:'새완주자',bosses:5,score:100});
 assert.deepEqual(ranking.load().entries,[]);assert.equal(ranking.save(current).ok,true);assert.equal(storage.getItem('yesulin-ranking-v18'),raw);
 assert.deepEqual(getIndividualBoard([old,current]).map(r=>r.runId),['new-v22-five']);assert.equal(ranking.save(old).ok,false);assert.throws(()=>entry(old),TypeError);
 assert.equal(toCSV([old,current]).includes('이전완주자'),false);
});

test('five completed auditions outrank any four-clear score and survive saving and loading',()=>{
 const ranking=new LocalRanking(memoryStorage()),partial=entry({runId:'four-clear',name:'진출자',bosses:4,score:999999}),complete=entry({runId:'five-clear',name:'완주자',bosses:5,score:1});
 assert.equal(ranking.save(partial).ok,true);assert.equal(ranking.save(complete).ok,true);
 const board=getIndividualBoard(ranking.load().entries);assert.deepEqual(board.map(r=>r.runId),['five-clear','four-clear']);assert.equal(board[0].bosses,5);
 assert.equal(getPersonalStanding(board,{name:'완주자',crew:'예술팀'}).rank,1);for(const bosses of [6,-1,5.5])assert.throws(()=>entry({bosses}),TypeError);
});

test('v22 ranks equal clears by last successful clear time before score and combo',()=>{
 const rows=[entry({runId:'more',name:'관문우선',bosses:3,lastClearTime:60,score:1}),entry({runId:'fast',name:'빠른통과',bosses:2,lastClearTime:25,score:1}),entry({runId:'slow',name:'느린통과',bosses:2,lastClearTime:30,score:999999,maxCombo:1000}),entry({runId:'tie',name:'동률통과',bosses:2,lastClearTime:25,score:2})];
 assert.deepEqual(getIndividualBoard(rows).map(r=>r.runId),['more','tie','fast','slow']);
 const sameName=rows.slice(1).map(r=>({...r,name:'한 참가자'}));assert.equal(getIndividualBoard(sameName)[0].runId,'tie');
});
test('time after the last cleared audition never improves or worsens ranking',()=>{
 const short=entry({runId:'short-survival',name:'짧은생존',bosses:2,lastClearTime:20,runTime:22,score:100,createdAt:'2026-11-12T10:00:00Z'}),long=entry({runId:'long-survival',name:'긴생존',bosses:2,lastClearTime:20,runTime:600,score:100,createdAt:'2026-11-12T10:00:01Z'});
 assert.equal(getIndividualBoard([long,short])[0].runId,short.runId);
 assert.equal(getIndividualBoard([{...long,lastClearTime:19},short])[0].runId,long.runId);
});
test('zero-clears rank by damage score without rewarding early deaths or long survival',()=>{
 const rows=[entry({runId:'quick',name:'빠른탈락',bosses:0,runTime:1,score:100}),entry({runId:'long',name:'오랜생존',bosses:0,runTime:1000,score:99}),entry({runId:'damage',name:'피해우선',bosses:0,runTime:20,score:101})];assert.deepEqual(getIndividualBoard(rows).map(r=>r.runId),['damage','quick','long']);
});
test('clear time must match progression and remain finite positive and within runtime',()=>{
 for(const lastClearTime of[undefined,null,0,-1,NaN,Infinity,'20',91])assert.throws(()=>entry({lastClearTime}),TypeError);
 for(const lastClearTime of[0,1,NaN,Infinity,'0'])assert.throws(()=>entry({bosses:0,lastClearTime}),TypeError);
 assert.equal(entry({bosses:0,lastClearTime:null,stageClearTimes:[]}).lastClearTime,null);
 assert.deepEqual(entry({bosses:2,lastClearTime:20,stageClearTimes:[10,20]}).stageClearTimes,[10,20]);
 for(const stageClearTimes of[null,{},[20],[20,10],[10,10],[0,20],[-1,20],[10,NaN],[10,Infinity],[10,'20'],[10,19],[10,100]])assert.throws(()=>entry({bosses:2,lastClearTime:20,stageClearTimes}),TypeError);
 assert.throws(()=>entry({bosses:0,stageClearTimes:[1]}),TypeError);
 const values=[10,20],saved=entry({bosses:2,lastClearTime:20,stageClearTimes:values});values[0]=99;assert.deepEqual(saved.stageClearTimes,[10,20]);
});
test('clear time survives local save reload and CSV export',()=>{const ranking=new LocalRanking(memoryStorage()),input=entry({bosses:2,lastClearTime:25.125,stageClearTimes:[11.5,25.125]});assert(ranking.save(input).ok);assert.deepEqual(ranking.load().entries[0],input);const csv=toCSV([input]);assert.match(csv,/통과 시간\(초\)/);assert.match(csv,/25\.125/);assert.equal(formatRunTime(65.125),'1:05.13');assert.equal(formatRunTime(59.999),'1:00.00');assert.equal(formatRunTime(null),'--');});
test('v19 local records stay byte-identical and never acquire invented clear times in v22',()=>{const storage=memoryStorage(),old={...entry(),version:19,rulesVersion:'challenge-v19'};delete old.lastClearTime;const bytes=JSON.stringify({version:19,rulesVersion:'challenge-v19',entries:[old]});storage.setItem('yesulin-ranking-v19',bytes);const local=new LocalRanking(storage);assert.deepEqual(local.load().entries,[]);assert(local.save(entry()).ok);assert.equal(storage.getItem('yesulin-ranking-v19'),bytes);assert.equal(local.save(old).ok,false);assert.deepEqual(getIndividualBoard([old]),[]);});

test('v20 time-ranked local records retain their original bytes and times outside v22',()=>{const storage=memoryStorage(),old={...entry({bosses:2,lastClearTime:25.5,stageClearTimes:[11,25.5]}),version:20,rulesVersion:'challenge-v20'},bytes=JSON.stringify({version:20,rulesVersion:'challenge-v20',entries:[old]});storage.setItem('yesulin-ranking-v20',bytes);const ranking=new LocalRanking(storage);assert.deepEqual(ranking.load().entries,[]);assert(ranking.save(entry()).ok);assert.equal(storage.getItem('yesulin-ranking-v20'),bytes);assert.equal(ranking.save(old).ok,false);assert.deepEqual(getIndividualBoard([old]),[]);assert.equal(old.lastClearTime,25.5);});

test('v21 time-ranked local records retain their original bytes and times outside v22',()=>{const storage=memoryStorage(),old={...entry({bosses:2,lastClearTime:25.5,stageClearTimes:[11,25.5]}),version:21,rulesVersion:'challenge-v21'},bytes=JSON.stringify({version:21,rulesVersion:'challenge-v21',entries:[old]});storage.setItem('yesulin-ranking-v21',bytes);const ranking=new LocalRanking(storage);assert.deepEqual(ranking.load().entries,[]);assert(ranking.save(entry()).ok);assert.equal(storage.getItem('yesulin-ranking-v21'),bytes);assert.equal(ranking.save(old).ok,false);assert.deepEqual(getIndividualBoard([old]),[]);assert.equal(old.lastClearTime,25.5);});
