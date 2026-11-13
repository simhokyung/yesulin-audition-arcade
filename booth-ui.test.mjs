import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BoothUI} from './booth-ui.js';
import {createEntry, getIndividualBoard, RANKING_SEASON} from './ranking.js';

// Small DOM double: exercise the real renderer without a browser or network.
class Element {
  constructor(tag = 'div') {
    this.tagName = tag;
    this.children = [];
    this.className = '';
    this.attributes = {};
    this.value = '';
    this.scrollTop = 0;
    this.tabIndex = -1;
    this.classList = {
      contains: name => this.className.split(/\s+/).includes(name),
      toggle: (name, force) => {
        const classes = new Set(this.className.split(/\s+/).filter(Boolean));
        const include = force ?? !classes.has(name);
        if (include) classes.add(name); else classes.delete(name);
        this.className = [...classes].join(' ');
        return include;
      },
    };
  }
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return (this.text || '') + this.children.map(child => child.textContent).join(''); }
  get firstChild() { return this.children[0] ?? null; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) {
    this.text = '';
    this.children = children;
    // A refresh must restore the user's position even if replacement resets it.
    this.scrollTop = 0;
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  querySelector(tag) {
    for (const child of this.children) {
      if (child.tagName === tag) return child;
      const found = child.querySelector(tag);
      if (found) return found;
    }
    return null;
  }
}

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
function fixture(t, {entries = [], name = '', status = 'ready', pending = []} = {}) {
  const nodes = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => [id, new Element()]));
  const get = id => {
    assert.ok(nodes.has(id), `The real page must provide #${id}`);
    return nodes.get(id);
  };
  get('player-name').value = name;
  get('visible-rank-empty').append(new Element('b'), new Element('p'));
  get('ranking-empty').append(new Element('h3'), new Element('p'));
  const previous = globalThis.document;
  globalThis.document = {
    getElementById: get,
    createElement: tag => new Element(tag),
    createTextNode: text => { const node = new Element('#text'); node.textContent = text; return node; },
  };
  t.after(() => { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; });
  const ui = Object.assign(Object.create(BoothUI.prototype), {
    entries, boardDuration: 0, shared: {status, pending, persistent: true},
  });
  return {ui, get};
}
function participant(i, overrides = {}) {
  return createEntry({
    runId: `run-${i}`, name: `Crew${i}`, score: 10000 - i,
    bosses: 0, runTime: 60, maxCombo: 1, endReason: 'defeat',
    createdAt: '2026-11-13T00:00:00Z', ...overrides,
  });
}
const listIds = ['ranking-rows', 'visible-rank-rows'];
const countIds = ['ranking-count', 'visible-rank-count'];
const hintIds = ['ranking-scroll-hint', 'visible-rank-scroll-hint'];

test('both boards render all 17 participants in rank order and highlight MY beyond tenth place', t => {
  const entries = Array.from({length: 17}, (_, i) => participant(i, {
    bosses: i % 3, lastClearTime: i % 3 ? 10 + i : null,
  }));
  const expected = getIndividualBoard(entries);
  const name = expected.at(-1).name;
  const {ui, get} = fixture(t, {entries: entries.reverse(), name});
  ui.render();
  for (const id of listIds) {
    const rows = get(id).children;
    assert.equal(rows.length, 17);
    assert.deepEqual(rows.map(row => row.children[1].firstChild.textContent.replace(/MY$/, '')), expected.map(row => row.name));
    assert.equal(rows.filter(row => row.classList.contains('is-me')).length, 1);
    assert.ok(rows.at(-1).classList.contains('is-me'));
    assert.match(rows.at(-1).textContent, /MY/);
    assert.equal(get(id).tabIndex, 0);
  }
  assert.equal(get('ranking-rows').children.at(-1).firstChild.textContent, '17');
  assert.equal(get('visible-rank-rows').children.at(-1).firstChild.attributes['aria-label'], '17위');
  assert.match(get('visible-rank-me').textContent, /17위/);
  assert.match(get('personal-standing').textContent, /17위/);
  for (const id of countIds) assert.equal(get(id).textContent, '총 17명 참여');
  assert.match(get('ranking-summary').textContent, new RegExp(`시즌 ${RANKING_SEASON}`));
});

test('public boards keep every participant even beyond the 500-record local backup capacity', t => {
  const entries = Array.from({length: 537}, (_, i) => participant(i));
  const {ui, get} = fixture(t, {entries: entries.reverse(), name: 'Crew536'});
  ui.render();
  for (const id of listIds) {
    assert.equal(get(id).children.length, 537);
    assert.equal(get(id).children[0].children[1].firstChild.textContent, 'Crew0');
    assert.equal(get(id).children.at(-1).children[1].firstChild.textContent, 'Crew536MY');
  }
  assert.equal(get('ranking-rows').children.at(-1).firstChild.textContent, '537');
  assert.match(get('visible-rank-me').textContent, /537위/);
  for (const id of countIds) assert.equal(get(id).textContent, '총 537명 참여');
});

test('retries count once and display the best clear time instead of a slower higher score', t => {
  const slow = participant(0, {bosses: 2, lastClearTime: 40, score: 9000});
  const fast = participant(0, {runId: 'retry', bosses: 2, lastClearTime: 30, score: 100});
  const entries = [slow, participant(1), fast, {...participant(2), rulesVersion: 'challenge-v21', version: 21}];
  const {ui, get} = fixture(t, {entries});
  ui.render();
  for (const id of listIds) assert.equal(get(id).children.length, 2);
  for (const id of countIds) assert.equal(get(id).textContent, '총 2명 참여');
  const first = get('ranking-rows').children[0];
  assert.equal(first.children[1].firstChild.textContent, 'Crew0');
  assert.equal(first.children[2].textContent, '100');
  assert.match(first.textContent, /0:30\.00/);
});

test('loading and disconnected empty boards do not claim zero confirmed participants', t => {
  const {ui, get} = fixture(t, {status: 'loading'});
  for (const status of ['loading', 'offline']) {
    ui.shared.status = status;
    ui.render();
    for (const id of countIds) assert.equal(get(id).textContent, '참가자 확인 중…');
    for (const id of listIds) { assert.equal(get(id).children.length, 0); assert.equal(get(id).tabIndex, -1); }
    for (const id of hintIds) assert.ok(get(id).classList.contains('hidden'));
    assert.ok(!get('visible-rank-empty').classList.contains('hidden'));
  }
  ui.shared.status = 'ready';
  ui.render();
  for (const id of countIds) assert.equal(get(id).textContent, '총 0명 참여');
  assert.match(get('ranking-summary').textContent, /참여 0명/);
});

test('cached and pending states distinguish confirmed participants from unsent records', t => {
  const {ui, get} = fixture(t, {entries: [participant(0), participant(1)], status: 'offline'});
  ui.render();
  for (const id of countIds) assert.equal(get(id).textContent, '확인된 참가자 2명');
  assert.match(get('ranking-summary').textContent, /마지막으로 확인한 전체 순위/);
  ui.shared.pending = [{entry: participant(2)}];
  ui.render();
  for (const id of listIds) assert.equal(get(id).children.length, 2);
  assert.match(get('ranking-summary').textContent, /기록 1건 전송 대기/);
  ui.shared.status = 'ready';
  ui.render();
  for (const id of countIds) assert.equal(get(id).textContent, '총 2명 참여');
  ui.entries.push(participant(2));
  ui.shared.pending = [];
  ui.render();
  for (const id of countIds) assert.equal(get(id).textContent, '총 3명 참여');
  assert.doesNotMatch(get('ranking-summary').textContent, /전송 대기/);
});

test('refresh updates all rows and totals while preserving scroll position and keyboard access', t => {
  const {ui, get} = fixture(t, {entries: Array.from({length: 17}, (_, i) => participant(i))});
  ui.render();
  get('ranking-rows').scrollTop = 510;
  get('visible-rank-rows').scrollTop = 305;
  ui.entries.push(participant(17));
  ui.render();
  assert.equal(get('ranking-rows').scrollTop, 510);
  assert.equal(get('visible-rank-rows').scrollTop, 305);
  for (const id of listIds) { assert.equal(get(id).children.length, 18); assert.equal(get(id).tabIndex, 0); }
  for (const id of countIds) assert.equal(get(id).textContent, '총 18명 참여');
  for (const id of hintIds) { assert.ok(!get(id).classList.contains('hidden')); assert.match(get(id).textContent, /스크롤/); }
  ui.entries = ui.entries.slice(0, 5);
  ui.render();
  for (const id of hintIds) assert.ok(get(id).classList.contains('hidden'));
  ui.entries.push(participant(5));
  ui.render();
  for (const id of hintIds) assert.ok(!get(id).classList.contains('hidden'));
  ui.entries = [];
  ui.render();
  for (const id of listIds) { assert.equal(get(id).children.length, 0); assert.equal(get(id).tabIndex, -1); }
  for (const id of hintIds) assert.ok(get(id).classList.contains('hidden'));
});
