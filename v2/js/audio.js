// Music (HTMLAudio, looped + crossfaded) and SFX (WebAudio buffers). Ninja Adventure audio, CC0.
const SFX = {
  coin: 'Coin', gold: 'Gold1', hit: 'Hit', crit: 'Hit4', kill: 'Kill', levelup: 'PowerUp1', build: 'Jump', fanfare: 'Success3',
  quest: 'Bonus', heal: 'Magic1', ko: 'Hit2', fail: 'GameOver', click: 'Menu1', open: 'Menu4', accept: 'Accept', cancel: 'Cancel',
  secret: 'Secret1', alert: 'Alert', sword: 'Sword', fire: 'Fireball',
};
export class Audio {
  constructor() {
    this.on = true; this.musicVol = 0.45; this.sfxVol = 0.6;
    this.ctx = null; this.buf = {}; this.track = null; this.el = null; this.last = {};
    try { const p = JSON.parse(localStorage.getItem('wayfarerV2_audio') || '{}'); if (p.on === false) this.on = false; } catch {}
  }
  async unlock() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.gain = this.ctx.createGain(); this.gain.gain.value = this.sfxVol; this.gain.connect(this.ctx.destination); }
    catch { return; }
    await Promise.all(Object.entries(SFX).map(async ([k, f]) => {
      try { const r = await fetch(`assets/audio/sfx/${f}.mp3`); this.buf[k] = await this.ctx.decodeAudioData(await r.arrayBuffer()); } catch {}
    }));
  }
  sfx(k, vol = 1) {
    if (!this.on || !this.ctx || !this.buf[k]) return;
    const now = this.ctx.currentTime; if (this.last[k] && now - this.last[k] < 0.06) return; this.last[k] = now;   // rate limit
    const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
    src.buffer = this.buf[k]; g.gain.value = vol; src.connect(g); g.connect(this.gain);
    src.playbackRate.value = 0.94 + Math.random() * 0.12; src.start();
  }
  music(name) {
    if (this.track === name) return; this.track = name;
    const old = this.el;
    if (old) this.fade(old, 0, 800, () => old.pause());
    if (!name) { this.el = null; return; }
    const el = new window.Audio(`assets/audio/music/${name}.mp3`); el.loop = true; el.volume = 0;
    this.el = el;
    if (this.on) el.play().then(() => this.fade(el, this.musicVol, 1200)).catch(() => {});
  }
  fade(el, to, ms, done) {
    const from = el.volume, t0 = performance.now();
    const step = () => { const p = Math.min(1, (performance.now() - t0) / ms); el.volume = from + (to - from) * p; if (p < 1) requestAnimationFrame(step); else done && done(); };
    step();
  }
  toggle() {
    this.on = !this.on;
    try { localStorage.setItem('wayfarerV2_audio', JSON.stringify({ on: this.on })); } catch {}
    if (this.el) { if (this.on) { this.el.play().catch(() => {}); this.fade(this.el, this.musicVol, 500); } else this.el.pause(); }
    return this.on;
  }
}
