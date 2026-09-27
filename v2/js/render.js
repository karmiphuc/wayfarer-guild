// Canvas renderer. Reads state, never mutates it. Integer pixel scale only.
import { T, MAP_W, MAP_H, FRONTIERS, SPR, TILE, ROAD_TILES, FAC, DECOR, MONSTERS, BOSSES, MATS, JOBS, ITEMS } from './data.js';
import { IMG, EMOTE, HANDS, tinted, goldified } from './assets.js';
import { roadAt, defOf, maxHp, buildAreas, townDist } from './state.js';
import { WEEK_SECONDS } from './sim.js';

export class Renderer {
  constructor(canvas) {
    this.cv = canvas; this.g = canvas.getContext('2d');
    this.cam = { x: 38, y: 28, zoom: window.innerHeight >= 760 ? 3 : 2 };
    this.static = document.createElement('canvas'); this.staticKey = '';
    this.hover = null;       // {x,y} tile under pointer
    this.ghost = null;       // build preview {type,x,y,ok}
    this.selected = null;    // {kind:'adv'|'b'|'mon', id}
    this.time = 0;
    this.resize();
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.cv.getBoundingClientRect();
    this.dpr = dpr; this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
    this.cssW = r.width; this.cssH = r.height;
  }
  get scale() { return Math.max(1, Math.round(this.cam.zoom * this.dpr)); }   // device px per source px
  clampCam() {
    const S = this.scale, vw = this.cv.width / S / T, vh = this.cv.height / S / T;
    this.cam.x = Math.max(vw / 2, Math.min(MAP_W - vw / 2, this.cam.x));
    this.cam.y = Math.max(vh / 2, Math.min(MAP_H - vh / 2, this.cam.y));
    if (vw >= MAP_W) this.cam.x = MAP_W / 2; if (vh >= MAP_H) this.cam.y = MAP_H / 2;
  }
  // screen (css px) -> tile coords (float)
  toTile(cx, cy) {
    const S = this.scale;
    const ox = this.cam.x * T * S - this.cv.width / 2, oy = this.cam.y * T * S - this.cv.height / 2;
    return [(cx * this.dpr + ox) / S / T, (cy * this.dpr + oy) / S / T];
  }
  toScreen(tx, ty) {
    const S = this.scale;
    const ox = this.cam.x * T * S - this.cv.width / 2, oy = this.cam.y * T * S - this.cv.height / 2;
    return [(tx * T * S - ox) / this.dpr, (ty * T * S - oy) / this.dpr];
  }

  // ---------- static ground layer ----------
  buildStatic(s) {
    const key = JSON.stringify(s.town) + FRONTIERS.map(f => s.frontier?.completed[f.id] ? '1' : '0').join('');
    if (key === this.staticKey && s.roads === this.staticRoads) return;
    this.staticKey = key; this.staticRoads = s.roads;
    const c = this.static;
    if (c.width !== MAP_W * T || c.height !== MAP_H * T) { c.width = MAP_W * T; c.height = MAP_H * T; }
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const fl = IMG.floor;
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const v = +s.ground[y * MAP_W + x];
      const [tc, tr] = v ? TILE.grassV[v - 1] : TILE.grass;
      g.drawImage(fl, tc * T, tr * T, T, T, x * T, y * T, T, T);
    }
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      if (!roadAt(s, x, y)) continue;
      const r = (dx, dy) => roadAt(s, x + dx, y + dy) || x + dx < 0 || y + dy < 0 || x + dx >= MAP_W || y + dy >= MAP_H;
      const N = !r(0, -1), E = !r(1, 0), S_ = !r(0, 1), W = !r(-1, 0);
      const NE = N || E || !r(1, -1), SE = S_ || E || !r(1, 1), SW = S_ || W || !r(-1, 1), NW = N || W || !r(-1, -1);
      const sig = [N, E, S_, W, NE, SE, SW, NW].map(b => b ? 1 : 0).join('');
      const t = ROAD_TILES[sig] || nearestSig(sig);
      g.drawImage(fl, t[0] * T, t[1] * T, T, T, x * T, y * T, T, T);
    }
    // soft vignette outside the village so the buildable area reads at a glance
    g.fillStyle = 'rgba(30,50,10,0.07)';
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (townDist(s, x, y) > 0) g.fillRect(x * T, y * T, T, T);
  }

  // ---------- frame ----------
  draw(s, dtReal, ui) {
    this.time += dtReal; this.dt = dtReal;
    const g = this.g, S = this.scale;
    this.clampCam(); this.buildStatic(s);
    g.imageSmoothingEnabled = false;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#3d6b2a'; g.fillRect(0, 0, this.cv.width, this.cv.height);
    const ox = Math.round(this.cam.x * T * S - this.cv.width / 2), oy = Math.round(this.cam.y * T * S - this.cv.height / 2);
    g.setTransform(S, 0, 0, S, -ox, -oy);
    g.drawImage(this.static, 0, 0);
    const vx0 = ox / S / T - 2, vy0 = oy / S / T - 2, vx1 = vx0 + this.cv.width / S / T + 4, vy1 = vy0 + this.cv.height / S / T + 5;
    const vis = (x, y) => x > vx0 && x < vx1 && y > vy0 && y < vy1;

    if (ui.buildMode) this.drawBuildGrid(s);
    this.drawFrontiers(s, vis);

    // collect y-sorted drawables
    const list = [];
    for (const p of s.props) if (vis(p.x, p.y)) list.push([p.y + 1, 0, p]);
    for (const b of s.buildings) { const d = defOf(b.type); if (!d.road && vis(b.x, b.y)) list.push([b.y + d.fp[1], 1, b]); }
    for (const m of s.monsters) if (!m.riding && vis(m.x, m.y)) list.push([m.y + 0.5, 3, m]);
    for (const m of s.mons) if ((m.hp > 0 || m.deadT > 0) && vis(m.x, m.y)) list.push([m.y + 0.5, 4, m]);
    for (const a of s.advs) if (!a.inside && !a.dungeon && vis(a.x, a.y)) list.push([a.y + 0.55, 2, a]);
    for (const f of s.folk || []) if (!f.inside && vis(f.x, f.y)) list.push([f.y + 0.55, 5, f]);
    for (const an of s.animals || []) if (vis(an.x, an.y)) list.push([an.y + 0.5, 6, an]);
    for (const n of s.npcs || []) if (vis(n.x, n.y)) list.push([n.y + 0.55, 7, n]);
    list.sort((p, q) => p[0] - q[0]);
    for (const [, k, o] of list) {
      if (k === 0) this.drawProp(o);
      else if (k === 1) this.drawBuilding(s, o, ui);
      else if (k === 2) this.drawAdv(s, o);
      else if (k === 3) this.drawPet(o);
      else if (k === 4) this.drawMon(o);
      else if (k === 5) { this.drawShadow(o.x, o.y); this.drawChar('c_' + o.spr, o.x, o.y, o.dir, o.path ? Math.floor(o.anim * 6) % 4 : 0, 0); }
      else if (k === 6) this.drawAnimal(o);
      else this.drawNpc(s, o);
    }
    if (this.ghost) this.drawGhost(s);
    this.drawFx(s);
    let caveIndex = 0;
    for (const q of s.activeQuests) if (q.spot) this.drawQuestMarker(q, q.kind === 'dungeon' ? caveIndex++ : 0);
    this.drawWeather(s, vx0 + 2, vy0 + 2, vx1 - 4, vy1 - 5);
    // day/night tint (last fifth of each week is night)
    let f = s.time.t / WEEK_SECONDS, night = f > 0.8 ? (f < 0.9 ? (f - 0.8) / 0.1 : (1 - f) / 0.1) * 1.4 : 0;  // dusk -> midnight -> dawn at week end
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (night > 0) { night = Math.min(1, night); g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(${Math.round(255 - 150 * night)},${Math.round(255 - 130 * night)},${Math.round(255 - 60 * night)},1)`; g.fillRect(0, 0, this.cv.width, this.cv.height); g.globalCompositeOperation = 'source-over'; }
    this.night = Math.min(1, night);
    this.drawSky(s);
    // overlay text (names, emotes) in screen space for crispness
    this.drawOverlays(s, ui);
  }

  spr(key, dx, dy, flip) {
    const sp = SPR[key]; if (!sp) return;
    const im = IMG[sp.img]; if (!im) return;
    this.g.drawImage(im, sp.x, sp.y, sp.w, sp.h, Math.round(dx), Math.round(dy), sp.w, sp.h);
  }
  drawProp(p) {
    const sp = SPR[p.k]; if (!sp) return;
    const bx = p.x * T + (p.w * T - sp.w) / 2, by = (p.y + 1) * T - sp.h;
    this.spr(p.k, bx, by);
  }
  drawBuilding(s, b, ui) {
    const d = defOf(b.type), key = Array.isArray(d.spr) ? d.spr[b.v || 0] : d.spr;
    const sp = SPR[key]; if (!sp) return;
    const [w, h] = d.fp;
    const bx = b.x * T + (w * T - sp.w) / 2, by = (b.y + h) * T - sp.h;
    const busy = b.occ && b.occ.length > 0 && FAC[b.type];
    const bob = busy ? Math.round(Math.sin(this.time * 8 + b.id) * 0.6) : 0;
    this.spr(key, bx, by + bob);
    if (b.type === 'dojo') this.spr('dojoSign', b.x * T + 8, (b.y + h) * T - 14);
    const g = this.g;
    if (FAC[b.type] && FAC[b.type].kind === 'shop') {           // hanging item sign for shops
      const icon = { weapon: 'i_w_Sword', armor: 'i_Stamp', item: 'i_LifePot' }[FAC[b.type].slot];
      if (IMG[icon]) { g.fillStyle = '#5a3a1e'; g.fillRect(bx + sp.w - 14, by + sp.h - 22, 12, 12); g.drawImage(IMG[icon], 0, 0, IMG[icon].width, IMG[icon].height, bx + sp.w - 13, by + sp.h - 21, 10, 10); }
    }
    if (this.selected && this.selected.kind === 'b' && this.selected.id === b.id) {
      g.strokeStyle = '#ffe36e'; g.lineWidth = 1; g.strokeRect(b.x * T + 0.5, b.y * T + 0.5, w * T - 1, h * T - 1);
    }
  }
  drawChar(sheet, x, y, dir, frame, row) {
    const im = IMG[sheet]; if (!im) return;
    const rowsAvail = im.height / 16;
    const r = Math.min(row, rowsAvail - 1);
    this.g.drawImage(im, dir * 16, (r + (row < 4 ? frame % Math.min(4, rowsAvail) : 0)) * 16, 16, 16, Math.round(x * T), Math.round(y * T) - 4, 16, 16);
  }
  drawShadow(x, y, w = 12) { const im = IMG.shadow; if (im) this.g.drawImage(im, Math.round(x * T + (16 - w) / 2), Math.round(y * T + 9), w, 7); }
  drawAdv(s, a) {
    const moving = !!a.path || (a.task && ['hunt', 'stroll', 'leave', 'return'].includes(a.task.type) && a.path);
    let row = 0, frame = moving ? Math.floor(a.anim * 7) % 4 : 0;
    if (a.atkT > 0) { row = 4; frame = 0; }
    this.drawShadow(a.x, a.y);
    // mount: draw the partner monster under the rider
    const pet = a.partner && s.monsters.find(m => m.id === a.partner && m.riding);
    let lift = 0;
    if (pet) { const M = MONSTERS[pet.type]; this.monFrame('m_' + M.spr, a.x, a.y + 0.15, a.dir, Math.floor(a.anim * 7)); lift = 0.35; }
    if (a.ko) { this.g.save(); this.g.globalAlpha = 0.7; this.drawChar('c_' + a.spr, a.x, a.y, 0, 0, 6); this.g.restore(); return; }
    const wk = this.weaponKey(a), behind = this.weaponBehind(a);
    if (wk && behind) this.drawWeapon(a, wk, lift, frame);
    if (a.hitT > 0) { this.g.save(); this.g.filter = 'brightness(2.2)'; }
    this.drawChar('c_' + a.spr, a.x, a.y - lift, a.dir, frame, row);
    if (a.hitT > 0) this.g.restore();
    if (wk && !behind) this.drawWeapon(a, wk, lift, frame);
    if (this.selected && this.selected.kind === 'adv' && this.selected.id === a.id) {
      this.g.strokeStyle = '#ffe36e'; this.g.beginPath(); this.g.ellipse(a.x * T + 8, a.y * T + 12, 7, 3, 0, 0, Math.PI * 2); this.g.stroke();
    }
  }
  // ---------- held weapons (Ninja Adventure in-hand sprites point blade-down, handle at the top) ----------
  weaponKey(a) {
    const it = a.eq && a.eq.weapon && ITEMS[a.eq.weapon];
    const k = 'h_' + ((it && it.hand) || JOBS[a.job].weapon);
    return IMG[k] ? k : null;
  }
  weaponImg(a, key) { const it = a.eq && a.eq.weapon && ITEMS[a.eq.weapon]; return tinted(key, it && it.hand === key.slice(2) ? it.tint : 0);
  }
  weaponBehind(a) {
    const atk = a.atkT > 0;
    if (a.dir === 1) return true;                         // facing away: weapon hidden behind the body
    if (!atk && this.weaponKey(a)?.startsWith('h_Bow')) return true;   // bow slung on the back
    return false;
  }
  drawWeapon(a, key, lift, frame) {
    const g = this.g, im = this.weaponImg(a, key), job = JOBS[a.job];
    if (!im) return;
    const atk = a.atkT > 0, p = atk ? 1 - a.atkT / 0.3 : -1;      // attack progress 0..1
    const row = atk ? 4 : frame % 4;
    const hand = (HANDS['c_' + a.spr] || [])[a.dir]?.[row] || [[12, 12], [3, 12], [3, 12], [12, 12]][a.dir];
    const hx = Math.round(a.x * T) + hand[0] + 0.5, hy = Math.round((a.y - lift) * T) - 4 + hand[1] + 0.5;   // grip pixel centre
    g.save(); g.translate(hx, hy);
    if (key.startsWith('h_Bow')) {                                   // bow sprite is horizontal, facing right
      const th = atk ? [Math.PI / 2, -Math.PI / 2, Math.PI, 0][a.dir] : [-Math.PI / 2.2, -Math.PI / 2, -Math.PI / 2.2, -Math.PI / 1.8][a.dir];
      g.rotate(th); g.drawImage(im, -3, -Math.floor(im.height / 2)); g.restore(); return;   // gripped near the riser
    }
    let th;
    if (!atk) th = [Math.PI + 0.3, Math.PI - 0.3, Math.PI - 0.35, Math.PI + 0.35][a.dir];   // carried blade-up, leaning forward
    else {
      const base = [0, Math.PI, -Math.PI / 2, Math.PI / 2][a.dir];
      if (key === 'h_Book') th = base + Math.PI;
      else if (job.mag > job.atk || key === 'h_Lance' || key === 'h_Rapier') th = base;       // thrust straight at the target
      else th = base + (0.5 - p) * 2.2 * (a.dir === 3 ? -1 : 1);                             // swing arc
    }
    g.rotate(th);
    g.drawImage(im, -Math.floor(im.width / 2), -2);          // handle end (sprite top) sits in the fist
    g.restore();
  }
  // Outlaws: character sheet + in-hand weapon, same animation rules as adventurers (drawWeapon takes a stand-in object).
  drawHuman(m, M) {
    const g = this.g, atk = m.atkT > 0, frame = atk ? 0 : Math.floor(m.anim * 6) % 4, row = atk ? 4 : 0, wk = 'h_' + M.weapon;
    const pawn = { x: m.x, y: m.y, dir: m.dir, atkT: Math.max(0, m.atkT || 0), spr: M.spr, eq: null, job: 'warrior' };
    this.drawShadow(m.x, m.y);
    if (IMG[wk] && m.dir === 1) this.drawWeapon(pawn, wk, 0, frame);
    if (m.hitT > 0) { g.save(); g.filter = 'brightness(2.2)'; }
    this.drawChar('c_' + M.spr, m.x, m.y, m.dir, frame, row);
    if (m.hitT > 0) g.restore();
    if (IMG[wk] && m.dir !== 1) this.drawWeapon(pawn, wk, 0, frame);
  }
  crown(x, y) {                                                    // small gold crown over Elite monsters
    const g = this.g, cx = Math.round(x * T + 8), cy = Math.round(y * T - 13 + Math.sin(this.time * 3) * 1);   // above the HP bar
    g.fillStyle = '#2b1a10'; g.fillRect(cx - 4, cy - 1, 9, 5);
    g.fillStyle = '#ffd84a'; g.fillRect(cx - 3, cy + 1, 7, 2); g.fillRect(cx - 3, cy, 1, 1); g.fillRect(cx, cy - 0, 1, 1); g.fillRect(cx + 3, cy, 1, 1);
  }
  monFrame(sheet, x, y, dir, frame, img) {
    const im = img || IMG[sheet]; if (!im) return;
    this.g.drawImage(im, dir * 16, (frame % 4) * 16, 16, 16, Math.round(x * T), Math.round(y * T) - 3, 16, 16);
  }
  drawAnimal(an) {
    const im = IMG['an_' + an.k]; if (!im) return; const g = this.g, f = an.moving ? Math.floor(this.time * 6) % 2 : 0;
    this.drawShadow(an.x, an.y - 0.1, 9);
    g.save(); g.translate(Math.round(an.x * T) + (an.flip ? 16 : 0), Math.round(an.y * T) - 1 + 16 - im.height); if (an.flip) g.scale(-1, 1);
    g.drawImage(im, f * 16, 0, 16, im.height, 0, 0, 16, im.height); g.restore();
  }
  drawPet(m) {
    const M = MONSTERS[m.type]; if (!M) return;
    this.drawShadow(m.x, m.y, 10);
    this.monFrame('m_' + M.spr, m.x, m.y, m.dir, Math.floor(m.anim * 5));
    // little heart to mark village monsters
    const e = IMG['e27']; if (e && Math.floor(this.time * 0.5 + m.id) % 6 === 0) this.g.drawImage(e, Math.round(m.x * T + 2), Math.round(m.y * T - 12), 12, 11);
  }
  drawMon(m) {
    const g = this.g;
    if (m.hp <= 0) { g.save(); g.globalAlpha = Math.max(0, m.deadT / 0.6); }
    if (m.boss) {
      const B = BOSSES[m.boss], im = IMG['b_' + m.boss];
      if (im) { const f = Math.floor(m.anim * 6) % B.frames; const sh = IMG.shadow; if (sh) g.drawImage(sh, Math.round(m.x * T + 8 - B.fw * 0.35), Math.round(m.y * T + 10), Math.round(B.fw * 0.7), 9);
        if (m.hitT > 0) { g.save(); g.filter = 'brightness(2.2)'; }
        g.drawImage(im, f * B.fw, 0, B.fw, B.fh, Math.round(m.x * T + 8 - B.fw / 2), Math.round(m.y * T + 14 - B.fh), B.fw, B.fh);
        if (m.hitT > 0) g.restore(); }
    } else if (MONSTERS[m.type].human) {
      this.drawHuman(m, MONSTERS[m.type]);
    } else {
      const M = MONSTERS[m.type];
      this.drawShadow(m.x, m.y, 10);
      if (m.hitT > 0) { g.save(); g.filter = 'brightness(2.2)'; }
      this.monFrame('m_' + M.spr, m.x, m.y, m.dir, Math.floor(m.anim * 5), m.golden ? goldified('m_' + M.spr) : m.elite ? tinted('m_' + M.spr, 150) : null);
      if (m.hitT > 0) g.restore();
      if (m.elite && m.hp > 0) this.crown(m.x, m.y);
      if (m.golden && m.hp > 0) this.sparkle(m.x, m.y, m.id);
    }
    if (m.raid && m.hp > 0) {                                     // red marker over raiders (stampede, bandits)
      const hy = MONSTERS[m.type] && MONSTERS[m.type].human ? -13 : -9;   // outlaws are a head taller
      const x = Math.round(m.x * T + 8), y = Math.round(m.y * T + hy + Math.sin(this.time * 6 + m.id) * 1.5);
      g.fillStyle = '#2b0a06'; g.beginPath(); g.moveTo(x - 4, y - 1); g.lineTo(x + 4, y - 1); g.lineTo(x, y + 4); g.fill();
      g.fillStyle = '#ff4a3a'; g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + 3, y); g.lineTo(x, y + 3); g.fill();
    }
    if (m.hp <= 0) { g.restore(); return; }
    if (m.hp < m.mhp || m.boss || m.elite) {   // hp bar
      const w = m.boss ? 30 : 14, x = Math.round(m.x * T + 8 - w / 2), y = Math.round(m.y * T + (m.boss ? 10 - BOSSES[m.boss].fh : MONSTERS[m.type].human ? -9 : -6));
      g.fillStyle = '#1a1a1a'; g.fillRect(x - 1, y - 1, w + 2, 4); g.fillStyle = '#5c1d1d'; g.fillRect(x, y, w, 2);
      g.fillStyle = m.quest ? '#ff9f1c' : m.elite ? '#b066ff' : '#e84a4a'; g.fillRect(x, y, Math.round(w * m.hp / m.mhp), 2);
    }
  }
  drawBuildGrid(s) {
    const g = this.g;
    for (const t of buildAreas(s)) {
    g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 1 / this.scale;
    g.beginPath();
    for (let x = t.x0; x <= t.x1; x++) { g.moveTo(x * T, t.y0 * T); g.lineTo(x * T, t.y1 * T); }
    for (let y = t.y0; y <= t.y1; y++) { g.moveTo(t.x0 * T, y * T); g.lineTo(t.x1 * T, y * T); }
    g.stroke();
    g.strokeStyle = 'rgba(255,230,120,0.8)'; g.lineWidth = 2 / this.scale; g.strokeRect(t.x0 * T, t.y0 * T, (t.x1 - t.x0) * T, (t.y1 - t.y0) * T);
    }
  }
  drawFrontiers(s, vis) {
    const g = this.g;
    for (const f of FRONTIERS) {
      const done = s.frontier?.completed[f.id], active = s.activeQuests.some(q => q.frontier === f.id);
      const ready = s.stars >= f.star && f.requires.every(id => s.frontier?.completed[id]);
      if (this.frontierFocus === f.id) {
        const r = f.land; g.fillStyle = done ? 'rgba(105,215,130,0.12)' : 'rgba(255,186,65,0.12)';
        g.fillRect(r.x0 * T, r.y0 * T, (r.x1 - r.x0) * T, (r.y1 - r.y0) * T);
        g.strokeStyle = '#ffdc75'; g.lineWidth = 1; g.strokeRect(r.x0 * T, r.y0 * T, (r.x1 - r.x0) * T, (r.y1 - r.y0) * T);
      }
      if (!vis(f.x, f.y)) continue;
      this.spr('cave', f.x * T - 16, f.y * T - 25);
      g.fillStyle = done ? '#5dd17d' : active ? '#ff8057' : ready ? '#ffd65b' : '#a7adb5';
      g.fillRect(f.x * T + 3, f.y * T - 32, 10, 10);
      g.font = 'bold 8px monospace'; g.textAlign = 'center'; g.fillStyle = '#241b22';
      g.fillText(done ? '+' : active ? '!' : ready ? '?' : '-', f.x * T + 8, f.y * T - 24);
    }
  }
  drawGhost(s) {
    const gh = this.ghost, d = defOf(gh.type); if (!d) return;
    const g = this.g, [w, h] = d.fp;
    g.fillStyle = gh.ok ? 'rgba(120,255,140,0.35)' : 'rgba(255,80,80,0.4)';
    g.fillRect(gh.x * T, gh.y * T, w * T, h * T);
    if (d.road) return;
    const key = Array.isArray(d.spr) ? d.spr[0] : d.spr, sp = SPR[key];
    if (sp) { g.save(); g.globalAlpha = 0.75; this.spr(key, gh.x * T + (w * T - sp.w) / 2, (gh.y + h) * T - sp.h); g.restore(); }
    if (FAC[gh.type]) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect((gh.x + (w >> 1)) * T + 5, (gh.y + h) * T + 5, 6, 6); }  // door marker
    if (d.appeal && d.r) { g.strokeStyle = 'rgba(255,200,255,0.6)'; g.lineWidth = 1 / this.scale; g.strokeRect((gh.x - d.r) * T, (gh.y - d.r) * T, (w + d.r * 2) * T, (h + d.r * 2) * T); }
  }
  drawQuestMarker(q, caveIndex = 0) {
    const g = this.g, bob = Math.sin(this.time * 4) * 2;
    if (q.kind === 'dungeon') {
      const x = q.spot[0] * T - 8, y = (q.spot[1] - 3 - caveIndex) * T - 6;
      g.fillStyle = '#1a1a1a'; g.fillRect(x - 1, y - 1, 34, 5); g.fillStyle = '#ff9f1c'; g.fillRect(x, y, Math.round(32 * (q.floor + (q.ft || 0) / 7) / q.floors), 3);
      return;
    }
    const e = IMG['e22']; if (e) g.drawImage(e, q.spot[0] * T + 1, q.spot[1] * T - 26 + bob, 14, 13);
  }
  // seasonal particles: sakura in spring, leaves in autumn, snow in winter; a Rainy Week (happening) overrides them
  drawWeather(s, vx0, vy0, vx1, vy1) {
    const rain = happenOn(s, 'rain'), m = s.time.month;
    const kind = rain ? 'pt_Rain' : m >= 3 && m <= 5 ? 'pt_LeafPink' : m >= 9 && m <= 11 ? 'pt_Leaf' : (m === 12 || m <= 2) ? 'pt_Snow' : null;
    if (!kind || !IMG[kind]) return;
    const im = IMG[kind], fw = kind === 'pt_Snow' || rain ? 8 : 12, nf = im.width / fw, g = this.g, n = rain ? 90 : 26;
    if (!this.parts || this.parts.length !== n) this.parts = Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), v: 0.4 + Math.random() * 0.6, p: Math.random() * 6 }));
    const w = vx1 - vx0, h = vy1 - vy0;
    for (const p of this.parts) {
      if (rain) { p.y += 0.011 * p.v; p.x -= 0.004 * p.v; if (p.x < 0) p.x += 1; }
      else p.x += 0.0004 * Math.sin(this.time + p.p);
      if (!rain) p.y += 0.0009 * p.v;
      if (p.y > 1) { p.y = 0; p.x = Math.random(); }
      const f = rain ? (p.v > 0.8 ? 2 : p.v > 0.6 ? 1 : 0) : Math.floor(this.time * 6 + p.p) % nf;
      g.drawImage(im, f * fw, 0, fw, im.height, Math.round((vx0 + p.x * w) * T), Math.round((vy0 + p.y * h) * T), fw, im.height);
    }
  }
  // Screen-space weather for happenings: rain gloom, drifting pixel fog, warm sun, meteor streaks at night.
  drawSky(s) {
    const g = this.g, W = this.cv.width, H = this.cv.height;
    if (happenOn(s, 'rain')) { g.fillStyle = 'rgba(30,45,80,0.3)'; g.fillRect(0, 0, W, H); }
    if (happenOn(s, 'sunny') && this.night < 0.2) { g.fillStyle = 'rgba(255,214,120,0.07)'; g.fillRect(0, 0, W, H); }
    if (happenOn(s, 'fog') && IMG.fog) {
      const im = IMG.fog, k = Math.max(1, Math.ceil(Math.max(W / im.width, H / im.height))), fw = im.width * k, fh = im.height * k;
      const off = Math.floor((this.time * 6 * this.dpr) % fw);
      g.save(); g.globalAlpha = 0.28;
      for (let x = -off; x < W; x += fw) for (let y = 0; y < H; y += fh) g.drawImage(im, x, y, fw, fh);
      g.globalAlpha = 0.1; g.fillStyle = '#e8eef0'; g.fillRect(0, 0, W, H); g.restore();
    }
    if (happenOn(s, 'meteor') && this.night > 0.25) {
      const ms = this.meteors || (this.meteors = []);
      if (ms.length < 4 && Math.random() < 0.04) ms.push({ x: Math.random() * W * 1.2, y: Math.random() * H * 0.3, t: 0, life: 0.7 + Math.random() * 0.5, v: (6 + Math.random() * 4) * this.dpr });
      g.save(); g.lineCap = 'round';
      for (const m of ms) {
        m.t += this.dt || 1 / 60; const p = m.t / m.life, hx = m.x - m.t * 60 * m.v, hy = m.y + m.t * 60 * m.v * 0.55;
        const a = Math.max(0, 1 - p) * this.night, tx = hx + 46 * this.dpr, ty = hy - 25 * this.dpr;
        g.globalAlpha = a * 0.35; g.strokeStyle = '#ffe9a0'; g.lineWidth = 6 * this.dpr; g.beginPath(); g.moveTo(hx, hy); g.lineTo(tx, ty); g.stroke();
        g.globalAlpha = a; g.strokeStyle = '#fffbe8'; g.lineWidth = 2 * this.dpr; g.beginPath(); g.moveTo(hx, hy); g.lineTo(tx, ty); g.stroke();
        g.fillStyle = '#ffffff'; g.fillRect(hx - this.dpr, hy - this.dpr, 3 * this.dpr, 3 * this.dpr);
      }
      g.restore(); this.meteors = ms.filter(m => m.t < m.life);
    }
  }
  sparkle(x, y, seed) {                                           // glints around the Golden Slime
    const g = this.g;
    for (let i = 0; i < 3; i++) {
      const ph = this.time * 2.2 + i * 2.1 + seed, a = Math.sin(ph * 1.7);
      if (a < 0.3) continue;
      const sx = Math.round(x * T + 8 + Math.cos(ph) * 8), sy = Math.round(y * T + 4 + Math.sin(ph * 1.3) * 6);
      g.fillStyle = a > 0.8 ? '#ffffff' : '#ffe56a'; g.fillRect(sx - 1, sy, 3, 1); g.fillRect(sx, sy - 1, 1, 3);
      if (a > 0.85) { g.fillRect(sx - 2, sy, 5, 1); g.fillRect(sx, sy - 2, 1, 5); }
    }
  }
  // Happening NPCs: the traveling merchant sits by a rug showing today's licences; the bard strolls and sings.
  drawNpc(s, n) {
    const g = this.g;
    if (n.kind === 'merchant') {
      const h = (s.happen || []).find(x => x.id === 'merchant'), offer = h ? h.data.offer || [] : [];
      const rx = Math.round((n.x + 1) * T), ry = Math.round(n.y * T + 6);
      g.fillStyle = '#5a2a14'; g.fillRect(rx - 1, ry - 1, 36, 12); g.fillStyle = '#b8402a'; g.fillRect(rx, ry, 34, 10);
      g.fillStyle = '#e8b04a'; for (let i = 0; i < 34; i += 4) { g.fillRect(rx + i, ry, 2, 1); g.fillRect(rx + i, ry + 9, 2, 1); }
      offer.slice(0, 3).forEach((o, i) => {
        const it = ITEMS[o.id], im = it && tinted('i_' + it.icon, it.tint);
        if (im) g.drawImage(im, 0, 0, Math.min(16, im.width), Math.min(16, im.height), rx + 1 + i * 11, ry, 10, 10);
      });
    }
    this.drawShadow(n.x, n.y);
    this.drawChar('c_' + n.spr, n.x, n.y, n.dir, n.path ? Math.floor(n.anim * 6) % 4 : 0, 0);
    const bob = Math.round(Math.sin(this.time * 3) * 1.5);
    if (n.kind === 'merchant' && IMG.coin) g.drawImage(IMG.coin, 0, 0, IMG.coin.width, IMG.coin.height, Math.round(n.x * T + 3), Math.round(n.y * T - 16 + bob), 10, 10);
    if (n.kind === 'bard' && IMG.e11 && Math.floor(this.time * 0.8) % 3 !== 2) g.drawImage(IMG.e11, Math.round(n.x * T + 1), Math.round(n.y * T - 18 + bob), 14, 13);
  }
  sheetFx(key, n, fw, fh, x, y, p, rot = 0) {
    const im = IMG[key]; if (!im) return; const f = Math.min(n - 1, Math.floor(p * n));
    const g = this.g; g.save(); g.translate(Math.round(x * T + 8), Math.round(y * T + 6)); if (rot) g.rotate(rot);
    g.drawImage(im, f * fw, 0, fw, fh, -fw / 2, -fh / 2, fw, fh); g.restore();
  }
  drawFx(s) {
    const g = this.g;
    for (const f of s.fx) {
      const p = f.t / f.life;
      switch (f.k) {
        case 'slash': this.sheetFx('fx_slash', 4, 32, 32, f.x, f.y, p, [Math.PI / 2, -Math.PI / 2, Math.PI, 0][f.dir] || 0); break;
        case 'claw': this.sheetFx('fx_claw', 4, 32, 32, f.x, f.y, p); break;
        case 'poof': this.sheetFx('fx_smoke', 6, 32, 32, f.x, f.y, p); break;
        case 'heal': this.sheetFx('fx_spark', 5, 32, 32, f.x, f.y, p); break;
        case 'lvl': this.sheetFx('fx_aura', 4, 32, 32, f.x, f.y, (p * 2) % 1); break;
        case 'proj': {
          const x = f.x + (f.tx - f.x) * p, y = f.y + (f.ty - f.y) * p, ang = Math.atan2(f.ty - f.y, f.tx - f.x);
          g.save(); g.translate(x * T + 8, y * T + 4); g.rotate(ang);
          if (f.p === 'arrow' && IMG.p_arrow) g.drawImage(IMG.p_arrow, -6, -2);
          else if (f.p === 'fire' && IMG.p_fire) g.drawImage(IMG.p_fire, (Math.floor(p * 4) % 4) * 16, 0, 16, 16, -8, -8, 16, 16);
          else if (IMG.p_shuriken) g.drawImage(IMG.p_shuriken, (Math.floor(p * 8) % 2) * 16, 0, 16, 16, -8, -8, 16, 16);
          g.restore(); break;
        }
        case 'chest': if (IMG.chest) g.drawImage(IMG.chest, Math.round(f.x * T), Math.round(f.y * T - p * 10)); break;
        case 'mat': { const ic = IMG['i_' + MATS[f.mat].icon]; if (ic) { g.save(); g.globalAlpha = 1 - p; g.drawImage(ic, 0, 0, ic.width, ic.height, Math.round(f.x * T + 3), Math.round(f.y * T - 4 - p * 14), 10, 10); g.restore(); } break; }
      }
    }
  }
  // ---------- screen-space overlays: numbers, emotes, barks, names ----------
  drawOverlays(s, ui) {
    const g = this.g, z = this.cam.zoom, dpr = this.dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.textAlign = 'center'; g.textBaseline = 'middle'; if ('wordSpacing' in g) g.wordSpacing = '3px';
    const font = n => `${n}px "PixelFont", monospace`;
    for (const f of s.fx) {
      if (f.k !== 'num' && f.k !== 'coin') continue;
      const p = f.t / f.life, [sx, sy] = this.toScreen(f.x + 0.5, f.y - p * 0.9);
      g.globalAlpha = p > 0.7 ? (1 - p) / 0.3 : 1;
      g.font = font(Math.round((f.big ? 11 : 8) * z / 2) * 2 / 2 + 4);
      g.lineWidth = 3; g.strokeStyle = '#1b1020'; g.fillStyle = f.k === 'coin' ? '#ffd84a' : f.c || '#fff';
      g.strokeText(f.text, sx, sy); g.fillText(f.text, sx, sy);
    }
    g.globalAlpha = 1;
    g.font = font(6 + z * 2); g.lineWidth = 3; g.strokeStyle = '#2b1a10'; g.fillStyle = '#ffd84a';
    for (const b of s.buildings) {
      if (b.lv < 2 || !FAC[b.type]) continue;
      const [bx, by] = this.toScreen(b.x + FAC[b.type].fp[0] - 0.3, b.y - 0.6);
      if (bx < -20 || by < -20 || bx > this.cssW + 20 || by > this.cssH + 20) continue;
      const t = '★' + b.lv; g.strokeText(t, bx, by); g.fillText(t, bx, by);
    }
    const caves = s.activeQuests.filter(q => q.kind === 'dungeon');
    for (const [i, cave] of caves.entries()) { const [qx, qy] = this.toScreen(cave.spot[0] + 0.5, cave.spot[1] - 3.8 - i); const t = `B${Math.min(cave.floors, cave.floor + 1)}F`; g.fillStyle = '#fff'; g.strokeText(t, qx, qy); g.fillText(t, qx, qy); }
    for (const a of s.advs) {
      if (a.inside || a.dungeon) continue;
      const [sx, sy] = this.toScreen(a.x + 0.5, a.y - 0.4);
      if (sx < -40 || sy < -40 || sx > this.cssW + 40 || sy > this.cssH + 40) continue;
      if (a.emoteT > 0 && EMOTE[a.emote]) { const im = IMG['e' + EMOTE[a.emote]]; if (im) { const k = z * 1; g.imageSmoothingEnabled = false; g.drawImage(im, Math.round(sx - 7 * k / 1), Math.round(sy - 14 * k - 4), 14 * k, 13 * k); } }
      else if (a.barkT > 0 && a.bark) {
        g.font = font(7 + z * 2); const w = g.measureText(a.bark).width + 8;
        g.fillStyle = 'rgba(255,248,230,0.95)'; g.strokeStyle = '#3a2412'; g.lineWidth = 2;
        roundRect(g, sx - w / 2, sy - 10 * z - 12, w, 14 + z, 4); g.fill(); g.stroke();
        g.fillStyle = '#3a2412'; g.fillText(a.bark, sx, sy - 10 * z - 12 + (14 + z) / 2);
      }
      if (ui.showNames || (this.selected && this.selected.kind === 'adv' && this.selected.id === a.id)) {
        g.font = font(6 + z * 1.5); g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.fillStyle = a.resident ? '#ffe9a8' : '#ffffff';
        const [nx, ny] = this.toScreen(a.x + 0.5, a.y + 1.05); g.strokeText(a.name, nx, ny); g.fillText(a.name, nx, ny);
      }
      const hpR = a.hp / maxHp(a, s);
      if (hpR < 0.999 && !a.ko) { const w = 8 * z, [hx, hy] = this.toScreen(a.x + 0.5, a.y - 0.35); g.fillStyle = '#111'; g.fillRect(hx - w / 2 - 1, hy - 1, w + 2, 4); g.fillStyle = hpR > 0.5 ? '#6ee06e' : hpR > 0.25 ? '#ffd34a' : '#ff5a5a'; g.fillRect(hx - w / 2, hy, w * hpR, 2); }
    }
    this.drawEdgeArrows(s);
  }
  // Off-screen raiders (red) and the Golden Slime (gold) get an arrow on the screen edge pointing at them.
  drawEdgeArrows(s) {
    const g = this.g, W = this.cssW, H = this.cssH, L = 22, R = W - 22, Tp = 70, B = H - 100, cx = (L + R) / 2, cy = (Tp + B) / 2; let n = 0;   // clear of top bar and menu
    for (const m of s.mons) {
      if (m.hp <= 0 || !(m.raid || m.golden) || n >= 8) continue;
      const [sx, sy] = this.toScreen(m.x + 0.5, m.y + 0.5);
      if (sx > 0 && sy > 0 && sx < W && sy < H) continue;
      const dx = sx - cx, dy = sy - cy, k = Math.min((R - L) / 2 / Math.abs(dx || 1e-6), (B - Tp) / 2 / Math.abs(dy || 1e-6));
      const ax = cx + dx * k, ay = cy + dy * k, ang = Math.atan2(dy, dx); n++;
      g.save(); g.translate(Math.round(ax), Math.round(ay)); g.rotate(ang);
      g.fillStyle = '#1b1020'; g.beginPath(); g.moveTo(11, 0); g.lineTo(-7, -8); g.lineTo(-7, 8); g.closePath(); g.fill();
      g.fillStyle = m.golden ? '#ffd84a' : '#ff4a3a'; g.beginPath(); g.moveTo(8, 0); g.lineTo(-5, -6); g.lineTo(-5, 6); g.closePath(); g.fill();
      g.restore();
    }
  }
}

const happenOn = (s, id) => !!(s.happen && s.happen.some(h => h.id === id));
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function nearestSig(sig) {
  let best = null, bd = 99;
  for (const k in ROAD_TILES) { let d = 0; for (let i = 0; i < 8; i++) if (k[i] !== sig[i]) d += i < 4 ? 3 : 1; if (d < bd) { bd = d; best = ROAD_TILES[k]; } }
  return best;
}
