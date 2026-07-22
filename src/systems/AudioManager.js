// AudioManager：用 WebAudio 合成音效与背景音乐，零素材依赖、可静音调音量。
// 若浏览器不支持 AudioContext，则全部静默降级。
export default class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.volume = 0.6;
    this.muted = false;
    this._musicTimer = null;
    this._step = 0;
    this._enabled = true;
  }

  _ensure() {
    if (this.ctx || !this._enabled) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        this._enabled = false;
        return;
      }
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.9;
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.35;
      this.musicGain.connect(this.master);
    } catch {
      this._enabled = false;
    }
  }

  // 需在用户手势后调用以解锁音频
  unlock() {
    this._ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.volume;
  }

  _blip({ freq = 440, type = 'square', dur = 0.12, gain = 0.3, slideTo = null, dest = null }) {
    this._ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest || this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _noise({ dur = 0.25, gain = 0.4 }) {
    this._ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 1200;
    src.connect(flt);
    flt.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur);
  }

  shoot() {
    this._blip({ freq: 880, type: 'square', dur: 0.08, gain: 0.12, slideTo: 500 });
  }

  enemyShoot() {
    this._blip({ freq: 300, type: 'sawtooth', dur: 0.12, gain: 0.1, slideTo: 180 });
  }

  hit() {
    this._blip({ freq: 200, type: 'square', dur: 0.08, gain: 0.18, slideTo: 120 });
  }

  explosion() {
    this._noise({ dur: 0.3, gain: 0.35 });
  }

  bossExplosion() {
    this._noise({ dur: 0.7, gain: 0.5 });
    this._blip({ freq: 160, type: 'sawtooth', dur: 0.6, gain: 0.25, slideTo: 60 });
  }

  pickup() {
    this._blip({ freq: 660, type: 'triangle', dur: 0.1, gain: 0.2 });
    setTimeout(() => this._blip({ freq: 990, type: 'triangle', dur: 0.12, gain: 0.2 }), 90);
  }

  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => this._blip({ freq: f, type: 'square', dur: 0.14, gain: 0.18 }), i * 80)
    );
  }

  bossWarn() {
    [0, 300, 600].forEach((d) =>
      setTimeout(() => this._blip({ freq: 220, type: 'sawtooth', dur: 0.25, gain: 0.25 }), d)
    );
  }

  gameOver() {
    [440, 330, 262, 196].forEach((f, i) =>
      setTimeout(() => this._blip({ freq: f, type: 'triangle', dur: 0.25, gain: 0.2 }), i * 160)
    );
  }

  // 极简程序化 BGM：循环低音 + 琶音
  startMusic() {
    this._ensure();
    if (!this.ctx || this._musicTimer) return;
    const scale = [130.81, 155.56, 196.0, 233.08, 261.63, 311.13];
    this._step = 0;
    this._musicTimer = setInterval(() => {
      if (!this.ctx) return;
      const s = this._step % 8;
      const bass = scale[0] / 2;
      if (s % 2 === 0) this._blip({ freq: bass, type: 'triangle', dur: 0.35, gain: 0.18, dest: this.musicGain });
      const note = scale[(this._step * 3) % scale.length];
      this._blip({ freq: note, type: 'sine', dur: 0.22, gain: 0.1, dest: this.musicGain });
      this._step++;
    }, 300);
  }

  stopMusic() {
    if (this._musicTimer) {
      clearInterval(this._musicTimer);
      this._musicTimer = null;
    }
  }
}
