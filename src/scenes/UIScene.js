// UIScene：覆盖在 GameScene 之上的 HUD。直接读取 GameScene 状态刷新，离散事件用监听。
import Phaser from 'phaser';
import QRCode from 'qrcode';
import { SCENES, EV, DEPTH, GAME_WIDTH as W, GAME_HEIGHT as H } from '../config/gameConfig.js';
import { getTheme } from '../config/themes/index.js';
import { MAX_LEVEL, REVIVE } from '../config/balance.js';
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
    this._buildRevivePanel();
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
    this.gs.events.on(EV.REVIVE_OFFER, this.onReviveOffer, this);
    this.gs.events.on(EV.REVIVE_DONE, this.onReviveDone, this);
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

  // ---------- 付费复活 UI ----------
  _buildRevivePanel() {
    this.revivePanel = this.add.container(0, 0).setDepth(DEPTH.HUD + 20).setVisible(false);
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.72);
    dim.fillRect(0, 0, W, H);
    this.reviveBg = this.add.graphics();
    this.revivePanel.add([dim, this.reviveBg]);
    this._reviveItems = [];
    this._reviveTimer = null;
  }

  _reviveDrawBg(panelH) {
    const g = this.reviveBg;
    g.clear();
    const x = W / 2 - 150;
    const y = H / 2 - panelH / 2;
    g.fillStyle(this.theme.ui.panelColor, 0.97);
    g.fillRoundedRect(x, y, 300, panelH, 16);
    g.lineStyle(2, this.theme.ui.panelStroke, 1);
    g.strokeRoundedRect(x, y, 300, panelH, 16);
  }

  _clearReviveItems() {
    if (this._reviveTimer) {
      this._reviveTimer.remove(false);
      this._reviveTimer = null;
    }
    if (this._reviveItems) this._reviveItems.forEach((it) => it.destroy());
    this._reviveItems = [];
  }

  onReviveOffer({ count }) {
    const font = this.theme.ui.fontFamily;
    const gs = this.gs;
    this.pauseBtn.setVisible(false);
    this._clearReviveItems();
    this.revivePanel.setVisible(true);
    if (count === 0) {
      // 首次：二维码 + 60s 倒计时
      const panelH = 460;
      this._reviveDrawBg(panelH);
      const top = H / 2 - panelH / 2;
      const qs = 220;
      const title = this.add.text(W / 2, top + 34, '付费复活', { fontFamily: font, fontSize: '28px', color: '#ffd23d', fontStyle: 'bold' }).setOrigin(0.5);
      const sub = this.add.text(W / 2, top + 70, '扫码支付即可复活', { fontFamily: font, fontSize: '15px', color: '#cbd5f5' }).setOrigin(0.5);
      const qrFrame = this.add.graphics();
      qrFrame.fillStyle(0xffffff, 1);
      qrFrame.fillRoundedRect(W / 2 - qs / 2 - 8, top + 96, qs + 16, qs + 16, 10);
      const countdown = this.add.text(W / 2, top + 96 + qs + 40, `剩余 ${REVIVE.firstWaitSec}s`, { fontFamily: font, fontSize: '22px', color: '#49b8ff', fontStyle: 'bold' }).setOrigin(0.5);
      const give = new Button(this, W / 2, top + panelH - 40, '放弃复活', { width: 220, height: 46, accent: 0xff5a7a, onClick: () => this._onReviveGiveUp() });
      this.revivePanel.add([title, sub, qrFrame, countdown, give]);
      this._reviveItems.push(title, sub, qrFrame, countdown, give);
      this._ensureQrTexture(() => {
        if (!this.revivePanel.visible) return;
        const qr = this.add.image(W / 2, top + 96 + (qs + 16) / 2, 'qr_revive').setDisplaySize(qs, qs);
        this.revivePanel.add(qr);
        this._reviveItems.push(qr);
      });
      this._startReviveCountdown(countdown, REVIVE.firstWaitSec);
    } else {
      // 第 2/3 次：又复活？点击即复活
      const panelH = 260;
      this._reviveDrawBg(panelH);
      const top = H / 2 - panelH / 2;
      const left = REVIVE.maxRevives - count;
      const title = this.add.text(W / 2, top + 44, '又复活？', { fontFamily: font, fontSize: '30px', color: '#ffd23d', fontStyle: 'bold' }).setOrigin(0.5);
      const sub = this.add.text(W / 2, top + 84, `剩余复活次数 ${left}`, { fontFamily: font, fontSize: '15px', color: '#cbd5f5' }).setOrigin(0.5);
      const rev = new Button(this, W / 2, top + 140, '复活', { width: 220, height: 48, accent: 0x36e07a, onClick: () => gs.reviveNow() });
      const give = new Button(this, W / 2, top + panelH - 40, '放弃复活', { width: 220, height: 46, accent: 0xff5a7a, onClick: () => this._onReviveGiveUp() });
      this.revivePanel.add([title, sub, rev, give]);
      this._reviveItems.push(title, sub, rev, give);
    }
  }

  _ensureQrTexture(cb) {
    if (this.textures.exists('qr_revive')) {
      cb();
      return;
    }
    const canvas = document.createElement('canvas');
    QRCode.toCanvas(canvas, REVIVE.trollText, { width: 220, margin: 1 }, (err) => {
      if (err) {
        console.warn('二维码生成失败', err);
        return;
      }
      this.textures.addCanvas('qr_revive', canvas);
      cb();
    });
  }

  _startReviveCountdown(textObj, sec) {
    let remain = sec;
    this._reviveTimer = this.time.addEvent({
      delay: 1000,
      repeat: sec - 1,
      callback: () => {
        remain -= 1;
        if (remain > 0) {
          textObj.setText(`剩余 ${remain}s`);
        } else {
          textObj.setText('复活中...');
          if (this._reviveTimer) {
            this._reviveTimer.remove(false);
            this._reviveTimer = null;
          }
          this.gs.reviveNow();
        }
      }
    });
  }

  _onReviveGiveUp() {
    this._clearReviveItems();
    this.revivePanel.setVisible(false);
    this.gs.declineRevive();
  }

  onReviveDone() {
    this._clearReviveItems();
    this._showResumeOverlay();
  }

  _showResumeOverlay() {
    const font = this.theme.ui.fontFamily;
    this.revivePanel.setVisible(true);
    const panelH = 240;
    this._reviveDrawBg(panelH);
    const top = H / 2 - panelH / 2;
    const title = this.add.text(W / 2, top + 50, '复活成功', { fontFamily: font, fontSize: '30px', color: '#36e07a', fontStyle: 'bold' }).setOrigin(0.5);
    const sub = this.add.text(W / 2, top + 92, '点击开始继续战斗', { fontFamily: font, fontSize: '15px', color: '#cbd5f5' }).setOrigin(0.5);
    const start = new Button(this, W / 2, top + 160, '开始', { width: 220, height: 50, accent: 0x36e07a, onClick: () => this._onResumeStart() });
    this.revivePanel.add([title, sub, start]);
    this._reviveItems.push(title, sub, start);
  }

  _onResumeStart() {
    this._clearReviveItems();
    this.revivePanel.setVisible(false);
    this.pauseBtn.setVisible(true);
    this.gs.resumeAfterRevive();
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
