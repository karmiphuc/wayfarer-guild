// DOM UI: top bar, ticker, bottom menu panels, inspector, fanfares. Uses event delegation via data-act.
import { FAC, DECOR, SPR, JOBS, ITEMS, MATS, MONSTERS, BOSSES, FRONTIERS, TITLES, TRAIT_NAMES, EVENTS, PERSONA, RANKS, PERKS, TIER_TP, HAPPENINGS, CHARTERS } from './data.js';
import { IMG, iconCanvas, itemIcon, keyIcon, goldified, tinted } from './assets.js';
import { defOf, maxHp, stat, save, wipeSave, valid, migrate, newGame, seedCode, parseSeed, MASTERY } from './state.js';

const $ = sel => document.querySelector(sel);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CATS = [['lodging', 'Lodging'], ['food', 'Food'], ['shop', 'Shops'], ['training', 'Training'], ['defense', 'Defense'], ['special', 'Special'], ['decor', 'Decor']];
const statLine = it => ['atk', 'mag', 'def', 'hp', 'heal'].filter(k => it[k]).map(k => `${k.toUpperCase()}${it[k] > 0 ? '+' : ''}${it[k]}`)
  .concat(it.crit ? [`CRIT+${Math.round(it.crit * 100)}%`] : [], it.spd ? [`SPD+${Math.round(it.spd * 100)}%`] : []).join(' ');
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class UI {
  constructor(game) {
    this.game = game; this.panel = null; this.buildCat = 'lodging'; this.pointerDown = false; this.lastHtml = {};
    this.questPick = null; this.frontierPick = null; this.frontierParty = []; this.relicPick = null;
    this.jobPick = false; this.partnerPick = false; this.seenLog = 0;
    this.buildMode = null; this.showNames = false;
    this.bind();
  }
  get s() { return this.game.s; } get sim() { return this.game.sim; }

  bind() {
    document.querySelectorAll('.mbtn').forEach(b => b.addEventListener('click', () => { this.game.audio.sfx('open'); this.toggle(b.dataset.panel); }));
    $('#panel-close').addEventListener('click', () => this.close());
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
      if (e.target.tagName === 'INPUT' || this.game.modal) return;
      if (e.key === 'Escape') { if (this.buildMode) this.exitBuild(); else if (this.panel) this.close(); else this.deselect(); }
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
    if (this.panel && ['people', 'quests', 'frontiers', 'village', 'develop', 'jobs'].includes(this.panel)) this.renderPanel();
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
    const titles = { jobs: 'Class Hall', build: 'Build', people: 'Adventurers', quests: 'Quest Board', frontiers: 'Frontiers', develop: 'Blacksmith · Develop', village: 'Village', system: 'System' };
    $('#panel-title').textContent = titles[this.panel];
    const html = this['panel_' + this.panel]();
    const body = $('#panel-body');
    if (this.setBody(body, html, 'panel')) this.hydrate(body);
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
    root.querySelectorAll('[data-mon]').forEach(el => { const c = iconCanvas('m_' + el.dataset.mon, 0, 0, 16, 16, +el.dataset.scale || 2); el.replaceWith(c); });
  }

  panel_build() {
    const s = this.s;
    let h = `<div class="tabs">${CATS.map(([k, n]) => `<button class="btn sm ${this.buildCat === k ? 'on' : ''}" data-act="cat" data-k="${k}">${n}</button>`).join('')}
      <button class="btn sm" data-act="tool" data-k="bulldoze">Remove</button></div><div class="grid">`;
    const entries = this.buildCat === 'decor' ? Object.entries(DECOR) : Object.entries(FAC).filter(([k, d]) => d.cat === this.buildCat && k !== 'guild');
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
    let h = `<div class="muted">${advs.filter(a => a.resident).length} residents · ${advs.filter(a => !a.resident).length} visitors · ${s.monsters.length} village monsters</div><div class="grid" style="margin-top:6px">`;
    for (const a of advs) {
      const hpR = a.hp / maxHp(a, s);
      h += `<div class="card" data-act="selAdv" data-id="${a.id}"><div class="thumb"><i data-face="f_${a.spr}" data-scale="1"></i></div><div class="meta">
        <div class="name">${esc(a.name)}</div><div class="sub">${JOBS[a.job].name} Lv${a.lv} ${a.resident ? '<span class="tag res">Resident</span>' : '<span class="tag vis">Visitor</span>'}${a.ko ? '<span class="tag ko">KO</span>' : ''}${a.wantsHome ? '<span class="tag gold">Wants home</span>' : ''}</div>
        <div class="bar hp" title="HP"><i style="width:${hpR * 100}%"></i></div><div class="bar sat" title="Satisfaction" style="margin-top:2px"><i style="width:${Math.min(100, a.sat / (a.resident ? 3 : 0.6))}%"></i></div>
        <div class="sub">${this.taskLabel(a)}</div></div></div>`;
    }
    for (const m of s.monsters) {
      const owner = s.advs.find(a => a.partner === m.id);
      h += `<div class="card"><div class="thumb"><i data-mon="${MONSTERS[m.type].spr}" data-scale="3"></i></div><div class="meta"><div class="name">${esc(m.name)}</div>
        <div class="sub">Bond ${m.bond}/100 ${m.bond >= 50 ? '· Mount' : ''}</div><div class="sub">${owner ? 'Partner of ' + esc(owner.name) : 'Free in the Stable'}</div></div></div>`;
    }
    return h + '</div>';
  }
  taskLabel(a) {
    if (a.ko) return 'Knocked out'; if (a.inside) { const b = this.s.buildings.find(o => o.id === a.inside.b); return b ? `At the ${defOf(b.type).name}` : 'Inside'; }
    const t = a.task; if (!t) return 'Thinking…';
    if (a.dungeon) return 'Exploring the Old Cave'; return { visit: 'Heading into town', hunt: 'Hunting monsters', return: 'Returning to town', stroll: 'Strolling', camp: 'Napping outside', leave: 'Leaving the village', quest: 'On a quest!' }[t.type] || t.type;
  }
  panel_quests() {
    const s = this.s; let h = '';
    const captured = FRONTIERS.filter(f => s.frontier?.completed?.[f.id]).length;
    h += `<div class="row spread"><span class="muted">Run as many quests as you have available pawns for. Tap a quest to adjust its party, or instantly send up to 4 random capable adventurers.</span><button class="btn" data-act="open" data-k="frontiers">Frontiers ${captured}/${FRONTIERS.length}</button></div>`;
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
        <button class="btn sm" data-act="instantQuest" data-id="${q.id}" ${!ready || s.gold < q.fee ? 'disabled' : ''}>Instant Depart (${q.fee}G)</button>${!ready ? '<div class="sub">No capable adventurers available</div>' : s.gold < q.fee ? '<div class="sub">Not enough gold</div>' : ''}</div></div>`;
      if (this.questPick === q.id) {
        const cands = this.sim.questCandidates().sort((a, b) => b.lv - a.lv);
        this.party = (this.party || []).filter(id => cands.some(a => a.id === id));
        const extra = Math.max(0, this.party.length - 4), cost = this.sim.questCost(q, this.party.length);
        h += `<div class="row" style="margin:8px 0"><button class="btn" data-act="startQuest" data-id="${q.id}" ${!this.party.length || s.gold < cost ? 'disabled' : ''}>Depart (${cost}G)</button><span class="muted">${this.party.length}/8 selected · ${q.fee}G entry + ${extra * this.sim.questExtraFee(q)}G extras</span></div>`;
        h += `<div class="muted" style="margin:4px 0">Up to 4 random capable adventurers are selected. Tap to adjust; slots 5–8 cost ${this.sim.questExtraFee(q)}G each. Pawns on other quests are unavailable.</div><div class="grid">`;
        for (const a of cands) h += `<div class="card ${this.party.includes(a.id) ? 'sel' : ''}" data-act="togParty" data-id="${a.id}"><div class="thumb"><i data-char="${a.spr}"></i></div><div class="meta"><div class="name">${esc(a.name)}</div><div class="sub">${JOBS[a.job].name} Lv${a.lv}${a.resident ? '' : ' · visitor'}${a.lv < rec ? ' · below suggested level' : ''}</div></div></div>`;
        h += `</div>${cands.length ? '' : '<p class="muted">No adventurers are available right now.</p>'}`;
      }
    }
    return h;
  }
  panel_frontiers() {
    const s = this.s, completed = s.frontier?.completed || {};
    let h = `<div class="row spread"><span class="muted">Conquer each den once to claim its land, permanent village bonus and unique legendary relic.</span><button class="btn sm" data-act="open" data-k="quests">Quest board</button></div>
      <p class="muted frontier-note">Dormant sites have no boss waiting on the map. Choose a party and depart to begin the fight. A failed conquest can be retried; a captured site never repeats.</p>`;
    const picked = FRONTIERS.find(f => f.id === this.frontierPick);
    if (picked) h += this.frontierDetail(picked);
    h += '<div class="section">Territories</div><div class="grid frontier-grid">';
    for (const f of FRONTIERS) {
      const active = s.activeQuests.find(q => q.frontier === f.id), captured = !!completed[f.id], block = this.sim.frontierBlock(f.id);
      const req = f.requires.length ? f.requires.map(id => FRONTIERS.find(x => x.id === id)?.name || id).join(', ') : 'None';
      const status = captured ? '<span class="tag res">Captured</span>' : active ? '<span class="tag gold">Underway</span>'
        : block ? `<span class="tag ko">${esc(block)}</span>` : '<span class="tag vis">Ready</span>';
      const relic = ITEMS[f.relic], q = this.sim.frontierQuest(f.id);
      h += `<div class="card frontier-card ${this.frontierPick === f.id ? 'sel' : ''}" data-act="pickFrontier" data-id="${f.id}"><div class="thumb"><i data-face="bf_${f.boss}"></i></div><div class="meta">
        <div class="name">${esc(f.name)}</div><div>${status}</div><div class="sub">${esc(f.bossName)} · Suggested Lv${f.rec}+ · (${f.x}, ${f.y})</div>
        <div class="sub">Fee ${q.fee}G · Victory ${q.reward.gold}G, ${q.reward.tp}TP, +${q.reward.pop} pop</div>
        <div class="sub">Land bonus: ${esc(f.benefit)}</div><div class="sub">Legendary: ${esc(relic.name)} · ${esc(statLine(relic))}</div><div class="sub">Requires: ${esc(req)}</div>
        <button class="btn sm" data-act="mapFrontier" data-id="${f.id}">${active ? 'Watch' : 'Show on map'}</button></div></div>`;
    }
    h += '</div>';
    h += this.frontierRelics();
    return h;
  }
  frontierDetail(f) {
    const s = this.s, q = this.sim.frontierQuest(f.id), active = s.activeQuests.find(x => x.frontier === f.id), captured = !!s.frontier?.completed?.[f.id];
    let h = `<div class="section">${esc(f.name)}</div><div class="row spread"><span class="muted">${esc(f.bossName)} · ${esc(f.benefit)} · ${esc(ITEMS[f.relic].name)}</span><button class="btn sm" data-act="mapFrontier" data-id="${f.id}">${active ? 'Watch fight' : 'Show on map'}</button></div>`;
    if (active) {
      const alive = s.mons.filter(m => m.quest === active.id && m.hp > 0).length;
      h += `<p class="muted">Conquest underway · ${alive} foe${alive === 1 ? '' : 's'} remain.</p><div class="grid">`;
      for (const id of active.members) { const a = s.advs.find(x => x.id === id); if (!a) continue;
        h += `<div class="card" data-act="selAdv" data-id="${a.id}"><div class="thumb"><i data-face="f_${a.spr}"></i></div><div class="meta"><div class="name">${esc(a.name)}</div><div class="bar hp"><i style="width:${a.hp / maxHp(a, s) * 100}%"></i></div><div class="sub">${a.ko ? 'KO' : JOBS[a.job].name + ' Lv' + a.lv}</div></div></div>`; }
      return h + '</div>';
    }
    if (captured) return h + `<p class="check">Captured permanently. This land bonus is active and its legendary reward cannot be earned again.</p>`;
    const block = this.sim.frontierBlock(f.id);
    if (block) return h + `<p class="cross">${esc(block)}</p>`;
    if (!q) return h + '<p class="cross">This frontier is unavailable.</p>';
    const cands = this.sim.questCandidates().sort((a, b) => b.lv - a.lv);
    this.frontierParty = (this.frontierParty || []).filter(id => cands.some(a => a.id === id));
    const party = this.frontierParty;
    const extra = Math.max(0, party.length - 4), cost = this.sim.questCost(q, party.length), ready = this.sim.questReady(q).length;
    h += `<div class="row" style="margin:8px 0"><button class="btn" data-act="startFrontier" data-id="${q.id}" ${!party.length || s.gold < cost ? 'disabled' : ''}>Depart (${cost}G)</button>
      <button class="btn sm" data-act="instantFrontier" data-id="${q.id}" ${!ready || s.gold < q.fee ? 'disabled' : ''}>Instant Depart (${q.fee}G)</button><span class="muted">${party.length}/8 selected · ${q.fee}G entry + ${extra * this.sim.questExtraFee(q)}G extras</span></div>
      <div class="muted" style="margin:4px 0">Up to 4 random capable adventurers are selected when you choose the site. Tap to adjust; slots 5–8 cost ${this.sim.questExtraFee(q)}G each. The boss appears only after departure.</div><div class="grid">`;
    const rec = this.sim.questLevel(q);
    for (const a of cands) h += `<div class="card ${party.includes(a.id) ? 'sel' : ''}" data-act="togFrontierParty" data-id="${a.id}"><div class="thumb"><i data-char="${a.spr}"></i></div><div class="meta"><div class="name">${esc(a.name)}</div><div class="sub">${JOBS[a.job].name} Lv${a.lv}${a.resident ? '' : ' · visitor'}${a.lv < rec ? ' · below suggested level' : ''}</div></div></div>`;
    return h + `</div>${cands.length ? '' : '<p class="muted">No adventurers are available right now.</p>'}`;
  }
  frontierRelics() {
    const s = this.s, relics = s.frontier?.relics || {}, earned = FRONTIERS.filter(f => Object.prototype.hasOwnProperty.call(relics, f.relic));
    let h = '<div class="section">Legendary relics</div>';
    if (!earned.length) return h + '<p class="muted">Captured frontiers add their one-of-a-kind relic here.</p>';
    const itemId = earned.some(f => f.relic === this.relicPick) ? this.relicPick : null;
    if (itemId) {
      const ownerId = relics[itemId], owner = s.advs.find(a => a.id === ownerId), ownerAway = owner && (owner.ko || this.sim.questForPawn(owner.id));
      h += `<div class="relic-transfer"><div class="row"><button class="btn sm" data-act="equipRelic" data-id="${itemId}" data-pawn="none" ${ownerId == null || ownerAway ? 'disabled' : ''}>Return to vault</button><span class="muted">Choose a resident to equip or transfer this single relic.${ownerAway ? ' Its owner must return and recover first.' : ''}</span></div><div class="grid" style="margin-top:6px">`;
      for (const a of s.advs.filter(a => a.resident).sort((a, b) => b.lv - a.lv)) {
        const unavailable = ownerAway || a.ko || a.task?.type === 'quest' || !!this.sim.questForPawn(a.id), current = ownerId === a.id;
        h += `<div class="card ${current ? 'sel' : ''} ${unavailable ? 'locked' : ''}" ${unavailable ? '' : `data-act="equipRelic" data-id="${itemId}" data-pawn="${a.id}"`}><div class="thumb"><i data-face="f_${a.spr}"></i></div><div class="meta"><div class="name">${esc(a.name)}</div><div class="sub">${JOBS[a.job].name} Lv${a.lv}${current ? ' · equipped' : unavailable ? a.ko ? ' · KO' : ' · away on quest' : ''}</div></div></div>`;
      }
      h += '</div></div>';
    }
    h += '<div class="grid" style="margin-top:6px">';
    for (const f of earned) {
      const it = ITEMS[f.relic], owner = s.advs.find(a => a.id === relics[f.relic]);
      h += `<div class="card ${this.relicPick === f.relic ? 'sel' : ''}" data-act="pickRelic" data-id="${f.relic}"><div class="thumb"><i data-item="${f.relic}" data-scale="3"></i></div><div class="meta"><div class="name">${esc(it.name)}</div><div class="sub">${esc(statLine(it))}</div><div class="sub">${owner ? 'Equipped by ' + esc(owner.name) : 'In the guild vault'}</div></div></div>`;
    }
    return h + '</div>';
  }
  panel_develop() {
    const s = this.s, smith = s.buildings.some(b => b.type === 'smith'), tab = this.devTab || 'weapon';
    let h = `<div class="row">${Object.entries(MATS).map(([k, m]) => `<span class="chip"><i data-icon="i_${m.icon}" data-scale="1"></i>${m.name} ${s.mats[k] || 0}</span>`).join('')}</div>`;
    if (!smith) h += `<p class="muted">Build a <b>Blacksmith</b> to develop new gear. Monsters drop materials; treasure chests can also reveal new gear.</p>`;
    const tabs = [['weapon', 'Weapons'], ['armor', 'Armor'], ['acc', 'Accessories'], ['item', 'Items']];
    h += `<div class="tabs" style="margin-top:6px">${tabs.map(([k, n]) => `<button class="btn sm ${tab === k ? 'on' : ''}" data-act="devTab" data-k="${k}">${n} ${Object.keys(ITEMS).filter(id => !ITEMS[id].legendary && ITEMS[id].slot === k && s.unlocked[id]).length}/${Object.values(ITEMS).filter(i => !i.legendary && i.slot === k).length}</button>`).join('')}</div><div class="grid">`;
    const list = Object.entries(ITEMS).filter(([, it]) => !it.legendary && it.slot === tab).sort((p, q) => p[1].price - q[1].price);
    for (const [id, it] of list) {
      const have = s.unlocked[id], dev = it.dev;
      const st = statLine(it);
      const users = it.slot === 'weapon' ? Object.values(JOBS).filter(j => j.wt.includes(it.type) && j.tier < 4).map(j => j.name) : [];
      const costs = dev ? Object.entries(dev).map(([k, n]) => `<span class="${(s.mats[k] || 0) >= n ? '' : 'cross'}">${MATS[k].name}×${n}</span>`).join(' ') : 'Starter';
      h += `<div class="card"><div class="thumb"><i data-item="${id}" data-scale="3"></i></div><div class="meta"><div class="name">${it.name}</div>
        <div class="sub">${st} · ${it.price}G${it.type ? ` · ${it.type}` : ''}</div>${users.length ? `<div class="sub" title="${users.join(', ')}">${esc(users.slice(0, 4).join(', '))}${users.length > 4 ? '…' : ''}</div>` : ''}
        ${have ? '<div class="sub check">In stock</div>' : `<div class="sub">${costs} · ${Math.round(it.price * 1.5)}G</div><button class="btn sm" data-act="develop" data-id="${id}" ${smith ? '' : 'disabled'}>Develop</button>`}</div></div>`;
    }
    return h + '</div>';
  }
  panel_jobs() {
    const s = this.s, a = s.advs.find(o => o.id === this.jobFor);
    let h = a ? `<div class="row"><i data-face="f_${a.spr}"></i><div><b>${esc(a.name)}</b> · ${JOBS[a.job].name} Job Lv${a.jobLv[a.job] || 1} · <span class="muted">Town Points ${s.tp}</span>
      <div class="muted">Master a job (Job Lv${MASTERY}) to change jobs and keep its perk forever. Perks stack.</div></div></div>` : `<p class="muted">Every class, its mastery perk and what it takes to unlock it.</p>`;
    this.wideGrid = true;
    const TN = ['Starter', 'Tier 1', 'Tier 2 · advanced', 'Tier 3 · elite', 'Tier 4 · legendary'];
    for (let t = 0; t <= 4; t++) {
      h += `<div class="section">${TN[t]} <span class="muted">${TIER_TP[t] ? TIER_TP[t] + ' TP' : ''}</span></div><div class="grid">`;
      for (const [id, j] of Object.entries(JOBS)) {
        if (j.tier !== t) continue;
        const P = PERKS[j.perk], lv = a ? a.jobLv[id] || 0 : 0, mastered = lv >= MASTERY, cur = a && a.job === id;
        const err = a ? this.sim.canChangeJob(a, id) : null;
        const req = (j.req || []).map(r => `${a && (a.jobLv[r] || 0) >= MASTERY ? '✔' : '·'} ${JOBS[r].name}`).join(' ');
        const status = !a ? '' : cur ? `<span class="tag res">Current · Lv${lv}</span>` : mastered ? `<span class="tag gold">★ Mastered · Lv${lv}</span>` : lv ? `<span class="tag">Lv${lv}</span>` : '';
        h += `<div class="card ${a && err && !cur ? 'locked' : ''} ${cur ? 'sel' : ''}" ${a && !err ? `data-act="setJob" data-id="${a.id}" data-job="${id}"` : ''}>
          <div class="thumb"><i data-char="${j.sprites[0]}" data-scale="3"></i></div><div class="meta"><div class="name">${j.name}</div>${status ? `<div>${status}</div>` : ''}
          <div class="sub"><b>${P.name}</b>: ${esc(P.desc)}</div>
          <div class="sub">${esc(j.desc)} · ${j.wt.length > 6 ? 'any weapon' : j.wt.join(', ')}</div>
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
      if (H.id === 'bandits') st += ` · ${alive(d.mobs)} bandits left`;
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
      <p class="muted">Share a world code with a friend: the same code gives the same land, monsters, cave and charter choices.</p>
      <p class="muted">The game autosaves every in-game week. Controls: drag or WASD/arrows to pan · wheel/pinch or +/- to zoom · tap adventurers or buildings to inspect · Space pauses · 1/2/3 set speed.</p>
      <div class="section">Credits</div>
      <p class="muted">All art, music and sound: <b>Ninja Adventure</b> asset pack by Pixel-boy &amp; AAA (CC0) — pixel-boy.itch.io. Armor and accessory icons: <b>16x16 RPG Item Pack</b> by Alex's Assets (CC0). Fountain, statue and castle: <b>Medieval Fantasy</b> by Pixel-boy (CC0). Game design inspired by the adventurer-village genre (Kairosoft's Dungeon Village); no Kairosoft assets are used. Code: original.</p>`;
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
      <div class="muted">${this.taskLabel(a)}</div>
      <div class="row" style="margin:6px 0">${['weapon', 'armor', 'acc'].map(sl => { const it = a.eq[sl] && ITEMS[a.eq[sl]]; return `<span class="chip">${it ? `<i data-item="${a.eq[sl]}" data-scale="1"></i>${it.name}` : { weapon: 'No weapon', armor: 'No armor', acc: 'No accessory' }[sl]}</span>`; }).join('')}</div>
      ${a.perks.length ? `<div class="muted">Mastered perks:</div><div class="row">${a.perks.map(p => `<span class="tag gold" title="${esc(PERKS[p].desc)}">★ ${PERKS[p].name}</span>`).join('')}</div>` : ''}
      <div class="muted">Job Lv${a.jobLv[a.job] || 1}/99 · ${(a.jobLv[a.job] || 1) >= MASTERY ? 'mastered' : `${MASTERY - (a.jobLv[a.job] || 1)} to mastery`} · Lv${a.lv}/99</div>`;
    const pet = a.partner && s.monsters.find(m => m.id === a.partner);
    h += `<div class="muted">Partner: ${pet ? `${esc(pet.name)} (bond ${pet.bond}${pet.bond >= 50 ? ', riding' : ''})` : 'none'}</div>`;
    h += `<div class="row" style="margin-top:6px"><button class="btn sm" data-act="gift" data-id="${a.id}" ${s.gold < 50 ? 'disabled' : ''}>Gift 50G</button>
      ${a.resident ? `<button class="btn sm" data-act="jobs" data-id="${a.id}">Change job</button>` : ''}
      ${a.resident && s.monsters.length ? `<button class="btn sm" data-act="partners">Partner</button>` : ''}
      <button class="btn sm ${this.game.follow === a.id ? 'on' : ''}" data-act="follow" data-id="${a.id}">Follow</button></div>`;
    if (this.partnerPick && a.resident) {
      h += `<div class="section">Choose a partner</div><div class="grid" style="grid-template-columns:1fr 1fr">`;
      h += `<div class="card" data-act="setPartner" data-id="${a.id}" data-m="0"><div class="meta"><div class="name">None</div></div></div>`;
      for (const m of s.monsters) { const o = s.advs.find(x => x.partner === m.id && x !== a);
        h += `<div class="card ${o ? 'locked' : ''}" ${o ? '' : `data-act="setPartner" data-id="${a.id}" data-m="${m.id}"`}><div class="thumb"><i data-mon="${MONSTERS[m.type].spr}"></i></div><div class="meta"><div class="name">${esc(m.name)}</div><div class="sub">${o ? 'with ' + esc(o.name) : 'bond ' + m.bond}</div></div></div>`; }
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
      h += `<table class="t"><tr><td>Appeal</td><td>${this.sim.appeal(b)}</td></tr>${F.price ? `<tr><td>Price</td><td>${this.sim.price(b)}G</td></tr>` : ''}
        ${F.kind === 'home' ? `<tr><td>Residents</td><td>${s.advs.filter(a => a.home === b.id).map(a => esc(a.name)).join(', ') || 'Vacant'} (${this.sim.capOf(b)} max)</td></tr>` : ''}
        <tr><td>Visits</td><td>${b.visits}</td></tr><tr><td>Total sales</td><td>${b.sales}G</td></tr><tr><td>Inside now</td><td>${occ.map(a => esc(a.name)).join(', ') || '—'}</td></tr></table>`;
      if (F.kind === 'shop') h += `<div class="muted">Stock: ${Object.keys(s.unlocked).filter(id => ITEMS[id] && !ITEMS[id].legendary && ITEMS[id].slot === F.slot).map(id => ITEMS[id].name).join(', ') || 'nothing yet'}</div>`;
      h += `<div class="row" style="margin-top:6px">${b.lv < 5 ? `<button class="btn sm" data-act="upgrade" data-id="${b.id}" ${s.gold < this.sim.upgradeCost(b) ? 'disabled' : ''}>Upgrade ${this.sim.upgradeCost(b)}G</button>` : '<span class="muted">Max level</span>'}
        ${b.type !== 'guild' ? `<button class="btn sm" data-act="demolish" data-id="${b.id}">Remove (+${this.sim.refund(b)}G)</button>` : `<button class="btn sm" data-act="open" data-k="quests">Quests</button><button class="btn sm" data-act="classes">Classes</button>`}</div>`;
    } else h += `<div class="row"><button class="btn sm" data-act="demolish" data-id="${b.id}">Remove (+${this.sim.refund(b)}G)</button></div>`;
    return h;
  }
  inspMon(m) {
    if (!m || m.hp <= 0) return '';
    const M = m.boss ? BOSSES[m.boss] : MONSTERS[m.type];
    const frontier = m.frontier && FRONTIERS.find(f => f.id === m.frontier);
    const face = m.boss ? `bf_${m.boss}` : M.human ? `f_${M.spr}` : `mf_${M.spr}`;
    const tag = frontier ? `<span class="tag gold">Guardian of ${esc(frontier.name)}</span>` : m.golden ? '<span class="tag gold">Golden — catch it for a fortune!</span>' : m.raid ? `<span class="tag ko">${m.raid === 'bandits' ? 'Bandit' : 'Stampede'} raider</span>`
      : m.elite ? '<span class="tag gold">Elite — ×2.5 EXP & gold, ×2 drops</span>' : M.human ? '<span class="tag ko">Outlaw</span>' : '';
    const name = frontier ? frontier.bossName : m.golden ? 'Golden Slime' : (m.elite ? 'Elite ' : '') + M.name;
    return `<div class="head"><i data-face="${face}" class="face" ${m.golden ? 'data-gold="1"' : m.elite ? 'data-tint="150"' : ''}></i><div><h3>${esc(name)}</h3><div class="muted">Lv${m.lv}${m.quest ? ' · Quest target' : ''}</div>${tag}</div></div>
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
  deselect() { this.game.rnd.selected = null; this.game.rnd.frontierFocus = null; this.partnerPick = false; this.game.follow = null; $('#inspector').classList.add('hidden'); this.lastHtml.insp = null; }
  select(sel) {
    this.game.rnd.selected = sel; this.game.rnd.frontierFocus = null; this.partnerPick = false; this.lastHtml.insp = null; this.renderInspector(); this.game.audio.sfx('click');
  }
  showFrontier(id) {
    const f = FRONTIERS.find(x => x.id === id); if (!f) return;
    if (this.panel !== 'frontiers') this.open('frontiers');
    this.game.rnd.frontierFocus = id; this.frontierPick = id; this.relicPick = null;
    const q = this.sim.frontierQuest(id), blocked = this.sim.frontierBlock(id);
    this.frontierParty = q && !blocked ? this.sim.autoQuestParty(q.id) : [];
    this.lastHtml.panel = null; this.renderPanel(); $('#panel-body').scrollTop = 0;
  }

  // ---------- build mode ----------
  enterBuild(type) { this.buildMode = type; this.close(); this.deselect(); $('#view').classList.add('building'); this.renderBuildbar(); $('#buildbar').classList.remove('hidden'); }
  exitBuild() { this.buildMode = null; this.game.rnd.ghost = null; $('#view').classList.remove('building'); $('#buildbar').classList.add('hidden'); }
  renderBuildbar() {
    const t = this.buildMode; if (!t) return;
    const label = t === 'bulldoze' ? 'Remove: tap a road, decoration or building' : `${defOf(t).name} · ${this.sim.cost(t)}G — ${defOf(t).road ? 'drag to paint roads' : 'tap to place'}`;
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
      case 'deselect': this.deselect(); break;
      case 'gift': err(sim.gift(s.advs.find(o => o.id === +d.id), 50)); break;
      case 'jobs': this.jobFor = +d.id; this.open('jobs'); break;
      case 'devTab': this.devTab = d.k; this.renderPanel(); audio.sfx('click'); break;
      case 'partners': this.partnerPick = !this.partnerPick; this.lastHtml.insp = null; this.renderInspector(); break;
      case 'setJob': err(sim.changeJob(s.advs.find(o => o.id === +d.id), d.job)); this.lastHtml.insp = null; this.renderInspector(); if (this.panel) this.renderPanel(); break;
      case 'setPartner': { const adv = s.advs.find(o => o.id === +d.id); adv.partner = +d.m || null; this.partnerPick = false; audio.sfx('accept'); this.lastHtml.insp = null; this.renderInspector(); break; }
      case 'follow': this.game.follow = this.game.follow === +d.id ? null : +d.id; this.lastHtml.insp = null; this.renderInspector(); break;
      case 'upgrade': err(sim.upgrade(s.buildings.find(b => b.id === +d.id))); this.lastHtml.insp = null; this.renderInspector(); break;
      case 'demolish': { const b = s.buildings.find(o => o.id === +d.id); if (b) this.ask(`Remove the ${defOf(b.type).name}? You get back ${sim.refund(b)}G.`, 'Remove', () => { err(sim.demolish(b)); this.deselect(); }); break; }
      case 'open': this.open(d.k); break;
      case 'classes': this.jobFor = null; this.open('jobs'); break;
      case 'pickFrontier': this.showFrontier(d.id); audio.sfx('click'); break;
      case 'mapFrontier': { const f = FRONTIERS.find(x => x.id === d.id); if (f) { this.game.rnd.frontierFocus = f.id; this.close(); this.game.centerOn(f.x, f.y); } break; }
      case 'togFrontierParty': { const id = +d.id; if (this.frontierParty.includes(id)) this.frontierParty = this.frontierParty.filter(x => x !== id); else if (this.frontierParty.length < 8 && sim.questCandidates().some(x => x.id === id)) this.frontierParty.push(id); else this.toast('A party can have at most 8 available adventurers'); this.renderPanel(); audio.sfx('click'); break; }
      case 'startFrontier': if (err(sim.startQuest(d.id, this.frontierParty || []))) { this.frontierParty = []; audio.sfx('quest'); } this.renderPanel(); break;
      case 'instantFrontier': if (err(sim.instantQuest(d.id))) { this.frontierParty = []; audio.sfx('quest'); } this.renderPanel(); break;
      case 'pickRelic': this.relicPick = this.relicPick === d.id ? null : d.id; this.renderPanel(); audio.sfx('click'); break;
      case 'equipRelic': err(sim.equipRelic(d.id, d.pawn === 'none' ? null : +d.pawn)); this.renderPanel(); break;
      case 'pickQuest': this.questPick = this.questPick === +d.id ? null : +d.id; this.party = this.questPick ? sim.autoQuestParty(this.questPick) : []; this.renderPanel(); audio.sfx('click'); break;
      case 'togParty': { const id = +d.id; if (this.party.includes(id)) this.party = this.party.filter(x => x !== id); else if (this.party.length < 8 && sim.questCandidates().some(a => a.id === id)) this.party.push(id); else this.toast('A party can have at most 8 available adventurers'); this.renderPanel(); audio.sfx('click'); break; }
      case 'startQuest': if (err(sim.startQuest(+d.id, this.party || []))) { this.questPick = null; this.party = null; this.game.audio.sfx('quest'); } this.renderPanel(); break;
      case 'instantQuest': if (err(sim.instantQuest(+d.id))) { this.questPick = null; this.party = null; audio.sfx('quest'); } this.renderPanel(); break;
      case 'watchQuest': { const id = d.id.startsWith('frontier:') ? d.id : +d.id, q = s.activeQuests.find(q => q.id === id); if (q) { this.close(); this.game.centerOn(q.spot[0], q.spot[1]); } break; }
      case 'develop': err(sim.develop(d.id)); this.renderPanel(); break;
      case 'event': err(sim.runEvent(d.id)); this.renderPanel(); break;
      case 'buyMerchant': err(sim.buyMerchant(d.id)); if (this.panel) this.renderPanel(); this.lastHtml.insp = null; this.renderInspector(); break;
      case 'charter': if (err(sim.chooseCharter(d.id)) && this.charterDone) this.charterDone(); break;
      case 'reroll': this.game.replaceState(newGame(sim.R.int(1, 0x7fffffff))); save(this.s); this.charterRender && this.charterRender(); audio.sfx('click'); break;
      case 'seedGame': { const code = ($('#seed-in') || {}).value, seed = parseSeed(code);
        if (seed === null) { this.toast('A world code is 1–6 letters or digits'); audio.sfx('cancel'); break; }
        this.ask(`Found a new village in world ${seedCode(seed)}? Your current save will be erased.`, 'Found it', () => { this.game.noSave = true; wipeSave(); location.href = location.pathname + '?seed=' + seedCode(seed); }); break; }
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
      case 'newgame': this.ask('Start a new village? Your current save will be erased.', 'Start over', () => { this.game.noSave = true; wipeSave(); location.reload(); }); break;
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
