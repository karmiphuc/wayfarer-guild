// Lists every asset the game can load (runtime loader + CSS/HTML refs + audio) and reports unused files.
// Usage: node tests/used-assets.mjs [--prune]
import fs from 'fs'; import path from 'path';
const used = new Set();
globalThis.Image = class { set src(v) { used.add(path.normalize(v)); setTimeout(() => this.onload && this.onload(), 0); } get width() { return 16; } get height() { return 16; } };
const { loadAll } = await import('../js/assets.js');
await loadAll();
for (const f of ['index.html', 'css/style.css']) {
  const t = fs.readFileSync(f, 'utf8');
  for (const m of t.matchAll(/(?:\.\.\/)?(assets\/[A-Za-z0-9_\/.\- ]+\.(?:png|ttf|mp3|txt))/g)) used.add(path.normalize(m[1]));
}
const audio = fs.readFileSync('js/audio.js', 'utf8');
for (const m of audio.matchAll(/:\s*'([A-Za-z0-9]+)'/g)) used.add(`assets/audio/sfx/${m[1]}.mp3`);
// music: a track counts as used when its name appears as a quoted string anywhere in js/ (e.g. game.audio.music('town'))
const jsAll = fs.readdirSync('js').filter(f => f.endsWith('.js')).map(f => fs.readFileSync('js/' + f, 'utf8')).join('\n');
for (const f of fs.existsSync('assets/audio/music') ? fs.readdirSync('assets/audio/music') : []) if (jsAll.includes(`'${f.replace(/\.mp3$/, '')}'`)) used.add(`assets/audio/music/${f}`);
for (const f of fs0()) used.add(f);
for (const f of fs.existsSync('assets/atlas') ? fs.readdirSync('assets/atlas') : []) used.add('assets/atlas/' + f);
function fs0() { return fs.readdirSync('assets').filter(f => f.endsWith('.txt')).map(f => 'assets/' + f); }
const all = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : all.push(p); } })('assets');
const unused = all.filter(f => !used.has(f)), missing = [...used].filter(f => !fs.existsSync(f));
console.log(`files: ${all.length} used: ${all.length - unused.length} unused: ${unused.length} missing: ${missing.length}`);
if (missing.length) console.log('MISSING:', missing.join('\n  '));
if (process.argv.includes('--prune')) { for (const f of unused) fs.unlinkSync(f); console.log('pruned', unused.length); }
else console.log(unused.slice(0, 15).join('\n'), unused.length > 15 ? '...' : '');
