// UIScene：覆盖在 GameScene 之上的 HUD。直接读取 GameScene 状态刷新，离散事件用监听。
import Phaser from 'phaser';
import { SCENES, EV, DEPTH, GAME_WIDTH as W, GAME_HEIGHT as H } from '../config/gameConfig.js';
import { getTheme } from '../config/themes/index.js';
import { MAX_LEVEL } from '../config/balance.js';
import HealthBar from '../ui/HealthBar.js';
import Button from '../ui/Button.js';
import { getBestScore, getSettings, saveSettings } from '../storage/leaderboard.js';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super(SCENES.UI);
  }

  init(data) {
    this.themeKey = (data && data.themeKey) || 'cyber';
  }

  create() {
    this.theme = getTheme(this.themeKey);
    this.gs = this.scene.get(SCENES.GAME);
    this.audio = this.registry.get('audio');
    this.best = getBestScore();
    const accent = this.theme.ui.accentColor;
    const font = this.theme.ui.fontFamily;

    // 玩家血条
    this.hpBar = new HealthBar(this, {
      width: 150,
      height: 12,
      fillColor: 0x36e07a,
      showBorder: true,
      depth: DEPTH.HUD
    });
    this.hpLabel = this.add.text(16, 14, 'HP', { fontFamily: font, fontSize: '12px', color: '#cbd5f5' }).setDepth(DEPTH.HUD);
    this.hpText = this.add.text(172, 30, '', { fontFamily: font, fontSize: '12px', color: '#eaf6ff' }).setDepth(DEPTH.HUD);

    this.lvlText = this.add
      .text(16, 48, '', { fontFamily: font, fontSize: '14px', color: accent, fontStyle: 'bold' })
      .setDepth(DEPTH.HUD);
    this.shieldText = this.add
      .text(16, 68, '', { fontFamily: font, fontSize: '13px', color: '#49b8ff' })
      .setDepth(DEPTH.HUD);

    // 分数 / 连击
    this.scoreText = this.add
      .text(W / 2, 20, '0', { fontFamily: font, fontSize: '30px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.HUD);
    this.comboText = this.add
      .text(W / 2, 56, '', { fontFamily: font, fontSize: '16px', color: '#ffd23d', fontStyle: 'bold' })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.HUD);
    this.diffText = this.add
      .text(W - 12, 78, '', { fontFamily: font, fontSize: '12px', color: '#9fb0d0' })
      .setOrigin(1, 0)
      .setDepth(DEPTH.HUD);

    // 暂停按钮
    this.pauseBtn = new Button(this, W - 34, 26, 'II', {
      width: 40,
      height: 34,
      fontSize: 16,
      accent: this._hex(accent),
      onClick: () => this.gs.togglePause()
    });
    this.pauseBtn.setDepth(DEPTH.HUD);

    // Boss 血条（默认隐藏）
    this.bossBar = new HealthBar(this, {
      width: W - 40,
      height: 12,
      fillColor: 0xff4d6a,
      showBorder: true,
      depth: DEPTH.HUD
    });
    this.bossBar.setVisible(false);
    this.bossRatio = 1;
    this.bossVisible = false;
    this.bossLabel = this.add
      .text(W / 2, 96, '', { fontFamily: font, fontSize: '13px', color: '#ff6b8a', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(DEPTH.HUD)
      .setVisible(false);

    // 拾取提示
    this.toast = this.add
      .text(W / 2, H * 0.42, '', { fontFamily: font, fontSize: '24px', color: accent, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(DEPTH.HUD)
      .setAlpha(0);

    this._buildPausePanel();
    this._bindEvents();
  }

  _hex(cssColor) {
    return parseInt(cssColor.replace('#', '0x'));
  }

  _bindEvents() {
    this.gs.events.on(EV.BOSS_SPAWN, this.onBossSpawn, this);
    this.gs.events.on(EV.BOSS_HP, (r) => (this.bossRatio = r));
    this.gs.events.on(EV.BOSS_DEAD, this.onBossDead, this);
    this.gs.events.on(EV.PICKUP, this.onPickup, this);
    this.gs.events.on('pause', this.onPause, this);
  }

  onBossSpawn({ wave }) {
    this.bossVisible = true;
    this.bossRatio = 1;
    this.bossBar.setVisible(true);
    this.bossLabel.setText(`⚠ BOSS 第 ${wave} 波 ⚠`).setVisible(true);
    // 警示横幅
    const banner = this.add
      .text(W / 2, H / 2, 'WARNING\nBOSS 来袭', {
        fontFamily: this.theme.ui.fontFamily,
        fontSize: '34px',
        color: '#ff5a7a',
        fontStyle: 'bold',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.HUD);
    this.tweens.add({ targets: banner, alpha: 0, scale: 1.4, duration: 1400, onComplete: () => banner.destroy() });
  }

  onBossDead() {
    this.bossVisible = false;
    this.bossBar.setVisible(false);
    this.bossLabel.setVisible(false);
  }

  onPickup({ label }) {
    this.toast.setText(label).setAlpha(1).setScale(0.8);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, scale: 1.1, duration: 200, yoyo: false });
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 700, duration: 400 });
  }

  onPause(paused) {
    this.pausePanel.setVisible(paused);
  }

  _buildPausePanel() {
    const font = this.theme.ui.fontFamily;
    this.pausePanel = this.add.container(0, 0).setDepth(DEPTH.HUD + 10).setVisible(false);
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.62);
    dim.fillRect(0, 0, W, H);
    const panel = this.add.graphics();
    panel.fillStyle(this.theme.ui.panelColor, 0.96);
    panel.fillRoundedRect(W / 2 - 150, H / 2 - 180, 300, 360, 16);
    panel.lineStyle(2, this.theme.ui.panelStroke, 1);
    panel.strokeRoundedRect(W / 2 - 150, H / 2 - 180, 300, 360, 16);
    const title = this.add
      .text(W / 2, H / 2 - 140, '暂停', { fontFamily: font, fontSize: '30px', color: '#eaf6ff', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.pausePanel.add([dim, panel, title]);

    const resume = new Button(this, W / 2, H / 2 - 70, '继续', { width: 220, height: 48, accent: 0x36e07a, onClick: () => this.gs.togglePause() });
    const restart = new Button(this, W / 2, H / 2 - 8, '重新开始', { width: 220, height: 48, onClick: () => this.gs.restartGame() });
    const menu = new Button(this, W / 2, H / 2 + 54, '返回主菜单', { width: 220, height: 48, onClick: () => this.gs.quitToMenu() });
    this.pausePanel.add([resume, restart, menu]);

    // 音量 / 静音
    const s = getSettings();
    this.pVolume = s.volume;
    this.pMuted = s.muted;
    this.muteBtn = new Button(this, W / 2 - 70, H / 2 + 120, this.pMuted ? '🔇' : '🔊', {
      width: 56, height: 42, fontSize: 18, onClick: () => this._toggleMute()
    });
    const down = new Button(this, W / 2, H / 2 + 120, '−', { width: 46, height: 42, fontSize: 22, onClick: () => this._changeVol(-0.1) });
    this.pVolTxt = this.add.text(W / 2 + 56, H / 2 + 120, `${Math.round(this.pVolume * 100)}`, { fontFamily: font, fontSize: '16px', color: '#eaf6ff' }).setOrigin(0.5);
    const up = new Button(this, W / 2 + 108, H / 2 + 120, '+', { width: 46, height: 42, fontSize: 22, onClick: () => this._changeVol(0.1) });
    this.pausePanel.add([this.muteBtn, down, this.pVolTxt, up]);
  }

  _toggleMute() {
    this.pMuted = !this.pMuted;
    this.audio.setMuted(this.pMuted);
    this.muteBtn.setLabel(this.pMuted ? '🔇' : '🔊');
    saveSettings({ muted: this.pMuted });
  }

  _changeVol(d) {
    this.pVolume = Math.max(0, Math.min(1, Math.round((this.pVolume + d) * 10) / 10));
    this.audio.setVolume(this.pVolume);
    this.pVolTxt.setText(`${Math.round(this.pVolume * 100)}`);
    saveSettings({ volume: this.pVolume });
  }

  update() {
    const gs = this.gs;
    if (!gs || !gs.player) return;
    const p = gs.player;
    // 血条
    this.hpBar.draw(16, 30, p.hp / p.maxHp);
    this.hpText.setText(`${Math.max(0, Math.ceil(p.hp))}/${p.maxHp}`);
    this.lvlText.setText(`战机 Lv.${p.level}/${MAX_LEVEL}  ${this._weaponName(p.level)}`);
    const now = this.time.now;
    this.shieldText.setText(p.shieldActive(now) ? `🛡 护盾 x${p.shieldHits}` : '');

    // 分数 / 连击 / 难度
    const sc = gs.score.score;
    this.scoreText.setText(`${sc}`);
    if (gs.score.multiplier > 1) this.comboText.setText(`x${gs.score.multiplier.toFixed(1)} 连击`);
    else this.comboText.setText('');
    this.diffText.setText(`难度 ${gs.difficulty.intLevel}`);

    // Boss 血条
    if (this.bossVisible) {
      this.bossBar.draw(20, 78, this.bossRatio);
    }
  }

  _weaponName(level) {
    return ['单发', '双发', '三向', '五向', '追踪弹'][Math.min(level, MAX_LEVEL) - 1] || '';
  }
}
