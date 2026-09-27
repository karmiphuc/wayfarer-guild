// Lists sprite files that exist in v2/assets but are not used yet — pick from these when adding content.
//   node v2/tests/free-sprites.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

process.chdir(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const { JOBS, MONSTERS, ITEMS } = await import('../js/data.js');
const png = p => { const b = fs.readFileSync(p); return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`; };

const usedChars = new Set(Object.values(JOBS).flatMap(j => j.sprites).concat(Object.values(MONSTERS).filter(m => m.human).map(m => m.spr)));
const chars = fs.readdirSync('assets/chars').filter(f => f.endsWith('.png') && !f.endsWith('.face.png') && f !== 'Shadow.png').map(f => f.slice(0, -4));
console.log('Character sheets not used by any job (64x112 = usable for a job; other sizes are townsfolk-only):');
for (const c of chars.filter(c => !usedChars.has(c))) console.log(`  ${c.padEnd(18)} ${png(`assets/chars/${c}.png`)}${fs.existsSync(`assets/chars/${c}.face.png`) ? '' : '  (no portrait!)'}`);

const usedMons = new Set(Object.values(MONSTERS).filter(m => !m.human).map(m => m.spr));
const mons = fs.readdirSync('assets/monsters').filter(f => f.endsWith('.png') && !f.endsWith('.face.png') && !f.startsWith('animal_')).map(f => f.slice(0, -4));
console.log('\nMonster sheets not used by MONSTERS:');
console.log('  ' + (mons.filter(m => !usedMons.has(m)).join(', ') || '(none — copy more from the Ninja Adventure pack, see docs/ASSETS.md)'));

const usedHands = new Set(Object.values(ITEMS).filter(i => i.hand).map(i => i.hand).concat(Object.values(JOBS).map(j => j.weapon), Object.values(MONSTERS).filter(m => m.human).map(m => m.weapon)));
const hands = fs.readdirSync('assets/items').filter(f => f.startsWith('h_')).map(f => f.slice(2, -4));
console.log('\nIn-hand weapon sprites not used by any item or job:');
console.log('  ' + (hands.filter(h => !usedHands.has(h)).join(', ') || '(none)'));

const usedIcons = new Set(Object.values(ITEMS).map(i => i.icon));
const icons = fs.readdirSync('assets/items').filter(f => /^(a_|c_)/.test(f)).map(f => f.slice(0, -4));
console.log('\nArmor/accessory icons not used by any item:');
console.log('  ' + (icons.filter(i => !usedIcons.has(i)).join(', ') || '(none)'));
console.log('\nNote: files only get into the game build after they are referenced in code and tools/pack_atlas.py is re-run.');
