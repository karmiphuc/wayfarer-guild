// Entry: load assets, create/load state, run the fixed-step loop, route input.
import { loadAll, IMG } from './assets.js';
window.__IMG = IMG;
import { newGame, load, save, wipeSave, defOf, buildingAt, roadAt, parseSeed } from './state.js';
import { Sim, DT, WEEK_SECONDS } from './sim.js';
import { Renderer } from './render.js';
import { UI } from './ui.js';
import { Audio } from './audio.js';
import { MAP_W, MAP_H, FAC, FRONTIERS } from './data.js';

const MAX_STEPS_PER_FRAME = 40;   // tick budget: never spiral on slow frames or tab resume

const game = {
  s: null, sim: null, rnd: null, ui: null, audio: new Audio(), speed: 1, follow: null,
  centerOn(x, y) { this.rnd.cam.x = x + 0.5; this.rnd.cam.y = y + 0.5; },
  replaceState(s) { this.s = s; this.sim = new Sim(s, hooks); this.rnd.staticKey = ''; this.ui.deselect(); },
};
const hooks = {
  sfx: k => game.audio.sfx(k, k === 'hit' ? 0.5 : k === 'coin' ? 0.45 : 1),
  fanfare: (t, sub) => game.ui.fanfare(t, sub),
  report: r => game.ui.toast(`Month closed: +${r.income}G sales, −${r.upkeep}G upkeep, +${r.tp} TP`),
};

async function boot() {
  const bar = document.getElementById('load-bar');
  await document.fonts.load('16px "PixelFont"').catch(() => {});
  await loadAll(p => { bar.style.width = (p * 100) + '%'; });
  // ?new = fresh village, ?seed=CODE = fresh village in that world. Strip them so a reload never wipes again.
  const qs = new URLSearchParams(location.search), seed = parseSeed(qs.get('seed')), fresh = qs.has('new') || seed !== null;
  if (fresh) wipeSave();
  game.s = (!fresh && load()) || null;
  if (!game.s) { game.s = newGame(seed ?? undefined); save(game.s); }     // save at once so a reload keeps this world
  if (fresh) history.replaceState(null, '', location.pathname);
  game.sim = new Sim(game.s, hooks);
  game.rnd = new Renderer(document.getElementById('view'));
  game.ui = new UI(game);
  window.__game = game;  // debug handle
  document.getElementById('loading').classList.add('ready');
  const cast = document.createElement('div'); cast.className = 'cast';
  for (const c of ['FighterRed', 'Hunter', 'SorcererOrange', 'Monk', 'Knight', 'NinjaBlue', 'Samurai', 'Princess']) { const cv = document.createElement('canvas'); cv.width = 48; cv.height = 48; cv.className = 'px'; cv.dataset.c = c; cast.appendChild(cv); }
  document.querySelector('.load-box .bar').replaceWith(cast);
  let fr = 0; const castAnim = setInterval(() => { fr++; cast.querySelectorAll('canvas').forEach((cv, i) => { const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 48, 48); const im = (window.__IMG || {})['c_' + cv.dataset.c]; if (im) g.drawImage(im, 0, ((fr + i) % 4) * 16, 16, 16, 0, 0, 48, 48); }); }, 160);
  const btn = document.getElementById('start-btn');
  btn.textContent = game.s.tick > 0 ? 'Continue' : 'Start';
  btn.classList.remove('hidden');
  btn.addEventListener('click', async () => {
    document.getElementById('loading').classList.add('hidden'); clearInterval(castAnim);
    await game.audio.unlock(); game.audio.music('town');
    if (!game.s.charter && game.s.charterChoices && game.s.charterChoices.length) game.ui.charterPick(() => { if (game.s.tick === 0) tutorial(); });
    else if (game.s.tick === 0) tutorial();
  }, { once: true });
  bindInput(); requestAnimationFrame(frame);
  window.addEventListener('resize', () => game.rnd.resize());
  document.addEventListener('visibilitychange', () => { if (document.hidden && !game.noSave) save(game.s); });
}

function tutorial() {
  const tips = ['Tap Build to add shops. Adventurers pay to use them.', 'Happy visitors move in if there is a vacant House.',
    'Adventurers hunt monsters outside the village. Kills earn Town Points each month.', 'Take on Quests from the Quest board to earn big rewards and rank up.'];
  tips.forEach((t, i) => setTimeout(() => game.ui.toast(t), 800 + i * 2600));
}

// ---------- loop ----------
let last = performance.now(), acc = 0, uiT = 0, lastWeek = -1;
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000); last = now;
  const { s, sim, rnd, ui } = game;
  if (game.speed > 0 && !game.modal && document.getElementById('loading').classList.contains('hidden')) {
    acc += dt * game.speed;
    let n = 0; while (acc >= DT && n < MAX_STEPS_PER_FRAME) { sim.step(); acc -= DT; n++; }
    if (n >= MAX_STEPS_PER_FRAME) acc = 0;
  }
  if (game.follow) { const a = s.advs.find(o => o.id === game.follow); if (a && !a.inside) { rnd.cam.x += (a.x + 0.5 - rnd.cam.x) * 0.1; rnd.cam.y += (a.y + 0.5 - rnd.cam.y) * 0.1; } }
  rnd.draw(s, dt, { buildMode: ui.buildMode, showNames: ui.showNames });
  uiT += dt; if (uiT > 0.25) { uiT = 0; ui.tick(); }
  const wk = s.time.year * 100 + s.time.month * 5 + s.time.week;
  if (wk !== lastWeek) { if (lastWeek !== -1 && !game.noSave) save(s); lastWeek = wk; }
  // music follows the action
  const q = s.activeQuests.filter(q => q.spot).sort((a, b) => Math.hypot(rnd.cam.x - a.spot[0], rnd.cam.y - a.spot[1]) - Math.hypot(rnd.cam.x - b.spot[0], rnd.cam.y - b.spot[1]))[0];
  const near = q && Math.hypot(rnd.cam.x - q.spot[0], rnd.cam.y - q.spot[1]) < 14;
  const summer = s.time.month >= 6 && s.time.month <= 9;
  game.audio.music(near ? (q.kind === 'boss' ? 'boss' : q.kind === 'dungeon' ? 'cave' : 'battle') : rnd.night > 0.5 ? 'night' : summer ? 'town2' : 'town');
  requestAnimationFrame(frame);
}

// ---------- input: drag pan, wheel/pinch zoom, tap select/place ----------
function bindInput() {
  const cv = document.getElementById('view'), rnd = game.rnd;
  const pts = new Map(); let drag = null, pinch = null, moved = false, painting = false;
  const tileAt = e => { const r = cv.getBoundingClientRect(); return rnd.toTile(e.clientX - r.left, e.clientY - r.top); };
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = false;
    if (pts.size === 1) {
      drag = { x: e.clientX, y: e.clientY, cx: rnd.cam.x, cy: rnd.cam.y };
      const mode = game.ui.buildMode;
      if (mode && (defOf(mode)?.road || mode === 'bulldoze')) { painting = true; paint(e); }
    } else if (pts.size === 2) {
      const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: rnd.cam.zoom }; drag = null; painting = false;
    }
  });
  cv.addEventListener('pointermove', e => {
    const [tx, ty] = tileAt(e);
    updateGhost(Math.floor(tx), Math.floor(ty));
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      rnd.cam.zoom = Math.max(1, Math.min(6, Math.round(pinch.z * d / pinch.d))); return;
    }
    if (painting) { paint(e); return; }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      if (moved) { const k = 16 * rnd.cam.zoom; rnd.cam.x = drag.cx - dx / k; rnd.cam.y = drag.cy - dy / k; game.follow = null; }
    }
  });
  const end = e => {
    const wasTap = pts.size === 1 && !moved && !pinch;
    pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
    if (wasTap && !painting) tap(e);
    if (!pts.size) { drag = null; painting = false; }
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', e => { pts.delete(e.pointerId); drag = null; pinch = null; painting = false; });
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const before = tileAt(e); rnd.cam.zoom = Math.max(1, Math.min(6, rnd.cam.zoom + (e.deltaY < 0 ? 1 : -1)));
    const after = tileAt(e); rnd.cam.x += before[0] - after[0]; rnd.cam.y += before[1] - after[1];
  }, { passive: false });
  cv.addEventListener('pointerleave', () => { rnd.ghost = null; });
  const keys = new Set();
  window.addEventListener('keydown', e => { if (e.target.tagName !== 'INPUT') keys.add(e.key.toLowerCase()); if (e.key === '+' || e.key === '=') rnd.cam.zoom = Math.min(6, rnd.cam.zoom + 1); if (e.key === '-') rnd.cam.zoom = Math.max(1, rnd.cam.zoom - 1); });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
  setInterval(() => {
    const v = 0.6 / Math.max(1, rnd.cam.zoom - 1);
    if (keys.has('a') || keys.has('arrowleft')) rnd.cam.x -= v; if (keys.has('d') || keys.has('arrowright')) rnd.cam.x += v;
    if (keys.has('w') || keys.has('arrowup')) rnd.cam.y -= v; if (keys.has('s') || keys.has('arrowdown')) rnd.cam.y += v;
    if (keys.size) game.follow = null;
  }, 16);

  function updateGhost(x, y) {
    const mode = game.ui.buildMode;
    if (!mode || mode === 'bulldoze') { rnd.ghost = null; return; }
    const d = defOf(mode), gx = x - (d.fp[0] >> 1), gy = y - (d.fp[1] - 1);
    rnd.ghost = { type: mode, x: gx, y: gy, ok: !game.sim.canPlace(mode, gx, gy) };
  }
  function paint(e) {
    const [tx, ty] = tileAt(e), x = Math.floor(tx), y = Math.floor(ty), mode = game.ui.buildMode;
    if (mode === 'bulldoze') {
      if (roadAt(game.s, x, y)) { game.sim.removeRoad(x, y); game.audio.sfx('click'); return; }
      const b = buildingAt(game.s, x, y);
      if (b && !FAC[b.type]) { game.sim.demolish(b); game.audio.sfx('click'); }
      else if (b && FAC[b.type] && !moved) { painting = false; game.ui.select({ kind: 'b', id: b.id }); }
      return;
    }
    if (!game.sim.canPlace(mode, x, y)) game.sim.build(mode, x, y);
  }
  function tap(e) {
    const [tx, ty] = tileAt(e), mode = game.ui.buildMode, s = game.s;
    if (mode && mode !== 'bulldoze') {
      const g = rnd.ghost; if (!g) return;
      const err = game.sim.build(mode, g.x, g.y);
      if (err) { game.ui.toast(err); game.audio.sfx('cancel'); }
      else if (FAC[mode]) { game.ui.exitBuild(); const b = s.buildings[s.buildings.length - 1]; game.ui.select({ kind: 'b', id: b.id }); game.ui.toast(`${defOf(mode).name} built!`); }
      return;
    }
    // pick: adventurers > monsters > buildings (sprites extend upward, so test a little above)
    let best = null, bd = 0.9;
    for (const a of s.advs) { if (a.inside) continue; const d = Math.hypot(a.x + 0.5 - tx, a.y + 0.3 - ty); if (d < bd) { bd = d; best = { kind: 'adv', id: a.id }; } }
    for (const m of s.mons) { if (m.hp <= 0) continue; const d = Math.hypot(m.x + 0.5 - tx, m.y + 0.3 - ty) * (m.boss ? 0.5 : 1); if (d < bd) { bd = d; best = { kind: 'mon', id: m.id }; } }
    for (const n of s.npcs || []) {                     // happening NPCs (the merchant's rug counts too)
      const d = Math.hypot(n.x + 0.5 - tx, n.y + 0.3 - ty), rug = n.kind === 'merchant' && tx >= n.x + 1 && tx <= n.x + 3.3 && ty >= n.y && ty <= n.y + 1.2;
      if (d < bd || rug) { bd = rug ? 0 : d; best = { kind: 'npc', id: n.kind }; }
    }
    // The 48 px den sprite spans x−1..x+2 tiles and rises about 2 tiles above its ground point.
    if (!best) { const f = FRONTIERS.find(f => tx >= f.x - 1 && tx <= f.x + 2 && ty >= f.y - 2 && ty <= f.y + 1.5); if (f) { game.ui.showFrontier(f.id); return; } }
    if (!best) { const b = buildingAt(s, Math.floor(tx), Math.floor(ty)) || buildingAt(s, Math.floor(tx), Math.floor(ty + 1)); if (b && !defOf(b.type).road) best = { kind: 'b', id: b.id }; }
    if (best) game.ui.select(best); else game.ui.deselect();
  }
}

boot();
