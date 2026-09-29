// DOM UI: top bar, ticker, bottom menu panels, inspector, fanfares. Uses event delegation via data-act.
import { FAC, DECOR, SPR, JOBS, ITEMS, SHOP_SLOTS, MATS, MONSTERS, BOSSES, TITLES, TRAIT_NAMES, EVENTS, PERSONA, RANKS, PERKS, TIER_TP, HAPPENINGS, CHARTERS } from './data.js';
import { IMG, iconCanvas, itemIcon, keyIcon, goldified, tinted } from './assets.js';
import { defOf, maxHp, stat, save, valid, migrate, newGame, legacyGame, seedCode, parseSeed, pawnSprite, MASTERY } from './state.js';
import { CAMP_PATROLS, VISITOR_CAP } from './data.js';
import { getFrontiers } from './world.js';
import { campProfile } from './camps.js';
import { relicItem, relicRollText } from './relics.js';
import { DT, WEEK_SECONDS } from './sim.js';
import { buildingMaxHp } from './state.js';

const $ = sel => document.querySelector(sel);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CATS = [['lodging', 'Lodging'], ['food', 'Food'], ['shop', 'Shops'], ['training', 'Training'], ['defense', 'Defense'], ['special', 'Special'], ['decor', 'Decor']];
const statLine = it => ['atk', 'mag', 'def', 'hp', 'heal'].filter(k => it[k]).map(k => `${k.toUpperCase()}${it[k] > 0 ? '+' : ''}${it[k]}`)
  .concat(['atk', 'mag', 'def', 'hp'].filter(k => it[`${k}Pct`]).map(k => `${k.toUpperCase()}+${Math.round(it[`${k}Pct`] * 100)}%`),
    it.crit ? [`CRIT+${Math.round(it.crit * 100)}%`] : [], it.spd ? [`SPD+${Math.round(it.spd * 100)}%`] : [], it.revive ? [`One revival at ${Math.round(it.revive * 100)}% HP`] : []).join(' ');
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const alphaCostText = cost => `${cost.gold.toLocaleString('en-US')}G · ${['wood', 'hide', 'herb', 'ore', 'crystal'].map(k => `${MATS[k].name}×${cost[k].toLocaleString('en-US')}`).join(' · ')}`;
const ALPHA_BENEFIT_TEXT = '+50% pet assist hit damage · +50% bonded passive stat contribution · 25% larger';

export class UI {
  constructor(game) {
    this.game = game; this.panel = null; this.buildCat = 'lodging'; this.pointerDown = false; this.lastHtml = {};
    this.questPick = null; this.frontierPick = null; this.frontierParty = []; this.relicPick = null; this.campPick = null; this.campParty = [];
    this.jobPick = false; this.partnerPick = false; this.seenLog = 0;
    this.masteryChoices = {}; this.stashPick = null;
    this.buildMode = null; this.showNames = false;
    this.bind();
  }
  get s() { return this.game.s; } get sim() { return this.game.sim; }

  bind() {
    document.querySelectorAll('.mbtn').forEach(b => b.addEventListener('click', () => { this.game.audio.sfx('open'); this.toggle(b.dataset.panel); }));
    $('#panel-close').addEventListener('click', () => this.close());
    $('#panel-body').addEventListener('change', e => {
      const id = e.target.dataset.masterPawn; if (!id) return;
      if (e.target.value) this.masteryChoices[id] = e.target.value; else delete this.masteryChoices[id];
      this.renderPanel();
    });
    for (const el of [$('#panel'), $('#inspector'), $('#buildbar'), $('#charter')]) {
      el.addEventListener('pointerdown', () => { this.pointerDown = true; });
      el.addEventListener('pointerup', () => { setTimeout(() => this.pointerDown = false, 150); });
      el.addEventListener('click', e => { const t = e.target.closest('[data-act]'); if (t && !t.disabled) this.act(t.dataset.act, t.dataset, e); });
    }
    $('#speed').addEventListener('click', e => { const b = e.target.closest('[data-speed]'); if (b) this.setSpeed(+b.dataset.speed); });
    $('#btn-sound').addEventListener('click', () => { const on = this.game.audio.toggle(); $('#btn-sound').classList.toggle('off', !on); });
    $('#btn-names').addEventListener('click', () => { this.showNames = !this.showNames; $('#btn-names').classList.toggle('on', this.showNames); });
    $('#tb-happen').addEventListener('click', () => { this.game.audio.sfx('open'); this.open('village'); });
    window.addEventListener('keydown', e => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || this.game.modal) return;
      if (e.key === 'Escape') { if (this.buildMode) this.exitBuild(); else if (this.panel) this.close(); else this.deselect(); }
      if (e.target.closest?.('button, input, select, textarea, [contenteditable]')) return;
      if (e.key === ' ') { this.setSpeed(this.game.speed ? 0 : 1); e.preventDefault(); }
      if (e.key >= '1' && e.key <= '3') this.setSpeed([1, 2, 4][+e.key - 1]);
    });
  }
  setSpeed(v) { this.game.speed = v; document.querySelectorAll('#speed [data-speed]').forEach(b => b.classList.toggle('on', +b.dataset.speed === v)); }

  // ---------- periodic ----------
  tick() {
    const s = this.s;
    $('#tb-date').textContent = `Y${s.time.year} · ${MONTHS[s.time.month - 1]} · W${s.time.week}`;
    $('#tb-gold').textContent = s.gold.toLocaleString(); $('#tb-gold').parentElement.style.color = s.gold < 0 ? '#ff8a7a' : '';
    $('#tb-tp').textContent = s.tp; $('#tb-pop').textContent = Math.floor(s.pop).toLocaleString();
    $('#tb-stars').textContent = '★'.repeat(s.stars) + '☆'.repeat(5 - s.stars);
    this.ticker(); this.goals(); this.happenChips();
    const tb = $('#topbar').offsetHeight;                        // the top bar wraps on phones (more when happenings show)
    if (tb !== this.tbH) { this.tbH = tb; for (const id of ['#ticker', '#toast', '#goals']) $(id).style.top = (tb + 2) + 'px'; }
    if (this.pointerDown) return;
    if (this.panel && ['people', 'quests', 'frontiers', 'camps', 'village', 'develop', 'jobs'].includes(this.panel)) this.renderPanel();
    if (this.game.rnd.selected) this.renderInspector();
    if (this.buildMode) this.renderBuildbar();
  }
  goals() {
    const p = this.sim.starProgress(), el = $('#goals');
    const html = p ? `<div class="gt">Next ★: ${esc(p.title)}</div>` + p.rows.map(r => `<div class="${r.ok ? 'ok' : 'no'}">${r.ok ? '✔' : '·'} ${esc(r.label)}</div>`).join('') : '<div class="gt">Legendary!</div>';
    if (this.lastHtml.goals !== html) { this.lastHtml.goals = html; el.innerHTML = html; }
    if (!el._b) { el._b = 1; el.addEventListener('click', () => this.open('village')); }
  }
  // active happenings as chips in the top bar (tap = Village panel, where "This week" explains them)
  happenChips() {
    const el = $('#tb-happen'), html = (this.s.happen || []).map(h => {
      const H = HAPPENINGS.find(x => x.id === h.id); if (!H) return '';
      return `<div class="chip happen ${H.id === 'stampede' || H.id === 'bandits' ? 'bad' : ''}" title="${esc(H.name + ' — ' + H.desc)}"><i data-key="${H.icon}"></i><span class="hl">${esc(H.short)}</span>${h.weeks > 1 ? `<small>${h.weeks}w</small>` : ''}</div>`;
    }).join('');
    if (this.lastHtml.happen !== html) { this.lastHtml.happen = html; el.innerHTML = html; this.hydrate(el); }
  }
  ticker() {
    const s = this.s, box = $('#ticker');
    const total = s.log.length ? s.log[0].text + s.log.length : '';
    if (this.tickKey === total && box.children.length) {
      [...box.children].forEach(el => { if (performance.now() - el._t > 7000) el.style.opacity = 0; if (performance.now() - el._t > 8200) el.remove(); });
      return;
    }
    const fresh = []; for (const l of s.log) { if (l === this.lastLogRef) break; fresh.push(l); }
    this.lastLogRef = s.log[0]; this.tickKey = total;
    for (const l of fresh.slice(0, 4).reverse()) {
      const d = document.createElement('div'); d.className = l.kind; d.textContent = l.text; d._t = performance.now(); box.appendChild(d);
    }
    while (box.children.length > 5) box.firstChild.remove();
  }

  // ---------- panels ----------
  toggle(name) { if (this.panel === name) this.close(); else this.open(name); }
  open(name) {
    this.exitBuild(); this.panel = name; this.questPick = null;
    if (name === 'frontiers') { this.frontierPick = null; this.frontierParty = []; this.relicPick = null; }
    if (name === 'camps') { this.campPick = null; this.campParty = []; }
    document.querySelectorAll('.mbtn').forEach(b => b.classList.toggle('on', b.dataset.panel === name));
    $('#panel').classList.remove('hidden'); $('#panel').className = 'win ' + name; this.lastHtml.panel = null; this.renderPanel();
    $('#panel-body').scrollTop = 0;
  }
  close() { this.panel = null; $('#panel').classList.add('hidden'); document.querySelectorAll('.mbtn').forEach(b => b.classList.remove('on')); }
  setBody(el, html, key) {
    if (this.lastHtml[key] === html) return false;
    this.lastHtml[key] = html; el.innerHTML = html; return true;
  }
  renderPanel() {
    const titles = { mastered: 'Mastered Residents', stash: 'Guild Stash', jobs: 'Class Hall', build: 'Build', people: 'Adventurers', quests: 'Quest Board', frontiers: 'Frontiers', camps: 'Bandit Camps', develop: 'Blacksmith · Develop', village: 'Village', system: 'System', newgame: 'New Game' };
    $('#panel-title').textContent = titles[this.panel];
    const body = $('#panel-body');
    const active = document.activeElement, focusKey = body.contains(active) ? active.dataset.focusKey : null;
    const html = this['panel_' + this.panel]();
    if (this.setBody(body, html, 'panel')) {
      this.hydrate(body);
      if (focusKey) {
        const next = [...body.querySelectorAll('[data-focus-key]')].find(el => el.dataset.focusKey === focusKey);
        next?.focus({ preventScroll: true });
      }
    }
  }
  // swap <i data-icon="..."> placeholders for pixel canvases
  hydrate(root) {
    root.querySelectorAll('[data-spr]').forEach(el => {
      const sp = SPR[el.dataset.spr]; if (!sp) return;
      const sc = Math.max(1, Math.min(3, Math.floor(Math.min((+el.dataset.w || 52) / sp.w, (+el.dataset.h || 44) / sp.h))));
      el.replaceWith(iconCanvas(sp.img, sp.x, sp.y, sp.w, sp.h, sc));
    });
    root.querySelectorAll('[data-face]').forEach(el => {
      const k = el.dataset.face, im = IMG[k]; if (!im) return;
      const c = iconCanvas(k, 0, 0, im.width, im.height, +el.dataset.scale || 1); c.className = 'px ' + (el.className || '');
      const alt = el.dataset.gold ? goldified(k) : el.dataset.tint ? tinted(k, +el.dataset.tint) : null;   // Golden Slime / Elite portraits
      if (alt) { const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, c.width, c.height); g.drawImage(alt, 0, 0, c.width, c.height); }
      el.replaceWith(c);
    });
    root.querySelectorAll('[data-item]').forEach(el => { const c = itemIcon(el.dataset.item, +el.dataset.scale || 2); if (c) el.replaceWith(c); });
    root.querySelectorAll('[data-icon]').forEach(el => {
      const k = el.dataset.icon, im = IMG[k]; if (!im) return;
      const sz = Math.min(im.width, 16), c = iconCanvas(k, 0, 0, sz, Math.min(im.height, 16), +el.dataset.scale || 2); el.replaceWith(c);
    });
    root.querySelectorAll('[data-key]').forEach(el => { const c = keyIcon(el.dataset.key, +el.dataset.px || 16); if (el.className) c.className += ' ' + el.className; el.replaceWith(c); });
    root.querySelectorAll('[data-char]').forEach(el => { const c = iconCanvas('c_' + el.dataset.char, 0, 0, 16, 16, +el.dataset.scale || 2); el.replaceWith(c); });
    root.querySelectorAll('[data-mon]').forEach(el => {
      const key = 'm_' + el.dataset.mon, c = iconCanvas(key, 0, 0, 16, 16, +el.dataset.scale || 2);
      const alt = el.dataset.gold ? goldified(key) : null;
      if (alt) { const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, c.width, c.height); g.drawImage(alt, 0, 0, 16, 16, 0, 0, c.width, c.height); }
      el.replaceWith(c);
    });
  }

  panel_build() {
    const s = this.s;
    let h = `<div class="tabs">${CATS.map(([k, n]) => `<button class="btn sm ${this.buildCat === k ? 'on' : ''}" data-act="cat" data-k="${k}">${n}</button>`).join('')}
      <button class="btn sm" data-act="tool" data-k="bulldoze">Remove</button></div><div class="grid">`;
    const entries = this.buildCat === 'decor' ? Object.entries(DECOR).filter(([, d]) => !d.cat || d.cat === 'decor')
      : [...Object.entries(FAC).filter(([k, d]) => d.cat === this.buildCat && k !== 'guild'), ...Object.entries(DECOR).filter(([, d]) => d.cat === this.buildCat)];
    for (const [k, d] of entries) {
      const lockStars = d.rank ? d.rank - 1 : 0, locked = s.stars < lockStars, have = d.unique && s.buildings.some(b => b.type === k);
      const spr = d.road ? null : Array.isArray(d.spr) ? d.spr[0] : d.spr;
      const thumb = d.road ? `<div style="width:32px;height:32px;background:#c47a50;border:2px solid #8a5030"></div>` : `<i data-spr="${spr}"></i>`;
      h += `<div class="card ${locked || have ? 'locked' : ''}" ${locked || have ? '' : `data-act="pick" data-k="${k}"`}>
        <div class="thumb">${thumb}</div><div class="meta"><div class="name">${d.name}</div>
        <div class="cost ${s.gold < this.sim.cost(k) ? 'no' : ''}">${this.sim.cost(k)}G ${locked ? `· needs ${lockStars}★` : have ? '· built' : ''}</div>
        <div class="sub">${esc(d.desc || (d.appeal ? `Appeal +${d.appeal} within ${d.r} tiles` : ''))}</div></div></div>`;
    }
    return h + '</div>';
  }
  panel_people() {
    const s = this.s, advs = s.advs.slice().sort((a, b) => (b.resident - a.resident) || b.lv - a.lv);
    let h = `<div class="muted"><strong>${advs.length}/${VISITOR_CAP[s.stars] ?? 30} total pawns</strong> · ${advs.filter(a => a.resident).length} residents · ${advs.filter(a => !a.resident).length} visitors · ${s.monsters.length} village monsters</div><div class="grid" style="margin-top:6px">`;
    h = `<div class="row"><button class="btn" data-act="open" data-k="mastered">Mastered residents (${advs.filter(a => a.resident && (a.jobLv[a.job] || 0) >= MASTERY).length})</button><button class="btn" data-act="open" data-k="stash">Guild Stash (${s.weaponDrops.length} to recover)</button></div>` + h;
    for (const a of advs) {
      const hpR = a.hp / maxHp(a, s), jobLv = a.jobLv[a.job] || 1, mastered = jobLv >= MASTERY;
      h += `<div class="card" data-act="selAdv" data-id="${a.id}"><div class="thumb"><i data-face="f_${a.spr}" data-scale="1"></i></div><div class="meta">
        <div class="name">${esc(a.name)}</div><div class="sub">${JOBS[a.job].name} Lv${a.lv} · Job Lv${jobLv} ${a.resident ? '<span class="tag res">Resident</span>' : '<span class="tag vis">Visitor</span>'}${a.ko ? '<span class="tag ko">KO</span>' : ''}${a.wantsHome ? '<span class="tag gold">Wants home</span>' : ''}</div>
        ${mastered ? '<div><strong class="tag gold mastery-status">✓ Current job mastered</strong></div>' : ''}
        <div class="bar hp" title="HP"><i style="width:${hpR * 100}%"></i></div><div class="bar sat" title="Satisfaction" style="margin-top:2px"><i style="width:${Math.min(100, a.sat / (a.resident ? 3 : 0.6))}%"></i></div>
        <div class="sub">${this.taskLabel(a)}</div></div></div>`;
    }
    for (const m of s.monsters) {
      const owner = s.advs.find(a => a.partner === m.id), block = this.sim.alphaPetBlock(m.id);
      h += `<div class="card" style="grid-column:1/-1"><div class="thumb"><i data-mon="${MONSTERS[m.type].spr}" data-scale="3" ${m.alpha ? 'data-gold="1"' : ''}></i></div><div class="meta"><div class="name">${m.alpha ? '<span class="tag gold">Alpha</span> ' : ''}${esc(m.name)}</div>
        <div class="sub">Bond ${m.bond}/100 ${m.bond >= 50 ? '· Mount' : ''}</div><div class="sub">${owner ? 'Partner of ' + esc(owner.name) : 'Free in the Stable'}</div>
        <div class="sub">${m.alpha ? 'Alpha pet · ' : 'Alpha upgrade · '}${ALPHA_BENEFIT_TEXT}</div>
        ${m.alpha ? '<div class="check">One-time Alpha upgrade complete</div>' : `<div class="sub">${alphaCostText(this.sim.alphaPetCost())}</div><div class="sub">Materials rise by 100 per upgrade, capped at 500 each.</div><div class="${block ? 'cross' : 'check'}">${esc(block || 'Ready to upgrade')}</div><button class="btn sm" data-act="alphaPet" data-id="${m.id}" ${block ? 'disabled' : ''}>Make Alpha</button>`}</div></div>`;
    }
    return h + '</div>';
  }
  taskLabel(a) {
    if (a.ko) {
      const rescuer = a.rescueBy && this.s.advs.find(o => o.id === a.rescueBy);
      return rescuer ? `${rescuer.task?.carrying ? 'Being carried by' : 'Rescue coming from'} ${rescuer.name}` : 'Knocked out · awaiting rescue';
    }
    if (a.inside) { const b = this.s.buildings.find(o => o.id === a.inside.b); return b ? `At the ${defOf(b.type).name}` : 'Inside'; }
    const t = a.task; if (!t) return 'Thinking…';
    if (t.type === 'rescue') { const fallen = this.s.advs.find(o => o.id === t.target); return `${t.carrying ? 'Carrying' : 'Rescuing'} ${fallen ? fallen.name : 'a fallen adventurer'}`; }
    if (t.type === 'hunt' && t.defend) return 'Defending village territory';
    if (t.type === 'bounty') return t.arrived ? 'Patrolling the bounty flag' : 'Heading to the bounty flag';
    if (a.dungeon) return 'Exploring the Old Cave'; return { visit: 'Heading into town', hunt: 'Hunting monsters', return: 'Returning to town', stroll: 'Strolling', camp: 'Napping outside', leave: 'Leaving the village', quest: 'On a quest!' }[t.type] || t.type;
  }
  panel_stash() {
    const s = this.s;
    let h = '<p class="muted">At zero HP, revival saves a pawn first. Otherwise: 25% permanent death, 75% rescuable knockout. Dropped weapons never expire; relic blessings return to the vault.</p><div class="section">Weapons to recover</div>';
    for (const d of s.weaponDrops) h += `<div class="card"><i data-item="${d.item}"></i><div class="meta"><b>${esc(ITEMS[d.item].name)}</b><div class="sub">Left by ${esc(d.name)}</div><button class="btn sm" data-act="recoverWeapon" data-id="${d.id}">Recover</button><button class="btn sm" data-act="mapWeapon" data-id="${d.id}">Show on map</button></div></div>`;
    if (!s.weaponDrops.length) h += '<p class="muted">No weapons awaiting recovery.</p>';
    h += '<div class="section">Recovered weapons</div><p class="muted">Choose a weapon, then an available resident. Their previous weapon returns here.</p>';
    for (const [id, count] of Object.entries(s.weaponStash)) if (count > 0) h += `<button class="btn ${this.stashPick === id ? 'sel' : ''}" data-act="pickStash" data-id="${id}" aria-pressed="${this.stashPick === id}">${esc(ITEMS[id].name)} ×${count}</button>`;
    if (!Object.keys(s.weaponStash).length) h += '<p class="muted">The stash is empty.</p>';
    if (s.weaponStash[this.stashPick] > 0) {
      h += `<div class="section">Assign ${esc(ITEMS[this.stashPick].name)}</div>`;
      for (const a of s.advs.filter(a => a.resident)) {
        const blocked = a.ko || a.inside || a.dungeon || this.sim.questForPawn(a.id) || a.eq.weapon === this.stashPick;
        h += `<button class="btn" data-act="equipStash" data-id="${this.stashPick}" data-pawn="${a.id}" ${blocked ? 'disabled' : ''}>${esc(a.name)} · ${JOBS[a.job].name}${blocked ? ' (unavailable)' : ''}</button>`;
      }
    }
    return h;
  }
  panel_mastered() {
    const s = this.s, choices = this.masteryChoices || {}, pawns = s.advs.filter(a => a.resident && (a.jobLv[a.job] || 0) >= MASTERY);
    const selected = Object.entries(choices), cost = selected.reduce((n, [, j]) => n + (JOBS[j] ? this.sim.jobCost(j) : 0), 0);
    let h = `<p class="muted">Residents who mastered their current class. Choose their next classes and apply them together. Portraits, mastery perks and equipment are kept.</p><div class="row"><b>${selected.length} selected · ${cost} TP / ${s.tp} available</b><button class="btn" data-act="applyMastered" ${!selected.length || cost > s.tp ? 'disabled' : ''}>Apply selected changes</button><button class="btn sm" data-act="clearMastered">Clear choices</button></div>`;
    if (!pawns.length) h += '<p class="muted">No residents have mastered their current class yet.</p>';
    for (const a of pawns) {
      h += `<div class="card"><i data-face="f_${a.spr}"></i><div class="meta"><b>${esc(a.name)}</b><div class="sub">${JOBS[a.job].name} · Mastered · ${esc(this.taskLabel(a))}</div><select class="btn" aria-label="Next class for ${esc(a.name)}" data-master-pawn="${a.id}" data-focus-key="mastery:${a.id}"><option value="">Keep current class</option>`;
      for (const [id, j] of Object.entries(JOBS)) {
        if (id === a.job) continue;
        const block = this.sim.canChangeJob(a, id);
        h += `<option value="${id}" ${choices[a.id] === id ? 'selected' : ''} ${block ? 'disabled' : ''}>${j.name} · ${this.sim.jobCost(id)} TP${(a.jobLv[id] || 0) >= MASTERY ? ' · already mastered' : ''}${block ? ' · ' + esc(block) : ''}</option>`;
      }
      h += '</select></div></div>';
    }
    return h;
  }
  partyChoice(a, selected, action, rec) {
    const job = JOBS[a.job], visitor = a.resident ? '' : ' · visitor', low = a.lv < rec ? ' · below suggested level' : '';
    const label = `${a.name}, ${job.name}, level ${a.lv}${a.resident ? '' : ', visitor'}`;
    return `<button type="button" class="card party-choice ${selected ? 'sel' : ''}" data-act="${action}" data-id="${a.id}" data-focus-key="${action}:${a.id}" aria-pressed="${selected}" aria-label="${esc(label)}">
      <span class="thumb"><i data-char="${pawnSprite(a)}"></i></span><span class="meta"><span class="name">${esc(a.name)}</span><span class="sub">${job.name} Lv${a.lv}${visitor}${low}</span></span>
      <strong class="party-state">${selected ? '<span aria-hidden="true">✓</span> Selected' : 'Select'}</strong></button>`;
  }
  panel_quests() {
    const s = this.s; let h = '';
    const bounty = s.bounty;
    h += '<p class="muted">Double-click the map to post a 500G bounty: 2-4 random healthy pawns patrol a five-tile circle for two weeks from placement (1 minute at 1x). One flag at a time; wounded pawns retreat.</p>';
    if (bounty) h += `<div class="card"><div class="meta"><b>Bounty patrol · ${Math.max(0, (bounty.expiresAt - s.tick) * DT / WEEK_SECONDS).toFixed(1)} weeks left</b><div class="sub">${bounty.members.map(id => esc(s.advs.find(a => a.id === id)?.name || '')).join(', ')}</div><button class="btn sm" data-act="watchBounty">Watch flag</button> <button class="btn sm" data-act="endBounty">Recall patrol (no refund)</button></div></div>`;
    const captured = getFrontiers(this.s).filter(f => s.frontier?.completed?.[f.id]).length;
    const camps = s.banditCamps || [], campReady = camps.filter(c => !this.sim.campBlock(c.id)).length;
    h += `<div class="row spread"><span class="muted">Run as many quests as you have available pawns for. Tap a quest to adjust its party, or instantly send up to 4 random healthy adventurers. Suggested levels are advice, not a selection limit.</span><span class="row"><button class="btn" data-act="open" data-k="frontiers">Frontiers ${captured}/${getFrontiers(this.s).length}</button><button class="btn" data-act="open" data-k="camps">Bandit Camps ${campReady}/${camps.length}</button></span></div>`;
    for (const q of s.activeQuests) {
      const alive = s.mons.filter(m => m.quest === q.id && m.hp > 0);
      h += `<div class="section">Underway: ${esc(q.name)}</div><div class="row spread"><span class="muted">${q.kind === 'dungeon' ? `Floor ${q.floor}/${q.floors}` : alive.length + ' foes remain'}</span><button class="btn sm" data-act="watchQuest" data-id="${q.id}">Watch</button></div><div class="grid">`;
      for (const id of q.members) { const a = s.advs.find(o => o.id === id); if (!a) continue;
        h += `<div class="card" data-act="selAdv" data-id="${a.id}"><div class="thumb"><i data-face="f_${a.spr}"></i></div><div class="meta"><div class="name">${esc(a.name)}</div><div class="bar hp"><i style="width:${a.hp / maxHp(a, s) * 100}%"></i></div><div class="sub">${a.ko ? 'KO' : JOBS[a.job].name + ' Lv' + a.lv}</div></div></div>`; }
      h += '</div>';
    }
    h += `<div class="section">Available quests</div>`;
    if (!s.quests.length) h += `<p class="muted">New quests are posted at the start of each month.</p>`;
    for (const q of s.quests) {
      const face = q.boss ? `<i data-face="bf_${q.boss}"></i>` : q.kind === 'dungeon' ? `<i data-spr="cave"></i>` : MONSTERS[q.mon].human ? `<i data-char="${MONSTERS[q.mon].spr}" data-scale="3"></i>` : `<i data-mon="${MONSTERS[q.mon].spr}" data-scale="3"></i>`;
      const rec = this.sim.questLevel(q), ready = this.sim.questReady(q).length;
      h += `<div class="card ${this.questPick === q.id ? 'sel' : ''}" data-act="pickQuest" data-id="${q.id}"><div class="thumb">${face}</div><div class="meta">
        <div class="name">${esc(q.name)}</div><div class="sub">${esc(q.desc)}</div>
        <div class="sub">Fee <b>${q.fee}G</b> · Reward ${q.reward.gold}G, ${q.reward.tp}TP, +${q.reward.pop} pop · Suggested Lv${rec}+</div>
        <button class="btn sm" data-act="instantQuest" data-id="${q.id}" ${!ready || s.gold < q.fee ? 'disabled' : ''}>Instant Depart (${q.fee}G)</button>${!ready ? '<div class="sub">No healthy adventurers available</div>' : s.gold < q.fee ? '<div class="sub">Not enough gold</div>' : ''}</div></div>`;
      if (this.questPick === q.id) {
        const cands = this.sim.questCandidates().sort((a, b) => b.lv - a.lv);
        this.party = (this.party || []).filter(id => cands.some(a => a.id === id));
        const extra = Math.max(0, this.party.length - 4), cost = this.sim.questCost(q, this.party.length);
        h += `<div class="row" style="margin:8px 0"><button class="btn" data-act="startQuest" data-id="${q.id}" ${!this.party.length || s.gold < cost ? 'disabled' : ''}>Depart (${cost}G)</button><span class="muted">${this.party.length}/8 selected · ${q.fee}G entry + ${extra * this.sim.questExtraFee(q)}G extras</span></div>`;
        h += `<div class="muted" style="margin:4px 0">Up to 4 random available adventurers with at least 50% HP are selected, regardless of level. Tap to adjust; slots 5–8 cost ${this.sim.questExtraFee(q)}G each. Pawns on other quests are unavailable.</div><div class="grid party-grid">`;
        for (const a of cands) h += this.partyChoice(a, this.party.includes(a.id), 'togParty', rec);
        h += `</div>${cands.length ? '' : '<p class="muted">No adventurers are available right now.</p>'}`;
      }
    }
    return h;
  }
  panel_frontiers() {
    const s = this.s, completed = s.frontier?.completed || {}, relics = s.frontier?.relics || {};
    let h = `<div class="row spread"><span class="muted">Conquer each den once to claim its land, permanent village bonus and unique legendary relic.</span><button class="btn sm" data-act="open" data-k="quests">Quest board</button></div>
      <p class="frontier-note"><b>Legendary rewards go to the Guild Relic Vault below, not a pawn inventory.</b> Select an earned relic, then choose a resident to receive its blessing. Each camp also has a one-time 30% chance to grant a rare companion, with a bonus Stable space. Previously captured camps receive this chance too.</p>`;
    h += this.frontierRelics();
    const picked = getFrontiers(this.s).find(f => f.id === this.frontierPick);
    if (picked) h += this.frontierDetail(picked);
    h += '<div class="section">Territories</div><div class="grid frontier-grid">';
    for (const f of getFrontiers(this.s)) {
      const active = s.activeQuests.find(q => q.frontier === f.id), captured = !!completed[f.id], block = this.sim.frontierBlock(f.id);
      const req = f.requires.length ? f.requires.map(id => getFrontiers(this.s).find(x => x.id === id)?.name || id).join(', ') : 'None';
      const status = captured ? '<span class="tag res">Captured</span>' : active ? '<span class="tag gold">Underway</span>'
        : block ? `<span class="tag ko">${esc(block)}</span>` : '<span class="tag vis">Ready</span>';
      const relic = relicItem(s, f.relic), q = this.sim.frontierQuest(f.id), owner = s.advs.find(a => a.id === relics[f.relic]);
      const relicStatus = captured ? owner ? `Blessing assigned to ${esc(owner.name)}` : 'In Guild Relic Vault · ready to assign' : esc(statLine(relic));
      const petType = s.frontier.petRewards?.[f.id];
      const petStatus = captured ? petType ? `${MONSTERS[petType].name} joined · assign in Adventurers` : 'No rare companion found' : '30% chance of a rare companion';
      h += `<div class="card frontier-card ${this.frontierPick === f.id ? 'sel' : ''}" data-act="pickFrontier" data-id="${f.id}"><div class="thumb"><i data-face="bf_${f.boss}"></i></div><div class="meta">
        <div class="name">${esc(f.name)}</div><div>${status}</div><div class="sub">${esc(f.bossName)} · Suggested Lv${f.rec}+ · (${f.x}, ${f.y})</div>
        <div class="sub">Fee ${q.fee}G · Victory ${q.reward.gold}G, ${q.reward.tp}TP, +${q.reward.pop} pop</div>
        <div class="sub">Land bonus: ${esc(f.benefit)}</div><div class="sub">Legendary: ${esc(relic.name)} · ${relicStatus}</div><div class="sub">${esc(relicRollText(s, f.relic))}</div><div class="sub">${esc(petStatus)}</div><div class="sub">Requires: ${esc(req)}</div>
        <button class="btn sm" data-act="mapFrontier" data-id="${f.id}">${active ? 'Watch' : 'Show on map'}</button>${captured ? `<button class="btn sm" data-act="pickRelic" data-id="${f.relic}">Manage relic</button>` : ''}</div></div>`;
    }
    return h + '</div>';
  }
  frontierDetail(f) {
    const s = this.s, q = this.sim.frontierQuest(f.id), active = s.activeQuests.find(x => x.frontier === f.id), captured = !!s.frontier?.completed?.[f.id];
    let h = `<div class="section">${esc(f.name)}</div><div class="row spread"><span class="muted">${esc(f.bossName)} · ${esc(f.benefit)} · ${esc(relicItem(s, f.relic).name)}</span><button class="btn sm" data-act="mapFrontier" data-id="${f.id}">${active ? 'Watch fight' : 'Show on map'}</button></div><p class="muted">${esc(relicRollText(s, f.relic))}</p>`;
    if (active) {
      const alive = s.mons.filter(m => m.quest === active.id && m.hp > 0).length;
      h += `<p class="muted">Conquest underway · ${alive} foe${alive === 1 ? '' : 's'} remain.</p><div class="grid">`;
      for (const id of active.members) { const a = s.advs.find(x => x.id === id); if (!a) continue;
        h += `<div class="card" data-act="selAdv" data-id="${a.id}"><div class="thumb"><i data-face="f_${a.spr}"></i></div><div class="meta"><div class="name">${esc(a.name)}</div><div class="bar hp"><i style="width:${a.hp / maxHp(a, s) * 100}%"></i></div><div class="sub">${a.ko ? 'KO' : JOBS[a.job].name + ' Lv' + a.lv}</div></div></div>`; }
      return h + '</div>';
    }
    if (captured) {
      const owner = s.advs.find(a => a.id === s.frontier?.relics?.[f.relic]);
      return h + `<p class="check">Captured permanently. This land bonus is active and the one-of-a-kind ${esc(relicItem(s, f.relic).name)} ${owner ? `blesses ${esc(owner.name)}` : 'is stored in the Guild Relic Vault'}.</p><button class="btn sm" data-act="pickRelic" data-id="${f.relic}">Manage relic</button>`;
    }
    const block = this.sim.frontierBlock(f.id);
    if (block) return h + `<p class="cross">${esc(block)}</p>`;
    if (!q) return h + '<p class="cross">This frontier is unavailable.</p>';
    const cands = this.sim.questCandidates().sort((a, b) => b.lv - a.lv);
    this.frontierParty = (this.frontierParty || []).filter(id => cands.some(a => a.id === id));
    const party = this.frontierParty;
    const extra = Math.max(0, party.length - 4), cost = this.sim.questCost(q, party.length), ready = this.sim.questReady(q).length;
    h += `<div class="row" style="margin:8px 0"><button class="btn" data-act="startFrontier" data-id="${q.id}" ${!party.length || s.gold < cost ? 'disabled' : ''}>Depart (${cost}G)</button>
      <button class="btn sm" data-act="instantFrontier" data-id="${q.id}" ${!ready || s.gold < q.fee ? 'disabled' : ''}>Instant Depart (${q.fee}G)</button><span class="muted">${party.length}/8 selected · ${q.fee}G entry + ${extra * this.sim.questExtraFee(q)}G extras</span></div>
      <div class="muted" style="margin:4px 0">Up to 4 random available adventurers with at least 50% HP are selected, regardless of level. Tap to adjust; slots 5–8 cost ${this.sim.questExtraFee(q)}G each. The boss appears only after departure.</div><div class="grid party-grid">`;
    const rec = this.sim.questLevel(q);
    for (const a of cands) h += this.partyChoice(a, party.includes(a.id), 'togFrontierParty', rec);
    return h + `</div>${cands.length ? '' : '<p class="muted">No adventurers are available right now.</p>'}`;
  }
  frontierRelics() {
    const s = this.s, relics = s.frontier?.relics || {}, earned = getFrontiers(this.s).filter(f => Object.prototype.hasOwnProperty.call(relics, f.relic));
    const inVault = earned.filter(f => relics[f.relic] == null).length;
    let h = `<div class="section relic-summary">Guild Relic Vault <span class="tag gold">${earned.length}/${getFrontiers(this.s).length} earned</span>${inVault ? `<span class="tag vis">${inVault} ready to assign</span>` : ''}</div>`;
    if (!earned.length) return h + '<p class="muted relic-note">Win a frontier conquest to earn its one-of-a-kind permanent blessing.</p>';
    const itemId = earned.some(f => f.relic === this.relicPick) ? this.relicPick : null;
    h += '<p class="muted relic-note">Each relic grants a permanent blessing to one assigned resident. One blessing per pawn, on top of all four equipment slots: their accessory stays free. Blessings never expire; select one to assign or transfer it.</p><div class="grid relic-grid">';
    for (const f of earned) {
      const it = relicItem(s, f.relic), owner = s.advs.find(a => a.id === relics[f.relic]);
      const selected = this.relicPick === f.relic;
      h += `<button type="button" class="card relic-choice ${selected ? 'sel' : ''}" data-act="pickRelic" data-id="${f.relic}" data-focus-key="relic:${f.relic}" aria-pressed="${selected}" aria-label="${esc(`${it.name}, ${owner ? 'blessing assigned to ' + owner.name : 'in Guild Relic Vault, ready to assign'}`)}"><span class="thumb"><i data-item="${f.relic}" data-scale="3"></i></span><span class="meta"><span class="name">${esc(it.name)}</span><span class="sub">${esc(statLine(it))}</span><span class="sub">${esc(relicRollText(s, f.relic))}</span><strong class="sub ${owner ? 'check' : 'relic-ready'}">${owner ? 'Blessing assigned to ' + esc(owner.name) : 'In vault · select to assign'}</strong></span></button>`;
    }
    h += '</div>';
    if (itemId) {
      const item = relicItem(s, itemId), ownerId = relics[itemId], owner = s.advs.find(a => a.id === ownerId), ownerAway = owner && (owner.ko || this.sim.questForPawn(owner.id));
      h += `<div class="relic-transfer"><div class="row spread"><b>Assign ${esc(item.name)}</b><button class="btn sm" data-act="equipRelic" data-id="${itemId}" data-pawn="none" ${ownerId == null || ownerAway ? 'disabled' : ''}>Return to vault</button></div><p class="muted">Choose a resident to bless. Their previous blessing returns to the vault; ordinary equipment is kept.${ownerAway ? ' Its owner must return and recover first.' : ''}</p><div class="grid relic-owner-grid">`;
      for (const a of s.advs.filter(a => a.resident).sort((a, b) => b.lv - a.lv)) {
        const unavailable = ownerAway || a.ko || a.task?.type === 'quest' || !!this.sim.questForPawn(a.id), current = ownerId === a.id;
        const state = current ? 'blessed' : unavailable ? a.ko ? 'KO' : 'away on quest' : 'available';
        h += `<button type="button" class="card relic-choice ${current ? 'sel' : ''} ${unavailable ? 'locked' : ''}" data-act="equipRelic" data-id="${itemId}" data-pawn="${a.id}" data-focus-key="relic-owner:${itemId}:${a.id}" aria-pressed="${current}" aria-label="${esc(`${a.name}, ${JOBS[a.job].name}, level ${a.lv}, ${state}`)}" ${unavailable ? 'disabled' : ''}><span class="thumb"><i data-face="f_${a.spr}"></i></span><span class="meta"><span class="name">${esc(a.name)}</span><span class="sub">${JOBS[a.job].name} Lv${a.lv} · ${state}</span></span></button>`;
      }
      h += '</div></div>';
    }
    return h;
  }
  panel_camps() {
    const s = this.s, camps = s.banditCamps || [];
    let h = `<div class="row spread"><span class="muted">Strike the outlaw camps beyond the village. Live camps keep two nearby wandering guards, replacing fallen guards after one week. A cleared camp regroups after a random 8–20 weeks.</span><button class="btn sm" data-act="open" data-k="quests">Quest board</button></div>
      <p class="muted camp-note">${s.stars ? `At ${s.stars} stars, camp patrols send ${CAMP_PATROLS[s.stars].count[0] === CAMP_PATROLS[s.stars].count[1] ? CAMP_PATROLS[s.stars].count[0] : CAMP_PATROLS[s.stars].count.join('–')} guard${CAMP_PATROLS[s.stars].count[1] === 1 ? '' : 's'} of level ${CAMP_PATROLS[s.stars].level.join('–')} every ${CAMP_PATROLS[s.stars].weeks.join('–')} weeks across all camps.` : 'Camp patrols begin at one star.'} Attacked pawns defend themselves in town without rallying the village. Clearing a camp recalls its patrols and stops its attacks for 8–20 weeks. Larger village raids can also come from live camps.</p>`;
    const picked = camps.find(c => c.id === this.campPick);
    if (picked) h += this.campDetail(picked);
    h += '<div class="section">Known camps</div><div class="grid camp-grid">';
    for (const c of camps) {
      const q = this.sim.campQuest(c.id), active = s.activeQuests.find(x => x.camp === c.id), block = this.sim.campBlock(c.id), wait = this.campWait(c);
      const profile = campProfile(c);
      const loot = q ? Object.entries(q.reward.materials || {}).map(([k, n]) => `${MATS[k].name}×${n}`).join(', ') : '';
      const status = active ? '<span class="tag gold">Underway</span>' : wait ? `<span class="tag">${esc(wait)}</span>`
        : block ? `<span class="tag ko">${esc(block)}</span>` : '<span class="tag vis">Ready</span>';
      h += `<div class="card camp-card ${this.campPick === c.id ? 'sel' : ''}" data-act="pickCamp" data-id="${c.id}"><div class="thumb"><i data-spr="${c.tier >= 3 ? 'hutB' : 'hutA'}"></i></div><div class="meta">
        <div class="name">${esc(c.name)}</div><div>${status}</div><div class="sub">Tier ${c.tier} · Suggested Lv${q?.rec || this.sim.questLevel(q)}+ · (${c.x}, ${c.y})</div>
        <div class="sub"><span style="color:${profile.color}">${esc(profile.label)}</span> · ${esc(profile.captainName)}</div><div class="sub">${esc(profile.description)}</div><div class="sub" title="${esc(profile.modifierDescription)}">${esc(profile.modifierLabel)}</div>
        <div class="sub">${q ? `Fee ${q.fee}G · Bounty ${q.reward.gold}G, ${q.reward.tp}TP, +${q.reward.pop} pop · ${q.n} raiders` : 'No bounty posted'}</div>${loot ? `<div class="sub">Stores: ${esc(loot)}</div>` : ''}
        <div class="sub">Cleared ${c.clears || 0} time${c.clears === 1 ? '' : 's'}</div><button class="btn sm" data-act="mapCamp" data-id="${c.id}">${active ? 'Watch' : 'Show on map'}</button></div></div>`;
    }
    return h + '</div>';
  }
  campWait(c) {
    const seconds = Math.max(0, Math.ceil(((c.readyAt || 0) - this.s.tick) / 10));
    if (!seconds) return '';
    const weeks = Math.ceil(seconds / 30);
    return `Returns in ${weeks} week${weeks === 1 ? '' : 's'}`;
  }
  campDetail(c) {
    const s = this.s, q = this.sim.campQuest(c.id), active = s.activeQuests.find(x => x.camp === c.id), wait = this.campWait(c);
    const profile = campProfile(c);
    const loot = q ? Object.entries(q.reward.materials || {}).map(([k, n]) => `${MATS[k].name}×${n}`).join(', ') : '';
    let h = `<div class="section">${esc(c.name)}</div><div class="row spread"><span class="muted">Tier ${c.tier} · cleared ${c.clears || 0} time${c.clears === 1 ? '' : 's'}${q ? ` · ${q.n} raiders` : ''}${loot ? ` · stores ${esc(loot)}` : ''}</span><button class="btn sm" data-act="mapCamp" data-id="${c.id}">${active ? 'Watch fight' : 'Show on map'}</button></div>
      <p><b style="color:${profile.color}">${esc(profile.label)}</b> · ${esc(profile.captainName)}<br><span class="muted">${esc(profile.description)}</span></p><p class="muted"><b>${esc(profile.modifierLabel)}</b> · ${esc(profile.modifierDescription)}</p>`;
    if (active) {
      const alive = s.mons.filter(m => m.quest === active.id && m.hp > 0).length;
      h += `<p class="muted">Raid underway · ${alive} foe${alive === 1 ? '' : 's'} remain.</p><div class="grid">`;
      for (const id of active.members) { const a = s.advs.find(x => x.id === id); if (!a) continue;
        h += `<div class="card" data-act="selAdv" data-id="${a.id}"><div class="thumb"><i data-face="f_${a.spr}"></i></div><div class="meta"><div class="name">${esc(a.name)}</div><div class="bar hp"><i style="width:${a.hp / maxHp(a, s) * 100}%"></i></div><div class="sub">${a.ko ? 'KO' : JOBS[a.job].name + ' Lv' + a.lv}</div></div></div>`; }
      return h + '</div>';
    }
    const block = this.sim.campBlock(c.id);
    if (block) return h + `<p class="${wait ? 'muted' : 'cross'}">${esc(wait || block)}</p>`;
    if (!q) return h + '<p class="cross">This camp is unavailable.</p>';
    const cands = this.sim.questCandidates().sort((a, b) => b.lv - a.lv);
    this.campParty = (this.campParty || []).filter(id => cands.some(a => a.id === id));
    const party = this.campParty, extra = Math.max(0, party.length - 4), cost = this.sim.questCost(q, party.length), ready = this.sim.questReady(q).length;
    h += `<div class="row" style="margin:8px 0"><button class="btn" data-act="startCamp" data-id="${q.id}" ${!party.length || s.gold < cost ? 'disabled' : ''}>Depart (${cost}G)</button>
      <button class="btn sm" data-act="instantCamp" data-id="${q.id}" ${!ready || s.gold < q.fee ? 'disabled' : ''}>Instant Depart (${q.fee}G)</button><span class="muted">${party.length}/8 selected · ${q.fee}G entry + ${extra * this.sim.questExtraFee(q)}G extras</span></div>
      <div class="muted" style="margin:4px 0">Up to 4 random available adventurers with at least 50% HP are selected, regardless of level. Tap to adjust; slots 5–8 cost ${this.sim.questExtraFee(q)}G each. Raiders appear only after departure.</div><div class="grid party-grid">`;
    const rec = this.sim.questLevel(q);
    for (const a of cands) h += this.partyChoice(a, party.includes(a.id), 'togCampParty', rec);
    return h + `</div>${cands.length ? '' : '<p class="muted">No adventurers are available right now.</p>'}`;
  }
  panel_develop() {
    const s = this.s, smith = s.buildings.some(b => b.type === 'smith'), tab = this.devTab || 'weapon';
    let h = `<div class="row">${Object.entries(MATS).map(([k, m]) => `<span class="chip"><i data-icon="i_${m.icon}" data-scale="1"></i>${m.name} ${s.mats[k] || 0}</span>`).join('')}</div>`;
    if (!smith) h += `<p class="muted">Build a <b>Blacksmith</b> to develop new gear. Monsters drop materials; treasure chests can also reveal new gear.</p>`;
    const tabs = [['weapon', 'Weapons'], ['armor', 'Body Armor'], ['offhand', 'Helms / Shields'], ['acc', 'Accessories'], ['item', 'Items']];
    h += `<div class="tabs" style="margin-top:6px">${tabs.map(([k, n]) => `<button class="btn sm ${tab === k ? 'on' : ''}" data-act="devTab" data-k="${k}">${n} ${Object.keys(ITEMS).filter(id => !ITEMS[id].legendary && ITEMS[id].slot === k && s.unlocked[id]).length}/${Object.values(ITEMS).filter(i => !i.legendary && i.slot === k).length}</button>`).join('')}</div><div class="grid">`;
    const list = Object.entries(ITEMS).filter(([, it]) => !it.legendary && it.slot === tab).sort((p, q) => p[1].price - q[1].price);
    for (const [id, it] of list) {
      const have = s.unlocked[id], dev = it.dev;
      const st = statLine(it);
      const users = it.slot === 'weapon' ? Object.values(JOBS).filter(j => j.wt.includes(it.type)).map(j => j.name) : [];
      const costs = dev ? Object.entries(dev).map(([k, n]) => `<span class="${(s.mats[k] || 0) >= n ? '' : 'cross'}">${MATS[k].name}×${n}</span>`).join(' ') : 'Starter';
      h += `<div class="card"><div class="thumb"><i data-item="${id}" data-scale="3"></i></div><div class="meta"><div class="name">${it.name}</div>
        <div class="sub">${st} · ${it.price}G${it.type ? ` · ${it.type}` : ''}</div>${users.length ? `<div class="sub" title="${users.join(', ')}">Class bonus: ${esc(users.slice(0, 4).join(', '))}${users.length > 4 ? '…' : ''}</div>` : ''}
        ${it.revive ? '<div class="sub">One stored charge per pawn, consumed on a lethal hit. No equipment slot. Sold at Item Shops after research.</div>' : ''}
        ${it.bow ? '<div class="sub">Any class can fire arrows with this bow. Bow specialists prioritize buying bows.</div>' : ''}
        ${it.star ? `<div class="sub ${s.stars < it.star ? 'cross' : ''}">Requires ${it.star} stars${it.researchOnly ? ' · Research only' : ''}</div>` : ''}
        ${have ? '<div class="sub check">In stock</div>' : `<div class="sub">${costs} · ${Math.round(it.price * 1.5)}G</div><button class="btn sm" data-act="develop" data-id="${id}" ${smith && s.stars >= (it.star || 0) ? '' : 'disabled'}>Develop</button>`}</div></div>`;
    }
    return h + '</div>';
  }
  panel_jobs() {
    const s = this.s, a = s.advs.find(o => o.id === this.jobFor);
    let h = a ? `<div class="row"><i data-face="f_${a.spr}"></i><div><b>${esc(a.name)}</b> · ${JOBS[a.job].name} Job Lv${a.jobLv[a.job] || 1} · <span class="muted">Town Points ${s.tp}</span>
      <div class="muted">Master a job (Job Lv${MASTERY}) to change jobs and keep its perk forever. Perks stack.</div></div></div>` : `<p class="muted">Every class, its mastery perk and what it takes to unlock it.</p>`;
    this.wideGrid = true;
    h += '<p class="muted">Class changes keep your portrait and all equipment; your field outfit changes to match the class. Any weapon is usable; a preferred type grants +10% damage and +1 combat speed (faster attacks). Other weapons keep their normal stats with no penalty.</p>';
    const TN = ['Starter', 'Tier 1', 'Tier 2 · advanced', 'Tier 3 · elite', 'Tier 4 · legendary'];
    for (let t = 0; t <= 4; t++) {
      h += `<div class="section">${TN[t]} <span class="muted">${TIER_TP[t] ? TIER_TP[t] + ' TP' : ''}</span></div><div class="grid">`;
      for (const [id, j] of Object.entries(JOBS)) {
        if (j.tier !== t) continue;
        const P = PERKS[j.perk], lv = a ? a.jobLv[id] || 0 : 0, mastered = lv >= MASTERY, cur = a && a.job === id;
        const err = a ? this.sim.canChangeJob(a, id) : null;
        const req = (j.req || []).map(r => `${a && (a.jobLv[r] || 0) >= MASTERY ? '✔' : '·'} ${JOBS[r].name}`).join(' ');
        const status = !a ? '' : cur && mastered ? `<strong class="tag res mastery-status">✓ Current job mastered · Lv${lv}</strong>` : cur ? `<span class="tag res">Current · Lv${lv}</span>` : mastered ? `<span class="tag gold">★ Mastered · Lv${lv}</span>` : lv ? `<span class="tag">Lv${lv}</span>` : '';
        h += `<div class="card ${a && err && !cur ? 'locked' : ''} ${cur ? 'sel' : ''}" ${a && !err ? `data-act="setJob" data-id="${a.id}" data-job="${id}"` : ''}>
          <div class="thumb"><i data-char="${j.sprites[0]}" data-scale="3"></i></div><div class="meta"><div class="name">${j.name}</div>${status ? `<div>${status}</div>` : ''}
          <div class="sub"><b>${P.name}</b>: ${esc(P.desc)}</div>
          <div class="sub">${esc(j.desc)} · Preferred: ${j.wt.length > 6 ? 'any weapon' : j.wt.join(', ')}</div>
          <div class="sub">${j.attack === 'bow' ? 'Needs a bow to shoot; prioritizes buying bows.' : j.attack === 'magic' ? 'Innate spells with any melee weapon or empty hands; bows fire physical arrows.' : j.attack === 'throw' ? 'Innate throwing attacks with melee weapons or empty hands; bows fire arrows.' : 'Melee attacks; equip a bow to fire arrows.'}</div>
          ${req ? `<div class="sub">Needs: ${req}</div>` : ''}${a && err && !cur ? `<div class="sub cross">${esc(err)}</div>` : ''}</div></div>`;
      }
      h += '</div>';
    }
    return h;
  }
  panel_village() {
    const s = this.s, sim = this.sim, p = sim.starProgress();
    let h = `<div class="section">Rank ${'★'.repeat(s.stars)}${'☆'.repeat(5 - s.stars)} · ${RANKS[s.stars].title}</div>`;
    if (p) h += `<div class="muted">Next: ${p.title}</div><table class="t">${p.rows.map(r => `<tr><td class="${r.ok ? 'check' : 'cross'}">${r.ok ? '✔' : '✘'}</td><td>${esc(r.label)}</td></tr>`).join('')}</table>`;
    else h += `<p>Your village is legendary!</p>`;
    h += this.thisWeek();
    h += `<div class="section">Events <span class="muted">(Town Points: ${s.tp})</span></div><div class="grid">`;
    for (const e of EVENTS) { const on = sim.eventOn(e.id);
      h += `<div class="card"><div class="meta"><div class="name">${e.name}</div><div class="sub">${esc(e.desc)}</div>
        <button class="btn sm" data-act="event" data-id="${e.id}" ${s.tp < e.tp || on ? 'disabled' : ''}>${on ? 'Running' : e.tp + ' TP'}</button></div></div>`; }
    h += `</div><div class="section">Town traits</div><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr))">`;
    const mx = Math.max(30, ...Object.values(s.traits || {}));
    for (const k of TRAIT_NAMES) h += `<div><div class="row spread"><span>${k}</span><span class="muted">${s.traits[k]}</span></div><div class="bar xp"><i style="width:${s.traits[k] / mx * 100}%"></i></div></div>`;
    h += `</div><div class="section">Titles</div><table class="t">`;
    for (const t of TITLES) { const got = s.titles[t.id];
      h += `<tr><td class="${got ? 'check' : 'muted'}">${got ? '★' : '·'}</td><td>${t.name}<div class="muted">${Object.entries(t.need).map(([k, v]) => `${k} ${Math.min(s.traits[k], v)}/${v}`).join(' · ')}</div></td><td class="muted">${t.desc}</td></tr>`; }
    h += `</table><div class="section">Records</div><table class="t">
      <tr><td>Sales this month</td><td>${s.stats.income}G</td></tr><tr><td>Sales last month</td><td>${s.stats.lastIncome}G</td></tr>
      <tr><td>Upkeep last month</td><td>${s.stats.lastUpkeep || 0}G</td></tr><tr><td>Monsters defeated</td><td>${s.stats.kills}</td></tr>
      <tr><td>Quests cleared</td><td>${s.cleared}</td></tr><tr><td>Visitors so far</td><td>${s.stats.visitorsTotal}</td></tr></table>`;
    return h;
  }
  // Village panel section: charter, active happenings (with the merchant's shop) and recent history.
  thisWeek() {
    const s = this.s, sim = this.sim, alive = ids => s.mons.filter(m => (ids || []).includes(m.id) && m.hp > 0).length;
    let h = `<div class="section">This week</div>`;
    const C = s.charter && CHARTERS.find(c => c.id === s.charter);
    if (C) h += `<div class="card"><div class="thumb"><i data-key="${C.icon}" data-px="32"></i></div><div class="meta"><div class="name">Charter: ${esc(C.name)}</div><div class="sub check">▲ ${esc(C.up)}</div><div class="sub cross">▼ ${esc(C.down)}</div></div></div>`;
    if (!(s.happen || []).length) h += `<p class="muted">A quiet week. Most weeks bring something: a merchant, weather, a raid, a legend passing through…</p>`;
    for (const hh of s.happen || []) {
      const H = HAPPENINGS.find(x => x.id === hh.id); if (!H) continue; const d = hh.data || {};
      let st = hh.weeks > 1 ? `${hh.weeks} weeks left` : 'Ends this week';
      if (H.id === 'stampede') st += ` · ${alive(d.mobs)} still charging · ${d.breaches || 0} broke through`;
      if (H.id === 'bandits') { const camp = (s.banditCamps || []).find(c => c.id === d.camp); st += ` · ${alive(d.mobs)} bandits left${camp ? ` · from ${esc(camp.name)}` : ''}`; }
      if (H.id === 'goldslime') st += alive([d.mob]) ? ' · still roaming (red arrows show raiders, gold = the slime)' : ' · caught!';
      if (H.id === 'meteor') st += ` · +${d.crystals} Crystal at week end`;
      if (H.id === 'wanderer') { const a = s.advs.find(o => o.id === d.adv); st += a ? ` · ${esc(a.name)} the ${JOBS[a.job].name}${a.resident ? ' has settled here!' : ''}` : ''; }
      h += `<div class="card"><div class="thumb"><i data-key="${H.icon}" data-px="32"></i></div><div class="meta"><div class="name">${esc(H.name)}</div><div class="sub">${esc(H.desc)}</div><div class="sub">${st}</div></div></div>`;
      if (H.id === 'merchant') h += this.merchantCards(d.offer || []);
    }
    if ((s.happenLog || []).length) h += `<div class="muted">Recently: ${s.happenLog.slice(-6).reverse().map(l => `${esc((HAPPENINGS.find(x => x.id === l.id) || {}).short || l.id)} (${l.t})`).join(' · ')}</div>`;
    return h;
  }
  merchantCards(offer) {
    const s = this.s;
    const sale = offer.filter(o => ITEMS[o.id] && !ITEMS[o.id].legendary);
    if (!sale.length) return `<p class="muted">The merchant is sold out.</p>`;
    return `<div class="grid">` + sale.map(o => { const it = ITEMS[o.id];
      return `<div class="card"><div class="thumb"><i data-item="${o.id}" data-scale="3"></i></div><div class="meta"><div class="name">${esc(it.name)}</div><div class="sub">${statLine(it)}</div><div class="sub">Shops sell it for ${it.price}G</div>
        <button class="btn sm" data-act="buyMerchant" data-id="${o.id}" ${s.gold < o.price ? 'disabled' : ''}>Licence ${o.price}G</button></div></div>`; }).join('') + `</div>`;
  }
  panel_system() {
    const s = this.s, C = s.charter && CHARTERS.find(c => c.id === s.charter);
    return `<div class="row"><button class="btn" data-act="save">Save now</button><button class="btn" data-act="export">Export save</button><button class="btn" data-act="import">Import save</button><button class="btn" data-act="newgame">New game</button></div>
      <div class="section">World</div>
      <div class="row"><span>World code <b class="code">${s.world && s.world.code != null ? seedCode(s.world.code) : '— (older save)'}</b></span>${C ? `<span class="muted">Charter: ${esc(C.name)}</span>` : ''}</div>
      <div class="row" style="margin-top:4px"><input id="seed-in" class="seed-in" maxlength="6" placeholder="code" autocomplete="off" spellcheck="false"><button class="btn sm" data-act="seedGame">Found a village with this code</button></div>
      <p class="muted">Share a world code with a friend: newly founded villages with the same code share region layouts, frontier sites, camp factions, monsters, cave and charter choices. Existing saves keep their original geography. Relic bonus traits are revealed on capture.</p>
      <p class="muted">The game autosaves every in-game week. Controls: drag or WASD/arrows to pan · wheel/pinch or +/- to zoom · tap adventurers or buildings to inspect · Space pauses · 1/2/3 set speed.</p>
      <div class="section">Credits</div>
      <p class="muted">Art, music and sound: <b>Ninja Adventure</b> asset pack by Pixel-boy &amp; AAA (CC0) — pixel-boy.itch.io. Armor and accessory icons: <b>16x16 RPG Item Pack</b> by Alex's Assets (CC0). Masterwork equipment: <b>16x16 RPG Items (DB32)</b> by ARoachIFoundOnMyPillow (CC0) — OpenGameArt.org. Fountain, statue and castle: <b>Medieval Fantasy</b> by Pixel-boy (CC0). Game design inspired by the adventurer-village genre (Kairosoft's Dungeon Village); no Kairosoft assets are used. Code: original.</p>`;
  }

  openNewGame(seed = null) {
    this.newGameSeed = seed;
    this.pioneerPick = (this.s.advs.find(a => a.resident) || this.s.advs[0])?.id ?? null;
    this.pickPioneer(this.pioneerPick); this.open('newgame');
  }
  pickPioneer(id) {
    this.pioneerPick = id;
    const a = this.s.advs.find(a => a.id === id), pets = this.s.monsters.filter(p => p.frontier && p.id !== a?.partner);
    if (!pets.some(p => p.id === this.pioneerPetPick)) this.pioneerPetPick = pets[0]?.id ?? null;
  }
  panel_newgame() {
    const s = this.s, pawn = s.advs.find(a => a.id === this.pioneerPick);
    const partner = s.monsters.find(p => p.id === pawn?.partner), pets = s.monsters.filter(p => p.frontier && p.id !== partner?.id);
    let h = `<p>Start a new village in ${this.newGameSeed == null ? 'a random world' : `world <b>${seedCode(this.newGameSeed)}</b>`}. Your current village will be replaced only after confirmation.</p>
      <button class="btn" data-act="freshStart">Fresh start · carry nothing</button>
      <div class="section">Roguelite start · carry a pioneer</div>
      <p>Choose one pawn. They restart as a level 1 Villager with up to five randomly kept masteries and their perks. Equipment, money, work and other run progress reset. Name, appearance and personality stay.</p>
      <p>Their bonded pet comes too, plus one extra legendary companion earned from a world camp if available. Pets retain bond and Alpha status.</p>
      <button class="btn gold" data-act="legacyStart" ${pawn ? '' : 'disabled'}>Begin with ${pawn ? esc(pawn.name) : 'a pioneer'}</button>
      <div class="section">Choose one pawn</div><div class="grid party-grid">`;
    for (const a of s.advs) {
      const selected = a.id === this.pioneerPick, n = Object.keys(JOBS).filter(id => (a.jobLv[id] || 0) >= MASTERY).length;
      h += `<button class="card relic-choice ${selected ? 'sel' : ''}" data-act="pickPioneer" data-id="${a.id}" data-focus-key="pioneer:${a.id}" aria-pressed="${selected}"><span class="thumb"><i data-face="f_${a.spr}"></i></span><span class="meta"><span class="name">${selected ? '✓ Selected · ' : ''}${esc(a.name)}</span><span class="sub">${JOBS[a.job].name} Lv${a.lv} → Villager Lv1</span><span class="sub">Keep ${Math.min(5, n)} of ${n} masteries</span></span></button>`;
    }
    h += `</div><p>Bonded pet: <b>${partner ? esc(partner.name) : 'None'}</b>${partner?.alpha ? ' · Alpha' : ''}</p><div class="section">One extra legendary pet</div>`;
    if (!pets.length) return h + `<p class="muted">${partner?.frontier ? 'Your only legendary companion is already coming with the pawn.' : 'No extra legendary companions in this village.'}</p>`;
    h += '<div class="grid party-grid">';
    for (const p of pets) h += `<button class="card relic-choice ${p.id === this.pioneerPetPick ? 'sel' : ''}" data-act="pickPioneerPet" data-id="${p.id}" data-focus-key="pioneer-pet:${p.id}" aria-pressed="${p.id === this.pioneerPetPick}"><span class="thumb"><i data-mon="${MONSTERS[p.type].spr}" data-scale="3"></i></span><span class="meta"><span class="name">${p.id === this.pioneerPetPick ? '✓ Selected · ' : ''}${esc(p.name)}</span><span class="sub">Bond ${p.bond}${p.alpha ? ' · Alpha' : ''}</span></span></button>`;
    return h + '</div>';
  }
  beginNewGame(carry) {
    const a = this.s.advs.find(a => a.id === this.pioneerPick);
    if (carry && !a) { this.toast('Choose a pawn first'); return; }
    this.ask(carry ? `Replace this village and begin again with ${a.name}, up to five random masteries and the selected pets? Equipment, money and village progress will reset.` : 'Start a fresh village carrying nothing? Your current village will be replaced.', 'Start new village', () => {
      const next = carry ? legacyGame(this.s, a.id, this.pioneerPetPick, this.newGameSeed ?? undefined) : newGame(this.newGameSeed ?? undefined);
      if (!next) { this.toast('The selected pawn or pet is no longer available'); return; }
      if (!save(next)) { this.toast('Could not save the new village. Your current game is still open.'); return; }
      this.game.noSave = true; location.href = location.pathname;
    });
  }

  // ---------- inspector ----------
  renderInspector() {
    const sel = this.game.rnd.selected, box = $('#inspector'); if (!sel) { box.classList.add('hidden'); return; }
    let html = '';
    if (sel.kind === 'adv') html = this.inspAdv(this.s.advs.find(a => a.id === sel.id));
    else if (sel.kind === 'b') html = this.inspBuilding(this.s.buildings.find(b => b.id === sel.id));
    else if (sel.kind === 'mon') html = this.inspMon(this.s.mons.find(m => m.id === sel.id));
    else if (sel.kind === 'npc') html = this.inspNpc((this.s.npcs || []).find(n => n.kind === sel.id));
    if (!html) { this.deselect(); return; }
    box.classList.remove('hidden');
    if (this.setBody(box, `<button class="btn sm close" data-act="deselect">✕</button>` + html, 'insp')) this.hydrate(box);
  }
  inspAdv(a) {
    if (!a) return '';
    const s = this.s, hp = maxHp(a, s), job = JOBS[a.job];
    let h = `<div class="head"><i data-face="f_${a.spr}" data-scale="1" class="face"></i><div><h3>${esc(a.name)}</h3>
      <div class="muted">${job.name} Lv${a.lv} · Job Lv${a.jobLv[a.job] || 1}${(a.jobLv[a.job] || 1) >= 10 ? ' (Mastered)' : ''}</div>
      <div>${a.resident ? '<span class="tag res">Resident</span>' : '<span class="tag vis">Visitor</span>'}${a.persona.map(p => `<span class="tag" title="${esc(PERSONA[p].desc)}">${PERSONA[p].name}</span>`).join('')}</div></div></div>
      <div class="row" style="margin-top:6px"><span style="width:34px">HP</span><div class="bar hp" style="flex:1"><i style="width:${a.hp / hp * 100}%"></i></div><span class="muted">${Math.ceil(a.hp)}/${hp}</span></div>
      <div class="row"><span style="width:34px">EXP</span><div class="bar xp" style="flex:1"><i style="width:${a.xp / this.sim.xpNeed(a) * 100}%"></i></div></div>
      <div class="row"><span style="width:34px">Joy</span><div class="bar sat" style="flex:1"><i style="width:${Math.min(100, a.sat / (a.resident ? 3 : 0.6))}%"></i></div><span class="muted">${Math.round(a.sat)}</span></div>
      <div class="stats"><div><b>ATK</b> ${stat(a, 'atk', s)}</div><div><b>DEF</b> ${stat(a, 'def', s)}</div><div><b>MAG</b> ${stat(a, 'mag', s)}</div><div><b>Work</b> ${Math.round(a.work)}</div></div>
      <div class="row muted"><span>💰 ${a.gold}G</span><span>Potions ${a.potions}</span><span>Kills ${a.kills}</span><span>Hunger ${Math.round(a.hunger)}</span><span>Energy ${Math.round(a.energy)}</span></div>
      ${a.reviveCharge || s.unlocked.phoenixSigil ? `<div class="${a.reviveCharge ? 'check' : 'muted'}">Phoenix Sigil: ${a.reviveCharge ? '1 charge ready · revives at half HP · no slot used' : 'not carried'}</div>` : ''}
      <div class="muted">${this.taskLabel(a)}</div>
      <div class="row" style="margin:6px 0">${['weapon', 'armor', 'offhand', 'acc'].map(sl => { const it = a.eq[sl] && ITEMS[a.eq[sl]], label = { weapon: 'Weapon', armor: 'Body armor', offhand: 'Helm / shield', acc: 'Accessory' }[sl]; return `<span class="chip">${label}: ${it ? `<i data-item="${a.eq[sl]}" data-scale="1"></i>${it.name}` : 'None'}</span>`; }).join('')}</div>
      ${a.eq.weapon ? `<div class="${this.sim.weaponMatch(a) ? 'check' : 'muted'}">${this.sim.weaponMatch(a) ? 'Class match: +10% damage · +1 combat speed' : 'Weapon usable · normal stats, no class bonus'}</div>` : ''}
      <div class="muted">Attack: ${{ arrow: 'Arrows', fire: 'Innate magic', shuriken: 'Innate throwing' }[this.sim.attackProfile(a).projectile] || 'Melee'} · Reach ${this.sim.attackProfile(a).range} tiles${job.attack === 'bow' ? ' · Prioritizes bows' : ''}</div>
      ${a.eq.blessing && ITEMS[a.eq.blessing] ? `<div class="relic-summary"><strong class="tag gold">★ Permanent blessing</strong><div><i data-item="${a.eq.blessing}" data-scale="1"></i> ${esc(relicItem(s, a.eq.blessing).name)}</div><div class="muted">${esc(statLine(relicItem(s, a.eq.blessing)))} · Accessory slot stays free</div><div class="muted">${esc(relicRollText(s, a.eq.blessing))}</div></div>` : ''}
      ${a.perks.length ? `<div class="muted">Mastered perks:</div><div class="row">${a.perks.map(p => `<span class="tag gold" title="${esc(PERKS[p].desc)}">★ ${PERKS[p].name}</span>`).join('')}</div>` : ''}
      <div class="muted">Job Lv${a.jobLv[a.job] || 1}/99 · ${(a.jobLv[a.job] || 1) >= MASTERY ? 'mastered' : `${MASTERY - (a.jobLv[a.job] || 1)} to mastery`} · Lv${a.lv}/99</div>`;
    const pet = a.partner && s.monsters.find(m => m.id === a.partner);
    h += `<div class="muted">Partner: ${pet ? `${pet.alpha ? '<span class="tag gold">Alpha</span> ' : ''}${esc(pet.name)} (bond ${pet.bond}${pet.bond >= 50 ? ', riding' : ''})` : 'none'}</div>`;
    h += `<div class="row" style="margin-top:6px"><button class="btn sm" data-act="gift" data-id="${a.id}" ${s.gold < 50 ? 'disabled' : ''}>Gift 50G</button>
      ${a.resident ? `<button class="btn sm" data-act="jobs" data-id="${a.id}">Change job</button>` : ''}
      ${a.resident && s.monsters.length ? `<button class="btn sm" data-act="partners">Partner</button>` : ''}
      <button class="btn sm ${this.game.follow === a.id ? 'on' : ''}" data-act="follow" data-id="${a.id}">Follow</button></div>`;
    if (this.partnerPick && a.resident) {
      h += `<div class="section">Choose a partner</div><div class="grid" style="grid-template-columns:1fr 1fr">`;
      h += `<div class="card" data-act="setPartner" data-id="${a.id}" data-m="0"><div class="meta"><div class="name">None</div></div></div>`;
      for (const m of s.monsters) { const o = s.advs.find(x => x.partner === m.id && x !== a);
        h += `<div class="card ${o ? 'locked' : ''}" ${o ? '' : `data-act="setPartner" data-id="${a.id}" data-m="${m.id}"`}><div class="thumb"><i data-mon="${MONSTERS[m.type].spr}" ${m.alpha ? 'data-gold="1"' : ''}></i></div><div class="meta"><div class="name">${m.alpha ? '<span class="tag gold">Alpha</span> ' : ''}${esc(m.name)}</div><div class="sub">${o ? 'with ' + esc(o.name) : 'bond ' + m.bond}</div></div></div>`; }
      h += '</div>';
    }
    return h;
  }
  inspBuilding(b) {
    if (!b) return ''; const s = this.s, d = defOf(b.type), F = FAC[b.type];
    const spr = Array.isArray(d.spr) ? d.spr[b.v || 0] : d.spr;
    let h = `<div class="head"><i data-spr="${spr}" data-w="70" data-h="60"></i><div><h3>${d.name}${F ? ` Lv${b.lv}` : ''}</h3><div class="muted">${esc(d.desc || '')}</div></div></div>`;
    if (F) {
      const occ = b.occ.map(id => s.advs.find(a => a.id === id)).filter(Boolean);
      if (F.hp) h += `<p><b>Tower health: ${Math.ceil(b.hp)} / ${buildingMaxHp(b)} HP</b></p>`;
      h += `<table class="t"><tr><td>Appeal</td><td>${this.sim.appeal(b)}</td></tr>${F.price ? `<tr><td>Price</td><td>${this.sim.price(b)}G</td></tr>` : ''}
        ${F.kind === 'home' ? `<tr><td>Residents</td><td>${s.advs.filter(a => a.home === b.id).map(a => esc(a.name)).join(', ') || 'Vacant'} (${this.sim.capOf(b)} max)</td></tr>` : ''}
        <tr><td>Visits</td><td>${b.visits}</td></tr><tr><td>Total sales</td><td>${b.sales}G</td></tr><tr><td>Inside now</td><td>${occ.map(a => esc(a.name)).join(', ') || '—'}</td></tr></table>`;
      if (F.kind === 'shop') {
        const slots = SHOP_SLOTS[F.slot] || [F.slot];
        const stock = Object.keys(s.unlocked).filter(id => ITEMS[id] && !ITEMS[id].legendary && slots.includes(ITEMS[id].slot)).map(id => ITEMS[id].name);
        h += `<div class="muted"><b>Stock:</b> ${stock.map(esc).join(', ') || 'nothing yet'}${slots.includes('acc') ? '<br>Developed accessories are sold here.' : ''}</div>`;
      }
      h += `<div class="row" style="margin-top:6px">${b.lv < 5 ? `<button class="btn sm" data-act="upgrade" data-id="${b.id}" ${s.gold < this.sim.upgradeCost(b) ? 'disabled' : ''}>Upgrade ${this.sim.upgradeCost(b)}G</button>` : '<span class="muted">Max level</span>'}
        ${b.type !== 'guild' ? `<button class="btn sm" data-act="demolish" data-id="${b.id}">Remove (+${this.sim.refund(b)}G)</button>` : `<button class="btn sm" data-act="open" data-k="quests">Quests</button><button class="btn sm" data-act="classes">Classes</button>`}</div>`;
    } else h += `<div class="row"><button class="btn sm" data-act="demolish" data-id="${b.id}">Remove (+${this.sim.refund(b)}G)</button></div>`;
    return h;
  }
  inspMon(m) {
    if (!m || m.hp <= 0) return '';
    const base = m.boss ? BOSSES[m.boss] : MONSTERS[m.type], M = m.job ? { ...base, spr: m.spr || base.spr, weapon: m.weapon || base.weapon, human: true } : base;
    const frontier = m.frontier && getFrontiers(this.s).find(f => f.id === m.frontier);
    const camp = m.camp || (typeof m.quest === 'string' && m.quest.startsWith('camp:') ? m.quest.slice(5) : null);
    const face = m.boss ? `bf_${m.boss}` : M.human ? `f_${M.spr}` : `mf_${M.spr}`;
    const tag = frontier ? `<span class="tag gold">Guardian of ${esc(frontier.name)}</span>` : camp ? '<span class="tag ko">Bandit camp raider</span>' : m.golden ? '<span class="tag gold">Golden — catch it for a fortune!</span>' : m.raid ? `<span class="tag ko">${m.raid === 'bandits' ? 'Bandit' : 'Stampede'} raider</span>`
      : m.elite ? '<span class="tag gold">Elite — ×2.5 EXP & gold, ×2 drops</span>' : M.human ? '<span class="tag ko">Outlaw</span>' : '';
    const name = frontier ? frontier.bossName : m.name || m.className || (m.golden ? 'Golden Slime' : (m.elite ? 'Elite ' : '') + M.name);
    return `<div class="head"><i data-face="${face}" class="face" ${m.golden ? 'data-gold="1"' : m.elite ? 'data-tint="150"' : ''}></i><div><h3>${esc(name)}</h3><div class="muted">Lv${m.lv}${m.captain ? ' · Captain · ' + esc(m.className) : ''}${m.quest ? ' · Quest target' : ''}</div>${tag}</div></div>
      <div class="row"><span style="width:34px">HP</span><div class="bar hp" style="flex:1"><i style="width:${m.hp / m.mhp * 100}%"></i></div><span class="muted">${m.hp}/${m.mhp}</span></div>
      <div class="stats"><div><b>ATK</b> ${m.atk}</div><div><b>DEF</b> ${m.def}</div></div>
      <div class="muted">Drops: ${Object.keys(M.drops || {}).map(k => MATS[k].name).join(', ')}</div>`;
  }
  inspNpc(n) {
    if (!n) return '';
    if (n.kind === 'merchant') { const h = (this.s.happen || []).find(x => x.id === 'merchant');
      return `<div class="head"><i data-face="f_${n.spr}" data-scale="1" class="face"></i><div><h3>Traveling Merchant</h3><div class="muted">Sells licences for gear you have not developed yet — no materials needed. Leaves at the end of the week.</div></div></div>` + this.merchantCards(h ? h.data.offer || [] : []); }
    return `<div class="head"><i data-face="f_${n.spr}" data-scale="1" class="face"></i><div><h3>Wandering Bard</h3><div class="muted">Songs in the square: every adventurer got happier and popularity rose this week.</div></div></div>`;
  }
  // New-game modal: pick 1 of the 3 charters offered by this world's seed (or roll a new world). Pauses the sim.
  charterPick(onDone) {
    const box = $('#charter');
    const render = () => {
      const s = this.s;
      const cards = s.charterChoices.map(id => { const C = CHARTERS.find(c => c.id === id);
        return `<div class="card charter" data-act="charter" data-id="${C.id}"><div class="thumb"><i data-key="${C.icon}" data-px="32"></i></div><div class="meta"><div class="name">${esc(C.name)}</div>
          <div class="sub check">▲ ${esc(C.up)}</div><div class="sub cross">▼ ${esc(C.down)}</div></div></div>`; }).join('');
      box.innerHTML = `<div class="win charter-box"><h2>Found your village</h2><p class="muted">Choose a charter. Each world offers three — every village plays differently.</p>
        <div class="charters">${cards}</div>
        <div class="row spread" style="margin-top:8px"><span class="muted">World code <b class="code">${seedCode(s.world.code)}</b></span><button class="btn sm" data-act="reroll">New world</button></div></div>`;
      this.hydrate(box);
    };
    this.charterDone = () => { box.classList.add('hidden'); this.game.modal = false; this.charterDone = null; onDone && onDone(); };
    this.charterRender = render;
    this.game.modal = true; box.classList.remove('hidden'); render();
  }
  deselect() { this.game.rnd.selected = null; this.game.rnd.frontierFocus = null; this.game.rnd.campFocus = null; this.partnerPick = false; this.game.follow = null; $('#inspector').classList.add('hidden'); this.lastHtml.insp = null; }
  select(sel) {
    this.game.rnd.selected = sel; this.game.rnd.frontierFocus = null; this.game.rnd.campFocus = null; this.partnerPick = false; this.lastHtml.insp = null; this.renderInspector(); this.game.audio.sfx('click');
  }
  showFrontier(id) {
    const f = getFrontiers(this.s).find(x => x.id === id); if (!f) return;
    if (this.panel !== 'frontiers') this.open('frontiers');
    this.game.rnd.frontierFocus = id; this.frontierPick = id; this.relicPick = null;
    const q = this.sim.frontierQuest(id), blocked = this.sim.frontierBlock(id);
    this.frontierParty = q && !blocked ? this.sim.autoQuestParty(q.id) : [];
    this.lastHtml.panel = null; this.renderPanel(); $('#panel-body').scrollTop = 0;
  }
  showCamp(id) {
    const c = (this.s.banditCamps || []).find(x => x.id === id); if (!c) return;
    if (this.panel !== 'camps') this.open('camps');
    this.game.rnd.frontierFocus = null; this.game.rnd.campFocus = id; this.campPick = id;
    const q = this.sim.campQuest(id), blocked = this.sim.campBlock(id);
    this.campParty = q && !blocked ? this.sim.autoQuestParty(q.id) : [];
    this.lastHtml.panel = null; this.renderPanel(); $('#panel-body').scrollTop = 0;
  }

  // ---------- build mode ----------
  enterBuild(type) { this.buildMode = type; this.close(); this.deselect(); $('#view').classList.add('building'); this.renderBuildbar(); $('#buildbar').classList.remove('hidden'); }
  exitBuild() { this.buildMode = null; this.game.rnd.ghost = null; $('#view').classList.remove('building'); $('#buildbar').classList.add('hidden'); }
  renderBuildbar() {
    const t = this.buildMode; if (!t) return;
    const label = t === 'bulldoze' ? 'Remove: tap a road, decoration or building' : `${defOf(t).name} · ${this.sim.cost(t)}G — ${defOf(t).road ? 'drag to paint roads' : defOf(t).barrier ? 'drag to build a wall' : 'tap to place'}`;
    this.setBody($('#buildbar'), `<span>${esc(label)}</span><span class="muted" style="color:#ffcf3f">${this.s.gold}G</span><button class="btn sm" data-act="exitBuild">Done</button>`, 'bb');
  }

  // ---------- actions ----------
  act(a, d) {
    const s = this.s, sim = this.sim, audio = this.game.audio;
    const err = e => { if (e) { this.toast(e); audio.sfx('cancel'); } else audio.sfx('accept'); return !e; };
    switch (a) {
      case 'cat': this.buildCat = d.k; this.renderPanel(); audio.sfx('click'); break;
      case 'pick': this.enterBuild(d.k); audio.sfx('click'); break;
      case 'tool': this.enterBuild(d.k); break;
      case 'exitBuild': this.exitBuild(); break;
      case 'selAdv': { const adv = s.advs.find(o => o.id === +d.id); if (adv) { this.select({ kind: 'adv', id: adv.id }); this.game.centerOn(adv.x, adv.y); } break; }
      case 'recoverWeapon': err(sim.recoverWeapon(+d.id)); this.renderPanel(); break;
      case 'mapWeapon': { const drop = s.weaponDrops.find(o => o.id === +d.id); if (drop) { this.close(); this.game.centerOn(drop.x, drop.y); } break; }
      case 'watchBounty': { const b = s.bounty; if (b) { this.close(); this.game.centerOn(b.x, b.y); } break; }
      case 'endBounty': sim.endBounty(); this.renderPanel(); break;
      case 'pickStash': this.stashPick = d.id; this.renderPanel(); break;
      case 'equipStash': err(sim.equipRecoveredWeapon(d.id, +d.pawn)); this.renderPanel(); this.lastHtml.insp = null; break;
      case 'clearMastered': this.masteryChoices = {}; this.renderPanel(); break;
      case 'applyMastered': if (err(sim.changeMasteredJobs(this.masteryChoices))) this.masteryChoices = {}; this.renderPanel(); this.lastHtml.insp = null; break;
      case 'deselect': this.deselect(); break;
      case 'gift': err(sim.gift(s.advs.find(o => o.id === +d.id), 50)); break;
      case 'jobs': this.jobFor = +d.id; this.open('jobs'); break;
      case 'devTab': this.devTab = d.k; this.renderPanel(); audio.sfx('click'); break;
      case 'partners': this.partnerPick = !this.partnerPick; this.lastHtml.insp = null; this.renderInspector(); break;
      case 'alphaPet': {
        const pet = s.monsters.find(m => m.id === +d.id);
        if (!pet) { err('Pet not found'); break; }
        this.ask(`Make ${pet.name} an Alpha pet? Cost: ${alphaCostText(sim.alphaPetCost())}. Benefits: ${ALPHA_BENEFIT_TEXT}. Species and bond are preserved.`, 'Make Alpha', () => {
          err(sim.alphaPet(pet.id)); this.lastHtml.insp = null; this.renderPanel(); this.renderInspector();
        });
        break;
      }
      case 'setJob': err(sim.changeJob(s.advs.find(o => o.id === +d.id), d.job)); this.lastHtml.insp = null; this.renderInspector(); if (this.panel) this.renderPanel(); break;
      case 'setPartner': { const adv = s.advs.find(o => o.id === +d.id); adv.partner = +d.m || null; this.partnerPick = false; audio.sfx('accept'); this.lastHtml.insp = null; this.renderInspector(); break; }
      case 'follow': this.game.follow = this.game.follow === +d.id ? null : +d.id; this.lastHtml.insp = null; this.renderInspector(); break;
      case 'upgrade': err(sim.upgrade(s.buildings.find(b => b.id === +d.id))); this.lastHtml.insp = null; this.renderInspector(); break;
      case 'demolish': { const b = s.buildings.find(o => o.id === +d.id); if (b) this.ask(`Remove the ${defOf(b.type).name}? You get back ${sim.refund(b)}G.`, 'Remove', () => { err(sim.demolish(b)); this.deselect(); }); break; }
      case 'open': this.open(d.k); break;
      case 'classes': this.jobFor = null; this.open('jobs'); break;
      case 'pickFrontier': this.showFrontier(d.id); audio.sfx('click'); break;
      case 'mapFrontier': { const f = getFrontiers(this.s).find(x => x.id === d.id); if (f) { this.game.rnd.frontierFocus = f.id; this.close(); this.game.centerOn(f.x, f.y); } break; }
      case 'togFrontierParty': { const id = +d.id; if (this.frontierParty.includes(id)) this.frontierParty = this.frontierParty.filter(x => x !== id); else if (this.frontierParty.length < 8 && sim.questCandidates().some(x => x.id === id)) this.frontierParty.push(id); else this.toast('A party can have at most 8 available adventurers'); this.renderPanel(); audio.sfx('click'); break; }
      case 'startFrontier': if (err(sim.startQuest(d.id, this.frontierParty || []))) { this.frontierParty = []; audio.sfx('quest'); } this.renderPanel(); break;
      case 'instantFrontier': if (err(sim.instantQuest(d.id))) { this.frontierParty = []; audio.sfx('quest'); } this.renderPanel(); break;
      case 'pickRelic': this.relicPick = this.relicPick === d.id ? null : d.id; this.renderPanel(); if (this.relicPick) $('#panel-body').scrollTop = 0; audio.sfx('click'); break;
      case 'equipRelic': err(sim.equipRelic(d.id, d.pawn === 'none' ? null : +d.pawn)); this.renderPanel(); break;
      case 'pickCamp': this.showCamp(d.id); audio.sfx('click'); break;
      case 'mapCamp': { const c = (s.banditCamps || []).find(x => x.id === d.id); if (c) { this.game.rnd.campFocus = c.id; this.close(); this.game.centerOn(c.x, c.y); } break; }
      case 'togCampParty': { const id = +d.id; if (this.campParty.includes(id)) this.campParty = this.campParty.filter(x => x !== id); else if (this.campParty.length < 8 && sim.questCandidates().some(x => x.id === id)) this.campParty.push(id); else this.toast('A party can have at most 8 available adventurers'); this.renderPanel(); audio.sfx('click'); break; }
      case 'startCamp': if (err(sim.startQuest(d.id, this.campParty || []))) { this.campParty = []; audio.sfx('quest'); } this.renderPanel(); break;
      case 'instantCamp': if (err(sim.instantQuest(d.id))) { this.campParty = []; audio.sfx('quest'); } this.renderPanel(); break;
      case 'pickQuest': this.questPick = this.questPick === +d.id ? null : +d.id; this.party = this.questPick ? sim.autoQuestParty(this.questPick) : []; this.renderPanel(); audio.sfx('click'); break;
      case 'togParty': { const id = +d.id; if (this.party.includes(id)) this.party = this.party.filter(x => x !== id); else if (this.party.length < 8 && sim.questCandidates().some(a => a.id === id)) this.party.push(id); else this.toast('A party can have at most 8 available adventurers'); this.renderPanel(); audio.sfx('click'); break; }
      case 'startQuest': if (err(sim.startQuest(+d.id, this.party || []))) { this.questPick = null; this.party = null; this.game.audio.sfx('quest'); } this.renderPanel(); break;
      case 'instantQuest': if (err(sim.instantQuest(+d.id))) { this.questPick = null; this.party = null; audio.sfx('quest'); } this.renderPanel(); break;
      case 'watchQuest': { const id = d.id.includes(':') ? d.id : +d.id, q = s.activeQuests.find(q => q.id === id); if (q) { this.close(); this.game.centerOn(q.spot[0], q.spot[1]); } break; }
      case 'develop': err(sim.develop(d.id)); this.renderPanel(); break;
      case 'event': err(sim.runEvent(d.id)); this.renderPanel(); break;
      case 'buyMerchant': err(sim.buyMerchant(d.id)); if (this.panel) this.renderPanel(); this.lastHtml.insp = null; this.renderInspector(); break;
      case 'charter': if (err(sim.chooseCharter(d.id)) && this.charterDone) this.charterDone(); break;
      case 'reroll': { const seed = sim.R.int(1, 0x7fffffff); this.game.replaceState(s.flags.pioneer ? legacyGame(s, s.flags.pioneer, s.flags.pioneerPet, seed) || newGame(seed) : newGame(seed)); save(this.s); this.charterRender && this.charterRender(); audio.sfx('click'); break; }
      case 'seedGame': { const code = ($('#seed-in') || {}).value, seed = parseSeed(code);
        if (seed === null) { this.toast('A world code is 1–6 letters or digits'); audio.sfx('cancel'); break; }
        this.openNewGame(seed); break; }
      case 'save': this.toast(save(s) ? 'Saved!' : 'Save failed'); break;
      case 'export': {
        const blob = new Blob([JSON.stringify(s)], { type: 'application/json' }), url = URL.createObjectURL(blob);
        const el = document.createElement('a'); el.href = url; el.download = `wayfarer-save-Y${s.time.year}M${s.time.month}.json`; el.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        navigator.clipboard?.writeText(JSON.stringify(s)).then(() => this.toast('Save file downloaded (also copied to clipboard)')).catch(() => {}); break;
      }
      case 'import': {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json';
        inp.onchange = async () => { try { const o = JSON.parse(await inp.files[0].text()); if (!valid(o)) throw new Error('bad'); this.game.replaceState(migrate(o)); this.toast('Save imported'); } catch { this.toast('That file is not a Wayfarer save'); } };
        inp.click(); break;
      }
      case 'newgame': this.openNewGame(); break;
      case 'pickPioneer': this.pickPioneer(+d.id); this.renderPanel(); break;
      case 'pickPioneerPet': this.pioneerPetPick = +d.id; this.renderPanel(); break;
      case 'freshStart': this.beginNewGame(false); break;
      case 'legacyStart': this.beginNewGame(true); break;
    }
  }

  // In-game confirm dialog (native confirm() is blocked in some embeds and clunky on iPad).
  ask(text, okLabel, onOk) {
    const box = $('#ask'); box.querySelector('.ask-text').textContent = text; box.querySelector('.ask-ok').textContent = okLabel;
    box.classList.remove('hidden'); this.game.audio.sfx('open');
    const done = ok => { box.classList.add('hidden'); box.querySelector('.ask-ok').onclick = box.querySelector('.ask-no').onclick = null; if (ok) onOk(); else this.game.audio.sfx('cancel'); };
    box.querySelector('.ask-ok').onclick = () => done(true); box.querySelector('.ask-no').onclick = () => done(false);
  }
  toast(text) { const box = $('#toast'), d = document.createElement('div'); d.textContent = text; box.appendChild(d); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => d.remove(), 2600); }
  fanfare(title, sub) {
    const q = this.ffQueue || (this.ffQueue = []); q.push([title, sub]);
    if (!this.ffBusy) this.nextFanfare();
  }
  nextFanfare() {
    const n = this.ffQueue.shift(); if (!n) { this.ffBusy = false; return; }
    this.ffBusy = true; const box = $('#fanfare');
    box.querySelector('.ff-title').textContent = n[0]; box.querySelector('.ff-sub').textContent = n[1] || '';
    box.classList.remove('hidden'); const inner = box.querySelector('.ff-inner'); inner.style.animation = 'none'; void inner.offsetWidth; inner.style.animation = '';
    this.game.audio.sfx('fanfare');
    setTimeout(() => { box.classList.add('hidden'); setTimeout(() => this.nextFanfare(), 250); }, 2200);
  }
}
