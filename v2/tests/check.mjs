// THE one command to run before every commit/deploy:
//
//   node v2/tests/check.mjs          fast (~3 s): syntax, data validation, assets, sim smoke + save round-trip, happenings, bundle
//   node v2/tests/check.mjs --full   + balance gates (~2-3 min): 30-month bot soak and boss ladder probe
//
// Exit code 0 = safe to ship. Any FAIL line = fix it first. Needs only Node 18+ (and python3 for the bundle step).
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const V2 = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
process.chdir(V2);
const full = process.argv.includes('--full');
let failed = 0;
const ok = (name, detail = '') => console.log(`PASS  ${name}${detail ? ' — ' + detail : ''}`);
const fail = (name, detail) => { failed++; console.log(`FAIL  ${name}\n${String(detail).trim().split('\n').map(l => '      ' + l).join('\n')}`); };
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', timeout: opts.timeout || 120000, cwd: V2 });

// 1. syntax
{ const bad = [];
  for (const f of fs.readdirSync('js').filter(f => f.endsWith('.js'))) { const r = run('node', ['--check', `js/${f}`]); if (r.status) bad.push(`${f}: ${r.stderr.split('\n').slice(0, 4).join(' ')}`); }
  bad.length ? fail('syntax (node --check js/*.js)', bad.join('\n')) : ok('syntax', `${fs.readdirSync('js').length} modules`); }

// 2. data validation
{ const r = run('node', ['tests/validate.mjs']); const last = r.stdout.trim().split('\n').pop();
  r.status ? fail('data validation (tests/validate.mjs)', r.stdout) : ok('data validation', last.replace('validate: ', '')); }

// 3. asset audit
{ const r = run('node', ['tests/used-assets.mjs']); const first = r.stdout.split('\n')[0];
  /missing: 0/.test(first) ? ok('asset audit', first) : fail('asset audit (tests/used-assets.mjs)', r.stdout); }

// 4. simulation smoke + save round-trip (in-process)
try {
  const { newGame, migrate } = await import('../js/state.js');
  const { Sim, DT, WEEK_SECONDS } = await import('../js/sim.js');
  const s = newGame(4242), sim = new Sim(s, {});
  s.gold = 20000;
  for (const [t, x, y] of [['weapon', 42, 19], ['item', 44, 31], ['house', 27, 19], ['smith', 27, 32], ['dojo', 30, 33]]) sim.build(t, x, y);
  const steps = Math.round(3 * 4 * WEEK_SECONDS / DT);
  for (let i = 0; i < steps; i++) sim.step();
  const nan = [];
  const num = (v, n) => { if (typeof v !== 'number' || !Number.isFinite(v)) nan.push(n + '=' + v); };
  num(s.gold, 'gold'); num(s.pop, 'pop'); num(s.tp, 'tp');
  for (const a of s.advs) { num(a.hp, `${a.name}.hp`); num(a.xp, `${a.name}.xp`); num(a.gold, `${a.name}.gold`); num(a.x, `${a.name}.x`); }
  for (const m of s.mons) { num(m.hp, `mon${m.id}.hp`); num(m.x, `mon${m.id}.x`); }
  if (nan.length) throw new Error('non-finite numbers after 3 months: ' + nan.slice(0, 8).join(', '));
  if (!s.advs.length) throw new Error('no adventurers after 3 months');
  if (!s.quests.length) throw new Error('quest board empty after 3 month-ends');
  const copy = migrate(JSON.parse(JSON.stringify(s)));
  const sim2 = new Sim(copy, {}); for (let i = 0; i < 200; i++) sim2.step();
  const size = JSON.stringify(copy).length;
  if (size > 1.5e6) throw new Error(`save is ${size} bytes (localStorage budget ~5 MB, keep it small)`);
  ok('sim smoke + save round-trip', `${s.advs.length} adventurers, ${s.stats.kills} kills, gold ${s.gold}, save ${(size / 1024).toFixed(0)} KB`);
} catch (e) { fail('sim smoke (3 in-game months)', e.stack || e); }

// 4b. every happening and charter runs, ends and cleans up; same seed + same choices replays identically
{ const r = run('node', ['tests/happenings.mjs']);
  r.status ? fail('happenings + charters (tests/happenings.mjs)', r.stdout + (r.stderr || '')) : ok('happenings + charters', r.stdout.trim().split('\n').pop()); }

// 5. bundle builds and parses
{ const out = fs.mkdtempSync(path.join(os.tmpdir(), 'wg-bundle-'));
  const r = run('python3', ['tools/bundle.py', '--out', out]);
  const c = r.status ? r : run('node', ['--check', path.join(out, 'game.js')]);
  r.status || c.status ? fail('bundle (tools/bundle.py)', (r.stderr || '') + (c.stderr || '')) : ok('bundle', r.stdout.trim().replace(out, 'tmp'));
  fs.rmSync(out, { recursive: true, force: true }); }

// 6. balance gates (--full)
if (full) {
  { const r = run('node', ['tests/bot.mjs', '30', '1'], { timeout: 300000 });
    const star = (r.stdout.match(/★(\d)/g) || []).map(x => +x.slice(1)).pop();
    r.status || !(star >= 4) ? fail('bot soak 30 months (tests/bot.mjs)', `expected >= 4 stars, got ${star}\n${r.stderr || ''}`) : ok('bot soak', `${star} stars after 30 months`); }
  { const r = run('node', ['tests/bossprobe.mjs'], { timeout: 600000 });
    const expect = { giantSlime: 3, giantFrog: 5, bamboo: 7, racoon: 9, blueSamurai: 11, spirit: 13, giantFrog2: 17, tenguBlue: 17, flam: 19, redSamurai: 21, cyclop: 21 };
    const got = Object.fromEntries([...r.stdout.matchAll(/^(\w+)\s+min party Lv (\w+)/gm)].map(m => [m[1], m[2] === 'null' ? null : +m[2]]));
    const off = Object.entries(expect).filter(([b, lv]) => got[b] == null || Math.abs(got[b] - lv) > 4).map(([b, lv]) => `${b}: expected ~${lv}, got ${got[b]}`);
    off.length ? fail('boss ladder (tests/bossprobe.mjs)', off.join('\n') + '\nIf you changed balance on purpose, update `expect` in tests/check.mjs.') : ok('boss ladder', 'main ladder within ±4 levels of Lv3→21'); }
}

console.log(failed ? `\n${failed} check(s) FAILED` : `\nall checks passed${full ? ' (full)' : ' (run with --full before balance changes ship)'}`);
process.exit(failed ? 1 : 0);
