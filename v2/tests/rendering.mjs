import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { MAP_H, MAP_W, MONSTERS } from '../js/data.js';
import { Renderer, palisadeConnections } from '../js/render.js';
import { newGame, villageBoundary } from '../js/state.js';

const mask = cells => {
  const out = new Uint8Array(MAP_W * MAP_H);
  for (const { x, y } of cells) out[y * MAP_W + x] = 1;
  return out;
};

// Generated boundary corners connect only along their two real arms.
{
  const s = newGame(901), boundary = villageBoundary(s), barriers = mask(boundary.walls);
  const corner = boundary.walls.find(c => c.x === s.town.x0 - 1 && c.y === s.town.y0 - 1);
  assert(corner);
  assert.deepEqual(palisadeConnections(corner.x, corner.y, barriers), { n: false, e: true, s: true, w: false });
}

// Player walls and the free village boundary share one connectivity mask, so their join is a T
// rather than two unrelated sprites.
{
  const s = newGame(902), boundary = villageBoundary(s);
  const barriers = mask(boundary.walls);
  const side = boundary.walls.find(c => c.vertical && c.x === s.town.x0 - 1 && c.y > s.town.y0 + 1 && c.y < s.town.y1 - 2 &&
    barriers[(c.y - 1) * MAP_W + c.x] && barriers[(c.y + 1) * MAP_W + c.x]);
  assert(side);
  barriers[side.y * MAP_W + side.x + 1] = 1;
  assert.deepEqual(palisadeConnections(side.x, side.y, barriers), { n: true, e: true, s: true, w: false });
  assert.deepEqual(palisadeConnections(side.x + 1, side.y, barriers), { n: false, e: false, s: false, w: true });
}

// Corners and endpoints crop the source art at its natural midpoint. No unused arm is drawn.
{
  const parts = [], whole = [];
  const renderer = {
    sprPart: (...args) => parts.push(args),
    spr: (...args) => whole.push(args),
  };
  Renderer.prototype.drawPalisade.call(renderer, 10, 20, { n: false, e: true, s: true, w: false });
  assert.deepEqual(parts, [
    ['palisadeH', 8, 0, 8, 16, 168, 320],
    ['palisadeV', 0, 16, 8, 16, 164, 320],
  ]);
  assert.deepEqual(whole, []);

  parts.length = 0;
  Renderer.prototype.drawPalisade.call(renderer, 10, 20, { n: false, e: false, s: false, w: true });
  assert.deepEqual(parts, [['palisadeH', 0, 0, 8, 16, 160, 320]]);

  parts.length = 0;
  Renderer.prototype.drawPalisade.call(renderer, 10, 20, { n: true, e: true, s: false, w: false });
  assert.deepEqual(parts, [
    ['palisadeH', 8, 0, 8, 16, 168, 320],
    ['palisadeV', 0, 0, 8, 24, 164, 304],
  ]);

  parts.length = 0;
  Renderer.prototype.drawPalisade.call(renderer, 10, 20, { n: true, e: true, s: true, w: true });
  assert.deepEqual(parts, [
    ['palisadeH', 0, 0, 16, 16, 160, 320],
    ['palisadeV', 0, 0, 8, 32, 164, 304],
  ]);
}

// The asset set contains both Ninja Adventure layouts. Legacy sheets use direction
// columns; the audited rotated subset uses animation columns and down/left/up/right rows.
{
  const calls = [], image = { width: 64, height: 64 };
  const renderer = { g: { drawImage: (...args) => calls.push(args) } };
  for (let dir = 0; dir < 4; dir++) {
    for (let frame = 0; frame < 8; frame++) {
      Renderer.prototype.monFrame.call(renderer, 'unused', 3.25, 4.5, dir, frame, image, false);
      const args = calls.pop();
      assert.equal(args[1], dir * 16, `column sheet direction ${dir} changed the wrong axis`);
      assert.equal(args[2], (frame % 4) * 16, `column sheet frame ${frame} changed the wrong axis`);
      assert.deepEqual(args.slice(3, 5), [16, 16]);

      Renderer.prototype.monFrame.call(renderer, 'unused', 3.25, 4.5, dir, frame, image, true);
      const rowArgs = calls.pop();
      assert.equal(rowArgs[1], (frame % 4) * 16, `row sheet frame ${frame} changed the wrong axis`);
      assert.equal(rowArgs[2], [0, 2, 1, 3][dir] * 16, `row sheet direction ${dir} used the wrong source row`);
    }
  }
}

// Every non-human sheet was visually audited. Keeping the exact rotated subset in
// this assertion makes a missing or casually copied sheetRows flag visible in CI.
{
  const assets = readdirSync(new URL('../assets/monsters/', import.meta.url))
    .filter(name => name.endsWith('.png') && !name.endsWith('.face.png') && !name.startsWith('animal_'))
    .map(name => name.slice(0, -4)).sort();
  const configured = Object.values(MONSTERS).filter(M => !M.human).map(M => M.spr).sort();
  assert.equal(assets.length, 66);
  assert.deepEqual(configured, assets, 'every monster sheet should have one MONSTERS layout record');
  assert.deepEqual(Object.values(MONSTERS).filter(M => M.sheetRows).map(M => M.spr).sort(), [
    'GreenOctopus', 'GreyTrex', 'HeartGreen', 'HeartRed', 'KappaGreen', 'KappaRed',
    'Panda', 'RedOctopus', 'SpiderRed', 'SpiderYellow', 'TRex', 'YellowsBat',
  ]);
  assert.equal(MONSTERS.slime.sheetRows, undefined);
  assert.equal(MONSTERS.bamboo.sheetRows, undefined);
}

// Wild monsters, pets and mounts all forward their species layout metadata.
{
  const calls = [];
  const renderer = {
    g: { drawImage() {} }, time: 0, selected: null,
    drawShadow() {}, drawChar() {}, drawWeapon() {},
    weaponKey() { return null; }, weaponBehind() { return false; },
    monFrame(...args) { calls.push(args); },
  };
  const wild = type => Renderer.prototype.drawMon.call(renderer, {
    type, x: 2, y: 3, dir: 2, anim: 0.5, hp: MONSTERS[type].hp, mhp: MONSTERS[type].hp, hitT: 0,
  });
  const pet = type => Renderer.prototype.drawPet.call(renderer, { type, x: 2, y: 3, dir: 2, anim: 0.5, id: 1 });
  const mount = type => Renderer.prototype.drawAdv.call(renderer,
    { monsters: [{ id: 1, type, riding: true }] },
    { partner: 1, x: 2, y: 3, dir: 2, anim: 0.5, atkT: 0, eq: null });

  wild('panda'); wild('bamboo');
  pet('panda'); pet('bamboo');
  mount('panda'); mount('bamboo');
  assert.deepEqual(calls.map(args => args[6]), [true, undefined, true, undefined, true, undefined]);
}

console.log('rendering: connected palisades and audited monster sheet layouts passed');
