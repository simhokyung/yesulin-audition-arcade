/** Local unlimited-challenge leaderboard. No network calls or cloud persistence. */
export const RANKING_STORAGE_KEY = 'yesulin-ranking-v18';
export const RANKING_RULES_VERSION = 'challenge-v18';
export const RANKING_SEASON = 18;
const SCHEMA_VERSION = RANKING_SEASON;
const MAX_ENTRIES = 500;
const DURATIONS = new Set([0]);
const DIFFICULTIES = new Set(['rehearsal', 'standard', 'hard']);

function plain(value, limit) {
  if (typeof value !== 'string') return '';
  return Array.from(value.normalize('NFKC')
    .replace(/[<>\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '')
    .replace(/\s+/gu, ' ').trim()).slice(0, limit).join('').trim();
}

/** Shared identity rules for nickname setup, saved runs and the personal card. */
export function normalizeIdentity({name, crew} = {}) {
  return {name: plain(name, 12) || '이름없는 예술인', crew: plain(crew, 16)};
}

function number(value, label, {integer = false} = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 ||
      (integer && !Number.isSafeInteger(value))) {
    throw new TypeError(`${label} 값은 유한한 0 이상의 ${integer ? '정수' : '숫자'}여야 합니다.`);
  }
  return value;
}

/** Returns one canonical entry; invalid game statistics throw TypeError. */
export function createEntry({runId, name, crew, score, duration = 0,
  difficulty = 'standard', character = 'director', bosses = 0, maxCombo = 0,
  runTime = 0, endReason = 'clear', createdAt = new Date().toISOString(),
  version = SCHEMA_VERSION, mode = 'challenge', rulesVersion = RANKING_RULES_VERSION} = {}) {
  if (version !== SCHEMA_VERSION || mode !== 'challenge' || rulesVersion !== RANKING_RULES_VERSION) {
    throw new TypeError('현재 무제한 도전 v18 규칙의 기록만 등록할 수 있습니다.');
  }
  const id = plain(runId, 80);
  if (!id) throw new TypeError('runId가 필요합니다.');
  if (!DURATIONS.has(duration)) throw new TypeError('무제한 도전의 제한 시간 값은 0이어야 합니다.');
  if (!DIFFICULTIES.has(difficulty)) throw new TypeError('올바른 난이도를 선택하세요.');
  if (character !== 'director' && character !== 'actor') throw new TypeError('올바른 캐릭터를 선택하세요.');
  if ((typeof createdAt !== 'string' && typeof createdAt !== 'number') ||
      (typeof createdAt === 'number' && !Number.isFinite(createdAt))) {
    throw new TypeError('기록 시간이 올바르지 않습니다.');
  }
  const date = new Date(createdAt);
  if (!Number.isFinite(date.getTime())) throw new TypeError('기록 시간이 올바르지 않습니다.');
  return {
    version: SCHEMA_VERSION,
    mode: 'challenge',
    rulesVersion: RANKING_RULES_VERSION,
    runId: id,
    ...normalizeIdentity({name, crew}),
    score: number(score, '점수'),
    duration,
    difficulty,
    character,
    bosses: passedAuditions(bosses),
    maxCombo: number(maxCombo, '최대 콤보', {integer: true}),
    runTime: number(runTime, '플레이 시간'),
    endReason: plain(endReason, 24) || 'clear',
    createdAt: date.toISOString(),
  };
}

function passedAuditions(value) {
  number(value, '통과 오디션 수', {integer: true});
  if (value > 4) throw new TypeError('통과 오디션 수는 0~4여야 합니다.');
  return value;
}

function storedEntry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      value.version !== SCHEMA_VERSION || value.mode !== 'challenge' || value.rulesVersion !== RANKING_RULES_VERSION) return null;
  for (const field of ['runId', 'name', 'crew', 'difficulty', 'character', 'endReason', 'createdAt']) {
    if (typeof value[field] !== 'string') return null;
  }
  for (const field of ['score', 'duration', 'bosses', 'maxCombo', 'runTime']) {
    if (typeof value[field] !== 'number') return null;
  }
  try { return createEntry(value); } catch { return null; }
}

const failure = (error, entries = []) => ({ok: false, error, entries});

/** load(): {ok,error,entries}; save(): {ok,error,entry,entries}. Never throws. */
export class LocalRanking {
  constructor(storage) {
    this.storage = null;
    this.storageError = null;
    try {
      this.storage = arguments.length ? storage : globalThis.localStorage;
      if (!this.storage || typeof this.storage.getItem !== 'function' || typeof this.storage.setItem !== 'function') {
        this.storageError = '이 브라우저에서 로컬 랭킹 저장소를 사용할 수 없습니다.';
      }
    } catch {
      this.storageError = '브라우저가 로컬 랭킹 저장소 접근을 차단했습니다.';
    }
  }

  load() {
    if (this.storageError) return failure(this.storageError);
    let raw;
    try { raw = this.storage.getItem(RANKING_STORAGE_KEY); }
    catch { return failure('로컬 랭킹 기록을 읽을 수 없습니다. 브라우저 저장소 설정을 확인하세요.'); }
    if (raw === null || raw === undefined) return {ok: true, error: null, entries: []};
    let payload;
    try { payload = JSON.parse(raw); }
    catch { return failure('로컬 랭킹 기록이 손상되어 읽을 수 없습니다.'); }
    if (!payload || payload.version !== SCHEMA_VERSION || payload.rulesVersion !== RANKING_RULES_VERSION ||
        !Array.isArray(payload.entries) || payload.entries.length > MAX_ENTRIES) {
      return failure('로컬 랭킹 기록 형식이 올바르지 않습니다.');
    }
    const entries = [], ids = new Set();
    for (const value of payload.entries) {
      const entry = storedEntry(value);
      if (!entry || ids.has(entry.runId)) return failure('로컬 랭킹에 유효하지 않거나 중복된 기록이 있습니다.');
      ids.add(entry.runId);
      entries.push(entry);
    }
    return {ok: true, error: null, entries};
  }

  save(input) {
    let entry;
    try { entry = createEntry(input); }
    catch (error) { return {...failure(error instanceof Error ? error.message : '기록 값이 올바르지 않습니다.'), entry: null}; }
    const loaded = this.load();
    if (!loaded.ok) return {...loaded, entry: null};
    const existing = loaded.entries.find(row => row.runId === entry.runId);
    if (existing) return {ok: true, error: null, entry: existing, entries: loaded.entries};
    const entries = [...loaded.entries, entry]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.runId.localeCompare(b.runId))
      .slice(0, MAX_ENTRIES);
    try {
      this.storage.setItem(RANKING_STORAGE_KEY, JSON.stringify({version: SCHEMA_VERSION, rulesVersion: RANKING_RULES_VERSION, entries}));
    } catch {
      return {...failure('기록을 저장하지 못했습니다. 저장 공간 또는 브라우저 권한을 확인하세요.', loaded.entries), entry: null};
    }
    return {ok: true, error: null, entry, entries};
  }
}

function compareEntries(a, b) {
  return b.bosses - a.bosses || b.score - a.score || b.maxCombo - a.maxCombo ||
    a.createdAt.localeCompare(b.createdAt) || a.runId.localeCompare(b.runId);
}

/** One best run per normalized nickname+crew in the selected rules partition. */
export function getIndividualBoard(entries, {duration = 0, difficulty = 'standard', rulesVersion = RANKING_RULES_VERSION} = {}) {
  if (!Array.isArray(entries) || !DURATIONS.has(duration) || !DIFFICULTIES.has(difficulty) || rulesVersion !== RANKING_RULES_VERSION) return [];
  const best = new Map();
  for (const value of entries) {
    const entry = storedEntry(value);
    if (!entry || entry.duration !== duration || entry.difficulty !== difficulty) continue;
    const key = JSON.stringify([entry.name, entry.crew]);
    if (!best.has(key) || compareEntries(entry, best.get(key)) < 0) best.set(key, entry);
  }
  return [...best.values()].sort(compareEntries);
}

/** Personal best and 1-based rank across the whole selected board, including beyond top ten. */
export function getPersonalStanding(entries, identity, options = {}) {
  const normalized = normalizeIdentity(identity);
  const board = getIndividualBoard(entries, options);
  const index = board.findIndex(row => row.name === normalized.name && row.crew === normalized.crew);
  return {identity: normalized, best: index < 0 ? null : board[index], rank: index < 0 ? null : index + 1, total: board.length};
}

/** Crew score is the sum of its best three unique participants, not all runs. */
export function getCrewBoard(entries, options = {}) {
  const groups = new Map();
  for (const entry of getIndividualBoard(entries, options)) {
    if (!entry.crew || entry.crew === '무소속') continue;
    if (!groups.has(entry.crew)) groups.set(entry.crew, []);
    groups.get(entry.crew).push(entry);
  }
  return [...groups].map(([crew, participants]) => {
    const members = participants.slice(0, 3);
    return {crew, score: members.reduce((sum, row) => sum + row.score, 0), memberCount: participants.length, members};
  }).sort((a, b) => b.score - a.score || b.memberCount - a.memberCount || a.crew.localeCompare(b.crew));
}

function csvCell(value) {
  let text = String(value ?? '');
  // Quoting alone does not stop Excel/Sheets formula execution.
  if (/^[\t\r\n]/u.test(text) || /^\s*[=+\-@]/u.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

/** UTF-8 BOM and CRLF keep Korean labels readable in common spreadsheet apps. */
export function toCSV(entries) {
  const headers = ['닉네임', '소속', '점수', '제한 시간', '난이도', '캐릭터', '통과 오디션', '최대 콤보', '플레이 시간(초)', '종료 사유', '기록 시간', '회차 ID', '규칙 버전'];
  const rows = [headers];
  if (Array.isArray(entries)) for (const value of entries) {
    const row = storedEntry(value);
    if (!row) continue;
    rows.push([row.name, row.crew, row.score, '무제한', row.difficulty, row.character,
      row.bosses, row.maxCombo, row.runTime, row.endReason, row.createdAt, row.runId, row.rulesVersion]);
  }
  return '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
